import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyJams, jamEntries, jamVotes } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createJamVoteSchema } from "@/lib/validations";
import { computeJamStatus } from "@/server/services/jams";

type RouteParams = { params: Promise<{ jamId: string; entryId: string }> };

/**
 * POST /api/jams/[jamId]/entries/[entryId]/votes
 * Cast or update a vote on a jam entry. Auth required.
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

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { jamId, entryId } = await params;
    const body = await request.json();
    const { rating } = createJamVoteSchema.parse(body);

    // Verify jam is in voting phase
    const jam = await db.query.storyJams.findFirst({
      where: eq(storyJams.id, jamId),
    });
    if (!jam) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Jam not found" } },
        { status: 404 }
      );
    }
    if (computeJamStatus(jam) !== "voting") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Jam is not in voting phase" } },
        { status: 400 }
      );
    }

    // Verify entry exists and voter is not the author
    const entry = await db.query.jamEntries.findFirst({
      where: and(eq(jamEntries.id, entryId), eq(jamEntries.jamId, jamId)),
    });
    if (!entry) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Entry not found" } },
        { status: 404 }
      );
    }
    if (entry.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Cannot vote on your own entry" } },
        { status: 400 }
      );
    }

    // Upsert vote
    await db
      .insert(jamVotes)
      .values({
        jamId,
        entryId,
        voterId: session.user.id,
        rating,
      })
      .onConflictDoUpdate({
        target: [jamVotes.entryId, jamVotes.voterId],
        set: { rating },
      });

    return NextResponse.json({ ok: true, rating });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/jams/[jamId]/entries/[entryId]/votes",
      "Failed to cast vote",
    );
  }
}
