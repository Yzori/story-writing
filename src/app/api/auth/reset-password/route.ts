import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { hashPassword } from "@/server/password";
import { applyPersistentRateLimit } from "@/server/api-utils";
import { sha256Hex } from "@/server/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 10 attempts per 15 minutes per IP
    const limited = await applyPersistentRateLimit(request, null, "write", {
      max: 10,
      windowSeconds: 900,
    });
    if (limited) return limited;

    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password must be under 128 characters" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const tokenHash = await sha256Hex(token);

    // Atomically consume a valid (non-expired, unused) token.
    const [resetToken] = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.token, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .returning({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
      });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordChangedAt: new Date(),
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetToken.userId));

    // Delete all tokens for this user (invalidate any other reset links)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, resetToken.userId));

    return NextResponse.json({
      message: "Password has been reset successfully.",
    });
  } catch {
    console.error("Reset password error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
