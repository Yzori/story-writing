# The Reader's Test Drive — repurposing `/landing-experience` as the "read →" door

*Plan drafted 2026-06-12, from deep web research (23 sources, choice-overload + conversion literature) + full codebase recon.*

> **STATUS: SHIPPED 2026-06-12** — all four phases built and e2e-verified
> (`scripts/reader-continuity-e2e.mjs`). Open decisions below remain open.

## The job

The film homepage's write door opens `/demo/try` — a real anonymous experience whose draft survives signup. The read door opens `/browse` — a filter UI. This plan gives the read door the same grade of experience: **film "read →" → crossing → genre archipelago → shore (3 tales) → reading mid-scene → signup that imports your place and your taste.** The landing-experience stops being "the landing concept that lost to the film" and becomes the reader's test drive.

## What the research says (and how it shaped the design)

| Evidence | Design consequence |
|---|---|
| NN/g (login walls, since 1999; optional registration): never gate content before value; sites that add a guest path see immediate sales lifts; users who refused upfront registration register willingly when it's offered *after* the goal is met (reciprocity). Baymard: ~¼ of US shoppers abandoned a cart in a quarter *solely* because account creation was forced pre-goal. | **No signup wall anywhere in the funnel.** Anonymous reading stays open (it already is — `/story/[slug]/read` is unprotected). The register prompt appears *after* the excerpt hooks them and at natural pauses (end of chapter), framed as keeping something they already own: "the ink will remember where you stopped." |
| Choice-overload literature is contested (Scheibehenne 2010 meta-analysis: mean effect ≈ 0) **but** Chernev 2015 (N=7,202): overload is real and conditional on four moderators — set complexity, task difficulty, **preference uncertainty**, decision goal. An anonymous first-time visitor maxes the preference-uncertainty moderator. Benchmarks: "small" assortments ≈ 6 options, overload range ≈ 24+. INFORMS field experiment (1.6M consumers): purchase probability is inverted-U in set size, and up to 64% of the overload drop is *failing to engage at all*. RecSys 2010: larger all-good sets don't raise satisfaction. | **The funnel's curation depths are right and should stay tight**: 4–5 genre worlds, 3 tales per shore, 1 Tonight's Tale default. Do not "improve" the shore into a shelf. The open catalog (`/browse`) is for members with articulated preferences. |
| Chernev: high preference uncertainty (no articulated ideal point) drives overload (β=.32, p<.001); articulating preferences inoculates against it. Spotify Research (the one claim formally verified 3-0): explicit onboarding signals (genres, languages) personalize cold-start users before any behavior exists. | **The journey IS the taste capture.** Choosing a world articulates a preference *and* records it. By signup we hold a genre-weight vector without ever showing a quiz. |
| StoryGraph gates its famous preference survey *behind* signup — and frames it overtly as "this powers your recommendations." | Capturing taste *before* signup is genuinely differentiating; at register, make the value exchange overt: "your journey already set up your library." |
| WEBTOON allows guest reading/purchases but guest state doesn't survive into an account — a documented continuity failure. NN/g explicitly recommends: let anonymous users build state first, then offer an account that *preserves* it. | **Continuity is the product.** Reading position + taste must survive registration, mirroring the demo-draft import that already works for writers. |

*Caveat: claim verification was cut short by a spend limit; claims above are from primary sources with direct quotes but were not adversarially verified.*

## Current integration points (from codebase recon)

