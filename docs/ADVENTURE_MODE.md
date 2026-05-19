# Adventure Mode -- Complete Guide

## Overview

Adventure Mode is Quiloria's collaborative, tabletop-RPG-inspired play mode. It transforms a story into a live, GM-directed narrative experience where one person narrates the world (the Game Master) and others write as characters within it. The output is **prose**, not game stats -- every turn contributes to a story that can be compiled into publishable chapters.

**Philosophy: Story-first, not game-first.** The dice exist to create dramatic tension, not to simulate physics. Character sheets are narrative tools (traits, backstory, a defining belief) rather than stat blocks. There are no hit points, no inventory slots, no initiative rolls. The GM directs the story; the dice create consequences.

**Who it's for:** Writers who want the unpredictability of tabletop RPGs in a collaborative fiction context. Groups of 2-6 (one GM + 1-5 players) who want to co-author a story in real time.

---

## Roles

### Game Master (GM)

The GM is the story owner -- the user who created the story with `writingMode: "campaign"`. The GM:

- Is the **narrator only** and does not play a character
- Creates sessions, writes opening narrations, and sets the scene
- Directs turn order by choosing who writes next or opening the floor
- Creates scene breaks with mood tags and aspect pills
- Calls for dice rolls with narrative stakes (success/failure outcomes)
- Can mark rolls as **fatal** (failure = character death)
- Manages progress clocks (danger/progress/racing)
- Triggers cinematic Story Moments (full-screen overlays)
- Places illustrations into the story canvas
- Can kill or retire characters
- Invites new characters for players whose characters have died
- Ends sessions with an optional epilogue
- Compiles completed sessions into chapter drafts

### Players

Players are collaborators on the story who write as their characters. Each player:

- Applies to join the campaign (or is invited)
- Creates one character with narrative-first attributes
- Writes turns of various types: action, dialogue, reaction, description
- Chooses their approach (Bold/Keen/Subtle) when rolling dice
- Can invoke their character's defining belief for a +1 bonus
- Can extend their turn timer when running low on writing time
- Sends OOC (out-of-character) chat messages
- Can write "last words" if their character dies
- Becomes a spectator if their character dies (until the GM invites them to create a new one)

---

## Campaign Setup

### Creating a Campaign

A campaign is a story with `writingMode: "campaign"`. The story owner automatically becomes the GM. Campaign stories are created the same way as any other story, but with the writing mode set to "campaign" during creation.

**Route:** `/campaign/[storyId]` -- the campaign hub page

### Player Applications and Joining

Players join campaigns through an application system:

1. **Apply:** A player visits the campaign hub and submits a pitch (free-text, up to 5000 characters) explaining why they want to join.
2. **GM Review:** The GM sees all applications and can:
   - **Approve** -- the player is immediately added as a collaborator
   - **Decline** -- the application is rejected
   - **Put to vote** -- opens the application for existing players to vote on (48-hour deadline)
3. **Voting:** When an application is in "voting" status, existing players cast boolean yes/no votes. The GM sees vote counts and makes the final call.
4. **Constraints:** A player cannot apply to their own campaign. A player who already has a character in the campaign cannot apply again. Duplicate applications are blocked by a unique constraint.

**API:** `POST /api/stories/[storyId]/campaign/applications` -- submit application
**API:** `PATCH /api/stories/[storyId]/campaign/applications/[applicationId]` -- approve/decline/open voting
**API:** `POST /api/stories/[storyId]/campaign/applications/[applicationId]/votes` -- cast a vote

### Character Creation

Character creation is narrative-first. The form fields on the campaign hub are:

| Field | Description | Max Length |
|-------|------------|-----------|
| **Name** | Character name (required) | 200 |
| **Who are they?** (traits) | A line others can write them by | 5,000 |
| **Appearance** (description) | Physical description | 5,000 |
| **Backstory** | Character history | 10,000 |
| **Defining Belief** (aspect) | A core belief that can be invoked for +1 on rolls | Part of stats JSON |
| **Approach** | Choose one: Bold (+2), Keen (+2), or Subtle (+2). The chosen approach gets +2, the next gets 0, the last gets -1. | Part of stats JSON |
| **Portrait** | Optional URL for a character portrait | -- |

The stats are stored as a JSON string in the `stats` column:
```json
{
  "approaches": { "Bold": 2, "Keen": -1, "Subtle": 0 },
  "aspect": "Believes every problem has a chemical solution"
}
```

**Constraint:** One active character per user per story. Players with dead or retired characters can create a replacement.

**API:** `POST /api/stories/[storyId]/campaign/characters` -- create character
**API:** `PATCH /api/stories/[storyId]/campaign/characters/[characterId]` -- update character or change status

---

## Session Lifecycle

### 1. Session Creation

