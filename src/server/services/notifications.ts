import "server-only";
import { db } from "@/server/db";
import { notifications, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  sendEmail,
  chapterPublishedEmail,
  tipReceivedEmail,
  collaborationInviteEmail,
  jamStartedEmail,
  commentReceivedEmail,
  creatorUpdateEmail,
  suggestionReceivedEmail,
  genericNotificationEmail,
} from "./email";
import type { NotifType } from "@/types/api";

// Notification types that trigger emails when user has emailNotifications enabled.
// We deliberately exclude high-frequency / low-signal events (sparks, follows)
// to avoid inbox fatigue and protect deliverability.
const EMAIL_ENABLED_TYPES = new Set<NotifType>([
  "chapter",       // new chapter on a followed story — biggest retention driver
  "comment",       // someone commented on YOUR chapter
  "update",        // creator posted an update to followers
  "suggestion",    // collaborator proposed an edit (owner only)
  "tip",           // someone tipped your work
  "collaboration", // invited as collaborator
  "open-call",     // your open-call pitch got a response
  "jam",           // jam started
  "letter",        // a reader left a letter on your desk (rare, high-signal)
  "pen",           // the pen is yours at a live table — the session stalls without you
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
  let inserted: { id: string } | undefined;
  try {
    const rows = await db
      .insert(notifications)
      .values({ userId, type, message, href })
      .returning({ id: notifications.id });
    inserted = rows[0];
  } catch (error) {
    console.error("Failed to create notification:", error);
    return;
  }

  // Fire-and-forget email for supported types
  if (inserted && EMAIL_ENABLED_TYPES.has(type)) {
    sendNotificationEmail(inserted.id, userId, type, message, href).catch(() => {});
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
  let inserted: { id: string; userId: string }[] = [];
  try {
    inserted = await db
      .insert(notifications)
      .values(userIds.map((userId) => ({ userId, type, message, href })))
      .returning({ id: notifications.id, userId: notifications.userId });
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
    return;
  }

  // Fire-and-forget emails
  if (EMAIL_ENABLED_TYPES.has(type)) {
    for (const row of inserted) {
      sendNotificationEmail(row.id, row.userId, type, message, href).catch(() => {});
    }
  }
}

/**
 * Look up user's email preferences and send via the type-appropriate template.
 *
 * Honors the user's emailDigestMode:
 *  - "off" or emailNotifications=false → suppressed (emailedAt left null)
 *  - "instant" → send now and stamp emailedAt
 *  - "daily" / "weekly" → leave emailedAt null; the cron picks it up
 */
async function sendNotificationEmail(
  notificationId: string,
  userId: string,
  type: NotifType,
  message: string,
  href: string,
) {
  try {
    const [user] = await db
      .select({
        email: users.email,
        emailNotifications: users.emailNotifications,
        emailDigestMode: users.emailDigestMode,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.email) return;
    if (!user.emailNotifications) return;

    const mode = user.emailDigestMode ?? "instant";
    if (mode === "off") return;
    if (mode === "daily" || mode === "weekly") {
      // Queued for digest — leave emailedAt null; cron will batch and send.
      return;
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://quiloria.app";
    const fullHref = href.startsWith("http") ? href : `${baseUrl}${href}`;

    // Pick the right template by notification type. The message is used as a
    // fallback subject/body when we don't have structured fields.
    const tpl = (() => {
      switch (type) {
        case "chapter": {
          // message format: "{authorName} published \"{chapterTitle}\" in {storyTitle}"
          const m = message.match(/published "(.+?)" in (.+)$/);
          if (m) return chapterPublishedEmail(m[2], m[1], fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "comment": {
          // message format: "{commenterName} commented on \"{chapterTitle}\""
          const m = message.match(/^(.+?) commented on "(.+?)"$/);
          if (m) return commentReceivedEmail(m[1], m[2], message, fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "update": {
          // message format: "{authorName} posted an update for \"{storyTitle}\""
          const m = message.match(/^(.+?) posted an update for "(.+?)"$/);
          if (m) return creatorUpdateEmail(m[1], m[2], message, fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "suggestion": {
          const m = message.match(/^(.+?) suggested.*on "(.+?)"$/);
          if (m) return suggestionReceivedEmail(m[1], m[2], fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "tip": {
          const m = message.match(/^(.+?) sent you (\d+)/);
          if (m) return tipReceivedEmail(m[1], parseInt(m[2], 10), fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "collaboration": {
          const m = message.match(/invited.*as (\w+).*on "(.+?)"$/i) ?? message.match(/^(.+?) on "(.+?)"$/);
          if (m) return collaborationInviteEmail(m[2], m[1], fullHref);
          return genericNotificationEmail(message, fullHref);
        }
        case "jam": {
          return genericNotificationEmail(message, fullHref);
        }
        default:
          return genericNotificationEmail(message, fullHref);
      }
    })();

    await sendEmail(user.email, tpl.subject, tpl.html, userId);
    // Stamp emailedAt so the digest cron knows this one's already sent.
    await db
      .update(notifications)
      .set({ emailedAt: new Date() })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}
