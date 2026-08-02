import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/server/password";
import { applyRateLimit, errorResponse, handleRouteError } from "@/server/api-utils";

/**
 * DELETE /api/account/delete
 * GDPR Art. 17 — Right to erasure.
 * Deletes the authenticated user and all associated data (cascading FKs).
 * Requires password confirmation for credential-based accounts.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const limited = applyRateLimit(request, session.user.id, "write", {
      max: 3,
      windowSeconds: 3600,
    });
    if (limited) return limited;

    const { password } = await request.json();

    // Look up user to check if they have a password (credential account)
    const [user] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Require password confirmation for credential accounts
    if (user.password) {
      if (!password || typeof password !== "string") {
        return errorResponse("VALIDATION_ERROR", "Password confirmation required", 400);
      }
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return errorResponse("FORBIDDEN", "Incorrect password", 403);
      }
    }

    // Clean up password reset tokens (may not cascade if FK is on userId)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, session.user.id));

    // Delete user — all related data cascades via foreign keys
    await db.delete(users).where(eq(users.id, session.user.id));

    return NextResponse.json({
      message: "Your account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/account/delete");
  }
}
