"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import VisitAtmosphere from "@/components/profile/VisitAtmosphere";
import ProfileCover from "@/components/profile/ProfileCover";
import VisitorsTray from "@/components/profile/VisitorsTray";
import ArrangeStudy, { type StudySettings } from "@/components/profile/ArrangeStudy";
import Letterbox from "@/components/profile/Letterbox";
import ProfileCrossroads, { type ProfilePoll } from "@/components/profile/ProfileCrossroads";
import Mantel, { type MantelCandle } from "@/components/profile/Mantel";
import StudyStage from "@/components/profile/room/StudyStage";
import OwnerBackroom from "@/components/profile/room/OwnerBackroom";
import Threshold from "@/components/profile/Threshold";
import InQuiloria from "@/components/profile/InQuiloria";
import ReadingTaste from "@/components/profile/ReadingTaste";
import DeskNotes from "@/components/profile/DeskNotes";
import FeaturedManuscript from "@/components/profile/FeaturedManuscript";
import CollectedWorks from "@/components/profile/CollectedWorks";
import StudioRail from "@/components/profile/StudioRail";
import CircleCard from "@/components/circle/CircleCard";
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
  profileHearth: boolean;
  profileLetterbox: "open" | "followers" | "closed";
  profileShowGifts: boolean;
  profileCoverMode: "auto" | "portrait" | "story";
  profileCoverStoryId: string | null;
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

