# The For You Reader — Design Spec

> A candlelit room where a story is already playing.

The problem: returning readers currently face 4 decisions before they read a word (Landing → Browse → Story → Chapter). The For You reader removes all of them. You open Quiloria and you're already inside a chapter picked for you.

This is not TikTok. We are stealing *decision-removal*, not vertical-feed aesthetics. Long-form reading is slow on purpose. The goal is to make *starting* instant; reading itself should still feel like sitting down with a book.

---

## 1. Landing state

When a signed-in user hits `/` (or a new `/read` route — see §8), they land directly inside a chapter. No "welcome back" banner, no grid of cards, no nav bar covering the page. The full viewport is the chapter.

**Above the fold, minimal chrome:**
- Top-left: small story title + author name in the display serif, dimmed to ~60% opacity. Tap → story page.
- Top-right: a tiny ambient indicator (see §4) showing which signals picked this.
- No navbar. The navbar fades in only on upward scroll or on tap near the top edge.

**The chapter itself:**
- Opens mid-chapter if the user has reading progress on this story, otherwise at chapter start.
- Fades in (300ms ease-out) over a subtle ambient background tinted from the story's cover art — the "candlelit room" effect. Blur + darken the cover, pin it behind the text at 8% opacity.
- Reading font, width, and theme honor the user's settings (we already store these).

**If the user has zero reading history:** we cannot personalize yet, so the landing chapter comes from a hand-curated "first taste" pool — staff picks + a small rotating set of <1500-word flash pieces chosen to convert. Never a novel's chapter 1; always something that finishes in the session.

---

## 2. Gestures (the whole language)

There are only five interactions. Anything more and we've betrayed the "no decisions" principle.

| Gesture | Action |
|---|---|
| **Swipe up** | Next page/paragraph block of the *current* chapter. When the chapter ends, keep swiping to continue to the next chapter of the same story. |
| **Swipe left** | "Not for me right now." Dismisses the current story for this session, loads the next recommended story. Soft signal — does not permanently hide. |
| **Swipe right** | Save to reading list + load next recommended story. Hard positive signal. |
| **Double-tap paragraph** | Spark that paragraph. Heart bursts from the tap point. Counts as a strong positive signal on this story. |
| **Long-press paragraph** | Opens the annotation/highlight popover we already have. |

**What we are NOT doing:**
- No swipe down (reserved for pull-to-refresh later, or nothing).
- No auto-advance timer. Reading is user-paced. Full stop.
- No sound, no haptics-on-scroll, no dwell-time scoring visible to the user.
- No "X people are reading this right now" counters in the reader view. Kills the candlelit mood.

---

## 3. The between-chapters moment

When a chapter ends and the user swipes up one more time:

**Option A — Continue the story:** a full-bleed card fades in with the next chapter's title, the story's cover, the "X minutes" read estimate, and two options: *Continue* (swipe up again) or *Take a break* (swipe right = save, swipe left = next story). 1.5s default focus on Continue.

**Option B — Story ends:** instead of ejecting the user, we fade into a "You finished [Story Title]" moment — cover art full-bleed for 2 seconds with the word *Finished* in the display serif. Then a soft prompt: *Leave a gift?* with the donation sheet, pre-primed. This is the single best conversion moment in the whole app and we should not waste it. Dismissing brings the next recommended story.

This between-chapters surface is also where Circle prompts appear: *"This author offers early access. 3 days ahead for 300 drops/mo."* Shown once per author per week, not on every chapter break.

---

## 4. Ranking signals — what picks the next story

The For You queue is a server-ranked list of stories, refreshed on each swipe-left/right. Keep the first version simple and explainable — no ML, just a weighted score.

