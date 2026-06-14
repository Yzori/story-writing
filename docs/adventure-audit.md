# Adventure / Campaign Mode — Holistic Audit

_Date: 2026-06-14 · Author: five-lens agent audit (backend, frontend, game design, audience experience, code health), synthesized._

This is the tracked record of a full-subsystem review of Adventure/Campaign mode, plus the
decisions taken while acting on it. It is the source of truth for the remediation work; check
items off the punch list as they land.

---

## Verdict

**An A-grade theatre wrapped around a hollow game.** Every lens independently landed on the
same shape: the *presentation, flow architecture, and engineering rigor are excellent*, while
the *mechanical substance and the teaching layer that would let a newcomer understand it are
nearly absent.* The "unclarity of options" concern is real and was triangulated by three
independent agents to the same root causes.

The subsystem is ~25k LOC — the single largest feature in the app (bigger than all of
monetization). Investment went **wide** (Crossroads, champions, marks, clocks, tips, audience
pulses/sparks/votes — three parallel audience-input pipelines) rather than **deep** on the
legibility and mechanical weight of the core loop.

---

## What's genuinely strong (do not regress)

- **Interaction state machine** (`src/lib/campaign-interaction-state.ts`) — one source of truth
  shared by client + server; prevents "Submit button that 403s" drift. Exemplary.
- **Server-authoritative dice** (`turns/route.ts:479-533`) — client sends *intent only*; server
  rolls with crypto `randomInt`, recomputes the tier, ignores client-supplied totals. PbtA
  thresholds (10+/7–9/6−) are textbook.
- **Real concurrency control** — the `SELECT … FOR UPDATE` spotlight-handover transaction and the
  partial-unique-index session activation are genuinely well done.
- **Type discipline** — zero `any`/`@ts-ignore` across 25k LOC; JSON columns are Zod-guarded and
  fail closed.
- **Episode Card ending** — the best-executed audience moment; a real keepsake + share loop.
- **"No dead-end" between-turns UX** — reactions, hand-raise, table talk mean no one sits idle.

> **Stale memory corrected:** the join flow, applications/voting, and session→chapter
> compilation are all **shipped**, not "pending" as MEMORY.md claimed.

---

## Problems, by theme

### 1. "Unclarity of options" — confirmed, precise root cause
The GM's actions are fragmented across **three disjoint surfaces with different metaphors**: the
bottom "Director Move" composer (words), the floating "Direct ✦" fan (all 7 mechanics), and the
collapsed-to-12px "Director Console" rail. Nothing signposts the division. A GM can run a whole
session never discovering rolls/scene-breaks exist. Compounded by **naming drift** (GM vs
Director; Crossroads vs "the floor" vs "Table Vote"; "Raise Pressure" exists as both a cosmetic
text-seed chip *and* a real clock-ticking ritual).

### 2. Player verbs don't carve reality at its joints
Of four player options, **three (action / description / reaction) render as near-identical text**,
distinguished only by italic styling and name-prefix rules the player can't see. Only `dialogue`
earns its keep.

### 3. Mechanics are decorative
- **Character stats are inert.** Bold/Keen/Subtle are parsed, displayed as sigils… and
  **hardcoded to 0 at creation** (`src/app/campaign/[storyId]/page.tsx:946-959`), then ignored in
  the roll (`turns/route.ts:496-500`). The only modifier is a free +1 aspect invocation that
  everyone always pulls — not a choice. **Two characters are mechanically identical.**
- **Marks (scar/vow/debt) have zero mechanical effect.** Clocks never auto-advance from dice.
  No cross-session progression in a mode literally called "campaign."
- **Failure is punishing, not fail-forward** — ~42% base miss rate, generic "The attempt fails,"
  and irreversible character death on a coin-flip.
