import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profileLetters, users, follows, stories } from "@/server/db/schema";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

type RouteParams = { params: Promise<{ userId: string }> };

const MAX_BODY = 1000;

/** Does `senderId` follow at least one of the writer's public published stories? */
async function isFollowerOf(senderId: string, writerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: follows.id })
    .from(follows)
    .innerJoin(stories, eq(follows.storyId, stories.id))
    .where(
      and(
        eq(follows.userId, senderId),
        eq(stories.userId, writerId),
        eq(stories.isPublic, true),
        eq(stories.status, "published"),
        isNull(stories.deletedAt)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * GET /api/users/[userId]/letters
 * The correspondence: answered letters are public (pinned first), unanswered
 * letters are visible only to the writer. Also reports whether the current
 * visitor may write (letterbox policy + one-waiting-letter rule).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await auth();
    const viewerId = session?.user?.id ?? null;
    const isOwner = viewerId === userId;

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const [host] = await db
      .select({ profileLetterbox: users.profileLetterbox })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!host) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const policy = host.profileLetterbox;

    const answered = await db
      .select({
        id: profileLetters.id,
        body: profileLetters.body,
        reply: profileLetters.reply,
        repliedAt: profileLetters.repliedAt,
        isPinned: profileLetters.isPinned,
        createdAt: profileLetters.createdAt,
        senderId: users.id,
        senderName: users.displayName,
        senderAvatar: users.avatarUrl,
      })
      .from(profileLetters)
      .innerJoin(users, eq(profileLetters.senderId, users.id))
      .where(
        and(
          eq(profileLetters.profileUserId, userId),
          isNull(profileLetters.deletedAt),
          isNotNull(profileLetters.repliedAt)
        )
      )
      .orderBy(desc(profileLetters.isPinned), desc(profileLetters.repliedAt))
      .limit(limit);

    // Writer's private inbox: letters waiting on the desk.
    let waiting: {
      id: string;
      body: string;
      createdAt: Date;
      senderId: string;
      senderName: string | null;
      senderAvatar: string | null;
    }[] = [];
    if (isOwner) {
      waiting = await db
        .select({
          id: profileLetters.id,
          body: profileLetters.body,
          createdAt: profileLetters.createdAt,
          senderId: users.id,
          senderName: users.displayName,
          senderAvatar: users.avatarUrl,
        })
        .from(profileLetters)
        .innerJoin(users, eq(profileLetters.senderId, users.id))
        .where(
          and(
            eq(profileLetters.profileUserId, userId),
            isNull(profileLetters.deletedAt),
            isNull(profileLetters.repliedAt)
          )
        )
        .orderBy(desc(profileLetters.createdAt))
        .limit(50);
    }

    // Can the current visitor drop a letter in the box?
    let canWrite = false;
    let writeBlockedReason:
      | "signed-out"
      | "own-desk"
      | "closed"
      | "followers-only"
      | "already-waiting"
      | null = null;

    if (!viewerId) {
      writeBlockedReason = "signed-out";
    } else if (isOwner) {
      writeBlockedReason = "own-desk";
    } else if (policy === "closed") {
      writeBlockedReason = "closed";
    } else {
      if (policy === "followers" && !(await isFollowerOf(viewerId, userId))) {
        writeBlockedReason = "followers-only";
      } else {
        const [pending] = await db
          .select({ count: sql<number>`count(*)` })
          .from(profileLetters)
          .where(
            and(
              eq(profileLetters.profileUserId, userId),
              eq(profileLetters.senderId, viewerId),
              isNull(profileLetters.deletedAt),
              isNull(profileLetters.repliedAt)
            )
          );
        if (Number(pending?.count ?? 0) > 0) {
          writeBlockedReason = "already-waiting";
        } else {
          canWrite = true;
        }
      }
    }

    const mapSender = (l: { senderId: string; senderName: string | null; senderAvatar: string | null }) => ({
      id: l.senderId,
      displayName: l.senderName,
      avatarUrl: l.senderAvatar,
    });

    return NextResponse.json({
      data: {
        policy,
        canWrite,
        writeBlockedReason,
        letters: answered.map((l) => ({
          id: l.id,
          body: l.body,
          reply: l.reply,
          repliedAt: l.repliedAt,
          isPinned: l.isPinned,
          createdAt: l.createdAt,
          sender: mapSender(l),
        })),
        waiting: waiting.map((l) => ({
          id: l.id,
          body: l.body,
          createdAt: l.createdAt,
          sender: mapSender(l),
        })),
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/users/[userId]/letters", "Failed to fetch letters");
  }
}

const createLetterSchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY),
});

/**
 * POST /api/users/[userId]/letters
 * Leave a letter on the writer's desk. Private until the writer answers it.
 * One waiting letter per sender per writer.
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

    const { userId } = await params;
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You can't leave a letter on your own desk" } },
        { status: 400 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const parsed = createLetterSchema.safeParse(await request.json());
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

    const [host] = await db
      .select({ profileLetterbox: users.profileLetterbox })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!host) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    if (host.profileLetterbox === "closed") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This writer's letterbox is closed" } },
        { status: 403 }
      );
    }
    if (
      host.profileLetterbox === "followers" &&
      !(await isFollowerOf(session.user.id, userId))
    ) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "This letterbox is open to followers of the writer's stories",
          },
        },
        { status: 403 }
      );
    }

    // One waiting letter per sender — answer before writing again.
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileLetters)
      .where(
        and(
          eq(profileLetters.profileUserId, userId),
          eq(profileLetters.senderId, session.user.id),
          isNull(profileLetters.deletedAt),
          isNull(profileLetters.repliedAt)
        )
      );
    if (Number(pending?.count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_WAITING",
            message: "You already have a letter waiting on this desk",
          },
        },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(profileLetters)
      .values({
        profileUserId: userId,
        senderId: session.user.id,
        body: parsed.data.body,
      })
      .returning({
        id: profileLetters.id,
        body: profileLetters.body,
        createdAt: profileLetters.createdAt,
      });

    const [sender] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, session.user.id));

    createNotification(
      userId,
      "letter",
      `${sender?.displayName || "A reader"} left a letter on your desk`,
      `/profile/${userId}#letterbox`
    );

    return NextResponse.json({ data: { letter: created } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/users/[userId]/letters", "Failed to send letter");
  }
}
