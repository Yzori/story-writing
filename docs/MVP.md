# Quiloria — Product Spec

> A platform where stories are created together, experienced together, played together, and brought to life across disciplines.

**Status:** The original MVP shipped and the product grew far beyond it. This document is the living feature spec for the platform as it exists today. For the high-level pitch and positioning, see [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md). For engineering choices, see [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md). The original MVP scope is preserved at the bottom as a historical record.

**Last updated:** June 2026

---

## The Problem

Creative storytelling is fragmented. Writers publish on Wattpad or Medium but can't collaborate meaningfully. They find illustrators through chaotic Twitter threads and Discord DMs. Readers consume passively with no way to shape the stories they love. Monetization means stitching together Patreon, Ko-fi, and a freelance marketplace. There's no single place where the full creative lifecycle of a story — writing, illustrating, editing, reading, reacting, playing, and earning — lives under one roof.

## The Insight

Stories aren't written in isolation. Behind every great novel is a web of editors, beta readers, cover artists, and an audience that fuels the creator. Quiloria makes that web visible, accessible, and native to the platform.

## Core Principles

1. **Creativity-first language** — No git jargon. No "repositories" or "pull requests." The interface speaks in the language of storytelling: drafts, threads, paths, suggestions, retellings. (And never "prose" in user-facing copy — it's a "novel.")
2. **Writers stay in control** — Readers can influence, react, and suggest — but the creator always holds the pen. Collaboration is opt-in, never forced.
3. **Show the craft** — Revision history, collaboration credits, and the creative process itself are part of the experience.
4. **Multi-discipline by design** — A story on Quiloria can be a novel, illustrated story, comic, poem, or screenplay. The platform doesn't privilege one format.
5. **Canvas sovereignty** — The writing surface is sacred. Chrome appears on demand and recedes when not needed.

---

## Creative Vocabulary

We reject technical jargon. Every concept gets a name that feels native to storytelling:

| Concept | Quiloria Term | What it means |
|---|---|---|
| Repository | **Story Project** | The home for a story — chapters, art, notes, collaborators |
| Branch | **Path** | An alternate version or direction for a story |
| Fork | **Retelling** | Someone else's take on your world (with attribution) |
| Pull Request | **Suggestion** | A proposed change from a collaborator or reader |
| Commit | **Revision / Snapshot** | A saved snapshot of the story at a point in time |
| Issue | **Thread** | A discussion about a plot hole, idea, or direction |
| README | **Story Brief** | The pitch — synopsis, genre, tone, and what roles are needed |
| Merge | **Weave** | Accepting a suggestion into the main story |
| Contributor | **Collaborator** | Anyone with a creative role on the project |
| Star/Like | **Spark** | A reader showing love for a story |
| Currency | **Ink Drops** | The in-app unit for tips, unlocks, donations, and commissions |

---

## User Roles

Not rigid categories — more like hats people wear. One person can wear many.

- **Writer** — Creates novels, scripts, poems, or interactive narratives
- **Illustrator** — Adds visual art, character designs, scene illustrations, comic panels
- **Editor** — Refines, restructures, and polishes
- **Worldbuilder** — Develops lore, maps, timelines, character bibles
- **Reader** — Consumes, reacts, discusses, supports, and (when invited) influences
- **Game Master / Player** — Runs or plays in a live Adventure Mode session
- **Artisan / Patron** — Offers or commissions creative work in the Scriptorium

---

## Feature Set

The platform is organized around seven pillars. Everything below is shipped unless explicitly marked otherwise.

### Pillar 1 — Create: the editors

Every Story Project selects a **format** at creation. The format determines the editor, the reading experience, and how collaboration works. Each format honors how that form of storytelling actually works — not a one-size-fits-all editor with toggles.

**Novel** — Novels, novellas, short stories, serial fiction
- Block-based rich-text editor (Tiptap v3) with chapters as the primary unit
- Scene breaks, epigraphs, and author notes as first-class blocks
- Inline illustrations, full-bleed art blocks, chapter header art
- Mood & tone controls (chapter-level ambiance)
- A calm three-room cockpit — Write, Structure, Context — instead of a wall of panels
- Distraction-free writing mode; beautiful, book-like reading view

**Webtoon / Comic** — Vertical-scroll comics, manga-style panels, graphic novels
- A **standalone panel studio** — the atomic unit is the panel, not the paragraph. Upload panels in sequence, control gutters, sizing, and reading flow, drag-and-drop reorder, API-backed storage
- Vertical-scroll reading by default (how the audience already reads digital comics); page-based layout as an alternative
- Script view for writer–artist collaboration: the writer's script lives alongside the artist's canvas

**Illustrated Prose** — The hybrid: stories where text and art are equal partners
- Text blocks and illustration blocks interleaved freely, neither dominating
- Reading layout adapts to the balance of each chapter

**Poetry** — Poems, collections, spoken word
- A minimal editor that respects line breaks, stanza spacing, and visual arrangement
- Collections as the organizing unit instead of chapters

**Screenplay / Script** — Film, TV, stage plays, audio drama
- Industry-standard auto-formatting: scene headings, action, dialogue, parentheticals
- Clean, mono-spaced reading view

**Universal editor features**
- Autosave, manual current-content snapshots, and revision history
- Command palette (Cmd+K), keyboard-first flow, onboarding hints
- DOCX import (via mammoth), export to PDF/DOCX
- Story Bible / Lore context available alongside the canvas
- Mobile-first: keyboard-aware toolbars and touch-friendly controls

### Pillar 2 — Read

- Typography-focused reading view — paginated, scroll, and webtoon-vertical modes
- Reader preferences: font (Literata and alternates), size, reading mode, comfort rating
- Illustrations as part of the narrative — inline, full-bleed, chapter header, or page break, with the illustrator controlling presentation
- **Marginalia** — readers highlight passages and leave short anchored reactions (text and art)
- **Per-chapter reactions** — quick emotional responses at chapter end
- End-of-chapter discussion threads; follow a story for new-chapter notifications
- **Reading streaks** and progress tracking
- **The For You reader** — drops returning readers straight inside a chapter chosen for them, removing the Landing → Browse → Story → Chapter decision gauntlet. See [FOR_YOU_READER.md](./FOR_YOU_READER.md)
- **Trending home** and a cover-forward "wander the stacks" browse

### Pillar 3 — Discover

- Browse by **genre**, **tone**, and **format** (format is a top-level filter, not a tag)
- Format-native browse cards — novels show cover + excerpt, comics show sample panels, poetry shows a featured poem
- "Just Published" feed, curated **Staff Picks**, trending, and a popular fallback on empty search
- Search by title, author, tag, with result counts
- Public **showcase** gallery and shareable scene clips rendered to images
- (Planned) paid visibility **boosts** in browse/discovery

### Pillar 4 — Collaborate (The Workshop)

- **Open Calls** — post a call for an illustrator/editor, receive pitches + portfolio samples, invite a collaborator
- **Creative Agreement** (required gate) — plain-language terms on ownership split, usage rights, credit, revenue share, and exit terms before any work begins. Templates: Equal Partners, Lead + Contributor, Work for Hire, Custom. Stored, timestamped, amendable by mutual consent
- **Workshop page** — Team, Suggestions, Lore Book, and Agreement tabs
- **Suggestion flow** — a collaborator proposes a change; the owner **Weaves** (accept), **Revises** (accept with edits), or **Passes** (decline with feedback). Human-readable, not raw diffs
- **Lore Book** — wiki-style characters, places, timeline
- **Editor comments & presence** — threaded comments and collaborator presence in the editor
- **Equal credit** — "Written by X · Illustrated by Y," same prominence, always visible

### Pillar 5 — Play (Adventure Mode)

A collaborative, tabletop-RPG-inspired live play mode. Story-first, not game-first. See [ADVENTURE_MODE.md](./ADVENTURE_MODE.md) for the full guide.

- **GM-directed turns** — the Game Master narrates (never plays); 1–5 players write as characters. No round-robin; the GM picks who writes next or opens the floor
- **2d6 PbtA-style dice** — GM-prompted rolls with attribute modifiers and three-tier outcomes (success / partial / fail) that create dramatic consequences, not physics
- **Narrative character sheets** — traits, a defining belief, backstory; no hit points or inventory
- **Character marks**, **progress clocks**, and **story moments** track the fiction
- **Prose assembly engine** — groups turns into readable prose with name/pronoun tracking and dialogue-verb variation
- **Session lifecycle** — Draft → Active → Completed; sessions **compile into publishable chapters**
- **Live spectating** — audiences watch in real time, send reactions, sparks, and tips, vote in polls, and influence open-floor rounds
- **Public campaigns** — applications and drop-weighted voting to join

### Pillar 6 — Connect & Steward (Community)

- **Sparks** — the primary "I love this" signal, split into story sparks and art sparks
- **Follows**, **creator updates** posted to followers, and a **notifications** system (in-app badge + email)
- **Email** — Resend infrastructure with per-type templates and digest modes (instant / daily / weekly / off), defaults on
- **Content Stewardship** (not "moderation"): creator-set content ratings (All Ages / Teen+ / Mature / Explicit) plus structured content notes; private reader comfort filters; trust-violation flagging (Misrated / Harmful / Spam) with manual review and appeals. Trust first; no pre-publication review; no algorithmic suppression; decisive action only on genuine harm. Ten plain-language platform rules

### Pillar 7 — Earn & Assist

**Monetization** — a fiction-native creator economy denominated in **Ink Drops**, with real money in/out via **Stripe**. See [SUBSCRIPTION_SYSTEM.md](./SUBSCRIPTION_SYSTEM.md) and [COMMISSIONS_PROPOSAL.md](./COMMISSIONS_PROPOSAL.md).
- **The Circle** — creator subscriptions (Confidant tier), auto-renewing via cron
- **Platform plans** — Free, Pro ($9.99/mo), Premium ($29.99/mo) gating AI, analytics, exports, and collaboration seats
- **Chapter gating** — per-chapter unlocks, bundles, early-access windows, lock screen in the reader
- **The Scriptorium** — escrow-backed commissions marketplace (Offerings → Commissions → Testimonials) with craft-metaphor language
- **Donations** ("Leave a Gift"), **Crossroads** (drop-weighted influence polls), live-session **tips**
- **Earnings** breakdown by source (tips / donations / unlocks / subscriptions / commissions / crossroads)

**AI as private editorial support** — never the author. See [AI_ASSISTANT.md](./AI_ASSISTANT.md).
- **Editor's Desk** — selected-text polish and review (Cmd/Shift+K), with Story Bible context
- **Story Intelligence** — cached artifacts (chapter summaries, continuity reports, plot-hole detection) so deep checks don't re-read the whole manuscript
- Free tier gets a limited lifetime taste; Pro/Premium unlock daily and cached usage. Powered by Anthropic's Claude

---

## Key Pages (Site Map)

```
/                              Landing / For You reader (signed-in)
/browse                        Discover stories by genre/tag/format
/story/[slug]                  Story Project page (brief, chapters, shelf, collaborators)
/story/[slug]/read/[ch]        Reading view for a chapter
/story/[slug]/workshop         Collaboration space (team, suggestions, lore, agreement)
/story/[slug]/calls            Open Calls for collaborators
/create                        New Story Project setup
/write/[storyId]               Story editor
/write/[storyId]/webtoon       Standalone webtoon studio
/campaign/[storyId]/play/[id]  Adventure Mode play session
/dashboard                     Creator studio (adaptive hero + supporting cast)
/scriptorium                   Commissions marketplace
/pricing                       Plans and Ink Drops
/showcase                      Public gallery
/profile/[username]            User profile (stories, portfolio, reading)
/notifications                 Chapter drops, suggestions, followers, etc.
/welcome/preferences           Reader onboarding (genres, length, comfort)
```

---

## Content Stewardship

We don't call it "moderation" — we call it stewardship. The philosophy: **trust creators to be honest about what they're publishing, give readers the tools to make informed choices, and act decisively only when trust is violated.**

### Creator-Set Content Ratings (required gate)

When publishing, the creator sets a **Content Rating** — required, not optional:
- **All Ages** — safe for any reader
- **Teen+** — mild language, mild violence, romantic themes without explicit content
- **Mature** — strong language, graphic violence, sexual themes, heavy subject matter
- **Explicit** — sexually explicit content, extreme violence, adults only

Alongside the rating, creators tag structured **Content Notes** (violence, sexual content, strong language, self-harm/suicide themes, substance use, abuse/trauma, horror/disturbing imagery). These respect the reader rather than shame the creator.

### Reader-Side Controls

Readers set private **Comfort Preferences** — a default rating threshold and specific content-note filters. Stories beyond the threshold are hidden from browse/search by default, with an option to reveal. Not blocked — just not surfaced. No one sees a reader's filters.

### Community Flagging

Any reader can flag for **Misrated**, **Harmful content**, or **Spam / Bad faith**. Flags are trust-violation signals, not downvotes. "I didn't like this" is not a flag.

### Review & Response

Manual review at current scale. Misrated → correct the rating, notify the creator (first time is a correction, not a punishment; repeat offenders get a rating lock). Harmful → removed against published rules, severe violations are immediate removal + suspension. Spam → removed, repeat offenders banned. Creators can appeal to a different reviewer; the process is transparent.

### What We Don't Do

- **No pre-publication review** — trust first, intervene when trust breaks
- **No algorithmic suppression** — discoverable within the reader's comfort preferences, or removed; never half-hidden
- **No moral judgments on legal content** — fiction explores dark themes; ratings and notes let readers self-select
- **No tolerance for genuine harm** — hate speech targeting real groups, content sexualizing minors, harassment of real people, doxxing, and incitement to real-world violence are not protected. Non-negotiable

### Platform Rules (plain language)

Ten rules, readable in under five minutes: rate honestly · credit collaborators as agreed · don't plagiarize · no hate speech · no content sexualizing minors · no harassment of real people · no doxxing · no incitement to violence · no spam/bad-faith farming · respect the Creative Agreement you signed.

---

## Design Philosophy

**Reading** should feel like holding a beautifully typeset book — generous margins, elegant serif typography (Literata), comfortable line heights, illustrations that breathe. **Writing** should feel like a calm, private workshop — minimal chrome, canvas sovereignty, the toolbar appearing on selection and vanishing otherwise. **Collaboration** should feel like passing notes between trusted friends — suggestions as conversations, human-readable diffs, not code reviews.

**Color & type:** Two themes — **Lamplight** (dark, firelit umber) and **Daybreak** (light, sunlit ivory/bronze). No blue surfaces. Display: Fraunces. Body: Plus Jakarta Sans. Reading: Literata. Role colors: writer=amber, illustrator=lavender, editor=teal, worldbuilder=sage. See [COLOR_SYSTEM.md](./COLOR_SYSTEM.md).

---

## Success Metrics

Signals that the core loops work, not vanity metrics:

1. **Do writers finish stories?** — % of stories with 3+ published chapters
2. **Do readers come back?** — return rate after first read; reading-streak retention
3. **Do collaborations form?** — % of Open Calls that result in an accepted collaborator
4. **Do suggestions get woven?** — acceptance rate (too low = friction, too high = rubber-stamping)
5. **Do readers engage beyond reading?** — % leaving marginalia or a reaction
6. **Does the economy work?** — % of creators earning Ink Drops; unlock/tip/commission conversion

---

## Appendix — Original MVP scope (historical)

The MVP set out to prove three things, all since validated and shipped:

1. Writing + reading on Quiloria feels better than the alternatives
2. Collaboration between creatives actually happens
3. Readers feel like participants, not passengers

The MVP **explicitly deferred** monetization, AI-assisted writing, branching/interactive fiction, retellings, advanced discovery, and (real-time collaborative editing). Of these, **monetization, AI editorial support, and async collaboration have all shipped.** Still deferred: real-time collaborative editing (current collaboration is async suggestions + snapshots), the Path/branching system, Retellings (forking), mobile apps (responsive PWA only), and internationalization.

The MVP shipped across three named phases — "The Desk" (write + read), "The Workshop" (collaborate), and "The Hearth" (community) — preceded by "The Craft" (the standalone editors). Those phases are complete; the product has since added Adventure Mode, the creator economy, and AI.

---

*This is a living document. Update as decisions are made and assumptions are tested.*
