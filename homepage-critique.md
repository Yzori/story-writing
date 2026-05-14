# Design critique — Quiloria homepage (anonymous landing)

Reviewed: `src/app/page.tsx` (anon branch) + `src/components/landing/InteractiveSplitLayout.tsx` + `src/components/shared/Navbar.tsx` + `src/app/globals.css` design tokens.

Stage assumption: refinement / pre-polish. Plenty of craft and intent already in the file — this critique pushes on the things that will trade up the *most* before launch.

---

## Overall impression

The brand is unusually well-formed: candlelit gold against a deep "Lamplight" base, ornate corners, quill animations, fireflies — the homepage feels like a *place*, not a template. The biggest opportunity isn't visual; it's that the page is doing three jobs at once (sell to writers, woo readers, romance the brand) and a 10-second visitor can finish the hero without knowing what the product actually *does*. Tighten the value moment, calm the motion, and fix a pervasive text-contrast issue and the homepage will punch well above its weight.

---

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Hero headline ("Every story begins with a single word") is poetic but doesn't tell a first-time visitor what Quiloria *is*. The actual product statement lives in the smaller subhead below. | Critical | Either lead with a clearer product line and let the poetry be the eyebrow, or shorten the headline so the eye reaches the subhead within 2 seconds. The 4.5-second writing animation actively *delays* the comprehension that already comes too late. |
| Auto-rotating format carousel cycles every 7 s with no visible pause control. Pause-on-hover exists, but keyboard/screen-reader users can't pause it. | Critical | Add a visible pause toggle (WCAG 2.2.2 "Pause, Stop, Hide" applies to auto-moving content over 5 s). Also consider extending to 10–12 s — a user trying to read "Vertical-scroll comics, manga, graphic novels…" runs out of time. |
| Audience whiplash: hero CTA is writer-first ("Try the editor — free"), then four pillars lean writer-heavy, then a "For readers" strip appears two-thirds down. A reader visiting may bounce before that strip. | Moderate | Either pivot the writer/reader split *into* the hero (e.g., two stacked CTAs: "Start writing" / "Browse stories"), or surface a small reader entry point in the first viewport (the "Explore Stories" secondary CTA helps but reads as "secondary" rather than "for readers"). |
| Anon nav competes with itself: Browse · Pricing · Try editor · Log in · Sign up — 5 destinations, with `Pricing` and `Sign up` *both* painted gold, and `Try editor` also visually weighted. | Moderate | Gold is the brand's attention color — spend it on one thing. Demote `Pricing` to default text-secondary; let `Sign up` (or `Try editor`) own the gold treatment. |
| Genre shelves: 16 tiles, near-identical visual treatment, color encoding doubles up (Mystery + Fantasy both amethyst; Cyberpunk + Sci-Fi both teal). The grid scans as visual noise more than navigation. | Moderate | Show ~6–8 most-used genres with a "All genres →" expand. Or: drop the per-genre color entirely and let typography carry it — color isn't doing semantic work here. |
| Mobile hamburger button is two lines (uncommon — most users expect three) and lacks `aria-expanded`. The X-state is only conveyed by rotation, not by the label. | Minor | Add `aria-expanded={mobileOpen}`; either swap to three lines or accept the minimalism but ensure the open/close affordance is unambiguous. |
| Hero subheadline is good ("Write, publish, and grow your stories — solo, with collaborators, or running adventures at the table") but the "running adventures at the table" half is opaque to anyone outside TTRPG circles. | Minor | Either lead with the universal half and earn the niche half via a second beat ("…and run live story games with readers"), or surface the play/co-op concept visually elsewhere in the first viewport. |

---

## Visual hierarchy

