"use client";

import { motion } from "framer-motion";

interface FrontispieceProps {
  avatarUrl: string | null;
  displayName: string;
  genre: string | null;
}

const GENRE_GRADIENT: Record<string, string> = {
  Fantasy: "from-amber/30 to-amber/10",
  "Science Fiction": "from-lavender/30 to-lavender/10",
  Romance: "from-rose/30 to-rose/10",
  Mystery: "from-violet/30 to-violet/10",
  Thriller: "from-rose/25 to-rose/10",
  Horror: "from-rose/30 to-rose/10",
  Adventure: "from-teal/25 to-teal/10",
  Contemporary: "from-sage/25 to-sage/10",
};

export default function Frontispiece({
  avatarUrl,
  displayName,
  genre,
}: FrontispieceProps) {
  const gradient =
    (genre && GENRE_GRADIENT[genre]) || "from-amber/30 to-amber/10";

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="flex justify-center py-12"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shadow-lg">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span className="font-display text-2xl text-paper/80 font-semibold">
              {displayName.charAt(0)}
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
