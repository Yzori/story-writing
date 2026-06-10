// Shared sample data for the three browse-concept mockups.
// Hardcoded so each page renders standalone without the DB — covers are
// stable Unsplash IDs, hooks/openings are written to feel like the platform.

export type Mood = "Spellbound" | "Unsettled" | "Heartbroken" | "Dazzled" | "Lost in another world";

export type MockStory = {
  id: number;
  title: string;
  author: string;
  hook: string;
  opening: string;
  genre: string;
  format: "Novel" | "Serial" | "Poetry" | "Script" | "Webtoon" | "Illustrated" | "Adventure";
  status: "Complete" | "Ongoing" | "New";
  rating: "All Ages" | "Teen+" | "Mature";
  readTime: string;
  chapters: number;
  sparks: number;
  cover: string;
  moods: Mood[];
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=900&auto=format&fit=crop`;

export const MOODS: { mood: Mood; tagline: string; accent: string; rgb: string }[] = [
  { mood: "Spellbound", tagline: "Magic, wonder, worlds with their own rules.", accent: "text-amber", rgb: "212,168,67" },
  { mood: "Unsettled", tagline: "The lights are on, but something is wrong.", accent: "text-emerald", rgb: "123,162,138" },
  { mood: "Heartbroken", tagline: "Love, loss, and the ache of being known.", accent: "text-ruby", rgb: "184,105,122" },
  { mood: "Dazzled", tagline: "Spectacle, speed, neon, and nerve.", accent: "text-teal", rgb: "107,165,165" },
  { mood: "Lost in another world", tagline: "Go somewhere you can't come back from the same.", accent: "text-amethyst", rgb: "155,142,196" },
];

export const STORIES: MockStory[] = [
  {
    id: 1,
    title: "The Obsidian Crown",
    author: "Kaelen Thorne",
    hook: "A rebel archivist inherits a crown that remembers every betrayal committed in its name.",
    opening: "The crown remembered. That was its curse and its gift — it forgot nothing, forgave less, and it had just settled, still warm, onto the head of a woman who had spent her life burning the records of kings.",
    genre: "Fantasy",
    format: "Novel",
    status: "Ongoing",
    rating: "Teen+",
    readTime: "6h 10m",
    chapters: 24,
    sparks: 312,
    cover: u("1541963463532-d68292c34b19"),
    moods: ["Spellbound", "Lost in another world"],
  },
  {
    id: 2,
    title: "Neon Grifters",
    author: "Cyborg2088",
    hook: "A blacklisted neural architect takes one last impossible job beneath the city.",
    opening: "Rain in this part of the undercity never touched the ground. It hung in the air as static, as advertising, as someone else's discarded memory — and tonight it tasted like the job going wrong.",
    genre: "Cyberpunk",
    format: "Serial",
    status: "Complete",
    rating: "Mature",
    readTime: "4h 30m",
    chapters: 18,
    sparks: 189,
    cover: u("1605806616949-1e87b487cb2a"),
    moods: ["Dazzled", "Unsettled"],
  },
  {
    id: 3,
    title: "Whispering Pines",
    author: "GM Sarah",
    hook: "A mountain town loses one person every Sunday. The forest keeps careful records.",
    opening: "By the third Sunday, the town had stopped pretending it was coincidence. They counted heads at the morning service the way other towns counted collection money — quietly, and twice.",
    genre: "Mystery",
    format: "Adventure",
    status: "New",
    rating: "Teen+",
    readTime: "1h 45m",
    chapters: 3,
    sparks: 55,
    cover: u("1511497584788-876760111969"),
    moods: ["Unsettled"],
  },
  {
    id: 4,
    title: "Salt & Ruin",
    author: "Maren Holt",
    hook: "A cursed cartographer maps coastlines that appear only to people with something to lose.",
    opening: "She drew the shore she could not see — the one that opened only for the grieving — and the ink, as always, came away from the page smelling faintly of salt and someone else's regret.",
    genre: "Fantasy",
    format: "Novel",
    status: "Complete",
    rating: "Teen+",
    readTime: "5h 25m",
    chapters: 21,
    sparks: 247,
    cover: u("1518063319782-b7d6052dc345"),
    moods: ["Spellbound", "Heartbroken", "Lost in another world"],
  },
  {
    id: 5,
    title: "The Hollow Depths",
    author: "Abysswalker",
    hook: "A deep-sea mining colony goes dark, and the rescue crew finds prayers carved into steel.",
    opening: "Three thousand metres down, the recovery team's lights found the first message, gouged into the bulkhead with something that was not a tool: PLEASE STOP LISTENING.",
    genre: "Science Fiction",
    format: "Adventure",
    status: "Ongoing",
    rating: "Mature",
    readTime: "2h 20m",
    chapters: 8,
    sparks: 134,
    cover: u("1618331835717-801e976710b2"),
    moods: ["Unsettled", "Dazzled"],
  },
  {
    id: 6,
    title: "The Moonlit Ordinary",
    author: "Anika Vale",
    hook: "A bakery, a broken telescope, and the quiet ache of choosing a life that fits.",
    opening: "The telescope had been broken for as long as the bakery had been hers, which is to say: long enough that she'd stopped meaning to fix it, and started meaning something by leaving it.",
    genre: "Slice of Life",
    format: "Novel",
    status: "Complete",
    rating: "All Ages",
    readTime: "2h 05m",
    chapters: 12,
    sparks: 421,
    cover: u("1495474472287-4d71bcdd2085"),
    moods: ["Heartbroken"],
  },
  {
    id: 7,
    title: "Glasswork Hearts",
    author: "Elise Ferrant",
    hook: "Two rival glassblowers are commissioned to build the same impossible window.",
    opening: "Heat does to glass what longing does to people: makes it briefly, dangerously willing to become something else. He had forgotten that, until she walked back into his furnace-room.",
    genre: "Romance",
    format: "Novel",
    status: "Ongoing",
    rating: "Teen+",
    readTime: "3h 40m",
    chapters: 15,
    sparks: 276,
    cover: u("1490750967868-88aa4486c946"),
    moods: ["Heartbroken", "Spellbound"],
  },
  {
    id: 8,
    title: "The Cartographer's Verse",
    author: "I. Solenne",
    hook: "A book of poems that rearranges itself to chart the reader's grief.",
    opening: "Open it once and it is a map of where you have been.\nOpen it grieving, and it is a map of where you cannot return.",
    genre: "Poetry",
    format: "Poetry",
    status: "Complete",
    rating: "All Ages",
    readTime: "40 min",
    chapters: 6,
    sparks: 98,
    cover: u("1473773508845-188df298d2d1"),
    moods: ["Heartbroken", "Spellbound"],
  },
  {
    id: 9,
    title: "Ironwood & Ash",
    author: "D. Marsh",
    hook: "After the last forest burns, a girl learns the trees left their stories in her bones.",
    opening: "The fire took ninety years of forest in a single afternoon. It left the girl untouched, which everyone agreed was a miracle, until she began to remember things only the trees had seen.",
    genre: "Dark Fantasy",
    format: "Illustrated",
    status: "Ongoing",
    rating: "Teen+",
    readTime: "1h 10m",
    chapters: 5,
    sparks: 167,
    cover: u("1518709268805-4e9042af9f23"),
    moods: ["Spellbound", "Lost in another world", "Heartbroken"],
  },
  {
    id: 10,
    title: "Last Train to Vesper",
    author: "Cole Hartley",
    hook: "A noir detective boards a train where every passenger is a suspect in his own murder.",
    opening: "The conductor punched my ticket, looked at the date of death printed beneath my name, and said the only honest thing anyone said to me all night: \"You're going to want the window seat.\"",
    genre: "Thriller",
    format: "Script",
    status: "Complete",
    rating: "Mature",
    readTime: "1h 30m",
    chapters: 9,
    sparks: 203,
    cover: u("1534447677768-be436bb09401"),
    moods: ["Unsettled", "Dazzled"],
  },
  {
    id: 11,
    title: "The Star-Eater's Daughter",
    author: "Ravenna Quill",
    hook: "To pay her father's debt, she must swallow a dying star — and the war it remembers.",
    opening: "A star does not go quietly into a girl's chest. It argues. It bargains. It shows her, in the half-second before it surrenders, every world it ever warmed and every one it watched go cold.",
    genre: "Science Fiction",
    format: "Webtoon",
    status: "Ongoing",
    rating: "Teen+",
    readTime: "55 min",
    chapters: 7,
    sparks: 389,
    cover: u("1519681393784-d120267933ba"),
    moods: ["Spellbound", "Dazzled", "Lost in another world"],
  },
  {
    id: 12,
    title: "Quiet Catastrophes",
    author: "M. Okonkwo",
    hook: "Interlocking stories of a city block on the night everyone almost left.",
    opening: "Nobody on Lindmere Street slept that night, though if you'd asked them, each would have sworn they were the only one awake — keeping their small, ordinary catastrophe company.",
    genre: "Literary Fiction",
    format: "Novel",
    status: "Complete",
    rating: "Teen+",
    readTime: "4h 00m",
    chapters: 14,
    sparks: 156,
    cover: u("1507842217343-583bb7270b66"),
    moods: ["Heartbroken", "Unsettled"],
  },
];

export const FEATURED = STORIES[3]; // Salt & Ruin — the librarian's pick

// Group stories into themed "halls" for the Reading Room descent.
export const HALLS: { name: string; subtitle: string; storyIds: number[] }[] = [
  { name: "The Fantasy Hall", subtitle: "Worlds with their own weather, their own gods.", storyIds: [1, 4, 9, 8] },
  { name: "The Mystery Wing", subtitle: "Something is wrong, and you'll want to know what.", storyIds: [3, 10, 5, 12] },
  { name: "The Bright Future", subtitle: "Neon, starlight, and the machines we become.", storyIds: [2, 11, 5] },
  { name: "Close to Home", subtitle: "Quiet rooms, real ache, ordinary magic.", storyIds: [6, 7, 12] },
];

export function byId(id: number): MockStory {
  return STORIES.find((s) => s.id === id) ?? STORIES[0];
}
