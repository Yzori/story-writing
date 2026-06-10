# Quiloria — Technical Decisions & Research

> Research-backed decisions for building the editor and platform. The framework and UX research were conducted March 2026; the "as-built" notes reflect what actually shipped as of June 2026. Where reality diverged from the original plan, both are recorded honestly.

---

## Table of Contents

1. [Stack at a Glance (As Built)](#stack-at-a-glance-as-built)
2. [Editor Framework](#editor-framework)
3. [Document Architecture](#document-architecture)
4. [Collaboration & Revisions](#collaboration--revisions)
5. [Data Layer](#data-layer)
6. [Auth](#auth)
7. [Payments & AI](#payments--ai)
8. [Offline & PWA](#offline--pwa)
9. [Typography & Reading Experience](#typography--reading-experience)
10. [Writing Experience Design](#writing-experience-design)
11. [CSS & Layout Strategy](#css--layout-strategy)
12. [Competitive Insights](#competitive-insights)

---

## Stack at a Glance (As Built)

```
FRAMEWORK     Next.js 16 (App Router) · React 19 · TypeScript 5
EDITOR        Tiptap v3 (ProseMirror) + custom extensions (illustrated blocks, etc.)
STYLING       Tailwind CSS 4 (@theme inline, CSS custom properties) · Framer Motion 12
DATA          PostgreSQL via Drizzle ORM (postgres.js driver)
AUTH          NextAuth v5 (beta) — Credentials + GitHub, @auth/drizzle-adapter, JWT sessions
PAYMENTS      Stripe (subscriptions, Ink Drops checkout, webhooks) + Ink Drops ledger
AI            Anthropic Claude (@anthropic-ai/sdk) — Editor's Desk + Story Intelligence
EMAIL         Resend (per-type templates, digest modes)
SECURITY      isomorphic-dompurify (sanitization), in-memory sliding-window rate limiting
IMPORT/EXPORT mammoth (DOCX import), jszip, PDF/DOCX export
PWA           manifest + offline app shell
SCALE         ~70 DB tables · ~135 API routes · ~90 pages
```

Schema lives at `src/server/db/schema.ts` (+ `auth-schema.ts`); migrations in `drizzle/` (0001–0044+).

---

## Editor Framework

### Decision: Tiptap v3 (ProseMirror-based) — shipped

**Why Tiptap over alternatives:**

| Framework | Verdict | Key Issue |
|---|---|---|
| **Tiptap v3** | **Selected** | Best ecosystem, extensibility, and a clean React integration |
| Plate (Slate) | Strong runner-up | Slate has performance concerns at 50k+ words; smaller ecosystem |
| Lexical (Meta) | Watch list | Best raw performance, but weaker plugin ecosystem |
| Novel | Rejected | Abandoned — stale |
| BlockNote | Rejected | Block-per-paragraph model fights prose flow |
| Raw ProseMirror | Fallback | Only if Tiptap can't handle our customization needs |

**Tiptap strengths for our use case:**
- Tree-shakable extensions — we ship only what we use (`starter-kit`, `character-count`, `highlight`, `typography`, `underline`, `placeholder`, `focus`, `dropcursor`, plus custom nodes)
- Custom node types for story-specific blocks (scene breaks, epigraphs, author notes, illustrated blocks) are well-supported
- The largest community for troubleshooting

**Known risk: long-document performance.** ProseMirror renders the full DOM; at 50k+ words in a single instance, performance degrades. **Mitigation (shipped): chapter-per-editor-instance** — each chapter is its own document and editor mount. This is the standard pattern used by Scrivener, Ulysses, and every serious long-form tool.

**Fallback plan:** If we hit Tiptap's ceiling, Lexical's double-buffering architecture is a different performance profile — a last-resort migration, not a planned path.

---

## Document Architecture

### Decision: chapter-per-document, server-persisted HTML

A novel is not a single document — it's a collection of chapters, each a self-contained editing unit. This mirrors how writers think and how serious writing tools work internally.

**As built:**
- Each **chapter** is a row in the `chapters` table; its content is sanitized editor HTML, persisted to PostgreSQL.
- Each chapter loads independently — opening Chapter 15 doesn't load chapters 1–14.
- Comic/webtoon content uses a separate `panels` model (panel-as-unit), and uploaded media is moving to first-class `story_assets` rows referenced from editor HTML rather than inlined data URLs (see [EDITOR_RELIABILITY_NEXT_STEPS.md](./EDITOR_RELIABILITY_NEXT_STEPS.md)).
- Chapter ordering and parts/acts are structural metadata, not separate documents.

> **Note — divergence from original plan.** The March 2026 design called for **Yjs subdocuments per chapter** with CRDT state as the source of truth. That was not built. The shipped product persists sanitized HTML per chapter with explicit save/autosave, and handles "collaboration" asynchronously (see below). Yjs/CRDT remains the path **if and when real-time co-editing is prioritized** — the chapter-per-document boundary keeps that migration tractable.

---

## Collaboration & Revisions

### As built: async suggestions + server snapshots (not real-time CRDT)

Real-time collaborative editing was explicitly deferred in the MVP and has not shipped. What ships instead:

- **Revision history** via the `chapter_snapshots` table — autosave plus manual "save current version" snapshots, stored server-side. The autosave/snapshot logic lives in `use-chapter-autosave.ts`; remaining persistence hardening is tracked in [EDITOR_RELIABILITY_NEXT_STEPS.md](./EDITOR_RELIABILITY_NEXT_STEPS.md).
- **Collaboration is asynchronous** — collaborators submit **Suggestions** (`suggestions` table) that the owner Weaves/Revises/Passes, contribute to a shared **Lore Book** (`lore_entries`), and discuss in **Workshop messages** and **editor comment threads** (`editor_comment_threads` / `_replies`). Access is gated by a signed **Creative Agreement** (`agreements`, `agreement_confirmations`).
- **Editor presence** (`editor_presence`) gives lightweight "who's here" awareness without full CRDT sync.
- **Adventure Mode** is the one place with near-real-time multi-user writing, but it is **turn-based by design** (GM-directed turns, server-arbitrated order) — not concurrent free-edit — so it needs no CRDT.

### Future: real-time co-editing

If prioritized, the path is Yjs + a WebSocket sync server (Hocuspocus or a managed option like Liveblocks / Cloudflare Durable Objects), with each chapter as a room. Deferred until demand and ops capacity justify it.

---

## Data Layer

### Decision: PostgreSQL + Drizzle ORM (postgres.js) — shipped

> **Divergence from original plan.** The March 2026 doc named **Prisma**. The product shipped on **Drizzle ORM** with the `postgres.js` driver instead — lighter runtime, SQL-first query builder, first-class TypeScript inference, and clean migration files in `drizzle/`.

- ~70 tables spanning content (`stories`, `chapters`, `panels`, `story_assets`, `bible_entries`), social (`sparks`, `follows`, `comments`, `reactions`, `notifications`, `annotations`), collaboration (`collaborators`, `agreements`, `suggestions`, `open_calls`, `lore_entries`, `workshop_messages`), adventure (`campaign_sessions`, `campaign_turns`, `player_characters`, `progress_clocks`, floor/spectator tables), and the creator economy (`creator_circles`, `circle_subscriptions`, `content_unlocks`, `offerings`, `commissions`, `story_donations`, `crossroads`, `ink_drop_transactions`, `story_boosts`).
- Zod (`src/lib/validations.ts`) validates all API inputs.
- Media: image references in editor HTML; first-class `story_assets` for uploaded media (migrating away from inline data URLs).

---

## Auth

### Decision: NextAuth v5 (beta) — shipped

- Providers: **Credentials** (email/password) + **GitHub** OAuth.
- `@auth/drizzle-adapter` over the Drizzle schema; **JWT** sessions.
- Custom hardening: `password_reset_tokens`, `auth_rate_limits`, `login_attempts` tables; middleware route protection (`src/middleware.ts`); per-story role checks (`src/server/permissions.ts`).

---

## Payments & AI

### Payments — Stripe + Ink Drops

- **Stripe** powers platform subscriptions (Pro/Premium), creator subscriptions (The Circle), and Ink Drops top-ups, with a webhook handler (`/api/webhooks/stripe`) and a billing portal.
- **Ink Drops** is the internal currency for tips, unlocks, donations, commissions, and Crossroads — a server-side ledger (`ink_drop_transactions`, `transferDrops` in `server/services/ink-drops.ts`) with a single canonical `DROPS_TO_USD` constant.
- A **cron** endpoint (`/api/cron`) handles Circle renewals, commission auto-complete, and AI daily-usage resets.

### AI — Anthropic Claude as private editorial support

- `@anthropic-ai/sdk` via `src/server/services/ai.ts`; interactive tier uses **Claude Haiku** (`claude-3-5-haiku`).
- **Editor's Desk** (selected-text polish/review) and **Story Intelligence** (cached summaries, continuity, plot-hole reports in `story_intelligence_artifacts`) — tier-gated and rate-limited. See [AI_ASSISTANT.md](./AI_ASSISTANT.md).
- Principle: AI assists, never authors. Requires `ANTHROPIC_API_KEY`.

---

## Offline & PWA

Writers write everywhere. The app ships a **PWA manifest** and an offline app shell (service worker) so the editor loads instantly. The original plan paired this with `y-indexeddb` for offline document persistence under a CRDT model; since the shipped data model is server-persisted HTML rather than Yjs, offline durability is currently best-effort at the app-shell level. Full offline-edit-and-sync remains tied to the future real-time co-editing work.

---

## Typography & Reading Experience

### Reading View Typography

- **Reading serif:** Literata (shipped) — a screen-optimized literary serif. Reader can switch fonts (including Playfair Display / DM Sans) and a dyslexia-friendly option.
- **Display:** Fraunces. **Body/UI:** Plus Jakarta Sans. **Mono:** IBM Plex Mono (used for screenplay format).

**Optimal reading parameters:**
| Property | Value | Rationale |
|---|---|---|
| Line length | 60–70 characters | Research sweet spot; ~66 ideal |
| Line height | 1.5× font size | WCAG-recommended, comfortable for long reading |
| Paragraph spacing | 1.5–2× font size | Prevents "wall of text" without breaking flow |
| Base font size | 18px | This is a reading app, not a website |

**OpenType (always on for reading):** `kern`, `liga`, `clig`, `onum`, `pnum`.

**Line breaking:** `text-wrap: pretty` + `hyphens: auto` for body; `text-wrap: balance` for headings. Respect `prefers-reduced-motion`.

**Dark mode (Lamplight):** never pure white on pure black — warm off-white on firelit umber; slightly lighter weight and increased letter-spacing in the dark theme.

### Reading View Modes

Offer **pagination, scroll, and webtoon-vertical**, all shipped. Pagination builds spatial memory for narrative; scroll handles reflow; webtoon-vertical is the comic standard. Reading progress uses a chapter-based indicator.

### Reader Customization (shipped from day one)

Font choice, size, line height, reading mode, and comfort rating — persisted to the user record (`comfortRating`, `readingMode`, `readingFont`) and dual-written to localStorage. Customization is a performance feature: research shows a ~35% reading-speed difference between best and worst fonts per individual, with no comprehension penalty.

---

## Writing Experience Design

### Lessons from the competition

The gap no tool fills: **simple by default, powerful on demand.** iA Writer nails simplicity but lacks structure; Scrivener nails structure but overwhelms. We aim for both through progressive disclosure.

| Source | Innovation | How we use it |
|---|---|---|
| iA Writer | Focus mode (dims all but the current line) | Shipped — distraction-free writing |
| Scrivener | Binder (chapter/scene tree) | Chapter navigator, drag-to-reorder, outline view |
| Ulysses | Progressive disclosure | Toolbar on selection, not permanent; three-room cockpit |
| Novelcrafter | The Codex (inline character profiles) | Story Bible / Lore Book integration |
| Obsidian | Local-first, your-files-forever | Export to DOCX/PDF always available; DOCX import |

### Editor design principles (shipped)

1. **The editor is not the reading view** — distinct mode, distinct feel; a preview shows the reading view.
2. **Canvas sovereignty** — minimal chrome; toolbar floats on selection.
3. **Command palette for everything** — Cmd+K to insert, navigate, set mood, toggle focus, run Editor's Desk.
4. **Focus mode is real** — full-screen, current paragraph only.
5. **Chapter navigator always accessible** — collapsible tree with per-chapter word counts.
6. **Stats without pressure** — word count and reading-time available on demand; no guilt-driven gamification (reading streaks are a separate reader-side feature).
7. **Calm cockpit** — three rooms (Write / Structure / Context) instead of ten always-on panels; first run is silenced; publish is gated behind readiness.

---

## CSS & Layout Strategy

### Modern CSS we use

| Feature | Use case |
|---|---|
| Container queries | Editor/reading panels that adapt to their container |
| View Transitions API | Chapter-to-chapter navigation |
| Scroll-driven animations | Reading progress, reveals — zero JS |
| `text-wrap: pretty` / `balance` | Prose line-breaking; heading equalization |
| `oklch` / `oklab` | Perceptually uniform colors for the Lamplight/Daybreak palettes |
| Variable fonts | Weight/grade adjustment per theme |

Tailwind CSS 4 drives the system via `@theme inline` and CSS custom properties (see [COLOR_SYSTEM.md](./COLOR_SYSTEM.md)).

### Annotation data model

**Content-first, not URL-first.** Marginalia/annotations (`annotations` table) anchor to content identifiers + a text-quote selector with the quoted text as a fuzzy-match fallback — because the same content renders at multiple URLs, reflows across viewports, and changes across revisions. Modeled on the W3C Web Annotation standard.

---

## Competitive Insights

### The gap in the market

No existing tool combines: beautiful distraction-free writing (iA Writer level) · structural organization (Scrivener level) · a reading audience and serialization (Wattpad level) · format-native comic/poetry/script editors · equal-credit creative collaboration · fiction-native monetization · and a live play mode. The tools that come closest nail two or three of these and fail the rest. **That is the opportunity.**

### Key writer pain points (forums, Reddit, reviews)

1. The "Scrivener problem" — powerful tools overwhelm; simple tools lack power.
2. Performance at scale — web tools choke past 50k words.
3. Export hell — formatting breaks across formats.
4. Fragmented workflow — 3–5 tools for planning, drafting, formatting, collaboration, publishing.
5. Collaboration is an afterthought — only Google Docs does it well, and it's wrong for fiction.
6. No path from a messy draft to a structured one.

---

*Decision baseline: March 2026. As-built reconciliation: June 2026. Revisit when a core framework releases a major version or when real-time co-editing is prioritized.*
