import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  users,
  storyDonations,
  inkDropTransactions,
} from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

// GET — recent donations for a story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    const donations = await db
      .select({
        id: storyDonations.id,
        amount: storyDonations.amount,
        message: storyDonations.message,
        createdAt: storyDonations.createdAt,
        from: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(storyDonations)
      .innerJoin(users, eq(storyDonations.fromUserId, users.id))
      .where(eq(storyDonations.storyId, storyId))
      .orderBy(desc(storyDonations.createdAt))
      .limit(20);

    // Total received
    const [totals] = await db
      .select({
        total: sql<number>`coalesce(sum(${storyDonations.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(storyDonations)
      .where(eq(storyDonations.storyId, storyId));

    return NextResponse.json({
      donations,
      total: Number(totals?.total ?? 0),
      count: Number(totals?.count ?? 0),
    });
  } catch (error) {
    console.error("GET donations error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch donations" } },
      { status: 500 }
    );
  }
}

// POST — send a donation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

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
    const { amount, message } = body;

    // Validate amount (min 5, max 500)
    if (!amount || typeof amount !== "number" || amount < 5 || amount > 500) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Amount must be 5-500 drops" } },
        { status: 400 }
      );
    }

    // Validate message
    if (message && message.length > 300) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Message must be under 300 characters" } },
        { status: 400 }
      );
    }

    // Get story owner
    const [story] = await db
      .select({ userId: stories.userId, title: stories.title })
      .from(stories)
      .where(eq(stories.id, storyId));

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Can't donate to yourself
    if (story.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot donate to your own story" } },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const creatorShare = Math.floor(amount * 0.7);

    // Atomic: debit donor, credit creator, log
    const result = await db.transaction(async (tx) => {
      const [donor] = await tx.execute(
        sql`SELECT ink_drop_balance FROM users WHERE id = ${userId} FOR UPDATE`
      );
      const balance = Number((donor as any)?.ink_drop_balance ?? 0);

      if (balance < amount) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance };
      }

      // Debit donor
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${amount} WHERE id = ${userId}`
      );

      // Credit creator (70%)
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${story.userId}`
      );

      // Log transaction
      await tx.insert(inkDropTransactions).values({
        fromUserId: userId,
        toUserId: story.userId,
        amount,
        type: "donation",
        message: message || `Donation for "${story.title}"`,
      });

      // Log donation record
      const [donation] = await tx
        .insert(storyDonations)
        .values({
          fromUserId: userId,
          toUserId: story.userId,
          storyId,
          amount,
          message: message || null,
        })
        .returning();

      return { donation, newBalance: balance - amount };
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

    // Notify creator
    const [donorInfo] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId));

    createNotification(
      story.userId,
      "tip",
      `${donorInfo?.displayName || "Someone"} left a gift of ${amount} drops on "${story.title}"${message ? `: "${message}"` : ""}`,
      `/story/${storyId}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST donation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send donation" } },
      { status: 500 }
    );
  }
}
