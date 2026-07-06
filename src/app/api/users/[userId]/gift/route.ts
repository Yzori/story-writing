import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, storyDonations, inkDropTransactions } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";
import { CREATOR_SHARE } from "@/lib/constants";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * POST /api/users/[userId]/gift
 * Leave a gift at the writer's study — a profile-level donation, no story
 * attached. Same economics as story donations (70% to the writer).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: recipientId } = await params;

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

    if (!amount || typeof amount !== "number" || amount < 5 || amount > 500) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Amount must be 5-500 drops" } },
        { status: 400 }
      );
    }
    if (message && (typeof message !== "string" || message.length > 300)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Message must be under 300 characters" } },
        { status: 400 }
      );
    }

    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You can't leave a gift for yourself" } },
        { status: 400 }
      );
    }

    const [recipient] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        profileShowGifts: users.profileShowGifts,
      })
      .from(users)
      .where(eq(users.id, recipientId));

    if (!recipient) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    if (!recipient.profileShowGifts) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This writer isn't accepting gifts" } },
        { status: 403 }
      );
    }

    const giverId = session.user.id;
    const creatorShare = Math.floor(amount * CREATOR_SHARE);

    // Atomic: debit giver, credit writer, log
    const result = await db.transaction(async (tx) => {
      const [giver] = await tx.execute(
        sql`SELECT ink_drop_balance FROM users WHERE id = ${giverId} FOR UPDATE`
      );
      const balance = Number(
        (giver as { ink_drop_balance?: number | string } | undefined)?.ink_drop_balance ?? 0
      );

      if (balance < amount) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance };
      }

      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${amount} WHERE id = ${giverId}`
      );
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${recipientId}`
      );

      await tx.insert(inkDropTransactions).values({
        fromUserId: giverId,
        toUserId: recipientId,
        amount,
        type: "donation",
        message: message || "A gift left at the study",
      });

      const [donation] = await tx
        .insert(storyDonations)
        .values({
          fromUserId: giverId,
          toUserId: recipientId,
          storyId: null,
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

    const [giverInfo] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, giverId));

    createNotification(
      recipientId,
      "tip",
      `${giverInfo?.displayName || "Someone"} left a gift of ${amount} drops at your study${message ? `: "${message}"` : ""}`,
      `/profile/${recipientId}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/users/[userId]/gift error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send gift" } },
      { status: 500 }
    );
  }
}
