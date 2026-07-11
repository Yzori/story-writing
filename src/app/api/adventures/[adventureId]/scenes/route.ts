import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventurePassages,
  adventures,
  adventureScenes,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { adventureSceneSchema } from "@/lib/validations";
import {
  canCloseScene,
  canOpenScene,
  nextScenePosition,
} from "@/lib/adventure-spotlight";
import { sanitizeHtml } from "@/server/sanitize";
import { countWords } from "@/lib/utils";
import {
  loadAdventureContext,
  toSpotlightSeat,
  toSpotlightState,
} from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };
const CONFLICT = "SCENE_CONFLICT";

/**
 * POST /api/adventures/[adventureId]/scenes
 * Director's desk: open the next scene (optionally starting a new act,
 * optionally with an opening passage) or close the current one.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let denyReason: string | null = null;
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
    const parsed = adventureSceneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || !ctx.mySeat) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    const mySeat = ctx.mySeat;
    const action = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(adventures)
        .where(eq(adventures.id, adventureId))
        .for("update");
      if (!locked) throw new Error(CONFLICT);

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
      const seat = toSpotlightSeat(mySeat);
      const now = new Date();

      if (action.action === "close") {
        const decision = canCloseScene(state, seat);
        if (!decision.allowed) {
          denyReason = decision.reason;
          throw new Error(CONFLICT);
        }
        await tx
          .update(adventureScenes)
          .set({ status: "closed", closedAt: now })
          .where(eq(adventureScenes.id, openScene!.id));
        await tx
          .update(adventures)
          .set({ updatedAt: now })
          .where(eq(adventures.id, adventureId));
        return { closed: openScene };
      }

      const decision = canOpenScene(state, seat);
      if (!decision.allowed) {
        denyReason = decision.reason;
        throw new Error(CONFLICT);
      }

      const position = nextScenePosition(
        locked.actNo,
        locked.sceneNo,
        action.newAct
      );
      const [scene] = await tx
        .insert(adventureScenes)
        .values({
          adventureId,
          actNo: position.actNo,
          sceneNo: position.sceneNo,
          title: action.title,
          openedAt: now,
        })
        .returning();

      await tx
        .update(adventures)
        .set({
          actNo: position.actNo,
          sceneNo: position.sceneNo,
          updatedAt: now,
        })
        .where(eq(adventures.id, adventureId));

      if (action.opening) {
        const content = sanitizeHtml(action.opening);
        const wordCount = countWords(content);
        if (wordCount > 0) {
          await tx.insert(adventurePassages).values({
            adventureId,
            sceneId: scene.id,
            seatId: mySeat.id,
            kind: "scene-open",
            content,
            wordCount,
            sortOrder: sql<number>`coalesce((select max(${adventurePassages.sortOrder}) from ${adventurePassages} where ${adventurePassages.adventureId} = ${adventureId}), -1) + 1`,
            signedAt: now,
          });
        }
      }

      return { opened: scene };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === CONFLICT) {
      return NextResponse.json(
        {
          error: {
            code: "SCENE_CONFLICT",
            message: denyReason ?? "The scene changed — refresh the table.",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/adventures/[adventureId]/scenes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to change the scene" } },
      { status: 500 }
    );
  }
}
