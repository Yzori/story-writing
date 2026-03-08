# Inkwell — Technical Decisions & Research

> Research-backed decisions for building the prose editor and platform foundation. Every choice here is informed by competitive analysis, framework evaluation, and typography/UX research conducted March 2026.

---

## Table of Contents

1. [Editor Framework](#editor-framework)
2. [Document Architecture](#document-architecture)
3. [Collaboration & Sync](#collaboration--sync)
4. [Offline-First Strategy](#offline-first-strategy)
5. [Typography & Reading Experience](#typography--reading-experience)
6. [Writing Experience Design](#writing-experience-design)
7. [CSS & Layout Strategy](#css--layout-strategy)
8. [Competitive Insights](#competitive-insights)
9. [Tech Stack Summary](#tech-stack-summary)

---

## Editor Framework

### Decision: Tiptap v3 (ProseMirror-based)

**Why Tiptap over alternatives:**

| Framework | Verdict | Key Issue |
|---|---|---|
| **Tiptap v3** | **Selected** | Best ecosystem, collaboration, extensibility balance |
| Plate (Slate) | Strong runner-up | Slate has performance concerns at 50k+ words; smaller ecosystem |
| Lexical (Meta) | Watch list | Best raw performance, but pre-1.0, weak collaboration, thin plugin ecosystem |
| Novel | Rejected | Abandoned — last commit Jan 2025, 14+ months stale |
| BlockNote | Rejected | Wrong paradigm — block-per-paragraph model fights prose flow |
| Raw ProseMirror | Fallback | Only if Tiptap can't handle our customization needs |

**Tiptap strengths for our use case:**
- 35.5k GitHub stars, actively maintained (last commit Mar 6, 2026)
- 100+ extensions, tree-shakable — we only ship what we use
- First-class Yjs/CRDT collaboration via Hocuspocus (battle-tested)
- Custom node types for our story-specific blocks (scene breaks, epigraphs, author notes, illustration blocks, mood controls) are well-supported
- 2026 roadmap includes DOCX import/export, PDF export, AI toolkit — aligns with our needs
- The largest community for troubleshooting and learning

**Known risk: long-document performance.**
ProseMirror renders the full DOM. At 50k+ words in a single instance, performance degrades. Mitigation: chapter-per-editor-instance architecture (see Document Architecture below). This is the standard pattern used by Scrivener, Ulysses, and every serious long-form writing tool.

**Fallback plan:** If we hit Tiptap's ceiling on custom rendering or performance, Lexical's double-buffering architecture provides a fundamentally different performance profile. But we'd lose ecosystem maturity — this is a last-resort migration, not a planned path.

---

## Document Architecture

### Decision: Yjs Subdocuments — One Per Chapter

A novel is not a single document. It's a collection of chapters, each a self-contained editing unit. This mirrors how writers actually think and how every serious writing tool works internally.

```
Story Project (Yjs parent document)
├── Metadata (title, synopsis, genre, ratings — Y.Map)
├── Chapter Order (Y.Array of chapter IDs)
├── Chapter 1 (Yjs subdocument)
│   ├── Content (ProseMirror document via Tiptap)
│   ├── Chapter metadata (title, mood, tone, status)
│   └── Illustration placements (Y.Array)
├── Chapter 2 (Yjs subdocument)
│   └── ...
├── Chapter N (Yjs subdocument)
│   └── ...
└── Story Notes (Yjs subdocument)
    ├── Characters (Y.Array)
    ├── Locations (Y.Array)
    └── Freeform notes (ProseMirror document)
```

**Why subdocuments:**
- Each chapter loads independently — opening Chapter 15 doesn't load chapters 1-14 into memory
- Performance stays constant regardless of novel length (each chapter is typically 2-5k words, well within Tiptap's comfort zone)
- Maps naturally to Hocuspocus rooms — each chapter can sync independently
- Enables future collaboration where different collaborators work on different chapters simultaneously
- Yjs subdocument support is mature: documented in Yjs core, supported by Hocuspocus, and Liveblocks added support in Dec 2025

**Chapter management:**
- Chapter ordering lives in the parent document (Y.Array of IDs)
- Drag-and-drop reordering updates the array — all clients see the change via CRDT sync
- Adding/removing chapters creates/destroys subdocuments
- Parts/Acts are structural groups in the order array, not separate documents

---

## Collaboration & Sync

### Phase 0 (Now): Local-Only with Yjs Foundation

Even before we add networking, we use Yjs locally:
- Yjs document model gives us revision history (snapshots) for free
- `y-indexeddb` persists to the browser — auto-save with zero backend
- When we add collaboration later, we don't rewrite the data model — we just add a network provider

### Phase 1: Hocuspocus (Self-Hosted)

When collaboration ships:
- **Hocuspocus** as the WebSocket sync server — open source, production-ready, built by the Tiptap team
- Hooks for auth (`onAuthenticate`), persistence (`onStoreDocument` → PostgreSQL), and business logic
- Each chapter is a Hocuspocus room — collaborators sync per-chapter
- `y-indexeddb` on the client provides offline support — edits sync when reconnected, CRDT guarantees conflict-free merge

### Later: Evaluate Managed Options

- **Liveblocks** — managed Yjs backend, removes ops overhead, but document-based pricing could get expensive for a platform where each user has dozens of chapters
- **Cloudflare Durable Objects (PartyKit)** — edge-deployed, low latency, pay-per-use, but less proven for document collaboration specifically
- Decision deferred until we understand our scale and ops capacity

### Revision History

Built on Yjs snapshots:
- `Y.snapshot(doc)` captures a lightweight state vector (not a full copy)
- Store snapshots + metadata (name, timestamp, author) in PostgreSQL
- Render any historical version by applying the snapshot to the document
- Diff two versions using `y-prosemirror`'s built-in version diff (inline additions/deletions)
- Auto-snapshot on: session end, chapter status change (draft → published), manual "save version"
- Periodically compact the Yjs update log on the server to prevent unbounded growth

---

## Offline-First Strategy

### Decision: PWA with y-indexeddb + Service Worker

Writers write everywhere — trains, cafes, flights, bed. Offline is not a nice-to-have.

**Architecture:**
1. **Service Worker** caches the app shell (HTML, JS, CSS, fonts) — the editor loads instantly, even offline
2. **y-indexeddb** persists the Yjs document to IndexedDB — all chapters available offline
3. **When online:** WebSocket connection (Hocuspocus) syncs diffs in real-time
4. **When offline:** Writer works normally. All changes persist locally.
5. **Coming back online:** Yjs automatically merges offline changes — the CRDT handles conflict resolution without custom logic
6. IndexedDB quota is typically 50-80% of disk per origin — more than enough for novel-length text + image references

**This is simpler than what Linear or Figma do.** CRDTs handle the hard part (conflict resolution). We don't need custom merge logic, operation logs, or last-write-wins strategies.

**PWA implementation:** `next-pwa` or `@serwist/next` for the service worker layer on top of Next.js.

---

## Typography & Reading Experience

### Reading View Typography

**Font selection:**
- **Primary serif (reading):** Merriweather or Lora — designed specifically for screen reading, tall x-heights, balanced proportions. Consider Marjorie (variable font designed for narrative content) as a distinctive option
- **Display/headings:** Playfair Display (already in the project) — beautiful for chapter titles and story titles
- Offer reader choice: at minimum serif, sans-serif, and a dyslexia-friendly option (OpenDyslexic or Lexend)

**Optimal reading parameters:**
| Property | Value | Rationale |
|---|---|---|
| Line length | 60-70 characters | Research sweet spot; 66 chars ideal |
| Line height | 1.5x font size | WCAG recommended, comfortable for extended reading |
| Paragraph spacing | 1.5-2x font size | Prevents "wall of text" without breaking flow |
| Base font size | 18px | Slightly larger than typical web — this is a reading app, not a website |

**OpenType features (always on for prose):**
```css
font-feature-settings:
  "kern" 1,   /* Kerning */
  "liga" 1,   /* Standard ligatures (fi, fl, ff) */
  "clig" 1,   /* Contextual ligatures */
  "onum" 1,   /* Old-style numerals — blend with lowercase text */
  "pnum" 1;   /* Proportional numerals for body text */
```

**Hyphenation and justification:**
```css
text-wrap: pretty;        /* Paragraph-level line-breaking optimization — now baseline */
hyphens: auto;            /* Combined with text-wrap: pretty, approaches print quality */
text-wrap: balance;       /* For headings only — equalizes line lengths */
```

**Dark mode adjustments:**
- Never pure white on pure black — use off-white (#E8E0D8) on dark (#0A0A0A)
- Reduce font weight in dark mode (variable font `wght: 380` vs `400` in light)
- Use the GRAD axis on variable fonts to adjust stroke thickness without changing letter spacing or reflowing text
- Slightly increase letter-spacing in dark mode

### Reading View Modes

**Offer both pagination and scroll, default to pagination for prose:**
- Research shows pagination builds better spatial memory for narrative — readers remember where things happened in the "book"
- Scrolling is faster and handles responsive reflow better — offer as an alternative
- Default to scrolling for poetry and short-form
- Page-turn animations are largely gimmick — use a simple crossfade or instant transition, always respect `prefers-reduced-motion`

**Reading progress:**
- CSS scroll-driven animations for progress bar — zero JavaScript, GPU-accelerated, runs off main thread
- Chapter-based progress indicator ("Chapter 5 of 23 · 42% through this chapter")

### Reader Customization (Ship from Day One)

This is not just accessibility — research shows a 35% reading speed difference between best and worst fonts for a given individual, with no comprehension penalty. Customization is a performance feature for everyone.

- Font choice (serif, sans-serif, dyslexia-friendly, monospace)
- Font size (14px to 28px range)
- Line height (1.3x to 2.0x)
- Letter and word spacing
- Theme (light, dark, sepia, high-contrast)
- Line length / column width
- All preferences persist locally and across sessions

---

## Writing Experience Design

### Lessons from the Competition

The gap no tool has filled: **simple by default, powerful on demand.** iA Writer nails simplicity but lacks structure. Scrivener nails structure but is overwhelming. We need both, through progressive disclosure.

**Key innovations to incorporate:**

| Source | Innovation | How We Use It |
|---|---|---|
| **iA Writer** | Duospace font — 150% width for m/w/M/W, monospace rhythm with better flow | Default writing font. Commission or adopt a duospace variable font |
| **iA Writer** | Focus mode (dims everything except current sentence/paragraph) | Ship this. It genuinely increases output by 2-3x per research |
| **Scrivener** | Binder (tree sidebar for chapters/scenes) | Our chapter navigator. Drag-and-drop reorder, collapsible parts/acts |
| **Ulysses** | Progressive disclosure — features appear only when needed | Core UX principle. Toolbar appears on selection, not permanently |
| **Dabble** | Plot Grid — see plot threads across chapters visually | Future feature (Phase 2+), but architect for it now |
| **Shaxpir** | Sentiment arc visualization — emotional shape of the story | Future feature, genuinely novel, no one else does this well |
| **Novelcrafter** | The Codex — hover over a character name, see their profile inline | Our Lore Book integration. Cross-reference characters/places inline |
| **Obsidian** | Local-first, your-files-forever philosophy | Export to Markdown/EPUB/PDF always available. No lock-in |

### Writing Editor Design Principles

1. **The editor should NOT match the reading view.** Writing and reading are different cognitive modes. The editor uses a duospace font, generous spacing, and a slightly different palette that signals "work in progress." A "Preview" toggle shows the reading view.

2. **Toolbar appears on selection, not permanently.** When you're writing, you see nothing but text. Select text, and the formatting toolbar floats near your selection. This is the Ulysses/Medium model — proven to reduce distraction.

3. **Command palette for everything.** `Cmd+K` opens a command palette: insert scene break, set chapter mood, navigate to chapter, toggle focus mode, view word count. Keyboard-first for power users, discoverable for new users.

4. **Focus mode is real, not decorative.** Dims/hides all text except the current paragraph (configurable: sentence, paragraph, or scene). Full-screen. No UI chrome. Just you and the words. Research backs this: dedicated distraction-free tools increase output 2-3x.

5. **The chapter navigator is always accessible.** A collapsible sidebar showing the chapter/scene tree. Drag to reorder. Click to navigate. Shows word count per chapter. Inspired by Scrivener's Binder but cleaner.

6. **Stats without pressure.** Word count, reading time estimate, and session stats (words written today) are available but never in your face. No gamification, no streaks, no guilt. Available on demand, not broadcast.

---

## CSS & Layout Strategy

### Modern CSS Features We'll Use

| Feature | Use Case | Browser Support |
|---|---|---|
| **Container Queries** | Responsive editor/reading panels that adapt to their container, not viewport | 95%+ global |
| **View Transitions API** | Smooth chapter-to-chapter navigation | Baseline (Interop 2025) |
| **Scroll-Driven Animations** | Reading progress bar, parallax, reveal effects — zero JS | Chrome 115+, Safari 26+, Firefox polyfill |
| **`text-wrap: pretty`** | Paragraph-level line-breaking optimization for prose | Baseline |
| **`text-wrap: balance`** | Heading line equalization | Baseline |
| **`text-box-trim`** | Pixel-perfect vertical rhythm for literary layouts | Chrome (shipping) |
| **`oklch` / `oklab`** | Perceptually uniform colors for our palette and gradients | Baseline |
| **CSS Anchor Positioning** | Tooltip/popover positioning for marginalia and toolbar | Shipping |
| **Variable Fonts** | Weight/grade adjustment for dark mode, responsive sizing | Baseline |

### Annotation Data Model

**Critical decision: content-first, not URL-first.**

Marginalia (reader highlights and reactions) must be anchored to content identifiers, not page URLs or DOM positions. This is because:
- The same content renders at different URLs (story page, reading view, preview)
- Content may reflow across different viewport sizes
- Content may change (revisions) — annotations need to survive edits

Use a model similar to the W3C Web Annotation standard: store the annotation target as a text quote selector + position offset, with the quoted text as a fallback for fuzzy matching if the content changes.

---

## Competitive Insights

### The Gap in the Market

No existing tool successfully combines all of these:

1. Beautiful, distraction-free prose writing (iA Writer level)
2. Powerful structural organization (Scrivener level)
3. Real-time collaboration (Google Docs level)
4. Professional export (Atticus/Vellum level)
5. Web-based and cross-platform
6. Performance at novel scale (100k+ words)
7. Progressive disclosure UX (simple by default, powerful on demand)
8. Data portability (no lock-in)
9. Smart story intelligence (cross-references, arc visualization)

The tools that come closest each nail 2-3 of these but fail at the rest. **That is our opportunity.**

### Key Writer Pain Points (from forums, Reddit, reviews)

1. **"The Scrivener Problem"** — powerful tools are too complex; simple tools lack power. No one has nailed the middle ground.
2. **Performance at scale** — Google Docs, Notion, and many web tools choke past 50k words.
3. **Export hell** — formatting breaks across formats; EPUB/print output requires separate tools.
4. **Fragmented workflow** — writers use 3-5 tools (planning, drafting, formatting, collaboration, publishing).
5. **No "messy to structured" pipeline** — writers want to start freeform and gradually impose structure.
6. **Collaboration is an afterthought** — only Google Docs does it well, and it's terrible for fiction.
7. **Distraction-free vs. feature-rich treated as opposites** — they should be progressive states of the same tool.

---

## Tech Stack Summary

```
EDITOR LAYER
├── Tiptap v3 (ProseMirror) — core editor framework
├── Custom extensions — scene breaks, epigraphs, illustration blocks, mood controls
├── Yjs — CRDT for document model, revision history, future collaboration
├── y-indexeddb — offline persistence
└── Hocuspocus — sync backend (when collaboration ships)

FRAMEWORK
├── Next.js 16 (App Router) — already set up
├── React 19 — already set up
├── TypeScript — already set up
└── PWA (next-pwa or @serwist/next) — offline app shell

STYLING
├── Tailwind CSS 4 — already set up
├── Framer Motion — already installed, for UI animations
├── CSS scroll-driven animations — reading progress, no JS
├── View Transitions API — chapter navigation
├── Variable fonts — responsive typography, dark mode GRAD adjustment
└── Container queries — responsive panels

TYPOGRAPHY
├── Reading: Merriweather / Lora / Marjorie (variable, serif)
├── Writing: Duospace variable font (iA Writer-inspired)
├── Display: Playfair Display (already in project)
├── Code/mono: JetBrains Mono or similar (for screenplay format)
└── Accessibility: OpenDyslexic / Lexend (reader option)

DATA (Phase 1)
├── PostgreSQL via Prisma — users, projects, metadata, revisions
├── Cloudflare R2 or Uploadthing — media/image storage
└── NextAuth.js — authentication

FUTURE (deferred but architected for)
├── Liveblocks or PartyKit — managed collaboration alternative
├── Automerge — monitor for structured data use cases
├── Loro — monitor for built-in version control capabilities
└── Lexical — fallback if Tiptap performance ceiling is hit
```

---

## Sources

This document synthesizes research from 80+ sources including:
- Liveblocks framework comparison (2025)
- Tiptap official documentation and 2026 roadmap
- Yjs documentation, GitHub discussions, and performance benchmarks
- Hocuspocus documentation and architecture
- iA Writer design philosophy essays
- Kindlepreneur tool reviews (2025-2026)
- W3C CSS specifications (Paged Media Level 4, text-wrap, text-box-trim)
- WebKit blog (text-wrap: pretty implementation)
- ACM TOCHI research on font impact on reading speed
- CHI 2025 research on pagination vs scrolling
- Ink & Switch (Peritext CRDT, local-first software)
- MDN Web Docs (CSS features, OpenType, variable fonts)
- Smashing Magazine (scroll-driven animations, editorial layouts)

Full source URLs are preserved in the research notes.

---

*Decision date: March 2026. Revisit quarterly or when a framework releases a major version.*
