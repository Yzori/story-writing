import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  crossroads,
  crossroadsVotes,
  stories,
} from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { distributeEarnings } from "@/server/services/ink-drops";

// POST — vote on a crossroad (spend drops)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; crossroadId: string }> }
) {
  try {
    const { storyId, crossroadId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const body = await request.json();
    const { optionIndex, amount } = body;

    // Validate amount (min 5, max 200 per vote)
    if (!amount || typeof amount !== "number" || amount < 5 || amount > 200) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Vote amount must be 5-200 drops" } },
        { status: 400 }
      );
    }

    // Get crossroad
    const [crossroad] = await db
      .select()
      .from(crossroads)
      .where(and(eq(crossroads.id, crossroadId), eq(crossroads.storyId, storyId)));

    if (!crossroad) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Crossroad not found" } },
        { status: 404 }
      );
    }

    // Must be open
    if (crossroad.status !== "open") {
      return NextResponse.json(
        { error: { code: "CLOSED", message: "This crossroad is no longer open for voting" } },
        { status: 400 }
      );
    }

    // Check expiry
    if (crossroad.closesAt && new Date(crossroad.closesAt) < new Date()) {
      // Auto-close
      await db.update(crossroads).set({ status: "closed" }).where(eq(crossroads.id, crossroadId));
      return NextResponse.json(
        { error: { code: "CLOSED", message: "This crossroad has expired" } },
        { status: 400 }
      );
    }

    // Validate option index
    const options = JSON.parse(crossroad.options) as { label: string }[];
    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= options.length) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid option" } },
        { status: 400 }
      );
    }

    // Can't vote on own crossroad
    if (crossroad.creatorId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot vote on your own crossroad" } },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get story owner for payout
    const [story] = await db
      .select({ userId: stories.userId })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Atomic: debit voter, credit creator, log vote
    const result = await db.transaction(async (tx) => {
      const [voter] = await tx.execute(
        sql`SELECT ink_drop_balance FROM users WHERE id = ${userId} FOR UPDATE`
      );
      const balance = Number((voter as { ink_drop_balance?: number | string } | undefined)?.ink_drop_balance ?? 0);

      if (balance < amount) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance };
      }

      // Debit voter
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${amount} WHERE id = ${userId}`
      );

      // Pay out — honors the story's signed agreement splits if one is active,
      // else all to the owner. Credits balances and logs the ledger rows.
      await distributeEarnings(tx, {
        storyId,
        ownerId: story.userId,
        fromUserId: userId,
        gross: amount,
        type: "crossroads",
        message: `Crossroad vote: "${options[optionIndex].label}"`,
      });

      // Record vote (users can vote multiple times, each adds weight)
      const [vote] = await tx
        .insert(crossroadsVotes)
        .values({
          crossroadId,
          userId,
          optionIndex,
          dropsSpent: amount,
        })
        .returning();

      return { vote, newBalance: balance - amount };
    });

    if ("error" in result && result.error === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Not enough Ink Drops. You need ${amount} but have ${result.balance}.`,
          },
        },
        { status: 402 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST crossroad vote error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to vote" } },
      { status: 500 }
    );
  }
}
