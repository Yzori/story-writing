# Quiloria Color System

**Status:** Canonical, as of June 2026. Token values live in `src/app/globals.css`
(the `html, html.theme-dark` and `html.theme-light` blocks). Every value below is
contrast-verified; do not tweak a token without re-checking its row in the matrix.

---

## Philosophy: one library, two times of day

Quiloria is a library that stories live in. Both themes are **the same room**:

- **Lamplight** (`theme-dark`, default) — the library at night. The room is lit by
  the lamp, not the moon: every surface is a firelit umber brown-black, text is
  warm cream, and gold reads as candle flame.
- **Daybreak** (`theme-light`) — the same room at morning. Curtains open, lamp off:
  sunlit ivory paper, espresso ink, burnt amber.

The non-negotiable rule that falls out of this: **there is no blue in the base.**
Every surface in both themes sits between hue 28–44 (warm browns and ivories).
The previous dark theme failed precisely here — its surfaces were hue 244–252
(blue-violet), which made "magical library at night" read as a generic SaaS dark
mode. Cool hues are reserved for *accents* (teal, amethyst), where they read as
colored inks on warm paper, never as the room itself.

Secondary principles:

1. **Warm objects in a warm room.** Text, borders, and shadows are all tinted
   toward the base hue. Dark-mode borders are candlelight catching an edge
   (`rgba(255,222,170,…)`), not white wireframes. Light-mode shadows are umber
   (`rgba(76,54,28,…)`), not grey.
2. **Elevation by lightness, not decoration.** Five surface steps per theme
   (void → ink → surface → elevated → subtle), each ~3–4% lighter (dark) or a
   paper-layer brighter (light). Dark mode adds border-light; light mode adds
   soft paper-lift shadows.
3. **Accents are inks, not paint.** Five accent inks (ruby, emerald, amethyst,
   copper, teal) + the gold signature. All are usable as small text on the page
   background in both themes (≥4.5:1) — if a color can't pass that bar, it isn't
   a token here.

---

## Lamplight (dark, default)

### Surfaces — back → front

| Token | Hex | HSL | Use |
|---|---|---|---|
| `--t-void` / `bg-void` | `#110E09` | h38 s31 l5 | Page background |
| `--t-ink` / `bg-ink` | `#181410` | h30 s20 l8 | App zones, recessed wells |
| `--t-surface` / `bg-surface` | `#211B13` | h34 s27 l10 | Sidebars, panels |
| `--t-elevated` / `bg-elevated` | `#2B241A` | h35 s25 l14 | Cards, inputs, popovers |
| `--t-subtle` / `bg-subtle` | `#362E22` | h36 s23 l17 | Hover states, pills, dividers |

### Text — bright → dim (contrast on void / on elevated)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-paper` / `text-paper` | `#F3EBDB` | 16.3 / 12.1 | Headings, primary text |
| `--t-text` / `text-text` | `#CEC3AC` | 11.0 / 8.8 | Body copy |
| `--t-text-secondary` | `#A1957C` | 6.5 / 5.2 | Labels, supporting text |
| `--t-text-tertiary` | `#837861` | 4.4 / 3.5 | Disabled, true de-emphasis |
| `--t-text-ghost` | `#918569` | 5.3 / 4.2 | Uppercase eyebrows, hints |

Ghost sits *above* tertiary on purpose: it carries real product copy (section
eyebrows, "no account needed", scroll hints) and must stay ≥4.5:1 on void.
Tertiary is the only token allowed below 4.5, and only for genuinely inert text.

### Candle gold (signature)

| Token | Hex | On void | Use |
|---|---|---|---|
| `--t-gold` / `text-amber` | `#E0A93E` | 9.1 | CTAs, active states, links — safe as text anywhere |
| `--t-gold-light` | `#EFC465` | 11.8 | Hover brightening, flame cores |
| `--t-gold-dark` | `#B28432` | 5.6 | Pressed states, gilt edges |
| `--t-gold-soft` | `#E0A93E26` | — | Tinted fills (15% alpha) |
| `--t-gold-glow` | `#E0A93E14` | — | Ambient glows (8% alpha) |
| `--t-gold-fill` / `bg-gold-fill` | `#E0A93E` | — | Solid CTA/badge fills (== gold at night) |
| `--t-on-gold` / `text-on-gold` | `#110E09` | 9.1 on fill | Labels sitting on a gold fill |

