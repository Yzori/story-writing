export const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Literary Fiction",
  "Historical Fiction",
  "Adventure",
  "Young Adult",
  "Contemporary",
  "Dystopian",
  "Urban Fantasy",
  "Dark Fantasy",
  "Paranormal",
  "Crime",
  "Humor",
  "Drama",
  "Slice of Life",
  "Action",
  "Magical Realism",
  "Mythology",
  "Steampunk",
  "Cyberpunk",
  "Wuxia",
  "Isekai",
  "LitRPG",
  "Poetry",
  "Memoir",
  "Fanfiction",
] as const;

// Values must match the comfortRating enum readers select in /welcome/preferences
// and the RATING_LEVELS map in browse. Any drift here re-opens the safety bug
// where R/MA stories slip past the all-ages filter.
export const CONTENT_RATINGS = [
  { value: "everyone", label: "All Ages", description: "Family-friendly, no mature themes" },
  { value: "teen", label: "Teen", description: "PG-13 territory: some mature themes, mild language" },
  { value: "mature", label: "Mature", description: "Adult themes, violence, or strong language" },
  { value: "explicit", label: "Explicit", description: "18+ explicit content" },
] as const;

// Maps legacy rating codes (G/PG/PG13/R/MA) to the current scheme. Used by the
// API on write to defend against any caller still sending old values.
export const LEGACY_RATING_MAP: Record<string, string> = {
  G: "everyone",
  PG: "everyone",
  PG13: "teen",
  R: "mature",
  MA: "explicit",
};

export const STORY_STATUSES = [
  { value: "draft", label: "Draft", color: "text-text-ghost" },
  { value: "in-progress", label: "In Progress", color: "text-amber" },
  { value: "on-hiatus", label: "On Hiatus", color: "text-lavender" },
  { value: "complete", label: "Complete", color: "text-sage" },
] as const;

export type ContentRating = typeof CONTENT_RATINGS[number]["value"];
export type StoryStatus = typeof STORY_STATUSES[number]["value"];
