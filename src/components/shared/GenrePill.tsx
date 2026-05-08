"use client";

const GENRE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  Fantasy: { bg: "bg-amber/12", text: "text-amber", glow: "hover:bg-amber/18" },
  "Science Fiction": { bg: "bg-lavender/12", text: "text-lavender", glow: "hover:bg-lavender/18" },
  Romance: { bg: "bg-rose/12", text: "text-rose", glow: "hover:bg-rose/18" },
  Mystery: { bg: "bg-violet/12", text: "text-violet", glow: "hover:bg-violet/18" },
  Thriller: { bg: "bg-rose/10", text: "text-rose", glow: "hover:bg-rose/16" },
  Horror: { bg: "bg-rose/14", text: "text-rose", glow: "hover:bg-rose/20" },
  "Literary Fiction": { bg: "bg-amber/10", text: "text-amber", glow: "hover:bg-amber/16" },
  "Historical Fiction": { bg: "bg-copper/12", text: "text-copper", glow: "hover:bg-copper/18" },
  Adventure: { bg: "bg-teal/12", text: "text-teal", glow: "hover:bg-teal/18" },
  "Young Adult": { bg: "bg-lavender/12", text: "text-lavender", glow: "hover:bg-lavender/18" },
  Contemporary: { bg: "bg-sage/12", text: "text-sage", glow: "hover:bg-sage/18" },
  Dystopian: { bg: "bg-rose/10", text: "text-rose", glow: "hover:bg-rose/16" },
  "Urban Fantasy": { bg: "bg-amber/10", text: "text-amber", glow: "hover:bg-amber/16" },
  "Dark Fantasy": { bg: "bg-rose/12", text: "text-rose", glow: "hover:bg-rose/18" },
  Paranormal: { bg: "bg-violet/12", text: "text-violet", glow: "hover:bg-violet/18" },
  Crime: { bg: "bg-rose/10", text: "text-rose", glow: "hover:bg-rose/16" },
  Humor: { bg: "bg-sage/12", text: "text-sage", glow: "hover:bg-sage/18" },
  Drama: { bg: "bg-copper/12", text: "text-copper", glow: "hover:bg-copper/18" },
  "Slice of Life": { bg: "bg-sage/10", text: "text-sage", glow: "hover:bg-sage/16" },
  Action: { bg: "bg-burnt/12", text: "text-burnt", glow: "hover:bg-burnt/18" },
  "Magical Realism": { bg: "bg-amber/10", text: "text-amber", glow: "hover:bg-amber/16" },
  Mythology: { bg: "bg-amber/12", text: "text-amber", glow: "hover:bg-amber/18" },
  Steampunk: { bg: "bg-copper/12", text: "text-copper", glow: "hover:bg-copper/18" },
  Cyberpunk: { bg: "bg-lavender/12", text: "text-lavender", glow: "hover:bg-lavender/18" },
  Wuxia: { bg: "bg-amber/10", text: "text-amber", glow: "hover:bg-amber/16" },
  Isekai: { bg: "bg-lavender/10", text: "text-lavender", glow: "hover:bg-lavender/16" },
  LitRPG: { bg: "bg-teal/12", text: "text-teal", glow: "hover:bg-teal/18" },
  Poetry: { bg: "bg-sage/12", text: "text-sage", glow: "hover:bg-sage/18" },
  Memoir: { bg: "bg-copper/10", text: "text-copper", glow: "hover:bg-copper/16" },
  Fanfiction: { bg: "bg-violet/12", text: "text-violet", glow: "hover:bg-violet/18" },
};

const DEFAULT_COLOR = { bg: "bg-amber/10", text: "text-amber", glow: "hover:bg-amber/16" };

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
      ? "px-3 py-1.5 text-[11px]"
      : "px-3.5 py-2 text-[12px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full font-medium transition-all duration-200 ${sizeClasses} ${
        selected
          ? "bg-amber text-void shadow-sm shadow-amber/20"
          : `${colors.bg} ${colors.text} ${colors.glow}`
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {genre}
    </button>
  );
}
