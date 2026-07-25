# The Journey Plan

**Date:** 2026-07-12 · **Status:** proposed
**Thesis:** People arrive as audience, get pulled into participation, and writing is the top of the ladder — not the front door. Liveness (the table) and the artifact (the finished book) are the two assets no competitor has; the journey should run on both.

The plan is ordered by leverage: repair broken promises first, then make publishing an event, then build the outward loop (moments), then invert arrival, then the reader→writer ladder, then witnesses. Each phase ships independently and is valuable alone.

---

## Phase 0 — Repair the broken promises (trust)

Everything here is a shipped feature that doesn't do what it says. Small, well-localized fixes; no design work. Do these before anything new.

| # | Fix | Where | Notes |
|---|-----|-------|-------|
| 0.1 | **Circle early access actually opens the door** | `src/app/api/stories/[storyId]/chapters/[chapterId]/route.ts` (~L81 `canBypassReaderGate`, L103-145 gate) | Query `circleSubscriptions` (schema ~L2452) for an active sub at the required tier; bypass `earlyAccessUntil` and gating for subscribers. Also wire `comments.circleOnly` (set on POST when author chooses, filter on GET). |
| 0.2 | **Public story is publicly fetchable** | `src/app/api/stories/[storyId]/route.ts` PATCH (~L193) | One publish semantic: setting `isPublic=true` also sets `status="published"` (unless adventure `complete`); or relax the GET check to `isPublic && has published chapter`. Pick one, apply everywhere the check appears (`by-slug` route already uses the OR form — align them). |
| 0.3 | **Replies notify the person replied to** | `src/app/api/stories/[storyId]/chapters/[chapterId]/comments/route.ts` (~L170) | When `parentId` present, notify parent comment's author (type `comment`); story owner still notified for top-level. Never double-notify the same user. |
| 0.4 | **Anonymous work survives every auth path** | Move import out of `register/page.tsx` handlers into a client bootstrapper (e.g. `src/components/shared/ContinuityImporter.tsx` mounted in the app shell) | On first authenticated load, if `quiloria-demo-draft-v1` / `quiloria-anon-reading-v1` / `quiloria-taste-v1` exist → run `importDemoDraft` / `importAnonPlace` / persist taste, then clear. Fixes the Google OAuth loss; also surfaces a visible error if import fails (today it's silent). |
| 0.5 | **Crossroads closes its loop** | `.../crossroads/[crossroadId]/route.ts` PATCH (~L70); `.../crossroads/route.ts` POST | On resolve: notify all voters which option won (new notification type `crossroads` or reuse `update`). On open: bulk-notify story followers so people know a vote exists. |
| 0.6 | **Canonized suggestion notifies the credited reader** | `src/server/services/adventure-live.ts` (~L320), suggestion canonize path | "Your line was written into ⟨book⟩" — the single cheapest re-engagement message on the platform. Requires suggestions to carry a userId when the suggester was signed in (schema `adventureSuggestions` ~L3479 — add nullable `userId` if absent). |
| 0.7 | **Welcome email + first-publish email** | `src/server/auth.ts` (`events.createUser`), `src/server/services/email.ts` | One warm welcome template. Skip email *verification* for now (no gating exists; don't add friction), but start writing `emailVerified` when we do verify later. |
| 0.8 | **FirstRunPanel checklist tells the truth** | `src/components/dashboard/FirstRunPanel.tsx` (~L117) | "Start your first story" checks actual story count; set `onboardedAt` on the write path too (see 3.3). |

**Migrations:** possibly one (0063) if `adventureSuggestions.userId` is missing. Everything else is code-only.

---

## Phase 1 — Publishing becomes an event

One verb that does everything, and a clock.

- **1.1 Unified publish action.** A single `POST /api/stories/[storyId]/publish` that atomically: publishes the chapter, ensures `isPublic`/`status` coherence (per 0.2), notifies followers, and returns share payload (link, counts). The desk publish dialog (`src/app/write/[storyId]/page.tsx` `confirmPublish` ~L625) calls this instead of raw PATCHes. Model it on the adventure compile (`src/server/services/compile-adventure.ts`) — atomic claim, everything in one transaction.
- **1.2 Scheduled drops.** Migration 006x: `chapters.scheduledFor timestamptz`. Publish dialog gains "now / at a time". `src/server/services/scheduled-jobs.ts` gets a `publishScheduledChapters` sweep (cron already runs hourly via `POST /api/cron`; consider a 5-min cadence for this job). Scheduled-but-unpublished chapters render on the story page as "Next chapter — Thursday 20:00" with a follow hook (this is the seed of Phase 5's "leave a lantern").
- **1.3 Announcement in the publish moment.** The publish dialog includes an optional pre-drafted creator update ("Chapter 12 is out — ⟨author note⟩") posting through the existing `.../updates/route.ts`. Auto-drafted, editable, skippable. One notification per follower, not two: if an announcement is posted, it *replaces* the bare chapter notification (compose the message in `createBulkNotifications` fan-out).
- **1.4 Share assets in the afterglow.** The post-publish modal shows the pre-rendered chapter card (Phase 2's OG image), copy buttons, and desktop intent links (X, Reddit, Tumblr, WhatsApp, Bluesky). Depends on 2.1.

**Acceptance:** an author can schedule Thursday 20:00, the chapter goes live on time, followers get one rich notification, the story page counted down to it, and the author had a shareable card in hand before the drop.

---

## Phase 2 — Moments: the outward loop

The unit of sharing is a moment, not a link. Hosted image + deep link + closed echo.

- **2.1 OG foundation.** `metadataBase` in `src/app/layout.tsx`; `generateMetadata` in `src/app/story/[slug]/read/[chapterId]/layout.tsx` (chapter title + story cover; the layout is currently a bare passthrough); dynamic branded cards via `next/og` `ImageResponse` (`opengraph-image.tsx` for story + chapter — title/author over cover in the void/amber system). `sitemap.ts`, `robots.ts`, an RSS route per story (`/story/[slug]/feed.xml`) and site-wide new-chapters feed. Canonical URLs via `alternates`.
- **2.2 Hosted clips.** Migration 006x: `clips` table (id, storyId, chapterId, userId nullable, quoted text, anchor offsets, createdAt). `POST /api/clips` creates one; `/c/[clipId]` is a public page whose `opengraph-image` renders the SceneClip design **server-side** with `ImageResponse` — so what unfurls on social *is* the clip, not the cover. Page body: the passage, "from ⟨chapter⟩ of ⟨story⟩", read-from-here CTA. Rework `src/components/reader/SceneClip.tsx` to create the clip record and share `/c/[clipId]` (keep canvas download/copy as secondary actions).
- **2.3 Moment deep links.** Reader supports `#p=⟨offset⟩` (or clip anchor) to land at the exact passage, logged out (reader is already public). `/c/[clipId]` "keep reading" uses it.
- **2.4 Desktop share targets.** A small `ShareMenu` component (intent URLs + copy + native share when available) replacing the copy-only buttons in `ReaderToolbar.tsx` (~L165), story page (~L670), SceneClip, and the publish afterglow.
- **2.5 The echo.** Writer-facing: "Your line from Chapter 7 was clipped 40 times this week." Clip counts per chapter surface in the dashboard hero / story insights; weekly digest line via existing `digestEmail`. This is the retention half of the sharing feature — do not ship 2.2 without it.

**Migrations:** one (clips). **Acceptance:** paste a clip link into Slack/X/Discord → the branded passage image unfurls; clicking lands mid-scene, readable, one tap from following; the author sees the echo.

---

## Phase 3 — Arrival inverted: land inside a moment

- **3.1 Live front door.** `src/app/page.tsx` (anon branch): when a public adventure is `running`, the film's first act becomes the live table — real lantern count, real "writing now" pulse, enter as audience with zero friction (watch pages are already public in `src/middleware.ts`). No live table → strongest recent moment (top clip / newest drop) → current film as fallback. `FilmLanding.tsx` write-door stays, but the read door goes to something alive, not the guided tour.
- **3.2 Signup at the moment of action.** An inline auth sheet (`AuthSheet` component: one name field + Google + email) triggered when an anonymous person tries to follow, suggest, spark, or keep a streak — completing the action they attempted immediately after auth (intent stored in sessionStorage, replayed by the 0.4 bootstrapper). `/register` remains for direct arrivals.
- **3.3 Observed taste replaces the wizard.** Extend `bumpTaste` capture to the anonymous reader (`src/lib/anon-reader.ts` already tracks place; add genre weights on read). On signup, persist taste silently and set `onboardedAt` — delete the 3-step `/welcome/preferences` wizard (keep the route as a settings page for people who *want* to edit taste). Comfort rating: one inline question the first time a mature-rated story is opened, not a signup step.
- **3.4 First-run in the studio.** FirstRunPanel reorients to the ladder: "A table is live — go watch" first, "Read" second, "Write" third.

**Acceptance:** a person can go from a shared clip → watching a live table → suggesting a line → having an account → their suggestion canonized, without ever seeing a form longer than one field.

---

## Phase 4 — The ladder: reader → writer

- **4.1 IA flip.** `/create` (`src/app/create/page.tsx`): Adventure/table first, co-op second, solo third ("the quiet study — for when you already know your book"). Delete the dead `CampaignCharterCreate` block (~L330-1016) and the dead `hook`/campaign fields in `handleSubmit`.
- **4.2 Invitation to a seat.** After N canonized suggestions or sustained watching, the platform (or the Director, one-tap) invites the reader to a seat at the next table: notification + email "You've been writing this book from the audience. Take a seat." Directors get a "invite your best audience" affordance in the table UI, drawing on suggestion/backing history.
- **4.3 Graduation artifact.** The colophon page (compile already stamps credits) becomes a first-class shareable: its own OG image (Phase 2 machinery) listing writers, backers, credited readers. This page is the platform's argument — make it the thing people screenshot.
- **4.4 Solo as graduation, not default.** First solo story creation from someone who's sat at a table pre-fills from their table history (genre, cadence) and pitches a schedule ("Your table wrote every Thursday — keep the night?"). Links Phase 5.

---

## Phase 5 — Witnesses: writing with people waiting

- **5.1 Announced sessions.** Migration 006x: `writingSessions` (storyId, scheduledFor, note). Author announces "Chapter 12 — Thursday 20:00" from the desk; followers can *leave a lantern* (a pre-commitment row; reuse presence/lantern visual language). At session time the desk shows lanterns lit — real count of people waiting. Post-publish, lantern-leavers get the drop notification with "you were waiting for this."
- **5.2 Streak-at-risk + push.** Web push finally lands (VAPID env vars are already provisioned per plan; service worker + `pushSubscriptions` migration + subscribe UI in settings; PWA manifest exists at `public/manifest.json`). First three pushes to support: streak-at-risk (evening sweep in `scheduled-jobs.ts`), scheduled drop live, "your line was canonized." Email fallbacks for all three.
- **5.3 Reaction echo, gently.** Reactions notify the writer as a *batched* daily line ("14 readers reacted to Chapter 9"), never per-tap — via the digest sweep, not `createNotification` per row.

---

## Sequencing & rules

- **Order:** 0 → 1 → 2 are strictly sequential (2 depends on 1's publish surface; 1.4 depends on 2.1 — ship 1 without the card, add it when 2.1 lands). 3 and 4 can interleave after 2. 5 last.
- **Rough weight:** Phase 0 ≈ 1 session. Phase 1 ≈ 1-2. Phase 2 ≈ 2. Phase 3 ≈ 2. Phase 4 ≈ 1-2. Phase 5 ≈ 2.
- **Migrations:** hand-written numbered SQL in `drizzle/` (never `db:generate`); next free number after current head (0062 on `adventures`). Expected: suggestions.userId (P0), chapters.scheduledFor (P1), clips (P2), writingSessions + pushSubscriptions (P5).
- **The one law (applies to every phase):** every reader signal returns. No new interaction ships without its closing notification.
- **Non-goals for now:** DMs (letters + commission chat cover the need), email verification gating, algorithmic feeds, paid boosts.
- **Copy rules:** plain words on controls; poetry in atmosphere only; "refill your well," never bare "drops"; never "prose" in UI.
