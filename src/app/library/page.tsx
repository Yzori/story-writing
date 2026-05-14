"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * /library — the reader's home.
 *
 * Rehouses the reader dashboard surfaces that the For You reader displaces:
 * in-progress reading, saved stories, followed authors.
 */

interface ProgressRow {
  storyId: string;
  chapterId: string;
  scrollPercent: number;
  updatedAt: string;
  storyTitle: string;
  storySlug: string | null;
  storyCoverUrl: string | null;
  storyGenres: string[];
  chapterTitle: string;
  authorName: string | null;
  authorId: string;
}

interface FollowRow {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
  synopsis: string | null;
  authorName: string | null;
  authorImage: string | null;
  followedAt: string;
}

type Tab = "continue" | "saved" | "authors";

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("continue");
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/library");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/reading-progress").then((r) => r.json()),
      fetch(`/api/users/${session.user.id}/following`).then((r) => r.json()),
    ])
      .then(([prog, foll]) => {
        if (cancelled) return;
        setProgress(prog?.data ?? []);
        setFollows(foll?.data?.stories ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Derive unique authors from follows
  const authors = Array.from(
    new Map(
      follows.map((f) => [
        f.userId,
        { id: f.userId, displayName: f.authorName, avatarUrl: f.authorImage },
      ]),
    ).values(),
  );

  return (
    <main className="min-h-screen bg-void">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-text-ghost text-[11px] tracking-[0.3em] uppercase mb-2">
            Your library
          </p>
          <h1 className="font-display text-paper text-3xl sm:text-4xl mb-8 sm:mb-10">
            What you&apos;re reading
          </h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-6 sm:gap-8 border-b border-border mb-8 sm:mb-10 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {(
            [
              { id: "continue", label: "Continue", count: progress.length },
              { id: "saved", label: "Saved", count: follows.length },
              { id: "authors", label: "Authors", count: authors.length },
            ] as { id: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 pb-3 text-[13px] tracking-wide transition-all border-b-2 ${
                tab === t.id
                  ? "text-gold border-gold"
                  : "text-text-ghost border-transparent hover:text-paper"
              }`}
            >
              {t.label}{" "}
              <span className="text-text-ghost text-[11px] ml-1">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-text-ghost text-[12px] tracking-wide">
            Loading…
          </p>
        ) : tab === "continue" ? (
          progress.length === 0 ? (
            <EmptyState
              title="Nothing in progress"
              hint="Pick up a story in the reader."
              cta={{ href: "/read", label: "Open the reader" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {progress.map((p) => (
                <Link
                  key={p.storyId}
                  href={`/story/${p.storySlug ?? p.storyId}/read/${p.chapterId}`}
                  className="flex gap-4 p-4 rounded-sm border border-border hover:border-gold/30 bg-elevated/40 hover:bg-elevated transition-all group"
                >
                  <div
                    className="w-16 h-24 rounded-sm bg-cover bg-center flex-shrink-0 bg-void"
                    style={{
                      backgroundImage: p.storyCoverUrl
                        ? `url(${p.storyCoverUrl})`
                        : undefined,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-paper text-[15px] truncate group-hover:text-gold transition-colors">
                      {p.storyTitle}
                    </h3>
                    <p className="text-text-ghost text-[11px] mb-2">
                      {p.authorName && `by ${p.authorName}`}
                    </p>
                    <p className="text-text-secondary text-[12px] truncate mb-3">
                      {p.chapterTitle}
                    </p>
                    <div className="h-[2px] bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold/60"
                        style={{ width: `${p.scrollPercent}%` }}
                      />
                    </div>
                    <p className="text-text-ghost text-[10px] mt-1.5 tracking-wide">
                      {p.scrollPercent}% through
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : tab === "saved" ? (
          follows.length === 0 ? (
            <EmptyState
              title="Nothing saved yet"
              hint="Swipe right on any story in the reader to save it."
              cta={{ href: "/read", label: "Open the reader" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {follows.map((f) => (
                <Link
                  key={f.id}
                  href={`/story/${f.slug ?? f.id}`}
                  className="p-4 rounded-sm border border-border hover:border-gold/30 bg-elevated/40 hover:bg-elevated transition-all group"
                >
                  <div
                    className="w-full aspect-[2/3] rounded-sm bg-cover bg-center bg-void mb-3"
                    style={{
                      backgroundImage: f.coverImageUrl
                        ? `url(${f.coverImageUrl})`
                        : undefined,
                    }}
                  />
                  <h3 className="font-display text-paper text-[14px] truncate group-hover:text-gold transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-text-ghost text-[11px] truncate">
                    by {f.authorName}
                  </p>
                </Link>
              ))}
            </div>
          )
        ) : authors.length === 0 ? (
          <EmptyState
            title="No followed authors"
            hint="Follow authors from their profiles to see their work here."
            cta={{ href: "/roster", label: "Browse writers" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {authors.map((a) => (
              <Link
                key={a.id}
                href={`/profile/${a.id}`}
                className="flex flex-col items-center text-center p-4 rounded-sm border border-border hover:border-gold/30 bg-elevated/40 hover:bg-elevated transition-all group"
              >
                <div
                  className="w-16 h-16 rounded-full bg-cover bg-center bg-elevated border border-border mb-3"
                  style={{
                    backgroundImage: a.avatarUrl
                      ? `url(${a.avatarUrl})`
                      : undefined,
                  }}
                />
                <p className="font-display text-paper text-[13px] truncate w-full group-hover:text-gold transition-colors">
                  {a.displayName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="text-center py-20">
      <p className="font-display text-paper text-xl mb-2">{title}</p>
      <p className="text-text-ghost text-[13px] mb-6">{hint}</p>
      <Link
        href={cta.href}
        className="inline-block px-5 py-2 border border-gold/30 text-gold hover:bg-gold/10 rounded-sm font-display text-[13px] tracking-wide transition-all"
      >
        {cta.label}
      </Link>
    </div>
  );
}
