---
name: Form modernization plan
description: Plan to rebuild flat/dated forms across the platform into modern multi-step wizards with inline validation, previews, and better UX
type: project
---

Forms that need the same treatment as the offerings page rebuild (f50fa93):

## Priority 1 — Creator-facing forms (revenue impact)

1. **Circle setup** (`/creator/circle`) — currently a flat config panel with a range slider and textarea. Needs: guided setup flow, preview of how the Circle card looks to readers, subscriber perk checklist.

2. **Story monetization** (`MetadataPanel.tsx` monetization section) — currently radio buttons + a number input buried in the editor sidebar. Needs: standalone modal or panel with visual tier selector, per-chapter gating grid with toggle switches, preview of the lock screen.

3. **Commission request modal** (`/scriptorium` page) — currently a textarea in a modal. Needs: step flow (select offering → describe brief → attach reference story → confirm price range → submit), reference image upload.

## Priority 2 — User-facing forms (retention impact)

4. **Create Story** (`/create`) — check current state, likely needs format selector with visual previews (what does a novel vs webtoon vs campaign look like?), genre picker upgrade.

5. **Profile edit** (`/profile/[username]/edit`) — check current state, likely needs avatar upload preview, bio with character counter, role/availability toggles.

6. **Settings** (`/settings`) — currently flat toggles. Could benefit from grouped sections with descriptions, preference previews.

## Priority 3 — Interaction forms (polish)

7. **Crossroads create form** (inside `CrossroadsPanel.tsx`) — currently inline inputs. Needs: better option editor with drag-to-reorder, duration picker with calendar visualization.

8. **Donation modal** (`DonationButton.tsx`) — check if it needs improvement or if it's already decent.

9. **Report/flag modal** — check current state.

## Standards for all rebuilt forms

- Multi-step wizard when >3 fields
- Inline validation (color-changing borders, not just error text after submit)
- Character counters that shift color near limits
- Live preview of the output before publishing
- Pill/card selectors instead of raw dropdowns or number inputs
- Framer-motion transitions between steps
- Step indicator with progress dots
- Mobile-responsive (stacks vertically)

**Why:** The offerings page rebuild (flat form → wizard) took one pass. Apply the same pattern everywhere so the platform feels consistent and premium.

**How to apply:** Use the offerings page as the reference pattern. Each form rebuild is independent — can be parallelized.
