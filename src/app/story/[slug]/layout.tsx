import type { Metadata } from "next";
import { db } from "@/lib/db";
import { stories, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import Navbar from "@/components/shared/Navbar";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const story = await db.query.stories.findFirst({
    where: and(eq(stories.slug, slug), isNull(stories.deletedAt)),
    columns: { title: true, synopsis: true, coverImageUrl: true, userId: true },
  });

  if (!story) {
    return { title: "Story Not Found — Inkwell" };
  }

  const author = await db.query.users.findFirst({
    where: eq(users.id, story.userId),
    columns: { displayName: true },
  });

  const description =
    story.synopsis?.slice(0, 160) || `Read "${story.title}" on Inkwell`;

  return {
    title: `${story.title} — Inkwell`,
    description,
    openGraph: {
      title: story.title,
      description,
      type: "article",
      ...(story.coverImageUrl && { images: [story.coverImageUrl] }),
    },
    twitter: {
      card: story.coverImageUrl ? "summary_large_image" : "summary",
      title: story.title,
      description,
    },
    authors: author?.displayName ? [{ name: author.displayName }] : undefined,
  };
}

export default function StoryLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      <main className="pt-14">{children}</main>
    </div>
  );
}
