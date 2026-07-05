import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { campaignGold, campaignSessions, campaignTurns } from "@/server/db/schema";
import { applyRateLimit } from "@/server/api-utils";
import { verifyPublicSession } from "@/server/services/audience-input";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/overture
 * The ghost overture: a handful of lines from this campaign's PAST completed
 * sessions, drifting in the waiting dark before the session begins. Doubles
 * as a "previously" recap. Story turn types only (never ooc/log types),
 * gilded lines first — the audience's gold from earlier nights glows in the
 * dark. Deterministic ordering (no random) so responses are stable and
 * cacheable; empty for a story's first session.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 60, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    if (!(await verifyPublicSession(storyId, sessionId))) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const pastSessions = await db
      .select({ id: campaignSessions.id, title: campaignSessions.title })
      .from(campaignSessions)
      .where(
        and(
          eq(campaignSessions.storyId, storyId),
          eq(campaignSessions.status, "completed"),
        ),
      )
      .orderBy(desc(campaignSessions.updatedAt))
      .limit(3);

    if (pastSessions.length === 0) {
      return NextResponse.json(
        { lines: [] },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const titleById = new Map(pastSessions.map((s) => [s.id, s.title]));
    const rows = await db
      .select({
        id: campaignTurns.id,
        sessionId: campaignTurns.sessionId,
        content: campaignTurns.content,
        goldTurnId: campaignGold.turnId,
      })
      .from(campaignTurns)
      .leftJoin(campaignGold, eq(campaignGold.turnId, campaignTurns.id))
      .where(
        and(
          inArray(
            campaignTurns.sessionId,
            pastSessions.map((s) => s.id),
          ),
          inArray(campaignTurns.type, ["narration", "action", "dialogue"]),
          gte(sql`length(${campaignTurns.content})`, 40),
          lte(sql`length(${campaignTurns.content})`, 200),
        ),
      )
      // Gilded lines first (a matched gold row makes turnId non-null), then
      // the most recent ink.
      .orderBy(desc(isNotNull(campaignGold.turnId)), desc(campaignTurns.createdAt))
      .limit(24);

    // The left join can fan out a line gilded more than once — dedupe by turn.
    const seen = new Set<string>();
    const lines: { id: string; content: string; gilded: boolean; sessionTitle: string }[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      lines.push({
        id: row.id,
        content: row.content.length > 140 ? `${row.content.slice(0, 139).trimEnd()}…` : row.content,
        gilded: row.goldTurnId !== null,
        sessionTitle: titleById.get(row.sessionId) ?? "",
      });
      if (lines.length >= 12) break;
    }

    return NextResponse.json(
      { lines },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    console.error("GET /api/.../spectate/overture error:", error);
    return NextResponse.json({ lines: [] });
  }
}
