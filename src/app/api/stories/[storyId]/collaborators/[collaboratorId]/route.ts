import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { collaborators, stories } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { updateCollaboratorSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";

type RouteParams = {
  params: Promise<{ storyId: string; collaboratorId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/collaborators/[collaboratorId]
 * Update a collaborator. The invited user can accept/decline.
 * The story owner can change role.
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

    const { storyId, collaboratorId } = await params;
    const body = await request.json();
    const parsed = updateCollaboratorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Verify story exists
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    // Find the collaborator record
    const existing = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.id, collaboratorId),
        eq(collaborators.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Collaborator not found" } },
        { status: 404 }
      );
    }

    const isOwner = story.userId === session.user.id;
    const isInvitedUser = existing.userId === session.user.id;

    // Only the invited user can accept/decline
    if (parsed.data.status && !isInvitedUser) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the invited user can accept or decline" } },
        { status: 403 }
      );
    }

    // Only the owner can change role
    if (parsed.data.role && !isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the story owner can change roles" } },
        { status: 403 }
      );
    }

    // Must be owner or invited user
    if (!isOwner && !isInvitedUser) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized" } },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(collaborators)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(collaborators.id, collaboratorId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(
      "PATCH /api/stories/[storyId]/collaborators/[collaboratorId] error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update collaborator" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/collaborators/[collaboratorId]
 * Remove a collaborator. Story owner only.
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

    const { storyId, collaboratorId } = await params;

    // Verify story ownership
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });

    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }

    if (story.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    const existing = await db.query.collaborators.findFirst({
      where: and(
        eq(collaborators.id, collaboratorId),
        eq(collaborators.storyId, storyId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Collaborator not found" } },
        { status: 404 }
      );
    }

    await db
      .delete(collaborators)
      .where(eq(collaborators.id, collaboratorId));

    // Notify the removed collaborator
    createNotification(
      existing.userId,
      "collaboration",
      `You have been removed from "${story.title}"`,
      `/browse`
    );

    return NextResponse.json({ data: { id: collaboratorId, deleted: true } });
  } catch (error) {
    console.error(
      "DELETE /api/stories/[storyId]/collaborators/[collaboratorId] error:",
      error
    );
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove collaborator" } },
      { status: 500 }
    );
  }
}
