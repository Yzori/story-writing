import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignSessions,
  campaignTurns,
  characterMarks,
  playerCharacters,
  stories,
} from "@/server/db/schema";
import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { parseSceneBreakMetadata, parseStoryMomentMetadata } from "@/lib/campaign-turns";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

// Moods that carry enough weight to surface in the "Previously" card. We
// don't want every routine scene-break to show up — only ones that hit.
const DRAMATIC_MOODS = new Set(["ominous", "tense", "death", "triumph", "triumphant", "fall", "betrayal"]);

const MAX_HIGHLIGHTS = 3;
const MAX_MARKS = 5;

interface Highlight {
  kind: "story-moment" | "scene-break";
  text: string;
  mood: string | null;
  importance: "normal" | "major" | null;
}

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/previously
 *
 * Returns the most recent COMPLETED session that precedes this one (by
 * sortOrder) along with its cliffhanger, highlights, and marks. Drives the
 * "Previously, on…" card that opens a fresh session.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
      columns: { id: true, isPublic: true, title: true },
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 },
      );
    }

    // Visibility: public stories open; private require collaborator access.
    if (!story.isPublic) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Sign in to view" } },
          { status: 401 },
        );
      }
      const check = await verifyCollaboratorAccess(storyId, session.user.id);
      if (check.error) {
        return NextResponse.json(
          { error: { code: check.error, message: "No access" } },
          { status: check.error === "FORBIDDEN" ? 403 : 404 },
        );
      }
    }

    const currentSession = await db.query.campaignSessions.findFirst({
      where: and(eq(campaignSessions.id, sessionId), eq(campaignSessions.storyId, storyId)),
      columns: { id: true, sortOrder: true },
    });
    if (!currentSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const previousSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.storyId, storyId),
        eq(campaignSessions.status, "completed"),
        lt(campaignSessions.sortOrder, currentSession.sortOrder),
      ),
      orderBy: [desc(campaignSessions.sortOrder)],
    });

    if (!previousSession) {
      return NextResponse.json({ data: null });
    }

    // Pull story-moment + scene-break turns from the previous session. We
    // filter scene-breaks by mood to skip routine transitions.
    const candidateTurns = await db
      .select({
        id: campaignTurns.id,
        type: campaignTurns.type,
        content: campaignTurns.content,
        metadata: campaignTurns.metadata,
      })
      .from(campaignTurns)
      .where(
        and(
          eq(campaignTurns.sessionId, previousSession.id),
          inArray(campaignTurns.type, ["story-moment", "scene-break"]),
        ),
      )
      .orderBy(asc(campaignTurns.sortOrder));

    const highlights: Highlight[] = [];
    for (const turn of candidateTurns) {
      if (turn.type === "story-moment") {
        const meta = parseStoryMomentMetadata(turn.metadata);
        highlights.push({
          kind: "story-moment",
          text: turn.content,
          mood: meta?.mood ?? null,
          importance: meta?.importance ?? "normal",
        });
      } else if (turn.type === "scene-break") {
        const meta = parseSceneBreakMetadata(turn.metadata);
        const mood = meta?.mood ?? null;
        const title = meta?.title ?? turn.content;
        if (!title) continue;
        // Cinematic scene-breaks count regardless of mood; non-cinematic
        // only count when the mood is dramatic.
        if (meta?.cinematic || (mood && DRAMATIC_MOODS.has(mood))) {
          highlights.push({
            kind: "scene-break",
            text: title,
            mood,
            importance: "normal",
          });
        }
      }
    }

    // Major story-moments first; otherwise keep the late-session beats.
    highlights.sort((a, b) => {
      if (a.importance === "major" && b.importance !== "major") return -1;
      if (b.importance === "major" && a.importance !== "major") return 1;
      return 0;
    });
    const cappedHighlights = highlights.slice(0, MAX_HIGHLIGHTS);

    const marks = await db
      .select({
        kind: characterMarks.kind,
        text: characterMarks.text,
        characterName: playerCharacters.name,
      })
      .from(characterMarks)
      .leftJoin(playerCharacters, eq(characterMarks.characterId, playerCharacters.id))
      .where(eq(characterMarks.sessionId, previousSession.id))
      .orderBy(asc(characterMarks.createdAt))
      .limit(MAX_MARKS);

    return NextResponse.json({
      data: {
        sessionId: previousSession.id,
        title: previousSession.title,
        cliffhanger: previousSession.cliffhanger,
        closingMood: previousSession.closingMood,
        epilogue: previousSession.epilogue,
        completedAt: previousSession.updatedAt,
        storyTitle: story.title,
        highlights: cappedHighlights,
        marks: marks.filter((m) => !!m.characterName),
      },
    });
  } catch (error) {
    console.error("GET previously-on error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load previously" } },
      { status: 500 },
    );
  }
}
