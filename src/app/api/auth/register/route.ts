import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/server/password";
import { applyPersistentRateLimit, errorResponse, handleRouteError } from "@/server/api-utils";
import { normalizeEmail } from "@/server/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 5 registrations per hour per IP
    const limited = await applyPersistentRateLimit(request, null, "write", {
      max: 5,
      windowSeconds: 3600,
    });
    if (limited) return limited;

    const { displayName, email, password } = await request.json();

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return errorResponse("VALIDATION_ERROR", "Email and password are required", 400);
    }

    const normalizedEmail = normalizeEmail(email);

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return errorResponse("VALIDATION_ERROR", "Please enter a valid email address", 400);
    }

    if (password.length > 128) {
      return errorResponse("VALIDATION_ERROR", "Password must be under 128 characters", 400);
    }

    if (password.length < 8) {
      return errorResponse("VALIDATION_ERROR", "Password must be at least 8 characters", 400);
    }

    if (displayName && (typeof displayName !== "string" || displayName.length > 100)) {
      return errorResponse("VALIDATION_ERROR", "Display name must be under 100 characters", 400);
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (existing) {
      return errorResponse("CONFLICT", "An account with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
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
      return errorResponse("CONFLICT", "An account with this email already exists", 409);
    }
    return handleRouteError(error, "POST /api/auth/register");
  }
}
