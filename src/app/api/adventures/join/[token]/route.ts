import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { adventures, adventureSeats, stories } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyPersistentRateLimit, handleRouteError } from "@/server/api-utils";
import { adventureSeatSetupSchema } from "@/lib/validations";
import { sha256Hex } from "@/server/auth-utils";

type RouteParams = { params: Promise<{ token: string }> };

/**
 * GET /api/adventures/join/[token]
 * Peek at the table behind an invite link (title, premise, open seats)
 * so the join page can show what you're sitting down to.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Token lookups are guessing targets — persistent limit, keyed by IP
    // for anonymous visitors.
    const session = await auth();
    const limited = await applyPersistentRateLimit(
      request,
      session?.user?.id,
      "read"
    );
    if (limited) return limited;

    const { token } = await params;
    const adventure = await findByToken(token);
    if (!adventure) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "This invite is no longer good." } },
        { status: 404 }
      );
    }

    const [story] = await db
      .select({ title: stories.title })
      .from(stories)
      .where(eq(stories.id, adventure.storyId));
    const [openSeats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureSeats)
      .where(
        and(
          eq(adventureSeats.adventureId, adventure.id),
          eq(adventureSeats.status, "open"),
          eq(adventureSeats.role, "writer")
        )
      );

    return NextResponse.json({
      data: {
        title: story?.title ?? "",
        premise: adventure.premise,
        genre: adventure.genre,
        pace: adventure.pace,
        status: adventure.status,
        openWriterSeats: openSeats?.count ?? 0,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/adventures/join/[token]", "Failed to read the invite");
  }
}

/**
 * POST /api/adventures/join/[token]
 * Claim an open writer seat with your character. The seat claim is
 * row-locked so two friends clicking the same link don't share a chair.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    const limited = await applyPersistentRateLimit(
      request,
      session.user.id,
      "write"
    );
    if (limited) return limited;

    const { token } = await params;
    const body = await request.json();
    const parsed = adventureSeatSetupSchema.safeParse(body);
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

    const adventure = await findByToken(token);
    if (!adventure) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "This invite is no longer good." } },
        { status: 404 }
      );
    }
    if (adventure.status !== "casting" && adventure.status !== "running") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "This adventure has ended." } },
        { status: 409 }
      );
    }

    const userId = session.user.id;
    const claimed = await db.transaction(async (tx) => {
      const [alreadySeated] = await tx
        .select({ id: adventureSeats.id })
        .from(adventureSeats)
        .where(
          and(
            eq(adventureSeats.adventureId, adventure.id),
            eq(adventureSeats.userId, userId)
          )
        );
      if (alreadySeated) return "already-seated" as const;

      const [openSeat] = await tx
        .select()
        .from(adventureSeats)
        .where(
          and(
            eq(adventureSeats.adventureId, adventure.id),
            eq(adventureSeats.status, "open"),
            isNull(adventureSeats.userId)
          )
        )
        .orderBy(
          // Director seat first if it's the open one, else first writer seat.
          sql`case when ${adventureSeats.role} = 'director' then 0 else 1 end`,
          asc(adventureSeats.createdAt)
        )
        .limit(1)
        // skipLocked: under plain FOR UPDATE + LIMIT 1, a second joiner
        // blocks on the same row, re-checks it as taken, and reports
        // "full" while other seats sit open. Skipping the locked row
        // claims the next free seat instead.
        .for("update", { skipLocked: true });
      if (!openSeat) return "full" as const;

      const [seat] = await tx
        .update(adventureSeats)
        .set({
          userId,
          status: "seated",
          joinedAt: new Date(),
          ...(openSeat.role === "writer"
            ? {
                characterName: parsed.data.characterName,
                characterBrief: parsed.data.characterBrief,
                inkColor: parsed.data.inkColor,
              }
            : {}),
        })
        .where(eq(adventureSeats.id, openSeat.id))
        .returning();
      return seat;
    });

    if (claimed === "already-seated") {
      return NextResponse.json(
        {
          error: { code: "ALREADY_SEATED", message: "You're already at this table." },
          data: { adventureId: adventure.id },
        },
        { status: 409 }
      );
    }
    if (claimed === "full") {
      return NextResponse.json(
        { error: { code: "TABLE_FULL", message: "Every seat at this table is taken." } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { data: { adventureId: adventure.id, seat: claimed } },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/adventures/join/[token]", "Failed to take a seat");
  }
}

async function findByToken(token: string) {
  if (!token || token.length < 32 || token.length > 128) return null;
  const tokenHash = await sha256Hex(token);
  const [adventure] = await db
    .select()
    .from(adventures)
    .where(eq(adventures.inviteTokenHash, tokenHash));
  return adventure ?? null;
}
