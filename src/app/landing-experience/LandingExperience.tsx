"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QuillRingMark, QuiloriaWordmark } from "@/components/shared/BrandLogo";
import { WriterIsle, ReaderIsle, CreatureOverlay } from "@/components/landing/IsoIsland";
import { hash, arand, paletteFor } from "@/components/dashboard/studio-kit";
import { bumpTaste } from "@/lib/anon-reader";
import CrossingVeil from "@/components/shared/CrossingVeil";
import { consumeCrossing, type CrossingBloom } from "@/lib/crossing";

// ─────────────────────────────────────────────────────────────────────────────
// The Landing Experience — demo of the three-stage portal arrival:
//   1. Doors    — Writer | Reader, lean on hover, click to cross
//   2. Crossing — dolly into the chosen door, a breath of light
//   3. World    — a floating island, parallax layers, hotspots that preview
//                 real sections; the headline + one CTA
//   4. The Page — the journey ends in ink: writer gets a blank first page
//                 (saved to the same draft key /demo/try reads), reader gets
//                 an open story mid-scene
// One ink mote travels the whole journey: seam → threshold → lantern → cursor.
// Demo affordances ("the other door", "begin again") exist for evaluation and
// would not all survive in production. Palette from docs/VIDEO_BRIEF.md.
// ─────────────────────────────────────────────────────────────────────────────

const GOLD = "200,150,60";
const GOLDL = "224,178,96";
const AMETH = "126,94,158";
const AMETHL = "168,140,200";
const TEAL = "59,110,122";
const PARCH = "242,232,208";
const P = (a: number) => `rgba(${PARCH},${a})`;

// same key the register page imports on signup (declared in /demo/try)
const DEMO_DRAFT_KEY = "quiloria-demo-draft-v1";
// the visitor's last-opened tale — the center door becomes "continue reading"
const LAST_TALE_KEY = "quiloria-landing-last-tale-v1";

export type World = "writer" | "reader";
type Stage = "doors" | "crossing" | "world" | "shore" | "tables" | "gallery" | "library" | "page";

interface Hotspot {
  x: number; // % within the island frame
  y: number;
  eyebrow: string;
  title: string;
  sub: string;
  door?: "library"; // some hotspots are doors, not just plaques
}

const WORLDS: Record<
  World,
  {
    word: string;
    desc: string;
    ink: string;
    light: string;
    headline: string;
    sub: string;
    cta: string;
    hotspots: Hotspot[];
  }
