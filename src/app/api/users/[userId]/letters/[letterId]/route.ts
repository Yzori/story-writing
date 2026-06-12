import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profileLetters, users } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ userId: string; letterId: string }> };

const MAX_REPLY = 2000;

const updateLetterSchema = z
  .object({
    reply: z.string().trim().min(1).max(MAX_REPLY).optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((d) => d.reply !== undefined || d.isPinned !== undefined, {
    message: "Nothing to update",
  });

/**
 * PATCH /api/users/[userId]/letters/[letterId]
 * Writer answers (or edits the answer to) a letter, and/or pins it.
 * Answering makes the correspondence public. Only one pinned letter.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { userId, letterId } = await params;
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the desk's owner can answer letters" } },
        { status: 403 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const parsed = updateLetterSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const [letter] = await db
      .select({
        id: profileLetters.id,
        senderId: profileLetters.senderId,
        repliedAt: profileLetters.repliedAt,
      })
      .from(profileLetters)
      .where(
        and(
          eq(profileLetters.id, letterId),
          eq(profileLetters.profileUserId, userId),
          isNull(profileLetters.deletedAt)
        )
      )
      .limit(1);

    if (!letter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Letter not found" } },
        { status: 404 }
      );
    }

    const { reply, isPinned } = parsed.data;

    // Pinning is for answered correspondence only (it's public).
    if (isPinned && !letter.repliedAt && reply === undefined) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Answer the letter before pinning it" } },
        { status: 400 }
      );
    }

    if (isPinned) {
      await db
        .update(profileLetters)
        .set({ isPinned: false, updatedAt: new Date() })
        .where(
          and(
            eq(profileLetters.profileUserId, userId),
            eq(profileLetters.isPinned, true),
            isNull(profileLetters.deletedAt)
          )
        );
    }

    const isFirstReply = reply !== undefined && !letter.repliedAt;
    const updates: Partial<typeof profileLetters.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (reply !== undefined) {
      updates.reply = reply;
      if (!letter.repliedAt) updates.repliedAt = new Date();
    }
    if (isPinned !== undefined) updates.isPinned = isPinned;

    const [updated] = await db
      .update(profileLetters)
      .set(updates)
      .where(eq(profileLetters.id, letterId))
      .returning({
        id: profileLetters.id,
        body: profileLetters.body,
        reply: profileLetters.reply,
        repliedAt: profileLetters.repliedAt,
        isPinned: profileLetters.isPinned,
        createdAt: profileLetters.createdAt,
      });

    if (isFirstReply) {
      const [writer] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId));
      createNotification(
        letter.senderId,
        "letter",
        `${writer?.displayName || "The writer"} answered your letter`,
        `/profile/${userId}#letterbox`
      );
    }

    return NextResponse.json({ data: { letter: updated } });
  } catch (error) {
    console.error("PATCH /api/users/[userId]/letters/[letterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update letter" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId]/letters/[letterId]
 * The writer may discard any letter on their desk; a sender may retract
 * their own letter while it's still unanswered. Soft delete.
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

    const { userId, letterId } = await params;

    const [letter] = await db
      .select({
        id: profileLetters.id,
        senderId: profileLetters.senderId,
        repliedAt: profileLetters.repliedAt,
      })
      .from(profileLetters)
      .where(
        and(
          eq(profileLetters.id, letterId),
          eq(profileLetters.profileUserId, userId),
          isNull(profileLetters.deletedAt)
        )
      )
      .limit(1);

    if (!letter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Letter not found" } },
        { status: 404 }
      );
    }

    const isOwner = session.user.id === userId;
    const isSenderRetracting =
      session.user.id === letter.senderId && !letter.repliedAt;

    if (!isOwner && !isSenderRetracting) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can't remove this letter" } },
        { status: 403 }
      );
    }

    await db
      .update(profileLetters)
      .set({ deletedAt: new Date(), isPinned: false, updatedAt: new Date() })
      .where(eq(profileLetters.id, letterId));

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/users/[userId]/letters/[letterId] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete letter" } },
      { status: 500 }
    );
  }
}
