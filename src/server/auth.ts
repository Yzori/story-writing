import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyPassword } from "@/server/password";
import { env } from "@/server/env";
import {
  clearLoginAttempts,
  getLoginAttemptKey,
  getLoginLockoutSeconds,
  normalizeEmail,
  recordFailedLogin,
} from "@/server/auth-utils";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      isAdmin: boolean;
      subscriptionTier?: string;
      subscriptionStatus?: string;
      subscriptionEndsAt?: string | null;
      sessionVersion?: number;
      invalid?: boolean;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: string | null;
    sessionVersion?: number;
    invalid?: boolean;
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    // Only register Google provider if credentials are configured
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!rawEmail || !password) return null;

        const email = normalizeEmail(rawEmail);
        const attemptKey = getLoginAttemptKey(email, request);
        if ((await getLoginLockoutSeconds(attemptKey)) > 0) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);

        if (!user || !user.password) {
          await recordFailedLogin(attemptKey);
          return null;
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          await recordFailedLogin(attemptKey);
          return null;
        }

        await clearLoginAttempts(attemptKey);
        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.name,
          image: user.image ?? user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (token.invalid) return token;

      if (user) {
        token.id = user.id;
        // Look up isAdmin from database on initial sign-in
        const [dbUser] = await db
          .select({
            isAdmin: users.isAdmin,
            subscriptionTier: users.subscriptionTier,
            subscriptionStatus: users.subscriptionStatus,
            subscriptionEndsAt: users.subscriptionEndsAt,
            sessionVersion: users.sessionVersion,
          })
          .from(users)
          .where(eq(users.id, user.id as string))
          .limit(1);
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.subscriptionTier = dbUser?.subscriptionTier ?? "free";
        token.subscriptionStatus = dbUser?.subscriptionStatus ?? "active";
        token.subscriptionEndsAt = dbUser?.subscriptionEndsAt?.toISOString() ?? null;
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      }

      // Re-check auth-critical user state whenever the JWT is read. This lets a
      // password reset revoke already-issued stateless sessions.
      if (token.id) {
        const [dbUser] = await db
          .select({
            isAdmin: users.isAdmin,
            subscriptionTier: users.subscriptionTier,
            subscriptionStatus: users.subscriptionStatus,
            subscriptionEndsAt: users.subscriptionEndsAt,
            sessionVersion: users.sessionVersion,
          })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (!dbUser || dbUser.sessionVersion !== (token.sessionVersion ?? 0)) {
          token.invalid = true;
          token.id = undefined;
          return token;
        }

        token.isAdmin = dbUser?.isAdmin ?? false;
        token.subscriptionTier = dbUser?.subscriptionTier ?? "free";
        token.subscriptionStatus = dbUser?.subscriptionStatus ?? "active";
        token.subscriptionEndsAt = dbUser?.subscriptionEndsAt?.toISOString() ?? null;
        token.sessionVersion = dbUser?.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && !token.invalid) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.subscriptionTier = (token.subscriptionTier as string | undefined) ?? "free";
        session.user.subscriptionStatus = (token.subscriptionStatus as string | undefined) ?? "active";
        session.user.subscriptionEndsAt = (token.subscriptionEndsAt as string | null | undefined) ?? null;
      } else if (session.user) {
        session.user.id = "";
        session.user.isAdmin = false;
      }
      return session;
    },
  },
});
