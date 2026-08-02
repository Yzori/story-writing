import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { notifications } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/server/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const limited = applyRateLimit(request, session?.user?.id, "write");
    if (limited) return limited;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Notification not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/notifications/[id]",
      "Failed to update notification",
    );
  }
}