### Accent inks (all ≥4.5:1 on void)

| Token | Hex | On void | Semantic |
|---|---|---|---|
| `--t-ruby` / `text-rose` | `#CE7186` | 5.8 | Destructive, errors |
| `--t-emerald` / `text-sage` | `#85B796` | 8.5 | Success, published |
| `--t-amethyst` / `text-lavender` | `#AC9CDE` | 7.9 | Informational |
| `--t-copper` / `text-burnt` | `#CD9468` | 7.4 | Warm secondary accent |
| `--t-teal` | `#72B5B2` | 8.2 | Cool counterpoint |

### Borders & shadows

- `--t-border: rgba(255,222,170,0.08)` · subtle `0.05` · active `0.16` —
  candlelight on an edge. Never pure white alpha.
- Cards have **no resting shadow** (`--t-shadow-card: none`); elevation is the
  lightness step + border. Hover adds a gold bloom
  (`0 0 24px rgba(224,169,62,0.10)`); modals get a warm ring + deep black drop.

---

## Daybreak (light)

### Surfaces — back → front

| Token | Hex | HSL | Use |
|---|---|---|---|
| `--t-void` | `#F6F0E3` | h41 s51 l93 | Page background — sunlit ivory |
| `--t-ink` | `#EFE7D5` | h42 s45 l89 | App zones — vellum |
| `--t-surface` | `#FCF9F1` | h44 s65 l97 | Panels — warm white |
| `--t-elevated` | `#FFFEFA` | h48 l99 | Cards, inputs, modals |
| `--t-subtle` | `#E7DCC6` | h40 s41 l84 | Pills, hover, dividers |

### Text — espresso inks (contrast on void)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-paper` | `#231A10` | 15.1 | Headings |
| `--t-text` | `#483828` | 9.9 | Body copy |
| `--t-text-secondary` | `#6E5E4B` | 5.5 | Labels |
| `--t-text-tertiary` | `#7C6B50` | 4.5 | Disabled |
| `--t-text-ghost` | `#8E7D5E` | 3.5 | Eyebrows, hints |

### Gold splits by role in daylight

The old light-mode gold (`#B98216`, mustard) hit **2.9:1** on the page — it
failed AA for every text use it had (CTAs, links, active nav). But the two
roles of gold can't share one value in daylight: text-capable gold is dark,
and a dark gold *fill* is a muddy brown slab — not clean, not cozy. So:

- **Gold as text** = burnt-amber ink (`#A0540B`, 4.9:1). Hue ~29 matters:
  yellow-leaning dark golds (h36–40, e.g. the rejected bronze `#96600F`) read
  as muddy brown on ivory; orange-leaning amber at the same lightness reads
  as fire.
- **Gold as a solid fill** (buttons, badges) = **honey** (`#E8B23F`) — the same
  warmth as Lamplight's flame — with espresso labels (`--t-on-gold`, 8.9:1).

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--t-gold` | `#A0540B` | 4.9 on void | Accent **text**, links, active states |
| `--t-gold-fill` | `#E8B23F` | 8.9 w/ on-gold | Solid CTA/badge fills — never dark amber |
| `--t-gold-fill-hover` | `#DFA52C` | 7.8 w/ on-gold | Fill hover |
| `--t-on-gold` | `#231A10` | — | Labels on a gold fill |
| `--t-gold-light` | `#BE6F15` | 3.4 on void | Large display type only (AA-large) |
| `--t-gold-dark` | `#7A3E06` | 7.3 on void | Pressed, high-emphasis accent text |
| `--t-gold-soft` | `#A0540B22` | — | Tinted fills |
| `--t-gold-glow` | `#BE6F1514` | — | Ambient warmth |

Existing `bg-amber`/`bg-gold` call sites (~280) are re-pointed to the honey
fill by overrides in `globals.css` (which also flip `text-void` / `text-ink` /
`text-black` labels on those fills to `--t-on-gold`). **New code should use
`bg-gold-fill` + `text-on-gold` directly.**

### Accent inks (all ≥4.5:1 on void)

