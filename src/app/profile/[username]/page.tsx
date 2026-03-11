"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import StoryCard from "@/components/shared/StoryCard";

interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  stories: {
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
  }[];
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

const TABS = ["Stories", "Portfolio", "Reading"] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params.username as string;
  const isOwnProfile = session?.user?.id === userId;
  const [activeTab, setActiveTab] = useState<Tab>("Stories");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedStories, setFollowedStories] = useState<FollowedStory[]>([]);
  const [followedLoading, setFollowedLoading] = useState(false);
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

  // Lazy-load reading list when tab is opened (own profile only)
  useEffect(() => {
    if (activeTab !== "Reading" || !isOwnProfile || followedLoaded) return;
    setFollowedLoading(true);
    fetch(`/api/users/${userId}/following`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.stories) setFollowedStories(json.data.stories);
        setFollowedLoaded(true);
      })
      .catch(() => {})
      .finally(() => setFollowedLoading(false));
  }, [activeTab, isOwnProfile, userId, followedLoaded]);

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

  return (
    <div>
      {/* Banner / Cover */}
      <div className="h-48 sm:h-56 bg-gradient-to-br from-amber/20 via-surface to-lavender/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-amber/[0.04] blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-5 mb-8"
        >
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border-4 border-void flex items-center justify-center text-amber text-2xl font-display font-semibold flex-shrink-0 shadow-lg shadow-void/50">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              displayName.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl text-paper font-semibold">
                {displayName}
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-amber/10 text-amber text-[11px] font-medium capitalize">
                {profile.role}
              </span>
              {isOwnProfile && (
                <Link
                  href={`/profile/${userId}/edit`}
                  className="text-text-ghost hover:text-paper transition-colors text-[12px] flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                  </svg>
                  Edit
                </Link>
              )}
            </div>
            {profile.bio && (
              <p className="text-text-secondary text-[13px] leading-relaxed max-w-xl">
                {profile.bio}
              </p>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          {[
            {
              label: "Stories",
              value: profile.stories.length,
              icon: (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4l8 3 8-3v11l-8 3-8-3V4z" />
                  <path d="M10 7v11" />
                </svg>
              ),
            },
            {
              label: "Member Since",
              value: new Date(profile.createdAt).getFullYear(),
              icon: (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 6v4l3 2" />
                </svg>
              ),
            },
            {
              label: "Role",
              value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1),
              icon: (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 2l2 4.5L17 7l-3.5 3.5L14 16l-4-2.5L6 16l.5-5.5L3 7l5-.5z" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-page p-5 text-center"
            >
              <div className="flex justify-center text-amber mb-2">
                {stat.icon}
              </div>
              <p className="text-paper text-xl font-display font-semibold">
                {stat.value}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border-b border-border mb-8"
        >
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? "border-amber text-paper"
                    : "border-transparent text-text-secondary hover:text-paper"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        {activeTab === "Stories" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {profile.stories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
                {profile.stories.map((story, i) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                  >
                    <StoryCard
                      title={story.title}
                      author={displayName}
                      genres={story.genres}
                      wordCount={story.totalWords || 0}
                      chapterCount={story.chapterCount || 0}
                      sparkCount={story.sparkCount || 0}
                      contentRating={story.contentRating}
                      status={story.status as "draft" | "in-progress" | "complete"}
                      slug={story.slug || story.id}
                      coverUrl={story.coverImageUrl || undefined}
                      excerpt={story.synopsis || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-text-secondary text-[13px]">
                  No stories yet.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "Portfolio" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {profile.stories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
                {profile.stories.map((story, i) => {
                  const genreGradients: Record<string, string> = {
                    Fantasy: "from-amber/50 via-amber/20 to-violet/10",
                    "Science Fiction": "from-lavender/50 via-lavender/20 to-teal/10",
                    Romance: "from-rose/50 via-rose/20 to-amber/10",
                    Mystery: "from-violet/50 via-violet/20 to-lavender/10",
                    Thriller: "from-rose/40 via-rose/15 to-violet/10",
                    Horror: "from-rose/50 via-rose/20 to-void",
                    Adventure: "from-teal/50 via-teal/20 to-sage/10",
                    Contemporary: "from-sage/50 via-sage/20 to-amber/10",
                  };
                  const gradient =
                    (story.genres.length > 0 && genreGradients[story.genres[0]]) ||
                    "from-amber/40 via-amber/15 to-lavender/10";
                  const wordDisplay =
                    story.totalWords >= 1000
                      ? `${(story.totalWords / 1000).toFixed(1)}k words`
                      : `${story.totalWords} words`;
                  const excerptText =
                    story.synopsis && story.synopsis.length > 150
                      ? story.synopsis.slice(0, 150) + "..."
                      : story.synopsis;

                  return (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.08 }}
                    >
                      <Link href={`/story/${story.slug || story.id}`}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="card-page relative overflow-hidden cursor-pointer group transition-all duration-300"
                        >
                          {/* Cover area - 60% of card */}
                          <div
                            className={`relative h-56 bg-gradient-to-br ${gradient} overflow-hidden`}
                          >
                            {story.coverImageUrl ? (
                              <img
                                src={story.coverImageUrl}
                                alt={story.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg
                                  width="48"
                                  height="48"
                                  viewBox="0 0 48 48"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  className="text-paper/10"
                                >
                                  <path d="M8 8h32v32H8z" />
                                  <path d="M14 20h20M14 26h14M14 32h8" />
                                </svg>
                              </div>
                            )}

                            {/* Glass overlay at bottom */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/90 via-void/60 to-transparent pt-16 pb-4 px-4">
                              <h3 className="font-display text-paper text-lg font-semibold leading-snug group-hover:text-amber transition-colors duration-200 line-clamp-2">
                                {story.title}
                              </h3>
                            </div>

                            {/* Format badge */}
                            <span className="absolute top-3 right-3 text-[10px] font-medium tracking-wider text-paper/80 bg-void/60 backdrop-blur-sm px-2.5 py-1 rounded-full capitalize">
                              {story.format}
                            </span>

                            {/* Shimmer on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </div>

                          {/* Info section */}
                          <div className="p-4">
                            {excerptText && (
                              <p className="text-text-secondary text-[12px] leading-relaxed line-clamp-3 mb-3">
                                {excerptText}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-3 border-t border-border-subtle">
                              <div className="flex items-center gap-3">
                                <span>{wordDisplay}</span>
                                {story.sparkCount > 0 && (
                                  <span className="flex items-center gap-1 text-amber/60">
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                    >
                                      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 13l-3-2-3 2 .5-4.5L3 6l3.5-.5z" />
                                    </svg>
                                    {story.sparkCount}
                                  </span>
                                )}
                              </div>
                              {story.genres.length > 0 && (
                                <span className="text-text-ghost text-[10px] capitalize">
                                  {story.genres[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-lavender/10 border border-border flex items-center justify-center mb-4">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-lavender/50"
                  >
                    <rect x="4" y="4" width="20" height="20" rx="3" />
                    <path d="M9 10h10M9 14h7M9 18h4" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-paper mb-1">
                  {isOwnProfile
                    ? "No published work yet"
                    : "This writer hasn\u2019t published yet"}
                </h3>
                <p className="text-text-secondary text-[13px] max-w-sm mb-5">
                  {isOwnProfile
                    ? "Your published stories will be showcased here as portfolio pieces."
                    : "Check back later for their creative work."}
                </p>
                {isOwnProfile && (
                  <Link
                    href="/create"
                    className="text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                  >
                    Start writing &rarr;
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "Reading" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {!isOwnProfile ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-text-secondary text-[13px]">
                  Reading lists are private.
                </p>
              </div>
            ) : followedLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            ) : followedStories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
                {followedStories.map((story, i) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                  >
                    <StoryCard
                      title={story.title}
                      author={story.authorName || undefined}
                      genres={story.genres}
                      wordCount={story.totalWords || 0}
                      chapterCount={story.chapterCount || 0}
                      sparkCount={story.sparkCount || 0}
                      contentRating={story.contentRating}
                      slug={story.slug || story.id}
                      coverUrl={story.coverImageUrl || undefined}
                      excerpt={story.synopsis || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-sage/10 border border-border flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage/50">
                    <path d="M4 6l10 3 10-3v14l-10 3-10-3V6z" />
                    <path d="M14 9v14" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-paper mb-1">
                  No stories followed yet
                </h3>
                <p className="text-text-secondary text-[13px] max-w-sm mb-5">
                  Follow stories you love and they&apos;ll appear here.
                </p>
                <Link
                  href="/browse"
                  className="text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
                >
                  Browse stories &rarr;
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
