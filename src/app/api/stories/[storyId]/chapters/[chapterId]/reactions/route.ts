import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { reactions } from "@/server/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { auth } from "@/server/auth";
import { createReactionSchema } from "@/lib/validations";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

/**
 * GET /api/stories/[storyId]/chapters/[chapterId]/reactions
 * Returns reaction counts grouped by type and the current user's reaction.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId, chapterId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    // Get counts grouped by type
    const countRows = await db
      .select({
        type: reactions.type,
        count: count(),
      })
      .from(reactions)
      .where(
        and(eq(reactions.storyId, storyId), eq(reactions.chapterId, chapterId))
      )
      .groupBy(reactions.type);

    const counts: Record<string, number> = {};
    for (const row of countRows) {
      counts[row.type] = row.count;
    }

    // Get user's reaction if authenticated
    let userReaction: string | null = null;
    if (userId) {
      const existing = await db
        .select({ type: reactions.type })
        .from(reactions)
        .where(
          and(
            eq(reactions.chapterId, chapterId),
            eq(reactions.userId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        userReaction = existing[0].type;
      }
    }

    return NextResponse.json({
      data: { counts, userReaction },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/chapters/[chapterId]/reactions",
      "Failed to fetch reactions",
    );
  }
}

/**
 * POST /api/stories/[storyId]/chapters/[chapterId]/reactions
 * Toggle or change a reaction. Requires authentication.
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

    const { storyId, chapterId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const parsed = createReactionSchema.safeParse(body);
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

    const { type } = parsed.data;

    // Atomic toggle using transaction to prevent race conditions
    const userReaction = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: reactions.id, type: reactions.type })
        .from(reactions)
        .where(
          and(eq(reactions.chapterId, chapterId), eq(reactions.userId, userId))
        )
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].type === type) {
          // Same reaction — toggle off
          await tx
            .delete(reactions)
            .where(eq(reactions.id, existing[0].id));
          return null;
        } else {
          // Different reaction — update
          await tx
            .update(reactions)
            .set({ type })
            .where(eq(reactions.id, existing[0].id));
          return type;
        }
      } else {
        // No existing reaction — create
        await tx.insert(reactions).values({
          userId,
          chapterId,
          storyId,
          type,
        });
        return type;
      }
    });

    // Get updated counts
    const countRows = await db
      .select({
        type: reactions.type,
        count: count(),
      })
      .from(reactions)
      .where(
        and(eq(reactions.storyId, storyId), eq(reactions.chapterId, chapterId))
      )
      .groupBy(reactions.type);

    const counts: Record<string, number> = {};
    for (const row of countRows) {
      counts[row.type] = row.count;
    }

    return NextResponse.json({
      data: { counts, userReaction },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/chapters/[chapterId]/reactions",
      "Failed to toggle reaction",
    );
  }
}
