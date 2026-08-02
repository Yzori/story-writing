import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/notifications
 * List notifications for the current user, newest first. Limited to 50.
 * `?type=` filters server-side (the page has 19 type chips; filtering the
 * newest 30 client-side showed empty tabs), `?countOnly=1` short-circuits
 * to just the unread badge number, and `typeCounts` powers the chips.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const searchParams = request.nextUrl.searchParams;

    // Badge pollers only need one number — skip the list entirely.
    if (searchParams.get("countOnly")) {
      const [{ value: unreadCount }] = await db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.id),
            eq(notifications.read, false)
          )
        );
      return NextResponse.json({ data: { unreadCount } });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10) || 30));
    const offset = (page - 1) * limit;
    const type = searchParams.get("type");

    const listWhere = type
      ? and(eq(notifications.userId, session.user.id), eq(notifications.type, type))
      : eq(notifications.userId, session.user.id);

    const [result, [{ value: unreadCount }], typeCountRows] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(listWhere)
        .orderBy(desc(notifications.createdAt))
        .limit(limit + 1)
        .offset(offset),
      db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.user.id),
            eq(notifications.read, false)
          )
        ),
      db
        .select({ type: notifications.type, value: count() })
        .from(notifications)
        .where(eq(notifications.userId, session.user.id))
        .groupBy(notifications.type),
    ]);

    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;
    const typeCounts = Object.fromEntries(
      typeCountRows.map((row) => [row.type, row.value])
    );

    return NextResponse.json({
      data: { notifications: data, unreadCount, hasMore, typeCounts },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications", "Failed to fetch notifications");
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for the current user.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.read, false)
        )
      );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/notifications",
      "Failed to mark notifications as read",
    );
  }
}
