# Adventure Mode — Implementation Plan

_Companion to the concept mock at `design/adventure-bones-concept.html`. Grounded in a code audit of the live-play surface, the social/audience plumbing, and the reusable editor/monetization primitives (June 2026)._

## The bones we're building to

1. **The page is the screen** — one editor page-sheet canvas; no competing always-on panels.
2. **Turn = the room's light**, not a widget (composer blooms / page recedes / seat lights).
3. **Composer = words; the Director's hand = stage-gestures**, each raising a ritual that commits a real canon block.
4. **Instruments summon and recede** — never walls; nothing sits empty.
5. **The audience is the second protagonist** — felt always, voting at GM-opened moments, with lasting identity (champions).

### Locked decisions
- **Audience votes are advisory by default** (GM can flip a vote to "binding" per use). The GM is the membrane; the page stays authored.
- **Episodic + continuous house.** Sessions are episodes; the house lives around them. Realtime stays **poll-based** (the session hook already polls turns/floor-rounds at 5s, reactions at 10s) — design for aggregate/batched displays, not sub-second.
- **Protect the page.** Nothing social (offscript, reactions, audience chatter) ever lands on the canon leaf.

---

## What already exists (reuse map)

| Capability | Where | Verdict |
|---|---|---|
| Manuscript **page-sheet** (rounded, bordered, `bg-ink`, big shadow, 680px measure) | `src/app/write/[storyId]/page.tsx:1376` | **Reuse classes** |
| Reading typography (`.novel-reader`, `.drop-caps`, `.scene-break-*`, typography-* ) | `src/app/globals.css:1457+`, `src/lib/typography.ts` | **Reuse** |
| Prose assembly + renderers | `ProseAssembler.tsx`, `TurnRenderer.tsx`, `SceneBreakRenderer.tsx` | **Reuse** |
| Dramatic beats | `StoryMoment.tsx` (full-bleed), `StoryMomentRenderer.tsx` (inline + amplify) | **Reuse** |
| Dice ceremony | `DiceRollerRitual.tsx` | **Reuse** |
| Session state + polling + mutations | `src/hooks/use-campaign-session.ts` (5s turns, 30s chars/clocks) | **Reuse, extend** |
| GM "Director Moves" forms (roll request / scene break / story moment / illustration / push event) | `ContextPanel.tsx:133-621` | **Reuse content, re-home into rituals** |
| Floor rounds (table submit → vote), modes `gm_pick`/`vote` | `campaign_floor_rounds/submissions/votes`, `src/server/services/floor-rounds.ts` | **Reuse, extend for house** |
| Audience **pulses** (free sentiment) + **sparks** (paid ideas, drops) | `campaign_floor_audience_pulses/sparks` + `spectate/floor-round/*` | **Reuse** |
| Typed **reactions** (8 types) for sessions | `spectator_reactions` + `spectate/reactions` | **Reuse → emotional weather** |
| **Presence** (who's watching, heartbeat) | `spectator_presence` + `spectate/presence` | **Reuse → "N in the house"** |
| Story-moment **amplifications** | `story_moment_amplifications` | **Reuse** |
| Drop-**weighted** voting model | `crossroads_votes.dropsSpent`, `crossroads` API | **Reuse pattern for patron-weighted votes** |
| Patron detection | `circleSubscriptions` (readerId+creatorId+status) | **Reuse** |
| Drops transfer (70/30, atomic) | `src/server/services/ink-drops.ts` `transferDrops` | **Reuse** |
| Spectator hooks | `use-spectator-session.ts`, `use-spectator-reactions.ts`, `use-spectator-floor-round.ts` | **Reuse** |
| Watch page | `src/app/campaign/[storyId]/watch/[sessionId]/page.tsx` | **Redesign onto bones** |

### To delete / retire
- **`InitiativeBar.tsx`** as the turn UI — it's currently passed `showSessionChrome={false}` (dead in play). Replace with turn-as-environment + a summonable roster. Salvage its **timer** logic into the ambient "your turn" state.
- The **three redundant turn indicators** in the play page header: the `"{name} holds the pen"` subtitle (`page.tsx:953`), the avatar row (`957-976`), and the `DIRECTOR BEAT`/phase grid (`1044-1060`). Collapse to one source of truth.
- The **always-on left/right rails** (`SessionLog` "Canon Feed" + `ContextPanel` as a docked panel). `SessionLog` becomes a summonable **Timeline**; `ContextPanel`'s GM forms become **Director's-hand rituals**, its character sheet a summonable instrument.

---

## Phase 1 — The canvas & turn-as-environment _(the bones)_

**Goal:** the play page becomes one lit page-sheet on a dark table; whose-turn is felt, not read.

1. **Canvas on the page-sheet.** Wrap `StoryCanvas`'s prose in the editor's `page-sheet` container + `.novel-reader`/`.drop-caps`/scene-break classes so play, read, and the editor are visibly one surface. (Reuse `ProseAssembler`/`TurnRenderer` as-is.)
2. **Turn = environment.** Drive three states off `campaignSession.activePlayerId`:
   - _your turn_ → composer blooms + lifts, page recedes slightly;
   - _Director narrates_ → faint gold veil at the page head;
   - _another's turn_ → reading mode + a quiet "✦ {name} is writing" presence line where their words will land.
   Salvage the InitiativeBar countdown into the "your turn" composer.
3. **One spotlight source of truth.** A whisper-quiet header (title · scene · presence cluster with the Director as a first-class seat, one lit). Delete the three redundant indicators. GM passes the pen by tapping a seat in the **summonable roster** ("the table" left edge).
4. **The Director's hand (FAB, GM-only).** A floating mark, lower-right, that fans the stage-gestures: _Open the floor · Story moment · Moment of truth · Call a roll · Set the scene · Scene break._ Each raises a **ritual sheet** that reuses existing pieces:
   - Call a roll → `DiceRollerRitual` + existing roll-request form;
   - Story moment / Scene break / Set the scene / Illustration → the forms now in `ContextPanel`, re-homed into ritual sheets, committing via `StoryMoment(Renderer)` / `SceneBreakRenderer`.
5. **Summonable instruments, no walls.** Left edge "the table" (roster + offscript, Phase 2); right edge "the codex" (lore/bible); bottom rituals. `SessionLog` → a summonable **Timeline** (rolls/OOC), not a permanent rail. Keep the existing `focusMode` toggle to suppress global nav during play.

**Files:** `play/[sessionId]/page.tsx` (major refactor), `StoryCanvas.tsx` (layout), new `DirectorsHand.tsx` + `RitualSheet.tsx`, retire `InitiativeBar.tsx`, re-home `ContextPanel.tsx`, fold `SessionLog.tsx`. No schema changes.

---

## Phase 2 — Offscript (player ↔ player)

**Goal:** the table can talk around the page without touching canon.

1. **The green room.** Reuse the `ooc` turn type as ephemeral table chat, surfaced in the left-edge "the table" instrument (not the canon feed). Style as whispers, distinct from prose.
2. **Asides on a beat (optional).** The editor's marginalia (`editorCommentThreads`, amber gutter dots) is **editor-only** today — reusing it for campaign turns needs a small new anchor (turn id + side). Defer unless wanted; the green room covers most needs.
3. **GM → player whisper (optional, later).** Private note / secret-roll channel. New lightweight `campaign_whispers` (sessionId, fromUserId, toUserId, content) or a private `ooc` variant. Flagged, not in the first cut.

**Files:** "the table" instrument UI, minor `use-campaign-session` extension. Schema only if whispers/asides are pulled in.

---

## Phase 3 — The house, made first-class

**Goal:** the audience is felt always and has lasting identity — the watch view becomes a crafted "front row."

1. **Felt presence.** Surface `spectator_presence` count in the table header ("312 in the house") and as ambient warmth; reuse the heartbeat endpoint.
2. **Emotional weather.** Aggregate `spectator_reactions` (the 8 types → group into dread/awe/heartbreak/delight) into a **house-mood meter** + ambient ripples on the canvas. Reactions never render as inline text. Reuse `spectate/reactions` (10s poll).
3. **Champion a character (NEW).** A watcher backs a `playerCharacter`; characters accrue followings; canonized audience contributions get credited.
   - **Schema:** new `character_champions` (userId, characterId, storyId, createdAt; unique(userId, characterId)), modeled on `sparks`/`follows`.
   - **API:** `POST/DELETE /api/stories/[storyId]/campaign/characters/[characterId]/champion`; counts in the characters fetch.
   - **UI:** "You champion {name}" badge in the front row; follower counts on the roster.
4. **Front-row watch redesign.** Rebuild `watch/[sessionId]` on the page-sheet bones: the live page, the crowd, the mood meter, typed-reaction buttons, the champion badge, and the vote panel (Phase 4). Reuse the spectator hooks.

**Files:** new `character_champions` table + migration + API; `watch/[sessionId]/page.tsx` redesign; `spectator/*` components; header presence in the table view.

---

## Phase 4 — Open the floor to the house _(the headline)_

**Goal:** the GM hands a beat to the audience; the house votes; the GM narrates the result.

**Design note — what this is.** Today's floor rounds collect _player submissions_ then vote. "Open the floor to the house" is **GM-authored options → audience votes** — structurally closer to a session-scoped, drop-weighted **Crossroads**. Recommended approach: add a floor-round **mode `house_fork`** that carries GM-authored `options` and accepts **audience votes** (reusing the Crossroads `dropsSpent` weighting model), rather than bolting options onto the submission flow.

1. **Schema (extend floor rounds):**
   - `campaign_floor_rounds`: add `mode: 'house_fork'`, `options` (JSON `[{label}]`), `constituency` (`gallery` | `table` | `both`), `binding` (bool, default `false`), `closesAt`.
   - New `campaign_floor_audience_votes` (roundId, token, userId nullable, optionIndex, dropsSpent default 0, createdAt; one per token per round). Free = 1 weight; patron drop-spend adds weight via `transferDrops(type:"vote-weight")`.
2. **GM ritual ("Open the floor").** From the Director's hand: write the question + 2–4 options, pick constituency + advisory/binding + timer, release. Reuses the ritual-sheet pattern.
3. **Table — the held breath.** A non-blocking panel: live tally climbing + countdown + **"Close & narrate the choice."** Advisory → GM writes the consequence; binding → marked as a canon fork. Either way the GM writes the prose.
4. **House — the vote.** On the watch page: the question rises, tap to vote, live tally, and **"Weight your voice · drops"** for patrons (detect via `circleSubscriptions`; weight via `transferDrops`). One free vote per token; patron weighting transparent.
5. **Result → canon.** Winner surfaces to the GM as "the floor chose: …"; the GM narrates it as a normal turn. Never auto-pasted.

**Files:** floor-rounds schema + migration; `floor-rounds` create/patch + a new `audience-votes` route (player + `spectate/` variants); `services/floor-rounds.ts` (eligibility, tally, patron weight); GM ritual + table panel + watch vote panel; `use-campaign-session` + spectator hooks.

---

## Cross-cutting

- **Realtime cadence.** Keep polling. Add an aggregate reactions/mood endpoint if 10s per-reaction polling is too chatty at scale ("127 reacted in the last 10s"). No websockets in v1.
- **Anti-abuse / integrity.** One-free-vote-per-token; transparent patron weighting; GM can close/disqualify a vote. Rate-limit audience writes (reuse existing spectator rate limits).
- **Accessibility / mobile.** Turn-as-light must still announce turn changes (aria-live); the Director's hand and rituals need reachable focus order; the house rail collapses gracefully on mobile (the concept already stacks).

## Schema & migrations summary

| Change | Table | Notes |
|---|---|---|
| **New** | `character_champions` | audience ↔ character following |
| **Alter** | `campaign_floor_rounds` | `+ mode:'house_fork'`, `options`, `constituency`, `binding`, `closesAt` |
| **New** | `campaign_floor_audience_votes` | GM-authored-option votes, optional `dropsSpent` weight |
| _(opt)_ | `campaign_whispers` | GM↔player private notes (Phase 2, deferred) |

## Suggested sequencing

1. **Phase 1** (bones) — the biggest visual/UX win; unblocks everything. _Largest._
2. **Phase 3.1–3.2** (presence + emotional weather) — cheap, high atmosphere; mostly wiring existing data.
3. **Phase 4** (open the floor) — the headline differentiator. _Medium; mostly reuse._
4. **Phase 3.3–3.4** (champions + watch redesign) — deepens audience identity.
5. **Phase 2** (offscript) — green room first; whispers/asides later.

## Open decisions
- **House-fork as a new floor-round mode vs. a session-scoped Crossroads** (recommend: new floor-round mode, borrow Crossroads' weighting).
- **Champion-a-character in v1 or later?** (it's the identity hook; cheap table — recommend v1.)
- **Marginalia asides for offscript** — reuse editor comments (needs anchor work) or skip for the green room (recommend skip in v1).
- **Patron vote weighting curve** — flat (drops = weight) vs capped, to keep votes from feeling pay-to-win.
