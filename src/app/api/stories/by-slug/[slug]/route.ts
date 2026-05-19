import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, chapters, users, collaborators } from "@/server/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { auth } from "@/server/auth";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/stories/by-slug/[slug]
 * Get a story by its slug, with chapters and author info.
 * Non-owners only see published chapters.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const session = await auth();

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.slug, slug), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const isOwner = session?.user?.id === story.userId;
    let isCollaborator = false;
    if (!isOwner && session?.user?.id && story.writingMode !== "solo") {
      const collab = await db.query.collaborators.findFirst({
        where: and(
          eq(collaborators.storyId, story.id),
          eq(collaborators.userId, session.user.id),
          eq(collaborators.status, "accepted")
        ),
      });
      isCollaborator = !!collab;
    }
    const canReadDrafts = isOwner || isCollaborator;

    const hasPublicAccess =
      story.isPublic &&
      (story.status === "published" || story.writingMode === "campaign");

    if (!canReadDrafts && !hasPublicAccess) {
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

    const chapterConditions = [
      eq(chapters.storyId, story.id),
      isNull(chapters.deletedAt),
    ];

    // Non-owners only see published chapters
    if (!canReadDrafts) {
      chapterConditions.push(eq(chapters.status, "published"));
    }

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
      .where(and(...chapterConditions))
      .orderBy(asc(chapters.sortOrder));

    // Parse contentNotes JSON string to array
    let parsedContentNotes: string[] = [];
    try { parsedContentNotes = story.contentNotes ? JSON.parse(story.contentNotes) : []; } catch { /* corrupted JSON */ }

    return NextResponse.json({
      data: {
        ...story,
        contentNotes: parsedContentNotes,
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
