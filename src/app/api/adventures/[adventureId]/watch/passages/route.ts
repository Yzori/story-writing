import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventurePassages,
  adventurePassageSparks,
  adventures,
  adventureSuggestions,
  users,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/watch/passages?afterSort=N
 * The page for the audience: passages with spark counts, whether the
 * caller sparked each one, and reader-credit lines for canonized
 * suggestions.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const [adventure] = await db
      .select({ id: adventures.id })
      .from(adventures)
      .where(eq(adventures.id, adventureId));
    if (!adventure) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const afterSortParam = request.nextUrl.searchParams.get("afterSort");
    const afterSort =
      afterSortParam === null ? null : parseInt(afterSortParam, 10);
    const conditions = [eq(adventurePassages.adventureId, adventureId)];
    if (afterSort !== null && Number.isFinite(afterSort)) {
      conditions.push(gt(adventurePassages.sortOrder, afterSort));
    }

    const passages = await db
      .select()
      .from(adventurePassages)
      .where(and(...conditions))
      .orderBy(asc(adventurePassages.sortOrder));

    if (passages.length === 0) return NextResponse.json({ data: [] });
    const passageIds = passages.map((p) => p.id);

    const sparkRows = await db
      .select({
        passageId: adventurePassageSparks.passageId,
        count: sql<number>`count(*)::int`,
      })
      .from(adventurePassageSparks)
      .where(inArray(adventurePassageSparks.passageId, passageIds))
      .groupBy(adventurePassageSparks.passageId);

    const mySparks = new Set<string>();
    if (session?.user?.id) {
      const mine = await db
        .select({ passageId: adventurePassageSparks.passageId })
        .from(adventurePassageSparks)
        .where(
          and(
            inArray(adventurePassageSparks.passageId, passageIds),
            eq(adventurePassageSparks.userId, session.user.id)
          )
        );
      for (const row of mine) mySparks.add(row.passageId);
    }

    // "detail from reader ⟨name⟩" — canonized suggestions credit lines.
    const credits = await db
      .select({
        passageId: adventureSuggestions.canonizedPassageId,
        readerName: users.displayName,
        readerFallback: users.name,
      })
      .from(adventureSuggestions)
      .leftJoin(users, eq(adventureSuggestions.userId, users.id))
      .where(
        and(
          eq(adventureSuggestions.adventureId, adventureId),
          eq(adventureSuggestions.status, "canonized"),
          inArray(adventureSuggestions.canonizedPassageId, passageIds)
        )
      );

    return NextResponse.json({
      data: passages.map((passage) => ({
        ...passage,
        sparks: sparkRows.find((s) => s.passageId === passage.id)?.count ?? 0,
        sparkedByMe: mySparks.has(passage.id),
        readerCredit:
          credits
            .filter((c) => c.passageId === passage.id)
            .map((c) => c.readerName ?? c.readerFallback ?? "a reader")[0] ??
          null,
      })),
    });
  } catch (error) {
    console.error("GET watch/passages error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load the page" } },
      { status: 500 }
    );
  }
}
