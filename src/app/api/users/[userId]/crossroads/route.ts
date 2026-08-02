import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { crossroads, crossroadsVotes, stories } from "@/server/db/schema";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * GET /api/users/[userId]/crossroads
 * Open crossroads across this writer's public published stories — surfaced
 * on the profile so visitors can weigh in where the tales stand at a turning.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;
    const viewerId = session?.user?.id;

    const polls = await db
      .select({
        id: crossroads.id,
        storyId: crossroads.storyId,
        question: crossroads.question,
        options: crossroads.options,
        closesAt: crossroads.closesAt,
        createdAt: crossroads.createdAt,
        storyTitle: stories.title,
        storySlug: stories.slug,
      })
      .from(crossroads)
      .innerJoin(stories, eq(crossroads.storyId, stories.id))
      .where(
        and(
          eq(crossroads.creatorId, userId),
          eq(crossroads.status, "open"),
          eq(stories.isPublic, true),
          eq(stories.status, "published"),
          isNull(stories.deletedAt)
        )
      )
      .orderBy(desc(crossroads.createdAt))
      .limit(3);

    const open = polls.filter(
      (p) => !p.closesAt || new Date(p.closesAt) > new Date()
    );
    if (open.length === 0) {
      return NextResponse.json({ data: { crossroads: [] } });
    }

    const pollIds = open.map((p) => p.id);

    const voteTotals = await db
      .select({
        crossroadId: crossroadsVotes.crossroadId,
        optionIndex: crossroadsVotes.optionIndex,
        totalDrops: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)`,
        voterCount: sql<number>`count(distinct ${crossroadsVotes.userId})`,
      })
      .from(crossroadsVotes)
      .where(inArray(crossroadsVotes.crossroadId, pollIds))
      .groupBy(crossroadsVotes.crossroadId, crossroadsVotes.optionIndex);

    let userVotes: { crossroadId: string; optionIndex: number; dropsSpent: number }[] = [];
    if (viewerId) {
      userVotes = await db
        .select({
          crossroadId: crossroadsVotes.crossroadId,
          optionIndex: crossroadsVotes.optionIndex,
          dropsSpent: sql<number>`coalesce(sum(${crossroadsVotes.dropsSpent}), 0)`,
        })
        .from(crossroadsVotes)
        .where(
          and(
            inArray(crossroadsVotes.crossroadId, pollIds),
            eq(crossroadsVotes.userId, viewerId)
          )
        )
        .groupBy(crossroadsVotes.crossroadId, crossroadsVotes.optionIndex);
    }

    const enriched = open.map((poll) => {
      const options = JSON.parse(poll.options) as { label: string }[];
      const totals = voteTotals.filter((v) => v.crossroadId === poll.id);
      const grandTotal = totals.reduce((sum, v) => sum + Number(v.totalDrops), 0);

      return {
        id: poll.id,
        storyId: poll.storyId,
        storyTitle: poll.storyTitle,
        storySlug: poll.storySlug,
        question: poll.question,
        closesAt: poll.closesAt,
        createdAt: poll.createdAt,
        grandTotal,
        options: options.map((opt, i) => {
          const t = totals.find((v) => Number(v.optionIndex) === i);
          const mine = userVotes.find(
            (v) => v.crossroadId === poll.id && Number(v.optionIndex) === i
          );
          const drops = Number(t?.totalDrops ?? 0);
          return {
            label: opt.label,
            totalDrops: drops,
            voterCount: Number(t?.voterCount ?? 0),
            percentage: grandTotal > 0 ? Math.round((drops / grandTotal) * 100) : 0,
            userDrops: Number(mine?.dropsSpent ?? 0),
          };
        }),
      };
    });

    return NextResponse.json({ data: { crossroads: enriched } });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/users/[userId]/crossroads",
      "Failed to fetch crossroads",
    );
  }
}
