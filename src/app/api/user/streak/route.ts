import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/user/streak
 * Returns the current reading streak for the authenticated user.
 * Implicitly resets the in-memory days count when the streak has been broken
 * (last read day is older than yesterday) — the persisted value isn't touched
 * until the user reads again.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const [user] = await db
      .select({
        days: users.readingStreakDays,
        lastDay: users.readingStreakLastDay,
        best: users.readingStreakBest,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ data: { days: 0, best: 0, status: "none" as const } });
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    let status: "active" | "at-risk" | "broken" | "none" = "none";
    let liveDays = 0;
    if (user.lastDay) {
      if (user.lastDay === today) {
        status = "active";
        liveDays = user.days ?? 0;
      } else if (user.lastDay === yesterday) {
        status = "at-risk";
        liveDays = user.days ?? 0;
      } else {
        status = "broken";
        liveDays = 0;
      }
    }

    return NextResponse.json({
      data: {
        days: liveDays,
        best: user.best ?? 0,
        status,
        lastDay: user.lastDay,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/user/streak", "Failed to load streak");
  }
}
