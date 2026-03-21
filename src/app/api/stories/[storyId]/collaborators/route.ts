import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collaborators, users, stories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createCollaboratorSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/collaborators
 * List collaborators for a story. Public.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;

    const result = await db
      .select({
        id: collaborators.id,
        storyId: collaborators.storyId,
        userId: collaborators.userId,
        role: collaborators.role,
        status: collaborators.status,
        invitedBy: collaborators.invitedBy,
        createdAt: collaborators.createdAt,
        updatedAt: collaborators.updatedAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(collaborators)
      .leftJoin(users, eq(collaborators.userId, users.id))
      .where(eq(collaborators.storyId, storyId));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/collaborators error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch collaborators" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/collaborators
 * Invite a collaborator. Requires story ownership.
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

    const { storyId } = await params;
    const body = await request.json();
    const parsed = createCollaboratorSchema.safeParse(body);

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

    // Verify story exists and ownership
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

    // Cannot invite yourself
    if (parsed.data.userId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Cannot invite yourself" } },
        { status: 400 }
      );
    }

    // Check if user is already invited or a collaborator
    const existingCollab = await db.query.collaborators.findFirst({
      where: and(eq(collaborators.storyId, storyId), eq(collaborators.userId, parsed.data.userId)),
    });
    if (existingCollab) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: `User is already ${existingCollab.status === "pending" ? "invited" : "a collaborator"}` } },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(collaborators)
      .values({
        storyId,
        userId: parsed.data.userId,
        role: parsed.data.role,
        invitedBy: session.user.id,
      })
      .returning();

    // Notify the invited user
    const inviterName = session.user.name || "Someone";
    createNotification(
      parsed.data.userId,
      "collaboration",
      `${inviterName} invited you to collaborate on "${story.title}" as ${parsed.data.role}`,
      `/story/${story.slug || storyId}`
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/collaborators error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to invite collaborator" } },
      { status: 500 }
    );
  }
}
