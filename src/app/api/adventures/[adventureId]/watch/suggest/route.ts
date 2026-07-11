import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { adventures, adventureSuggestions } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { adventureSuggestionSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ adventureId: string }> };

const MAX_WAITING_PER_READER = 3;

/**
 * POST /api/adventures/[adventureId]/watch/suggest
 * Send the Director a suggestion (≤280 chars, plain text). If they
 * write it in, the passage is credited to you.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to send a suggestion" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = adventureSuggestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    const [adventure] = await db
      .select({ id: adventures.id, status: adventures.status })
      .from(adventures)
      .where(eq(adventures.id, adventureId));
    if (!adventure || adventure.status !== "running") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "This table isn't running" } },
        { status: 404 }
      );
    }

    const [waiting] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adventureSuggestions)
      .where(
        and(
          eq(adventureSuggestions.adventureId, adventureId),
          eq(adventureSuggestions.userId, session.user.id),
          eq(adventureSuggestions.status, "waiting")
        )
      );
    if ((waiting?.count ?? 0) >= MAX_WAITING_PER_READER) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_ALLOWED",
            message: "Three suggestions are already waiting — let the Director catch up.",
          },
        },
        { status: 409 }
      );
    }

    const [suggestion] = await db
      .insert(adventureSuggestions)
      .values({
        adventureId,
        userId: session.user.id,
        // Plain text only — strip anything that looks like markup.
        content: parsed.data.content.replace(/<[^>]*>/g, "").trim(),
      })
      .returning();

    return NextResponse.json({ data: suggestion }, { status: 201 });
  } catch (error) {
    console.error("watch/suggest error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send the suggestion" } },
      { status: 500 }
    );
  }
}
