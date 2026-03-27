import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 5 requests per 15 minutes per IP
    const limited = applyRateLimit(request, null, "write", {
      max: 5,
      windowSeconds: 900,
    });
    if (limited) return limited;

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });

    // Look up user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return successResponse;
    }

    // Delete any existing tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // Generate token and expiry (1 hour)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // TODO: Send reset email via Resend
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;
    // Token generated — email delivery pending (Resend integration)

    return successResponse;
  } catch (error) {
    console.error("Forgot password error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
