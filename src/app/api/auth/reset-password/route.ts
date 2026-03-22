import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword } from "@/server/password";
import { applyRateLimit } from "@/server/api-utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 10 attempts per 15 minutes per IP
    const limited = applyRateLimit(request, null, "write", {
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find valid (non-expired) token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

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
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Delete all tokens for this user (invalidate any other reset links)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, resetToken.userId));

    return NextResponse.json({
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
