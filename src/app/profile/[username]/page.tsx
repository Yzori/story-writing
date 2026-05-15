"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import StudyAtmosphere from "@/components/profile/StudyAtmosphere";
import AuthorDesk from "@/components/profile/AuthorDesk";
import FeaturedManuscript from "@/components/profile/FeaturedManuscript";
import CollectedWorks from "@/components/profile/CollectedWorks";
import StudioRail from "@/components/profile/StudioRail";
import Threshold from "@/components/profile/Threshold";
import InTheInkwell from "@/components/profile/InTheInkwell";
import ReadingTaste from "@/components/profile/ReadingTaste";
import DeskNotes from "@/components/profile/DeskNotes";
import type { ApiStory } from "@/types/api";

interface ProfileInsights {
  audienceCount: number;
  followerCount: number;
  sparksGiven: number;
  topReadingGenres: { genre: string; count: number }[];
  recentSparksGiven: {
    storyId: string;
    title: string;
    slug: string | null;
    sparkedAt: string;
  }[];
  inkDropsReceived: number;
  tipCount: number;
  readingStreakDays: number;
  readingStreakBest: number;
  latestChapter: {
    storyId: string;
    storyTitle: string;
    storySlug: string | null;
    title: string;
    sortOrder: number;
    publishedAt: string;
  } | null;
}

interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  stories: ApiStory[];
  insights?: ProfileInsights;
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
  const published = stories.filter((s) => s.status === "published");
  if (published.length === 0) return null;
  return published.reduce((best, s) => (s.sparkCount > best.sparkCount ? s : best));
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
    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      setProfile(null);
      setFollowedStories([]);
      setFollowedLoaded(false);
      setHasRosterProfile(null);
      setStudioOfferings([]);
      setStudioLoaded(false);

      try {
        const res = await fetch(`/api/users/${userId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error?.message || "User not found");
          return;
        }
        setProfile(json.data);
      } catch {
        if (cancelled) return;
        setError("Failed to load profile");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!isOwnProfile) return;
    let cancelled = false;
    fetch("/api/roster/me")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setHasRosterProfile(!!json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile]);

  useEffect(() => {
    if (!profile || studioLoaded) return;
    let cancelled = false;
    fetch(`/api/scriptorium/offerings?artisanId=${userId}&limit=50`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.offerings) setStudioOfferings(json.offerings);
        setStudioLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setStudioLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, userId, studioLoaded]);

  useEffect(() => {
    if (!isOwnProfile || followedLoaded) return;
    let cancelled = false;
    fetch(`/api/users/${userId}/following`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data?.stories) setFollowedStories(json.data.stories);
        setFollowedLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setFollowedLoaded(true);
      });
    return () => {
      cancelled = true;
    };
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
    () => profile?.stories.filter((s) => s.status === "published").length || 0,
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
        <h2 className="font-display text-2xl text-paper mb-2">User not found</h2>
        <p className="text-text-secondary text-[13px]">{error}</p>
      </div>
    );
  }

  const displayName = profile.displayName || "Anonymous";

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
    <div className="relative min-h-screen">
      <StudyAtmosphere genre={topGenre} />

      <div className="relative pb-16">
        <AuthorDesk
          displayName={displayName}
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          role={profile.role}
          createdAt={profile.createdAt}
          genre={topGenre}
          isOwner={isOwnProfile}
          userId={userId}
          storyCount={publishedCount}
          totalWords={totalWords}
          totalSparks={totalSparks}
          readingStreakDays={profile.insights?.readingStreakDays ?? 0}
          readingStreakBest={profile.insights?.readingStreakBest ?? 0}
          audienceCount={profile.insights?.audienceCount ?? 0}
          inkDropsReceived={profile.insights?.inkDropsReceived ?? 0}
        />

        {isOwnProfile && (
          <Threshold
            hasBio={!!profile.bio}
            hasAvatar={!!profile.avatarUrl}
            hasStory={profile.stories.length > 0}
            hasFollowing={followedLoaded ? followedStories.length > 0 : true}
            userId={userId}
          />
        )}

        <DeskNotes
          userId={userId}
          isOwner={isOwnProfile}
          ownerName={displayName}
          ownStories={profile.stories}
        />

        {isOwnProfile && <InTheInkwell stories={profile.stories} />}

        {featured && <FeaturedManuscript story={featured} isOwner={isOwnProfile} />}

        <CollectedWorks
          stories={remainingStories}
          isOwner={isOwnProfile}
          showDrafts={isOwnProfile}
          label={featured ? "More from the shelves" : "Collected works"}
          eyebrow={featured ? "Also on display" : "The shelves"}
          emptyText={
            isOwnProfile
              ? "The shelves are empty. Begin a manuscript when you're ready."
              : "More volumes forthcoming."
          }
          emptyLink={isOwnProfile ? { text: "Start writing", href: "/create" } : undefined}
        />

        {profile.insights && (
          <ReadingTaste
            isOwner={isOwnProfile}
            sparksGiven={profile.insights.sparksGiven}
            topGenres={profile.insights.topReadingGenres}
            recentSparks={profile.insights.recentSparksGiven}
            ownerName={displayName}
          />
        )}

        {isOwnProfile && (
          <CollectedWorks
            stories={readingShelfStories}
            isOwner
            label="On the nightstand"
            eyebrow="What you're reading"
            emptyText="The nightstand is empty. Wander the stacks?"
            emptyLink={{ text: "Browse stories", href: "/browse" }}
            variant="nightstand"
          />
        )}

        {studioLoaded && (
          <StudioRail offerings={studioOfferings} isOwner={isOwnProfile} />
        )}

        {isOwnProfile && hasRosterProfile === false && publishedCount > 0 && (
          <section className="relative mx-auto mt-8 max-w-5xl px-5 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-amber/20 bg-amber/[0.04] p-5 text-center backdrop-blur-xl">
              <div className="absolute -top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-amber/[0.18] blur-2xl" aria-hidden />
              <div className="relative">
                <Sparkles size={16} className="mx-auto mb-2 text-amber" />
                <p className="text-[13px] text-text-secondary">
                  You have {publishedCount} published {publishedCount === 1 ? "story" : "stories"}
                  {totalSparks > 0 ? ` and ${totalSparks} sparks` : ""}.
                </p>
                <p className="text-[12px] text-text-ghost">Let collaborators discover your work.</p>
                <Link
                  href="/roster/setup"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-1.5 text-[12px] font-semibold text-void transition-colors hover:bg-amber-light"
                >
                  Post your card on the Roster
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
