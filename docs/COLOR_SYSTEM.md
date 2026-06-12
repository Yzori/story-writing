# Quiloria Color System

**Status:** Canonical, as of June 2026 (Midnight Scriptorium redesign, 2026-06-12).
Token values live in `src/app/globals.css` (the `html, html.theme-dark` and
`html.theme-light` blocks). Every value below is contrast-verified; do not tweak
a token without re-checking its row in the matrix.

Concept exploration that led here: `public/quiloria-color-concepts.html`
(four rendered directions; "Midnight Scriptorium" was chosen).

---

## Philosophy: the illuminated manuscript

Quiloria's vocabulary is ink — Ink Drops, the Ink Dock, the quill. Real writing
ink is iron-gall **blue-black**, and the most beautiful books ever made set
that ink against gold leaf and vellum. Both themes are the same manuscript:

- **Midnight Scriptorium** (`theme-dark`, default) — the manuscript at night.
  Surfaces are deep ink-blue-black (hue ~222) that gain a little chroma as they
  rise toward the reader; text is warm vellum cream; gold is candle flame.
- **Vellum** (`theme-light`) — the page itself by day. Vellum-white paper
  (near white, never beige), true-white cards floating on it Apple-style, and
  iron-gall blue-black ink for text. Gold becomes gilt detail.

Three principles fall out of this:

1. **Warm light on cool dark.** The warmth lives in the *light* — text, gold,
   lamp glows — never in the shadows. Gold (h≈42) sits opposite blue (h≈222) on
   the wheel, so it burns brighter on midnight than on any neutral or brown
   black. The previous all-warm dark theme failed here: warm surfaces + warm
   text + warm accents collapsed into brown-on-brown mush.
2. **Elevation by lightness, not decoration.** Five surface steps per theme
   (void → ink → surface → elevated → subtle). Dark mode adds gilt border-light;
   light mode adds feather ink-tinted shadows (white cards on vellum, the
   white-on-`#F5F5F7` layering trick, warmed ~2% so it never goes clinical).
3. **Accents are inks, not paint.** Six accent inks (ruby, emerald, amethyst,
   copper, teal, lapis) + the gold signature. All usable as small text on the
   page background in both themes (≥4.5:1) — if a color can't pass that bar,
   it isn't a token here. Lapis is new: on a midnight base, blue is finally
   available as an *ink* (it was unusable as an accent when it was banned
   outright).

A note on history: this system deliberately repeals the June-10 "no blue, ever"
rule. That rule was written after a blue-violet dark mode read as generic SaaS —
but the failure was execution (desaturated gray-violet surfaces, ashen pastel
accents), not hue. The cure is commitment: deep, chromatic midnight + vellum
text + gold, not hue-banning. What remains true: **no grey** — every neutral is
either ink-tinted (cool) or vellum-tinted (warm), never `#888`.

---

## Midnight Scriptorium (dark, default)

### Surfaces — back → front (hue ~222, chroma rises with elevation)

| Token | Hex | Use |
|---|---|---|
| `--t-void` / `bg-void` | `#090B12` | Page background |
| `--t-ink` / `bg-ink` | `#0E1220` | App zones, recessed wells |
| `--t-surface` / `bg-surface` | `#131A2D` | Sidebars, panels |
| `--t-elevated` / `bg-elevated` | `#19223B` | Cards, inputs, popovers |
| `--t-subtle` / `bg-subtle` | `#202C4A` | Hover states, pills, dividers |

### Text — vellum, bright → dim (contrast on void / on elevated)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-paper` / `text-paper` | `#F2EDDD` | 16.8 / 12.4 | Headings, primary text |
| `--t-text` / `text-text` | `#C6C3B4` | 11.1 / 8.2 | Body copy |
| `--t-text-secondary` | `#94948A` | 6.4 / 4.7 | Labels, supporting text |
| `--t-text-tertiary` | `#767A7E` | 4.6 / 3.6 | Disabled, true de-emphasis |
| `--t-text-ghost` | `#8C8D83` | 5.9 / 4.7 | Uppercase eyebrows, hints |

Ghost sits *above* tertiary on purpose: it carries real product copy (section
eyebrows, "no account needed", scroll hints) and must stay ≥4.5:1 on void.
Tertiary is the only token allowed below 4.5, and only for genuinely inert text.

### Candle gold (signature)

