# Design Critique: Adventure Mode

Reviewed against the screenshot you shared and the source at
`src/app/demo-adventure/page.tsx` plus the underlying components
(`StoryCanvas`, `SessionLog`, `ContextPanel`, `FloorRoundPanel`,
`InitiativeBar`) and the design tokens in `src/app/globals.css`.

---

## Overall Impression

The thing this gets dramatically right is **atmosphere**. The "Lamplight" dark
theme — warm-neutral darks with a violet undertone, candlelight gold, paper
grain, italic serif body, vignette — reads instantly as *narrative software*,
not productivity software. The center column treats the story like prose
(literata, 19px/2.1 line-height, italic opening with a gold left rule), which
is exactly the move that separates this product from a Discord-shaped TTRPG
tool. That's the moat.

The biggest opportunity is **information density vs. clarity**. The three-pane
layout has to host three audiences (GM, player, spectator) and three modes of
interaction (writing prose, voting, rolling), and right now it relies on a
single visual language — small-caps eyebrow + thin border + tinted background —
to differentiate all of them. That works for atmosphere but flattens
hierarchy, and it pushes a lot of important info below WCAG body-text
contrast. The good news is most of these are token-level fixes, not a redesign.

---

## Usability

| Finding | Severity | Where | Recommendation |
|---|---|---|---|
| The OOC chat input has no visible Send button — only Enter submits. New users won't know how to send. | Critical | `SessionLog.tsx:236-244` | Add a small gold-tinted paper-plane icon button at the right of the input, or at minimum a `Press ⏎ to send` hint inside the placeholder. |
| The active Floor Round card is anchored to the bottom of the scroll column (`mt-auto mb-4`), but it lives inside the same scroll container as the prose. On long sessions the player must scroll past the unfolding story to reach the active vote. | Moderate | `FloorRoundPanel.tsx:127`, `StoryCanvas.tsx:578-587` | Consider sticking the active round to the bottom of the viewport (fixed overlay with a subtle backdrop blur) rather than to the end of the scroll content, so the prompt and "vote" buttons are always reachable while reading. |
| The "Roll Requested" modal in the screenshot floats over the SessionLog and partially obscures it. The win/lose conditions use `text-emerald-400/50` and `text-red-400/50` at 10px — critical info ("the runes burn your skin") at ~2.5:1 contrast. | High | `SessionLog.tsx:155-156` | Bump win/lose lines to full opacity (`text-emerald-400`, `text-red-400`) and 11–12px. The reduced opacity is reading as "decorative" which is exactly wrong for stakes copy. |
| "End Session" sits in the top-right with the same visual weight as "Game Master" / "Dashboard & Tools" labels. It's destructive and irreversible but doesn't look it. | High | (top bar) | Move to a kebab/⋯ menu, or at minimum keep it visible but require a confirm dialog. Currently nothing in the demo wires `onEndSession`. |
| "They depart" / "Their story ends" buttons in the right rail are always visible per character — destructive actions one click away. | High | (Party Status) | Tuck behind a ⋯ menu on the character card. The flavor copy is great, but they shouldn't be at the same affordance level as "Approaches". |
| Scrollbars are hidden in both rails and the canvas (`scrollbarWidth: "none"`). Users who rely on scrollbars for "is there more?" affordance get none. | Moderate | `SessionLog.tsx:103`, `StoryCanvas.tsx:423`, `ContextPanel.tsx:145,617` | Either show a thin scroll thumb (`var(--t-walnut)` already exists for this) or add a "fade-out" gradient at the bottom of each rail when there's more content. |
| The View-As switcher pills in the demo banner are 10px text with hairline border-amber/40. On the inactive state (`text-text-tertiary` ≈ #6E6962), text reads ~3.5:1 against `bg-amber/10`. | Moderate | `demo-adventure/page.tsx:557-569` | Lift the inactive label to `text-text-secondary` (#918B7E → ~5.6:1) and bump pills to 11px. |
| "Moment of Truth…", "Story Moment…", "Set the Scene…", "Push Narrative Event", "Scene Break…" — five GM CTAs stacked vertically, most styled identically with a "title… / one-line description" pattern. Hard to scan, easy to misclick. | Moderate | `ContextPanel.tsx:160-549` | Group into 2–3 categories: **Pacing** (Scene Break, Story Moment), **Action** (Moment of Truth), **Atmosphere** (Set the Scene, Push Event). Add a small icon left of each title for shape-level differentiation. |
| The "Edit" affordance on a player's own last turn is 9px text inside the prose, only visible on `group/para hover`. On touch/trackpad-only flows it's effectively invisible. | Moderate | `StoryCanvas.tsx:517-528` | Always render the affordance (low contrast is fine), and bump to 11px. Or surface it as a small pill at the end of the paragraph. |
| The opening narration block uses `text-paper/60` italic. Beautiful, but the same `/60` opacity treatment is later applied to "submitted" votes and to dialogue — three different meanings sharing the same visual treatment. | Minor | `StoryCanvas.tsx:463` | Reserve `paper/60 italic` for narration only. Submitted-vote state should be visually distinct (e.g., subtle sage left rule + `text-text` body). |
| The vote tally pill says `1/3 votes` and `Audience 30` — two scales (per-player vote, spectator pulse) using the same pill style. Hard to know which one matters. | Minor | `FloorRoundPanel.tsx:144-161` | Vote count should be the **primary** number (larger, gold). Audience pulse should sit subordinate (smaller, parenthetical, lavender). |

---

## Visual Hierarchy

**What draws the eye first**: The session title "The Obsidian Crown — Session I"
in 4xl display serif. Good — that's correct on entry. But the same title also
appears in the SessionLog header eyebrow and in the top initiative bar, three
times across the viewport. After the first read, that real estate could
support something more useful (current scene aspect tags? a time-of-day mood
strip?).

**Reading flow** through the center column is strong: H1 → gold rule → italic
opening → prose → voting card. The amber blinking caret at the end of the last
paragraph (`StoryCanvas.tsx:515`) is a lovely "you are here" anchor —
preserve that.

**Emphasis is fighting itself** in the GM right rail. Look at the screenshot:

- "Tension Clocks" header with "No tension clocks yet." takes a section.
- "Party Status" → 3 character cards, each with name, tagline, italic quote, ↓ Approaches link, "They depart / Their story ends" row.
- "Direct Actions" → 5 stacked CTA cards, all roughly the same weight.

Every element has the same eyebrow treatment (10px uppercase tracking-widest
amber). When everything is a chapter heading, nothing is. Three concrete moves:

1. **Demote empty states.** If no tension clocks exist, collapse the section
   to a one-line "+ Add tension clock" affordance. Right now it eats ~80px of
   the panel for the word *none*.
2. **Promote the Roll Request CTA.** "Moment of Truth" is the highest-leverage
   GM action (it changes pacing, calls a player to roll, drives consequence).
   Currently it's the first item but styled identically to "Push Narrative
   Event." Give it a slightly elevated treatment — the gold gradient + chevron
   currently reserved for Story Moment fits better here.
3. **Compress character cards.** Avatar + name + aspect quote is enough at
   rest. Trait, approaches link, status-change buttons collapse behind a
   "view sheet" expansion.

**One specific composition issue**: the Floor Round / Crossroads card sits
inside the same scroll column as the prose, anchored `mt-auto mb-4`
(`FloorRoundPanel.tsx:127`). On short sessions it sits *under* the prose,
which is fine. On long sessions the player has to scroll past the unfolding
story to reach the active vote. Worth considering whether the active round
should stick to the bottom of the viewport (fixed) rather than to the end of
the scroll content.

---

## Consistency

The token system in `globals.css` is well thought out — the comment block
explaining "Lamplight" vs. "Gallery Studio" is a great example of writing
intent down. But the components don't always reach for the tokens.

| Element | Issue | Where | Recommendation |
|---|---|---|---|
| Inline hex / tailwind colors bypass the token system | `text-violet-400`, `text-emerald-400`, `text-red-400`, `text-indigo-400`, `text-cyan-400`, `text-orange-400`, `text-pink-400`, `text-yellow-400`, `text-fuchsia-400` all appear directly | `ContextPanel.tsx:196-205, 341-352`, `StoryCanvas.tsx:399-403`, `SessionLog.tsx:141-156` | The token system already has `--t-ruby`, `--t-emerald`, `--t-amethyst`, `--t-copper`, `--t-teal`. Add `--t-indigo`, `--t-cyan`, `--t-orange`, `--t-pink` (or pick a smaller mood palette) and route mood/tier colors through tokens so light-mode (Gallery Studio) is also covered. |
| `--color-rose` and `--color-ruby` both map to `--t-ruby`; `--color-amber` and `--color-gold` both map to `--t-gold`; `--color-lavender`/`--color-violet`/`--color-amethyst` all map to `--t-amethyst` | Aliases proliferate but components pick arbitrarily | `globals.css:21-32` | Pick one canonical name per token (e.g., `gold`, `ruby`, `amethyst`) and either delete the aliases or codemod components to use the canonical one. Right now `bg-rose/10` and `bg-amber/10` and `bg-violet/10` are scattered without a clear rule. |
| Arbitrary pixel values for typography | `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[17px]`, `text-[19px]` | Throughout | These add up to ~8 distinct type sizes inside the campaign module, none of them on Tailwind's scale. Either codify a small set of campaign-specific type tokens (e.g., `text-eyebrow`, `text-meta`, `text-prose`) or extend the Tailwind theme. |
| Card backgrounds use 4+ idioms | `bg-ink`, `bg-black/40`, `bg-black/30`, `bg-amber/5`, `bg-subtle/30`, `bg-subtle/20` | Throughout | These render as visually similar dark surfaces but each has a different opacity/blend story. Introduce 2–3 surface tokens (e.g., `surface/rest`, `surface/elevated`, `surface/inset`) and route all cards through them. |
| Border colors inconsistent | `border-border`, `border-border-subtle`, `border-amber/20`, `border-amber/30`, `border-lavender/20`, `border-lavender/25`, `border-rose/20`, `border-rose/30` | Throughout | Borders should encode meaning: "structure" (`border-border`), "accent on hover" (`border-border-active`), "stateful" (e.g., `border-warn`, `border-active`). The tinted `border-X/20` pattern reads as decoration. |
| Two visual patterns for "active selection" | `bg-amber/20 + text-amber + border-amber/40` (View As pills, mood pills) vs. `bg-lavender/15 + text-lavender + border-lavender/40` (Crossroads mode) | `demo-adventure/page.tsx:563-565`, `ContextPanel.tsx:196-218`, `FloorRoundPanel.tsx:70-77` | Pick one selected-pill pattern. The lavender variant in Crossroads is good; everything else should mirror it, just swapping the accent token. |

---

## Accessibility

I computed contrast ratios for the key dark-theme tokens against `--t-void`
(#0F0E13). Numbers are WCAG 2.1 contrast ratios; ≥4.5:1 passes body text,
≥3:1 passes large/decorative text.

| Token | Hex | Contrast vs --t-void | WCAG body | WCAG large |
|---|---|---|---|---|
| --t-paper | #EDE8D8 | **15.7:1** | ✅ AAA | ✅ AAA |
| --t-text | #B8B2A0 | **9.0:1** | ✅ AAA | ✅ AAA |
| --t-text-secondary | #918B7E | **5.7:1** | ✅ AA | ✅ AAA |
| --t-text-ghost | #85806F | **4.9:1** | ✅ AA | ✅ AAA |
| --t-text-tertiary | #6E6962 | **3.5:1** | ❌ AA fail | ✅ AA |
| --t-gold | #D4A843 | **8.7:1** | ✅ AAA | ✅ AAA |

**The main finding**: `--t-text-tertiary` (#6E6962) fails AA for body text by a
clear margin (3.5:1 vs. the 4.5:1 requirement). It's used **extensively**:

- Demo banner subtitle ("Fixture data, no API calls…")
- Vote count / status pills inside the Floor Round
- Every GM action description ("Mark a new scene or act in the story.")
- Every form label inside collapsible GM forms ("Title (optional)", "Mood", "Scene Aspects (optional)")
- "Approaches" labels in the character sheet
- Character status copy ("Wears his oaths heavier than his sword")
- Eyebrow labels in `CharacterSheetSection` etc.

This is a meaningful accessibility gap, not a corner case. There's already
precedent for fixing it — the comment on `--t-text-ghost` in `globals.css:77-81`
explains it was raised from a previous fail to ~4.5:1. Apply the same fix to
`--t-text-tertiary`: shift it from #6E6962 to approximately **#8C8678**
(should land around 4.6:1). Cascading change, but everywhere it's used
suddenly clears AA.

**Other contrast concerns**:

- `text-amber/40` resolves to ~2.3:1 against void. Used for the "edit" pill,
  several GM tool icon strokes, and disabled-button copy. Either bump to
  `text-amber/60` (~3.5:1, passes large) or use the design token.
- `text-emerald-400/50` and `text-red-400/50` for win/lose hints in the roll
  request modal calc to ~2.8–3.0:1 against the violet card bg. As noted in
  the usability table — these are *stakes copy* and should be at full
  opacity.
- Color is the primary differentiator in many places: tier colors on dice
  rolls (`text-amber` / `text-yellow-400` / `text-red-400`), mood pills,
  initiative bar player avatars (color-only differentiation via
  `getPlayerColor`). For color-blind users, add a redundant cue: an icon
  (✓ / ⚠ / ✕ for roll tiers) or a shape variation (filled vs. outlined
  avatars for active vs. inactive players).

**Focus states**: Inputs `outline-none focus:border-amber/40` is consistent,
but **buttons have no visible focus ring**. Keyboard users on the View As
switcher, the GM action cards, the vote buttons, the chat input — none of
them get a focus indicator. Add `focus-visible:ring-1 ring-amber/60
ring-offset-1 ring-offset-void` (or equivalent token) as a default on
interactive elements.

**Touch targets**: View As pills are ~24×24px effective; reactions in the
Waiting state are ~28×28; the kebab-style edit affordance is ~12px tall.
WCAG 2.5.5 wants 44×44px for AA; Apple HIG wants 44pt; Material wants 48dp.
At desktop scale this matters less, but if this view will ever be reused on
tablet/mobile, the touch targets need a pass.

**Scrollbars hidden** removes a navigation affordance. At minimum, restore on
keyboard focus / hover within the scroll container so screen-reader and
keyboard users can sense the overflow.

**Banners/overlays z-index**: The paper-grain texture (`body::after`,
z-9998) and warm vignette (`body::before`, z-9999) sit *above* the demo
banner (z-60) and modals. They're `pointer-events: none` so they don't
block, but the radial vignette darkens the corners — including the corners
of the SessionLog and the right rail. Worth verifying that critical edge
content (the chat input, the "End Session" button) doesn't lose contrast
inside the vignette.

---

## UX Copy

A few items where flavor and learnability are in mild tension:

- **"Moment of Truth…" → "Request Roll" semantically.** Flavor is great for
  veteran groups; new users may not connect the label to the mechanic. Try a
  subtitle: "Moment of Truth · Request a roll".
- **"Push Narrative Event" / "Inject an unexpected turn of events."** "Push"
  is dev-tool language. "Drop a twist…" or "Force an event…" matches the
  ritual register of the rest of the UI better.
- **"Crossroads"** + "Open Crossroads" + "GM Pick" / "Table Vote" / "Audience
  Pulse" — three nested names for one feature. Consider keeping "Crossroads"
  as the verb ("Call a Crossroads…") and dropping it from the panel header
  (just title it after the mode).
- **"Their story ends" / "They depart"** for kill/retire is gorgeous — keep
  it. But add a confirm step. ("They depart" implying a 30-second undo, like
  Gmail's send, would be on-brand.)
- **"Press Enter or comma to add"** (Scene Aspects) is helpful and rare in
  this kind of input — preserve.
- **"Your character has fallen"** + "Write your final moment" — this whole
  Last Words block (`StoryCanvas.tsx:653-687`) is some of the best
  microcopy in the app. Use this voice as the reference for the rest.

---

## What Works Well

- The token system in `globals.css` is doing real work. The dual-theme
  Lamplight (dark) / Gallery Studio (light) annotation is a model for how to
  document a palette's intent. The comment on the WCAG fix to `--t-text-ghost`
  (lines 77-81) is exactly the kind of paper trail teams should be leaving.
- **Prose-first center column.** 19px/2.1 line-height literata with italic
  opening narration, gold left rule, drop caps available, mood-driven scene
  aspect pills, and a blinking amber caret at the end — this is the moat.
  Don't let it erode.
- **Mood system.** Scene aspect pills tinted to the active mood
  (`StoryCanvas.tsx:394-417`) is a subtle, tasteful way to set tone without
  full-page color-flooding. The 3-second crossfade on mood tint changes is
  the right tempo.
- **Floor Round / Crossroads** is conceptually strong: separating "table
  vote" from "audience pulse" so spectators can react without diluting player
  agency is a real product idea, not just a UI flourish.
- **`getSessionInteractionState`** as a single source of truth for what a
  user can do at a given moment is exactly the right abstraction. Keep
  pulling logic into there.
- **Light mode considered.** `html.theme-light` isn't an afterthought — the
  Gallery Studio palette comment shows intent (Apple-minimal, cool zinc,
  refined aged brass). That's a discipline a lot of dark-first apps skip.

---

## Priority Recommendations

If you only do five things:

1. **Raise `--t-text-tertiary` to clear WCAG AA body contrast.** A one-line
   token change in `globals.css:80` (e.g., #6E6962 → ~#8C8678). Lifts dozens
   of components above 4.5:1 without touching any component code. This is
   the single highest-impact change you can make.

2. **Fix the roll-request stakes copy.** Win/lose conditions in
   `SessionLog.tsx:155-156` are at ~2.8:1. Move to full opacity and 11–12px.
   Stakes are the emotional core of the roll — they should be readable.

3. **Add a visible Send button to the OOC chat.** `SessionLog.tsx:236-244`.
   Trivial fix, removes a common new-user failure.

4. **Group and prioritize the GM right-rail actions.** Five stacked
   identical-looking CTAs flatten the dashboard. Group into Pacing / Action
   / Atmosphere, add a leading icon per item, and elevate "Moment of Truth"
   as the primary CTA (currently styled like a sibling). `ContextPanel.tsx:160-549`.

5. **Move destructive character-status actions behind a kebab.** "They
   depart" and "Their story ends" are one click from any character row in
   the party panel — they should require an explicit affordance + confirm.
   `ContextPanel.tsx` (Party Status section, via `CharacterSheetSection`).

A second tier, when there's bandwidth: route mood/tier colors through tokens
(remove inline `text-violet-400` etc.), add visible focus rings on buttons,
introduce a small set of typography tokens to replace the `text-[Npx]` zoo,
and consider sticking the active Floor Round to the viewport bottom rather
than the scroll content's bottom.

---

*Reviewed: 15 May 2026.*
