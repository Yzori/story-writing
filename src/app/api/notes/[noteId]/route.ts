import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { deskNotes, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type RouteParams = { params: Promise<{ noteId: string }> };

const MAX_BODY = 500;

const updateNoteSchema = z
  .object({
    body: z.string().trim().min(1).max(MAX_BODY).optional(),
    storyId: z.string().uuid().nullable().optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

async function loadOwnedNote(noteId: string, sessionUserId: string) {
  const [note] = await db
    .select({
      id: deskNotes.id,
      userId: deskNotes.userId,
      isPinned: deskNotes.isPinned,
      deletedAt: deskNotes.deletedAt,
    })
    .from(deskNotes)
    .where(eq(deskNotes.id, noteId))
    .limit(1);

  if (!note || note.deletedAt) {
    return { error: NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Note not found" } },
      { status: 404 }
    )};
  }
  if (note.userId !== sessionUserId) {
    return { error: NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not your note" } },
      { status: 403 }
    )};
  }
  return { note };
}

/**
 * PATCH /api/notes/[noteId]
 * Edit a note's body, attached story, or pinned state. Owner only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "write");
    if (limited) return limited;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { noteId } = await params;
    const owned = await loadOwnedNote(noteId, session.user.id);
    if ("error" in owned) return owned.error;

    const body = await request.json();
    const parsed = updateNoteSchema.safeParse(body);
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

    if (isPinned === true && !owned.note.isPinned) {
      // Unpin any other pinned note belonging to this user.
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

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (noteBody !== undefined) {
      updates.body = noteBody;
      updates.editedAt = new Date();
    }
    if (storyId !== undefined) updates.storyId = storyId;
    if (isPinned !== undefined) updates.isPinned = isPinned;

    const [updated] = await db
      .update(deskNotes)
      .set(updates)
      .where(eq(deskNotes.id, noteId))
      .returning({
        id: deskNotes.id,
        body: deskNotes.body,
        storyId: deskNotes.storyId,
        isPinned: deskNotes.isPinned,
        editedAt: deskNotes.editedAt,
        createdAt: deskNotes.createdAt,
      });

    return NextResponse.json({ data: { note: updated } });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/notes/[noteId]", "Failed to update note");
  }
}

/**
 * DELETE /api/notes/[noteId]
 * Soft-delete a note. Owner only.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(_request, session?.user?.id, "write");
    if (limited) return limited;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { noteId } = await params;
    const owned = await loadOwnedNote(noteId, session.user.id);
    if ("error" in owned) return owned.error;

    await db
      .update(deskNotes)
      .set({ deletedAt: new Date(), isPinned: false, updatedAt: new Date() })
      .where(eq(deskNotes.id, noteId));

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/notes/[noteId]", "Failed to delete note");
  }
}
