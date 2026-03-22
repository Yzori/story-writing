import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { flags, stories, users } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/server/admin";
import { applyRateLimit } from "@/server/api-utils";

/**
 * GET /api/admin/flags
 * Returns all flags with story/comment info and reporter details.
 * Optional ?status= filter (pending, dismissed, actioned).
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const limited = applyRateLimit(request, session!.user!.id, "read");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const conditions = [];
    if (statusFilter && ["pending", "dismissed", "actioned"].includes(statusFilter)) {
      conditions.push(eq(flags.status, statusFilter));
    }

    const results = await db
      .select({
        id: flags.id,
        reason: flags.reason,
        details: flags.details,
        status: flags.status,
        createdAt: flags.createdAt,
        storyId: flags.storyId,
        commentId: flags.commentId,
        storyTitle: stories.title,
        storySlug: stories.slug,
        reporterName: sql<string>`coalesce(${users.displayName}, ${users.name}, 'Unknown')`,
        reporterEmail: users.email,
      })
      .from(flags)
      .leftJoin(stories, eq(flags.storyId, stories.id))
      .leftJoin(users, eq(flags.userId, users.id))
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(flags.createdAt))
      .limit(200);

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("GET /api/admin/flags error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch flags" } },
      { status: 500 }
    );
  }
}
