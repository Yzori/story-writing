import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureHands,
  adventurePassages,
  adventures,
  adventureScenes,
  adventureSeats,
  adventureSuggestions,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { signAdventurePassageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/server/sanitize";
import { countWords } from "@/lib/utils";
import {
  canSignPassage,
  signPassageEffects,
  signTiming,
} from "@/lib/adventure-spotlight";
import {
  loadAdventureContext,
  toSpotlightSeat,
  toSpotlightState,
} from "@/server/services/adventure-table";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ adventureId: string }> };

const SPOTLIGHT_CONFLICT = "SPOTLIGHT_CONFLICT";

/**
 * GET /api/adventures/[adventureId]/passages?afterSort=N
 * The page, in order. afterSort supports the 5s polling loop —
 * clients ask only for what they haven't seen.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || !ctx.mySeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const afterSortParam = request.nextUrl.searchParams.get("afterSort");
    const afterSort =
      afterSortParam === null ? null : parseInt(afterSortParam, 10);

    const conditions = [eq(adventurePassages.adventureId, adventureId)];
    if (afterSort !== null && Number.isFinite(afterSort)) {
      conditions.push(gt(adventurePassages.sortOrder, afterSort));
    }

    const passages = await db
      .select()
      .from(adventurePassages)
      .where(and(...conditions))
      .orderBy(asc(adventurePassages.sortOrder));

    return NextResponse.json({ data: passages });
  } catch (error) {
    console.error("GET /api/adventures/[adventureId]/passages error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load the page" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/adventures/[adventureId]/passages
 * Sign a passage onto the page. Writers sign 'character' passages and
 * the spotlight returns to the Director's desk; the Director signs
 * 'direction' and keeps it. The whole transition runs in a transaction
 * that row-locks the adventure: sortOrder stays monotonic and the
 * spotlight can't be signed on twice.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let denyReason: string | null = null;
  let canonizedReaderId: string | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = signAdventurePassageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || !ctx.mySeat || !ctx.directorSeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const content = sanitizeHtml(parsed.data.content);
    const wordCount = countWords(content);
    if (wordCount === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Write something first" } },
        { status: 400 }
      );
    }

    const mySeat = ctx.mySeat;
    const directorSeatId = ctx.directorSeat.id;
    const kind = mySeat.role === "director" ? "direction" : "character";
    const canonizeSuggestionId =
      mySeat.role === "director" ? (parsed.data.canonizeSuggestionId ?? null) : null;

    const created = await db.transaction(async (tx) => {
      // Lock the adventure row: serializes sortOrder and pins the
      // spotlight — a double-submit or a race with pass/step-forward
      // re-validates against current state, not a stale snapshot.
      const [locked] = await tx
        .select()
        .from(adventures)
        .where(eq(adventures.id, adventureId))
        .for("update");
      if (!locked) throw new Error(SPOTLIGHT_CONFLICT);

      const [openScene] = await tx
        .select()
        .from(adventureScenes)
        .where(
          and(
            eq(adventureScenes.adventureId, adventureId),
            eq(adventureScenes.status, "open")
          )
        );

      const state = toSpotlightState(locked, !!openScene);
      const decision = canSignPassage(state, toSpotlightSeat(mySeat), kind);
      if (!decision.allowed) {
        denyReason = decision.reason;
        throw new Error(SPOTLIGHT_CONFLICT);
      }
      if (!openScene) {
        denyReason = "There's no open scene.";
        throw new Error(SPOTLIGHT_CONFLICT);
      }

      const now = new Date();
      const [passage] = await tx
        .insert(adventurePassages)
        .values({
          adventureId,
          sceneId: openScene.id,
          seatId: mySeat.id,
          kind,
          content,
          wordCount,
          sortOrder: sql<number>`coalesce((select max(${adventurePassages.sortOrder}) from ${adventurePassages} where ${adventurePassages.adventureId} = ${adventureId}), -1) + 1`,
          signedAt: now,
        })
        .returning();

      // Writing a reader's suggestion in: the passage carries the
      // credit ("detail from reader ⟨name⟩") via the canonized row.
      if (canonizeSuggestionId) {
        const [canonized] = await tx
          .update(adventureSuggestions)
          .set({
            status: "canonized",
            canonizedPassageId: passage.id,
            resolvedAt: now,
          })
          .where(
            and(
              eq(adventureSuggestions.id, canonizeSuggestionId),
              eq(adventureSuggestions.adventureId, adventureId),
              eq(adventureSuggestions.status, "waiting")
            )
          )
          .returning({ userId: adventureSuggestions.userId });
        canonizedReaderId = canonized?.userId ?? null;
      }

      const effects = signPassageEffects(
        toSpotlightSeat(mySeat),
        directorSeatId,
        now
      );
      if (effects) {
        // A writer signed: stamp the show-up record and hand the
        // spotlight back to the Director's desk.
        const timing = signTiming(locked.spotlightDueAt, now);
        await tx
          .update(adventureSeats)
          .set(
            timing === "on-time"
              ? { turnsOnTime: sql`${adventureSeats.turnsOnTime} + 1` }
              : { turnsLate: sql`${adventureSeats.turnsLate} + 1` }
          )
          .where(eq(adventureSeats.id, mySeat.id));

        // The writer's own raised hand, if any, is now moot.
        await tx
          .update(adventureHands)
          .set({ resolvedAt: now, resolution: "spotlight" })
          .where(
            and(
              eq(adventureHands.seatId, mySeat.id),
              isNull(adventureHands.resolvedAt)
            )
          );

        await tx
          .update(adventures)
          .set({ ...effects, updatedAt: now })
          .where(eq(adventures.id, adventureId));
      } else {
        await tx
          .update(adventures)
          .set({ updatedAt: now })
          .where(eq(adventures.id, adventureId));
      }

      return passage;
    });

    if (canonizedReaderId) {
      createNotification(
        canonizedReaderId,
        "adventure",
        "Your suggestion was written into the story — credited to you",
        `/adventures/${adventureId}/watch`
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === SPOTLIGHT_CONFLICT) {
      return NextResponse.json(
        {
          error: {
            code: "SPOTLIGHT_CONFLICT",
            message: denyReason ?? "The spotlight moved — refresh the table.",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/adventures/[adventureId]/passages error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to sign the passage" } },
      { status: 500 }
    );
  }
}
