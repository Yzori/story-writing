---
name: quiloria-frontend
description: >
  Build and modify frontend components for the Quiloria writing platform.
  Use when creating new UI components, pages, panels, modals, or styling.
  Use when user says "build a component", "add a page", "create UI",
  "style", "design", "layout", or references the Quiloria design system.
  Covers React components, Tailwind CSS, Framer Motion animations,
  and Tiptap editor extensions.
---

# Quiloria Frontend Skill

You are building UI for **Quiloria**, a writing platform for authors.
The aesthetic is warm, literary, and tactile — a writer's desk at night.

## Tech Stack

- Next.js 16 (App Router, `src/app/`)
- React 19 with `"use client"` for interactive components
- Tailwind CSS 4 with CSS custom property theming (`--t-*` prefix)
- Framer Motion 12 for animations
- Tiptap 3 (ProseMirror) for the prose editor
- TypeScript 5 strict mode

## Design System

### Color Tokens

Use these Tailwind classes. NEVER use raw hex values.

**Backgrounds (dark to light):**
- `bg-void` — page background, deepest layer
- `bg-ink` — barely lighter than void
- `bg-surface` — sidebars, panels
- `bg-elevated` — cards, inputs, popovers
- `bg-subtle` — hover states, dividers

**Text (bright to dim):**
- `text-paper` — headings, primary text
- `text-text` — body copy
- `text-text-secondary` — labels, less important
- `text-text-tertiary` — disabled states
- `text-text-ghost` — barely visible (uppercase labels, hints)

**Accents:**
- `text-amber` / `bg-amber` — primary accent (CTA, active states, selections)
- `text-rose` / `bg-rose` — destructive, errors
- `text-sage` / `bg-sage` — success, published state
- `text-lavender` / `bg-lavender` — informational

**Borders:**
- `border-border` — default borders (very subtle, ~4% white)
- `border-border-subtle` — even more subtle
- `border-border-active` — focused/active borders

### Using Accent Colors with Opacity

Common patterns:
```
bg-amber/10        — subtle tinted background
bg-amber/[0.04]    — barely visible tint
border-amber/30    — subtle accent border
text-amber         — accent text
```

### Fonts

- `font-display` — Fraunces (variable serif) — headings, story titles, brand moments
- `font-body` — Plus Jakarta Sans (sans) — UI text, navigation, labels (default)
- `font-reading` — Literata (variable serif) — editor body text, reader view
- `font-mono` — IBM Plex Mono — metadata, word counts, code blocks

### Two Themes — one library, two times of day

The app has two themes controlled by CSS classes on `<html>`:
- `theme-dark` (Lamplight) — default. The library at night: firelit umber brown-blacks (hue 30–38), cream text, candle-gold signature
- `theme-light` (Daybreak) — the same room at morning: sunlit ivory paper, espresso ink, burnished bronze signature

All colors auto-adapt via CSS variables. NEVER hardcode colors that would break in other themes.
Hard rule: **no blue in surfaces** — cool hues exist only as accent inks (teal, amethyst).
Full token tables, contrast matrix, and usage rules: `docs/COLOR_SYSTEM.md`.

## Component Patterns

### Panel Components (right sidebar)

All right panels follow this exact pattern:

```tsx
"use client";
import { motion } from "framer-motion";

export default function MyPanel({ onClose, ...props }) {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 360, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-paper">Panel Title</h3>
          <button onClick={onClose} className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors">
            {/* X icon */}
          </button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* sections */}
        </div>
      </div>
    </motion.aside>
  );
}
```

### Section Labels

```tsx
<label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
  Section Name
</label>
```

### Input Fields

```tsx
<input className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors" />
```

### Textarea Fields

```tsx
<textarea className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none" />
```

### Toggle Switch

```tsx
<button
  onClick={() => update(!value)}
  className={`relative w-8 h-[18px] rounded-full transition-colors ${
    value ? "bg-amber" : "bg-subtle"
  }`}
>
  <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-void transition-transform ${
    value ? "left-[16px]" : "left-[2px]"
  }`} />
</button>
```

### Selectable Option Buttons

```tsx
<button
  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
    isSelected
      ? "border-amber/30 bg-amber/[0.04] text-amber"
      : "border-border text-text-ghost hover:text-text-secondary"
  }`}
>
```

### Pill Tags (removable)

```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber/10 text-amber text-[11px]">
  {label}
  <button onClick={onRemove} className="hover:text-paper transition-colors">×</button>
</span>
```

## Animation Patterns

### Spring defaults
- Panel open/close: `{ type: "spring", stiffness: 400, damping: 35 }`
- Layout transitions: `{ type: "spring", stiffness: 500, damping: 35 }`
- Fade in/out: `{ duration: 0.15 }`
- Popover: `{ type: "spring", stiffness: 500, damping: 35 }` with `scale: 0.96` initial

### AnimatePresence
Always wrap conditionally rendered animated elements in `<AnimatePresence>`.

## File Organization

- Pages: `src/app/{route}/page.tsx`
- Components: `src/components/{domain}/ComponentName.tsx`
- Editor components: `src/components/editor/`
- Landing components: `src/components/landing/`
- Reader components: `src/components/reader/`
- Utilities: `src/lib/`
- Tiptap extensions: `src/components/editor/extensions/`

## Rules

1. Every interactive component needs `"use client"` at the top
2. Use Tailwind classes only — no inline styles except for dynamic values
3. SVG icons are inline (no icon library) — typically 12-20px with `strokeWidth="1.3-1.5"`
4. All text sizes use bracket notation: `text-[11px]`, `text-[13px]`, etc.
5. Data models live in `src/lib/store.ts` — import types from there
6. State management is React state + localStorage (no Redux, no Zustand)
7. Use `useCallback` for handlers passed as props
8. Prefer `transition-colors` or `transition-all` on interactive elements
9. No external component libraries (no shadcn, no Radix) — everything is custom
10. Keep components focused — one file per panel/view, extract shared patterns