interface CandleState {
  enabled: boolean;
  count: number;
  candles: MantelCandle[];
  hasLit: boolean;
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

/**
 * The Composed Room needs real width; below lg the profile falls back to
 * the stacked composition. Conditional render (not CSS hiding) so each
 * interactive component fetches once.
 */
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/**
 * The profile: a writer's study, opened to visitors. Identity at the door,
 * candles on the mantel, the works on the shelves — and everything a
 * visitor can do here is something the writer chose to set out.
 */
export default function ProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params.username as string;
  const isOwnProfile = session?.user?.id === userId;
  const signedIn = !!session?.user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedStories, setFollowedStories] = useState<FollowedStory[]>([]);
  const [followedLoaded, setFollowedLoaded] = useState(false);
  const [hasRosterProfile, setHasRosterProfile] = useState<boolean | null>(null);
  const [studioOfferings, setStudioOfferings] = useState<ProfileOffering[]>([]);
  const [studioLoaded, setStudioLoaded] = useState(false);
  const [candles, setCandles] = useState<CandleState>({
    enabled: false,
    count: 0,
    candles: [],
    hasLit: false,
  });
  const [polls, setPolls] = useState<ProfilePoll[]>([]);
  const [circleActive, setCircleActive] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const isDesktop = useIsDesktop();

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

  // ── The mantel ──────────────────────────────────────────────
  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/candles`);
      if (!res.ok) return;
      const json = await res.json();
      setCandles(json.data);
    } catch {}
  }, [userId]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  const handleLightCandle = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${userId}/candles`, { method: "POST" });
      if (!res.ok) return false;
      await fetchCandles();
      return true;
    } catch {
      return false;
    }
  }, [userId, fetchCandles]);

  // ── Open crossroads ─────────────────────────────────────────
  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/crossroads`);
      if (!res.ok) return;
      const json = await res.json();
      setPolls(json.data.crossroads ?? []);
    } catch {}
  }, [userId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // ── The Circle (active?) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/circles/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setCircleActive(!!json?.circle?.isActive);
      })
      .catch(() => {});
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

  // sql sums arrive as strings — coerce or the reduce concatenates
  const totalWords = useMemo(
    () => profile?.stories.reduce((sum, s) => sum + Number(s.totalWords), 0) || 0,
    [profile]
  );

  const publishedCount = useMemo(
    () => profile?.stories.filter((s) => s.status === "published").length || 0,
    [profile]
  );

  const totalSparks = useMemo(
    () => profile?.stories.reduce((sum, s) => sum + Number(s.sparkCount), 0) || 0,
    [profile]
  );

  // The room warms with candles — fully warm at a dozen burning.
  const warmth = candles.enabled ? Math.min(candles.count / 12, 1) : 0;

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

  const studySettings: StudySettings = {
    profileHearth: profile.profileHearth,
    profileLetterbox: profile.profileLetterbox,
    profileShowGifts: profile.profileShowGifts,
    profileCoverMode: profile.profileCoverMode,
    profileCoverStoryId: profile.profileCoverStoryId,
  };

  const publishedStories = profile.stories.filter(
    (s) => s.status === "published" && s.isPublic
  );

  // What fronts the cover disc: an explicit choice, or the best work by
  // sparks ('auto'), with the portrait as the final fallback.
  const coverStory =
    profile.profileCoverMode === "portrait"
      ? null
      : (profile.profileCoverMode === "story" &&
          publishedStories.find((s) => s.id === profile.profileCoverStoryId)) ||
        featured;

  const enterStudy = () =>
    document.getElementById("study-room")?.scrollIntoView({ behavior: "smooth" });

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
      <VisitAtmosphere genre={topGenre} warmth={warmth} />

      <div className="relative pb-16">
        <ProfileCover
          displayName={displayName}
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          role={profile.role}
          genre={topGenre}
          coverStory={
            coverStory
              ? {
                  title: coverStory.title,
                  coverImageUrl: coverStory.coverImageUrl,
                  genre: coverStory.genres[0] ?? null,
                }
              : null
          }
          storyCount={publishedCount}
          totalWords={totalWords}
          audienceCount={profile.insights?.audienceCount ?? 0}
          candleCount={candles.enabled ? candles.count : 0}
          isOwner={isOwnProfile}
          userId={userId}
          onArrange={() => setArrangeOpen(true)}
          onEnter={enterStudy}
        />

        {/* On small rooms the mantel stands just inside the door */}
        {isDesktop === false && (
          <section id="study-room" className="scroll-mt-20 px-5">
            <Mantel
              enabled={candles.enabled}
              count={candles.count}
              candles={candles.candles}
              hasLit={candles.hasLit}
              isOwner={isOwnProfile}
              signedIn={signedIn}
              ownerName={displayName}
              onLight={handleLightCandle}
            />
          </section>
        )}

        {isOwnProfile && (
          <Threshold
            hasBio={!!profile.bio}
            hasAvatar={!!profile.avatarUrl}
            hasStory={profile.stories.length > 0}
            hasFollowing={followedLoaded ? followedStories.length > 0 : true}
            userId={userId}
          />
        )}

        {isDesktop === true ? (
          /* ── The study as a stage — one viewport, zones open in place ── */
          <StudyStage
            userId={userId}
            ownerName={displayName}
            isOwner={isOwnProfile}
            signedIn={signedIn}
            candles={candles}
            onLightCandle={handleLightCandle}
            featured={featured}
            stories={remainingStories}
            showGifts={profile.profileShowGifts}
            letterboxPolicy={profile.profileLetterbox}
            hearthEnabled={profile.profileHearth}
            circleActive={circleActive}
            offeringsCount={studioOfferings.length}
            polls={polls}
            onRefreshPolls={fetchPolls}
            onArrange={() => setArrangeOpen(true)}
          />
        ) : isDesktop === false ? (
          /* ── The stacked visit — small rooms read top to bottom ── */
          <>
            <VisitorsTray
              userId={userId}
              ownerName={displayName}
              isOwner={isOwnProfile}
              signedIn={signedIn}
              letterboxPolicy={profile.profileLetterbox}
              showGifts={profile.profileShowGifts}
              circleActive={circleActive}
              offeringsCount={studioOfferings.length}
              crossroadsCount={polls.length}
            />

            <DeskNotes
              userId={userId}
              isOwner={isOwnProfile}
              ownerName={displayName}
              ownStories={profile.stories}
            />

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

            <ProfileCrossroads
              polls={polls}
              ownerName={displayName}
              isOwner={isOwnProfile}
              signedIn={signedIn}
              onRefresh={fetchPolls}
            />

            <Letterbox userId={userId} ownerName={displayName} isOwner={isOwnProfile} />

            {circleActive && !isOwnProfile && (
              <section id="circle" className="relative mx-auto mt-16 max-w-3xl scroll-mt-24 px-5 lg:px-8">
                <div className="mb-6 text-center">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-amber">The inner room</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
                    {displayName}&apos;s Circle
                  </h2>
                </div>
                <CircleCard creatorId={userId} creatorName={displayName} />
              </section>
            )}
          </>
        ) : null}

        {isDesktop === true ? (
          /* ── Below the stage: a bento grid, not stacked sections ── */
          <>
            {isOwnProfile && (
              <OwnerBackroom
                userId={userId}
                stories={profile.stories}
                followedStories={followedStories.map((s) => ({
                  id: s.id,
                  title: s.title,
                  slug: s.slug,
                  authorName: s.authorName,
                  chapterCount: s.chapterCount,
                }))}
                insights={
                  profile.insights
                    ? {
                        sparksGiven: profile.insights.sparksGiven,
                        topReadingGenres: profile.insights.topReadingGenres,
                        readingStreakDays: profile.insights.readingStreakDays,
                        readingStreakBest: profile.insights.readingStreakBest,
                      }
                    : null
                }
                offeringsCount={studioOfferings.length}
                offeringsCompleted={studioOfferings.reduce(
                  (sum, o) => sum + Number(o.completedCount),
                  0
                )}
                hasRosterProfile={hasRosterProfile}
              />
            )}
            {!isOwnProfile && studioLoaded && studioOfferings.length > 0 && (
              <div id="studio" className="scroll-mt-24">
                <StudioRail offerings={studioOfferings} isOwner={false} />
              </div>
            )}
          </>
        ) : isDesktop === false ? (
          <>
            {isOwnProfile && <InQuiloria stories={profile.stories} />}

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
              <div id="studio" className="scroll-mt-24">
                <StudioRail offerings={studioOfferings} isOwner={isOwnProfile} />
              </div>
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
          </>
        ) : null}
      </div>

      {isOwnProfile && (
        <ArrangeStudy
          userId={userId}
          open={arrangeOpen}
          settings={studySettings}
          coverChoices={publishedStories.map((s) => ({ id: s.id, title: s.title }))}
          displayName={displayName}
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          onClose={() => setArrangeOpen(false)}
          onSaved={(next) => {
            setProfile((p) => (p ? { ...p, ...next } : p));
            fetchCandles();
          }}
        />
      )}
    </div>
  );
}