> = {
  writer: {
    word: "Writer",
    desc: "Create worlds, characters and adventures.",
    ink: GOLD,
    light: GOLDL,
    headline: "Every world begins with a single page.",
    sub: "A studio for novels, poetry, scripts and webtoons — written alone or around a table.",
    cta: "Begin writing",
    hotspots: [
      {
        x: 33,
        y: 56,
        eyebrow: "The Writing Hall",
        title: "Your desk, your drafts",
        sub: "Novels, poems, scripts and webtoons — every project keeps its place by the fire.",
      },
      {
        x: 57,
        y: 24,
        eyebrow: "The Guild Tower",
        title: "Write with others",
        sub: "Invite co-authors, trade suggestions, keep a shared lore book.",
      },
      {
        x: 73,
        y: 47,
        eyebrow: "The Adventure Board",
        title: "Live story tables",
        sub: "GM-led sessions where a party writes one tale together, turn by turn.",
      },
    ],
  },
  reader: {
    word: "Reader",
    desc: "Discover worlds, stories and creators.",
    ink: AMETH,
    light: AMETHL,
    headline: "Peek into worlds where stories come alive.",
    sub: "Living libraries of serialized worlds — follow them as they grow, chapter by chapter.",
    cta: "Step inside",
    hotspots: [
      {
        x: 48,
        y: 32,
        eyebrow: "The Great Library",
        title: "Wander the stacks",
        sub: "Browse living stories by genre, mood and length — new shelves every night.",
        door: "library",
      },
      {
        x: 25,
        y: 50,
        eyebrow: "The Lantern Walk",
        title: "What's rising tonight",
        sub: "The stories the whole world is reading right now.",
      },
    ],
  },
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── the archipelago — genre story-worlds orbiting the reader's island ────────
// Each satellite is its own painted asset at its own depth: back ones are
// dimmed, blurred and slow (far), front ones are bright and fast (near).
// Hovering a world blooms it and names its genre.

export interface ShoreStory {
  title: string;
  author: string;
  hook: string;
  synopsis: string;
  chapters: number;
  status: "ongoing" | "complete";
  sparks: number;
  mins: number;
  paras: string[];
  /** present when this is a real platform story — the excerpt links into it */
  slug?: string;
  firstChapterId?: string;
}

/** real tales per genre world, fetched server-side; fixtures fill the gaps */
export type ShoreTalesByWorld = Partial<Record<string, ShoreStory[]>>;

// The journey is the taste quiz: sailing to a world articulates a genre
// preference, so each visit quietly weights it (lib/anon-reader.ts).
// Registering prefills /welcome/preferences from these weights.
const WORLD_TASTE: Record<string, string[]> = {
  romance: ["Romance"],
  scifi: ["Science Fiction"],
  pirate: ["Adventure"],
  horror: ["Horror"],
};

interface Satellite {
  key: string;
  left: string;
  top: string;
  size: string;
  depth: "back" | "front";
  par: number; // parallax multiplier
  bob: number; // float duration
  glow: string;
  light: string; // text/accent variant of glow
  eyebrow: string;
  title: string;
  sub: string;
  stories: ShoreStory[];
}

const READER_SATELLITES: Satellite[] = [
  {
    key: "romance",
    left: "27%",
    top: "34%",
    size: "16vh",
    depth: "back",
    par: -9,
    bob: 13,
    glow: GOLD,
    light: GOLDL,
    eyebrow: "Romance",
    title: "The Lantern Bridge",
    sub: "Two windows across the water, one bridge between them.",
    stories: [
      {
        title: "The Bridge of Small Hours",
        author: "Iva Solen",
        hook: "Two insomniacs own the same bridge — she the hour before midnight, he the hour after.",
        synopsis: "She cannot sleep before midnight. He cannot sleep after. When the town's clocktower breaks, two strangers must finally share the bridge each thought was theirs alone.",
        chapters: 12,
        status: "ongoing",
        sparks: 534,
        mins: 8,
        paras: [
          "The arrangement was never spoken. She walked the bridge at eleven, he at one, and the bridge kept their hours separate like a careful host.",
          "Then the clocktower broke, and for one long week nobody in town knew what time it was — least of all the two people standing on the bridge at once, pretending to study the water.",
        ],
      },
      {
        title: "Letters to the Lamplighter",
        author: "Edmund Vail",
        hook: "Someone leaves notes inside the lamp on Hollis Street. Someone else lights it anyway.",
        synopsis: "Eleven years of perfect lamplighting, undone by one anonymous note. A correspondence begins — one letter per night, folded into a brass door, signed by no one.",
        chapters: 18,
        status: "complete",
        sparks: 803,
        mins: 7,
        paras: [
          "The first note said only: 'You missed Tuesday.' The lamplighter had not missed Tuesday in eleven years, and said so, on paper, folded into the lamp's little brass door.",
          "By spring the lamp held more letters than oil, and the lamplighter had started arriving early — not to light it, but to be seen lighting it.",
        ],
      },
      {
        title: "Two Umbrellas",
        author: "Nadia Ferro",
        hook: "Rival flower stalls, one covered market, and a roof that leaks in exactly one place.",
        synopsis: "Rose-seller, lily-seller, one leaking roof between them. A small war of flowers turns into something neither stall-keeper has a bouquet for.",
        chapters: 7,
        status: "ongoing",
        sparks: 312,
        mins: 6,
        paras: [
          "Her stall sold roses to people in love. His sold lilies to people in mourning. The market put them side by side, which both agreed was somebody's idea of a joke.",
          "The roof leaked between them, steady as a metronome. Neither would move. So the puddle grew, and the arguments grew — until one rainy Thursday they both reached to hold an umbrella over the other's flowers at the same moment.",
        ],
      },
    ],
  },
  {
    key: "scifi",
    left: "73%",
    top: "29%",
    size: "14vh",
    depth: "back",
    par: -7,
    bob: 15,
    glow: "127,180,240",
    light: "168,205,245",
    eyebrow: "Science fiction",
    title: "The Star Harbor",
    sub: "Cities that hum, ships that dream — tomorrow's worlds.",
    stories: [
      {
        title: "Harbor Lights",
        author: "Ren Okafor",
        hook: "Starships are too big to dock themselves. That's what tug pilots are for.",
        synopsis: "Tug pilot Asha Ngo has docked a thousand starships. The liner Meridian is the first to ask her for help — in a voice that is not on the crew manifest.",
        chapters: 16,
        status: "ongoing",
        sparks: 941,
        mins: 9,
        paras: [
          "From the tug's window the liner looked less like a ship than a city that had decided to travel. Asha matched its drift, fired the line, and felt ten thousand sleeping passengers settle into her hands.",
          "Then the liner's lights went out — all of them, at once — and a voice that wasn't on any crew list whispered through the line: 'Pull.'",
        ],
      },
      {
        title: "The Memory Dock",
        author: "Sol Imura",
        hook: "Ships dream between voyages. Someone has to repair the dreams.",
        synopsis: "Ships dream between voyages, and Junner repairs the dreams. But the freighter Calliope dreams of a harbor that does not exist. Yet.",
        chapters: 11,
        status: "ongoing",
        sparks: 478,
        mins: 8,
        paras: [
          "Old ships dream of old routes. Junner's job at the dock was to walk through those dreams with a toolbag and patch the places where remembered stars had worn thin.",
          "The freighter Calliope dreamed of a harbor Junner had never seen on any chart — and in the dream, the harbor dreamed back.",
        ],
      },
      {
        title: "Low Orbit Lullaby",
        author: "Petra Lin",
        hook: "Night-shift comms hears everything between stations. Mostly static. Mostly.",
        synopsis: "Four notes between the freight channels, every orbit, patient as a lesson. Comms officer Mara Voss breaks protocol and answers.",
        chapters: 8,
        status: "complete",
        sparks: 365,
        mins: 7,
        paras: [
          "The song arrived every orbit at the same mark, threading between the freight channels: four notes, patient, like someone teaching a child.",
          "Station rules said log it and move on. Mara logged it. Then she sang the fifth note back.",
        ],
      },
    ],
  },
  {
    key: "pirate",
    left: "27%",
    top: "71%",
    size: "24vh",
    depth: "front",
    par: -27,
    bob: 10,
    glow: GOLD,
    light: GOLDL,
    eyebrow: "Adventure",
    title: "The Pirate Cove",
    sub: "High seas, buried gold, and one lighthouse that lies.",
    stories: [
      {
        title: "The Wrong Lighthouse",
        author: "Corwin Ashe",
        hook: "Every light on this coast tells the truth but one.",
        synopsis: "Nine lighthouses guard the Mirren coast and Tamsin can name every keeper. The tenth light has no keeper, no tower, and no mercy — and her father owes it a debt older than she is.",
        chapters: 14,
        status: "ongoing",
        sparks: 412,
        mins: 7,
        paras: [
          "The harbormaster's daughter knew all nine lights by heart before she could read — their colors, their turning, the ships they'd saved. It was the tenth light that worried her: the one that burned only on moonless nights, on a rock where no lighthouse stood.",
          "Tonight was moonless. And her father had just rowed toward it, alone, with the strongbox he swore was empty.",
        ],
      },
      {
        title: "Saltbones",
        author: "Mara Quill",
        hook: "The map was sewn where no thief would look: inside the captain's funeral coat.",
        synopsis: "A pickpocket steals a dead captain's funeral coat and finds a treasure map sewn in the lining — drawn in her own handwriting. Following it will take a crew, a ship, and an answer.",
        chapters: 22,
        status: "ongoing",
        sparks: 689,
        mins: 9,
        paras: [
          "They buried Captain Veyle twice. Once with honors, once with shovels at midnight, after the first grave was found open and the body gone walking — or carried.",
          "Jess didn't believe in walking dead men. She believed in the coat she'd stolen off the corpse, and the chart inked along its lining in a hand she recognized, with a chill, as her own.",
        ],
      },
      {
        title: "The Gull's Bargain",
        author: "Tobias Wrenn",
        hook: "The gull trades secrets for silver. The trouble is staying worth talking to.",
        synopsis: "A dock boy with nothing to trade strikes the strangest deal in Port Halla's history — and becomes the only soul the all-knowing gull has ever owed a favor.",
        chapters: 9,
        status: "complete",
        sparks: 257,
        mins: 6,
        paras: [
          "Everyone in Port Halla knew the white gull would tell you one true thing for one shiny thing. Sailors fed it rings, buttons, teeth. It told them about storms, sweethearts, the price of rope in distant harbors.",
          "Nobody had ever asked it the question Pip asked that morning — flat broke, holding nothing but a beetle's wing: 'What do you want most?'",
        ],
      },
    ],
  },
  {
    key: "horror",
    left: "74%",
    top: "66%",
    size: "21vh",
    depth: "front",
    par: -24,
    bob: 11.5,
    glow: AMETH,
    light: AMETHL,
    eyebrow: "Horror",
    title: "The Hollow Manor",
    sub: "One window is lit. No one is home.",
    stories: [
      {
        title: "The Lit Window",
        author: "Ash Morrow",
        hook: "The manor has been empty for forty years. The window doesn't know that.",
        synopsis: "The manor has stood empty for forty years, but the third-floor window glows warm every night. The new estate agent intends to find out who pays that bill.",
        chapters: 13,
        status: "ongoing",
        sparks: 622,
        mins: 8,
        paras: [
          "The estate agent had one rule: show the house by day. The buyers had one question: who pays for the electricity? The agent didn't answer, because the manor had none.",
          "From the gate, the third-floor window glowed butter-warm and steady — the way a room looks when someone inside is reading, and has been, for a very long time.",
        ],
      },
      {
        title: "Inventory",
        author: "Hela Crane",
        hook: "Count the crows on the fence. Now count again.",
        synopsis: "Eleven crows on the east fence, every evening, for three generations. The caretaker's ledger has never once been wrong. Tonight it is.",
        chapters: 6,
        status: "ongoing",
        sparks: 289,
        mins: 6,
        paras: [
          "The caretaker's ledger had a column for everything: tools, keys, hinges, crows. Eleven crows, the ledger said, in her grandmother's hand. Eleven crows, every evening, on the east fence.",
          "Tonight there were twelve. And the twelfth was watching her count.",
        ],
      },
      {
        title: "The Patient Garden",
        author: "I. Thorn",
        hook: "The garden blooms for liars. The new gardener never lies.",
        synopsis: "A garden that blooms only for liars, tended by a gardener who cannot lie. Learning how will cost her more than the roses.",
        chapters: 10,
        status: "complete",
        sparks: 451,
        mins: 7,
        paras: [
          "Nothing in the garden grew for honest visitors. The roses ignored confessions; the ivy slept through apologies. But let a man say 'I'm fine' through his teeth, and the beds would riot into color before he reached the gate.",
          "The new gardener was the most truthful soul in the county. The garden hated her. So she began, carefully, to practice lying.",
        ],
      },
    ],
  },
];

// ── the long table — live story tables, watched from the gallery or joined ──

const EMBER = "214,108,56";
const EMBERL = "240,156,96";

interface StoryTable {
  key: string;
  status: "live" | "open" | "forming";
  title: string;
  world: string;
  gm: string;
  line: string; // what is happening at the table right now
  meta: string; // watchers / seats / hopefuls
  party: string[];
  glow: string;
  light: string;
}

const TABLES: StoryTable[] = [
  {
    key: "gate",
    status: "live",
    title: "The Broken Gate",
    world: "The Hollow Manor",
    gm: "Mira Voss",
    line: "The gate is open. It was not open a moment ago.",
    meta: "12 in the gallery",
    party: ["Calder", "Ottoline", "Brask"],
    glow: AMETH,
    light: AMETHL,
  },
  {
    key: "caravan",
    status: "open",
    title: "The Salt Road Caravan",
    world: "The Pirate Cove",
    gm: "Corwin Ashe",
    line: "The caravan crosses the Mirren flats at dusk. It still needs a scout, and a liar.",
    meta: "2 seats open · plays at dusk",
    party: ["Wren", "Juno", "Tally"],
    glow: GOLD,
    light: GOLDL,
  },
  {
    key: "deep",
    status: "forming",
    title: "Lanterns in the Deep",
    world: "The Star Harbor",
    gm: "Sol Imura",
    line: "Five hopefuls have raised a hand. The GM reads pitches tonight.",
    meta: "gathering a party",
    party: [],
    glow: "127,180,240",
    light: "168,205,245",
  },
];

// a scripted minute of the live table — what the gallery sees
interface TableTurn {
  kind: "gm" | "action" | "dialogue" | "roll";
  who: string;
  text: string;
  roll?: { formula: string; total: number; verdict: string };
}

const GALLERY_TURNS: TableTurn[] = [
  {
    kind: "gm",
    who: "Mira Voss",
    text: "The manor gate stands open. Rust has eaten the hinges to lace — yet it swung without a sound. Beyond, the gravel drive runs black under the lit window's glow.",
  },
  {
    kind: "action",
    who: "Calder",
    text: "Calder crouches at the gatepost and drags two fingers through the gravel — wheel ruts, boot prints, anything that came through before us.",
  },
  { kind: "gm", who: "Mira Voss", text: "No prints. But the gravel is warm. Roll me caution, Calder." },
  { kind: "roll", who: "Calder", text: "", roll: { formula: "2d6 + wits", total: 7, verdict: "a costly success" } },
  {
    kind: "gm",
    who: "Mira Voss",
    text: "You learn this much: the warmth runs in a line, gate to door, as if something passed through carrying its own summer. You also learn the gate has closed behind you.",
  },
  { kind: "dialogue", who: "Ottoline", text: "“Lovely. Brask — you said the manor was empty?”" },
  { kind: "dialogue", who: "Brask", text: "“Empty's what the deed says. Deeds don't go upstairs and read all night.”" },
  {
    kind: "gm",
    who: "Mira Voss",
    text: "Above you, the third-floor light dims once — the way a lamp does when someone walks past it. Who moves first?",
  },
];

// ── the village below — creators living at the foot of the tree ─────────────

interface Villager {
  name: string;
  tending: string; // the story they keep
  tonight: string; // what's happening on their desk
  followers: string;
  note: string; // their latest author's note
  x: number; // % within the island frame
  y: number;
}

const VILLAGERS: Villager[] = [
  {
    name: "Elowen Vance",
    tending: "The Salt Garden",
    tonight: "chapter 14 arrives tonight",
    followers: "1,204 follow her lantern",
    note: "“The tide tables in chapter 12 are real. I checked them twice.”",
    x: 38,
    y: 72,
  },
  {
    name: "Ash Morrow",
    tending: "The Lit Window",
    tonight: "answering readers in the margins",
    followers: "847 follow their lantern",
    note: "“Yes, the electricity bill is the scariest part. That was deliberate.”",
    x: 53,
    y: 79,
  },
  {
    name: "Iva Solen",
    tending: "The Bridge of Small Hours",
    tonight: "a new tale begins this week",
    followers: "612 follow her lantern",
    note: "“I write the eleven o'clock scenes at eleven o'clock. It matters.”",
    x: 64,
    y: 70,
  },
];

// ── the pulse — tonight's events, carried up from the tree by lanterns ──────

interface PulseEvent {
  text: string;
  when: string;
  ink: string;
}

const PULSE_EVENTS: PulseEvent[] = [
  { text: "a new chapter of The Lit Window", when: "4 min ago", ink: AMETHL },
  { text: "a table began in The Star Harbor", when: "just now", ink: "168,205,245" },
  { text: "Iva Solen lit a new tale", when: "12 min ago", ink: GOLDL },
  { text: "Saltbones reached 700 sparks", when: "tonight", ink: GOLDL },
  { text: "Elowen Vance left a note in the margins", when: "26 min ago", ink: AMETHL },
  { text: "three readers reached the twelfth crow", when: "1 hr ago", ink: "168,205,245" },
];

// ── the library — shelves drawn from every shore's tales ────────────────────

const SHELVES: { title: string; note: string; picks: [string, number][] }[] = [
  { title: "Rising tonight", note: "what the lanterns gather around", picks: [["horror", 0], ["scifi", 0], ["romance", 1], ["pirate", 1]] },
  { title: "Fresh chapters", note: "serials that grew while you slept", picks: [["romance", 0], ["pirate", 0], ["scifi", 1], ["horror", 1]] },
  { title: "Worth the lamp-oil", note: "longer reads for a deep night", picks: [["pirate", 2], ["romance", 2], ["scifi", 2], ["horror", 2]] },
];

// ── energy sparks — stories flow from the open book out to the worlds ───────
// Routes live in a 100×62 viewBox stretched over the stage (matching the
// satellites' % coordinates). The book is the wellspring at (50, 47).

const SPARK_ROUTES = [
  { key: "romance", d: "M 50 47 Q 38 39 27 21.1", dur: 2.8, delay: 2.0, rest: 6.5, ink: GOLDL }, // → romance
  { key: "scifi", d: "M 50 47 Q 63 35 73 18", dur: 3.0, delay: 4.8, rest: 8.2, ink: "127,180,240" }, // → star harbor
  { key: "pirate", d: "M 50 47 Q 38 50 27 44", dur: 2.4, delay: 0.6, rest: 5.4, ink: GOLDL }, // → pirate cove
  { key: "horror", d: "M 50 47 Q 63 50 74 40.9", dur: 2.6, delay: 6.4, rest: 7.6, ink: AMETHL }, // → hollow manor
  { key: "table", d: "M 50 47 Q 32 46 12 32.2", dur: 2.7, delay: 8.6, rest: 7.0, ink: EMBERL }, // → the long table
];

// a tiny four-point star, drawn around its own origin so it centers on the route
const STAR_D =
  "M 0 -0.34 Q 0.06 -0.06 0.34 0 Q 0.06 0.06 0 0.34 Q -0.06 0.06 -0.34 0 Q -0.06 -0.06 0 -0.34 Z";

function EnergySparks({ still, hot, chart }: { still: boolean; hot?: string | null; chart?: boolean }) {
  if (still) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      <svg viewBox="0 0 100 62" preserveAspectRatio="none" className="h-full w-full">
        {SPARK_ROUTES.map((r, i) => {
          const travel = {
            duration: r.dur,
            repeat: Infinity,
            repeatDelay: r.rest,
            ease: "easeInOut" as const,
            times: [0, 0.12, 0.88, 1],
          };
          const offset = { offsetPath: `path("${r.d}")` } as React.CSSProperties;
          return (
            <g key={i}>
              {/* the ley-line of story — always faintly lit, drifting toward its world */}
              <motion.path
                d={r.d}
                fill="none"
                stroke={`rgba(${r.ink},0.16)`}
                strokeWidth="0.09"
                strokeDasharray="0.55 1.25"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -18 }}
                transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
              />
              {/* the thread wakes when its world is regarded */}
              <motion.path
                d={r.d}
                fill="none"
                stroke={`rgba(${r.ink},0.5)`}
                strokeWidth="0.14"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 0.6px rgb(${r.ink}))` } as React.CSSProperties}
                initial={{ opacity: 0 }}
                animate={{ opacity: hot === r.key ? 1 : chart ? 0.5 : 0 }}
                transition={{ duration: 0.4 }}
              />
              {/* soft halo breathing around the star */}
              <motion.circle
                r="0.4"
                fill={`rgba(${r.ink},0.14)`}
                style={offset}
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 0.8, 0.8, 0] }}
                transition={{ ...travel, delay: r.delay }}
              />
              {/* the star itself — tiny, bright, twinkling as it flies */}
              <motion.path
                d={STAR_D}
                fill={`rgb(${r.ink})`}
                style={{ ...offset, filter: `drop-shadow(0 0 0.6px rgb(${r.ink}))` } as React.CSSProperties}
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0], scale: [0.7, 1.25, 0.85, 0.5] }}
                transition={{ ...travel, delay: r.delay }}
              />
              {/* stardust trail — three motes lagging behind, fading as they fall back */}
              {[0, 1, 2].map((j) => (
                <motion.circle
                  key={j}
                  r={0.13 - j * 0.035}
                  fill={`rgba(${r.ink},${0.55 - j * 0.16})`}
                  style={offset}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 0.7 - j * 0.18, 0.7 - j * 0.18, 0] }}
                  transition={{ ...travel, delay: r.delay + 0.14 + j * 0.15 }}
                />
              ))}
            </g>
          );
        })}
        {/* the wellspring — a faint heartbeat of light where the book lies open */}
        <motion.circle
          cx="50"
          cy="47"
          r={0.35}
          fill={`rgba(${GOLDL},0.35)`}
          animate={{ r: [0.35, 0.8, 0.35], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <g transform="translate(50,47)">
          <motion.path
            d={STAR_D}
            fill={`rgba(${GOLDL},0.9)`}
            animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.1, 0.5] }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
          />
        </g>
      </svg>
    </div>
  );
}

function SatelliteIsland({
  s,
  par,
  still,
  delay,
  onEnter,
  onHot,
  chart,
}: {
  s: Satellite;
  par: { x: number; y: number };
  still: boolean;
  delay: number;
  onEnter: () => void;
  onHot?: (key: string | null) => void;
  chart?: boolean;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  const cardBelow = parseFloat(s.top) < 45;
  const lp = parseFloat(s.left);
  const tp = parseFloat(s.top);
  return (
    <motion.div
      className="absolute hidden -translate-x-1/2 -translate-y-1/2 md:block"
      style={{ left: s.left, top: s.top, width: s.size }}
      animate={{ x: par.x * s.par, y: par.y * s.par * 0.55 }}
      transition={{ type: "spring", stiffness: 50, damping: 20 }}
    >
      {/* a spark leaves the book and carries this world to its place */}
      {!still && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -ml-1 -mt-1 h-2 w-2 rounded-full"
          style={{ backgroundColor: `rgb(${s.light})`, boxShadow: `0 0 16px 5px rgba(${s.glow},0.6)` }}
          initial={{ x: `${50 - lp}vw`, y: `${73 - tp}vh`, opacity: 0 }}
          animate={{ x: "0vw", y: "0vh", opacity: [0, 1, 1, 0] }}
          transition={{ delay: Math.max(0, delay - 0.55), duration: 0.6, ease: [0.3, 0, 0.4, 1], times: [0, 0.15, 0.8, 1] }}
        />
      )}
      {/* the birth ring — light blooms where the spark lands */}
      {!still && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "72%",
            height: "72%",
            marginLeft: "-36%",
            marginTop: "-36%",
            border: `1.5px solid rgba(${s.light},0.8)`,
            boxShadow: `0 0 34px rgba(${s.glow},0.55), inset 0 0 24px rgba(${s.glow},0.35)`,
          }}
          initial={{ scale: 0.15, opacity: 0 }}
          animate={{ scale: 2.1, opacity: [0, 0.9, 0] }}
          transition={{ delay: delay + 0.02, duration: 0.85, ease: "easeOut" }}
        />
      )}
      <motion.div
        initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.12, rotate: lp < 50 ? -11 : 11 }}
        animate={still ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={
          still
            ? { duration: 0 }
            : { delay, opacity: { delay, duration: 0.25 }, type: "spring", stiffness: 140, damping: 13, mass: 0.9 }
        }
      >
        <motion.div
          animate={still ? {} : { y: [0, s.depth === "back" ? -5 : -8, 0] }}
          transition={{ duration: s.bob, repeat: Infinity, ease: "easeInOut", delay }}
          className="group/sat relative"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, rgba(${s.glow},${s.depth === "back" ? 0.07 : 0.1}), transparent 62%)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-500 group-hover/sat:opacity-100"
            style={{ background: `radial-gradient(circle, rgba(${s.glow},0.22), transparent 65%)` }}
          />
          <button
            type="button"
            onClick={onEnter}
            onMouseEnter={() => onHot?.(s.key)}
            onMouseLeave={() => onHot?.(null)}
            aria-label={`Enter ${s.eyebrow}: ${s.title}`}
            className="pointer-events-auto block w-full cursor-pointer outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/landing/world-${s.key}.png`}
              alt=""
              draggable={false}
              onError={() => setOk(false)}
              className={`h-auto w-full select-none transition-all duration-500 ${
                s.depth === "back"
                  ? "blur-[1.5px] brightness-[0.85] saturate-[0.82] group-hover/sat:blur-none group-hover/sat:brightness-105 group-hover/sat:saturate-100"
                  : "brightness-[0.95] saturate-[0.9] group-hover/sat:brightness-110 group-hover/sat:saturate-100"
              } group-hover/sat:scale-[1.05]`}
            />
          </button>
          <div
            className={`pointer-events-none absolute left-1/2 z-30 w-max max-w-[230px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 text-left opacity-0 backdrop-blur-md transition-all duration-200 group-hover/sat:translate-y-0 group-hover/sat:opacity-100 ${
              cardBelow ? "top-full mt-1" : "bottom-full mb-1"
            }`}
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgba(${s.glow === GOLD ? GOLDL : s.glow},1)` }}>
              {s.eyebrow}
            </span>
            <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">{s.title}</h3>
            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: P(0.6) }}>
              {s.sub}
            </p>
            <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `rgb(${s.light})` }}>
              three tales on this shore tonight →
            </span>
          </div>
          {/* the star chart names this world */}
          <AnimatePresence>
            {chart && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap text-center"
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.24em]" style={{ color: `rgba(${s.light},0.95)`, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                  {s.eyebrow}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── stage 3.5: the shore — three tales wait inside the chosen world ──────────

function ShoreStage({ s, still, onPick, onBack }: { s: Satellite; still: boolean; onPick: (st: ShoreStory) => void; onBack: () => void }) {
  const [plate, setPlate] = useState<ShoreStory | null>(null);
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: still ? 1 : 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: still ? 1 : 0.97 }}
      transition={{ duration: still ? 0.2 : 0.7, ease: "easeOut" }}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #120d20 0%, #1f1535 45%, #2c1f4a 100%)" }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(85% 70% at 50% 32%, rgba(${s.glow},0.18), transparent 70%)` }} />
      <Stars seed={`shore-${s.key}`} count={40} still={still} />
      <Motes ink={s.glow} seed={`shore-${s.key}`} count={8} still={still} />

      {/* the world, arrived at */}
      <div className="absolute left-1/2 top-[30%] w-[min(44vh,78vw)] -translate-x-1/2 -translate-y-1/2">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, rgba(${s.glow},0.14), transparent 62%)` }}
        />
        <motion.div animate={still ? {} : { y: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/landing/world-${s.key}.png`} alt="" draggable={false} className="h-auto w-full select-none" />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[6.5%] z-20 flex flex-col items-center gap-2 px-6 text-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${s.light},0.9)` }}>
          {s.eyebrow}
        </span>
        <h1 className="font-display text-2xl font-light md:text-4xl" style={{ color: P(0.96), textShadow: `0 0 50px rgba(${s.glow},0.4)` }}>
          {s.title}
        </h1>
        <p className="text-[12px]" style={{ color: P(0.5) }}>
          Three tales are told on this shore tonight. Choose one.
        </p>
      </div>

      {/* the three lanterns */}
      <div className="absolute inset-x-0 bottom-[7%] z-20 flex flex-wrap items-end justify-center gap-5 px-6">
        {s.stories.map((st, i) => {
          const pal = paletteFor(st.title);
          return (
            <motion.button
              key={st.title}
              type="button"
              onClick={() => setPlate(st)}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: [0, -14, -5][i] }}
              transition={{ delay: still ? 0 : 0.35 + i * 0.16, duration: 0.6, ease: "easeOut" }}
              className="group/tale w-[280px] cursor-pointer rounded-2xl border border-white/10 bg-black/45 p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-white/25 hover:bg-black/60"
            >
              <div className="flex gap-4">
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md border border-white/15" style={{ background: `linear-gradient(160deg, ${pal[0]}, ${pal[1]})` }}>
                  <span className="font-display text-xl" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {st.title[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[16px] leading-tight text-paper">{st.title}</h3>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.4) }}>
                    by {st.author} · {st.mins} min
                  </p>
                  <p className="mt-2 text-[11px] leading-snug" style={{ color: P(0.62) }}>
                    {st.hook}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-right font-mono text-[9px] uppercase tracking-[0.2em] opacity-0 transition-opacity duration-300 group-hover/tale:opacity-100" style={{ color: `rgb(${s.light})` }}>
                about this tale →
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* the story plate — pick the book up, read the back */}
      <AnimatePresence>
        {plate && <StoryPlate st={plate} glow={s.glow} light={s.light} eyebrow={s.eyebrow} onClose={() => setPlate(null)} onPick={onPick} />}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-7 z-20 cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
        style={{ color: P(0.35) }}
      >
        ⟵ the archipelago
      </button>
      <Link
        href="/browse"
        className="absolute bottom-7 right-7 z-20 font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
        style={{ color: P(0.3) }}
      >
        or wander the stacks →
      </Link>
    </motion.div>
  );
}

// ── the story plate — pick the book up, read the back ───────────────────────
// Shared between the shore (genre isles) and the great library.

function StoryPlate({
  st,
  glow,
  light,
  eyebrow,
  fixed,
  onClose,
  onPick,
}: {
  st: ShoreStory;
  glow: string;
  light: string;
  eyebrow: string;
  fixed?: boolean;
  onClose: () => void;
  onPick: (st: ShoreStory) => void;
}) {
  return (
    <motion.div
      key="plate"
      className={`${fixed ? "fixed" : "absolute"} inset-0 z-30 flex items-center justify-center px-6`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border bg-[#16112a]/95 p-6 backdrop-blur-md"
        style={{ borderColor: `rgba(${light},0.35)`, boxShadow: `0 0 60px rgba(${glow},0.3)` }}
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Put the book back"
          className="absolute right-4 top-4 cursor-pointer font-mono text-[12px] transition-colors hover:text-paper"
          style={{ color: P(0.4) }}
        >
          ✕
        </button>
        <div className="flex gap-5">
          <div
            className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg border border-white/15"
            style={{ background: `linear-gradient(160deg, ${paletteFor(st.title)[0]}, ${paletteFor(st.title)[1]})` }}
          >
            <span className="font-display text-3xl" style={{ color: "rgba(255,255,255,0.85)" }}>
              {st.title[0]}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[22px] leading-tight text-paper">{st.title}</h3>
            <p className="mt-1 text-[12px]" style={{ color: P(0.5) }}>
              by {st.author}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ backgroundColor: `rgba(${glow},0.16)`, color: `rgb(${light})` }}>
                {eyebrow}
              </span>
              <span className="rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ borderColor: P(0.15), color: P(0.5) }}>
                {st.status === "ongoing" ? "ongoing" : "complete"}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed" style={{ color: P(0.72) }}>
          {st.synopsis}
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: P(0.38) }}>
          {st.chapters} chapters · {st.mins} min opener · {st.sparks.toLocaleString()} sparks
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Link href="/browse" className="font-mono text-[9px] uppercase tracking-[0.18em] transition-colors hover:text-paper" style={{ color: P(0.35) }}>
            every {eyebrow.toLowerCase()} story →
          </Link>
          <button
            type="button"
            onClick={() => onPick(st)}
            className="cursor-pointer rounded-full px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
            style={{
              backgroundColor: `rgba(${glow},0.22)`,
              color: P(0.95),
              border: `1px solid rgba(${light},0.6)`,
              boxShadow: `0 0 26px rgba(${glow},0.3)`,
            }}
          >
            read chapter one →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── the long table isle — a fire, a table, a story being played ──────────────
// Drawn, not painted: silhouettes against firelight, so it holds its own next
// to the raster isles while reading as deliberately *different* — this isle is
// an event, not a genre.

function LongTableIsle({
  par,
  still,
  delay,
  onEnter,
  onHot,
  chart,
}: {
  par: { x: number; y: number };
  still: boolean;
  delay: number;
  onEnter: () => void;
  onHot?: (key: string | null) => void;
  chart?: boolean;
}) {
  return (
    <motion.div
      className="absolute hidden -translate-x-1/2 -translate-y-1/2 md:block"
      style={{ left: "12%", top: "52%", width: "19vh" }}
      animate={{ x: par.x * -20, y: par.y * -11 }}
      transition={{ type: "spring", stiffness: 50, damping: 20 }}
    >
      {/* ember halo — warmer and wider awake */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, rgba(${EMBER},0.13), transparent 62%)` }}
      />
      <motion.div
        initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.12, rotate: -9 }}
        animate={still ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={still ? { duration: 0 } : { delay, opacity: { delay, duration: 0.25 }, type: "spring", stiffness: 140, damping: 13, mass: 0.9 }}
      >
        <motion.div animate={still ? {} : { y: [0, -7, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay }} className="group/table relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-500 group-hover/table:opacity-100"
            style={{ background: `radial-gradient(circle, rgba(${EMBER},0.24), transparent 65%)` }}
          />
          <button
            type="button"
            onClick={onEnter}
            onMouseEnter={() => onHot?.("table")}
            onMouseLeave={() => onHot?.(null)}
            aria-label="Enter The Long Table: three tables are playing tonight"
            className="pointer-events-auto block w-full cursor-pointer outline-none"
          >
            <svg viewBox="0 0 100 74" className="h-auto w-full select-none">
              <defs>
                <radialGradient id="lt-fire" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,220,160,0.85)" />
                  <stop offset="38%" stopColor="rgba(236,130,52,0.4)" />
                  <stop offset="100%" stopColor="rgba(236,130,52,0)" />
                </radialGradient>
                <linearGradient id="lt-rock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#331a2c" />
                  <stop offset="100%" stopColor="#120b18" />
                </linearGradient>
              </defs>
              {/* firelight blooming behind the table */}
              <motion.circle
                cx="50"
                cy="25"
                r="21"
                fill="url(#lt-fire)"
                animate={still ? {} : { opacity: [0.8, 1.05, 0.85, 1, 0.8] }}
                transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* the rock the table rests on */}
              <ellipse cx="50" cy="34" rx="34" ry="7.5" fill="#2c1726" />
              <path d="M 16 34 Q 28 60 50 67 Q 72 60 84 34 Q 66 41.5 50 41.5 Q 34 41.5 16 34 Z" fill="url(#lt-rock)" />
              <path d="M 16 34 Q 33 41.5 50 41.5 Q 67 41.5 84 34" fill="none" stroke={`rgba(${EMBERL},0.45)`} strokeWidth="0.8" />
              {/* firelight pooling on the plateau */}
              <ellipse cx="50" cy="31" rx="17" ry="4" fill={`rgba(${EMBERL},0.14)`} />
              {/* lantern posts at either end of the table */}
              <line x1="30" y1="15.5" x2="30" y2="25" stroke="#0d0709" strokeWidth="0.9" />
              <line x1="70" y1="15.5" x2="70" y2="25" stroke="#0d0709" strokeWidth="0.9" />
              <motion.circle cx="30" cy="14.5" r="1.4" fill={`rgb(${EMBERL})`} animate={still ? {} : { opacity: [0.7, 1, 0.8, 1] }} transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }} />
              <motion.circle cx="70" cy="14.5" r="1.4" fill={`rgb(${EMBERL})`} animate={still ? {} : { opacity: [1, 0.7, 1, 0.85] }} transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut" }} />
              {/* the long table itself */}
              <rect x="33" y="24.5" width="34" height="2.6" rx="1.2" fill="#0d0709" />
              <rect x="33.5" y="24.5" width="33" height="0.7" rx="0.35" fill={`rgba(${EMBERL},0.55)`} />
              <rect x="36.5" y="27" width="1.8" height="5.5" fill="#0d0709" />
              <rect x="61.7" y="27" width="1.8" height="5.5" fill="#0d0709" />
              {/* the flame on the table */}
              <motion.path
                d="M 50 18.5 Q 51.8 20.8 50.7 23.6 L 49.3 23.6 Q 48.2 20.8 50 18.5 Z"
                fill="#ffd9a0"
                animate={still ? {} : { opacity: [0.85, 1, 0.8, 1, 0.85] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* the party, silhouetted against the fire — rims caught by its light */}
              <g fill="#0a0510">
                <circle cx="29" cy="21.5" r="2.7" stroke={`rgba(${EMBERL},0.5)`} strokeWidth="0.4" />
                <path d="M 24.8 31 Q 29 23.8 33.2 31 Z" />
                <circle cx="41" cy="18.5" r="2.3" stroke={`rgba(${EMBERL},0.55)`} strokeWidth="0.4" />
                <path d="M 37.6 27 Q 41 21 44.4 27 Z" />
                <circle cx="59" cy="18.5" r="2.3" stroke={`rgba(${EMBERL},0.55)`} strokeWidth="0.4" />
                <path d="M 55.6 27 Q 59 21 62.4 27 Z" />
                <circle cx="71" cy="21.5" r="2.7" stroke={`rgba(${EMBERL},0.5)`} strokeWidth="0.4" />
                <path d="M 66.8 31 Q 71 23.8 75.2 31 Z" />
              </g>
              {/* sparks climbing off the fire */}
              {!still &&
                [0, 1, 2].map((i) => (
                  <motion.g key={i} initial={{ y: 0, opacity: 0 }} animate={{ y: [-0, -15 - i * 3], opacity: [0, 0.9, 0] }} transition={{ duration: 3.2 + i * 0.9, delay: i * 1.3, repeat: Infinity, ease: "easeOut" }}>
                    <circle cx={47.5 + i * 2.4} cy="21" r="0.65" fill="#ffc890" />
                  </motion.g>
                ))}
            </svg>
          </button>
          {/* who's playing tonight */}
          <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 text-left opacity-0 backdrop-blur-md transition-all duration-200 group-hover/table:translate-y-0 group-hover/table:opacity-100">
            <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgb(${EMBERL})` }}>
              <motion.span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `rgb(${EMBERL})` }} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
              The Long Table
            </span>
            <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">Three tables playing tonight</h3>
            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: P(0.6) }}>
              GM-led story tables — a party writes one tale together, live.
            </p>
            <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `rgb(${EMBERL})` }}>
              pull up a bench →
            </span>
          </div>
          {/* the star chart names this place */}
          <AnimatePresence>
            {chart && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap text-center"
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.24em]" style={{ color: `rgba(${EMBERL},0.95)`, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                  the long table · live
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── stage 3.6: the long table — three tables, one of them live ───────────────

function TablesStage({ still, onWatch, onBack }: { still: boolean; onWatch: () => void; onBack: () => void }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: still ? 1 : 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: still ? 1 : 0.97 }}
      transition={{ duration: still ? 0.2 : 0.7, ease: "easeOut" }}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #150b10 0%, #251017 45%, #371717 100%)" }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(85% 70% at 50% 28%, rgba(${EMBER},0.17), transparent 70%)` }} />
      <Stars seed="tables" count={40} still={still} />
      <Motes ink={EMBER} seed="tables" count={9} still={still} />

      <div className="pointer-events-none absolute inset-x-0 top-[7%] z-20 flex flex-col items-center gap-2 px-6 text-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${EMBERL},0.9)` }}>
          the long table
        </span>
        <h1 className="font-display text-2xl font-light md:text-4xl" style={{ color: P(0.96), textShadow: `0 0 50px rgba(${EMBER},0.4)` }}>
          Stories played live, around a fire.
        </h1>
        <p className="max-w-md text-[12px] leading-relaxed" style={{ color: P(0.5) }}>
          A GM narrates. A party writes. Pull up a bench — or watch from the gallery.
        </p>
      </div>

      <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-[38%] flex-wrap items-stretch justify-center gap-5 px-6">
        {TABLES.map((t, i) => (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: still ? 0 : 0.35 + i * 0.16, duration: 0.6, ease: "easeOut" }}
            className="flex w-[300px] flex-col rounded-2xl border p-5 text-left backdrop-blur-md"
            style={{
              borderColor: t.status === "live" ? `rgba(${t.light},0.4)` : "rgba(255,255,255,0.1)",
              backgroundColor: "rgba(10,5,8,0.5)",
              boxShadow: t.status === "live" ? `0 0 44px rgba(${t.glow},0.22)` : undefined,
            }}
          >
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `rgb(${t.light})` }}>
              {t.status === "live" && (
                <motion.span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `rgb(${t.light})`, boxShadow: `0 0 8px rgba(${t.glow},0.9)` }} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
              )}
              {t.status === "live" ? "live now" : t.status === "open" ? "seats open" : "forming"} · {t.meta}
            </div>
            <h3 className="mt-2.5 font-display text-[19px] leading-tight text-paper">{t.title}</h3>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.4) }}>
              plays in {t.world} · GM {t.gm}
            </p>
            <p className="mt-3 flex-1 text-[12px] italic leading-relaxed" style={{ color: P(0.65) }}>
              {t.line}
            </p>
            {t.party.length > 0 && (
              <p className="mt-3 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.35) }}>
                at the table: {t.party.join(", ")}
              </p>
            )}
            <div className="mt-4">
              {t.status === "live" ? (
                <button
                  type="button"
                  onClick={onWatch}
                  className="w-full cursor-pointer rounded-full px-5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{ backgroundColor: `rgba(${t.glow},0.22)`, color: P(0.95), border: `1px solid rgba(${t.light},0.6)`, boxShadow: `0 0 26px rgba(${t.glow},0.3)` }}
                >
                  watch from the gallery →
                </button>
              ) : (
                <Link
                  href="/register"
                  className="block w-full rounded-full border px-5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition-all hover:brightness-125"
                  style={{ borderColor: `rgba(${t.light},0.35)`, color: `rgb(${t.light})` }}
                >
                  {t.status === "open" ? "ask for a seat →" : "raise your hand →"}
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-7 z-20 cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
        style={{ color: P(0.35) }}
      >
        ⟵ the archipelago
      </button>
    </motion.div>
  );
}

