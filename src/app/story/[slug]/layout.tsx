import type { Metadata } from "next";
import { db } from "@/server/db";
import { stories, users } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
    return { title: "Story Not Found — Quiloria" };
  }

  const author = await db.query.users.findFirst({
    where: eq(users.id, story.userId),
    columns: { displayName: true },
  });

  const description =
    story.synopsis?.slice(0, 160) || `Read "${story.title}" on Quiloria`;

  return {
    title: `${story.title} — Quiloria`,
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
      <main className="pt-14">{children}</main>
    </div>
  );
}
