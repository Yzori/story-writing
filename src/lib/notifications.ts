import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type NotifType = "chapter" | "spark" | "follow" | "comment" | "update" | "collaboration" | "suggestion" | "open-call";

/**
 * Create a notification for a user. Fire-and-forget — errors are logged but don't propagate.
 */
export async function createNotification(
  userId: string,
  type: NotifType,
  message: string,
  href: string
) {
  try {
    await db.insert(notifications).values({ userId, type, message, href });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function createBulkNotifications(
  userIds: string[],
  type: NotifType,
  message: string,
  href: string
) {
  if (userIds.length === 0) return;
  try {
    await db.insert(notifications).values(
      userIds.map((userId) => ({ userId, type, message, href }))
    );
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
  }
}
