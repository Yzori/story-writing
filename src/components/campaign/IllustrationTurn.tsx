import { motion } from "framer-motion";
import type { Turn } from "@/types/campaign";
import { parseIllustrationMetadata } from "@/lib/campaign-turns";

interface IllustrationTurnProps {
  turn: Turn;
}

export default function IllustrationTurn({ turn }: IllustrationTurnProps) {
  const meta = parseIllustrationMetadata(turn.metadata);
  const imageUrl = meta?.imageUrl ?? "";
  const caption = meta?.caption ?? "";

  if (!imageUrl) return null;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="my-10 flex flex-col items-center"
    >
      <div className="max-w-full rounded-xl overflow-hidden border border-border shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <img
          src={imageUrl}
          alt={caption || "Illustration"}
          loading="lazy"
          className="max-w-full block"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-paper/50 font-serif italic text-center max-w-md">
          {caption}
        </figcaption>
      )}
    </motion.figure>
  );
}
