import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  users,
  stories,
  chapters,
  sparks as sparksTable,
  follows as followsTable,
  inkDropTransactions,
} from "@/server/db/schema";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]
 * Get user profile with their stories and stats.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();
    const isOwnProfile = session?.user?.id === userId;

    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        bio: users.bio,
        role: users.role,
        createdAt: users.createdAt,
        readingStreakDays: users.readingStreakDays,
        readingStreakBest: users.readingStreakBest,
        profileHearth: users.profileHearth,
        profileLetterbox: users.profileLetterbox,
        profileShowGifts: users.profileShowGifts,
        profileCoverMode: users.profileCoverMode,
        profileCoverStoryId: users.profileCoverStoryId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const storyConditions = [eq(stories.userId, userId), isNull(stories.deletedAt)];
    if (!isOwnProfile) {
      storyConditions.push(eq(stories.isPublic, true));
      storyConditions.push(eq(stories.status, "published"));
    }

    const chapterStatConditions = [isNull(chapters.deletedAt)];
    if (!isOwnProfile) {
      chapterStatConditions.push(eq(chapters.status, "published"));
    }

    const chapterStats = db
      .select({
        storyId: chapters.storyId,
        chapterCount: sql<number>`count(*)`.as("chapter_count"),
        totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`.as("total_words"),
      })
      .from(chapters)
      .where(and(...chapterStatConditions))
      .groupBy(chapters.storyId)
      .as("chapter_stats");

    const sparkStats = db
      .select({
        storyId: sparksTable.storyId,
        sparkCount: sql<number>`count(*)`.as("spark_count"),
      })
      .from(sparksTable)
      .groupBy(sparksTable.storyId)
      .as("spark_stats");

    const userStories = await db
      .select({
        id: stories.id,
        title: stories.title,
        format: stories.format,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        genres: stories.genres,
        contentRating: stories.contentRating,
        status: stories.status,
        isPublic: stories.isPublic,
        slug: stories.slug,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)`,
        totalWords: sql<number>`coalesce(${chapterStats.totalWords}, 0)`,
        sparkCount: sql<number>`coalesce(${sparkStats.sparkCount}, 0)`,
      })
      .from(stories)
      .leftJoin(chapterStats, eq(stories.id, chapterStats.storyId))
      .leftJoin(sparkStats, eq(stories.id, sparkStats.storyId))
      .where(and(...storyConditions))
      .orderBy(desc(stories.createdAt));

    // ── Aggregates that enrich the profile ────────────────────────────
    // Audience: distinct users who follow OR have sparked this author's
    // public stories. Sparks given: this user's reading taste. Ink drops
    // received: lifetime tips. Latest published chapter: recent activity.

    const publishedStoryIds = userStories
      .filter((s) => s.isPublic && s.status === "published")
      .map((s) => s.id);

    const sparkedStoryConditions = [
      eq(sparksTable.userId, userId),
      isNull(stories.deletedAt),
    ];
    if (!isOwnProfile) {
      sparkedStoryConditions.push(eq(stories.isPublic, true));
      sparkedStoryConditions.push(eq(stories.status, "published"));
    }

    const [
      audienceFollowsRow,
      audienceSparksRow,
      sparksGivenRow,
      sparksGivenGenresRaw,
      recentSparksGiven,
      inkDropsReceivedRow,
      latestChapterRow,
    ] = await Promise.all([
      publishedStoryIds.length
        ? db
            .select({
              count: sql<number>`count(distinct ${followsTable.userId})`,
            })
            .from(followsTable)
            .where(inArray(followsTable.storyId, publishedStoryIds))
        : Promise.resolve([{ count: 0 }]),
      publishedStoryIds.length
        ? db
            .select({
              count: sql<number>`count(distinct ${sparksTable.userId})`,
            })
            .from(sparksTable)
            .where(inArray(sparksTable.storyId, publishedStoryIds))
        : Promise.resolve([{ count: 0 }]),
      db
        .select({ count: sql<number>`count(*)` })
        .from(sparksTable)
        .innerJoin(stories, eq(sparksTable.storyId, stories.id))
        .where(and(...sparkedStoryConditions)),
      db
        .select({
          genres: stories.genres,
        })
        .from(sparksTable)
        .innerJoin(stories, eq(sparksTable.storyId, stories.id))
        .where(and(...sparkedStoryConditions))
        .limit(150),
      db
        .select({
          storyId: sparksTable.storyId,
          title: stories.title,
          slug: stories.slug,
          createdAt: sparksTable.createdAt,
        })
        .from(sparksTable)
        .innerJoin(stories, eq(sparksTable.storyId, stories.id))
        .where(
          and(
            eq(sparksTable.userId, userId),
            eq(stories.isPublic, true),
            eq(stories.status, "published"),
            isNull(stories.deletedAt)
          )
        )
        .orderBy(desc(sparksTable.createdAt))
        .limit(4),
      db
        .select({
          total: sql<number>`coalesce(sum(${inkDropTransactions.amount}), 0)`,
          tipCount: sql<number>`count(*)`,
        })
        .from(inkDropTransactions)
        .where(
          and(
            eq(inkDropTransactions.toUserId, userId),
            inArray(inkDropTransactions.type, [
              "tip",
              "unlock",
              "circle",
              "commission",
              "donation",
              "crossroads",
            ])
          )
        ),
      publishedStoryIds.length
        ? db
            .select({
              storyId: chapters.storyId,
              title: chapters.title,
              sortOrder: chapters.sortOrder,
              updatedAt: chapters.updatedAt,
              storyTitle: stories.title,
              storySlug: stories.slug,
            })
            .from(chapters)
            .innerJoin(stories, eq(chapters.storyId, stories.id))
            .where(
              and(
                inArray(chapters.storyId, publishedStoryIds),
                eq(chapters.status, "published"),
                isNull(chapters.deletedAt)
              )
            )
            .orderBy(desc(chapters.updatedAt))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const readingGenreCounts: Record<string, number> = {};
    for (const row of sparksGivenGenresRaw) {
      const list = (row.genres ?? []) as string[];
      for (const g of list) {
        readingGenreCounts[g] = (readingGenreCounts[g] ?? 0) + 1;
      }
    }
    const topReadingGenres = Object.entries(readingGenreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre, count]) => ({ genre, count }));

    const followerCount = Number(audienceFollowsRow[0]?.count ?? 0);
    const sparkerCount = Number(audienceSparksRow[0]?.count ?? 0);
    const audienceCount = Math.max(followerCount, sparkerCount);

    const inkDropsReceived = Number(inkDropsReceivedRow[0]?.total ?? 0);
    const tipCount = Number(inkDropsReceivedRow[0]?.tipCount ?? 0);

    const latestChapter = latestChapterRow[0] ?? null;

    return NextResponse.json({
      data: {
        ...user,
        displayName: user.displayName ?? user.name,
        avatarUrl: user.avatarUrl ?? user.image,
        stories: userStories,
        insights: {
          audienceCount,
          followerCount,
          sparksGiven: Number(sparksGivenRow[0]?.count ?? 0),
          topReadingGenres,
          recentSparksGiven: recentSparksGiven.map((r) => ({
            storyId: r.storyId,
            title: r.title,
            slug: r.slug,
            sparkedAt: r.createdAt,
          })),
          inkDropsReceived,
          tipCount,
          readingStreakDays: user.readingStreakDays,
          readingStreakBest: user.readingStreakBest,
          latestChapter: latestChapter
            ? {
                storyId: latestChapter.storyId,
                storyTitle: latestChapter.storyTitle,
                storySlug: latestChapter.storySlug,
                title: latestChapter.title,
                sortOrder: latestChapter.sortOrder,
                publishedAt: latestChapter.updatedAt,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/users/[userId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch user" } },
      { status: 500 }
    );
  }
}

// ── PATCH /api/users/[userId] ───────────────────────────────

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(["writer", "illustrator", "editor", "worldbuilder", "reader"]).optional(),
  avatarUrl: z
    .union([
      z.string().url().max(2048),
      z.string().max(400_000).regex(/^data:image\/(?:png|jpe?g|webp|gif);base64,/),
      z.null(),
    ])
    .optional(),
  // Study hosting — what the writer sets out for profile visitors.
  profileHearth: z.boolean().optional(),
  profileLetterbox: z.enum(["open", "followers", "closed"]).optional(),
  profileShowGifts: z.boolean().optional(),
  // Cover choice: auto (best work) | portrait | a specific published story.
  profileCoverMode: z.enum(["auto", "portrait", "story"]).optional(),
  profileCoverStoryId: z.string().uuid().nullable().optional(),
});

/**
 * PATCH /api/users/[userId]
 * Update the authenticated user's profile.
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

    const { userId } = await params;

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only edit your own profile" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No fields to update" } },
        { status: 400 }
      );
    }

    // The cover may only front one of the writer's own public published stories.
    if (updates.profileCoverStoryId) {
      const [coverStory] = await db
        .select({ id: stories.id })
        .from(stories)
        .where(
          and(
            eq(stories.id, updates.profileCoverStoryId),
            eq(stories.userId, userId),
            eq(stories.isPublic, true),
            eq(stories.status, "published"),
            isNull(stories.deletedAt)
          )
        )
        .limit(1);
      if (!coverStory) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "The cover must be one of your published stories",
            },
          },
          { status: 400 }
        );
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        bio: users.bio,
        role: users.role,
        profileHearth: users.profileHearth,
        profileLetterbox: users.profileLetterbox,
        profileShowGifts: users.profileShowGifts,
        profileCoverMode: users.profileCoverMode,
        profileCoverStoryId: users.profileCoverStoryId,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        ...updatedUser,
        displayName: updatedUser.displayName ?? updatedUser.name,
        avatarUrl: updatedUser.avatarUrl ?? updatedUser.image,
      },
    });
  } catch (error) {
    console.error("PATCH /api/users/[userId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } },
      { status: 500 }
    );
  }
}
