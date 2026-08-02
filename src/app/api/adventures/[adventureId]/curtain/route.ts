import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureAudiencePresence,
  adventureBackings,
  adventurePassages,
  adventurePassageSparks,
  adventures,
  adventureScenes,
  adventureSeats,
  adventureSuggestions,
  chapters,
  stories,
  users,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/curtain
 * The curtain call: credits and the run's numbers for a finished (or
 * quietly ended) adventure, plus where the book now lives. Public —
 * the audience takes the bow with the cast.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const [adventure] = await db
      .select()
      .from(adventures)
      .where(eq(adventures.id, adventureId));
    if (!adventure) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (adventure.status !== "finished" && adventure.status !== "abandoned") {
      return NextResponse.json(
        { error: { code: "NOT_ENDED", message: "The curtain hasn't fallen." } },
        { status: 409 }
      );
    }

    const [story] = await db
      .select({ title: stories.title, slug: stories.slug })
      .from(stories)
      .where(eq(stories.id, adventure.storyId));

    const passages = await db
      .select({
        seatId: adventurePassages.seatId,
        wordCount: adventurePassages.wordCount,
      })
      .from(adventurePassages)
      .where(eq(adventurePassages.adventureId, adventureId));
    const wordsBySeat = new Map<string, number>();
    for (const p of passages) {
      wordsBySeat.set(p.seatId, (wordsBySeat.get(p.seatId) ?? 0) + p.wordCount);
    }

    const seatRows = await db
      .select({
        seat: adventureSeats,
        userName: users.displayName,
        userFallback: users.name,
        userAvatarUrl: users.avatarUrl,
      })
      .from(adventureSeats)
      .leftJoin(users, eq(adventureSeats.userId, users.id))
      .where(eq(adventureSeats.adventureId, adventureId));

    // Same bar as the colophon: you're in the credits if you played.
    const credits = seatRows
      .filter(
        (row) => row.seat.userId && (wordsBySeat.get(row.seat.id) ?? 0) > 0
      )
      .sort((a, b) => {
        if (a.seat.role !== b.seat.role)
          return a.seat.role === "director" ? -1 : 1;
        return (
          (wordsBySeat.get(b.seat.id) ?? 0) - (wordsBySeat.get(a.seat.id) ?? 0)
        );
      })
      .map((row) => ({
        role: row.seat.role,
        userName: row.userName ?? row.userFallback ?? "a writer",
        userAvatarUrl: row.userAvatarUrl,
        characterName: row.seat.characterName,
        inkColor: row.seat.inkColor,
        words: wordsBySeat.get(row.seat.id) ?? 0,
      }));

    const [sceneStats] = await db
      .select({
        scenes: sql<number>`count(*)::int`,
        acts: sql<number>`count(distinct ${adventureScenes.actNo})::int`,
      })
      .from(adventureScenes)
      .where(eq(adventureScenes.adventureId, adventureId));

    const [pageStats] = await db
      .select({
        passages: sql<number>`count(*)::int`,
        words: sql<number>`coalesce(sum(${adventurePassages.wordCount}), 0)::int`,
        nights: sql<number>`count(distinct date(${adventurePassages.signedAt}))::int`,
      })
      .from(adventurePassages)
      .where(eq(adventurePassages.adventureId, adventureId));

    const passageIdRows = await db
      .select({ id: adventurePassages.id })
      .from(adventurePassages)
      .where(eq(adventurePassages.adventureId, adventureId));
    const passageIds = passageIdRows.map((r) => r.id);
    let sparks = 0;
    if (passageIds.length > 0) {
      const [sparkStats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(adventurePassageSparks)
        .where(inArray(adventurePassageSparks.passageId, passageIds));
      sparks = sparkStats?.count ?? 0;
    }

    const [lanternStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureAudiencePresence)
      .where(eq(adventureAudiencePresence.adventureId, adventureId));

    const [backingStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureBackings)
      .where(eq(adventureBackings.adventureId, adventureId));

    const [creditedReaders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureSuggestions)
      .where(
        and(
          eq(adventureSuggestions.adventureId, adventureId),
          eq(adventureSuggestions.status, "canonized")
        )
      );

    const [chapterStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, adventure.storyId),
          eq(chapters.status, "published"),
          isNull(chapters.deletedAt)
        )
      );

    return NextResponse.json({
      data: {
        status: adventure.status,
        title: story?.title ?? "",
        premise: adventure.premise,
        genre: adventure.genre,
        endedAt: adventure.updatedAt,
        book: {
          slug: story?.slug ?? null,
          chapters: chapterStats?.count ?? 0,
        },
        credits,
        stats: {
          acts: sceneStats?.acts ?? 0,
          scenes: sceneStats?.scenes ?? 0,
          passages: pageStats?.passages ?? 0,
          words: pageStats?.words ?? 0,
          nights: pageStats?.nights ?? 0,
          sparks,
          readers: lanternStats?.count ?? 0,
          backings: backingStats?.count ?? 0,
          creditedReaders: creditedReaders?.count ?? 0,
        },
      },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/adventures/[adventureId]/curtain",
      "Failed to raise the lights",
    );
  }
}
