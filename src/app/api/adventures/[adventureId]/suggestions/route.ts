import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureSuggestions, users } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/suggestions
 * The waiting suggestion stack — Director's eyes only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || ctx.mySeat?.role !== "director") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const rows = await db
      .select({
        suggestion: adventureSuggestions,
        readerName: users.displayName,
        readerFallback: users.name,
      })
      .from(adventureSuggestions)
      .leftJoin(users, eq(adventureSuggestions.userId, users.id))
      .where(
        and(
          eq(adventureSuggestions.adventureId, adventureId),
          eq(adventureSuggestions.status, "waiting")
        )
      )
      .orderBy(asc(adventureSuggestions.createdAt))
      .limit(30);

    return NextResponse.json({
      data: rows.map((row) => ({
        id: row.suggestion.id,
        content: row.suggestion.content,
        readerName: row.readerName ?? row.readerFallback ?? "a reader",
        createdAt: row.suggestion.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET suggestions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load suggestions" } },
      { status: 500 }
    );
  }
}