// ── stage 3.7: the gallery — a minute of the live table, as it plays ─────────

const TABLE_INKS: Record<string, string> = {
  "Mira Voss": EMBERL,
  Calder: GOLDL,
  Ottoline: AMETHL,
  Brask: "127,180,240",
};

function GalleryStage({ still, onBack }: { still: boolean; onBack: () => void }) {
  const t = TABLES[0];
  const [shown, setShown] = useState(still ? GALLERY_TURNS.length : 1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const done = shown >= GALLERY_TURNS.length;

  useEffect(() => {
    if (shown >= GALLERY_TURNS.length) return;
    const prev = GALLERY_TURNS[shown - 1];
    const id = setTimeout(() => setShown((n) => n + 1), prev?.kind === "gm" ? 3000 : 2100);
    return () => clearTimeout(id);
  }, [shown]);

  // the gallery's eye follows the newest turn
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown]);

  return (
    <motion.div
      className="absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      style={{ background: "linear-gradient(180deg, #120910 0%, #1c0e14 100%)" }}
    >
      <div className="absolute inset-0" style={{ background: `radial-gradient(70% 50% at 50% 0%, rgba(${EMBER},0.12), transparent 70%)` }} />

      {/* the table's nameplate */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1.5 px-6 pb-6 pt-7 text-center" style={{ background: "linear-gradient(180deg, #120910 55%, transparent)" }}>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: `rgb(${EMBERL})` }}>
          <motion.span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `rgb(${EMBERL})`, boxShadow: `0 0 8px rgba(${EMBER},0.9)` }} animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          live · you are in the gallery
        </span>
        <h1 className="font-display text-xl font-light text-paper md:text-2xl">{t.title}</h1>
        <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.4) }}>
          plays in {t.world} · GM {t.gm} · {t.meta}
        </p>
      </div>

      {/* the table itself */}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-6 pb-44 pt-36">
        <div className="mx-auto max-w-xl space-y-7">
          {GALLERY_TURNS.slice(0, shown).map((turn, i) => {
            const ink = TABLE_INKS[turn.who] ?? GOLDL;
            if (turn.kind === "roll")
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-center">
                  <div className="rounded-full border px-5 py-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: `rgba(${ink},0.4)`, color: `rgb(${ink})`, backgroundColor: `rgba(${ink},0.07)` }}>
                    ⚄ {turn.who} rolls {turn.roll!.formula} — {turn.roll!.total} · {turn.roll!.verdict}
                  </div>
                </motion.div>
              );
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: `rgba(${ink},0.9)` }}>
                  {turn.who}
                  {turn.kind === "gm" ? " · gm" : ""}
                </span>
                <p className={`font-reading mt-1.5 text-[15px] leading-relaxed ${turn.kind === "gm" ? "" : "pl-4"}`} style={{ color: turn.kind === "gm" ? P(0.88) : P(0.74), borderLeft: turn.kind === "gm" ? undefined : `2px solid rgba(${ink},0.35)`, paddingLeft: turn.kind === "gm" ? undefined : "1rem" }}>
                  {turn.text}
                </p>
              </motion.div>
            );
          })}
          {!done && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: P(0.35) }}>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}>
                ✎
              </motion.span>
              the table is writing…
            </motion.div>
          )}
          {done && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7 }} className="border-t pt-7 text-center" style={{ borderColor: P(0.08) }}>
              <p className="text-[13px]" style={{ color: P(0.6) }}>
                The table plays on. The gallery is free — a seat costs only a name.
              </p>
              <Link
                href="/register"
                className="mt-4 inline-block rounded-full px-7 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.03] hover:brightness-110"
                style={{ backgroundColor: `rgba(${EMBER},0.2)`, color: P(0.95), border: `1px solid rgba(${EMBERL},0.6)`, boxShadow: `0 0 30px rgba(${EMBER},0.3)` }}
              >
                claim a seat at a table →
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-7 z-20 cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
        style={{ color: P(0.35) }}
      >
        ⟵ the long table
      </button>
    </motion.div>
  );
}

