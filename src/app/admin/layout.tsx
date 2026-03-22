import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-void">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-display text-paper mb-4">
              Access Denied
            </h1>
            <p className="text-text-secondary mb-6">
              You must be logged in to access this page.
            </p>
            <Link
              href="/login"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Go to Login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Check admin status
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
    return (
      <div className="min-h-screen bg-void">
        <Navbar />
        <main className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-display text-paper mb-4">
              Access Denied
            </h1>
            <p className="text-text-secondary mb-6">
              You do not have permission to access the admin dashboard.
            </p>
            <Link
              href="/dashboard"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      <main className="pt-16">{children}</main>
    </div>
  );
}
