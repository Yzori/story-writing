import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  campaignSessions,
  chapters,
  playerCharacters,
  stories,
} from "@/server/db/schema";
import { auth } from "@/server/auth";

/**
 * GET /api/campaigns/mine
 *
 * Returns every campaign-mode story the current user is participating in,
 * whether as the GM (story owner) or as a player (active character). The
 * dashboard uses this to surface "live tables" and shelf items the legacy
 * /api/stories?mine=true endpoint hides — that one only returns owned
 * stories, which leaves player-only participants with an empty study.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    // 1) Find campaign stories where the user is the GM OR has any
    //    player character row. We keep the EXISTS subquery on the join-
    //    less stories table so a user who is both GM and player doesn't
    //    appear twice.
    const rows = await db
      .select({
        id: stories.id,
        title: stories.title,
        synopsis: stories.synopsis,
        coverImageUrl: stories.coverImageUrl,
        ownerId: stories.userId,
        status: stories.status,
        writingMode: stories.writingMode,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(
        and(
          eq(stories.writingMode, "campaign"),
          isNull(stories.deletedAt),
          or(
            eq(stories.userId, userId),
            sql`exists (
              select 1 from ${playerCharacters} pc
              where pc.story_id = ${stories.id}
                and pc.user_id = ${userId}
            )`,
          ),
        ),
      )
      .orderBy(desc(stories.updatedAt));

    if (rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const storyIds = rows.map((r) => r.id);

    // 2) Batch-fetch the related data we need for each story.
    const [activeSessionRows, myCharRows, playerCountRows, chapterStatRows] =
      await Promise.all([
        db
          .select({
            storyId: campaignSessions.storyId,
            id: campaignSessions.id,
            title: campaignSessions.title,
            status: campaignSessions.status,
            activePlayerId: campaignSessions.activePlayerId,
            updatedAt: campaignSessions.updatedAt,
          })
          .from(campaignSessions)
          .where(
            and(
              inArray(campaignSessions.storyId, storyIds),
              eq(campaignSessions.status, "active"),
            ),
          ),
        db
          .select({
            storyId: playerCharacters.storyId,
            id: playerCharacters.id,
            name: playerCharacters.name,
            status: playerCharacters.status,
            updatedAt: playerCharacters.updatedAt,
          })
          .from(playerCharacters)
          .where(
            and(
              inArray(playerCharacters.storyId, storyIds),
              eq(playerCharacters.userId, userId),
            ),
          ),
        db
          .select({
            storyId: playerCharacters.storyId,
            count: sql<number>`count(distinct ${playerCharacters.userId})`,
          })
          .from(playerCharacters)
          .where(
            and(
              inArray(playerCharacters.storyId, storyIds),
              eq(playerCharacters.status, "active"),
            ),
          )
          .groupBy(playerCharacters.storyId),
        db
          .select({
            storyId: chapters.storyId,
            chapterCount: sql<number>`count(*)`,
            totalWords: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`,
          })
          .from(chapters)
          .where(
            and(
              inArray(chapters.storyId, storyIds),
              isNull(chapters.deletedAt),
            ),
          )
          .groupBy(chapters.storyId),
      ]);

    // 3) Index by storyId. For active sessions there's at most one in
    //    practice (enforced by the partial unique index from migration
    //    0018), but we still pick the most recently updated as a guard.
    const sessionByStory = new Map<string, (typeof activeSessionRows)[number]>();
    for (const s of activeSessionRows) {
      const existing = sessionByStory.get(s.storyId);
      if (
        !existing ||
        (s.updatedAt && existing.updatedAt && s.updatedAt > existing.updatedAt)
      ) {
        sessionByStory.set(s.storyId, s);
      }
    }
    // Prefer an active character; fall back to whatever we have if the
    // user only has a retired/dead one (still useful for "you played
    // here once" indicators).
    const myCharByStory = new Map<string, (typeof myCharRows)[number]>();
    for (const c of myCharRows) {
      const existing = myCharByStory.get(c.storyId);
      if (
        !existing ||
        (c.status === "active" && existing.status !== "active") ||
        (c.status === existing.status &&
          c.updatedAt &&
          existing.updatedAt &&
          c.updatedAt > existing.updatedAt)
      ) {
        myCharByStory.set(c.storyId, c);
      }
    }
    const countByStory = new Map<string, number>(
      playerCountRows.map((p) => [p.storyId, Number(p.count)]),
    );
    const chaptersByStory = new Map<
      string,
      { count: number; words: number }
    >(
      chapterStatRows.map((c) => [
        c.storyId,
        { count: Number(c.chapterCount), words: Number(c.totalWords) },
      ]),
    );

    // 4) Stitch everything together into the per-story payload.
    const data = rows.map((r) => {
      const isOwner = r.ownerId === userId;
      const myCharRow = myCharByStory.get(r.id);
      const sessionRow = sessionByStory.get(r.id);
      const chapterRow = chaptersByStory.get(r.id);
      return {
        id: r.id,
        title: r.title,
        synopsis: r.synopsis,
        coverImageUrl: r.coverImageUrl,
        writingMode: r.writingMode,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        role: isOwner && myCharRow ? ("both" as const)
            : isOwner ? ("gm" as const)
            : ("player" as const),
        playerCount: countByStory.get(r.id) ?? 0,
        chapterCount: chapterRow?.count ?? 0,
        totalWords: chapterRow?.words ?? 0,
        myCharacter: myCharRow
          ? { id: myCharRow.id, name: myCharRow.name, status: myCharRow.status }
          : null,
        activeSession: sessionRow
          ? {
              id: sessionRow.id,
              title: sessionRow.title,
              status: sessionRow.status,
              activePlayerId: sessionRow.activePlayerId,
            }
          : null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/campaigns/mine error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load campaigns" } },
      { status: 500 },
    );
  }
}