// ── the pulse — lanterns carry tonight's events up from the tree ─────────────

function StoryPulse({ still }: { still: boolean }) {
  if (still) return null;
  return (
    <div aria-label="Tonight on Quiloria" className="pointer-events-none absolute inset-0 hidden md:block">
      {PULSE_EVENTS.map((ev, i) => {
        const left = 36 + ((i * 17) % 31);
        const sway = (i % 2 ? 1 : -1) * (12 + (i % 3) * 5);
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${left}%`, top: "56%" }}
            initial={{ opacity: 0 }}
            animate={{ y: ["0vh", "-7vh", "-38vh", "-46vh"], x: [0, sway * 0.4, sway, sway * 1.25], opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 30 + (i % 3) * 5, delay: 2.5 + i * 5.2, repeat: Infinity, ease: "linear", times: [0, 0.14, 0.85, 1] }}
          >
            <div className="group/lan pointer-events-auto relative">
              {/* the lantern */}
              <div className="absolute -top-1 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-sm bg-[#3a2415]" />
              <motion.div
                className="h-4 w-3 rounded-[3px] transition-transform duration-300 group-hover/lan:scale-125"
                style={{
                  background: "linear-gradient(180deg, rgba(255,222,158,0.95), rgba(216,118,52,0.85))",
                  boxShadow: `0 0 13px 4px rgba(${GOLD},0.4)`,
                }}
                animate={{ opacity: [0.85, 1, 0.9, 1] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* the word it carries */}
              <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[230px] -translate-x-1/2 rounded-lg border border-white/12 bg-black/85 px-3 py-2 text-left opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover/lan:opacity-100">
                <p className="text-[11px] leading-snug text-paper">{ev.text}</p>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgba(${ev.ink},1)` }}>
                  {ev.when}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── the village below — lit windows, each one a creator at their desk ────────

function VillageWindow({ v, delay, chart }: { v: Villager; delay: number; chart?: boolean }) {
  const pal = paletteFor(v.name);
  return (
    <motion.div
      className="group/win pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${v.x}%`, top: `${v.y}%` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
    >
      <button type="button" aria-label={`A lit window — ${v.name}, tending ${v.tending}`} className="relative flex h-7 w-7 cursor-pointer items-center justify-center outline-none">
        <span className="absolute h-6 w-6 rounded-full opacity-50 blur-[6px]" style={{ backgroundColor: `rgba(${GOLD},0.85)` }} />
        <motion.span
          className="relative h-3 w-2.5 rounded-[2px] transition-transform duration-300 group-hover/win:scale-125"
          style={{ background: "linear-gradient(180deg, #ffdf9e, #e8923c)", boxShadow: `0 0 10px 2px rgba(${GOLD},0.55)` }}
          animate={{ opacity: [0.8, 1, 0.88, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="pointer-events-none absolute h-3 w-px bg-[#3a2415]/70" />
        <span className="pointer-events-none absolute h-px w-2.5 bg-[#3a2415]/70" />
      </button>
      {/* who keeps this lamp burning */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[260px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/85 px-4 py-3.5 text-left opacity-0 backdrop-blur-md transition-all duration-200 group-hover/win:pointer-events-auto group-hover/win:translate-y-0 group-hover/win:opacity-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20" style={{ background: `linear-gradient(150deg, ${pal[0]}, ${pal[1]})` }}>
            <span className="font-display text-[15px]" style={{ color: "rgba(255,255,255,0.9)" }}>
              {v.name[0]}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[15px] leading-tight text-paper">{v.name}</h3>
            <p className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: `rgba(${GOLDL},0.9)` }}>
              tending {v.tending}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] italic leading-snug" style={{ color: P(0.62) }}>
          {v.note}
        </p>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.38) }}>
          {v.tonight} · {v.followers}
        </p>
        <Link href="/register" className="mt-2 block font-mono text-[9px] uppercase tracking-[0.18em] transition-colors hover:text-paper" style={{ color: `rgb(${GOLDL})` }}>
          follow their lantern →
        </Link>
      </div>
      <AnimatePresence>
        {chart && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute left-1/2 top-full z-30 -translate-x-1/2 whitespace-nowrap text-center"
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.24em]" style={{ color: `rgba(${GOLDL},0.95)`, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
              {v.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── stage 3.8: the great library — the tree opens into shelves ───────────────

function LibraryStage({ sats, still, onPick, onBack }: { sats: Satellite[]; still: boolean; onPick: (st: ShoreStory, sat: Satellite) => void; onBack: () => void }) {
  const [plate, setPlate] = useState<{ st: ShoreStory; sat: Satellite } | null>(null);
  return (
    <motion.div
      className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0, scale: still ? 1 : 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: still ? 1 : 0.97 }}
      transition={{ duration: still ? 0.2 : 0.7, ease: "easeOut" }}
    >
      <div className="fixed inset-0" style={{ background: "linear-gradient(180deg, #110b18 0%, #191126 50%, #221732 100%)" }} />
      <div className="fixed inset-0" style={{ background: `radial-gradient(80% 45% at 50% 0%, rgba(${GOLD},0.1), transparent 70%)` }} />
      <div className="fixed inset-0">
        <Stars seed="library" count={26} still={still} />
        <Motes ink={GOLD} seed="library" count={6} still={still} />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-6 pb-28 pt-[13vh]">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${GOLDL},0.9)` }}>
            the great library
          </span>
          <h1 className="font-display text-2xl font-light md:text-4xl" style={{ color: P(0.96), textShadow: `0 0 50px rgba(${GOLD},0.35)` }}>
            The shelves are awake.
          </h1>
          <p className="max-w-md text-[12px] leading-relaxed" style={{ color: P(0.5) }}>
            Every spine is a living story, still being written. Pull one down.
          </p>
        </div>

        {SHELVES.map((shelf, si) => (
          <motion.section
            key={shelf.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: still ? 0 : 0.35 + si * 0.2, duration: 0.6, ease: "easeOut" }}
            className="mt-12 first-of-type:mt-14"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-lg text-paper md:text-xl">{shelf.title}</h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: P(0.32) }}>
                {shelf.note}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-2.5 px-2">
              {shelf.picks.map(([satKey, idx], i) => {
                const sat = sats.find((s) => s.key === satKey)!;
                const st = sat.stories[idx];
                const pal = paletteFor(st.title);
                return (
                  <button
                    key={st.title}
                    type="button"
                    onClick={() => setPlate({ st, sat })}
                    aria-label={`${st.title} by ${st.author}`}
                    className="group/spine relative flex cursor-pointer items-end justify-center overflow-hidden rounded-[3px] border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:brightness-115"
                    style={{
                      width: 46 + ((i + si) % 2) * 7,
                      height: 124 + ((i * 37 + si * 19) % 28),
                      background: `linear-gradient(170deg, ${pal[0]}, ${pal[1]})`,
                      boxShadow: "inset 3px 0 6px rgba(0,0,0,0.35), inset -2px 0 4px rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* genre ribbon */}
                    <span className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: `rgb(${sat.light})`, boxShadow: `0 0 6px rgba(${sat.glow},0.8)` }} />
                    <span className="px-1 pb-3 pt-6 font-display text-[11px] leading-tight" style={{ writingMode: "vertical-rl", color: "rgba(255,255,255,0.88)" }}>
                      {st.title}
                    </span>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover/spine:opacity-100" />
                  </button>
                );
              })}
            </div>
            {/* the shelf board */}
            <div className="mt-0 h-2 rounded-[2px]" style={{ background: "linear-gradient(180deg, #3a2415, #1c1010)", boxShadow: `0 4px 14px rgba(0,0,0,0.5), 0 1px 0 rgba(${GOLDL},0.18) inset` }} />
          </motion.section>
        ))}

        <div className="mt-12 text-center">
          <Link
            href="/browse"
            className="inline-block rounded-full border px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:brightness-125"
            style={{ borderColor: `rgba(${GOLDL},0.4)`, color: `rgb(${GOLDL})` }}
          >
            wander the full stacks →
          </Link>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: P(0.28) }}>
            new shelves every night
          </p>
        </div>
      </div>

      <AnimatePresence>
        {plate && (
          <StoryPlate
            st={plate.st}
            glow={plate.sat.glow}
            light={plate.sat.light}
            eyebrow={plate.sat.eyebrow}
            fixed
            onClose={() => setPlate(null)}
            onPick={(st) => onPick(st, plate.sat)}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="fixed left-6 top-7 z-20 cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
        style={{ color: P(0.35) }}
      >
        ⟵ back to the island
      </button>
    </motion.div>
  );
}

// ── the island itself ────────────────────────────────────────────────────────
// Prefers painted raster art (the target style) at /landing/island-{world}.png;
// falls back to the built-in SVG isles until those assets exist. The creature
// overlay (dragon, butterflies, birds, pages) animates above either.

function IslandArt({ world, still, tilt }: { world: World; still: boolean; tilt: { x: number; y: number } }) {
  const [hasArt, setHasArt] = useState(true);
  if (!hasArt) {
    return world === "writer" ? <WriterIsle /> : <ReaderIsle />;
  }
  return (
    <div className="relative mx-auto w-[min(58vh,72%)]" style={{ perspective: 900 }}>
      <div
        aria-hidden
        className="absolute -bottom-[4%] left-1/2 h-[10%] w-[58%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl"
      />
      {/* the island leans gently toward your cursor — held, not pinned */}
      <motion.div
        animate={still ? {} : { rotateY: tilt.x * 6, rotateX: tilt.y * -4.5 }}
        transition={{ type: "spring", stiffness: 46, damping: 18 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div animate={still ? {} : { y: [0, -9, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/landing/island-${world}.png`}
            alt=""
            draggable={false}
            className="h-auto w-full select-none"
            onError={() => setHasArt(false)}
          />
          {!still && <CreatureOverlay world={world} />}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── ambient layers ───────────────────────────────────────────────────────────

function Stars({ seed, count = 54, still }: { seed: string; count?: number; still: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const left = arand(hash(`${seed}-x${i}`)) * 100;
        const top = arand(hash(`${seed}-y${i}`)) * 70;
        const bright = i % 9 === 0;
        const size = bright ? 2.6 : 1 + arand(hash(`${seed}-s${i}`)) * 1.4;
        const dur = 3.5 + arand(hash(`${seed}-d${i}`)) * 4.5;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              backgroundColor: P(bright ? 0.95 : 0.85),
              boxShadow: bright ? `0 0 8px 2px ${P(0.35)}` : undefined,
            }}
            animate={still ? { opacity: 0.4 } : { opacity: bright ? [0.4, 1, 0.4] : [0.08, 0.65, 0.08] }}
            transition={{ duration: dur, delay: arand(hash(`${seed}-t${i}`)) * 5, repeat: still ? 0 : Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

// soft nebula clouds — the sky stops being a flat gradient
function Nebula({ world, still }: { world: World; still: boolean }) {
  const blobs =
    world === "reader"
      ? [
          { left: "16%", top: "14%", w: "46vw", h: "34vh", c: "126,94,158", o: 0.1 },
          { left: "74%", top: "26%", w: "40vw", h: "30vh", c: "59,110,122", o: 0.09 },
          { left: "46%", top: "58%", w: "54vw", h: "36vh", c: "126,94,158", o: 0.07 },
        ]
      : [
          { left: "20%", top: "16%", w: "44vw", h: "32vh", c: "158,59,66", o: 0.09 },
          { left: "76%", top: "24%", w: "38vw", h: "28vh", c: "200,150,60", o: 0.07 },
          { left: "48%", top: "60%", w: "52vw", h: "34vh", c: "126,94,158", o: 0.06 },
        ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-3xl"
          style={{ left: b.left, top: b.top, width: b.w, height: b.h, backgroundColor: `rgba(${b.c},${b.o})` }}
          animate={still ? {} : { x: [0, i % 2 ? -30 : 30, 0], y: [0, i % 2 ? 14 : -14, 0] }}
          transition={{ duration: 70 + i * 18, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// a quiet moon presiding over the world
function Moon({ world }: { world: World }) {
  const tint = world === "reader" ? "226,222,240" : "238,214,178";
  return (
    <div aria-hidden className="pointer-events-none absolute left-[9%] top-[11%]">
      <div
        className="h-14 w-14 rounded-full"
        style={{
          background: `radial-gradient(circle at 38% 35%, rgba(${tint},0.95), rgba(${tint},0.55) 55%, rgba(${tint},0.25) 75%)`,
          boxShadow: `0 0 40px 12px rgba(${tint},0.18), 0 0 90px 40px rgba(${tint},0.07)`,
        }}
      />
    </div>
  );
}

function Motes({ ink, seed, count = 9, still }: { ink: string; seed: string; count?: number; still: boolean }) {
  if (still) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = 6 + arand(hash(`${seed}-x${i}`)) * 88;
        const top = 25 + arand(hash(`${seed}-y${i}`)) * 60;
        const size = 2 + arand(hash(`${seed}-s${i}`)) * 2.5;
        const dur = 8 + arand(hash(`${seed}-d${i}`)) * 9;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              backgroundColor: `rgba(${ink},0.8)`,
              boxShadow: `0 0 ${size * 3.5}px rgba(${ink},0.5)`,
            }}
            animate={{ y: [0, -110], opacity: [0, 0.7, 0] }}
            transition={{ duration: dur, delay: arand(hash(`${seed}-t${i}`)) * 8, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

// every isle casts its glow into the one sea of mist below — a shared floor
// that makes six floating worlds read as one place
function MistPools({ world, still }: { world: World; still: boolean }) {
  const pools =
    world === "reader"
      ? [
          { left: "50%", glow: GOLD, w: "46vw", o: 0.3 },
          ...READER_SATELLITES.map((s) => ({ left: s.left, glow: s.glow, w: "22vw", o: 0.26 })),
          { left: "12%", glow: EMBER, w: "18vw", o: 0.26 },
        ]
      : [{ left: "50%", glow: GOLD, w: "50vw", o: 0.28 }];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pools.map((p, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 rounded-[50%] blur-2xl"
          style={{
            left: p.left,
            top: "78%",
            width: p.w,
            height: "14vh",
            background: `radial-gradient(50% 60% at 50% 42%, rgba(${p.glow},${p.o}), transparent 70%)`,
          }}
          animate={still ? { opacity: 0.85 } : { opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8 + (i % 3) * 2.5, repeat: still ? 0 : Infinity, ease: "easeInOut", delay: i * 0.9 }}
        />
      ))}
    </div>
  );
}

// drifting cloud-wisps that pass behind and in front of the island
function MistBand({ top, width, height, opacity, dur, delay, color }: { top: string; width: string; height: string; opacity: number; dur: number; delay: number; color: string }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 rounded-[50%] blur-3xl"
      style={{ top, width, height, backgroundColor: color, opacity }}
      animate={{ x: ["-62%", "-38%", "-62%"] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ShootingStar({ top, left, delay, period }: { top: string; left: string; delay: number; period: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute h-px w-24 -rotate-[18deg]"
      style={{ top, left, background: `linear-gradient(90deg, transparent, ${P(0.9)}, transparent)` }}
      initial={{ opacity: 0 }}
      animate={{ x: [0, 300], opacity: [0, 0.9, 0] }}
      transition={{ duration: 1.3, delay, repeat: Infinity, repeatDelay: period, ease: "easeOut" }}
    />
  );
}

// large, blurred motes falling close to the camera — the nearest depth layer
function ForegroundMotes({ ink, still }: { ink: string; still: boolean }) {
  if (still) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-[3px]"
          style={{
            left: `${12 + i * 24}%`,
            top: `${-6 - i * 4}%`,
            width: 9 + (i % 2) * 5,
            height: 9 + (i % 2) * 5,
            backgroundColor: `rgba(${ink},0.5)`,
            boxShadow: `0 0 18px rgba(${ink},0.4)`,
          }}
          animate={{ y: ["0vh", "118vh"], x: [0, (i % 2 ? -1 : 1) * 60], opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: 17 + i * 5, delay: i * 4.2, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

// ── the hush — a synthesized ambient layer: night wind and far-off chimes ────
// No audio assets; everything is drawn from noise and sine waves at runtime.
// Off by default — sound is an invitation, never an ambush.

function useAmbient() {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const [on, setOn] = useState(false);

  const toggle = () => {
    if (on) {
      stopRef.current();
      setOn(false);
      return;
    }
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    void ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);

    // night wind — looped noise breathing through low filters, panned wide
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const sources: AudioScheduledSourceNode[] = [];
    const wind = (freq: number, pan: number, gain: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = freq;
      lp.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = gain;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.04;
      const lfoG = ctx.createGain();
      lfoG.gain.value = gain * 0.55;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start();
      src.connect(lp);
      lp.connect(g);
      g.connect(p);
      p.connect(master);
      src.start();
      sources.push(src, lfo);
    };
    wind(220, -0.4, 0.05);
    wind(380, 0.45, 0.034);

    // a little hall for the chimes to ring in
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    // far-off chimes — slow pentatonic, never twice the same
    const NOTES = [392, 440, 523.25, 587.33, 659.25];
    let chimeTimer: ReturnType<typeof setTimeout>;
    const chime = () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = (NOTES[Math.floor(Math.random() * NOTES.length)] ?? 440) / 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
      o.connect(g);
      g.connect(master);
      g.connect(delay);
      o.start(t);
      o.stop(t + 6.2);
      chimeTimer = setTimeout(chime, 6000 + Math.random() * 9000);
    };
    chimeTimer = setTimeout(chime, 2500);

    stopRef.current = () => {
      clearTimeout(chimeTimer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => {
        sources.forEach((n) => {
          try {
            n.stop();
          } catch {}
        });
        master.disconnect();
      }, 900);
    };
    setOn(true);
  };

  useEffect(
    () => () => {
      stopRef.current();
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  return { on, toggle };
}

// ── the traveler — one ink mote across the whole journey ─────────────────────

// where each world rests in the sky — the mote drifts to whichever you regard
const ISLE_POS: Record<string, { x: number; y: number }> = {
  romance: { x: 27, y: 34 },
  scifi: { x: 73, y: 29 },
  pirate: { x: 27, y: 71 },
  horror: { x: 74, y: 66 },
  table: { x: 12, y: 52 },
};

function TheMote({ stage, world, still, focus }: { stage: Stage; world: World | null; still: boolean; focus?: string | null }) {
  const ink = world ? WORLDS[world].ink : GOLD;
  const light = world ? WORLDS[world].light : GOLDL;
  const regarded = stage === "world" && focus ? ISLE_POS[focus] : null;
  const target =
    stage === "doors"
      ? { left: "50vw", top: "54vh", scale: 1, opacity: 1 }
      : stage === "crossing"
        ? { left: "50vw", top: "46vh", scale: 2.6, opacity: 1 }
        : regarded
          ? { left: `${regarded.x}vw`, top: `${regarded.y - 7}vh`, scale: 1.15, opacity: 1 }
          : stage === "world"
          ? { left: "50vw", top: "46vh", scale: 1.4, opacity: 1 }
          : stage === "shore" || stage === "library"
            ? { left: "50vw", top: "13vh", scale: 1.1, opacity: 1 }
            : stage === "tables"
              ? { left: "50vw", top: "4.5vh", scale: 1.1, opacity: 1 }
              : { left: "50vw", top: "26vh", scale: 0.7, opacity: 0 };
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2"
      animate={target}
      transition={still ? { duration: 0 } : { type: "spring", stiffness: 46, damping: 15 }}
    >
      <motion.div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: `rgba(${light},0.95)`, boxShadow: `0 0 20px 7px rgba(${ink},0.55), 0 0 50px 18px rgba(${ink},0.18)` }}
        animate={still ? {} : stage === "world" ? { y: [0, -9, 0], scale: [1, 1.15, 1] } : { scale: [1, 1.25, 1] }}
        transition={{ duration: stage === "world" ? 4.5 : 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

// ── stage 1: the doors ───────────────────────────────────────────────────────

// the world glimpsed through the door — live preview inside the portal
function PortalScene({ world, still }: { world: World; still: boolean }) {
  const [hasArt, setHasArt] = useState(true);
  if (!hasArt) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[135%] max-w-none shrink-0">{world === "writer" ? <WriterIsle /> : <ReaderIsle />}</div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      {world === "reader" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/world-romance.png"
            alt=""
            draggable={false}
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="absolute left-[8%] top-[22%] w-[24%] opacity-80 select-none"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/world-horror.png"
            alt=""
            draggable={false}
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="absolute right-[6%] top-[56%] w-[26%] opacity-85 select-none"
          />
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div animate={still ? {} : { y: [0, -6, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="w-[74%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/landing/island-${world}.png`} alt="" draggable={false} onError={() => setHasArt(false)} className="h-auto w-full select-none" />
        </motion.div>
      </div>
    </div>
  );
}

function DoorHalf({
  world,
  leaned,
  dimmed,
  still,
  onLean,
  onLeave,
  onCommit,
}: {
  world: World;
  leaned: boolean;
  dimmed: boolean;
  still: boolean;
  onLean: () => void;
  onLeave: () => void;
  onCommit: () => void;
}) {
  const w = WORLDS[world];
  const bloomSide = world === "writer" ? "32% 50%" : "68% 50%";
  return (
    <motion.button
      type="button"
      onMouseEnter={onLean}
      onMouseLeave={onLeave}
      onFocus={onLean}
      onBlur={onLeave}
      onClick={onCommit}
      className="group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden outline-none"
      animate={{ flexBasis: leaned ? "64%" : dimmed ? "36%" : "50%" }}
      transition={{ type: "spring", stiffness: 110, damping: 24 }}
      style={{ flexGrow: 0, flexShrink: 0, flexBasis: "50%" }}
      aria-label={`Enter as a ${w.word.toLowerCase()} — ${w.desc}`}
    >
      {/* the world's light leaning toward you */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(75% 90% at ${bloomSide}, rgba(${w.ink},0.20), rgba(${w.ink},0.05) 55%, transparent 75%)` }}
        animate={{ opacity: leaned ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {leaned && <Motes ink={w.ink} seed={`door-${world}`} count={7} still={false} />}

      {/* identity — rises to crown the portal when the door opens */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 px-8 text-center"
        animate={{
          y: leaned ? "-29vh" : "0vh",
          scale: leaned ? 0.82 : 1,
          opacity: dimmed ? 0.32 : 1,
          filter: dimmed ? "saturate(0.5)" : "saturate(1)",
        }}
        transition={{ type: "spring", stiffness: 110, damping: 24 }}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: leaned ? `rgba(${w.light},0.9)` : P(0.28) }}>
          {world === "writer" ? "the first door" : "the second door"}
        </span>
        <h2
          className="font-display text-5xl font-light tracking-wide md:text-7xl"
          style={{ color: leaned ? P(0.98) : P(0.82), textShadow: leaned ? `0 0 50px rgba(${w.ink},0.45)` : "none" }}
        >
          {w.word}
        </h2>
        <motion.p
          className="max-w-[260px] text-[13px] leading-relaxed"
          style={{ color: P(0.5) }}
          animate={{ opacity: leaned ? 0 : dimmed ? 0.4 : 1 }}
          transition={{ duration: 0.35 }}
        >
          {w.desc}
        </motion.p>
      </motion.div>

      {/* the portal — the door opens and you see the world waiting */}
      <AnimatePresence>
        {leaned && (
          <motion.div
            className="absolute left-1/2 top-1/2 z-10"
            initial={{ x: "-50%", y: "-50%", scale: 0.55, opacity: 0 }}
            animate={{ x: "-50%", y: "-44%", scale: 1, opacity: 1 }}
            exit={{ x: "-50%", y: "-46%", scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 21 }}
          >
            <div
              className="relative h-[min(46vh,58vw)] w-[min(46vh,58vw)] overflow-hidden rounded-full"
              style={{
                border: `1.5px solid rgba(${w.light},0.55)`,
                boxShadow: `0 0 70px rgba(${w.ink},0.5), 0 0 160px rgba(${w.ink},0.22), inset 0 0 50px rgba(${w.ink},0.25)`,
                background:
                  world === "reader"
                    ? "linear-gradient(180deg, #120d20 0%, #221840 55%, #2c1f4a 100%)"
                    : "linear-gradient(180deg, #150d1a 0%, #281527 55%, #3a1d2b 100%)",
              }}
            >
              <Stars seed={`portal-${world}`} count={14} still={still} />
              <PortalScene world={world} still={still} />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 70px 26px rgba(8,5,14,0.6)" }} />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4" style={{ background: "linear-gradient(180deg, transparent, rgba(14,9,22,0.75))" }} />
            </div>
            <motion.span
              className="absolute left-1/2 top-full mt-5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: `rgba(${w.light},0.9)` }}
              initial={{ x: "-50%", opacity: 0, y: 6 }}
              animate={{ x: "-50%", opacity: 1, y: 0 }}
              exit={{ x: "-50%", opacity: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
            >
              step through →
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── hotspots — the island previews real sections, it doesn't replace nav ─────

function IslandHotspot({ spot, ink, light, delay, onOpen, chart }: { spot: Hotspot; ink: string; light: string; delay: number; onOpen?: () => void; chart?: boolean }) {
  return (
    <motion.div
      className="group/spot pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      <button
        type="button"
        aria-label={`${spot.eyebrow}: ${spot.title}`}
        onClick={onOpen}
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full outline-none"
      >
        <span className="absolute h-5 w-5 animate-ping rounded-full opacity-25" style={{ backgroundColor: `rgb(${ink})`, animationDuration: "3s" }} />
        <span
          className="h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover/spot:scale-150"
          style={{ backgroundColor: `rgba(${light},0.95)`, boxShadow: `0 0 12px 3px rgba(${ink},0.5)` }}
        />
      </button>
      <div
        className={`pointer-events-none absolute left-1/2 z-30 w-max max-w-[250px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/80 px-3.5 py-3 text-left opacity-0 backdrop-blur-md transition-all duration-200 group-focus-within/spot:translate-y-0 group-focus-within/spot:opacity-100 group-hover/spot:translate-y-0 group-hover/spot:opacity-100 ${
          spot.y < 42 ? "top-full mt-2" : "bottom-full mb-2"
        }`}
      >
        <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgb(${light})` }}>
          {spot.eyebrow}
        </span>
        <h3 className="mt-0.5 font-display text-[15px] leading-tight text-paper">{spot.title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: P(0.6) }}>
          {spot.sub}
        </p>
        {onOpen && (
          <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `rgb(${light})` }}>
            step into the stacks →
          </span>
        )}
      </div>
      <AnimatePresence>
        {chart && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap text-center"
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.24em]" style={{ color: `rgba(${light},0.95)`, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
              {spot.eyebrow}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── stage 4: the page itself ─────────────────────────────────────────────────

function WriterPage({ onRestart }: { onRestart: () => void }) {
  const [text, setText] = useState("");
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  // hand the words to the real demo editor — same draft key /demo/try loads
  useEffect(() => {
    if (!text.trim()) return;
    const t = setTimeout(() => {
      try {
        const content = text
          .split(/\n+/)
          .filter(Boolean)
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join("");
        localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify({ title: "Untitled", content, updatedAt: Date.now() }));
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-16 pt-24">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${GOLDL},0.8)` }}>
          your first page — no account needed
        </span>
        <h1 className="mt-3 font-display text-3xl font-light" style={{ color: P(0.55) }}>
          Untitled world
        </h1>
      </motion.div>
      <motion.textarea
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.7 }}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="The lantern was the last thing she packed…"
        spellCheck={false}
        className="font-reading mt-8 min-h-[44vh] w-full flex-1 resize-none bg-transparent text-[17px] leading-loose outline-none"
        style={{ color: P(0.88), caretColor: `rgb(${GOLDL})` }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="mt-8 flex items-center justify-between border-t pt-5"
        style={{ borderColor: P(0.08) }}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: P(0.3) }}>
          {words === 0 ? "the page is yours" : `${words} word${words === 1 ? "" : "s"} · kept safe`}
        </span>
        <div className="flex items-center gap-5">
          <button type="button" onClick={onRestart} className="cursor-pointer font-mono text-[10px] uppercase tracking-wider transition-colors hover:text-paper" style={{ color: P(0.3) }}>
            ↺ begin again
          </button>
          <Link
            href="/demo/try"
            className="rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-all hover:brightness-110"
            style={{ backgroundColor: `rgba(${GOLD},0.14)`, color: `rgb(${GOLDL})`, border: `1px solid rgba(${GOLD},0.35)` }}
          >
            continue in the studio →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

const EXCERPT = [
  "The salt garden bloomed only at low tide, and Issa had learned to run the mile of wet sand before the sea remembered to come back. Crystal stems caught the morning gold and threw it across the flats in long ribbons, so the whole shore burned like a field of struck matches. Her grandmother called it the ocean's apology. Issa called it the only place the lighthouse keeper's daughter could be alone.",
  "Except, this morning, she wasn't. A boy stood hip-deep among the glittering stalks, exactly where the garden grew thickest, holding a green glass bottle up to the sun as if reading it. No boat on the water. No footprints but hers.",
  "\u201cYou shouldn't be here when it turns,\u201d she called, and he looked at her the way the tide looks at a sandcastle — patient, and a little sorry. \u201cNeither should you,\u201d he said. \u201cIt turned an hour ago.\u201d",
];

interface Tale {
  eyebrow: string;
  title: string;
  author: string;
  accent: string;
  paras: string[];
  shoreKey?: string;
  /** real platform story — the excerpt's CTA continues into the actual chapter */
  slug?: string;
  firstChapterId?: string;
}

// the curated center door — Quiloria's choice for tonight
const TONIGHT: Tale = {
  eyebrow: "tonight's tale \u00b7 chapter one",
  title: "The Salt Garden",
  author: "Elowen Vance",
  accent: AMETHL,
  paras: EXCERPT,
};

function ReaderPage({ tale, onRestart, onBack }: { tale: Tale; onRestart: () => void; onBack?: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-16 pt-24">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `rgba(${tale.accent},0.85)` }}>
          {tale.eyebrow}
        </span>
        <h1 className="mt-3 font-display text-4xl font-light text-paper">{tale.title}</h1>
        <p className="mt-2 text-[13px]" style={{ color: P(0.45) }}>
          by {tale.author}
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="font-reading mt-10 space-y-6 text-[17px] leading-loose" style={{ color: P(0.88) }}>
        {tale.paras.map((para, i) =>
          i === 0 ? (
            <p key={i}>
              <span aria-hidden className="float-left mr-3 mt-1 font-display text-[58px] leading-[0.78]" style={{ color: `rgb(${tale.accent})` }}>
                {para[0]}
              </span>
              {para.slice(1)}
            </p>
          ) : (
            <p key={i}>{para}</p>
          ),
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }} className="relative mt-2">
        <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24" style={{ background: "linear-gradient(180deg, transparent, #0d0a14)" }} />
        <div className="flex items-center justify-between gap-4 border-t pt-5" style={{ borderColor: P(0.08) }}>
          <div className="flex items-center gap-5">
            <button type="button" onClick={onRestart} className="cursor-pointer font-mono text-[10px] uppercase tracking-wider transition-colors hover:text-paper" style={{ color: P(0.3) }}>
              ↺ begin again
            </button>
            {onBack && (
              <button type="button" onClick={onBack} className="cursor-pointer font-mono text-[10px] uppercase tracking-wider transition-colors hover:text-paper" style={{ color: P(0.3) }}>
                ⟵ more tales from this shore
              </button>
            )}
          </div>
          <Link
            href={tale.slug && tale.firstChapterId ? `/story/${tale.slug}/read/${tale.firstChapterId}` : "/browse"}
            className="rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-all hover:brightness-110"
            style={{ backgroundColor: `rgba(${tale.accent},0.14)`, color: `rgb(${tale.accent})`, border: `1px solid rgba(${tale.accent},0.4)` }}
          >
            {tale.slug && tale.firstChapterId ? "keep reading — the chapter continues →" : "keep reading on quiloria →"}
          </Link>
        </div>
        {/* the invitation, never a wall — their taste and place already travel */}
        <p className="mt-6 text-center text-[12px]" style={{ color: P(0.4) }}>
          The ink will remember where you stopped —{" "}
          <Link href="/register?intent=read" className="italic underline-offset-4 hover:underline" style={{ color: `rgb(${tale.accent})` }}>
            write yourself in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// ── the experience ───────────────────────────────────────────────────────────

interface LandingExperienceProps {
  /** deep entry: the film's "read →" door arrives directly in its world —
      clicking the door on the film WAS the doors stage */
  initialWorld?: World | null;
  /** real tales per genre world (server-fetched); fixtures used when absent */
  shoreTales?: ShoreTalesByWorld | null;
}

export default function LandingExperience({ initialWorld = null, shoreTales = null }: LandingExperienceProps) {
  const reduce = useReducedMotion();
  const still = !!reduce;
  // arriving through a portal door? We mount inside the dive's light (the
  // CrossingVeil fades it off us) — its fade is the reveal, no double iris.
  const [arrivalBloom] = useState<CrossingBloom | null>(() =>
    typeof window === "undefined" ? null : consumeCrossing(),
  );
  const [stage, setStage] = useState<Stage>(initialWorld ? "world" : "doors");
  const [world, setWorld] = useState<World | null>(initialWorld);
  const [lean, setLean] = useState<World | null>(null);
  const [shore, setShore] = useState<Satellite | null>(null);
  const [tale, setTale] = useState<Tale | null>(null);
  const [lastTale, setLastTale] = useState<Tale | null>(null);
  // which isle the visitor is regarding — its story-thread brightens in answer
  const [hotIsle, setHotIsle] = useState<string | null>(null);
  // the star chart — the map page of this world, named and threaded
  const [chart, setChart] = useState(false);
  // the visitor's attention is light — a warm pool follows the cursor
  const [cursor, setCursor] = useState({ x: -600, y: -600 });
  const ambient = useAmbient();
  // whether the world stage should reveal through the portal hole (vs a plain
  // fade when returning from a shore) — deep entries arrive through the hole,
  // unless the film's door dived here (the bloom's fade reveals instead)
  const [viaPortal, setViaPortal] = useState(!!initialWorld && !arrivalBloom);

  // genre worlds carry real tales when the platform has them; the inline
  // fixtures keep fresh installs (and dev) fully dressed
  const sats = useMemo(
    () =>
      READER_SATELLITES.map((s) => {
        const real = shoreTales?.[s.key];
        return real && real.length >= 3 ? { ...s, stories: real.slice(0, 3) } : s;
      }),
    [shoreTales],
  );
  const [par, setPar] = useState({ x: 0, y: 0 });
  // touch has no hover: first tap leans, second tap crosses
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    try {
      const raw = localStorage.getItem(LAST_TALE_KEY);
       
      if (raw) setLastTale(JSON.parse(raw) as Tale);
    } catch {}
  }, []);

  const commit = (w: World) => {
    if (coarse && lean !== w) {
      setLean(w);
      return;
    }
    setWorld(w);
    setViaPortal(true);
    setStage(still ? "world" : "crossing");
  };

  const enterShore = (sat: Satellite) => {
    bumpTaste(WORLD_TASTE[sat.key] ?? [], 1);
    setViaPortal(false);
    setShore(sat);
    setStage("shore");
  };

  const enterTables = () => {
    setViaPortal(false);
    setStage("tables");
  };

  const enterLibrary = () => {
    setViaPortal(false);
    setStage("library");
  };

  // opening any tale remembers it — next visit, the center door resumes it
  const openTale = (t: Tale, sat: Satellite | null) => {
    try {
      localStorage.setItem(LAST_TALE_KEY, JSON.stringify(t));
    } catch {}
    // opening a tale is a stronger genre signal than visiting its shore
    if (t.shoreKey) bumpTaste(WORLD_TASTE[t.shoreKey] ?? [], 2);
    setLastTale(t);
    setShore(sat);
    setTale(t);
    setStage("page");
  };

  // the crossing is a beat, not a loading screen — and it's skippable
  useEffect(() => {
    if (stage !== "crossing") return;
    const t = setTimeout(() => setStage("world"), 1150);
    return () => clearTimeout(t);
  }, [stage]);

  const restart = () => {
    setStage("doors");
    setWorld(null);
    setLean(null);
    setShore(null);
    setTale(null);
  };

  const w = world ? WORLDS[world] : null;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "rgb(17,14,10)" }}>
      {/* the far side of the film door's dive — its light fades off us */}
      <CrossingVeil bloom={arrivalBloom} />
      {/* stage 1 + 2 — the doors, then the dolly through the chosen one */}
      <AnimatePresence>
        {(stage === "doors" || stage === "crossing") && (
          <motion.div
            key="doors"
            className="absolute inset-0"
            style={{ originX: world ? (world === "writer" ? 0.32 : 0.68) : 0.5, originY: 0.5 }}
            animate={
              stage === "crossing" && !still
                ? { scale: 1.42, opacity: 0.55 }
                : { scale: 1, opacity: 1 }
            }
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 1.15, ease: [0.65, 0, 0.2, 1] }}
          >
            <Stars seed="door-sky" count={30} still={still} />
            <div className="flex h-full w-full flex-col md:flex-row">
              <DoorHalf
                world="writer"
                leaned={lean === "writer"}
                dimmed={lean === "reader"}
                still={still}
                onLean={() => !coarse && setLean("writer")}
                onLeave={() => !coarse && setLean(null)}
                onCommit={() => commit("writer")}
              />
              {/* the seam */}
              <div aria-hidden className="relative z-10 h-px w-full shrink-0 md:h-full md:w-px" style={{ background: `linear-gradient(180deg, transparent, ${P(0.14)}, transparent)` }} />
              <DoorHalf
                world="reader"
                leaned={lean === "reader"}
                dimmed={lean === "writer"}
                still={still}
                onLean={() => !coarse && setLean("reader")}
                onLeave={() => !coarse && setLean(null)}
                onCommit={() => commit("reader")}
              />
            </div>
            {/* brand + hint */}
            <div className="pointer-events-none absolute left-1/2 top-8 z-20 flex -translate-x-1/2 items-center gap-2.5" style={{ color: P(0.85) }}>
              <QuillRingMark className="h-7 w-7" />
              <QuiloriaWordmark className="font-display text-xl" />
            </div>
            <p className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: P(0.26) }}>
              {coarse ? "tap a door to look through · tap the portal to enter" : "two doors · hover to look through one"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the rim of the portal, sweeping past as you go through */}
      <AnimatePresence>
        {stage === "crossing" && w && world && !still && (
          <motion.div
            key="rim"
            aria-hidden
            className="pointer-events-none absolute z-30 rounded-full"
            style={{
              left: world === "writer" ? "32%" : "68%",
              top: "48%",
              border: `2px solid rgba(${w.light},0.75)`,
              boxShadow: `0 0 70px 14px rgba(${w.ink},0.5), inset 0 0 70px 14px rgba(${w.ink},0.4)`,
            }}
            initial={{ x: "-50%", y: "-50%", width: "30vmax", height: "30vmax", scale: 1, opacity: 1 }}
            animate={{ x: "-50%", y: "-50%", scale: 8.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.65, 0, 0.2, 1] }}
          />
        )}
      </AnimatePresence>

      {/* stage 3 — the world */}
      <AnimatePresence>
        {(stage === "world" || (stage === "crossing" && !still)) && w && world && (
          <motion.div
            key={`world-${world}`}
            className="absolute inset-0"
            initial={
              still || !viaPortal
                ? { opacity: 0 }
                : { opacity: 1, clipPath: `circle(15vmax at ${world === "writer" ? "32%" : "68%"} 48%)` }
            }
            animate={
              still || !viaPortal
                ? { opacity: 1 }
                : { opacity: 1, clipPath: `circle(165vmax at ${world === "writer" ? "32%" : "68%"} 48%)` }
            }
            exit={{ opacity: 0, scale: still ? 1 : 1.5, filter: "blur(12px)" }}
            transition={{ duration: still ? 0.3 : 1.15, ease: [0.65, 0, 0.2, 1] }}
            onMouseMove={(e) => {
              if (still) return;
              const r = e.currentTarget.getBoundingClientRect();
              setPar({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 });
              setCursor({ x: e.clientX, y: e.clientY });
            }}
          >
            {/* sky */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  world === "writer"
                    ? `linear-gradient(180deg, #150d1a 0%, #261327 45%, #3a1d2b 74%, rgba(${GOLD},0.3) 100%)`
                    : `linear-gradient(180deg, #120d20 0%, #1f1535 45%, #2c1f4a 74%, rgba(${TEAL},0.3) 100%)`,
              }}
            />
            {!still && viaPortal && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30"
                style={{
                  background: `radial-gradient(circle at ${world === "writer" ? "32%" : "68%"} 48%, ${P(0.8)} 0%, rgba(${w.ink},0.3) 28%, transparent 58%)`,
                }}
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.35, ease: "easeOut" }}
              />
            )}
            <Nebula world={world} still={still} />

            {/* the diorama — every depth layer lives on one gently turning 3D stage,
                so the parallax converges like a real camera instead of sliding cards */}
            <div className="pointer-events-none absolute inset-0" style={{ perspective: 1150 }}>
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                animate={still ? {} : { rotateY: par.x * 3.2, rotateX: par.y * -2.2 }}
                transition={{ type: "spring", stiffness: 40, damping: 18 }}
              >
            {/* deep sky */}
            <div className="absolute inset-0" style={{ transform: "translateZ(-240px) scale(1.21)" }}>
            <motion.div animate={{ x: par.x * -6, y: par.y * -4 }} transition={{ type: "spring", stiffness: 50, damping: 20 }} className="absolute inset-0">
              <Stars seed={`sky-${world}`} still={still} />
              <Moon world={world} />
              {!still && (
                <>
                  <ShootingStar top="11%" left="16%" delay={4} period={13} />
                  <ShootingStar top="20%" left="62%" delay={11} period={19} />
                </>
              )}
            </motion.div>
            <Motes ink={w.ink} seed={`world-${world}`} count={10} still={still} />

            {/* far mist drifts behind the island */}
            {!still && <MistBand top="46%" width="70vw" height="16vh" opacity={0.07} dur={44} delay={0} color="#e8ddf5" />}
            </div>

            {/* far shore — drifting on the same slow current as the near one, in counter-phase */}
            <div className="absolute inset-0" style={{ transform: "translateZ(-120px) scale(1.105)" }}>
            <motion.div
              className="absolute inset-0"
              animate={still ? {} : { x: [0, -7, 0, 7, 0], y: [0, 4, 0, -4, 0] }}
              transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
            >
            {/* distant story-worlds behind the main island */}
            {world === "reader" &&
              sats.filter((s) => s.depth === "back").map((s, i) => (
                <SatelliteIsland key={s.key} s={s} par={par} still={still} delay={still ? 0 : 1.4 + i * 0.3} onEnter={() => enterShore(s)} onHot={setHotIsle} chart={chart} />
              ))}
            </motion.div>
            </div>

            {/* the island's plane */}
            <div className="absolute inset-0">

            {/* the island, one layer deeper than the sky */}
            {/* pointer-events-none so the container never swallows clicks meant for
                the back satellites it overlaps; hotspots re-enable their own */}
            <motion.div
              animate={{ x: par.x * -16, y: par.y * -9 }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="pointer-events-none absolute left-1/2 top-[30%] w-[min(860px,94vw)] -translate-x-1/2"
            >
              {/* the island's light bleeds into the night — lamplight halo */}
              <motion.div
                aria-hidden
                className="absolute left-1/2 top-[42%] h-[58vh] w-[58vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(${GOLD},0.16) 0%, rgba(${w.ink},0.08) 45%, transparent 70%)` }}
                animate={still ? {} : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div initial={{ opacity: 0, y: still ? 0 : 46 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: still ? 0 : 1.3, ease: [0.2, 0.7, 0.3, 1] }} className="relative">
                {/* breathing camera — the world is never perfectly frozen */}
                <motion.div animate={still ? {} : { scale: [1, 1.022, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}>
                  <IslandArt world={world} still={still} tilt={par} />
                </motion.div>
                {w.hotspots.map((spot, i) => (
                  <IslandHotspot
                    key={spot.eyebrow}
                    spot={spot}
                    ink={w.ink}
                    light={w.light}
                    delay={still ? 0 : 1.1 + i * 0.25}
                    onOpen={spot.door === "library" ? enterLibrary : undefined}
                    chart={chart}
                  />
                ))}
                {/* the village below — creators at their lit windows */}
                {world === "reader" && VILLAGERS.map((v, i) => <VillageWindow key={v.name} v={v} delay={still ? 0 : 1.6 + i * 0.22} chart={chart} />)}
              </motion.div>
            </motion.div>

            {/* story-energy flowing from the book to the worlds */}
            {world === "reader" && <EnergySparks still={still} hot={hotIsle} chart={chart} />}

            {/* tonight's events drifting up from the canopy */}
            {world === "reader" && <StoryPulse still={still} />}
            </div>

            {/* near shore — the same current, opposite phase: one gravity, one tide */}
            <div className="absolute inset-0" style={{ transform: "translateZ(90px) scale(0.922)" }}>
            <motion.div
              className="absolute inset-0"
              animate={still ? {} : { x: [0, 9, 0, -9, 0], y: [0, -5, 0, 5, 0] }}
              transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
            >
            {/* near story-worlds drifting in front */}
            {world === "reader" &&
              sats.filter((s) => s.depth === "front").map((s, i) => (
                <SatelliteIsland key={s.key} s={s} par={par} still={still} delay={still ? 0 : 1.7 + i * 0.3} onEnter={() => enterShore(s)} onHot={setHotIsle} chart={chart} />
              ))}

            {/* the long table — tonight's live story tables */}
            {world === "reader" && <LongTableIsle par={par} still={still} delay={still ? 0 : 2.2} onEnter={enterTables} onHot={setHotIsle} chart={chart} />}
            </motion.div>
            </div>

            {/* nearest veil */}
            <div className="absolute inset-0" style={{ transform: "translateZ(150px) scale(0.87)" }}>

            {/* near mist + wisps that cross in front of the island */}
            <motion.div
              aria-hidden
              animate={{ x: par.x * -26, y: par.y * -12 }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="pointer-events-none absolute inset-0"
            >
              <div
                className="absolute -bottom-10 left-1/2 h-[34vh] w-[140vw] -translate-x-1/2"
                style={{ background: `radial-gradient(60% 100% at 50% 100%, rgba(${w.ink},0.16), transparent 70%)` }}
              />
              {!still && (
                <>
                  <MistBand top="66%" width="52vw" height="11vh" opacity={0.06} dur={36} delay={5} color="#f2eafc" />
                  <MistBand top="78%" width="64vw" height="13vh" opacity={0.05} dur={52} delay={14} color="#e8ddf5" />
                  {/* the sea of mist every island floats above — the shared floor */}
                  <MistBand top="84%" width="130vw" height="24vh" opacity={0.14} dur={58} delay={0} color="#d8c8ee" />
                  <MistBand top="92%" width="150vw" height="26vh" opacity={0.18} dur={70} delay={8} color="#cdb9e8" />
                </>
              )}
              {/* each world's light pooling on that sea */}
              <MistPools world={world} still={still} />
            </motion.div>
            <motion.div animate={{ x: par.x * -34, y: par.y * -16 }} transition={{ type: "spring", stiffness: 50, damping: 20 }} className="pointer-events-none absolute inset-0">
              <ForegroundMotes ink={w.ink} still={still} />
            </motion.div>
            </div>
              </motion.div>
            </div>

            {/* the visitor's attention is light — a warm pool that follows the cursor,
                brightening whatever it passes over */}
            {!still && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 z-10 -ml-[190px] -mt-[190px] h-[380px] w-[380px] rounded-full mix-blend-screen"
                style={{ background: `radial-gradient(circle, rgba(${GOLDL},0.1), rgba(${GOLDL},0.04) 45%, transparent 70%)` }}
                animate={{ x: cursor.x, y: cursor.y }}
                transition={{ type: "spring", stiffness: 90, damping: 22 }}
              />
            )}

            {/* headline + the one door forward */}
            <div className="pointer-events-none absolute inset-x-0 top-[8.5%] z-20 flex flex-col items-center gap-4 px-6 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: still ? 0 : 0.5, duration: 0.8 }}
                className="max-w-3xl font-display text-3xl font-light leading-tight [text-wrap:balance] md:text-5xl"
                style={{ color: P(0.96), textShadow: `0 0 60px rgba(${w.ink},0.35)` }}
              >
                {w.headline}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: still ? 0 : 0.8, duration: 0.8 }}
                className="max-w-md text-[13px] leading-relaxed"
                style={{ color: P(0.55) }}
              >
                {w.sub}
              </motion.p>
            </div>

            {/* the door itself — the CTA sits on the open book, where the sparks are born */}
            <div className="pointer-events-none absolute inset-x-0 top-[74.5%] z-20 flex justify-center">
              <div className="group/cta pointer-events-auto relative">
              <div
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 w-max max-w-[270px] -translate-x-1/2 translate-y-1 rounded-xl border border-white/12 bg-black/80 px-4 py-3.5 text-left opacity-0 backdrop-blur-md transition-all duration-200 group-hover/cta:translate-y-0 group-hover/cta:opacity-100"
              >
                {world === "reader" ? (
                  lastTale ? (
                    <>
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgb(${AMETHL})` }}>
                        where you left off
                      </span>
                      <h3 className="mt-0.5 font-display text-[16px] leading-tight text-paper">{lastTale.title}</h3>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.4) }}>
                        by {lastTale.author}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: P(0.62) }}>
                        The page is still warm. Pick up exactly where the story left you.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgb(${AMETHL})` }}>
                        tonight&apos;s tale
                      </span>
                      <h3 className="mt-0.5 font-display text-[16px] leading-tight text-paper">{TONIGHT.title}</h3>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: P(0.4) }}>
                        by {TONIGHT.author} · 8 min
                      </p>
                      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: P(0.62) }}>
                        A garden that blooms only at low tide, and a boy with no footprints.
                      </p>
                    </>
                  )
                ) : (
                  <>
                    <span className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: `rgb(${GOLDL})` }}>
                      your first page
                    </span>
                    <h3 className="mt-0.5 font-display text-[16px] leading-tight text-paper">A blank page, already yours</h3>
                    <p className="mt-1.5 text-[11px] leading-snug" style={{ color: P(0.62) }}>
                      Write before you sign up — every word is kept.
                    </p>
                  </>
                )}
              </div>
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: still ? 0 : 1.5, duration: 0.7 }}
                onClick={() => {
                  if (world === "reader") {
                    const t = lastTale ?? TONIGHT;
                    openTale(t, t.shoreKey ? (sats.find((x) => x.key === t.shoreKey) ?? null) : null);
                  } else {
                    setStage("page");
                  }
                }}
                className="pointer-events-auto cursor-pointer rounded-full px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] backdrop-blur-md transition-all hover:scale-[1.05] hover:brightness-115"
                style={{
                  backgroundColor: "rgba(20,14,26,0.55)",
                  color: P(0.97),
                  border: `1px solid rgba(${w.light},0.7)`,
                  boxShadow: `0 0 44px rgba(${GOLD},0.45), 0 0 90px rgba(${w.ink},0.3), inset 0 0 18px rgba(${w.ink},0.3)`,
                  textShadow: `0 0 12px rgba(${w.ink},0.9)`,
                }}
              >
                {world === "reader" && lastTale ? "Continue reading" : w.cta}
              </motion.button>
              {world === "reader" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: still ? 0 : 1.9, duration: 0.7 }} className="mt-3 text-center">
                  <Link
                    href="/browse"
                    className="pointer-events-auto font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
                    style={{ color: P(0.38) }}
                  >
                    or browse all stories →
                  </Link>
                </motion.div>
              )}
              </div>
            </div>

            {/* demo affordance — would be subtler (or absent) in production */}
            <button
              type="button"
              onClick={restart}
              className="absolute left-6 top-7 z-20 cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
              style={{ color: P(0.3) }}
            >
              ⟵ the other door
            </button>
            <div className="pointer-events-none absolute right-6 top-6 z-20 flex items-center gap-2" style={{ color: P(0.5) }}>
              <QuillRingMark className="h-6 w-6" />
            </div>
            <Link
              href="/browse"
              className="absolute bottom-7 right-7 z-20 font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
              style={{ color: P(0.3) }}
            >
              or wander the stacks →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* stage 3.5 — the shore of a chosen world */}
      <AnimatePresence>
        {stage === "shore" && shore && (
          <ShoreStage
            key={`shore-${shore.key}`}
            s={shore}
            still={still}
            onPick={(st) =>
              openTale(
                { eyebrow: `${shore.eyebrow} · chapter one`, title: st.title, author: st.author, accent: shore.light, paras: st.paras, shoreKey: shore.key, slug: st.slug, firstChapterId: st.firstChapterId },
                shore,
              )
            }
            onBack={() => setStage("world")}
          />
        )}
      </AnimatePresence>

      {/* stage 3.6 — the long table, three tables playing tonight */}
      <AnimatePresence>
        {stage === "tables" && <TablesStage key="tables" still={still} onWatch={() => setStage("gallery")} onBack={() => setStage("world")} />}
      </AnimatePresence>

      {/* stage 3.7 — the gallery of the live table */}
      <AnimatePresence>
        {stage === "gallery" && <GalleryStage key="gallery" still={still} onBack={() => setStage("tables")} />}
      </AnimatePresence>

      {/* stage 3.8 — the great library, shelves inside the tree */}
      <AnimatePresence>
        {stage === "library" && (
          <LibraryStage
            key="library"
            sats={sats}
            still={still}
            onBack={() => setStage("world")}
            onPick={(st, sat) =>
              openTale(
                { eyebrow: `${sat.eyebrow} · chapter one`, title: st.title, author: st.author, accent: sat.light, paras: st.paras, shoreKey: sat.key, slug: st.slug, firstChapterId: st.firstChapterId },
                sat,
              )
            }
          />
        )}
      </AnimatePresence>

      {/* stage 4 — the window becomes the page */}
      <AnimatePresence>
        {stage === "page" && world && (
          <motion.div
            key={`page-${world}`}
            className="absolute inset-0 z-30 overflow-y-auto"
            initial={still ? { opacity: 0 } : { clipPath: "inset(42% 42% 42% 42% round 26px)", opacity: 0.4 }}
            animate={still ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0% round 0px)", opacity: 1 }}
            transition={{ duration: still ? 0.2 : 0.95, ease: [0.65, 0, 0.25, 1] }}
            style={{ backgroundColor: world === "writer" ? "#13100b" : "#0d0a14" }}
          >
            <div className="pointer-events-none absolute left-1/2 top-7 z-20 flex -translate-x-1/2 items-center gap-2" style={{ color: P(0.45) }}>
              <QuillRingMark className="h-5 w-5" />
              <QuiloriaWordmark className="font-display text-sm" />
            </div>
            {world === "writer" ? (
              <WriterPage onRestart={restart} />
            ) : (
              <ReaderPage tale={tale ?? TONIGHT} onRestart={restart} onBack={shore ? () => setStage("shore") : undefined} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* the traveler */}
      <TheMote stage={stage} world={world} still={still} focus={hotIsle} />

      {/* the quiet instruments — a map and a hush, never in the way */}
      <div className="absolute bottom-7 left-6 z-40 flex items-center gap-5">
        {stage === "world" && (
          <button
            type="button"
            onClick={() => setChart((c) => !c)}
            className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
            style={{ color: chart ? `rgb(${GOLDL})` : P(0.3) }}
          >
            ✧ star chart
          </button>
        )}
        <button
          type="button"
          onClick={ambient.toggle}
          className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.2em] transition-colors hover:text-paper"
          style={{ color: ambient.on ? `rgb(${GOLDL})` : P(0.3) }}
        >
          {ambient.on ? "♪ hush" : "♪ let the world sound"}
        </button>
      </div>

      {/* cinematic grade: film grain + vignette over everything */}
      {stage !== "crossing" && (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-50 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-50" style={{ background: "radial-gradient(120% 95% at 50% 45%, transparent 58%, rgba(0,0,0,0.48) 100%)" }} />
    </div>
  );
}
