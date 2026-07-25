# The Studio, next — research on `/dashboard`

**Date:** 2026-07-24 · **Status:** research, nothing built
**Subject:** `src/app/dashboard/page.tsx` (1099 lines, client component), `src/components/dashboard/useStudioData.ts`, `src/app/api/dashboard/route.ts`

The studio is good. It survived four rejected concepts to get here, and the thing that
made it survive — *craft applied to true things, nothing invented, everything quoted* —
is not up for revision. This document does not propose a new metaphor. It proposes:

1. **the true things it doesn't know about yet** (the flagship is invisible on it),
2. **the structure that lets the next ten signals land without a rewrite**,
3. **the craft debts** that will bite on a second theme, a wide screen, or a slow network.

---

## 1. The gap that matters most: the flagship isn't on the dashboard

`/api/campaigns/mine` filters `writingMode = 'campaign'` — the *legacy* system. The whole
adventures subsystem shipped on this branch (`adventures`, `adventureSeats`,
`adventureAudiencePresence`, `adventureSeatPresence`, SSE at
`/api/adventures/[id]/stream`, the board, backings, suggestions) is referenced by the
dashboard **only to exclude it**: `ne(stories.writingMode, "adventure")` in the API,
`writingMode !== "adventure"` in the hook, and one shelf chip.

So the hero can say *"The table is lit"* only for a campaign that predates the reset.
Meanwhile the adventures schema holds the single most urgent fact this product can ever
show a person:

```
adventures.spotlightSeatId   -- whose turn it is
adventures.spotlightSince
adventures.spotlightDueAt    -- when their turn expires
adventures.status            -- casting | running | finished | abandoned
```

**`spotlightDueAt` is a real deadline on a real person's real turn.** Nothing else on the
page competes with it. A studio that opens with

> *The table is waiting on you. Four hours until the scene moves on.*

is honest urgency — the opposite of a streak-badge — and it is already in the database.
Nothing needs inventing.

### What the dashboard should learn to ask
| Signal | Source (exists today) | Where it lands |
|---|---|---|
| My turn is due at a table | `adventures` + `adventureSeats` where `userId = me`, `spotlightSeatId = my seat` | **hero**, top of heat order, with the clock |
| A table I sit at is running without me | same, `spotlightSeatId != my seat` | hero (second) / arrivals |
| My table is still casting, N seats open | `adventures.status='casting'` + open seats | "On your desk" |
| Someone is watching my table right now | `adventureAudiencePresence` (heartbeat) | presence line — see §3 |
| Applications to my table | `adventureApplications` | "On your desk" ledger row |
| A suggestion from the audience was written in | `adventureSuggestions` (Journey Plan 0.6) | "While you were away", quoted |
| Boards matching my pace | `/api/adventures/board` | "The stacks" |

That's one new block inside the existing `Promise.all` in `/api/dashboard/route.ts` and one
new hero variant. It is the highest-value change on this page by a wide margin.

