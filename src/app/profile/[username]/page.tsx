"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import GenreAtmosphere from "@/components/profile/GenreAtmosphere";
import HalfTitle from "@/components/profile/HalfTitle";
import Frontispiece from "@/components/profile/Frontispiece";
import Epigraph from "@/components/profile/Epigraph";
import FeaturedWork from "@/components/profile/FeaturedWork";
import Bookshelf from "@/components/profile/Bookshelf";
import Colophon from "@/components/profile/Colophon";

interface Story {
  id: string;
  title: string;
  format: string;
  synopsis: string | null;
  coverImageUrl: string | null;
  genres: string[];
  contentRating: string;
  status: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  chapterCount: number;
  totalWords: number;
  sparkCount: number;
}

interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  stories: Story[];
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

function getTopGenre(stories: Story[]): string | null {
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

function getFeatured(stories: Story[]): Story | null {
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
