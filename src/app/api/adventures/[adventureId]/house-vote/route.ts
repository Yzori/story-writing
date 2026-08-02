import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { crossroads } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { adventureHouseVoteSchema } from "@/lib/validations";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/house-vote
 * The Director puts a question to the house. It's a Crossroads under
 * the hood — drop-weighted, voted through the existing
 * /api/stories/[storyId]/crossroads/[id]/vote route — scoped to the
 * adventure so the watch page can show it. One open question at a
 * time; the Director keeps the final word.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = adventureHouseVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || ctx.mySeat?.role !== "director") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (ctx.adventure.status !== "running") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "The table isn't running" } },
        { status: 409 }
      );
    }

    const [open] = await db
      .select({ id: crossroads.id })
      .from(crossroads)
      .where(
        and(
          eq(crossroads.adventureId, adventureId),
          eq(crossroads.status, "open")
        )
      );
    if (open) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_ALLOWED",
            message: "One question at a time — close the open one first.",
          },
        },
        { status: 409 }
      );
    }

    const [vote] = await db
      .insert(crossroads)
      .values({
        storyId: ctx.adventure.storyId,
        creatorId: session.user.id,
        adventureId,
        question: parsed.data.question,
        options: JSON.stringify(
          parsed.data.options.map((label) => ({ label }))
        ),
        closesAt: new Date(
          Date.now() + parsed.data.closesInHours * 60 * 60 * 1000
        ),
      })
      .returning();

    return NextResponse.json({ data: vote }, { status: 201 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/house-vote",
      "Failed to ask the house",
    );
  }
}
