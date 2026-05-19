import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { loginAttempts } from "@/server/db/schema";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getForwardedClient(request?: Request): string {
  if (!process.env.TRUST_PROXY_HEADERS && !process.env.VERCEL) {
    return "direct";
  }
  const forwarded = request?.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request?.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getLoginAttemptKey(email: string, request?: Request): string {
  return `${normalizeEmail(email)}:${getForwardedClient(request)}`;
}

export async function getLoginLockoutSeconds(key: string, now = Date.now()): Promise<number> {
  const row = await db.query.loginAttempts.findFirst({
    where: eq(loginAttempts.key, key),
    columns: { lockedUntil: true },
  });
  const lockedUntil = row?.lockedUntil?.getTime();
  if (!lockedUntil || lockedUntil <= now) return 0;
  return Math.ceil((lockedUntil - now) / 1000);
}

export async function recordFailedLogin(key: string, now = Date.now()): Promise<void> {
  const current = await db.query.loginAttempts.findFirst({
    where: eq(loginAttempts.key, key),
    columns: { attempts: true, firstAttemptAt: true, lockedUntil: true },
  });
  const windowStart = now - LOGIN_WINDOW_MS;
  const firstAttemptAt = current?.firstAttemptAt?.getTime() ?? now;
  const inWindow = current ? firstAttemptAt > windowStart : false;
  const attempts = current && inWindow ? current.attempts + 1 : 1;
  const lockedUntil =
    attempts >= MAX_FAILED_LOGIN_ATTEMPTS
      ? new Date(now + LOGIN_LOCKOUT_MS)
      : current ? current.lockedUntil : null;

  await db
    .insert(loginAttempts)
    .values({
      key,
      attempts,
      firstAttemptAt: new Date(inWindow ? firstAttemptAt : now),
      lockedUntil,
      updatedAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        attempts,
        firstAttemptAt: new Date(inWindow ? firstAttemptAt : now),
        lockedUntil,
        updatedAt: new Date(now),
      },
    });
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}

export function createSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCanonicalAppUrl(request?: Request): string {
  const configured = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "https://quiloria.app";
  return request ? new URL(request.url).origin : "http://localhost:3000";
}
