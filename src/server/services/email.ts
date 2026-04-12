import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Quiloria <noreply@quiloria.app>";

// Per-user rate limit: 10 emails per hour
const emailCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 10;

function canSend(userId: string): boolean {
  const now = Date.now();
  const entry = emailCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    emailCounts.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

/**
 * Send an email via Resend. Fire-and-forget — errors are logged, not thrown.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  userId?: string
) {
  if (!resend) return;
  if (userId && !canSend(userId)) return;
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

// ── Email Templates ────────────────────────────────────────

const WRAPPER = (body: string) => `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#D4C4A8;background:#1A1510;padding:32px 24px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:20px;font-weight:700;color:#C8963C;letter-spacing:0.05em;">Quiloria</span>
  </div>
  ${body}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2E271E;text-align:center;font-size:12px;color:#7A6C56;">
    You received this because you enabled email notifications on Quiloria.
  </div>
</div>`;

const CTA = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;padding:10px 24px;background:#C8963C20;border:1px solid #C8963C40;color:#C8963C;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;

export function chapterPublishedEmail(storyTitle: string, chapterTitle: string, url: string) {
  return {
    subject: `New chapter: "${chapterTitle}" — ${storyTitle}`,
    html: WRAPPER(`
      <h2 style="color:#F2E8D0;font-size:18px;margin:0 0 8px;">New Chapter Published</h2>
      <p style="margin:0 0 16px;line-height:1.6;"><strong style="color:#F2E8D0;">${storyTitle}</strong> has a new chapter: <em>"${chapterTitle}"</em></p>
      <div style="text-align:center;">${CTA(url, "Read Now")}</div>
    `),
  };
}

export function tipReceivedEmail(senderName: string, amount: number, url: string) {
  return {
    subject: `${senderName} sent you ${amount} Ink Drops`,
    html: WRAPPER(`
      <h2 style="color:#F2E8D0;font-size:18px;margin:0 0 8px;">You received a tip!</h2>
      <p style="margin:0 0 16px;line-height:1.6;"><strong style="color:#C8963C;">${senderName}</strong> sent you <strong style="color:#C8963C;">${amount} Ink Drops</strong>.</p>
      <div style="text-align:center;">${CTA(url, "View Earnings")}</div>
    `),
  };
}

export function collaborationInviteEmail(storyTitle: string, role: string, url: string) {
  return {
    subject: `You've been invited to collaborate on "${storyTitle}"`,
    html: WRAPPER(`
      <h2 style="color:#F2E8D0;font-size:18px;margin:0 0 8px;">Collaboration Invite</h2>
      <p style="margin:0 0 16px;line-height:1.6;">You've been invited as <strong style="color:#C8963C;">${role}</strong> on <em>"${storyTitle}"</em>.</p>
      <div style="text-align:center;">${CTA(url, "View Invitation")}</div>
    `),
  };
}

export function jamStartedEmail(jamTitle: string, theme: string, url: string) {
  return {
    subject: `Story Jam: "${jamTitle}" is now open!`,
    html: WRAPPER(`
      <h2 style="color:#F2E8D0;font-size:18px;margin:0 0 8px;">Story Jam Open</h2>
      <p style="margin:0 0 8px;line-height:1.6;"><strong style="color:#C8963C;">${jamTitle}</strong> is accepting submissions.</p>
      <p style="margin:0 0 16px;line-height:1.6;color:#9A8A6A;">Theme: <em>${theme}</em></p>
      <div style="text-align:center;">${CTA(url, "View Jam")}</div>
    `),
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your Quiloria password",
    html: WRAPPER(`
      <h2 style="color:#F2E8D0;font-size:18px;margin:0 0 8px;">Password Reset</h2>
      <p style="margin:0 0 16px;line-height:1.6;">Click the button below to reset your password. This link expires in 1 hour.</p>
      <div style="text-align:center;">${CTA(resetUrl, "Reset Password")}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#7A6C56;">If you didn't request this, you can ignore this email.</p>
    `),
  };
}
