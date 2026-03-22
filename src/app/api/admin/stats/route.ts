import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, stories, flags } from "@/server/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "@/server/admin";
import { applyRateLimit } from "@/server/api-utils";

/**
 * GET /api/admin/stats
 * Returns aggregate counts for the admin dashboard.
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const limited = applyRateLimit(request, session!.user!.id, "read");
  if (limited) return limited;

  try {
    const [userCount] = await db
      .select({ value: count() })
      .from(users);

    const [storyCount] = await db
      .select({ value: count() })
      .from(stories);

    const [pendingCount] = await db
      .select({ value: count() })
      .from(flags)
      .where(eq(flags.status, "pending"));

    return NextResponse.json({
      data: {
        totalUsers: userCount?.value ?? 0,
        totalStories: storyCount?.value ?? 0,
        pendingFlags: pendingCount?.value ?? 0,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch stats" } },
      { status: 500 }
    );
  }
}
