import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNotNull, like, notInArray, sql } from "drizzle-orm";
import { encode } from "next-auth/jwt";
import { db } from "@/server/db";
import { adventureSeats, users } from "@/server/db/schema";
import { env } from "@/server/env";

/**
 * Dev-only puppet endpoint — lets one person test the Adventures table
 * solo by acting as the fixture cast (the `adv-*@example.com` accounts
 * the smoke/seed scripts create).
 *
 * GET  /api/dev/puppet?adventureId=…  → the seats (with emails) and
 *      known fixture audience accounts for that adventure.
 * POST /api/dev/puppet { email, method, path, body } → performs the
 *      request against the real API as that fixture user, by minting a
 *      short-lived session cookie server-side and proxying internally.
 *      Every rule the real route enforces (spotlight, roles, rate
 *      limits) still applies — this only swaps who is asking.
 *
 * Only `@example.com` accounts can be puppeted, and never in production.
 */

const disabled = () =>
  NextResponse.json({ error: "Disabled in production" }, { status: 403 });

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return disabled();

  const adventureId = request.nextUrl.searchParams.get("adventureId");
  if (!adventureId) {
    return NextResponse.json({ error: "adventureId required" }, { status: 400 });
  }

  const seats = await db
    .select({
      seatId: adventureSeats.id,
      role: adventureSeats.role,
      status: adventureSeats.status,
      characterName: adventureSeats.characterName,
      inkColor: adventureSeats.inkColor,
      email: users.email,
      displayName: users.displayName,
    })
    .from(adventureSeats)
    .leftJoin(users, eq(users.id, adventureSeats.userId))
    .where(eq(adventureSeats.adventureId, adventureId));

  const seatedUserEmails = seats
    .map((s) => s.email)
    .filter((e): e is string => !!e);

  const audience = await db
    .select({ email: users.email, displayName: users.displayName })
    .from(users)
    .where(
      and(
        like(users.email, "adv-%@example.com"),
        isNotNull(users.email),
        seatedUserEmails.length
          ? notInArray(users.email, seatedUserEmails)
          : sql`true`
      )
    )
    .orderBy(desc(users.createdAt))
    .limit(6);

  return NextResponse.json({
    data: {
      seats: seats.map((s) => ({
        ...s,
        puppetable: !!s.email?.endsWith("@example.com"),
      })),
      audience,
    },
  });
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return disabled();

  const payload = await request.json().catch(() => null);
  const email: unknown = payload?.email;
  const method: unknown = payload?.method ?? "POST";
  const path: unknown = payload?.path;

  if (typeof email !== "string" || !email.endsWith("@example.com")) {
    return NextResponse.json(
      { error: "Only @example.com fixture accounts can be puppeted" },
      { status: 400 }
    );
  }
  if (typeof path !== "string" || !path.startsWith("/api/")) {
    return NextResponse.json({ error: "path must start with /api/" }, { status: 400 });
  }
  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: "Unsupported method" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: `No user with email ${email}` }, { status: 404 });
  }

  // Mint the same JWT session cookie the login flow would set. The
  // dev server runs on http, so the cookie name carries no prefix;
  // the salt must equal the cookie name for auth() to decode it.
  const cookieName = "authjs.session-token";
  const sessionToken = await encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.displayName ?? user.name,
      isAdmin: false,
      sessionVersion: user.sessionVersion ?? 0,
    },
    secret: env.AUTH_SECRET,
    salt: cookieName,
    maxAge: 60 * 10,
  });

  const target = new URL(path, request.nextUrl.origin);
  const res = await fetch(target, {
    method,
    headers: {
      cookie: `${cookieName}=${sessionToken}`,
      "content-type": "application/json",
      // Same-origin Origin header satisfies the CSRF middleware.
      origin: request.nextUrl.origin,
    },
    body:
      method === "GET" || payload?.body === undefined
        ? undefined
        : JSON.stringify(payload.body),
  });
  const body = await res.json().catch(() => null);

  return NextResponse.json({ data: { status: res.status, body } });
}
