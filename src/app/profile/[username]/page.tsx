"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import StoryCard from "@/components/shared/StoryCard";

// TODO: Replace with API call (GET /api/users/:username)
const MOCK_PROFILE = {
  displayName: "Amara Voss",
  username: "amara-voss",
  bio: "Weaver of worlds, keeper of impossible lanterns. Writing fantasy and adventure from a rain-soaked cottage in the Pacific Northwest. Always searching for the next door that shouldn't be there.",
  role: "Author",
  avatarUrl: null,
  stats: {
    stories: 4,
    wordsWritten: "134.6k",
    sparksReceived: 1344,
  },
  stories: [
    {
      title: "The Lantern Keeper's Daughter",
      genres: ["Fantasy", "Adventure"],
      wordCount: 42300,
      chapterCount: 12,
      sparkCount: 284,
      status: "in-progress" as const,
      slug: "lantern-keepers-daughter",
      lastEdited: "2 hours ago",
    },
    {
      title: "Letters Never Sent",
      genres: ["Romance", "Literary Fiction"],
      wordCount: 65200,
      chapterCount: 22,
      sparkCount: 891,
      status: "complete" as const,
      slug: "letters-never-sent",
      lastEdited: "3 days ago",
    },
    {
      title: "The Cartographer's Error",
      genres: ["Historical Fiction", "Mystery"],
      wordCount: 8400,
      chapterCount: 3,
      sparkCount: 42,
      status: "draft" as const,
      slug: "cartographers-error",
      lastEdited: "1 week ago",
    },
    {
      title: "Neon Requiem",
      genres: ["Cyberpunk", "Thriller"],
      wordCount: 18700,
      chapterCount: 6,
      sparkCount: 127,
      status: "in-progress" as const,
      slug: "neon-requiem",
      lastEdited: "Yesterday",
    },
  ],
};

const TABS = ["Stories", "Portfolio", "Reading"] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Stories");
  const profile = MOCK_PROFILE;

  return (
    <div>
      {/* Banner / Cover */}
      <div className="h-48 sm:h-56 bg-gradient-to-br from-amber/20 via-surface to-lavender/10 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-5 mb-8"
        >
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-void flex items-center justify-center text-amber text-2xl font-display font-semibold flex-shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              profile.displayName.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl text-paper font-semibold">
                {profile.displayName}
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-amber/10 text-amber text-[11px] font-medium">
                {profile.role}
              </span>
            </div>
            <p className="text-text-secondary text-[13px] leading-relaxed max-w-xl">
              {profile.bio}
            </p>
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
              value: profile.stats.stories,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 4l8 3 8-3v11l-8 3-8-3V4z" />
                  <path d="M10 7v11" />
                </svg>
              ),
            },
            {
              label: "Words Written",
              value: profile.stats.wordsWritten,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 4h12M4 8h10M4 12h8M4 16h12" />
                </svg>
              ),
            },
            {
              label: "Sparks Received",
              value: profile.stats.sparksReceived.toLocaleString(),
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M10 2l2 4.5L17 7l-3.5 3.5L14 16l-4-2.5L6 16l.5-5.5L3 7l5-.5z" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border rounded-xl p-4 text-center"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
              {profile.stories.map((story, i) => (
                <motion.div
                  key={story.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                >
                  <StoryCard
                    {...story}
                    author={profile.displayName}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "Portfolio" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
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
                <circle cx="10" cy="10" r="2" />
                <path d="M4 20l6-6 4 4 3-3 7 7" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-paper mb-1">
              Portfolio Coming Soon
            </h3>
            <p className="text-text-secondary text-[13px] max-w-sm">
              A curated showcase of artwork, illustrations, and visual work will
              be available here soon.
            </p>
          </motion.div>
        )}

        {activeTab === "Reading" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-sage/10 border border-border flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-sage/50"
              >
                <path d="M4 6l10 3 10-3v14l-10 3-10-3V6z" />
                <path d="M14 9v14" />
              </svg>
            </div>
            <h3 className="font-display text-xl text-paper mb-1">
              Reading List Coming Soon
            </h3>
            <p className="text-text-secondary text-[13px] max-w-sm">
              Saved stories, reading progress, and bookmarked chapters will
              appear here soon.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