### Related heat bug
`hero` is a ternary chain: `liveTable ? "table" : manuscript ? …`. `liveTable` is any
campaign with an `activeSession` row — **no recency check**. A session someone forgot to
close six weeks ago permanently outranks the manuscript. (Memory already flagged this as
"tune hero heat weights if live-table-always-wins feels wrong" — with `spotlightDueAt`
there's finally an honest tiebreaker.)

---

## 2. Presence: the wish that finally has infrastructure

Every earlier round of this design landed on the same north star — *"the wow is the story
alive in others' hands"* — and every round shelved it with the same note: **no infra**.

That note is now stale. On this branch there are four presence tables with heartbeats:

```
editorPresence          (co-op writers in a chapter)
spectatorPresence       (legacy campaign watchers)
adventureAudiencePresence  (the house watching a table)
adventureSeatPresence      (writers at the table)
```

and a working SSE pattern (`src/server/sse.ts`, `use-adventure-watch.ts`,
`use-spectator-session.ts`) that the dashboard does not use — it polls five endpoints
every 60s instead.

**Proposal — one presence line, honest or absent.** Not a widget, not a counter that
inflates. One line in the film's voice, rendered only when the number is real and > 0:

> *Two lanterns are lit in* **The Salt Road** *right now.*

Reader-side presence for published stories still has no table (reading is stateless), but
`readingProgress.updatedAt` inside a 5-minute window is a defensible proxy, and the
honesty constraint from the original blueprint applies: never render zero, never fuzz
upward, never say "someone" when it's a bot. If it can't be true, it doesn't ship.

---

## 3. The structural problem: sections are hardcoded

The page is one 1099-line client component with sections written out inline: greeting,
hero (4 variants), while-you-were-away, on-your-desk, arrivals, shelf, drawer, stacks.
Ordering is source order. Visibility is `hasGifts &&`, `hasAsks &&`, `isWriter &&`.

Now read the Journey Plan (`docs/JOURNEY_PLAN.md`) and count what it will hand this page:

- **2.5 the echo** — "your line from Chapter 7 was clipped 40 times"
- **1.2 scheduled drops** — "Chapter 12 goes out Thursday 20:00"
- **5.1 lanterns** — "9 people are waiting for Thursday"
- **5.2 streak-at-risk**
- **0.6 canonized suggestion** — "your line was written into ⟨book⟩"
- **4.2 the invitation** — "take a seat at the next table"

Six new beats, each of which today means editing the monolith and hand-placing a
`<section className="mt-20">`. That doesn't survive.

### Proposal: a beat registry

Turn each section into a declared **beat** — the page becomes a composer, not a layout.

```ts
// src/components/dashboard/beats/types.ts
export interface Beat {
  id: string;                            // 'manuscript' | 'turn-due' | 'echo' | …
  slot: "hero" | "body" | "margin";
  /** 0 when this beat has nothing true to say — it does not render. */
  heat: (d: StudioData) => number;
  render: (d: StudioData, ctx: BeatCtx) => React.ReactNode;
}
```

- **Hero selection stops being a ternary** and becomes `max(heat)` over `slot: "hero"`
  beats. `turn-due` returns `1000 - hoursLeft`; `live-table` returns a value that decays
  with session staleness; `manuscript` returns freshness-weighted; `bookmark` returns low
  but never zero for pure readers. The rule *"no hat-picking, the surface adapts by heat"*
  becomes a function you can read, test, and tune in one place.
- **Body order stops being source order.** Sort by heat. A week with 40 clips leads with
  the echo; a quiet week leads with arrivals.
- **New signals are additive** — a file in `beats/`, not surgery on the page.
- **It makes the page testable.** Today you cannot unit-test "which hero does a pure
  reader with one live table get?" without rendering 1099 lines of Framer Motion.

The visual grammar (SectionLabel, LedgerRow, InkWords, HeroCta) is already the right set
of primitives — they just need to move out of `page.tsx` into `studio-kit.tsx` so beats
can use them.

**This is the "future proof" answer.** Everything else in this doc is a feature; this is
the thing that decides whether the next six features cost a day each or a week each.

### Second-order: personalization without hat-picking
Once beats are scored, `writingSessions` (already queried for `wordsTrend`) gives a
per-user hour-of-day histogram. A night writer's evening studio leads with the
manuscript; their morning studio leads with arrivals. Same page, no toggle, no setting —
which is exactly the "adaptive, never a mode switch" principle the concept converged on,
applied to *sequence* rather than just to the hero.

---

## 4. Rendering & data: the page is doing it the 2023 way

`page.tsx` is `"use client"` top to bottom. On every visit:

1. HTML ships with a greeting and three pulsing grey rectangles.
2. React hydrates.
3. `useStudioData` fires **five** parallel fetches (`/api/stories?mine=true`,
   `/api/campaigns/mine`, `/api/notifications`, `/api/dashboard`, `/api/discover`).
4. Only after all five settle does `loaded` flip and the hero appear.

That is a full client waterfall for content that is 100% server-derivable, on Next.js 16
where it doesn't have to be.

**Proposal:**
- Make `page.tsx` a **server component**. Fetch the hero's data server-side and render the
  manuscript page — with the user's real closing lines — in the initial HTML. The
  luminous-vellum hero *is* the LCP element; today it is guaranteed to arrive after two
  round trips.
- Stream the rest with `<Suspense>` per beat. Each beat gets its own boundary, so a slow
  `/api/discover` no longer holds the shelf hostage, and one failing signal degrades to a
  missing section instead of nothing (today: `error && allStories.length === 0` is
  all-or-nothing).
- **Kill the 60s poll of five endpoints.** Almost nothing on this page changes minute to
  minute. What *does* change (turn clock, table presence, live session) is exactly what
  SSE already exists for. Rule: static beats render server-side and refresh on
  focus/`router.refresh()`; live beats subscribe to a stream **only when a live thing
  exists**. Today, a user with no live anything still burns 300 requests an hour per open
  tab.
- `/api/stories?mine=true` returns full story rows to draw a 10-book shelf; a
  `?fields=shelf` projection or a dedicated shelf query would cut the payload sharply.
- `/api/dashboard` runs 13 queries in one `Promise.all` on **every** poll, including
  queries for sections that won't render (commissions for a user with no offerings,
  suggestions for a solo writer). Server components let each beat fetch its own data, with
  `unstable_cache` + tag invalidation on the ones that are safe to cache
  (`trending`, `wordsTrend`, `readingStreak`).

**Measure before optimizing:** LCP is likely hurt by the word-by-word greeting reveal
(`NarratorLine` staggers 0.07s/word, so a 9-word line finishes ~0.9s after mount) — that
text is above the fold and may well be the LCP candidate. Keep the effect; consider
rendering the line as static text server-side and animating opacity per word from a
non-zero floor, so the pixels exist immediately.

---

## 5. Craft debts

