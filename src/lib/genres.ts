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

export const CONTENT_RATINGS = [
  { value: "G", label: "General", description: "Suitable for all audiences" },
  { value: "PG", label: "Guidance", description: "Mild themes, no explicit content" },
  { value: "PG13", label: "Teen", description: "Some mature themes, mild language" },
  { value: "R", label: "Mature", description: "Adult themes, violence, or strong language" },
  { value: "MA", label: "Explicit", description: "Explicit content, adults only" },
] as const;

export const STORY_STATUSES = [
  { value: "draft", label: "Draft", color: "text-text-ghost" },
  { value: "in-progress", label: "In Progress", color: "text-amber" },
  { value: "on-hiatus", label: "On Hiatus", color: "text-lavender" },
  { value: "complete", label: "Complete", color: "text-sage" },
] as const;

export type ContentRating = typeof CONTENT_RATINGS[number]["value"];
export type StoryStatus = typeof STORY_STATUSES[number]["value"];
