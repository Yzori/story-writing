import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  stories,
  chapters,
  campaignSessions,
  campaignTurns,
  playerCharacters,
  users,
} from "@/lib/db/schema";
import { eq, and, asc, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";
import { compileSessionToHTML } from "@/lib/compile-session";
import { countWords } from "@/lib/utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/compile
 * Compile a completed session's turns into a chapter draft. GM only.
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

    const { storyId, sessionId } = await params;

    // Verify story exists and user is the owner (GM)
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (story.userId !== session.user.id) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the GM can compile sessions",
          },
        },
        { status: 403 }
      );
    }

    // Verify session exists and belongs to this story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    if (!campaignSession || campaignSession.storyId !== storyId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    if (campaignSession.status !== "completed") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Session must be completed before compiling",
          },
        },
        { status: 400 }
      );
    }

    // Load all turns for the session with character names
    const turns = await db
      .select({
        id: campaignTurns.id,
        userId: campaignTurns.userId,
        type: campaignTurns.type,
        content: campaignTurns.content,
        metadata: campaignTurns.metadata,
        characterName: playerCharacters.name,
      })
      .from(campaignTurns)
      .leftJoin(
        playerCharacters,
        eq(campaignTurns.characterId, playerCharacters.id)
      )
      .where(eq(campaignTurns.sessionId, sessionId))
      .orderBy(asc(campaignTurns.sortOrder));

    // Compile turns to HTML
    const compiledHTML = compileSessionToHTML({
      sessionTitle: campaignSession.title,
      sessionOpening: campaignSession.opening,
      turns,
    });

    // Determine next sort order for the new chapter
    const [maxResult] = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${chapters.sortOrder}), -1)`,
      })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)));

    const nextOrder = (maxResult?.maxOrder ?? -1) + 1;
    const wordCount = countWords(compiledHTML);

    // Create the chapter draft
    const [chapter] = await db
      .insert(chapters)
      .values({
        storyId,
        title: campaignSession.title,
        content: compiledHTML,
        wordCount,
        sortOrder: nextOrder,
        status: "draft",
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          chapterId: chapter.id,
          message: "Session compiled to chapter draft",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/.../sessions/[sessionId]/compile error:",
      error
    );
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to compile session",
        },
      },
      { status: 500 }
    );
  }
}
