import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories, chapters, users } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/stories/by-slug/[slug]
 * Get a story by its slug, with chapters and author info.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.slug, slug), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const [author] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, story.userId))
      .limit(1);

    const storyChapters = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        wordCount: chapters.wordCount,
        sortOrder: chapters.sortOrder,
        status: chapters.status,
        createdAt: chapters.createdAt,
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, story.id), isNull(chapters.deletedAt)))
      .orderBy(asc(chapters.sortOrder));

    return NextResponse.json({
      data: {
        ...story,
        author: author
          ? {
              id: author.id,
              displayName: author.displayName ?? author.name,
              avatarUrl: author.avatarUrl,
              bio: author.bio,
              role: author.role,
            }
          : null,
        chapters: storyChapters,
      },
    });
  } catch (error) {
    console.error("GET /api/stories/by-slug/[slug] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch story" } },
      { status: 500 }
    );
  }
}
