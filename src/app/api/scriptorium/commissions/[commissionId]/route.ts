import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  commissions,
  commissionMessages,
  offerings,
  users,
  inkDropTransactions,
} from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

// GET — get commission details + messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const { commissionId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "read");
    if (rl) return rl;

    const [commission] = await db
      .select()
      .from(commissions)
      .where(eq(commissions.id, commissionId));

    if (!commission) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Commission not found" } },
        { status: 404 }
      );
    }

    // Must be patron or artisan
    if (commission.patronId !== session.user.id && commission.artisanId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    // Get messages
    const messages = await db
      .select({
        id: commissionMessages.id,
        content: commissionMessages.content,
        attachmentUrl: commissionMessages.attachmentUrl,
        isDelivery: commissionMessages.isDelivery,
        isSystemMessage: commissionMessages.isSystemMessage,
        createdAt: commissionMessages.createdAt,
        sender: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(commissionMessages)
      .innerJoin(users, eq(commissionMessages.senderId, users.id))
      .where(eq(commissionMessages.commissionId, commissionId))
      .orderBy(commissionMessages.createdAt);

    // Get offering info
    const [offering] = await db
      .select({
        id: offerings.id,
        title: offerings.title,
        craft: offerings.craft,
      })
      .from(offerings)
      .where(eq(offerings.id, commission.offeringId));

    return NextResponse.json({ commission, messages, offering });
  } catch (error) {
    console.error("GET commission error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch commission" } },
      { status: 500 }
    );
  }
}

