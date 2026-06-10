# Quiloria — Product Brief

> Stories are made together, read together, played together, and paid for fairly. Quiloria is the home for the whole life of a story.

**Status:** Live product. The original MVP shipped, then grew well past it — collaboration, a live play mode, AI editorial support, and a full creator economy are all in production. This brief is the current-state source of truth. For the feature-by-feature catalog see [MVP.md](./MVP.md) (the product spec); for engineering choices see [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md).

**Last updated:** June 2026

---

## 1. What Quiloria is

Quiloria is a collaborative storytelling platform. A writer can draft a novel, a comic, a poem, a screenplay, or an illustrated book; invite an illustrator or editor to work alongside them under a plain-language agreement; serialize chapters to readers who spark, react, and follow; run a live tabletop-style play session that compiles back into publishable prose; and earn money through subscriptions, chapter unlocks, tips, and commissions — all in one place.

The thesis hasn't changed since day one: **the full creative lifecycle of a story should live under one roof.** Today that roof covers six pillars.

---

## 2. The problem

Creative storytelling is fragmented across a dozen tools that don't talk to each other:

- Writers draft in Word, Google Docs, or Scrivener — none of which understand chapters, scenes, pacing, or serialization.
- They find illustrators through chaotic Twitter threads and Discord DMs, with no shared workspace and no agreement about credit or rights.
- They publish on Wattpad or Medium, whose editors are a text box with bold/italic and whose reading experience is an ad-wrapped web page.
- Readers consume passively, with no real way to shape, support, or play inside the stories they love.
- Monetization means stitching together Patreon, Ko-fi, Gumroad, and a freelance marketplace — each taking a cut, none designed for fiction.

No single place treats writing, illustrating, editing, reading, reacting, playing, and earning as one connected experience.

---

## 3. Who it's for

Quiloria serves creators who wear many hats and readers who want to be more than spectators.

- **Writers** — novelists, serial-fiction authors, poets, screenwriters, comic scriptwriters. The editor is the product; it has to feel better than Word or Scrivener or it doesn't matter.
- **Illustrators** — first-class co-creators, not a footnote. They get a real workspace, equal credit, art-specific feedback, and an ArtStation-quality portfolio.
- **Editors & worldbuilders** — collaborators with scoped roles, suggestion flows, and a shared lore book.
- **Readers** — who spark, react, leave marginalia, follow creators, vote in polls, support with tips and unlocks, and (in Adventure Mode) help author the story live.
- **Game masters & players** — groups of 2–6 who want the unpredictability of tabletop RPGs in a collaborative-fiction context.
- **Patrons & artisans** — readers commissioning custom work, and creators offering it, through an escrow-backed marketplace.

Most people are several of these at once. Roles are hats, not categories.

---

## 4. The six pillars

### Pillar 1 — Create (the editors)
Five format-native editors, each tuned to how that medium actually works rather than one editor with toggles:

- **Novel** — block-based rich-text (Tiptap v3), chapters as the primary unit, scene breaks, epigraphs, author notes, inline and full-bleed illustration blocks, mood/tone controls, distraction-free writing, a calm three-room cockpit (write / structure / context).
- **Webtoon / Comic** — a standalone panel-based studio: upload and sequence panels, control gutters and sizing, drag-and-drop reorder, API-backed storage. Vertical-scroll reading by default.
- **Poetry** — stanza- and line-aware editor that respects the spatial nature of the form.
- **Screenplay** — industry-standard auto-formatting (scene headings, action, dialogue, parentheticals).
- **Illustrated prose** — text and art as equal partners, interleaved freely.

Universal: autosave with manual snapshots and revision history, command palette, keyboard-first flow, onboarding hints, DOCX import, and export to PDF/DOCX.

### Pillar 2 — Read
A typography-first reading experience that feels like a well-set book, not a web page. Paginated, scroll, and webtoon-vertical modes; reader font and comfort preferences; per-chapter reactions and marginalia; reading streaks and progress tracking. The **For You** reader drops returning readers straight inside a chapter picked for them — removing the four-decision gauntlet (Landing → Browse → Story → Chapter) without borrowing TikTok aesthetics. A **trending home** and a "wander the stacks" browse surface fresh and curated work.

### Pillar 3 — Collaborate
Creative collaboration as a first-class feature, in storytelling language, not git jargon:

- **Open Calls** — post "looking for an illustrator for a dark fantasy serial," receive pitches, invite a collaborator.
- **Creative Agreement** — a required, plain-language gate before any collaboration begins: ownership split, usage rights, credit, revenue share, exit terms. Templates (Equal Partners / Lead + Contributor / Work for Hire / Custom) reduce friction.
- **Workshop** — Team, Suggestions, Lore Book, and Agreement tabs per story.
- **Suggestions** — a collaborator proposes a change; the owner Weaves, Revises, or Passes. Human-readable, not raw diffs.
- **Equal credit** — "Written by X · Illustrated by Y," same size, always visible.

### Pillar 4 — Play (Adventure Mode)
A collaborative, tabletop-RPG-inspired live play mode. One person is the Game Master (narrator only — never a player), 1–5 others write as characters. Story-first, not game-first: PbtA-style 2d6 dice create dramatic consequences, character sheets are narrative tools (traits, belief, backstory) not stat blocks. A prose-assembly engine turns turns into readable prose; sessions compile into publishable chapters. Audiences can spectate live — react, send sparks and tips, vote in polls, and influence open-floor rounds. Public campaigns support applications and drop-weighted voting to join.

