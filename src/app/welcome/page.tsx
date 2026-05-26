import { redirect } from "next/navigation";
import { and, or, eq, isNotNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users, stories } from "@/server/db/schema";
import WelcomeContent from "./WelcomeContent";

export const metadata = {
  title: "Welcome to Quiloria",
  description: "Begin your journey as a writer, reader, or collaborator.",
};

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // The door picker is a first-run moment. An established user — one who has
  // finished onboarding or already started a story — should drop straight into
  // their study instead of being asked which door they came through again.
  // (Matters most for returning Google logins, whose callback lands here.)
  const [established] = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(stories, eq(stories.userId, users.id))
    .where(
      and(
        eq(users.id, session.user.id),
        or(isNotNull(users.onboardedAt), isNotNull(stories.id)),
      ),
    )
    .limit(1);

  if (established) {
    redirect("/dashboard");
  }

  const firstName = session.user.name?.split(" ")[0] || "Writer";

  return <WelcomeContent firstName={firstName} />;
}