| Token | Hex | On void |
|---|---|---|
| `--t-ruby` | `#A2455A` | 5.2 |
| `--t-emerald` | `#426C52` | 5.3 |
| `--t-amethyst` | `#6B549F` | 5.5 |
| `--t-copper` | `#98512A` | 5.2 |
| `--t-teal` | `#3D7176` | 4.8 |

### Borders & shadows

- `--t-border: rgba(76,54,28,0.15)` · subtle `0.09` · active `0.28` — printed
  edges, never grey.
- Shadows are layered umber paper-lift (see `--t-shadow-*`); hover adds a faint
  bronze cast. Light mode uses shadows where dark mode uses border-light.

---

## Usage rules

1. **Tailwind classes only** (`bg-void`, `text-amber`, `border-border`, …) — never
   raw hex in components. Both themes resolve through the same semantic tokens.
2. **Gold as text:** always `text-amber` (resolves to a text-safe value in both
   themes). Never use `gold-light` for small text in light mode — it only passes
   AA-large.
3. **Gold as fill:** solid CTAs/badges use `bg-gold-fill` with `text-on-gold`
   labels. Legacy `bg-amber`/`bg-gold` still works via the Daybreak overrides,
   but don't add new call sites with it.
4. **Ghost vs tertiary:** ghost is for copy that should whisper but still be
   read (eyebrows, hints). Tertiary is for text that may be ignored (disabled).
   If a reviewer squints at it, it should have been ghost or better.
5. **No new blues.** If a feature needs a cool tone, it's `teal` or `amethyst`,
   used as an ink — never as a surface or large fill.
6. **Tinted fills** use accent + alpha (`bg-amber/10`, `border-amber/30`), same
   as before. Alpha fills inherit the theme-correct hue automatically.
7. **Decorative SVG art** should sample from the token palette of the theme it
   ships in (see `InteractiveSplitLayout`, scriptorium illustrations — both
   updated to the new values).

### Intentional exceptions (do not "fix")

- **Webtoon speech bubbles** (`globals.css`, bubble styles) — comic-paper white
  with black strokes; they are printed objects, theme-independent.
- **Screenplay reader** — Courier on white; it imitates a printed script page.
- **Adventure paper mode** (`--adventure-*` tokens) — its own self-contained
  parchment palette for the play surface.
- **Concept mockups** under `src/app/mockup*` — standalone palettes by design.

---

## What changed (June 2026 redesign) and why

| Problem in the old system | Fix |
|---|---|
| Dark surfaces were blue-violet (h244–252) — generic SaaS dark mode under a literary brand; every approved mockup (Hearth, Bookshop, Living Library) was warm | Entire dark ladder rebuilt on firelit umber (h30–38) |
| Dark body text `#B8B2A0` (14% sat) read as faded khaki | Creamier, brighter `#CEC3AC` (11:1) |
| Dark accents were ashen pastels | Re-saturated as lamplit inks; all gained 1–2 contrast points |
| Dark borders were literal white alpha ("Linear/Raycast style" per old comment) | Candlelight-tinted `rgba(255,222,170,…)` |
| Light gold `#B98216` = 2.9:1 — failed AA as text while being the primary accent | Split: burnt amber `#A0540B` (4.9:1) for text, honey `#E8B23F` for fills (bronze `#96600F` was tried first and rejected as muddy) |
| Light `text-ghost` `#B8AA98` = **1.95:1**, illegible; tertiary 2.8:1 | `#8E7D5E` (3.5:1) and `#7C6B50` (4.5:1) — same fix dark ghost already had |
| Dark `text-tertiary` 2.7:1 on elevated | `#837861` (3.5:1 on elevated) |
| Light theme was coherent but murky beige-on-beige | Brighter ivory page, warm-white panels, deeper `subtle`, espresso ink — more dynamic range between layers |

Verification script: contrast math used for this doc lives in the redesign
session (`WCAG relative luminance`, standard formula). If you change any token,
re-check: text tokens ≥4.5:1 on `void` (ghost ≥3:1 light / ≥4.5:1 dark,
tertiary ≥3:1 on `elevated`), accents ≥4.5:1 on `void`, gold-as-text ≥4.5:1.