### 5.1 The accent colours bypass the theme system
`page.tsx` hardcodes RGB triplets:

```ts
const ROSE = "184,105,122";  const GOLD = "224,169,62";
const AMETHYST = "168,140,200";  const AMBER = "224,164,88";  const SAGE = "124,160,116";
const INK_GOLD = "178,132,50";
```

But `globals.css` already defines exactly these as theme-aware tokens —
`--t-sprite-gold` is `224, 169, 62` at night and **`148, 104, 20`** in Vellum. So the
ink motes, the self-drawing rules, the hero CTA glow and the ledger accents stay
night-gold on the light theme, while the sprites beside them correctly darken. This is the
same class of bug that already cost a round of rework (the black-shadow / dark-SVG pass
that produced `--t-shadow-book`, `--t-contact-shadow`, `--t-cozy-*`).

Fix: promote these six to `--t-accent-*` raw triplets and read them via CSS vars. It is
mechanical, and it is the difference between "theme two works" and "theme three is a
rewrite."

Same file, same class: `shadow-[0_40px_90px_rgba(0,0,0,0.65)]` on the manuscript sheet and
`from-black/55` on the book's bound edge are raw black in a themed page.

### 5.2 The page doesn't earn its width
Everything lives in one `max-w-4xl` column. On a 1440px screen the margins are empty
enough that `SparkleFauna` was added to fill them (and then had to be pulled *inward*
because viewport-edge placement felt wrong). That's a layout telling you it wants a second
column.

**Proposal: the margin rail.** At `≥1280px`, a narrow right-hand column in marginalia
grammar — small caps, hairlines, no boxes — holding the ambient/live beats: the turn
clock, lanterns lit, who's reading now, next scheduled drop. The main column stays exactly
as it is. This is also where every Journey-Plan ambient signal can land **without
competing with the hero**, which is the pressure that will otherwise deform this page.
Drive it with container queries, not viewport media queries, so the same beats work in a
future compact/mobile-widget context.

### 5.3 The Hemingway bridge is stranded on one device
`BridgeNote` writes `localStorage['quiloria-bridge-<chapterId>']`. The research called
this the highest-leverage feature found and *"no tool does this."* As shipped it's
invisible on phone if written on laptop, and invisible to the server, so it can't appear
in the digest email, in a push, or in the editor.

It needs a column (`chapters.bridgeNote text` + `bridgeNoteAt`), capture on the way *out*
of the editor, and then it unlocks the best re-entry line this product could write:

> *You left a note: "get her out of the tower before the guard changes."*

That, not a word count, is what should sit under the manuscript hero.

### 5.4 Smaller things
- `manuscriptHref` falls back to `activeHref`, which can point at a **different story**
  when `manuscriptStory` isn't found in `allStories` — the CTA lies. Fall back to
  `/story/{slug}` or the story id, never to an unrelated story.
- The shelf silently truncates at `.slice(0, 10)` with no "all works →" affordance.
- Reader notes cap at 3/week and "answer →" opens the chapter reader, not a reply box —
  the highest-intent action on the page ends in a scroll hunt.
- The drawer shows a sparkline for words only; streak and sparks have trends available and
  render as bare numerals.
- `PhaseClock` + `useState(new Date())` on a 30s interval re-renders the whole page tree
  twice a minute (whole-page context, no memo boundary) — cheap now, less cheap once beats
  multiply.
- `LAST_SEEN_KEY` is localStorage, so the greeting resets per device: sign in on a new
  phone after a month away and the narrator says *"The lamps are lit"* as though it's your
  first night. `users.lastSeenAt` would make the best line on the page true everywhere.

---

## 6. Ordered recommendation

| # | Change | Why now | Size |
|---|---|---|---|
| 1 | **Adventures on the dashboard** — turn-due hero + table beats | The flagship is invisible on the home surface; `spotlightDueAt` is the strongest true urgency in the DB | M |
| 2 | **Beat registry + heat scoring** | Decides the cost of the next six Journey-Plan signals; makes hero selection testable | M |
| 3 | **Accent colours → theme tokens** | Vellum is already subtly wrong; mechanical fix | S |
| 4 | **Bridge note → DB, captured in the editor** | Highest-leverage feature in the research, currently one-device | M |
| 5 | **Server component + per-beat Suspense; drop the 5× poll** | LCP, cost, and the precondition for SSE-backed live beats | L |
| 6 | **Presence line (real heartbeats, honest or absent)** | The north star from every prior round, now that infra exists | M |
| 7 | **Margin rail at ≥1280** | Gives ambient signals a home that doesn't fight the hero | M |

1–4 are independent and each valuable alone. 5 is the one that wants a clear run at it.

## Explicitly not proposed

No new metaphor. Not a room, not a diptych, not a map, not a bento, not a mode toggle, not
a lens rail — all of those were tried and rejected, and the current studio is the thing
that survived them. Every proposal above is either a fact the page doesn't yet know, or
the structure to hold facts it's about to be handed.
