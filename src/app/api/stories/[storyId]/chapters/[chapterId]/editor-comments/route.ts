import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { db } from "@/server/db";
import {
  chapters,
  collaborators,
  editorCommentReplies,
  editorCommentThreads,
  stories,
  users,
} from "@/server/db/schema";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

const createThreadSchema = z.object({
  quotedText: z.string().min(1).max(1000),
  commentText: z.string().min(1).max(2000),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
});

const updateThreadSchema = z.object({
  threadId: z.string().uuid(),
  resolved: z.boolean().optional(),
  replyText: z.string().min(1).max(2000).optional(),
}).refine((data) => data.resolved !== undefined || data.replyText !== undefined, {
  message: "A reply or resolved state is required",
});

const deleteThreadSchema = z.object({
  threadId: z.string().uuid(),
});

async function verifyEditorAccess(storyId: string, chapterId: string, userId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { error: "NOT_FOUND" as const };

  const chapter = await db.query.chapters.findFirst({
    where: and(
      eq(chapters.id, chapterId),
      eq(chapters.storyId, storyId),
      isNull(chapters.deletedAt),
    ),
  });
  if (!chapter) return { error: "NOT_FOUND" as const };

  if (story.userId === userId) return { story, chapter, error: null };

  if (story.writingMode !== "solo") {
    const collab = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.storyId, storyId),
        eq(collaborators.userId, userId),
        eq(collaborators.status, "accepted"),
      ),
    });
    if (collab) return { story, chapter, error: null };
  }

  return { error: "FORBIDDEN" as const };
}

function accessErrorResponse(error: "NOT_FOUND" | "FORBIDDEN") {
  if (error === "NOT_FOUND") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Story or chapter not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Not authorized to edit this chapter" } },
    { status: 403 },
  );
}

type ThreadRow = typeof editorCommentThreads.$inferSelect & {
  user?: { displayName: string | null; name: string | null } | null;
};

type ReplyRow = typeof editorCommentReplies.$inferSelect & {
  user?: { displayName: string | null; name: string | null } | null;
};

function authorName(user: { displayName: string | null; name: string | null } | null | undefined) {
  return user?.displayName || user?.name || "Writer";
}

function toClientThreads(threads: ThreadRow[], replies: ReplyRow[]) {
  const replyMap = new Map<string, ReplyRow[]>();
  for (const reply of replies) {
    const list = replyMap.get(reply.threadId) ?? [];
    list.push(reply);
    replyMap.set(reply.threadId, list);
  }

  return threads.map((thread) => ({
    id: thread.id,
    quotedText: thread.quotedText,
    resolved: thread.resolved,
    createdAt: new Date(thread.createdAt).getTime(),
    comments: (replyMap.get(thread.id) ?? []).map((reply) => ({
      id: reply.id,
      text: reply.content,
      author: authorName(reply.user),
      createdAt: new Date(reply.createdAt).getTime(),
    })),
  }));
}

