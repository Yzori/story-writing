import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyJams, jamEntries, jamVotes, stories, users } from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { computeJamStatus } from "@/server/services/jams";

type RouteParams = { params: Promise<{ jamId: string }> };

/**
 * GET /api/jams/[jamId]
 * Get jam detail with entries and vote aggregates.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    const { jamId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const jam = await db.query.storyJams.findFirst({
      where: eq(storyJams.id, jamId),
    });
    if (!jam) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Jam not found" } },
        { status: 404 }
      );
    }

    const liveStatus = computeJamStatus(jam);

    // Fetch entries with story info and vote aggregates
    const entries = await db
      .select({
        id: jamEntries.id,
        storyId: jamEntries.storyId,
        userId: jamEntries.userId,
        submittedAt: jamEntries.submittedAt,
        storyTitle: stories.title,
        storySlug: stories.slug,
        storyCover: stories.coverImageUrl,
        storyGenres: stories.genres,
        authorName: users.displayName,
        avgRating: sql<number>`coalesce(avg(${jamVotes.rating}), 0)`,
        voteCount: sql<number>`count(${jamVotes.id})`,
      })
      .from(jamEntries)
      .innerJoin(stories, eq(jamEntries.storyId, stories.id))
      .leftJoin(users, eq(jamEntries.userId, users.id))
      .leftJoin(jamVotes, eq(jamEntries.id, jamVotes.entryId))
      .where(eq(jamEntries.jamId, jamId))
      .groupBy(
        jamEntries.id,
        stories.title,
        stories.slug,
        stories.coverImageUrl,
        stories.genres,
        users.displayName
      )
      .orderBy(liveStatus === "ended" ? desc(sql`avg(${jamVotes.rating})`) : desc(jamEntries.submittedAt));

    // Fetch user's votes if logged in and in voting/ended phase
    let userVotes: Record<string, number> = {};
    if (userId && (liveStatus === "voting" || liveStatus === "ended")) {
      const votes = await db
        .select({
          entryId: jamVotes.entryId,
          rating: jamVotes.rating,
        })
        .from(jamVotes)
        .where(and(eq(jamVotes.jamId, jamId), eq(jamVotes.voterId, userId)));

      userVotes = Object.fromEntries(votes.map((v) => [v.entryId, v.rating]));
    }

    return NextResponse.json({
      data: {
        ...jam,
        liveStatus,
        entries: entries.map((e) => ({
          ...e,
          avgRating: Number(e.avgRating),
          voteCount: Number(e.voteCount),
          userVote: userVotes[e.id] ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("GET jam detail error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch jam" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jams/[jamId]
 * Update jam status. Admin only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const { jamId } = await params;
    const body = await request.json();

    await db
      .update(storyJams)
      .set(body)
      .where(eq(storyJams.id, jamId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH jam error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update jam" } },
      { status: 500 }
    );
  }
}