| Token | Hex | On void | Use |
|---|---|---|---|
| `--t-gold` / `text-amber` | `#E2AC4A` | 9.6 | CTAs, active states, links — safe as text anywhere |
| `--t-gold-light` | `#F0C76C` | 12.3 | Hover brightening, flame cores |
| `--t-gold-dark` | `#B5862F` | 6.0 | Pressed states, gilt edges |
| `--t-gold-soft` | `#E2AC4A26` | — | Tinted fills (15% alpha) |
| `--t-gold-glow` | `#E2AC4A14` | — | Ambient glows (8% alpha) |
| `--t-gold-fill` / `bg-gold-fill` | `#E2AC4A` | — | Solid CTA/badge fills (== gold at night) |
| `--t-on-gold` / `text-on-gold` | `#13100A` | 9.6 on fill | Labels sitting on a gold fill |

### Accent inks (all ≥4.5:1 on void)

| Token | Hex | On void | Semantic |
|---|---|---|---|
| `--t-ruby` / `text-rose` | `#E0708A` | 6.4 | Destructive, errors |
| `--t-emerald` / `text-sage` | `#7FC796` | 9.8 | Success, published |
| `--t-amethyst` / `text-lavender` | `#B49CF0` | 8.4 | Informational |
| `--t-copper` / `text-burnt` | `#D89A60` | 8.2 | Warm secondary accent |
| `--t-teal` | `#6FC2BD` | 9.5 | Cool counterpoint |
| `--t-lapis` / `text-lapis` | `#7FA3F0` | 7.9 | Links-adjacent, lore/worldbuilding flavor |

### Borders & shadows

- `--t-border: rgba(240,199,108,0.09)` · subtle `0.05` · active `0.18` —
  gilt catching an edge. Never pure white alpha.
- Cards have **no resting shadow** (`--t-shadow-card: none`); elevation is the
  lightness step + border. Hover adds a gold bloom
  (`0 0 24px rgba(226,172,74,0.10)`); modals get a gilt ring + deep night drop.

---

## Vellum (light)

### Surfaces — back → front

| Token | Hex | Use |
|---|---|---|
| `--t-void` | `#FBF9F4` | Page background — vellum white |
| `--t-ink` | `#F1EFE8` | App zones — recessed vellum |
| `--t-surface` | `#FDFCF9` | Panels — just off the page |
| `--t-elevated` | `#FFFFFF` | Cards, inputs, modals — true white, floats |
| `--t-subtle` | `#E9E6DD` | Pills, hover, dividers |

The layering is the Apple recipe (white on soft neutral) with ~2% warmth.
The old beige ivory (`#F6F0E3`) is gone; nothing in this theme is beige.

### Text — iron-gall inks (contrast on void)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-paper` | `#1B2230` | 15.1 | Headings — iron-gall blue-black |
| `--t-text` | `#3D4452` | 9.3 | Body copy |
| `--t-text-secondary` | `#636B7B` | 5.1 | Labels |
| `--t-text-tertiary` | `#79808E` | 3.8 | Disabled |
| `--t-text-ghost` | `#878D9A` | 3.2 | Eyebrows, hints |

### Gold splits by role in daylight

Text-capable gold is dark; a dark gold *fill* is a muddy slab. So, as before:

- **Gold as text** = bronze ink (`#8A6512`, 5.0:1). The June-10 doc rejected
  bronze as "muddy on ivory" — that was specific to the beige page. On
  vellum-white and true-white cards it reads as old gold. If it ever drifts
  muddy in practice, the fallback is a slightly more orange `#8F5E10`-family
  value, re-verified.
- **Gold as a solid fill** (buttons, badges) = **honey** (`#E8B23F`) — the same
  flame as Midnight — with ink labels (`--t-on-gold` `#1B2230`, 8.3:1).

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-gold` | `#8A6512` | 5.0 on void | Accent **text**, links, active states |
| `--t-gold-fill` | `#E8B23F` | 8.3 w/ on-gold | Solid CTA/badge fills — never dark bronze |
| `--t-gold-fill-hover` | `#DFA52C` | 7.3 w/ on-gold | Fill hover |
| `--t-on-gold` | `#1B2230` | — | Labels on a gold fill |
| `--t-gold-light` | `#B5861A` | 3.1 on void | Large display type only (AA-large) |
| `--t-gold-dark` | `#6E500E` | 7.1 on void | Pressed, high-emphasis accent text |
| `--t-gold-soft` | `#8A651222` | — | Tinted fills |
| `--t-gold-glow` | `#B5861A14` | — | Ambient warmth |

Legacy `bg-amber`/`bg-gold` call sites (~280) are re-pointed to the honey fill
by overrides in `globals.css` (which also flip `text-void`/`text-ink`/`text-black`
labels on those fills to `--t-on-gold`). **New code should use `bg-gold-fill` +
`text-on-gold` directly.**

