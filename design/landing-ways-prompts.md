# "IV · The Ways" — art prompts for the homepage feature stills

Three portrait images for the **alone / together / alive** cards on
`/mockup-homepage-v4` (section "IV · The Ways"). They replace the current
frame-grabs from the hero video, which are motion-soft — and Act II's frame
shows ink *in transit*, not collaboration, so "together" reads wrong.

**Drop-in paths (overwrite, no code change needed):**

- `public/landing/still-alone.png`
- `public/landing/still-together.png`
- `public/landing/still-alive.png`

**Format:** portrait, `--ar 3:4`. Cards crop with `object-cover`, and a
dark gradient covers the bottom ~30% (caption zone) — keep key subject
matter in the upper two-thirds.

**Style anchor:** must read as deleted scenes from the hero film —
cinematic painterly anime with ADULT, semi-realistic characters (the
"light novel cover" phrasing skewed childish; avoid it). Mahogany-dark
night interiors, single warm light sources, luminous gold ink (#E0A93C)
as the magic element, deep blue night windows, soft amethyst (#7E5E9E)
secondary glow. **Use the actual film frames as `--sref`** (e.g.
`public/landing/still-alone.png`) — with the video as style ref the text
prompt only has to describe the scene. If results still skew young, add
`--no chibi, children, oversized eyes`. No text, no
captions, no watermarks. Per the house rule: colored darks + bright gold
light + saturated accents — never brown-on-brown gloom.

---

## 1 · alone — `still-alone.png`

> Cinematic anime film still, painterly digital art, a man in his late
> twenties in a rumpled suit writing alone at a wooden desk in a vast
> midnight library, semi-realistic proportions, focused expression, one
> brass lantern casting warm golden light across the manuscript, luminous
> gold ink rising off the page in a delicate ribbon, tall arched window
> of deep blue night behind, towering bookshelves into darkness, rich
> painterly brushwork, volumetric candlelight, mature atmospheric mood,
> intricate detail --ar 3:4

The current frame-grab of this one is *almost* right — regenerate mainly
for crispness and so all three match.

## 2 · together — `still-together.png` (the important one)

> Cinematic anime film still, painterly digital art, three adult writers
> leaning over one shared glowing manuscript at a round wooden table at
> night, semi-realistic proportions, quiet absorbed expressions, their
> fountain pens trailing separate ribbons of luminous gold ink that braid
> into a single stream of light above the page, warm candlelight on their
> faces, book-lined study, rich painterly brushwork, volumetric golden
> light, mature atmospheric mood, deep blue night window behind --ar 3:4

Key beats: **multiple hands, one page, ink streams braiding into one.**
That braid is the collaboration metaphor the film never shows.

## 3 · alive — `still-alive.png`

> Cinematic anime film still, painterly digital art, a group of adults
> around a candlelit wooden table playing a storytelling game late at
> night, semi-realistic proportions, lit faces tilted up in quiet awe,
> an unrolled parchment map and scattered handwritten pages across the
> table, two brass dice mid-tumble glowing faintly gold, a luminous gold
> dragon made of flowing ink coiling up from the map into the air above
> the table, warm firelight, book-lined room, rich painterly brushwork,
> volumetric light, mature atmospheric mood, deep blue night beyond the
> window, soft amethyst glow in the dragon's wake --ar 3:4

Variant if the map reads as clutter — dragon condenses from the air
instead: swap the map clause for "a luminous gold dragon made of flowing
ink materializing in the air above the center of the table, trails of
golden ink spiraling up from the players' notes". (A central book looked
wrong — the dragon should rise from the game, not a book.)

Key beats: **table, dice, party, and the story rising over the game** —
adventure mode in one image. The film's reader/dragon
frame works as a fallback, but it shows one reader, not a table of
players.
