"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import GenreAtmosphere from "@/components/profile/GenreAtmosphere";
import HalfTitle from "@/components/profile/HalfTitle";
import Frontispiece from "@/components/profile/Frontispiece";
import Epigraph from "@/components/profile/Epigraph";
import FeaturedWork from "@/components/profile/FeaturedWork";
import Bookshelf from "@/components/profile/Bookshelf";
import Colophon from "@/components/profile/Colophon";
import type { ApiStory } from "@/types/api";

interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  stories: ApiStory[];
}

interface ProfileOffering {
  id: string;
  craft: string;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliveryDays: number;
  completedCount: number;
}

const CRAFT_LABELS: Record<string, string> = {
  "custom-chapter": "Custom Chapter",
  ghostwriting: "Ghostwriting",
  poetry: "Poetry",
  "screenplay-coverage": "Screenplay Coverage",
  editing: "Editing",
  "cover-art": "Cover Art",
  "character-art": "Character Art",
  "webtoon-panels": "Webtoon Panels",
  "scene-illustration": "Scene Illustration",
  worldbuilding: "Worldbuilding",
  "gm-for-hire": "GM for Hire",
  "story-bible": "Story Bible",
};

const CRAFT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "custom-chapter": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  ghostwriting: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  poetry: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "screenplay-coverage": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  editing: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "cover-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "character-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "webtoon-panels": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "scene-illustration": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  worldbuilding: { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "gm-for-hire": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "story-bible": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
};

function getCraftColor(craft: string) {
  return CRAFT_COLORS[craft] ?? { text: "text-text-secondary", bg: "bg-surface/50", border: "border-border" };
}

interface FollowedStory {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  status: string;
  slug: string | null;
  authorName: string | null;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
}

function getTopGenre(stories: ApiStory[]): string | null {
  const counts: Record<string, number> = {};
  for (const s of stories) {
    for (const g of s.genres) {
      counts[g] = (counts[g] || 0) + 1;
    }
  }
  let top: string | null = null;
  let max = 0;
  for (const [genre, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      top = genre;
    }
  }
  return top;
}

function getFeatured(stories: ApiStory[]): ApiStory | null {
  const published = stories.filter((s) => s.status !== "draft");
  if (published.length === 0) return null;
  return published.reduce((best, s) =>
    s.sparkCount > best.sparkCount ? s : best
  );
}

