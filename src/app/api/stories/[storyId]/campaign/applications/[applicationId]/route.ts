import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  campaignApplications,
  collaborators,
  playerCharacters,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { updateApplicationSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";
import { verifyStoryOwnership } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; applicationId: string }>;
};

/**
 * PATCH /api/stories/[storyId]/campaign/applications/[applicationId]
 * Update application status. GM only.
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

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, applicationId } = await params;

    // Verify story exists and GM ownership
    const ownership = await verifyStoryOwnership(storyId, session.user.id);
    if (ownership.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (ownership.error || !ownership.story) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the GM can update applications" } },
        { status: 403 }
      );
    }
    const story = ownership.story;

    // Find the application
    const application = await db.query.campaignApplications.findFirst({
      where: and(
        eq(campaignApplications.id, applicationId),
        eq(campaignApplications.storyId, storyId)
      ),
    });

    if (!application) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Application not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateApplicationSchema.safeParse(body);

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

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["voting", "approved", "declined"],
      voting: ["approved", "declined"],
      approved: [],
      declined: [],
    };
    const currentStatus = application.status;
    if (!validTransitions[currentStatus]?.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: `Cannot transition from "${currentStatus}" to "${parsed.data.status}"` } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
      updatedAt: new Date(),
    };

    if (parsed.data.status === "voting" && parsed.data.votingDeadline) {
      updateData.votingDeadline = new Date(parsed.data.votingDeadline);
    }

    // Guard the transition IN the update: two concurrent reviews both
    // pass the read-side check above, but only one can flip the row from
    // the status it read. The loser gets a 409 instead of double-applying.
    const [updated] = await db
      .update(campaignApplications)
      .set(updateData)
      .where(
        and(
          eq(campaignApplications.id, applicationId),
          eq(campaignApplications.status, currentStatus)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This application was just reviewed by someone else" } },
        { status: 409 }
      );
    }

    // If approved, create a collaborator entry so the player can access the campaign
    if (parsed.data.status === "approved") {
      // One transaction, conflict-tolerant inserts: the unique
      // constraints (collaborators, and the one-active-character partial
      // unique from migration 0067) absorb any remaining race.
      await db.transaction(async (tx) => {
        await tx
          .insert(collaborators)
          .values({
            storyId,
            userId: application.userId,
            role: "writer",
            status: "accepted",
            invitedBy: session.user.id,
          })
          .onConflictDoNothing();

        await tx
          .insert(playerCharacters)
          .values({
            storyId,
            userId: application.userId,
            name: application.characterName?.trim() || "Unnamed",
            portrait: application.characterPortrait?.trim() || null,
            description: application.characterKnownFor?.trim() || "",
            traits: application.characterArchetype?.trim() || "",
            backstory: application.firstGlimpse?.trim() || "",
          })
          .onConflictDoNothing();
      });

      // Notify the applicant
      createNotification(
        application.userId,
        "collaboration",
        `Your application to join "${story.title}" has been approved!`,
        `/campaign/${storyId}`
      );
    } else if (parsed.data.status === "declined") {
      createNotification(
        application.userId,
        "collaboration",
        `Your application to join "${story.title}" was declined`,
        `/campaign/${storyId}`
      );
    } else if (parsed.data.status === "voting") {
      createNotification(
        application.userId,
        "collaboration",
        `Your application to join "${story.title}" is now up for a vote`,
        `/campaign/${storyId}`
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/stories/[storyId]/campaign/applications/[applicationId]",
      "Failed to update application",
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/campaign/applications/[applicationId]
 * Withdraw an application. Only the applicant can delete.
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

    const { storyId, applicationId } = await params;

    // Find the application
    const application = await db.query.campaignApplications.findFirst({
      where: and(
        eq(campaignApplications.id, applicationId),
        eq(campaignApplications.storyId, storyId)
      ),
    });

    if (!application) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Application not found" } },
        { status: 404 }
      );
    }

    // Only the applicant can withdraw
    if (application.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only withdraw your own application" } },
        { status: 403 }
      );
    }

    await db
      .delete(campaignApplications)
      .where(eq(campaignApplications.id, applicationId));

    return NextResponse.json({ data: { id: applicationId, deleted: true } });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/stories/[storyId]/campaign/applications/[applicationId]",
      "Failed to withdraw application",
    );
  }
}