- **"Prose intelligence" is partly fake** (documented pronoun tracking doesn't exist) and partly
  counterproductive (dialogue verbs chosen by `index % 5`, so a screamed threat may render as
  "murmured").

### 4. GM is an unmitigated single point of failure
Every loop funnels through the GM; there is **no idle timer, nudge, or fallback**. If the GM
steps away the whole table freezes, and the auto-handover actively removes the spotlight from the
one player who could keep writing.

### 5. Structural code debt (fast-growth, not rot)
- **turns POST handler is one ~590-line function** that hides the dice/tier/consequence game-rules
  inline — so the highest-risk logic is untestable without HTTP mocking.
- **Play page is a 1,561-line god component** (19 `useState`, 122 props to StoryCanvas).
- **GM ownership check copy-pasted across 11 routes** (`verifyStoryOwnership` helper exists, unused).
- **Spectator polling won't scale** (N×3 queries / 5s, no SSE/ETag); `spectate/presence` is an
  unauthenticated, unscoped, mis-bucketed write with no rate limit on DELETE.

---

## Punch list

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

### P0 — highest impact, mostly low effort
- [x] **#1 Make character choice matter at the dice — flat 2d6 + aspect trump.** _(see D1, revised)_
  Numeric +2/+1/0 reverted per owner steer. Shipped: flat 2d6 for all; approaches = fictional
  texture (no numbers in `DiceRollerRitual`); aspect = spendable "miss → foothold" trump, once per
  scene, consumed only when it saves the roll, can convert a fatal miss. Server resolves + enforces
  (`turns/route.ts` `aspectAvailableThisScene`, `aspectSaved` in roll metadata); client mirrors
  availability (`play` `myAspectAvailable` → `StoryCanvas` → `DiceRoller` → ritual disables a spent
  invoke). Typecheck clean; campaign tests pass. _No migration; legacy characters unaffected._
- [x] **#2 Reveal + unify the GM action model.** Kept the atmospheric "Direct ✦" fan (user prefers
  immersive over utilitarian) but made it discoverable: first-run labeled callout + attention pulse
  on the trigger, dismissed for good once opened (`quiloria.gm.directHintSeen`). Deleted the dead,
  misleading GM answer-chips (`AdventureDraftComposer.tsx`) — "Raise Pressure"/"Offer Turn" now exist
  only as real Director's-hand rituals, so each move means one thing. _Remaining (P2 copy pass):
  broader naming drift (GM vs Director, Crossroads vs "the floor" vs "Table Vote")._
- [x] **#3 First-run coachmarks** (GM + player), gated on per-user localStorage flags. GM: the
  "Direct ✦" hint + pulse (shipped in #2, `quiloria.gm.directHintSeen`). Player: a one-time card
  teaching the turn protocol (write when handed the pen; react/raise hand otherwise; aspect saves a
  miss once per scene) — `quiloria.player.coachSeen`, in `play/[sessionId]/page.tsx`.
- [~] **#4 Continuity for scheduled live play (reframed) + fail-forward.** _(see D2)_
  - [x] Fail-forward miss text (no more dead-end "the attempt fails") — `turns/route.ts`.
  - [x] **Session-scoped Acting GM** (replaces the mis-scoped "auto-unstall"). `acting_gm_id` +
    `takeover_proposer_id` columns + migration `0049`; `resolveSessionGmId`/`isSessionGm`/
    `verifySessionGmAccess` helpers; `turns/route.ts` wired + owner auto-reclaim on return.
  - [x] Wired all session-running routes (active-player, roll-request close, clocks, floor-rounds,
    session PATCH, roster, compile) to the running GM; ownership/applications/charter stay owner-only.
  - [x] `acting-gm` endpoint (handoff / reclaim / propose / confirm / cancel) + `updateActingGm` hook
    method + `ActingGmBar` UI (planned handoff picker, takeover offer/confirm, reclaim/step-down).
  - [x] Unplanned takeover: table-consent dance (propose → a *different* present player confirms →
    acting GM; owner auto-reclaims by acting). _Lone-player idle fallback deferred (edge case)._
  - [ ] _(deferred to P1)_ gate fatal death behind a full danger clock (already softened by the
    aspect trump in D1).

### P1 — all shipped 2026-06-14
- [x] #5 Collapsed the player composer to **Write / Speak** (dropped the near-identical
  Act/Describe/React); removed the dead "answer"/"scene" composer modes + emotional quick-chips.
  `AdventureDraftComposer.tsx`. _Tradeoff: lost the Dread/Mercy/Wonder/Betrayal starters; re-add as
  flavor later if missed._
- [x] #6 First-roll **primer** in `DiceRollerRitual` (2d6 tiers + aspect, once, `quiloria.dice.primerSeen`)
  + aspect explainer in character creation.
- [x] #7 Extracted `resolveRoll` / `rollTierFor` / `buildRollConsequenceText` into `campaign-rolls.ts`
  (pure); `turns/route.ts` now calls them; **16 unit tests** (`campaign-rolls.test.ts`) cover tier
  boundaries, aspect save, fatal interaction, fail-forward text.
- [x] #8 Locked down `spectate/presence` — story-scoped + public-gated on every handler, PUT moved to
  the write bucket, DELETE rate-limited.
- [!] #9 **Reverted — was misapplied.** The agent deleted the header spotlight strip believing
  `InitiativeBar` was the canonical rail, but this page sets `showSessionChrome={false}`, so
  InitiativeBar does NOT render here — the deletion removed the only visible turn rail. Restored the
  header rail. **Still open:** real mobile-consistent pass-the-pen (the header rail is `hidden md:flex`
  by original design; mobile has no in-header rail). Needs a deliberate redo, not a deletion.
