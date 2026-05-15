import "server-only";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

type LoginAttemptState = {
  attempts: number[];
  lockedUntil?: number;
};

const loginAttempts = new Map<string, LoginAttemptState>();

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getForwardedClient(request?: Request): string {
  const forwarded = request?.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request?.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getLoginAttemptKey(email: string, request?: Request): string {
  return `${normalizeEmail(email)}:${getForwardedClient(request)}`;
}

export function getLoginLockoutSeconds(key: string, now = Date.now()): number {
  const state = loginAttempts.get(key);
  if (!state?.lockedUntil || state.lockedUntil <= now) return 0;
  return Math.ceil((state.lockedUntil - now) / 1000);
}

export function recordFailedLogin(key: string, now = Date.now()): void {
  const state = loginAttempts.get(key) ?? { attempts: [] };
  const windowStart = now - LOGIN_WINDOW_MS;
  const attempts = state.attempts.filter((attempt) => attempt > windowStart);
  attempts.push(now);

  loginAttempts.set(key, {
    attempts,
    lockedUntil: attempts.length >= MAX_FAILED_LOGIN_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : state.lockedUntil,
  });
}

export function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

