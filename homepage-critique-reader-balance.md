# Quiloria homepage — reader/writer balance audit

A focused pass on one question: *does this homepage make a reader feel like a first-class citizen, or a secondary audience?*

Short answer: secondary. Probably more than you intend.

---

## The signal count

I went through every section, every CTA, every line of copy, and every metaphor. Here's the tally of signals that frame the reader vs. the writer as the protagonist of the page.

### Writer-coded signals (heavy)

| # | Where | The signal |
|---|---|---|
| 1 | `<title>` tag | "Quiloria — Where Stories Come Alive" — neutral, but the alive-ness is something *made*, not *consumed* |
| 2 | Meta description | "A collaborative writing platform where writers, artists, and readers come together…" — readers listed third of three, and the platform is called a *writing* platform |
| 3 | Hero headline | "Every story BEGINS with a single word" — emphasizes the moment of creation, not the moment of arrival |
| 4 | Hero animation | A quill literally writing the headline — the central visual is authorship in action |
| 5 | Hero subhead | "Write, publish, and grow your stories — solo, with collaborators, or running adventures at the table" — every verb is a writer verb |
| 6 | Hero primary CTA (anon) | "Try the editor — free" → `/demo/try` |
| 7 | Hero primary CTA (logged in) | "Begin Writing" → `/create` |
| 8 | "No account needed to try" reassurance | Attached to the *writer* CTA. Yet browsing is also no-account-needed — that's not communicated to readers |
| 9 | Why pillars | 4 pillars: Write · Read · Play together · Earn. Three out of four are writer-side ("Play together" = co-writing, polls; "Earn" = monetization for creators) |
| 10 | "Play together" pillar body | "Co-write with collaborators. Run live adventures with players and a GM. Open polls that let your audience vote…" — readers are framed as inputs to the writer's process, not as having their own agency |
| 11 | "Earn" pillar body | "Tips, monthly subscriptions, chapter unlocks, paid commissions" — addresses the writer's wallet exclusively |
| 12 | Format showcase descriptions | All five are written from a creator's POV: "The timeless art of prose, from first sentence to final page" · "Where art and narrative become inseparable" · "Language distilled to its most potent form" · "The blueprint for worlds that will be performed" — zero reader-side framing in any |
| 13 | Format showcase section label | "Every Form of Story" — neutral, but follows the writer-coded descriptions |
| 14 | Video caption | "From the writer's imagination to the reader's world" — writer is the agent, reader is the destination |
| 15 | Featured stories headline | "Stories being written right now" — emphasizes the *writing* act, not the *reading* moment |
| 16 | Final CTA headline | "Your story is waiting to be told" — writer framing |
| 17 | Final CTA primary button | Same writer CTA again ("Begin Writing" / "Try the editor — free") |
| 18 | Metaphor system | Quill, ink, scriptorium, commissions, brass plate, candlelight — every brand metaphor is a *making* metaphor. Readers don't pick up quills |
| 19 | Nav `/pricing` link | Promoted with gold styling — pricing is a writer concern (monetization tiers) far more than a reader concern |
| 20 | Section eyebrows | "From the Library", "The Shelves", and "Words Come Alive" are the only ones with reader-coded vocabulary. Everything else is creator-coded or neutral |

### Reader-coded signals (light)

| # | Where | The signal |
|---|---|---|
| 1 | Hero secondary CTA | "Explore Stories" → `/browse` — present, but visually demoted (border-only, no fill) |
| 2 | "Read" pillar | One of four; body is well-written and concrete ("personal feed, follow authors, react to chapters, build reading streaks") |
| 3 | Featured Stories section | Real stories surface here — a reader can imagine clicking one. But the section *headline* still frames them as "being written" |
| 4 | Genre Shelves | 16 genre tiles linking to `/browse` — a reader-shaped affordance, even if the visual is busy |
| 5 | Final CTA body | "Whether you write novels or read them, draw comics or devour them — there is a place for you here" — the lone explicit acknowledgment that readers are welcome |
| 6 | Reader Value Strip | The page's only reader-first section: "Here to read? Stay a while.", "Free to browse, free to read. No paywall before page one", four reader benefits |

### The math

Writer-coded explicit signals: **~20**.
Reader-coded explicit signals: **~6**.
Even ignoring quality differences, that's a 3:1 to 4:1 ratio in copy and visual emphasis.

But the structural issue is worse than the ratio. Compare *placement*:

- The first viewport (everything visible before scroll): **0 reader-first signals**. The "Explore Stories" CTA sits next to the writer CTA but is styled to read as secondary.
- The Reader Value Strip — the one section built for readers — is **section 6 of 7**. Most visitors will never reach it.
- The Reader Strip uses a *teal* eyebrow while every other section eyebrow is gold or text-ghost. Visually, it codes as "and-also" content — a tangent, not a peer.

---

## Why this matters strategically

Two-sided platforms have a chicken-and-egg problem, and almost every successful one (Wattpad, Royal Road, Webtoon, AO3, Substack, Medium) solved it by **leading with the reader acquisition story**. Reasons:

1. **Readers are the larger market.** For every writer there are ~100+ readers. Acquiring readers is cheaper per head and the funnel is shorter (no skill barrier).
2. **Readers attract writers; writers don't attract readers.** A writer signing up to a platform with no readers churns immediately. A reader on a platform with no writers will tolerate a thinner catalog and even convert to writing.
3. **Writer marketing is easier to do second.** Once a platform has visible readership ("4M readers, 200K chapters read this week"), writer acquisition writes itself.
4. **Writer-first homepages signal "tool for me to do work."** Reader-first homepages signal "place to discover things I'll love." The second framing is more emotionally inviting and converts colder traffic better.