- [x] #10 Marks have teeth (D1-consistent, no numbers): each active **vow** grants one extra
  aspect-style save per scene (server-enforced in `aspectSaveAvailable`, mirrored client-side).
  _Design choice — tunable; vows currently invoked via the aspect button, so a vow-only character
  (no aspect) can't yet invoke — follow-up._

### P2 — shipped 2026-06-14 via a 6-agent workflow (Wave 1 parallel, Wave 2 sequenced)
- [x] Decomposed the play page (1733→1522 lines; extracted `EndSessionModal`, `OpenFloorForm`,
  `DirectorsHand`) and the turns handler (~774→~700; extracted helpers into `campaign-turn-write.ts`,
  preserving the FOR UPDATE transaction verbatim).
- [x] GM-check dedup — owner-only routes (transfer-gm, applications, polls) now use
  `verifyStoryOwnership`; session-running routes already shared `verifySessionGmAccess`.
- [x] Shared `usePolledFetch` hook; migrated the spectator polling hooks to it.
- [x] Spectator **SSE** stream (`spectate/stream`) consumed by `use-spectator-session` with silent
  fallback to polling; `Cache-Control`/ETag added to `spectate/route.ts`.
- [x] Fixed prose determinism: dropped the position-based dialogue-verb cycling (`globalIdx % 5`,
  which could render a shout as "murmured") and the `% 3` format switch — now neutral "said",
  deterministic. Applied to BOTH the live `TurnRenderer` and the chapter compiler
  `compile-session.ts` (the permanent output). _Pronoun substitution was never implemented — left as
  a feature, not a fix._
- [x] Consolidated the audience-input pipelines via a shared `audience-input.ts` service
  (non-destructive — no data migration; physical table merge deferred by design to avoid data loss).
- [x] DB integrity (migration `0050`, applied): FK on `campaign_sessions.chapter_id` + CHECK
  constraints on turn `type` and the `status` columns, all `NOT VALID` (safe on existing rows).

---

## Decisions taken during implementation

### D1 — Flat 2d6 + aspect-as-trump (NOT numeric modifiers) — _revised 2026-06-14 by owner steer_

**Superseded approach (rejected):** an earlier pass made approaches a ranked +2/+1/0 stat that
modified the roll. The owner correctly called this a gimmick: a running `+N` stat line is exactly
the Roll20 crunch Quiloria exists to avoid. Reverted.

**Decision (Option A):**
- **The dice are a flat 2d6 for everyone.** No character modifier. The odds are a shared dramatic
  device, not a power expression.
- **Approaches (Bold/Keen/Subtle) are a per-roll fictional "how"** — they colour what
  success/partial/miss *mean and cost*, never the odds. Not a character stat; chosen at roll time.
  Not stored as a numeric spread (creation only captures the aspect).
- **Aspect becomes a spendable narrative trump.** Invoking your aspect, *once per scene*, turns a
  miss into a foothold (failure → partial). It is consumed only when it actually saves the roll,
  and it can even convert a fatal miss (your defining truth cheats death, once). This makes the
  invoke a real decision instead of a +1 everyone always adds.

**Why this fits:** character distinctiveness is fiction (aspect + how you play), the dice stay
clean, and the one resource you spend is a story beat, not arithmetic.

**Scene boundary:** a scene starts at session open and resets at each `scene-break` turn; aspect
availability is computed per character relative to the current scene.

### D2 — Continuity via session-scoped Acting GM (not auto-unstall) — _2026-06-14_

**Context:** the audit framed the GM as a single point of failure and proposed an "idle → auto-open
the floor / players narrate" failsafe. Sparring with the owner reframed it: play is **live and
scheduled**, so the unit to protect is *the scheduled session* (people coordinated to show up), and
the painful failure is the owner-GM being unavailable — not a few minutes of quiet. Auto-opening the
floor is intrusive in live play; permanent `transfer-gm` is too drastic for a one-night problem.

**Decision:** a **session-scoped Acting GM** (`campaign_sessions.acting_gm_id`), distinct from
campaign ownership.
- **Powers split:** the acting GM may RUN the session (narrate, spotlight, rolls, clocks, scene,
  floor, end, compile). Campaign ownership (transfer, applications, charter, delete) stays
  owner-only. Worst case for a substitute = they run one session; they can never take the campaign.
- **Two entry paths, one mechanism:** *planned* (owner hands off "can't run tonight") and
  *unplanned* (owner drops → **table consent**: a present player proposes, one other present player
  confirms; owner **auto-reclaims** on return; lone-player falls back to an idle threshold).
- **Implementation:** centralize the GM check in `resolveSessionGmId`/`isSessionGm` (also pays down
  the audit's "GM check copy-pasted in 11 places" debt); session-running routes consult the
  effective GM.

**Authorization rationale (table consent):** self-policing — you can't seize the chair from an
active GM because the table won't confirm — and it avoids fragile idle-detection. Auto-reclaim makes
any wrongful takeover instantly reversible.
