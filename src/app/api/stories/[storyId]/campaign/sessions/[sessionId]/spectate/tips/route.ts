import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  campaignSessions,
  inkDropTransactions,
  users,
} from "@/server/db/schema";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { inkDropTipSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { createNotification } from "@/server/services/notifications";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/tips
 * Send an Ink Drop tip. Auth required.
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

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 10,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const body = await request.json();
    const { recipientUserId, amount, message } = inkDropTipSchema.parse(body);

    // Can't tip yourself
    if (recipientUserId === session.user.id) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Cannot tip yourself" } },
        { status: 400 }
      );
    }

    // Verify story and session exist
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || !story.isPublic) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!campaignSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    // Verify recipient exists
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, recipientUserId),
      columns: { id: true, displayName: true, name: true },
    });
    if (!recipient) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Recipient not found" } },
        { status: 404 }
      );
    }

    // Atomic transfer
    const result = await db.transaction(async (tx) => {
      // Lock sender row and check balance
      const [sender] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, session.user.id))
        .for("update");

      if (!sender || sender.inkDropBalance < amount) {
        return { error: "INSUFFICIENT_BALANCE" as const };
      }

      // Debit sender
      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} - ${amount}` })
        .where(eq(users.id, session.user.id));

      // Credit recipient
      await tx
        .update(users)
        .set({ inkDropBalance: sql`${users.inkDropBalance} + ${amount}` })
        .where(eq(users.id, recipientUserId));

      // Log transaction
      await tx.insert(inkDropTransactions).values({
        fromUserId: session.user.id,
        toUserId: recipientUserId,
        sessionId,
        amount,
        type: "tip",
        message: message || null,
      });

      // Return new balance
      const [updated] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, session.user.id));

      return { newBalance: updated.inkDropBalance };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_BALANCE", message: "Not enough Ink Drops" } },
        { status: 400 }
      );
    }

    // Fire-and-forget notification
    const senderName = session.user.name || "Someone";
    createNotification(
      recipientUserId,
      "tip",
      `${senderName} sent you ${amount} Ink Drops${message ? `: "${message}"` : ""}`,
      `/campaign/${storyId}/watch/${sessionId}`
    );

    return NextResponse.json({ ok: true, newBalance: result.newBalance });
  } catch (error) {
    console.error("POST tip error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send tip" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/spectate/tips
 * Poll for recent tips in session. Supports ?after=<ISO timestamp>.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", {
      max: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId, sessionId } = await params;

    // Verify story is public and session belongs to it — mirrors the POST
    // handler and the other spectate GET endpoints.
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story || !story.isPublic) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    const campaignSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!campaignSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const afterParam = url.searchParams.get("after");

    const after = afterParam
      ? new Date(afterParam)
      : new Date(Date.now() - 30_000);

    const rows = await db
      .select({
        id: inkDropTransactions.id,
        fromDisplayName: users.displayName,
        amount: inkDropTransactions.amount,
        message: inkDropTransactions.message,
        createdAt: inkDropTransactions.createdAt,
      })
      .from(inkDropTransactions)
      .leftJoin(users, eq(inkDropTransactions.fromUserId, users.id))
      .where(
        and(
          eq(inkDropTransactions.sessionId, sessionId),
          eq(inkDropTransactions.type, "tip"),
          gt(inkDropTransactions.createdAt, after)
        )
      )
      .orderBy(inkDropTransactions.createdAt)
      .limit(50);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET tips error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch tips" } },
      { status: 500 }
    );
  }
}