### Pillar 5 — Connect (community)
Sparks (the "I love this" signal, split into story sparks and art sparks), follows, per-chapter comment threads, creator updates posted to followers, notifications (in-app badge + email digests with instant/daily/weekly/off modes), a public showcase gallery, and shareable scene clips rendered to images. Content stewardship — not "moderation" — built on honest creator-set content ratings, private reader comfort filters, and trust-violation flagging with manual review.

### Pillar 6 — Earn (the creator economy)
A complete, fiction-native monetization layer denominated in **Ink Drops** (the in-app currency, with real money in/out via Stripe):

- **The Circle** — creator subscriptions (Confidant tier), auto-renewing.
- **Tiered platform plans** — Free, Pro ($9.99/mo), Premium ($29.99/mo) — gating Editor's Desk AI, analytics, exports, collaboration seats, and Story Intelligence.
- **Chapter gating** — per-chapter unlocks, bundles, early-access windows.
- **The Scriptorium** — an escrow-backed commissions marketplace (offerings → commissions → testimonials), with craft-metaphor language (Artisan, Patron, Commission).
- **Donations** ("Leave a Gift"), **Crossroads** (drop-weighted influence polls), **tips** in live sessions, and an **Earnings** breakdown by source.

### Pillar 7 — Assist (AI as private editorial support)
AI is editorial support, never the author. **Editor's Desk** polishes and reviews selected text (Cmd/Shift+K). **Story Intelligence** caches artifacts — chapter summaries, continuity reports, plot-hole detection — so deeper checks don't re-read the whole manuscript each time. Free tier gets a limited lifetime taste; paid tiers unlock daily and cached usage. Powered by Anthropic's Claude (Haiku for the interactive tier).

---

## 5. Principles

1. **Creativity-first language.** No repositories, branches, or pull requests. Stories have Paths, Retellings, Suggestions, Weaves, Sparks, and Threads. (Never call written work "prose" in user-facing copy — it's a "novel.")
2. **Writers stay in control.** Readers influence, react, and suggest; the creator always holds the pen. Collaboration is opt-in.
3. **Show the craft.** Revision history, collaboration credits, and the creative process are part of the experience.
4. **Multi-discipline by design.** Novel, comic, illustrated, poem, or script — the platform privileges none.
5. **Canvas sovereignty.** The writing surface is sacred; chrome appears on demand and vanishes when you don't need it.
6. **Trust first, intervene when trust breaks.** No pre-publication review, no algorithmic suppression — honest ratings, reader-controlled comfort filters, decisive action only on genuine harm.

---

## 6. Positioning

| Competitor | What they do | Where Quiloria wins |
|---|---|---|
| **Wattpad / Tapas** | Mass serialization | A real editor, format-native tools, equal-credit collaboration, fiction-native monetization, live play |
| **Scrivener / Ulysses** | Powerful desktop drafting | Web, collaboration, reading audience, publishing, and earning in the same place |
| **Google Docs** | Real-time co-editing | Built for fiction, not business docs — chapters, scenes, reading view, serialization |
| **Patreon / Ko-fi** | Creator support | Native to the story itself: unlocks, tips, subscriptions, commissions, all in one wallet |
| **Webtoon / Tapas (comics)** | Comic publishing | Integrated panel studio + the writer's script alongside the artist's canvas |
| **AI writing tools** | Generate the text | AI as private editorial support, never the author — the work stays the creator's |

The gap no one fills: **simple by default, powerful on demand, across the entire lifecycle of a story.**

---

## 7. Tech at a glance

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Framer Motion 12 · Tiptap 3 · Drizzle ORM on PostgreSQL (postgres.js) · NextAuth v5 · Stripe · Resend (email) · Anthropic Claude · PWA. ~70 database tables, ~135 API routes, ~90 pages. See [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md).

---

## 8. Where things stand

**Shipped and live:** all five editors and reading views, full publishing and discovery, sparks/follows/comments/notifications, the complete collaboration suite (Open Calls, agreements, workshop, suggestions, lore book), Adventure Mode with live spectating, the full creator economy (Circle, plans, unlocks, Scriptorium, donations, Crossroads, earnings), Editor's Desk + Story Intelligence AI, the For You reader, trending home, mobile-first overhaul, email infrastructure, and the warm Lamplight/Daybreak color system.

**On the horizon:** deeper community (web push, following feeds, cross-story discussion, DMs), a stronger mobile writer, and the AI moat (inline ghost-text continuation, live continuity checking, reader insight reports). See the team's `next-steps` notes.

---

## 9. Brand

The app is **Quiloria**. Some older spec and memory docs still say "Inkwell" — that was a working name. The live brand, logo, and navbar are Quiloria. Two themes: **Lamplight** (dark, firelit umber) and **Daybreak** (light, sunlit ivory/bronze). Display type is Fraunces; body is Plus Jakarta Sans; reading is Literata. See [COLOR_SYSTEM.md](./COLOR_SYSTEM.md).

---

*Living document. Update as the product moves.*
