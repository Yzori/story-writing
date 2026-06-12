# Landing Experience — Island Art Prompts

The `/landing-experience` world stage prefers painted raster islands at:

- `public/landing/island-writer.png`
- `public/landing/island-reader.png`

Drop the two PNGs in and the page upgrades automatically (the coded SVG isles
are only a fallback). The animated creature layer (dragon, butterflies, birds,
drifting pages, sparkles) is rendered by the app on top of the art — do NOT ask
the generator for flying creatures, they'd be frozen mid-air.

**Asset spec:** transparent background PNG (or solid background removed),
~1600px wide, island centered with ~10% margin all around, nothing cropped,
single key light from the upper left. Generate large (2048+) and downscale.

**Style references:** `Untitled.png`, `example 1.png`, `example 2.png` in the
repo root — casual mobile-game isometric dioramas (glossy, toy-like, vivid).

---

## Style core (shared vocabulary that produces the reference look)

> isometric floating island, casual mobile game art style, glossy stylized 3D
> render, cute chunky proportions, miniature toy diorama, vibrant saturated
> colors, smooth rounded shapes, soft gradients, clean studio lighting from the
> upper left, thick earth-slice island base with rocky underside, crisp
> silhouette, high detail, trending game art on Behance

## Writer island

> Isometric floating island, casual mobile game art style, glossy stylized 3D
> render, cute chunky proportions, miniature toy diorama. A storyteller's
> village on lush green grass: a cozy cottage with a bright red roof and glowing
> yellow windows, a cream stone tower topped with a shiny purple observatory
> dome, a stack of giant colorful storybooks with a golden feather quill
> standing in the top book, a small turquoise pond, wooden lanterns, pine trees,
> a winding stone path, tiny flowers, a little golden waterfall pouring off the
> edge. Thick earth-slice base with brown rocky underside and hanging rock
> chunks. Vibrant saturated colors, soft gradients, clean studio lighting from
> the upper left, crisp silhouette, isolated on a plain transparent background,
> full island visible, no text, no watermark

## Reader island — RECOMMENDED (painted storybook, "inside the story")

Concept: the writer island is the *workshop* (where worlds are made); the
reader island is *the world itself, mid-story* — not a library. It rises out
of a colossal open book: you open a book and a world comes out.

> isometric floating island, painted storybook illustration style, stylized
> painterly 3D, Studio Ghibli meets Bastion — a fantasy story-world in miniature
> rising out of a colossal open book at its base, pages becoming terrain: a
> small castle with glowing windows on a rocky crag, an enchanted forest of teal
> and amethyst trees glowing from within, a winding lantern-lit path leading to
> a mysterious freestanding door at the cliff's edge, a rope bridge over a small
> chasm, standing stones, a campfire glowing beside the path, a river of
> luminous water winding through and pouring off the edge as a waterfall of
> light, thick rocky underside with hanging stone chunks, twilight palette of
> deep plum and teal with rich golden window-light, visible brushwork texture,
> sense of wonder and adventure, whimsical but mature, illustrated fantasy novel
> cover quality, isolated object on a plain solid dark purple background,
> centered, no sky, no horizon, no environment around the island, no people, no
> creatures, no text, no watermark --ar 1:1 --stylize 350 --v 7

## Writer island — RECOMMENDED (painted storybook, "the workshop")

> isometric floating island, painted storybook illustration style, stylized
> painterly 3D, Studio Ghibli meets Bastion — a writer's refuge at dusk: a
> timber writing hall with a deep ruby roof and warm golden windows, a stone
> tower topped with a violet observatory dome, a monument of giant stacked
> storybooks with a golden quill standing in the top one, a small ink-dark pond
> reflecting lantern light, pine trees, a winding stone path, hanging lanterns,
> thick rocky underside with hanging stone chunks and trailing roots, a thin
> waterfall of glowing golden ink pouring off the edge, twilight palette of warm
> umber and plum with rich golden lamplight and ruby accents, visible brushwork
> texture, whimsical but mature, illustrated fantasy novel cover quality,
> isolated object on a plain solid dark purple background, centered, no sky, no
> horizon, no environment around the island, no text, no watermark
> --ar 1:1 --stylize 350 --v 7

Generate the reader island first, pick the winner, then pass it as `--sref`
when generating the writer island so the pair shares one painter's hand.

---

## Tool notes

- **Midjourney:** append `--v 6.1 --style raw --ar 16:10`; if it drifts
  realistic, swap "3D render" for "Clash-of-Clans-style game art". Niji mode
  also suits this aesthetic.
- **DALL·E / GPT-4o images:** prompts work as-is; add "plain solid dark purple
  background, nothing else in the scene" (transparency support varies — strip
  the background after with remove.bg or similar).
- **SD / Flux negative prompt:** photorealistic, realistic textures, text,
  watermark, people, busy background, landscape scenery
- If the silhouette gets busy: add "simple composition, few elements, lots of
  empty grass".
