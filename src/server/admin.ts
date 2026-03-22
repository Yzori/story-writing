import "server-only";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Verify the current session user is an admin.
 * Checks the isAdmin column on the user record, with a fallback
 * to the ADMIN_EMAIL env var for bootstrapping the first admin.
 *
 * Returns the session if admin, or a 403 NextResponse if not.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      ),
      session: null,
    };
  }

  const [user] = await db
    .select({ isAdmin: users.isAdmin, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin =
    user?.isAdmin === true ||
    (adminEmail && user?.email === adminEmail);

  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}
