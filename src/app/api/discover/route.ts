import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, users, follows, storyJams, openCalls } from "@/server/db/schema";
import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { auth } from "@/server/auth";
import { computeJamStatus } from "@/server/services/jams";
import { computeTrending } from "@/server/services/trending";
import { applyRateLimit } from "@/server/api-utils";

/**
 * GET /api/discover
 *
 * Personalized discovery for the dashboard's quiet "Discover" strip — all real:
 *   trending  public published stories ranked by the shared 7-day trending
 *             score (sparks ×3, follows ×5, donation drops ×0.5 — see
 *             src/server/services/trending.ts, same scorer as /api/home),
 *             biased to the genres the user reads/writes (preferredGenres,
 *             else derived from their own + followed stories). Excludes the
 *             user's own stories.
 *   jam       the nearest open/upcoming story jam.
 *   openCall  a current open collaborator call on someone else's story.
 *
 * Returns only what genuinely exists — empty sources are simply omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, userId, "read");
    if (limited) return limited;

    // jam + open-call lookups don't depend on genres — start them immediately
    const jamPromise = db
      .select({
        id: storyJams.id,
        title: storyJams.title,
        theme: storyJams.theme,
        status: storyJams.status,
        submissionStartsAt: storyJams.submissionStartsAt,
        submissionEndsAt: storyJams.submissionEndsAt,
        votingStartsAt: storyJams.votingStartsAt,
        votingEndsAt: storyJams.votingEndsAt,
      })
      .from(storyJams)
      .orderBy(desc(storyJams.submissionStartsAt))
      .limit(10);

    const openCallPromise = db
      .select({
        id: openCalls.id,
        storyId: openCalls.storyId,
        slug: stories.slug,
        storyTitle: stories.title,
        role: openCalls.role,
        title: openCalls.title,
      })
      .from(openCalls)
      .innerJoin(stories, eq(openCalls.storyId, stories.id))
      .where(and(eq(openCalls.status, "open"), ne(openCalls.userId, userId), isNull(stories.deletedAt)))
      .orderBy(desc(openCalls.createdAt))
      .limit(1);

    // ── determine the user's genres (needed before the trending query) ──
    const me = await db.select({ pref: users.preferredGenres }).from(users).where(eq(users.id, userId)).limit(1);
    let genres = (me[0]?.pref ?? []).filter(Boolean);
    if (genres.length === 0) {
      const derived = await db
        .select({ genres: stories.genres })
        .from(stories)
        .leftJoin(follows, eq(follows.storyId, stories.id))
        .where(or(eq(stories.userId, userId), eq(follows.userId, userId)));
      genres = Array.from(new Set(derived.flatMap((r) => r.genres ?? []))).slice(0, 4);
    }

    const [trending, jamRows, openCallRows] = await Promise.all([
      computeTrending({ genres, excludeUserId: userId, limit: 6 }),
      jamPromise,
      openCallPromise,
    ]);

    // nearest open jam, else nearest upcoming
    const jamsLive = jamRows
      .map((j) => ({ id: j.id, title: j.title, theme: j.theme, liveStatus: computeJamStatus(j) }))
      .filter((j) => j.liveStatus === "open" || j.liveStatus === "upcoming");
    const jam = jamsLive.find((j) => j.liveStatus === "open") ?? jamsLive[0] ?? null;

    return NextResponse.json({
      data: {
        trending: trending.map((t) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          coverImageUrl: t.coverImageUrl,
          genres: t.genres ?? [],
          author: t.authorName,
          sparkCount: t.weeklyInteractions.sparks,
        })),
        jam,
        openCall: openCallRows[0] ?? null,
      },
    });
  } catch (error) {
    console.error("GET /api/discover error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load discovery" } },
      { status: 500 },
    );
  }
}
