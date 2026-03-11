import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agreements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createAgreementSchema } from "@/lib/validations";
import { verifyCollaboratorAccess, verifyStoryOwnership } from "@/lib/collaboration";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/agreements
 * Get the agreement for a story. Available to collaborators.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const result = await db
      .select()
      .from(agreements)
      .where(eq(agreements.storyId, storyId))
      .limit(1);

    return NextResponse.json({ data: result[0] ?? null });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/agreements error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch agreement" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/agreements
 * Create or update agreement. Story owner only.
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

    const check = await verifyStoryOwnership(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You don't own this story" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createAgreementSchema.safeParse(body);

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

    // Check if agreement already exists for this story
    const existing = await db.query.agreements.findFirst({
      where: eq(agreements.storyId, storyId),
    });

    if (existing) {
      // Update existing agreement, reset confirmations
      const [updated] = await db
        .update(agreements)
        .set({
          template: parsed.data.template,
          ownershipSplit: parsed.data.ownershipSplit ?? null,
          creditFormat: parsed.data.creditFormat ?? null,
          terms: parsed.data.terms ?? null,
          confirmedBy: [],
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(agreements.id, existing.id))
        .returning();

      return NextResponse.json({ data: updated });
    }

    const [created] = await db
      .insert(agreements)
      .values({
        storyId,
        template: parsed.data.template,
        ownershipSplit: parsed.data.ownershipSplit ?? null,
        creditFormat: parsed.data.creditFormat ?? null,
        terms: parsed.data.terms ?? null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/agreements error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save agreement" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stories/[storyId]/agreements
 * Confirm the agreement (add userId to confirmedBy). Any collaborator.
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

    const { storyId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not a collaborator on this story" } },
        { status: 403 }
      );
    }

    const existing = await db.query.agreements.findFirst({
      where: eq(agreements.storyId, storyId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No agreement found for this story" } },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (existing.confirmedBy.includes(session.user.id)) {
      return NextResponse.json({ data: existing });
    }

    const newConfirmedBy = [...existing.confirmedBy, session.user.id];

    const [updated] = await db
      .update(agreements)
      .set({
        confirmedBy: newConfirmedBy,
        updatedAt: new Date(),
      })
      .where(eq(agreements.id, existing.id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/agreements error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to confirm agreement" } },
      { status: 500 }
    );
  }
}