async function fetchClientThreads(storyId: string, chapterId: string) {
  const threadRows = await db
    .select({
      id: editorCommentThreads.id,
      storyId: editorCommentThreads.storyId,
      chapterId: editorCommentThreads.chapterId,
      userId: editorCommentThreads.userId,
      quotedText: editorCommentThreads.quotedText,
      fromPos: editorCommentThreads.fromPos,
      toPos: editorCommentThreads.toPos,
      resolved: editorCommentThreads.resolved,
      deletedAt: editorCommentThreads.deletedAt,
      createdAt: editorCommentThreads.createdAt,
      updatedAt: editorCommentThreads.updatedAt,
      user: {
        displayName: users.displayName,
        name: users.name,
      },
    })
    .from(editorCommentThreads)
    .leftJoin(users, eq(editorCommentThreads.userId, users.id))
    .where(
      and(
        eq(editorCommentThreads.storyId, storyId),
        eq(editorCommentThreads.chapterId, chapterId),
        isNull(editorCommentThreads.deletedAt),
      ),
    )
    .orderBy(asc(editorCommentThreads.createdAt));

  const threadIds = threadRows.map((thread) => thread.id);
  const replyRows = threadIds.length === 0
    ? []
    : await db
        .select({
          id: editorCommentReplies.id,
          threadId: editorCommentReplies.threadId,
          userId: editorCommentReplies.userId,
          content: editorCommentReplies.content,
          deletedAt: editorCommentReplies.deletedAt,
          createdAt: editorCommentReplies.createdAt,
          updatedAt: editorCommentReplies.updatedAt,
          user: {
            displayName: users.displayName,
            name: users.name,
          },
        })
        .from(editorCommentReplies)
        .leftJoin(users, eq(editorCommentReplies.userId, users.id))
        .where(
          and(
            inArray(editorCommentReplies.threadId, threadIds),
            isNull(editorCommentReplies.deletedAt),
          ),
        )
        .orderBy(asc(editorCommentReplies.createdAt));

  return toClientThreads(threadRows, replyRows);
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const { storyId, chapterId } = await params;
    const access = await verifyEditorAccess(storyId, chapterId, session.user.id);
    if (access.error) return accessErrorResponse(access.error);

    return NextResponse.json({ data: await fetchClientThreads(storyId, chapterId) });
  } catch (error) {
    console.error("GET editor comments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch editor comments" } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, chapterId } = await params;
    const access = await verifyEditorAccess(storyId, chapterId, session.user.id);
    if (access.error) return accessErrorResponse(access.error);

    const parsed = createThreadSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.to <= parsed.data.from) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid comment thread" } },
        { status: 400 },
      );
    }

    const threadId = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(editorCommentThreads)
        .values({
          storyId,
          chapterId,
          userId: session.user.id,
          quotedText: parsed.data.quotedText,
          fromPos: parsed.data.from,
          toPos: parsed.data.to,
        })
        .returning({ id: editorCommentThreads.id });

      await tx.insert(editorCommentReplies).values({
        threadId: thread.id,
        userId: session.user.id,
        content: parsed.data.commentText,
      });
      return thread.id;
    });

    return NextResponse.json({ data: await fetchClientThreads(storyId, chapterId), threadId }, { status: 201 });
  } catch (error) {
    console.error("POST editor comments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create editor comment" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, chapterId } = await params;
    const access = await verifyEditorAccess(storyId, chapterId, session.user.id);
    if (access.error) return accessErrorResponse(access.error);

    const parsed = updateThreadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid comment update" } },
        { status: 400 },
      );
    }

    const thread = await db.query.editorCommentThreads.findFirst({
      where: and(
        eq(editorCommentThreads.id, parsed.data.threadId),
        eq(editorCommentThreads.storyId, storyId),
        eq(editorCommentThreads.chapterId, chapterId),
        isNull(editorCommentThreads.deletedAt),
      ),
    });
    if (!thread) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comment thread not found" } },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      if (parsed.data.resolved !== undefined) {
        await tx
          .update(editorCommentThreads)
          .set({ resolved: parsed.data.resolved, updatedAt: new Date() })
          .where(eq(editorCommentThreads.id, thread.id));
      }

      if (parsed.data.replyText) {
        await tx.insert(editorCommentReplies).values({
          threadId: thread.id,
          userId: session.user.id,
          content: parsed.data.replyText,
        });
      }
    });

    return NextResponse.json({ data: await fetchClientThreads(storyId, chapterId) });
  } catch (error) {
    console.error("PATCH editor comments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update editor comment" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, chapterId } = await params;
    const access = await verifyEditorAccess(storyId, chapterId, session.user.id);
    if (access.error) return accessErrorResponse(access.error);

    const parsed = deleteThreadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid comment delete" } },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(editorCommentThreads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(editorCommentThreads.id, parsed.data.threadId),
          eq(editorCommentThreads.storyId, storyId),
          eq(editorCommentThreads.chapterId, chapterId),
          isNull(editorCommentThreads.deletedAt),
        ),
      )
      .returning({ id: editorCommentThreads.id });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comment thread not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: await fetchClientThreads(storyId, chapterId) });
  } catch (error) {
    console.error("DELETE editor comments error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete editor comment" } },
      { status: 500 },
    );
  }
}