// PATCH — update commission status (quote, accept, deliver, complete, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commissionId: string }> }
) {
  try {
    const { commissionId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const [commission] = await db
      .select()
      .from(commissions)
      .where(eq(commissions.id, commissionId));

    if (!commission) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Commission not found" } },
        { status: 404 }
      );
    }

    const isPatron = commission.patronId === session.user.id;
    const isArtisan = commission.artisanId === session.user.id;
    if (!isPatron && !isArtisan) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, price, message, attachmentUrl } = body;

    switch (action) {
      // Artisan quotes a price
      case "quote": {
        if (!isArtisan || commission.status !== "requested") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot quote at this stage" } },
            { status: 400 }
          );
        }
        if (!price || price < 50 || price > 1500) {
          return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Price must be 50-1500 drops" } },
            { status: 400 }
          );
        }

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (await getDeliveryDays(commission.offeringId)));

        await db.update(commissions).set({
          status: "quoted",
          quotedPrice: price,
          deliveryDeadline: deadline,
          updatedAt: new Date(),
        }).where(eq(commissions.id, commissionId));

        // System message
        await db.insert(commissionMessages).values({
          commissionId,
          senderId: session.user.id,
          content: `Quoted ${price} Ink Drops. Delivery by ${deadline.toLocaleDateString()}.${message ? ` "${message}"` : ""}`,
          isSystemMessage: true,
        });

        createNotification(commission.patronId, "circle", `Your commission received a quote: ${price} drops`, `/scriptorium?tab=commissions`);
        break;
      }

      // Patron accepts quote — locks drops in vault
      case "accept": {
        if (!isPatron || commission.status !== "quoted") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot accept at this stage" } },
            { status: 400 }
          );
        }

        const agreedPrice = commission.quotedPrice!;

        // Atomic: lock drops from patron
        const result = await db.transaction(async (tx) => {
          const [patron] = await tx.execute(
            sql`SELECT ink_drop_balance FROM users WHERE id = ${commission.patronId} FOR UPDATE`
          );
          const balance = Number((patron as any)?.ink_drop_balance ?? 0);

          if (balance < agreedPrice) {
            return { error: "INSUFFICIENT_BALANCE" as const, balance };
          }

          // Debit patron (drops go to vault/escrow)
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${agreedPrice} WHERE id = ${commission.patronId}`
          );

          await tx.update(commissions).set({
            status: "in-progress",
            agreedPrice,
            updatedAt: new Date(),
          }).where(eq(commissions.id, commissionId));

          return { success: true, newBalance: balance - agreedPrice };
        });

        if ("error" in result) {
          return NextResponse.json(
            { error: { code: "INSUFFICIENT_BALANCE", message: `Not enough drops. Need ${agreedPrice}.` } },
            { status: 402 }
          );
        }

        await db.insert(commissionMessages).values({
          commissionId,
          senderId: session.user.id,
          content: `Commission accepted. ${agreedPrice} drops held in the Vault. Work begins.`,
          isSystemMessage: true,
        });

        createNotification(commission.artisanId, "circle", "Commission accepted — work can begin!", `/scriptorium?tab=commissions`);
        break;
      }

      // Artisan delivers
      case "deliver": {
        if (!isArtisan || !["in-progress", "revision"].includes(commission.status)) {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot deliver at this stage" } },
            { status: 400 }
          );
        }

        await db.update(commissions).set({
          status: "delivered",
          deliveredAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(commissions.id, commissionId));

        await db.insert(commissionMessages).values({
          commissionId,
          senderId: session.user.id,
          content: message || "Delivery submitted.",
          attachmentUrl: attachmentUrl || null,
          isDelivery: true,
        });

        createNotification(commission.patronId, "circle", "Your commission has been delivered!", `/scriptorium?tab=commissions`);
        break;
      }

      // Patron completes — releases vault to artisan
      case "complete": {
        if (!isPatron || commission.status !== "delivered") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot complete at this stage" } },
            { status: 400 }
          );
        }

        const payout = commission.agreedPrice!;
        const creatorShare = Math.floor(payout * 0.7);

        await db.transaction(async (tx) => {
          // Release vault to artisan (70%)
          await tx.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${commission.artisanId}`
          );

          // Log transaction
          await tx.insert(inkDropTransactions).values({
            fromUserId: commission.patronId,
            toUserId: commission.artisanId,
            amount: payout,
            type: "commission",
            message: "Commission completed — Vault released",
          });

          // Update offering completed count
          await tx.execute(
            sql`UPDATE offerings SET completed_count = completed_count + 1 WHERE id = ${commission.offeringId}`
          );

          await tx.update(commissions).set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(commissions.id, commissionId));
        });

        await db.insert(commissionMessages).values({
          commissionId,
          senderId: session.user.id,
          content: `Commission completed. ${creatorShare} drops released from the Vault.`,
          isSystemMessage: true,
        });

        createNotification(commission.artisanId, "circle", `Commission completed! ${creatorShare} drops released to you.`, `/scriptorium?tab=commissions`);
        break;
      }

      // Patron requests revision
      case "revision": {
        if (!isPatron || commission.status !== "delivered") {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot request revision at this stage" } },
            { status: 400 }
          );
        }

        if (commission.revisionsUsed >= commission.maxRevisions) {
          return NextResponse.json(
            { error: { code: "LIMIT_REACHED", message: "No revision rounds remaining" } },
            { status: 400 }
          );
        }

        await db.update(commissions).set({
          status: "revision",
          revisionsUsed: commission.revisionsUsed + 1,
          updatedAt: new Date(),
        }).where(eq(commissions.id, commissionId));

        await db.insert(commissionMessages).values({
          commissionId,
          senderId: session.user.id,
          content: message || "Revision requested.",
        });

        createNotification(commission.artisanId, "circle", "Revision requested on your commission", `/scriptorium?tab=commissions`);
        break;
      }

      // Either party cancels
      case "cancel": {
        const cancellableStatuses = ["requested", "quoted"];
        // Patron can cancel before acceptance
        // After acceptance, only if in-progress (with refund)
        if (!cancellableStatuses.includes(commission.status) && !(commission.status === "in-progress")) {
          return NextResponse.json(
            { error: { code: "INVALID_ACTION", message: "Cannot cancel at this stage" } },
            { status: 400 }
          );
        }

        // Refund if drops were locked
        if (commission.agreedPrice && commission.status === "in-progress") {
          await db.execute(
            sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${commission.agreedPrice} WHERE id = ${commission.patronId}`
          );
        }

        await db.update(commissions).set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: message || null,
          updatedAt: new Date(),
        }).where(eq(commissions.id, commissionId));

        const otherId = isPatron ? commission.artisanId : commission.patronId;
        createNotification(otherId, "circle", "A commission has been cancelled", `/scriptorium?tab=commissions`);
        break;
      }

      default:
        return NextResponse.json(
          { error: { code: "INVALID_ACTION", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }

    // Return updated commission
    const [updated] = await db.select().from(commissions).where(eq(commissions.id, commissionId));
    return NextResponse.json({ commission: updated });
  } catch (error) {
    console.error("PATCH commission error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update commission" } },
      { status: 500 }
    );
  }
}

async function getDeliveryDays(offeringId: string): Promise<number> {
  const [offering] = await db
    .select({ deliveryDays: offerings.deliveryDays })
    .from(offerings)
    .where(eq(offerings.id, offeringId));
  return offering?.deliveryDays ?? 7;
}
