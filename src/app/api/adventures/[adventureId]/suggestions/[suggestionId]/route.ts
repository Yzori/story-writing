import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventureSuggestions } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = {
  params: Promise<{ adventureId: string; suggestionId: string }>;
};

/**
 * DELETE /api/adventures/[adventureId]/suggestions/[suggestionId]
 * Dismiss a suggestion (Director). Canonizing happens through
 * signing a passage with canonizeSuggestionId — the credit needs a
 * passage to live under.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId, suggestionId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || ctx.mySeat?.role !== "director") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(adventureSuggestions)
      .set({ status: "dismissed", resolvedAt: new Date() })
      .where(
        and(
          eq(adventureSuggestions.id, suggestionId),
          eq(adventureSuggestions.adventureId, adventureId),
          eq(adventureSuggestions.status, "waiting")
        )
      )
      .returning({ id: adventureSuggestions.id });
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "That suggestion is gone" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { dismissed: true } });
  } catch (error) {
    console.error("DELETE suggestion error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to dismiss" } },
      { status: 500 }
    );
  }
}
