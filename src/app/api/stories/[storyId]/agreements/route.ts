import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agreements, agreementConfirmations, collaborators, users } from "@/lib/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createAgreementSchema } from "@/lib/validations";
import { verifyCollaboratorAccess, verifyStoryOwnership } from "@/lib/collaboration";
import { createBulkNotifications, createNotification } from "@/lib/notifications";
import { safeParseJson } from "@/lib/safe-json";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/agreements
 * Get the latest non-superseded agreement with confirmations.
 * Pass ?history=true to get all versions.
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

    const { searchParams } = new URL(request.url);
    const showHistory = searchParams.get("history") === "true";

    if (showHistory) {
      // Return all versions ordered by version desc
      const allVersions = await db
        .select()
        .from(agreements)
        .where(eq(agreements.storyId, storyId))
        .orderBy(desc(agreements.version));

      // Load confirmations for each
      const versionsWithConfirmations = await Promise.all(
        allVersions.map(async (agreement) => {
          const confs = await db
            .select({
              id: agreementConfirmations.id,
              userId: agreementConfirmations.userId,
              confirmedAt: agreementConfirmations.confirmedAt,
              userName: users.displayName,
              userAvatar: users.avatarUrl,
            })
            .from(agreementConfirmations)
            .leftJoin(users, eq(agreementConfirmations.userId, users.id))
            .where(eq(agreementConfirmations.agreementId, agreement.id));

          return {
            ...agreement,
            splits: safeParseJson(agreement.splits, []),
            confirmations: confs,
          };
        })
      );

      return NextResponse.json({ data: versionsWithConfirmations });
    }

    // Return latest non-superseded agreement
    const result = await db
      .select()
      .from(agreements)
      .where(
        and(
          eq(agreements.storyId, storyId),
          ne(agreements.status, "superseded")
        )
      )
      .orderBy(desc(agreements.version))
      .limit(1);

    const agreement = result[0];
    if (!agreement) {
      return NextResponse.json({ data: null });
    }

    // Load confirmations with user info
    const confirmations = await db
      .select({
        id: agreementConfirmations.id,
        userId: agreementConfirmations.userId,
        confirmedAt: agreementConfirmations.confirmedAt,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
      })
      .from(agreementConfirmations)
      .leftJoin(users, eq(agreementConfirmations.userId, users.id))
      .where(eq(agreementConfirmations.agreementId, agreement.id));

    return NextResponse.json({
      data: {
        ...agreement,
        splits: safeParseJson(agreement.splits, []),
        confirmations,
      },
    });
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
 * Create or update (version) an agreement. Story owner only.
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

    const ownerCheck = await verifyStoryOwnership(storyId, session.user.id);
    if (ownerCheck.error) {
      return NextResponse.json(
        {
          error: {
            code: ownerCheck.error === "NOT_FOUND" ? "NOT_FOUND" : "FORBIDDEN",
            message: ownerCheck.error === "NOT_FOUND" ? "Story not found" : "You don't own this story",
          },
        },
        { status: ownerCheck.error === "NOT_FOUND" ? 404 : 403 }
      );
    }

    const storyData = ownerCheck.story;

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

    // Validate all split userIds are owner or accepted collaborators
    const acceptedCollabs = await db
      .select({ userId: collaborators.userId })
      .from(collaborators)
      .where(
        and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.status, "accepted")
        )
      );

    const validUserIds = new Set([
      storyData.userId,
      ...acceptedCollabs.map((c) => c.userId),
    ]);

    for (const split of parsed.data.splits) {
      if (!validUserIds.has(split.userId)) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: `User ${split.userId} is not the owner or an accepted collaborator`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Check for existing non-superseded agreement
    const existing = await db
      .select()
      .from(agreements)
      .where(
        and(
          eq(agreements.storyId, storyId),
          ne(agreements.status, "superseded")
        )
      )
      .orderBy(desc(agreements.version))
      .limit(1);

    let newVersion = 1;

    if (existing[0]) {
      // Cannot supersede an active (fully-signed) agreement
      if (existing[0].status === "active") {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Cannot create a new agreement while one is active" } },
          { status: 409 }
        );
      }
      // Supersede old draft agreement
      await db
        .update(agreements)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(eq(agreements.id, existing[0].id));

      newVersion = existing[0].version + 1;
    }

    const [created] = await db
      .insert(agreements)
      .values({
        storyId,
        template: parsed.data.template,
        splits: JSON.stringify(parsed.data.splits),
        creditFormat: parsed.data.creditFormat ?? null,
        terms: parsed.data.terms ?? null,
        version: newVersion,
        status: "draft",
      })
      .returning();

    // Notify collaborators about new/updated agreement
    const collabUserIds = acceptedCollabs
      .map((c) => c.userId)
      .filter((id) => id !== session.user!.id);

    if (collabUserIds.length > 0) {
      const storySlug = storyData.slug || storyId;
      await createBulkNotifications(
        collabUserIds,
        "collaboration",
        newVersion > 1
          ? `Agreement updated (v${newVersion}) — please review and sign`
          : "A new agreement has been drafted — please review and sign",
        `/story/${storySlug}/workshop`
      );
    }

    return NextResponse.json(
      {
        data: {
          ...created,
          splits: parsed.data.splits,
          confirmations: [],
        },
      },
      { status: 201 }
    );
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
 * Sign/confirm the agreement. Any collaborator or owner.
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

    const collabCheck = await verifyCollaboratorAccess(storyId, session.user.id);
    if (collabCheck.error) {
      return NextResponse.json(
        {
          error: {
            code: collabCheck.error === "NOT_FOUND" ? "NOT_FOUND" : "FORBIDDEN",
            message: collabCheck.error === "NOT_FOUND" ? "Story not found" : "Not a collaborator on this story",
          },
        },
        { status: collabCheck.error === "NOT_FOUND" ? 404 : 403 }
      );
    }

    const storyRecord = collabCheck.story;

    // Find latest non-superseded agreement
    const existing = await db
      .select()
      .from(agreements)
      .where(
        and(
          eq(agreements.storyId, storyId),
          ne(agreements.status, "superseded")
        )
      )
      .orderBy(desc(agreements.version))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No agreement found for this story" } },
        { status: 404 }
      );
    }

    const agreement = existing[0];

    // Insert confirmation (idempotent via unique constraint)
    try {
      await db.insert(agreementConfirmations).values({
        agreementId: agreement.id,
        userId: session.user.id,
      });
    } catch (err: unknown) {
      // If unique constraint violation, it's already confirmed — that's fine
      const isUniqueViolation =
        err instanceof Error && err.message.includes("unique");
      if (!isUniqueViolation) throw err;
    }

    // Count confirmations vs total participants (accepted collabs + owner)
    const allConfirmations = await db
      .select({
        id: agreementConfirmations.id,
        userId: agreementConfirmations.userId,
        confirmedAt: agreementConfirmations.confirmedAt,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
      })
      .from(agreementConfirmations)
      .leftJoin(users, eq(agreementConfirmations.userId, users.id))
      .where(eq(agreementConfirmations.agreementId, agreement.id));

    const acceptedCollabs = await db
      .select({ userId: collaborators.userId })
      .from(collaborators)
      .where(
        and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.status, "accepted")
        )
      );

    const totalParticipants = acceptedCollabs.length + 1; // +1 for owner

    // Auto-activate if all confirmed
    let updatedStatus = agreement.status;
    if (allConfirmations.length >= totalParticipants && agreement.status === "draft") {
      await db
        .update(agreements)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(agreements.id, agreement.id));
      updatedStatus = "active";
    }

    // Notify owner about the confirmation (if signer isn't the owner)
    if (session.user.id !== storyRecord.userId) {
      const signerName = session.user.name || "A collaborator";
      const storySlug = storyRecord.slug || storyId;
      await createNotification(
        storyRecord.userId,
        "collaboration",
        `${signerName} signed the agreement${updatedStatus === "active" ? " — agreement is now active!" : ""}`,
        `/story/${storySlug}/workshop`
      );
    }

    return NextResponse.json({
      data: {
        ...agreement,
        status: updatedStatus,
        splits: safeParseJson(agreement.splits, []),
        confirmations: allConfirmations,
      },
    });
  } catch (error) {
    console.error("PATCH /api/stories/[storyId]/agreements error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to confirm agreement" } },
      { status: 500 }
    );
  }
}
