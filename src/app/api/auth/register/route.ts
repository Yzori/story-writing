import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/server/password";
import { applyRateLimit } from "@/server/api-utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 5 registrations per hour per IP
    const limited = applyRateLimit(request, null, "write", {
      max: 5,
      windowSeconds: 3600,
    });
    if (limited) return limited;

    const { displayName, email, password } = await request.json();

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (displayName && (typeof displayName !== "string" || displayName.length > 100)) {
      return NextResponse.json(
        { error: "Display name must be under 100 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        displayName: displayName || null,
        name: displayName || null,
      })
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({ data: { id: newUser.id, email: newUser.email } });
  } catch (error: unknown) {
    // Handle unique constraint violation (race condition on concurrent signup)
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Registration error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
