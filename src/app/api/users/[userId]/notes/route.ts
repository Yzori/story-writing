import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { deskNotes, stories } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

type RouteParams = { params: Promise<{ userId: string }> };

const MAX_BODY = 500;

/**
 * GET /api/users/[userId]/notes
 * Returns the author's desk notes — pinned first, then newest first.
 * Public; non-deleted notes only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    const rows = await db
      .select({
        id: deskNotes.id,
        body: deskNotes.body,
        storyId: deskNotes.storyId,
        isPinned: deskNotes.isPinned,
        editedAt: deskNotes.editedAt,
        createdAt: deskNotes.createdAt,
        storyTitle: stories.title,
        storySlug: stories.slug,
      })
      .from(deskNotes)
      .leftJoin(
        stories,
        and(
          eq(deskNotes.storyId, stories.id),
          eq(stories.isPublic, true),
          eq(stories.status, "published"),
          isNull(stories.deletedAt)
        )
      )
      .where(and(eq(deskNotes.userId, userId), isNull(deskNotes.deletedAt)))
      .orderBy(desc(deskNotes.isPinned), desc(deskNotes.createdAt))
      .limit(limit);

    return NextResponse.json({
      data: {
        notes: rows.map((r) => ({
          id: r.id,
          body: r.body,
          isPinned: r.isPinned,
          editedAt: r.editedAt,
          createdAt: r.createdAt,
          story: r.storyId && r.storyTitle
            ? { id: r.storyId, title: r.storyTitle, slug: r.storySlug }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/users/[userId]/notes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch notes" } },
      { status: 500 }
    );
  }
}

const createNoteSchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY),
  storyId: z.string().uuid().optional().nullable(),
  isPinned: z.boolean().optional(),
});

/**
 * POST /api/users/[userId]/notes
 * Create a new desk note. Owner only.
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
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only post notes to your own desk" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);
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

    const { body: noteBody, storyId, isPinned } = parsed.data;

    // If a story is referenced, verify the user owns it.
    if (storyId) {
      const [story] = await db
        .select({
          id: stories.id,
          userId: stories.userId,
          isPublic: stories.isPublic,
          status: stories.status,
        })
        .from(stories)
        .where(and(eq(stories.id, storyId), isNull(stories.deletedAt)))
        .limit(1);
      if (
        !story ||
        story.userId !== session.user.id ||
        !story.isPublic ||
        story.status !== "published"
      ) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Notes can only reference your public published stories",
            },
          },
          { status: 403 }
        );
      }
    }

    // Pinning: only one pinned note per user. Unpin existing first if needed.
    if (isPinned) {
      await db
        .update(deskNotes)
        .set({ isPinned: false, updatedAt: new Date() })
        .where(
          and(
            eq(deskNotes.userId, session.user.id),
            eq(deskNotes.isPinned, true),
            isNull(deskNotes.deletedAt)
          )
        );
    }

    const [created] = await db
      .insert(deskNotes)
      .values({
        userId: session.user.id,
        body: noteBody,
        storyId: storyId ?? null,
        isPinned: !!isPinned,
      })
      .returning({
        id: deskNotes.id,
        body: deskNotes.body,
        storyId: deskNotes.storyId,
        isPinned: deskNotes.isPinned,
        editedAt: deskNotes.editedAt,
        createdAt: deskNotes.createdAt,
      });

    return NextResponse.json({ data: { note: created } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users/[userId]/notes error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create note" } },
      { status: 500 }
    );
  }
}