**Positive signals (raise score):**
- `spark` on any chapter of this author → +8 to that author's other stories
- `spark` on a paragraph inside a chapter → +5 to the same story's unread chapters, +3 to other stories by the same author
- `swipe right` (save) → +10 to the story, +4 to the author
- Chapter completion (read ≥80% of a chapter) → +3 to the story, +2 to the author
- `follow` on author → +12 to all their stories
- Genre match to user's top-3 read genres → +4
- Story uses a format the user actively reads (poetry/novel/screenplay/etc.) → +3
- Story is a [staff pick](./../src/lib/db/schema.ts) → +6
- New chapter published in the last 48h for a story in reading list → +15 (urgent: they're waiting for it)

**Negative signals (lower score):**
- `swipe left` this session → story drops out of queue for 24h
- User has already finished the story → -20 unless it has a new chapter
- Author's work has been swiped left ≥3 times in the last 30d → -6 to all their stories
- Genre the user has never read → -2 (soft, not a ban — we still need exploration)

**Exploration slot:** every 5th story is picked *outside* the ranked top, from the user's non-read genres or from new creators with <10 subscribers. This prevents the feed from collapsing into a one-author echo chamber and it's also how we give boosted visibility (see the memo in `memory/project_boosted_visibility.md`) a natural home.

**The ambient indicator (top-right of reader):** a tiny one-word tag that quietly tells the user *why* this was picked. `Because you sparked Marrow & Thorn`, `New chapter`, `New voice`, `Staff pick`. Serif, ghost-text, no background. No more than 5 possible values — too many and it becomes clutter.

---

## 5. What the queue looks like on the server

A new endpoint: `GET /api/read/queue` returns an ordered array of up to 20 `{ storyId, chapterId, startOffset, reason }` objects.

- `storyId`, `chapterId`: what to load.
- `startOffset`: if the user has reading progress, resume from the paragraph they last hit. Otherwise 0.
- `reason`: one of `resume | new-chapter | sparked-author | staff-pick | new-voice | genre-match | exploration`. Drives the ambient indicator copy.

The client pre-fetches chapter content for position 0 and position 1 on initial load (so the swipe-up into the next story feels instant). Position 2+ pre-fetches on idle. Cap in-memory at 3 chapters to keep memory sane.

When the queue drops to 3 items, request the next batch in the background. When it hits 0 (network failure, tiny corpus), fall back to staff picks + most-recent publishes.

---

## 6. Writer side — what this changes

The For You reader is a reader-facing feature, but writers feel it in three places:

1. **New dashboard stat:** "Appeared in Feed" — how many times one of their chapters surfaced as a For You pick this week. Distinct from views. Gives writers a sense of discovery reach.
2. **"New voice" slot eligibility:** a badge on the creator's profile for the first 30 days after publishing their first story. This is the exploration slot's supply.
3. **No gaming.** Writers cannot buy For You placement directly — that is what **boosted visibility** (planned) is for, and boosted stories go into the exploration slot at a labelled `Sponsored` tier (clearly marked, capped at 1-in-10 slots). Keeps the trust intact.

---

## 7. What this does NOT replace

- The Browse page still exists. For You is for "I want to read *something*"; Browse is for "I want to find *this*." They serve different intents.
- Individual story pages still exist and still carry tipping, Crossroads, Circle, comments, and creator updates. The For You reader links out to them at chapter boundaries and via the dimmed header.
- The Dashboard still exists for writers. For readers, `/` becomes the For You reader and the old dashboard moves to `/library` (reading list, history, followed authors).

---

## 8. Routing

- `/` → For You reader for signed-in readers. Landing/marketing page for anonymous visitors.
- `/read` → explicit alias for the For You reader (deep-linkable).
- `/library` → the reader's history, reading list, followed authors, and finished stories.
- `/browse` → unchanged, for intent-driven discovery.
- `/dashboard` → still the writer's home (stats, stories, drafts). Linked from the navbar under the user menu.

The primary navbar for readers becomes: **Read** (the feed, active by default) · **Browse** · **Library** · **Write** · avatar. Four items. That's it.

---

## 9. Open questions — decide before building

1. **Anonymous landing.** Should a logged-out visitor get a "demo" For You with no personalization, or keep the current marketing landing? My vote: marketing landing stays, but add a prominent "Start reading — no account needed" button that drops them into a 3-story demo loop. Forces the magic moment before the signup wall.
2. **Swipe gesture on desktop.** Swipe doesn't exist on mouse. Use the arrow keys (↑ next page, → save, ← next story) and a subtle on-screen arrow cluster for users who won't discover the shortcuts. Do not put "Next" buttons in the reader itself — that breaks the spell.
3. **How much copy lives in the empty queue state?** I'd say none. If the queue is empty, the reader shows a single line in the center: *No stories left tonight.* and a small *Browse the archive* link. Nothing else. The emptiness is part of the mood.
4. **Ink drops on completion.** Do we award a small drop (1-2) for finishing a chapter? Pro: creates a closed economic loop where reading funds tipping. Con: turns reading into farming. My vote: no. Keep drops earned via real-money purchase, gifting, and creator payouts only.
5. **How fast do we rebuild the queue on swipe-left?** If we refetch on every left-swipe, the user can feel network lag between stories. Pre-computing a 20-deep queue client-side and only refetching when it drops below 3 solves this, at the cost of slightly staler rankings. Worth it.

---

## 10. Build order (when we're ready)

This is a large feature. Order matters.

1. **`/api/read/queue` endpoint** — the ranking logic, returning the ordered list. Ship with a simple scoring function, tune later. No ML.
2. **`/read` page** — the reader shell, pre-fetch mechanics, gesture handling (mobile first, then keyboard for desktop). Reuse the existing paginated reader engine where possible.
3. **Between-chapters moment** — the "Finished" screen, the next-chapter card, the donation prompt on story end.
4. **Ambient indicator + reason tags.**
5. **Make `/` route to `/read` for signed-in readers.** This is the switch that lights the whole feature.
6. **Library page** at `/library` — rehousing the old dashboard surfaces for readers.
7. **Writer-side "Appeared in Feed" stat + New Voice badge.**

Steps 1-5 are the MVP. Everything after is polish and can ship separately.

---

## 11. The one thing we must not get wrong

The For You reader succeeds if the user *forgets they were choosing anything*. It fails if it feels like a recommendation carousel, or a vertical-scroll feed, or a Medium clone. The test is the candlelit room: does opening Quiloria feel like walking into a story that was already in progress, waiting for you? If yes, ship it. If not, cut more chrome.
