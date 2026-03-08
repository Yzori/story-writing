"use client";

const GENRE_COLORS: Record<string, { bg: string; text: string }> = {
  Fantasy: { bg: "bg-amber/10", text: "text-amber" },
  "Science Fiction": { bg: "bg-lavender/10", text: "text-lavender" },
  Romance: { bg: "bg-rose/10", text: "text-rose" },
  Mystery: { bg: "bg-lavender/10", text: "text-lavender" },
  Thriller: { bg: "bg-rose/10", text: "text-rose" },
  Horror: { bg: "bg-rose/15", text: "text-rose" },
  "Literary Fiction": { bg: "bg-amber/10", text: "text-amber" },
  "Historical Fiction": { bg: "bg-amber/10", text: "text-amber" },
  Adventure: { bg: "bg-sage/10", text: "text-sage" },
  "Young Adult": { bg: "bg-lavender/10", text: "text-lavender" },
  Contemporary: { bg: "bg-sage/10", text: "text-sage" },
  Dystopian: { bg: "bg-rose/10", text: "text-rose" },
  "Urban Fantasy": { bg: "bg-amber/10", text: "text-amber" },
  "Dark Fantasy": { bg: "bg-rose/10", text: "text-rose" },
  Paranormal: { bg: "bg-lavender/10", text: "text-lavender" },
  Crime: { bg: "bg-rose/10", text: "text-rose" },
  Humor: { bg: "bg-sage/10", text: "text-sage" },
  Drama: { bg: "bg-amber/10", text: "text-amber" },
  "Slice of Life": { bg: "bg-sage/10", text: "text-sage" },
  Action: { bg: "bg-rose/10", text: "text-rose" },
  "Magical Realism": { bg: "bg-amber/10", text: "text-amber" },
  Mythology: { bg: "bg-amber/10", text: "text-amber" },
  Steampunk: { bg: "bg-amber/10", text: "text-amber" },
  Cyberpunk: { bg: "bg-lavender/10", text: "text-lavender" },
  Wuxia: { bg: "bg-amber/10", text: "text-amber" },
  Isekai: { bg: "bg-lavender/10", text: "text-lavender" },
  LitRPG: { bg: "bg-lavender/10", text: "text-lavender" },
  Poetry: { bg: "bg-sage/10", text: "text-sage" },
  Memoir: { bg: "bg-amber/10", text: "text-amber" },
  Fanfiction: { bg: "bg-lavender/10", text: "text-lavender" },
};

const DEFAULT_COLOR = { bg: "bg-amber/10", text: "text-amber" };

interface GenrePillProps {
  genre: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export default function GenrePill({
  genre,
  selected,
  onClick,
  size = "sm",
}: GenrePillProps) {
  const colors = GENRE_COLORS[genre] || DEFAULT_COLOR;

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-1.5 text-[12px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full font-medium transition-all ${sizeClasses} ${
        selected
          ? "bg-amber text-void"
          : `${colors.bg} ${colors.text} hover:opacity-80`
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {genre}
    </button>
  );
}
