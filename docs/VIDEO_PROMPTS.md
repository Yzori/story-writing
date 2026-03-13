# Inkwell Hero Video — AI Generation Prompts

## Strategy

1. **Midjourney** → Generate 3 keyframe images (writer, bridge moment, reader)
2. **Runway ML Gen-3/Gen-4** → Animate each keyframe into ~5s clips
3. **Edit** → Stitch clips, add transitions, loop point, grain overlay

All prompts tuned to match Inkwell's warm mahogany + firelight gold palette.

---

## Phase 1: Midjourney Keyframe Prompts

### Keyframe 1 — The Writer (Left Side)

```
A stylized figure writing with a quill at a warm wooden desk, single candlelight casting golden volumetric light, luminous gold ink particles lifting off the parchment page and floating upward, cozy dark mahogany study with faint bookshelves in background, low-poly faceted art style inspired by Monument Valley and Firewatch, warm color palette of deep brown #110E0A and firelight gold #C8963C, shallow depth of field, dust motes in candlelight, intimate and magical atmosphere, no cool tones --ar 16:9 --s 750 --style raw --v 6.1
```

### Keyframe 2 — The Bridge (Center Transition)

```
Luminous golden ink particles flowing in an organic river of light from left to right, particles transforming mid-stream from formless calligraphy ink into the silhouette of a majestic dragon with unfurling wings, gold #C8963C particles fading into soft amethyst #7E5E9E, dark warm mahogany background #110E0A, the transformation feels like ink becoming light becoming life, stylized low-poly aesthetic inspired by Ori and the Blind Forest and The Secret of Kells, volumetric soft lighting, no cool tones --ar 16:9 --s 750 --style raw --v 6.1
```

### Keyframe 3 — The Reader (Right Side)

```
A stylized figure reclining in a cozy reading nook holding an open glowing book, a majestic luminous dragon emerging upward from the book pages with wings fully unfurled, the dragon casts golden #C8963C and amethyst #7E5E9E light across the reader's face tilted up in wonder, warm reading nook with blanket and floor lamp, deep mahogany background #110E0A, faceted low-poly art style inspired by Monument Valley and Firewatch, the book glows like backlit parchment, volumetric candlelight, magical and awe-inspiring, no cool tones --ar 16:9 --s 750 --style raw --v 6.1
```

### Keyframe 4 — Full Split-Screen Composition

```
Split screen diptych, left side a writer at a candlelit desk writing with a quill with luminous gold ink particles rising from the page, right side a reader in a cozy nook looking up in awe as a majestic dragon made of light emerges from their glowing book, a flowing river of golden #C8963C to amethyst #7E5E9E light particles connects both sides through the center, deep warm mahogany background #110E0A, stylized faceted low-poly art style inspired by Monument Valley and Firewatch, volumetric soft candlelight, warm intimate magical atmosphere, no cool tones no blues no grays --ar 16:9 --s 750 --style raw --v 6.1
```

> **Tip:** Run Keyframe 4 first. If MJ nails the composition, you can use that single image as the Runway source. If not, generate 1–3 separately and composite in Photoshop before animating.

---

## Phase 2: Runway ML Animation Prompts

Use **Gen-3 Alpha Turbo** or **Gen-4** in image-to-video mode. Upload the best Midjourney keyframe as the input image.

### Option A — From Full Split-Screen (Keyframe 4)

**Prompt:**
```
Slow cinematic camera, the writer's hand moves the quill across parchment as luminous golden ink particles gently lift off the page and float rightward in a flowing stream, the particles gradually take the shape of a dragon mid-flight, on the right side the dragon emerges from the reader's glowing book as the reader looks up in wonder, soft volumetric candlelight flickers, tiny dust motes drift through warm golden light, gentle and magical, seamless loop
```

**Settings:**
- Duration: 10s (or max available)
- Motion: 3–5 (gentle, not chaotic)
- Seed: lock after best result for consistency

### Option B — Animate Each Side Separately

#### B1: Writer Side Animation
**Input:** Keyframe 1 image

```
The writer's hand slowly moves a quill across parchment, luminous golden ink particles gently rise from the page and float upward and to the right, candlelight flickers softly casting warm dancing shadows, tiny dust motes drift through the golden volumetric light, the ink particles glow and pulse gently as they lift away, slow and intimate, warm atmosphere
```

#### B2: Bridge/Dragon Formation Animation
**Input:** Keyframe 2 image

```
A flowing river of luminous golden light particles drifts from left to right, the particles slowly coalesce and take the form of a majestic dragon with wings beginning to unfurl, the transformation is fluid and organic like ink becoming light becoming life, gold particles shift to soft amethyst as they move right, dark warm background, magical and awe-inspiring, slow elegant movement
```

#### B3: Reader Side Animation
**Input:** Keyframe 3 image

```
A luminous dragon made of golden and amethyst light fully emerges from the pages of a glowing book, its wings unfurl majestically casting warm light across the reader's face, the reader tilts their head up slightly in wonder, the dragon begins to slowly dissolve back into gentle floating particles that drift downward, soft volumetric light pulses from the book, warm intimate atmosphere
```

**Settings for all B clips:**
- Duration: 5s each
- Motion: 2–4 (gentle)
- Stitch in DaVinci Resolve/Premiere with cross-dissolve transitions

---

## Phase 3: Post-Production

### Stitching (DaVinci Resolve / Premiere / CapCut)

1. **Timeline:** Writer (5s) → Bridge (5s) → Reader (5s) = ~15s
2. **Transitions:** 1s cross-dissolve between each clip
3. **Loop point:** The dragon dissolving into particles at the end should match the writer's particles rising at the start — use a 2s cross-dissolve at the loop seam
4. **Speed:** Slow the whole thing to 80% if it feels rushed

### Color Grade
- Lift shadows toward warm brown (never true black)
- Push highlights toward gold #C8963C
- Kill any blue/cyan that Runway introduces
- Add subtle warm vignette

### Overlays
- Paper grain texture at 5–10% opacity (match the website's grain)
- Very subtle film grain (ISO 800 look)

### Export
| Format | Codec | Size Target |
|--------|-------|-------------|
| MP4 | H.264, CRF 23 | < 8 MB |
| WebM | VP9, CRF 30 | < 5 MB |
| Poster | JPG (best frame) | — |

---

## Alternative: Kling AI

If Runway results feel too "AI-floaty", try **Kling 1.6** which handles:
- Better physics on particle movement
- More coherent character consistency
- Longer generation (up to 10s native)

Same prompts work — just paste them into Kling's image-to-video mode.

---

## Cost Estimate

| Tool | Cost |
|------|------|
| Midjourney (Standard plan) | $30/mo — plenty of generations |
| Runway (Standard plan) | $15/mo — ~67s of Gen-3 video |
| **Total** | **~$45** + your editing time |

This is the "$50–$150" tier from the brief — AI-assisted with manual cleanup.