export default function ProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params.username as string;
  const isOwnProfile = session?.user?.id === userId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedStories, setFollowedStories] = useState<FollowedStory[]>([]);
  const [followedLoaded, setFollowedLoaded] = useState(false);
  const [hasRosterProfile, setHasRosterProfile] = useState<boolean | null>(null);
  const [studioOfferings, setStudioOfferings] = useState<ProfileOffering[]>([]);
  const [studioLoaded, setStudioLoaded] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message || "User not found");
          return;
        }
        setProfile(json.data);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  // Check if own profile has a roster card
  useEffect(() => {
    if (!isOwnProfile) return;
    fetch("/api/roster/me")
      .then((res) => res.json())
      .then((json) => setHasRosterProfile(!!json.data))
      .catch(() => {});
  }, [isOwnProfile]);

  // Fetch studio offerings
  useEffect(() => {
    if (!profile || studioLoaded) return;
    fetch(`/api/scriptorium/offerings?artisanId=${userId}&limit=50`)
      .then((res) => res.json())
      .then((json) => {
        if (json.offerings) setStudioOfferings(json.offerings);
        setStudioLoaded(true);
      })
      .catch(() => setStudioLoaded(true));
  }, [profile, userId, studioLoaded]);

  // Fetch reading list for owner
  useEffect(() => {
    if (!isOwnProfile || followedLoaded) return;
    fetch(`/api/users/${userId}/following`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.stories) setFollowedStories(json.data.stories);
        setFollowedLoaded(true);
      })
      .catch(() => {});
  }, [isOwnProfile, userId, followedLoaded]);

  const topGenre = useMemo(
    () => (profile ? getTopGenre(profile.stories) : null),
    [profile]
  );

  const featured = useMemo(
    () => (profile ? getFeatured(profile.stories) : null),
    [profile]
  );

  const remainingStories = useMemo(() => {
    if (!profile || !featured) return profile?.stories || [];
    return profile.stories.filter((s) => s.id !== featured.id);
  }, [profile, featured]);

  const totalWords = useMemo(
    () => profile?.stories.reduce((sum, s) => sum + s.totalWords, 0) || 0,
    [profile]
  );

  const totalSparks = useMemo(
    () => profile?.stories.reduce((sum, s) => sum + s.sparkCount, 0) || 0,
    [profile]
  );

  const publishedCount = useMemo(
    () => profile?.stories.filter((s) => s.status !== "draft").length || 0,
    [profile]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="font-display text-2xl text-paper mb-2">
          User not found
        </h2>
        <p className="text-text-secondary text-[13px]">{error}</p>
      </div>
    );
  }

  const displayName = profile.displayName || "Anonymous";

  // Convert followed stories to bookshelf format
  const readingShelfStories = followedStories.map((s) => ({
    id: s.id,
    title: s.title,
    synopsis: s.synopsis,
    genres: s.genres,
    status: s.status,
    slug: s.slug,
    totalWords: s.totalWords,
    sparkCount: s.sparkCount,
    chapterCount: s.chapterCount,
  }));

  return (
    <div className="relative">
      <GenreAtmosphere genre={topGenre} />

      {/* 1. Half-Title */}
      <HalfTitle
        displayName={displayName}
        role={profile.role}
        createdAt={profile.createdAt}
        genre={topGenre}
        isOwner={isOwnProfile}
        userId={userId}
      />

      {/* 2. Frontispiece */}
      <Frontispiece
        avatarUrl={profile.avatarUrl}
        displayName={displayName}
        genre={topGenre}
      />

      {/* 3. Epigraph */}
      <Epigraph bio={profile.bio} displayName={displayName} />

      {/* 4. Featured Work */}
      {featured && (
        <FeaturedWork story={featured} isOwner={isOwnProfile} />
      )}

      {/* 5. The Bookshelf */}
      <Bookshelf
        stories={remainingStories}
        isOwner={isOwnProfile}
        showDrafts
      />

      {/* 6. Reading Shelf (owner only) */}
      {isOwnProfile && (
        <Bookshelf
          stories={readingShelfStories}
          isOwner={isOwnProfile}
          label="On the Nightstand"
          emptyText="The nightstand is empty. Browse the stacks?"
          emptyLink={{ text: "Browse stories", href: "/browse" }}
          variant="nightstand"
        />
      )}

      {/* 7. Studio — Scriptorium Offerings */}
      {(studioOfferings.length > 0 || isOwnProfile) && studioLoaded && (
        <section className="px-6 pb-10 max-w-4xl mx-auto">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-border" />
              <h2 className="font-display text-lg text-paper tracking-tight">
                Studio
              </h2>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-border" />
            </div>
            {isOwnProfile && studioOfferings.length > 0 && (
              <Link
                href="/scriptorium/offerings"
                className="text-[12px] text-text-ghost hover:text-text-secondary transition-colors"
              >
                Manage offerings
              </Link>
            )}
          </div>

          {studioOfferings.length === 0 ? (
            /* Empty state */
            <div className="rounded-xl border border-border/60 bg-ink/30 p-8 text-center">
              <p className="text-text-ghost text-[13px] mb-3">
                {isOwnProfile
                  ? "You haven't listed any offerings yet."
                  : `This writer hasn't listed any offerings yet.`}
              </p>
              {isOwnProfile && (
                <Link
                  href="/scriptorium/offerings"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gold/10 text-gold border border-gold/25 text-[12px] font-medium hover:bg-gold/20 transition-colors"
                >
                  List your first offering
                </Link>
              )}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {studioOfferings.map((offering) => {
                const colors = getCraftColor(offering.craft);
                return (
                  <motion.div
                    key={offering.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link
                      href="/scriptorium"
                      className="block rounded-xl border border-border bg-ink/50 p-5 hover:border-text-ghost/30 transition-colors group"
                    >
                      {/* Craft badge + trust badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${colors.text} ${colors.bg} ${colors.border}`}
                        >
                          {CRAFT_LABELS[offering.craft] ?? offering.craft}
                        </span>
                        {offering.completedCount >= 10 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gold/10 text-gold border border-gold/25">
                            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" stroke="none">
                              <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z" />
                            </svg>
                            Master Artisan
                          </span>
                        ) : offering.completedCount >= 5 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber/8 text-amber border border-amber/20">
                            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" stroke="none">
                              <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.8L8 12.2 3.7 14.5l.8-4.8L1 6.3l4.8-.8z" />
                            </svg>
                            Trusted Artisan
                          </span>
                        ) : null}
                      </div>

                      {/* Title */}
                      <h3 className="font-display text-paper text-[15px] mb-1.5 leading-snug group-hover:text-gold/90 transition-colors">
                        {offering.title}
                      </h3>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-ghost">
                        <span>
                          {offering.priceMin === offering.priceMax
                            ? `${offering.priceMin} drops`
                            : `${offering.priceMin}--${offering.priceMax} drops`}
                        </span>
                        <span className="text-border">|</span>
                        <span>~{offering.deliveryDays} days</span>
                        {offering.completedCount > 0 && (
                          <>
                            <span className="text-border">|</span>
                            <span className="text-sage font-medium inline-flex items-center gap-0.5">
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M3 8l3 3 7-7" />
                              </svg>
                              {offering.completedCount} completed
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>
      )}

      {/* Roster nudge for own profile */}
      {isOwnProfile && hasRosterProfile === false && publishedCount > 0 && (
        <div className="mb-8 mx-auto max-w-md">
          <div className="relative rounded-xl border border-amber/15 bg-amber/[0.03] p-5 text-center">
            <p className="text-text-secondary text-[13px] mb-1">
              You have {publishedCount} published {publishedCount === 1 ? "story" : "stories"}{totalSparks > 0 ? ` and ${totalSparks} sparks` : ""}.
            </p>
            <p className="text-text-ghost text-[12px] mb-3">
              Let collaborators discover your work.
            </p>
            <a
              href="/roster/setup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all"
            >
              Post Your Card on the Roster
            </a>
          </div>
        </div>
      )}

      {/* 7. Colophon */}
      <Colophon
        storyCount={publishedCount}
        totalWords={totalWords}
        totalSparks={totalSparks}
        topGenre={topGenre}
        memberSince={profile.createdAt}
      />
    </div>
  );
}
