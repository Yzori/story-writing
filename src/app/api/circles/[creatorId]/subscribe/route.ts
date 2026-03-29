import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  creatorCircles,
  circleSubscriptions,
  users,
  inkDropTransactions,
} from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

// POST — subscribe to a creator's circle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const readerId = session.user.id;

    // Can't subscribe to yourself
    if (readerId === creatorId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You cannot subscribe to your own Circle" } },
        { status: 400 }
      );
    }

    // Check circle exists and is active
    const [circle] = await db
      .select()
      .from(creatorCircles)
      .where(and(eq(creatorCircles.creatorId, creatorId), eq(creatorCircles.isActive, true)));

    if (!circle) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "This creator does not have an active Circle" } },
        { status: 404 }
      );
    }

    // Check not already subscribed
    const [existing] = await db
      .select()
      .from(circleSubscriptions)
      .where(
        and(
          eq(circleSubscriptions.readerId, readerId),
          eq(circleSubscriptions.creatorId, creatorId),
          eq(circleSubscriptions.status, "active")
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: { code: "ALREADY_SUBSCRIBED", message: "You are already a member of this Circle" } },
        { status: 409 }
      );
    }

    const price = circle.confidantPrice;

    // Atomic: check balance, debit, create subscription, log transaction
    const result = await db.transaction(async (tx) => {
      // Lock reader's row and check balance
      const [reader] = await tx.execute(
        sql`SELECT ink_drop_balance FROM users WHERE id = ${readerId} FOR UPDATE`
      );
      const balance = Number((reader as any)?.ink_drop_balance ?? 0);

      if (balance < price) {
        return { error: "INSUFFICIENT_BALANCE" as const, balance };
      }

      // Debit reader
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${price} WHERE id = ${readerId}`
      );

      // Credit creator (70% — platform takes 30%)
      const creatorShare = Math.floor(price * 0.7);
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${creatorId}`
      );

      // Log transaction
      await tx.insert(inkDropTransactions).values({
        fromUserId: readerId,
        toUserId: creatorId,
        amount: price,
        type: "circle",
        message: "Circle subscription — Confidant tier",
      });

      // Calculate renewal date (30 days from now)
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);

      // Create or reactivate subscription
      const [existingAny] = await tx
        .select()
        .from(circleSubscriptions)
        .where(
          and(
            eq(circleSubscriptions.readerId, readerId),
            eq(circleSubscriptions.creatorId, creatorId)
          )
        );

      let sub;
      if (existingAny) {
        [sub] = await tx
          .update(circleSubscriptions)
          .set({
            status: "active",
            tier: "confidant",
            priceAtSubscription: price,
            renewalDate,
            cancelledAt: null,
            startedAt: new Date(),
          })
          .where(eq(circleSubscriptions.id, existingAny.id))
          .returning();
      } else {
        [sub] = await tx
          .insert(circleSubscriptions)
          .values({
            readerId,
            creatorId,
            tier: "confidant",
            status: "active",
            priceAtSubscription: price,
            renewalDate,
          })
          .returning();
      }

      return { subscription: sub, newBalance: balance - price };
    });

    if ("error" in result && result.error === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Not enough Ink Drops. You need ${price} but have ${result.balance}.`,
          },
        },
        { status: 402 }
      );
    }

    // Notify creator
    const [readerInfo] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, readerId));

    createNotification(
      creatorId,
      "circle",
      `${readerInfo?.displayName || "Someone"} joined your Circle as a Confidant`,
      "/creator/circle"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/circles/[creatorId]/subscribe error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to subscribe" } },
      { status: 500 }
    );
  }
}

// DELETE — cancel subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const [sub] = await db
      .update(circleSubscriptions)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(
        and(
          eq(circleSubscriptions.readerId, session.user.id),
          eq(circleSubscriptions.creatorId, creatorId),
          eq(circleSubscriptions.status, "active")
        )
      )
      .returning();

    if (!sub) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No active subscription found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ cancelled: true, accessUntil: sub.renewalDate });
  } catch (error) {
    console.error("DELETE /api/circles/[creatorId]/subscribe error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to cancel subscription" } },
      { status: 500 }
    );
  }
}
