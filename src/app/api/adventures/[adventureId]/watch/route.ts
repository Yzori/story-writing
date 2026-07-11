import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureAudiencePresence,
  adventureBackings,
  adventureScenes,
  crossroads,
  crossroadsVotes,
  stories,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

const PRESENCE_WINDOW_MS = 45_000;

/**
 * GET /api/adventures/[adventureId]/watch
 * The public watch state: the table as the audience sees it. No
 * hands, no whispers — those belong to the cast. Includes the lantern
 * count, backings, and the open house vote.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session?.user?.id ?? null);
    if (!ctx) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const [story] = await db
      .select({ title: stories.title })
      .from(stories)
      .where(eq(stories.id, ctx.adventure.storyId));

    const scenes = await db
      .select()
      .from(adventureScenes)
      .where(eq(adventureScenes.adventureId, adventureId))
      .orderBy(adventureScenes.openedAt);

    const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
    const [present] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureAudiencePresence)
      .where(
        and(
          eq(adventureAudiencePresence.adventureId, adventureId),
          gt(adventureAudiencePresence.lastHeartbeat, cutoff)
        )
      );
    const [allTime] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureAudiencePresence)
      .where(eq(adventureAudiencePresence.adventureId, adventureId));

    const backingRows = await db
      .select({
        seatId: adventureBackings.seatId,
        count: sql<number>`count(*)::int`,
      })
      .from(adventureBackings)
      .where(eq(adventureBackings.adventureId, adventureId))
      .groupBy(adventureBackings.seatId);
    let myBackingSeatId: string | null = null;
    if (session?.user?.id) {
      const [mine] = await db
        .select({ seatId: adventureBackings.seatId })
        .from(adventureBackings)
        .where(
          and(
            eq(adventureBackings.adventureId, adventureId),
            eq(adventureBackings.userId, session.user.id)
          )
        );
      myBackingSeatId = mine?.seatId ?? null;
    }

    // The open house vote, drop-weighted.
    const [vote] = await db
      .select()
      .from(crossroads)
      .where(
        and(
          eq(crossroads.adventureId, adventureId),
          eq(crossroads.status, "open")
        )
      )
      .orderBy(sql`${crossroads.createdAt} desc`)
      .limit(1);
    let houseVote = null;
    if (vote) {
      const tallies = await db
        .select({
          optionIndex: crossroadsVotes.optionIndex,
          totalDrops: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)::int`,
        })
        .from(crossroadsVotes)
        .where(eq(crossroadsVotes.crossroadId, vote.id))
        .groupBy(crossroadsVotes.optionIndex);
      let options: Array<{ label: string }> = [];
      try {
        options = JSON.parse(vote.options);
      } catch {
        options = [];
      }
      const totals = options.map(
        (_, i) => tallies.find((t) => t.optionIndex === i)?.totalDrops ?? 0
      );
      const grand = totals.reduce((a, b) => a + b, 0);
      houseVote = {
        id: vote.id,
        storyId: ctx.adventure.storyId,
        question: vote.question,
        closesAt: vote.closesAt,
        options: options.map((option, i) => ({
          label: option.label,
          drops: totals[i],
          pct: grand === 0 ? 0 : Math.round((totals[i] / grand) * 100),
        })),
      };
    }

    return NextResponse.json({
      data: {
        adventure: {
          id: ctx.adventure.id,
          storyId: ctx.adventure.storyId,
          title: story?.title ?? "",
          premise: ctx.adventure.premise,
          genre: ctx.adventure.genre,
          pace: ctx.adventure.pace,
          status: ctx.adventure.status,
          actNo: ctx.adventure.actNo,
          sceneNo: ctx.adventure.sceneNo,
          spotlightSeatId: ctx.adventure.spotlightSeatId,
          updatedAt: ctx.adventure.updatedAt,
        },
        seats: ctx.seats
          .filter((s) => s.status === "seated")
          .map((seat) => ({
            id: seat.id,
            role: seat.role,
            characterName: seat.characterName,
            characterBrief: seat.characterBrief,
            inkColor: seat.inkColor,
            userName: seat.userName,
            backers:
              backingRows.find((b) => b.seatId === seat.id)?.count ?? 0,
          })),
        scenes,
        audience: {
          present: present?.count ?? 0,
          allTime: allTime?.count ?? 0,
        },
        myBackingSeatId,
        houseVote,
        signedIn: !!session?.user?.id,
      },
    });
  } catch (error) {
    console.error("GET /api/adventures/[adventureId]/watch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to open the room" } },
      { status: 500 }
    );
  }
}
