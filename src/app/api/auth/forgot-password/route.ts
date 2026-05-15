import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { applyRateLimit } from "@/server/api-utils";
import { sendEmail, passwordResetEmail } from "@/server/services/email";
import { normalizeEmail } from "@/server/auth-utils";

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

    const normalizedEmail = normalizeEmail(email);

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });

    // Look up user
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
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

    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmail(resetUrl);
    sendEmail(user.email, subject, html); // fire-and-forget

    return successResponse;
  } catch {
    console.error("Forgot password error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