The current homepage is essentially a Notion/Substack pitch (here's an editor, here's monetization, here's why writing here is great). What you have under the hood — a personal feed, reading streaks, follow-authors, first-chapter-free, chapter unlocks, audience-shaped storytelling — is more reader-empowering than most platforms in the space. The homepage doesn't reflect that.

---

## Three ways to rebalance — pick your level of ambition

### Option A — Minimal: rewrite the language layer (1–2 days)

Keep the structure, fix the words. Every writer-leaning sentence gets a reader-balanced counterpart, or gets reframed to address both at once.

| Now | Becomes |
|---|---|
| "Every story begins with a single word" | "Every story finds its reader." Or: "Where stories live." |
| "Write, publish, and grow your stories — solo, with collaborators, or running adventures at the table" | "Read, write, and live in stories — solo or together." |
| "Stories being written right now" | "Stories happening right now." |
| "Your story is waiting to be told" | "Your next story is waiting." (works for both sides) |
| "From the writer's imagination to the reader's world" | "Where words become worlds." |
| Format showcase: "The timeless art of prose, from first sentence to final page" | "Novels you can't put down. Prose worth coming back to." |
| Meta description writer-first | "A place to read, write, and shape stories — together." |

What this fixes: language signal balance. What it doesn't fix: structure, hierarchy, the placement of the Reader Value Strip.

### Option B — Medium: rebalance hero + reorder sections (1 week)

1. **Hero CTA pair equalizes.** Make both CTAs full-weight pills, not primary + secondary. Order them reader-then-writer ("Browse stories" / "Start writing"), or A/B test order. Keep "no account needed to try" as a shared reassurance below both.
2. **Move the Reader Value Strip up.** Currently #6 of 7. Make it #2 — immediately after the hero. The first thing a reader sees post-hero should be "Here to read? Stay a while." with "free to browse, free to read, no paywall before page one."
3. **Rebalance the Why pillars.** Today: Write / Read / Play together / Earn (3 writer, 1 reader). Make it: **Discover** / **Read** / **Write** / **Earn or Play together** (2 reader, 2 writer). Discover = the For You feed, follow authors, genres tuned to you. Read = the act itself, streaks, chapter unlocks, react/comment. Write and Earn stay but compress.
4. **Standardize the Reader Strip eyebrow.** Drop the teal — use the same gold/ghost treatment as every other section so it reads as equal weight.
5. **Featured Stories headline pivots.** "Stories happening now" or "Worlds waiting for you" — frame the section as discovery, not output.

What this fixes: structural placement and pillar emphasis. What it doesn't fix: the brand metaphors are still writer-coded (quill, scriptorium, ink).

### Option C — Ambitious: a reader-first homepage with writer as second act (2–3 weeks)

Treat the platform's natural acquisition order — readers first, writers later — and let the homepage do the same.

1. **Hero pivots to readers.** Headline: something like "Find your next obsession." Subhead names the actual reader value: thousands of stories across novels, comics, poetry, scripts; first chapter always free; new chapters from authors you follow. Primary CTA: "Browse stories." Secondary CTA, visible but quieter: "I'm a writer →" (links to a writer-specific landing page, or scrolls to a writer section).
2. **A writer-specific second-page sibling** (`/for-writers` or scroll-anchored section). Everything currently writer-focused — the Why pillars' writer half, the format showcase, the Earn pitch, the editor screencap — lives there. Reachable in one click from the homepage, never confused with it.
3. **The marketing video becomes a reader video.** Instead of "From the writer's imagination to the reader's world," it shows the *reading* experience: opening a chapter, the chapter unlock animation, the reaction confetti, the reading streak ticking up.
4. **The brand metaphor system gets a reader half.** Quill/scriptorium/commissions are charming and you shouldn't lose them — but balance with reader metaphors: lantern (already there — keep), bookshelf, doorway, hearth, "by candlelight". The "library" half of the metaphor is already in your stack ("Lamplight — The Magical Library") — pull that thread harder on the reader-facing surfaces.

What this fixes: the structural lean of the entire homepage. What it costs: a strategic decision about which audience you're optimizing acquisition for, and a redesign of the hero.

---

## My recommendation

**Option B is the right starting point.** Option A is too cosmetic — you'd ship it and three months later still have the same conversion balance. Option C is the strategically strongest move but it's a redesign and a positioning decision that needs to come from the founder, not from a critique.

Option B keeps the brand and the craft intact, shifts the hierarchy enough that a reader landing on the page sees themselves in the first viewport, and rebalances the pillars without throwing them away. It's the highest leverage-per-effort cut.

Within Option B, the single highest-impact change is **moving the Reader Value Strip from section 6 to section 2** and **dropping the teal eyebrow so it reads as equal-weight**. That one change alone tells a reader they're not an afterthought — *before* they decide to scroll out.

---

## A test for any rewrite

A useful gut check: pick five random sentences from the homepage and ask "which audience is being addressed?" If 4 of 5 say "writer," the balance hasn't moved. Aim for at least 2 of 5 reader, ideally 3.

A second gut check: imagine a friend who reads 5 books a year but has never written anything landing here. In the first viewport, do they see themselves? Right now: no.