- **What draws the eye first**: the animated quill drawing the headline. Correct in spirit — but the *content* it's revealing isn't the most important thing on the page. After the writing finishes you have an oversized poetic line that says "single word" and a quieter line below that says what the product actually is. The hierarchy is inverted relative to the user's job-to-be-done.
- **Reading flow**: Quill animation → poetic 3-liner → subhead → CTA pair → "no account needed" → scroll hint. Linear and clean. The flow itself is good; it's the *content weight* of each step that needs rebalancing.
- **Emphasis problem in the nav**: three gold-tinted elements (Pricing link, Sign up button, Quiloria wordmark gradient) all compete for the same "look here" semantic. Pick one as the brand anchor and demote the others to neutral.
- **Strong moments**: the four-pillar "Why Quiloria" section is the page's most legible block — eyebrow → headline → body, three lines deep. Genuinely well-structured. The Reader Value Strip uses the same template and benefits from the consistency.
- **Final CTA repetition**: "Every story begins with a single word" (hero) → "Words come alive" (video label) → "Stories being written right now" (featured) → "Your story is waiting to be told" (final). Four variants of the same emotional claim. Trim to two and let each one do real work.

---

## Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Section eyebrow labels | Four different colors used: `text-text-ghost` (most), `text-teal/70` (Reader strip), and the implicit "no eyebrow" for the Why section. Reader strip's teal eyebrow reads as a different *kind* of section. | Standardize on one eyebrow treatment (color + weight + tracking). If you want the Reader strip to feel distinct, do it with layout, not by switching eyebrow color. |
| CTA shapes | Primary CTA is `rounded-full` (pill). Sign-up in nav is `rounded-md`. Format-showcase tabs are `rounded-xl`. Genre tiles are `rounded-xl`. Why-pillars are `rounded-2xl`. Five radii across primary surfaces. | Tighten to two: pills for actions, `rounded-xl` for cards. The nav `rounded-md` is the odd one out and should probably match the hero pill. |
| Hover affordance pattern | Some hover states add `hover:shadow-none` (which *removes* a shadow that's never there in dark mode anyway) — leftover from light-mode design or copy-paste artifact. | Audit and remove the no-op hovers. Keep one canonical "card hover" treatment (e.g., border-color + subtle bg lift). |
| Font stack | Six Google fonts loaded: Fraunces, Jakarta, Literata, IBM Plex Mono, Playfair, DM Sans. Only Fraunces (display), Jakarta (body), and Literata (reading mode) seem actually used here. | Drop Playfair and DM Sans from `layout.tsx` unless they're used elsewhere — every additional font is a first-paint cost and a brand-coherence risk. |
| Section labels phrasing | "Words Come Alive" / "Every Form of Story" / "The Shelves" / "From the Library" / "Why Quiloria" / "For readers" / "The Door Is Open" — half title-case-ish, half sentence-case-ish, mixed metaphors (some "library", some not). | Pick a voice. The library metaphors are charming when they connect ("The Shelves", "From the Library"); the generic ones ("Why Quiloria") feel like they're from a different deck. |

---

## Accessibility

- **Color contrast — the biggest miss**: `--text-ghost` (#524E48) on `--void` (#0F0E13) computes to roughly 2.1:1 — well below the 4.5:1 WCAG AA threshold and even below the 3:1 large-text threshold. This token is used for: section eyebrows, "Scroll to explore", "No account needed to try", video caption, and several reader-facing taglines. These are not decorative — they carry meaning. Lift the token to at least `--text-tertiary` (#6E6962, ~3.5:1) for any non-decorative use, or brighten it to ~#7A746A.
- **Touch targets**: nav search input (`py-2` ≈ 32px), several `py-1.5` links (≈ 30px), and mobile-menu `py-2.5` (≈ 40px) all sit under the WCAG 2.5.5 enhanced target of 44×44px. Pricing/profile dot in particular feels small.
- **Motion**: I don't see `prefers-reduced-motion` respected anywhere — fireflies, ink particles, quill writing, parallax, format-orb color shift, completion shimmer, and the 7s auto-carousel all run unconditionally. Wrap the heavy stuff in a `useReducedMotion()` check (framer-motion has the hook built in) and degrade to static states.
- **Semantic HTML**: `<h1>` contains `<div>` children (lines ~411, 418, 426 in InteractiveSplitLayout). Block elements inside a phrasing-content heading is invalid and some screen readers handle it inconsistently. Use `<span style="display:block">` or restructure the animation around inline elements.
- **Mobile menu state**: hamburger button is missing `aria-expanded` and `aria-controls`. Add both — a screen-reader user currently has no way to know the menu state.
- **Auto-cycling carousel**: as flagged above, WCAG 2.2.2 applies. Pause-on-hover doesn't satisfy it for keyboard or AT users.
- **Decorative SVGs**: most have `aria-hidden`, but a few (the play/mute buttons, hero quill) don't have explicit roles. Quill is fine (decorative); the play/mute buttons need `aria-pressed` for the state.

---

## What works well

- **The brand has a soul.** "Lamplight — The Magical Library" is a real point of view, not a Bootstrap variant. The candlelit-gold palette, Fraunces display, and the lantern/quill/firefly metaphors all reinforce one another. This is rare and worth protecting.
- **Audience-gated nav** is sharp — read/dashboard/write only appear for signed-in users, library/commissions/earnings tuck into the profile menu. Top bar stays focused.
- **"No account needed to try"** is exactly the right reassurance, in exactly the right place. Don't lose it.
- **Four-pillar Why section** is the page's strongest block — write/read/play/earn maps cleanly to four distinct user motivations, and the pillars are written as outcomes ("Get paid by fans") not features.
- **First chapter free** in the Reader Value Strip directly answers the biggest objection a reader has on landing.
- **Repeated CTA at the bottom** ("The Door Is Open") catches the long scrollers — and the framing matches the brand voice without feeling salesy.
- **Production craft**: scroll-tied transforms, the seeded RNG for particles (avoids hydration mismatch — good catch), the ink-particle emitter timing, the audience-aware primary CTA component — there's real polish here.

---

## Priority recommendations

1. **Fix the text-ghost contrast token.** Highest leverage, lowest cost. One CSS variable change unblocks accessibility across every section. Aim for ≥3:1 even for the "decorative" usage; ≥4.5:1 wherever it carries product copy (taglines, eyebrows, captions, scroll hint).
2. **Rewrite the hero to land the value prop in the first 2 seconds.** The poetry is a strength — keep it as a backdrop. But the headline should answer "what is this?" before it answers "how does it feel?" Try the subheadline content *as* the headline, with "Every story begins with a single word" demoted to the section eyebrow. Keep the quill animation, just attach it to less critical text.
3. **Calm the motion and respect `prefers-reduced-motion`.** Fireflies + ink particles + scroll parallax + auto-rotating carousel + ambient color-shift is a lot for any browser, and a real problem on lower-end mobile. Wrap all of it in `useReducedMotion()` and ship a static fallback. While you're there, add a pause control to the format carousel.

---

## Things to consider next

- **Trim the page.** 7 sections is long for a marketing landing. Candidates to cut or merge: VideoShowcase + Hero (the video could *be* the hero background), or FormatShowcase + GenreShelves (one is "what you can write", the other is "what you can read in" — they answer related questions and could share a section).
- **Audit the gold.** Count every gold-colored element on the page (CTAs, links, headlines, italics, particles, glows). Gold should be rare enough to *mean* something — right now it's the brand color *and* the CTA color *and* the link color *and* the accent color. Reserve it for actions; let the headlines carry tone via typography and the italic Fraunces alone (which is already gorgeous).
- **A small social-proof beat.** Featured stories sort of plays this role, but the section is empty if `/api/stories?public=true` returns nothing. A simple "Used by N writers" or testimonial line below the hero would build credibility before asking for the click — and is dramatically cheaper than the video.
- **The signed-in branch (`TrendingHome`)** wasn't part of this review — it's a 33k-token component that's almost certainly its own design-critique conversation. Happy to do that next if you want.

---

*Want me to focus the next pass on a specific section — the hero, mobile responsiveness, the signed-in `TrendingHome`, or somewhere else?*