Only the GM can create sessions. Each session has:

- **Title** (required, up to 500 characters)
- **Summary** (optional, up to 5,000 characters)
- **Opening narration** (optional, up to 20,000 characters) -- played as a cinematic moment when the session begins

Sessions are created in `draft` status.

#### Session State Machine

```
draft → active → completed → archived
```

**Transition rules:**
- Only forward transitions are allowed -- there is no reopening a completed session
- At most **one active session** per story at any time
- Multiple draft sessions are allowed (plan ahead)
- Completed sessions are immutable except for metadata fields (epilogue, summary)
- Archived sessions are fully read-only and excluded from the default campaign hub session list

When created, the system:

1. Auto-populates the session roster with all active characters
2. Detects which characters are new (never appeared in a prior session roster) and marks them as `introduced` (others are `present`)
3. Sends notifications to all players

**API:** `POST /api/stories/[storyId]/campaign/sessions`

### 2. Scheduling (Polls)

The GM can create scheduling polls to coordinate play times:

- Polls have a title (default: "When should we play next?") and 2-5 free-text time slot options
- Players vote by toggling options (multi-select). Votes can be changed at any time while the poll is open.
- The GM can also vote
- The GM sees vote counts per option and total voters
- The GM closes a poll by confirming any option (does not have to be the most-voted — the GM decides)
- The confirmed option must be one of the original poll options (no arbitrary text)
- Only one poll can be open at a time; creating a new poll auto-closes the previous one
- If nobody votes, the GM can still close the poll with a chosen option
- Options are free text (no timezone parsing) — e.g., "Saturday 8pm EST", "Sunday afternoon"

**API:** `POST /api/stories/[storyId]/campaign/polls` -- create poll
**API:** `PATCH /api/stories/[storyId]/campaign/polls/[pollId]` -- vote or close poll

### 3. Pre-Session Lobby

When a session is in `draft` status and players navigate to the play page, they see the **Session Lobby** instead of the story canvas. The lobby is a full-screen atmospheric scene.

#### Lobby Themes

Seven visual themes are available (selected by the GM):

| Key | Label | Description |
|-----|-------|------------|
| `campfire` | Campfire | A crackling fire under open stars |
| `tavern` | Tavern | A warm inn filled with murmured stories |
| `ruins` | Ruins | Crumbling stone and forgotten echoes |
| `spaceship` | Spaceship | The hum of engines in the void |
| `dungeon` | Dungeon | Torchlit corridors deep underground |
| `ship` | Ship Deck | Salt spray and creaking timber |
| `last-launch` | Last Launch | The final journey into the unknown |

Themes with `particles: true` (campfire, dungeon, last-launch) display rising amber ember particles.

#### "Previously on..." Recap

If this is not the first session, the lobby displays the previous session's epilogue text (truncated to 250 characters) in a "Previously..." block. The mood tint from the prior session's closing mood is also applied as a subtle color overlay on the lobby background.

#### GM Roster Management

The GM sees toggle cards for every active character, allowing them to set who is present at the table for this session. Each card shows:

- Character name and player name
- A "New" badge for characters marked as `introduced` (first session)
- A toggle indicator (green dot) for present/absent

The roster update is sent via `PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/roster` with optimistic UI updates.

#### Party Circle

Players see character cards for all present characters arranged in a circle, with:

- Colored avatar circles (stable color assignment per player)
- Character name and traits
- A count of "X of Y gathered"
- Empty placeholder slots if fewer than 4 characters

#### Opening Narration Preview

If the GM wrote an opening narration, a preview (truncated to 180 characters) is shown in italics with decorative quotation marks.

### 4. Beginning a Session

The GM clicks the **"Begin the Story"** button. This:

1. Patches the session status from `draft` to `active`
2. If an opening narration exists:
   - Plays it as a **cinematic Story Moment** overlay (calm mood)
   - Posts it as the first `narration` turn in the session
3. Players who are on the page see the lobby disappear and the three-panel play layout appear
4. Non-GM players who are already on the page see the opening cinematic automatically (detected via polling)

### 5. Active Play

#### Three-Panel Layout

The play page is a full-screen, three-panel layout:

| Panel | Position | Content |
|-------|----------|---------|
| **Session Log** | Left (320-380px) | OOC chat, dice rolls, roll requests |
| **Story Canvas** | Center (flex) | Assembled prose, writing area, lobby, dice roller |
| **Context Panel** | Right (300px) | GM Dashboard (if GM) or Character Sheet (if player) |

On mobile, the Session Log is hidden behind a drawer toggle button. The Context Panel is hidden on screens smaller than XL.

Both side panels can be collapsed to a 12px-wide rail showing an icon and count.

#### Turn System

**GM-directed turn order.** The GM controls who writes next:

