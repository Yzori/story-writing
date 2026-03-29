import "server-only";
import { db } from "@/server/db";
import { notifications, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "./email";

type NotifType =
  | "chapter"
  | "spark"
  | "follow"
  | "comment"
  | "update"
  | "collaboration"
  | "suggestion"
  | "open-call"
  | "tip"
  | "jam"
  | "annotation"
  | "circle";

// Notification types that trigger emails when user has emailNotifications enabled
const EMAIL_ENABLED_TYPES = new Set<NotifType>([
  "chapter",
  "tip",
  "collaboration",
  "jam",
]);

/**
 * Create a notification for a user. Fire-and-forget — errors are logged but don't propagate.
 * Optionally sends an email if the user has email notifications enabled.
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

  // Fire-and-forget email for supported types
  if (EMAIL_ENABLED_TYPES.has(type)) {
    sendNotificationEmail(userId, type, message, href).catch(() => {});
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

  // Fire-and-forget emails
  if (EMAIL_ENABLED_TYPES.has(type)) {
    for (const userId of userIds) {
      sendNotificationEmail(userId, type, message, href).catch(() => {});
    }
  }
}

/**
 * Look up user's email preferences and send if enabled.
 */
async function sendNotificationEmail(
  userId: string,
  type: NotifType,
  message: string,
  href: string
) {
  try {
    const [user] = await db
      .select({
        email: users.email,
        emailNotifications: users.emailNotifications,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.emailNotifications || !user.email) return;

    // Use the notification message as the email body with a simple template
    const baseUrl = process.env.NEXTAUTH_URL || "https://inkwell.app";
    const fullHref = href.startsWith("http") ? href : `${baseUrl}${href}`;

    await sendEmail(
      user.email,
      message,
      `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#D4C4A8;background:#1A1510;padding:32px 24px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;"><span style="font-size:20px;font-weight:700;color:#C8963C;letter-spacing:0.05em;">Inkwell</span></div>
        <p style="line-height:1.6;margin:0 0 16px;">${message}</p>
        <div style="text-align:center;"><a href="${fullHref}" style="display:inline-block;padding:10px 24px;background:#C8963C20;border:1px solid #C8963C40;color:#C8963C;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View on Inkwell</a></div>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2E271E;text-align:center;font-size:12px;color:#7A6C56;">You received this because you enabled email notifications on Inkwell.</div>
      </div>`,
      userId
    );
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}
