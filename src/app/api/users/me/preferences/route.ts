import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { updatePreferencesSchema } from "@/lib/validations";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/users/me/preferences
 * Return the authenticated user's reading preferences.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const [user] = await db
      .select({
        comfortRating: users.comfortRating,
        readingMode: users.readingMode,
        readingFont: users.readingFont,
        emailNotifications: users.emailNotifications,
        emailDigestMode: users.emailDigestMode,
        preferredGenres: users.preferredGenres,
        preferredReadLength: users.preferredReadLength,
        onboardedAt: users.onboardedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleRouteError(error, "GET /api/users/me/preferences", "Failed to fetch preferences");
  }
}

/**
 * PATCH /api/users/me/preferences
 * Update the authenticated user's reading preferences (partial updates).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const body = await request.json();
    const parsed = updatePreferencesSchema.safeParse(body);

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

    const { markOnboarded, preferredReadLength, ...rest } = parsed.data;

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No fields to update" } },
        { status: 400 }
      );
    }

    // "any" is a UI sentinel that means "no preference" — store as null.
    const dbReadLength =
      preferredReadLength === undefined
        ? undefined
        : preferredReadLength === "any"
          ? null
          : preferredReadLength;

    const setPayload: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };
    if (dbReadLength !== undefined) setPayload.preferredReadLength = dbReadLength;
    if (markOnboarded) setPayload.onboardedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(setPayload)
      .where(eq(users.id, session.user.id))
      .returning({
        comfortRating: users.comfortRating,
        readingMode: users.readingMode,
        readingFont: users.readingFont,
        emailNotifications: users.emailNotifications,
        emailDigestMode: users.emailDigestMode,
        preferredGenres: users.preferredGenres,
        preferredReadLength: users.preferredReadLength,
        onboardedAt: users.onboardedAt,
      });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/users/me/preferences",
      "Failed to update preferences",
    );
  }
}
