"use client";

import { motion } from "framer-motion";

interface FormatStubProps {
  format: string;
  storyTitle: string;
  storyId: string;
  onUseProse: () => void;
}

interface FormatInfo {
  label: string;
  heading: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
}

const FORMAT_INFO: Record<string, FormatInfo> = {
  webtoon: {
    label: "Webtoon",
    heading: "The Webtoon editor is coming soon",
    description:
      "Upload panels, arrange sequences, add speech bubbles and text overlays. For now, you can write your script in novel format.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="10" y="4" width="28" height="14" rx="2" />
        <rect x="10" y="22" width="13" height="22" rx="2" />
        <rect x="27" y="22" width="11" height="10" rx="2" />
        <rect x="27" y="36" width="11" height="8" rx="2" />
      </svg>
    ),
    gradient: "from-teal/20 via-lavender/10 to-transparent",
    glowColor: "bg-teal/15",
  },
  poetry: {
    label: "Poetry",
    heading: "The Poetry editor is coming soon",
    description:
      "Line-break aware formatting, stanza spacing, visual poetry support, and audio recording. For now, you can write poems in novel format.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20 8c4-2 8 0 8 4s-4 6-8 6" />
        <path d="M20 8v30" />
        <path d="M14 18h12M16 24h10M12 30h14M15 36h8" />
      </svg>
    ),
    gradient: "from-lavender/20 via-rose/10 to-transparent",
    glowColor: "bg-lavender/15",
  },
  illustrated: {
    label: "Illustrated Novel",
    heading: "The Illustrated Novel editor is coming soon",
    description:
      "Interleave text and illustration blocks freely, with layout controls. For now, you can use the novel editor with inline images.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="6" y="6" width="36" height="36" rx="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M6 32l10-10 8 8 4-4 14 14" />
        <path d="M28 10h10M28 16h8M28 22h6" />
      </svg>
    ),
    gradient: "from-sage/20 via-amber/10 to-transparent",
    glowColor: "bg-sage/15",
  },
  screenplay: {
    label: "Screenplay",
    heading: "The Screenplay editor is coming soon",
    description:
      "Auto-formatted scene headings, dialogue, parentheticals, and table read mode. For now, you can write your script in novel format.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="8" y="4" width="32" height="40" rx="2" />
        <path d="M16 14h16" />
        <path d="M20 20h8" />
        <path d="M14 26h20" />
        <path d="M14 32h20" />
        <path d="M22 38h4" />
        <circle cx="14" cy="8" r="2" />
        <circle cx="34" cy="8" r="2" />
      </svg>
    ),
    gradient: "from-copper/20 via-burnt/10 to-transparent",
    glowColor: "bg-copper/15",
  },
};

export default function FormatStub({
  format,
  storyTitle,
  onUseProse,
}: FormatStubProps) {
  const info = FORMAT_INFO[format] ?? {
    label: format,
    heading: `The ${format} editor is coming soon`,
    description:
      "This format is not yet supported. You can write in novel format for now.",
    icon: (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="24" cy="24" r="18" />
        <path d="M24 16v10M24 30v2" />
      </svg>
    ),
    gradient: "from-amber/20 via-amber/5 to-transparent",
    glowColor: "bg-amber/15",
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-void">
      <div className="relative flex flex-col items-center text-center max-w-lg px-6">
        {/* Ambient glow */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full ${info.glowColor} blur-3xl pointer-events-none`}
        />

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative z-10 w-28 h-28 rounded-3xl bg-gradient-to-br ${info.gradient} border border-border flex items-center justify-center mb-8`}
        >
          <div className="text-text-secondary">{info.icon}</div>
        </motion.div>

        {/* Story title */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 text-[11px] uppercase tracking-[0.12em] text-text-ghost mb-3"
        >
          {storyTitle}
        </motion.p>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 font-display text-2xl sm:text-3xl text-paper mb-4"
        >
          {info.heading}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 text-text-secondary text-[14px] leading-relaxed mb-8 max-w-md"
        >
          {info.description}
        </motion.p>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onUseProse}
          className="relative z-10 bg-amber text-void font-semibold px-6 py-3 rounded-full hover:bg-amber-light transition-all duration-200 text-[14px] flex items-center gap-2 hover:shadow-lg hover:shadow-amber/15"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 3h10M3 6h8M3 9h6M3 12h10" />
          </svg>
          Write in Novel Mode
        </motion.button>

        {/* Format badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 mt-6"
        >
          <span className="text-[11px] text-text-ghost">
            Your story is saved as{" "}
            <span className="text-lavender/80 font-medium">{info.label}</span>{" "}
            format. The dedicated editor will be available in a future update.
          </span>
        </motion.div>
      </div>
    </div>
  );
}