### Accent inks (all ≥4.5:1 on void)

| Token | Hex | On void |
|---|---|---|
| `--t-ruby` | `#B0455B` | 5.2 |
| `--t-emerald` | `#2F7A4D` | 5.0 |
| `--t-amethyst` | `#6C55A3` | 5.8 |
| `--t-copper` | `#9A5A28` | 5.2 |
| `--t-teal` | `#2E7479` | 5.1 |
| `--t-lapis` | `#2F4F8F` | 7.6 |

### Borders & shadows

- `--t-border: rgba(27,34,48,0.12)` · subtle `0.07` · active `0.24` — hairline
  ink edges, never grey.
- Shadows are layered ink-tinted paper-lift (see `--t-shadow-*`); hover adds a
  faint bronze cast. Light mode uses shadows where dark mode uses border-light.

---

## Usage rules

1. **Tailwind classes only** (`bg-void`, `text-amber`, `border-border`, …) — never
   raw hex in components. Both themes resolve through the same semantic tokens.
2. **Gold as text:** always `text-amber` (resolves to a text-safe value in both
   themes). Never use `gold-light` for small text in light mode — it only passes
   AA-large.
3. **Gold as fill:** solid CTAs/badges use `bg-gold-fill` with `text-on-gold`
   labels. Legacy `bg-amber`/`bg-gold` still works via the Vellum overrides,
   but don't add new call sites with it.
4. **Ghost vs tertiary:** ghost is for copy that should whisper but still be
   read (eyebrows, hints). Tertiary is for text that may be ignored (disabled).
   If a reviewer squints at it, it should have been ghost or better.
5. **Blue is an ink and a base, never a mid-tone wash.** Surfaces are midnight;
   `lapis` is a small-text/detail ink. What's banned is the in-between: powder
   blue fills, blue-grey panels, `#888`-style neutral greys.
6. **Tinted fills** use accent + alpha (`bg-amber/10`, `border-amber/30`), same
   as before. Alpha fills inherit the theme-correct hue automatically.
7. **Decorative SVG art** should sample from the token palette of the theme it
   ships in (scriptorium illustrations updated to the new gold).

### Intentional exceptions (do not "fix")

- **Anonymous homepage film** (`FilmLanding.tsx`) — graded for near-pure black
  (`rgba(10,8,5)`) with the old gold; it is cinema, not chrome. It already sits
  close to the app's new midnight; regrade is optional polish, not a bug.
- **Webtoon speech bubbles** (`globals.css`, bubble styles) — comic-paper white
  with black strokes; printed objects, theme-independent.
- **Screenplay reader** — Courier on white; imitates a printed script page.
- **Adventure paper mode** (`--adventure-*` tokens + the warm umber shadows in
  its `html.theme-light .adventure-mode` block) — its own self-contained
  parchment palette for the play surface.
- **Concept mockups** under `src/app/mockup*` — standalone palettes by design.

---

## What changed (June 12, 2026 redesign) and why

| Problem in the June-10 system | Fix |
|---|---|
| Dark surfaces were firelit umber — visibly browner than the pure-black homepage everyone loved; app and homepage lived in different worlds | Surfaces rebuilt on iron-gall midnight (`#090B12` → `#202C4A`); homepage and app now share one universe |
| All-warm dark (warm surfaces + warm text + warm accents) kept collapsing into brown-on-brown mush | Warmth moved into the light only: vellum text + candle gold on cool ink darks |
| Gold sat on a near-hue background (h38 on h35) — no complementary pop | Gold (h42) now sits on its complement (h222) and visibly burns |
| Light theme was beige ivory — "old paper" murk, the opposite of a modern reading surface | Vellum-white page + true-white floating cards (Apple layering, 2% warmth), ink-tinted hairlines and feather shadows |
| Light text was espresso brown | Iron-gall blue-black ink — higher perceived crispness, on-brand (ink, not coffee) |
| Blue banned outright — no cool ink available for features that wanted one | Lapis ink added in both themes (`#7FA3F0` / `#2F4F8F`); the ban is narrowed to mid-tone blue washes and pure greys |

Verification: WCAG relative-luminance math (standard formula). If you change any
token, re-check: text tokens ≥4.5:1 on `void` (ghost ≥3:1 light / ≥4.5:1 dark,
tertiary ≥3:1 on `elevated`), accents ≥4.5:1 on `void`, gold-as-text ≥4.5:1,
`on-gold` ≥4.5:1 on both fill states.