- **Specific player:** GM clicks a player's avatar in the Initiative Bar to give them the turn
- **Open floor:** GM clicks "Open Floor" to let anyone write (null activePlayerId)
- **GM always writes:** The GM can post narration/consequence at any time regardless of turn order

When a player completes their turn, control automatically returns to the GM (activePlayerId is set to the story owner's userId).

**Turn types and who can use them:**

| Type | Who | Appears In | Description |
|------|-----|-----------|-------------|
| `narration` | GM only | Story Canvas | World description, scene setting |
| `consequence` | GM only | Story Canvas | Outcomes of player actions, dice results |
| `action` | Players | Story Canvas | Character does something |
| `dialogue` | Players | Story Canvas | Character speaks |
| `reaction` | Players | Story Canvas | Character's emotional/internal response |
| `description` | Players | Story Canvas | Atmospheric or environmental detail |
| `illustration` | GM only | Story Canvas | URL-based image with caption |
| `scene-break` | GM only | Story Canvas | Scene divider with mood and aspect tags |
| `roll` | Players | Session Log | Dice roll result |
| `roll-request` | GM only | Session Log | GM calls for a dice roll |
| `ooc` | Anyone | Session Log | Out-of-character chat |

##### Turn Permission Matrix

| Turn Type | GM | Player (their turn) | Player (not their turn) | Player (open floor) | Spectator |
|-----------|----|--------------------|------------------------|--------------------|-----------|
| narration | Yes | No | No | No | No |
| consequence | Yes | No | No | No | No |
| action | No | Yes | No | Yes (first-come) | No |
| dialogue | No | Yes | No | Yes (first-come) | No |
| reaction | No | Yes | No | Yes (first-come) | No |
| description | No | Yes | No | Yes (first-come) | No |
| illustration | Yes | No | No | No | No |
| roll-request | Yes | No | No | No | No |
| roll | No | Yes (with request) | No | No | No |
| ooc | Yes | Yes | Yes | Yes | Yes |
| scene-break | Yes | No | No | No | No |

##### Open Floor Behavior

- Open floor = `activePlayerId` is null
- First-come, first-served: the first player to submit gets their turn in
- After one player submits a story turn, control automatically returns to the GM
- GM can re-open the floor or assign the next player
- The turn timer does NOT run during open floor
- Multiple players can type simultaneously but only the first submission counts as the "turn"

**Turn enforcement:** The API enforces turn order. When `activePlayerId` is set, only that player can post player story types (action/dialogue/reaction/description). GM narration/consequence, OOC messages, and rolls bypass turn order.

**Turn timer:** A 3-minute countdown timer starts when a player receives the turn. Visual urgency increases (white -> amber -> red) as time runs out. When the timer expires, control returns to the GM. Players can extend the timer by 3 minutes when under 60 seconds remain (sends an OOC notification).

**Timer details:**
- Timer is client-side (180 seconds default)
- "Extend +3min" button appears when < 60 seconds remain on your turn
- Extension adds 180 seconds locally and sends an OOC notification to the party
- Timer extension is client-only (not server-persisted) -- page refresh resets the timer
- When timer expires, control returns to GM automatically
- Draft text is auto-saved to localStorage (survives refresh but not timer expiry)
- GM can skip a player at any time by passing the turn -- no need to wait for timer

**"Writing..." indicator:** The active player's avatar in the Initiative Bar shows a pulsing amber dot and "Writing..." label.

**Turn editing:** Players can edit recently submitted turns within a 30-second window via `PATCH /api/stories/[storyId]/campaign/sessions/[sessionId]/turns/[turnId]`.

**Edit window rules:**
- 30-second window after submitting a turn
- Editable types: narration, consequence, action, dialogue, reaction, description, ooc
- Non-editable: roll, roll-request, scene-break, illustration (mechanical turns are immutable)
- Window closes if the GM passes the turn to someone else
- Edits are immediate (no versioning/audit log yet)
- Compiled chapters reflect the latest edited content

#### Prose Assembly Engine

The Story Canvas assembles individual turns into flowing prose paragraphs. The assembly rules:

**Paragraph grouping (merge rules):**
- GM narration + consequence merge into one paragraph
- Same character's consecutive player turns (action/dialogue/reaction/description) merge
- Description merges into preceding narration
- Reaction merges with the same character's preceding player turn
- Scene breaks and illustrations always start new blocks

**Name/pronoun tracking:**
- A character's full name is shown the first time they act in a paragraph group
- If the same character was named within the last 2 turns in the group, the name is omitted (implied pronoun)

**Dialogue verb cycling:**
- Dialogue attribution cycles through: "said", "replied", "called out", "murmured", "whispered"
- Three formatting patterns rotate: `"Content," CharName verb.` / `"Content"` (no attribution) / `CharName verb, "Content"`

**Scene breaks** render as a centered divider with:
- An optional title (e.g., "The Awakening")
- A mood class that tints subsequent text (tense/calm/ominous/triumphant/melancholy/chaotic/mysterious/romantic)
- Floating aspect pills (e.g., "Ancient Runes Glow", "The Air Grows Cold")

**Illustrations** render as images with optional captions.

**Mood tinting:** After a scene break, the canvas applies a subtle background tint based on the scene's mood. Mood colors are defined per mood type (e.g., tense = rose tint, ominous = violet, calm = sage/amber).

#### Dice System

**2d6 + approach modifier**, following PbtA (Powered by the Apocalypse) conventions.

**Three outcome tiers:**

| Total | Tier | Label | Meaning |
|-------|------|-------|---------|
| 10+ | Success | Full Success | "You get what you want." |
| 7-9 | Partial | Partial Success | "You get it, but at a cost." |
| 6- | Failure | Failure | "The GM makes a move." |

**Roll flow:**

1. **GM creates a roll request** ("Call for a Moment of Truth") with:
   - Target player (specific user or "everyone")
   - Attribute/approach (Bold/Keen/Subtle)
   - Reason text (what the roll is for)
   - Success outcome text
   - Failure outcome text
   - Optional **fatal** flag (failure = character death)
2. The roll request appears in the Session Log with stakes displayed
3. The targeted player sees the **DiceRoller** component appear automatically
4. **Player chooses approach** (Bold/Keen/Subtle) -- pre-selected if the GM specified one, but editable otherwise
5. **Player can invoke their defining belief** ("Invoke Aspect") for an additional +1 modifier
6. **Player clicks the dice** to roll -- animated dice faces cycle randomly for 1.2 seconds before landing
7. **Result is posted** as a `roll` turn in the Session Log with metadata: `{ total, modifier, attribute, tier, die: "2d6", fatal }`
8. **Consequence:** For **single-target** rolls, a `consequence` turn is **auto-posted** using the GM's pre-written success/failure text (or generic fallback). For **"everyone"** rolls, no auto-consequence fires — the GM writes a combined consequence manually.
9. **Fatal failure:** If the roll was marked fatal and the result is a failure, the character is automatically killed, a death cinematic Story Moment plays, and a narration turn is posted

**"Everyone" roll resolution:**
- When a roll request targets "everyone," each player with a pending roll sees the DiceRoller
- Each player rolls independently
- Each roll generates its own outcome (success/partial/failure)
- **No auto-consequence** — the GM writes a single consequence turn that addresses all outcomes
- A roll request is "resolved" for a player once they've posted a roll turn with sortOrder > the request's sortOrder
- Multiple active roll requests can coexist (e.g., different attributes for different players)

**Fatal rolls:**
- The GM can mark a roll request as **fatal** when setting the narrative stakes ("If they fail..." includes death consequences)
- The `fatal` flag is stored in roll-request metadata and checked on resolution
- If a fatal roll results in failure, the system **automatically** kills the character: death cinematic plays, character status set to `dead`, roster updated to `spectating`
- The GM can also end a character's story manually via "Their Story Ends" without a dice roll
- Campaign-level safety settings (opt-in lethal play) are not yet implemented but planned

**Approach modifiers:** Based on the character's stats. Chosen approach during character creation gives +2 to one approach, 0 to the next, -1 to the last.

**Approach descriptions:**
- **Bold:** Force, courage, confrontation
- **Keen:** Perception, cunning, knowledge
- **Subtle:** Finesse, deception, diplomacy

#### Scene Management

**Scene breaks** are created by the GM via the Context Panel. Each scene break has:

- **Title** (optional) -- displayed as a centered scene heading
- **Mood** -- one of: tense, calm, ominous, triumphant, melancholy, chaotic, mysterious, romantic
- **Aspects** (optional) -- free-text tags that float as pills on the canvas after the scene break

Scene breaks are stored as turns with `type: "scene-break"` and metadata:
```json
{
  "mood": "ominous",
  "title": "The Awakening",
  "aspects": ["Ancient Runes Glow", "The Air Grows Cold"]
}
```

**Mood tinting:** After a scene break, the Story Canvas applies a subtle background color tint matching the mood. The tint persists until the next scene break changes it.

#### GM Tools

The Context Panel (right side) shows the **GM Dashboard** when the current user is the GM. Tools include:

**1. Progress Clocks**

Borrowed from Blades in the Dark. Visual pie-chart clocks that track escalating threats, progress toward goals, or racing conditions.

- Three types: `danger` (rose), `progress` (amber), `racing` (indigo)
- Three sizes: 4, 6, or 8 segments
- Interactive: GM clicks segments to fill/unfill them
- Deletable on hover
- Persisted to the database (`progressClocks` table), stored per-session
- Visible to all players and survive page refresh
- Synced via polling; GM creates/updates/deletes via API

**2. Push Event (Narrative Push)**

A text input that posts a `narration` turn. Used for quick GM interjections without leaving the dashboard.

**3. Scene Break Creator**

A form with title, mood selector (8 moods), and aspect tag input. Creates a `scene-break` turn.

**4. Story Moments (Cinematic Overlays)**

Full-screen dramatic overlays with mood-specific visual effects. The GM fills in:
- **Text** -- the main cinematic line
- **Subtext** -- a secondary line
- **Mood** -- determines visual treatment

Available moods and their visual effects:

| Mood | Text Effect | Atmosphere | Description |
|------|------------|-----------|-------------|
| death | drift-down | falling particles | Red-tinted, falling particle embers |
| triumph | standard | pulsing glow | Golden glow, text scales up |
| betrayal | slam | crack lines | Purple, diagonal crack effects |
| revelation | bloom-reveal | white bloom | White bloom expanding outward |
| loss | standard (drifts) | none | Blue-tinted, content drifts downward |
| ominous | pulse | fog | Purple fog, pulsing letter spacing |
| tense | standard (vibrates) | none | Text micro-shakes |
| mysterious | standard | rotating gradient | Cyan rotating conic gradient |
| calm | standard | none | Warm green/gold, gentle breathing scale |
| triumphant | standard | pulsing glow | (alias for triumph) |
| melancholy | drift-down | none | Indigo, content drifts down |
| chaotic | slam | none | Orange, slamming text entrance |
| romantic | standard | none | Pink, gentle breathing scale |

Story Moments play through phases: entering (500ms) -> text reveal (2000ms) -> holding (1500ms) -> exiting (800ms) -> done. Text is revealed word-by-word with per-word animations matching the mood's text effect.

Story Moments also create a `scene-break` turn with `cinematic: true` in metadata so they leave a trace in the story.

**5. Illustrations**

The GM can place images into the story canvas by providing:
- **Image URL** -- the source URL (with a link to Unsplash provided for convenience)
- **Caption** (optional) -- text displayed below the image

Creates an `illustration` turn with metadata: `{ imageUrl, caption }`.

**6. Roll Request ("Call for a Moment of Truth")**

A form to request dice rolls from players. Fields:
- Target player (dropdown of active characters, or "everyone")
- Approach (Bold/Keen/Subtle radio buttons)
- Reason (what the roll is for)
- On success (what happens if they succeed)
- On failure (what happens if they fail)
- Fatal toggle (failure = character death)

**7. GM Move Palette**

Quick-access buttons for common GM moves. Listed in the Context Panel for reference.

#### Character Management

**Per-session roster:** Each session has a roster tracking which characters are present, absent, introduced, or spectating. The GM manages the roster in the lobby before beginning the session.

Roster statuses:
- `present` -- actively participating
- `absent` -- not in this session
- `introduced` -- first session for this character (shown with a "New" badge). Treated as `present` for turn permissions. If the GM toggles an `introduced` character to absent and back, they become `present` (the "New" badge is a one-time first-appearance marker).
- `spectating` -- watching but not participating (e.g., after character death mid-session)

**Character death ("Their Story Ends"):**
1. GM clicks the skull icon on a character card in the Context Panel
2. A confirmation modal appears (destructive action)
3. On confirm: character status is set to `dead` via PATCH API
4. A death cinematic Story Moment plays: "CharName has fallen" / "The story remembers."
5. A narration turn is posted: "CharName falls. The story remembers."
6. The player enters **spectator mode** -- they can still chat (OOC) but cannot write story turns
7. The GM can invite the player to create a new character via a notification

Auto-death from fatal dice rolls follows the same flow but is triggered automatically.

**Character retirement ("They Depart"):**
1. GM clicks the book icon on a character card
2. Confirmation modal appears
3. Character status is set to `retired`
4. A narration turn is posted: "CharName departs, their chapter in this tale complete."
5. The player can create a new character from the campaign hub

**Multi-character rules:**
- A user may own multiple characters in a campaign (e.g., one dead, one active)
- Only **one character per user** may have `status = 'active'` at any time
- Only the active character can appear on a session roster
- Dead/retired characters are preserved as narrative history and appear in the "Characters Past" memorial section on the campaign hub
- Creating a new character requires no active character (all previous must be dead or retired)
- The GM must explicitly invite a player to create a replacement character

**New character invitation:** When a player's character dies and they have no other active character, the GM sees an "Invite New Character" button in the Context Panel. Clicking it sends a notification to the player directing them to the campaign hub to create a replacement.

#### Lore Map

An interactive map component accessible from the Story Canvas toolbar. Features:

- **Nautical-themed cartography** -- grid overlay, compass rose, parchment texture
- **Draggable/pannable** canvas (150vw x 150vh, larger than viewport)
- **Map pins** with mood-colored markers (runic SVG icons)
- **Journey paths** -- dashed gold lines connecting pins in order, with an animated travel dot
- **Pin creation** (GM only) -- click the map to place a pin with label, mood, and description
- **Pin tooltips** -- torn-paper-style popups showing label, mood badge, and description
- **Fog of war** -- vignette overlay around the edges

Each pin has: `{ id, x, y, label, mood?, description?, sceneBreakId? }`

**Known limitations:**
- Lore Map pins are currently client-side only in the demo
- The Lore Book API (lore entries) exists but is separate from map pins
- Full map pin persistence (DB table + API) is planned but not yet implemented
- Map pins are story-level (shared across sessions) when implemented

### 6. Ending a Session

1. GM clicks **"End Session"** in the Initiative Bar
2. A confirmation modal appears with an optional **epilogue** textarea (up to 5,000 characters)
3. The system detects the **closing mood** from the last scene break's mood
4. Session status is patched to `completed` with the epilogue and closing mood saved
5. A **closing cinematic Story Moment** plays for both GM and players
6. **Session Highlights** appear, showing:
   - Cinematic story moments that occurred
   - Character deaths
   - Scene titles
   - Dramatic dice rolls (critical successes >= 11, dramatic failures <= 4)
   - Session stats (total turns, scene count, roll count)

Non-GM players who are on the page detect the session ending via polling and see the closing cinematic automatically.

### 7. Post-Session

#### Compile to Chapter

After a session is completed, the GM can compile it into a chapter draft:

1. GM clicks **"Compile to Chapter"** on the session-ended screen
2. The server-side `compileSessionToHTML` function transforms turns into Tiptap-compatible HTML:
   - Opening narration becomes a `<blockquote>`
   - OOC, roll, and roll-request turns are filtered out
   - Story turns are grouped into paragraphs using the same merge rules as the client-side prose assembly
   - Scene breaks become `<hr>` with optional centered titles
   - Illustrations become `<figure>` with `<img>` and optional `<figcaption>`
   - Dialogue uses the verb cycling and name tracking from the prose assembly engine
3. A new chapter is created with:
   - Title = session title
   - Content = compiled HTML
   - Status = draft
   - `sessionId` link back to the campaign session
4. The campaign session gets a `chapterId` link to the new chapter

This creates a **bidirectional link** between session and chapter.

**API:** `POST /api/stories/[storyId]/campaign/sessions/[sessionId]/compile`

#### Epilogue and "Previously On..."

- The epilogue text entered when ending a session is saved to the `campaignSessions.epilogue` column
- The closing mood is saved to `campaignSessions.closingMood`
- The next session's lobby displays this epilogue as a "Previously..." recap
- The closing mood tints the next session's lobby background

---

## Between Sessions

### Campaign Hub

The campaign hub (`/campaign/[storyId]`) is the central management page, showing:

- **Header:** Story title, campaign badge, GM name, link to World & Lore workshop
- **Player Characters:** Cards for all characters with portrait, name, traits, status badge, and player name
- **Characters Past (Memorial):** Dead and retired characters shown to the owning player
- **Character creation form:** Available to players without an active character
- **Sessions list:** All sessions with status badges, turn counts, and epilogue recaps
- **New session form** (GM only): Title and opening narration fields
- **Scheduling polls:** Active poll with voting UI, closed poll results
- **Applications** (GM only): Pending applications with approve/decline/vote buttons

### Session Scheduling Polls

Polls help coordinate when the group plays next. Multi-select voting with optimistic UI updates. The GM confirms the final time by closing the poll with a selected option.

### Character Creation for Replacement Characters

When a player's character has died or retired, they cannot immediately create a replacement. The **GM must explicitly invite** the player to create a new character (via the "Invite New Character" button in the Context Panel, which sends a notification). Only after this invitation does the campaign hub show a "Create a New Character" button with the flavor text: "A new face emerges from the crowd..." The form is the same as initial character creation. This ensures death has narrative weight — the GM controls when and if a new character enters the story.

---

## Technical Reference

### Database Tables

#### `playerCharacters`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| storyId | uuid | FK to stories |
| userId | uuid | FK to users |
| name | text | Character name |
| portrait | text | Portrait URL or base64 |
| description | text | Physical description |
| traits | text | Free-form character traits |
| backstory | text | Character backstory |
| stats | text | JSON string: `{ approaches: { Bold, Keen, Subtle }, aspect }` |
| status | text | `active` / `retired` / `dead` |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `campaignSessions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| storyId | uuid | FK to stories |
| title | text | Session title |
| summary | text | Session summary |
| opening | text | Opening narration text |
| epilogue | text | Closing epilogue text |
| closingMood | text | Mood string from last scene break |
| chapterId | uuid | FK to chapters (after compilation) |
| activePlayerId | uuid | FK to users (current turn holder, null = open floor) |
| sortOrder | integer | Session ordering |
| status | text | `draft` / `active` / `completed` / `archived` |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `sessionRoster`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sessionId | uuid | FK to campaignSessions |
| characterId | uuid | FK to playerCharacters |
| userId | uuid | FK to users |
| status | text | `present` / `absent` / `introduced` / `spectating` |
| createdAt | timestamp | |

Unique constraint on (sessionId, characterId). Indexed on sessionId.

#### `campaignTurns`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sessionId | uuid | FK to campaignSessions |
| userId | uuid | FK to users |
| characterId | uuid | FK to playerCharacters (nullable) |
| type | text | Turn type (see turn types table above) |
| content | text | Turn text content |
| metadata | text | JSON string (dice results, scene break data, etc.) |
| sortOrder | integer | Ordering within session (atomically computed) |
| createdAt | timestamp | |

Indexed on (sessionId, sortOrder).

#### `campaignApplications`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| storyId | uuid | FK to stories |
| userId | uuid | FK to users |
| pitch | text | Application pitch text |
| status | text | `pending` / `approved` / `declined` / `voting` |
| votingDeadline | timestamp | Deadline for community voting |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Unique constraint on (storyId, userId).

#### `campaignVotes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| applicationId | uuid | FK to campaignApplications |
| voterId | uuid | FK to users |
| vote | boolean | Yes (true) or No (false) |
| createdAt | timestamp | |

Unique constraint on (applicationId, voterId).

#### `sessionPolls`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| storyId | uuid | FK to stories |
| createdBy | uuid | FK to users |
| title | text | Poll question |
| options | text | JSON array of option strings |
| status | text | `open` / `closed` |
| confirmedOption | text | GM's final confirmed pick |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `sessionPollVotes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pollId | uuid | FK to sessionPolls |
| userId | uuid | FK to users |
| selectedOptions | text | JSON array of selected option indices |
| createdAt | timestamp | |

Unique constraint on (pollId, userId).

### API Endpoints

#### Characters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/[storyId]/campaign/characters` | List all player characters with user info |
| POST | `/api/stories/[storyId]/campaign/characters` | Create a player character |
| PATCH | `/api/stories/[storyId]/campaign/characters/[characterId]` | Update character name, traits, stats, or status |

#### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/[storyId]/campaign/sessions` | List all sessions with turn counts |
| POST | `/api/stories/[storyId]/campaign/sessions` | Create a new session (GM only) |
| PATCH | `/api/stories/[storyId]/campaign/sessions/[sessionId]` | Update session title, status, epilogue, etc. |

#### Turns
| Method | Path | Description |
|--------|------|-------------|
| GET | `.../sessions/[sessionId]/turns` | List turns; supports `?afterSort=N` for polling |
| POST | `.../sessions/[sessionId]/turns` | Create a turn (enforces turn order and GM-only types) |
| PATCH | `.../sessions/[sessionId]/turns/[turnId]` | Edit a recently submitted turn (30s window) |

#### Active Player
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `.../sessions/[sessionId]/active-player` | Set who has the current turn (GM only) |

#### Roster
| Method | Path | Description |
|--------|------|-------------|
| GET | `.../sessions/[sessionId]/roster` | Get session roster |
| PUT | `.../sessions/[sessionId]/roster` | Update roster (set character IDs that are present) |

#### Compile
| Method | Path | Description |
|--------|------|-------------|
| POST | `.../sessions/[sessionId]/compile` | Compile completed session to chapter draft (GM only) |

#### Applications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/[storyId]/campaign/applications` | List applications (GM sees all; others see "voting" only) |
| POST | `/api/stories/[storyId]/campaign/applications` | Submit an application |
| PATCH | `.../applications/[applicationId]` | Approve, decline, or open voting |
| POST | `.../applications/[applicationId]/votes` | Cast a yes/no vote |

#### Polls
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/[storyId]/campaign/polls` | List all polls |
| POST | `/api/stories/[storyId]/campaign/polls` | Create a scheduling poll (GM only) |
| PATCH | `/api/stories/[storyId]/campaign/polls/[pollId]` | Vote on a poll or close it |

### Components

| File | Description |
|------|-------------|
| `src/components/campaign/types.ts` | Shared TypeScript interfaces, approach constants, player color system, stats parser |
| `src/components/campaign/use-campaign-session.ts` | React hook: fetches story/session/turns/characters/roster, polls for updates every 5s, provides sendTurn/setActivePlayer/updateSession/updateRoster |
| `src/components/campaign/StoryCanvas.tsx` | Center panel: prose assembly, writing area, lobby integration, scene breaks, mood tinting, dice roller mount, session-ended block, session highlights |
| `src/components/campaign/SessionLog.tsx` | Left panel: OOC chat messages, dice roll cards, roll request cards with stakes display |
| `src/components/campaign/ContextPanel.tsx` | Right panel: GM dashboard (clocks, push event, scene breaks, story moments, illustrations, roll requests, character management) or player character sheet |
| `src/components/campaign/InitiativeBar.tsx` | Top bar: session title, turn state label, player avatars with turn indicators, turn timer with circular progress, GM controls (Open Floor, End Session) |
| `src/components/campaign/SessionLobby.tsx` | Pre-session lobby: themed background, party circle, roster management, opening preview, "Begin the Story" button, "Previously..." recap |
| `src/components/campaign/DiceRoller.tsx` | Animated 2d6 dice roller: approach selector, aspect invocation, pip-based dice faces, outcome tier display, stakes preview |
| `src/components/campaign/ProgressClock.tsx` | SVG pie-chart progress clock: danger/progress/racing types, 4/6/8 segments, interactive fill/unfill, deletable |
| `src/components/campaign/StoryMoment.tsx` | Full-screen cinematic overlay: 13 mood presets, word-by-word text reveal, atmosphere effects (particles, bloom, crack, fog, rotating gradient), phased animation timeline |
| `src/components/campaign/LoreMap.tsx` | Interactive map: draggable canvas, nautical grid, runic pin markers, journey path curves, pin creation form, torn-paper tooltips, compass rose |
| `src/lib/compile-session.ts` | Server-side session-to-chapter compilation: paragraph grouping, name tracking, dialogue verb cycling, HTML generation |
| `src/app/campaign/[storyId]/page.tsx` | Campaign hub: character management, session list, applications, polls, scheduling |
| `src/app/campaign/[storyId]/play/[sessionId]/page.tsx` | Play page: wires up all three panels, handles all turn routing and GM/player actions |

### Notification Types

Current notification types used by adventure mode:

- `collaboration` -- used for session begin/end, session creation, poll creation, poll close
- All notifications are in-app only (no email/push yet)
- Notifications have read/unread state
- Badge count polls every 60 seconds from the navbar

### Polling and Real-Time Updates

The system uses HTTP polling (not WebSockets) for real-time updates:

- **Turns:** Polled every 5 seconds via `?afterSort=N` parameter (only fetches new turns since last known sortOrder)
- **Session state:** Session metadata (status, activePlayerId, epilogue) returned with every turn poll response
- **Characters and roster:** Refreshed every 6th poll cycle (~30 seconds)
- **Deduplication:** New turns are deduplicated by ID before appending to local state

---

## Known Limitations

- **No GM ownership transfer** -- the story creator is always the GM. Planned for future.
- **No co-GM support** -- only one GM per campaign.
- **Timer is client-side** -- extensions don't persist across page refreshes.
- **Lore Map pins are not persisted** -- demo-only feature currently.
- **No content moderation** -- user-generated content (prose, illustrations, OOC) is not moderated.
- **No timezone handling in polls** -- options are free text, no date parsing.
- **Illustration URLs are not validated** -- any URL is accepted; broken images fail silently.
- **No campaign-level safety settings** -- no opt-in/opt-out for lethal play.
- **`introduced` roster status** mixes first-appearance with attendance; may be split into a boolean in future.

---

## Demo Mode

**URL:** `/demo-adventure`

The demo page provides a fully functional, self-contained Adventure Mode experience without requiring authentication or a database. It demonstrates:

- **View switching:** Toggle between GM, Lyra (player), and Kaelen (player) perspectives
- **Session lifecycle:** Start from lobby, begin session, play, end session
- **Pre-loaded content:** 10 story turns (narration, actions, dialogue, reactions, scene breaks), 3 OOC/roll log turns, 3 characters with full stats
- **All GM tools:** Progress clocks (pre-loaded with "The Ritual" and "Dawn Approaches"), scene breaks, story moments, illustrations, roll requests, narrative push
- **Lobby theme switching:** Dropdown to preview all 7 lobby themes
- **Lore Map:** Pre-loaded with 3 pins (The Ruined Throne Room, The Obsidian Gate, The Whispering Gallery)
- **Roster management:** Toggle character presence in the lobby
- **Compile to chapter:** Mock compilation (no actual API call)

Mock data includes three characters: Lyra Varen (Keen +2, forgekeeper), Kaelen (Bold +2, bladesinger), and Elara (Keen +1/Subtle +1, healer who hears the dead).