- `src/app/landing-experience/page.tsx` (~2,957 lines): stage machine `doors→crossing→world→shore→page` at line 38; always enters at `doors` (line 2370, no query-param entry). 12 inline demo tales in `READER_SATELLITES` (lines 159–391, 3 per genre: romance/scifi/pirate/horror). `ReaderPage` (lines 2289–2362) ends at "keep reading on quiloria →" → `/browse`. Persists `quiloria-landing-last-tale-v1`.
- `src/components/landing/FilmLanding.tsx`: read CTAs — "step into a story →" (≈line 540) → `/browse`; Act VI "read →" → `/browse`; ledger rows → `/story/[slug]`; receipt → `/browse`.
- `src/app/register/page.tsx`: `readDemoDraft`/`importDemoDraft` (lines 40–148) imports `quiloria-demo-draft-v1` via POST `/api/stories` → PATCH chapter; `?intent=read` routes to `/welcome/preferences?next=/read`.
- `/welcome/preferences` PATCHes `preferredGenres`/`preferredReadLength`/`comfortRating` to `/api/users/me/preferences`.
- `/api/stories` supports `public`, `genre`, `sort=most-sparked`, `limit`. `getLandingTales()` in `src/lib/landing-data.ts` shows the pattern (top-sparked public + published ch.1 + `extractFirstLine`).
- Reading progress: members POST `/api/reading-progress` (also bumps streak). **No anon position mechanism exists.** Anon CAN read — `/story/[slug]/read` is not in `middleware.ts` protected paths.
- `/landing-experience` already suppresses the navbar (`HIDE_NAVBAR_PATTERNS`).

## The plan

### Phase 1 — Open the read door into the world (~½ day)
1. Query-param entry: `/landing-experience?world=reader` initializes at `crossing` with `world="reader"` (clicking "read" on the film *was* the door — skip the doors stage). Plain `/landing-experience` keeps the doors for direct visits.
2. Reroute the film's **non-specific** read CTAs to the portal: Act VI "read →" and the brand-card "step into a story →". **Keep the ledger rows and receipt direct** (`/story/[slug]`, `/browse`) — a click on a named story is an articulated preference; speed where they know what they want.

### Phase 2 — Real tales on the shores (~1 day)
3. `getShoreTales()` in `src/lib/landing-data.ts`: per genre world, top 3 public stories (most-sparked, published chapter 1), extracting the first 2–3 paragraphs (paragraph-level sibling of `extractFirstLine`). Map satellite worlds → real genre taxonomy (romance, sci-fi, adventure, horror).
4. Server wrapper page fetches and passes tales as props; the current client page becomes the component. **Inline fixtures stay as fallback** (dev DB has 0 published stories; same pattern as FilmLanding).
5. `ReaderPage` CTA for real tales → `/story/{slug}/read/{chapter1Id}` ("keep reading — the chapter continues") instead of `/browse`. The excerpt becomes a doorway into the actual book.

### Phase 3 — Continuity: the place and the taste survive signup (~1–1.5 days)
6. **Anon reading position**: when no session, the reader writes `quiloria-anon-reading-v1` (`{storyId, slug, chapterId, scrollPercent, updatedAt}`) to localStorage instead of POSTing.
7. **Taste vector**: the portal records journey signals to `quiloria-taste-v1` — worlds entered, shores visited, tales opened (genre weights). No quiz, no UI.
8. **Register import (mirror of the demo-draft import)**: on signup, if anon reading state exists → POST `/api/reading-progress` after auth, route them back to *their* story ("back to your page") instead of generic `/read`; if taste exists → `/welcome/preferences` arrives **pre-selected** from the journey (confirm-in-one-tap, overt framing: "your journey chose these — right?"). Register CTA gets a reader variant: **"Sign — and keep my place"** (parallel to "Sign — and save my draft").
9. **Gate placement**: invitation cards only, never walls — (a) end of the portal excerpt, (b) end of chapter 1 in the real reader for anon visitors. Copy in-voice: "The ink will remember where you stopped — write yourself in →" (`/register?intent=read`). Reading continues regardless.

### Phase 4 — Trim to the job (~½ day)
10. The writer branch of the portal hands off to `/demo/try` early (its page stage already writes the same draft key — keep, but the funnel path is reader-only).
11. Logged-in users hitting the portal → redirect to `/read`.
12. Optional: analytics events on stage transitions, gate impressions/clicks; decide whether the route should become `/worlds` (cosmetic, later).

### Explicitly out of scope
- No member-facing archipelago navigation (realm-map for members stays rejected).
- No changes to `/browse` (Tonight's Page direction is a separate thread).
- No signup wall experiments — the research is unambiguous enough.

## Open decisions for Floran
1. Route name: keep `/landing-experience` or rename `/worlds` when it ships?
2. Should the receipt ("…and N more in the stacks") also go to the portal, or stay `/browse`? (Plan says stay.)
3. Pirate world → which real genre tag? ("adventure"?)
