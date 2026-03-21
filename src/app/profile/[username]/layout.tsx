import type { Metadata } from "next";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import Navbar from "@/components/shared/Navbar";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, username),
    columns: { displayName: true, bio: true, avatarUrl: true },
  });

  if (!user) {
    return { title: "Profile Not Found — Inkwell" };
  }

  const name = user.displayName || "Writer";
  const description =
    user.bio?.slice(0, 160) || `${name}'s profile on Inkwell`;

  return {
    title: `${name} — Inkwell`,
    description,
    openGraph: {
      title: name,
      description,
      type: "profile",
      ...(user.avatarUrl && { images: [user.avatarUrl] }),
    },
    twitter: {
      card: "summary",
      title: name,
      description,
    },
  };
}

export default function ProfileLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      <main className="pt-16">{children}</main>
    </div>
  );
}
