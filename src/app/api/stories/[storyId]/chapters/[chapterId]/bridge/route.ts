import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { chapters } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; chapterId: string }>;
};

// One line, not an essay — this is the note you leave yourself on the way out.
const bridgeSchema = z.object({
  note: z.string().max(400),
});

/**
 * PUT /api/stories/[storyId]/chapters/[chapterId]/bridge
 *
 * The Hemingway bridge: a line from you to tomorrow-you, stored on the
 * chapter. It used to live in localStorage, which meant a note written on the
 * laptop was invisible on the phone and the server could never quote it back.
 *
 * An empty note clears it. Stored as plain text and rendered as plain text —
 * it is never injected as HTML anywhere.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, userId, "write");
    if (limited) return limited;

    const { storyId, chapterId } = await params;

    const access = await verifyCollaboratorAccess(storyId, userId);
    if (access.error) {
      const status = access.error === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json(
        {
          error: {
            code: access.error,
            message: access.error === "FORBIDDEN" ? "Not authorized" : "Not found",
          },
        },
        { status },
      );
    }

    const parsed = bridgeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "A bridge note is at most 400 characters" } },
        { status: 400 },
      );
    }

    const note = parsed.data.note.trim();
    const updated = await db
      .update(chapters)
      .set({
        bridgeNote: note || null,
        bridgeNoteAt: note ? new Date() : null,
      })
      .where(and(eq(chapters.id, chapterId), eq(chapters.storyId, storyId), isNull(chapters.deletedAt)))
      .returning({ id: chapters.id, bridgeNote: chapters.bridgeNote });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Chapter not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: { bridgeNote: updated[0].bridgeNote } });
  } catch (error) {
    console.error("PUT chapter bridge error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save the note" } },
      { status: 500 },
    );
  }
}
