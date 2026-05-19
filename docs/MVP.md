# Quiloria — MVP Blueprint

> A platform where stories are created together, experienced together, and brought to life across disciplines.

---

## The Problem

Creative storytelling is fragmented. Writers publish on Wattpad or Medium but can't collaborate meaningfully. They find illustrators through chaotic Twitter threads and Discord DMs. Readers consume passively with no way to shape the stories they love. There's no single place where the full creative lifecycle of a story — writing, illustrating, editing, reading, reacting — lives under one roof.

## The Insight

Stories aren't written in isolation. Behind every great novel is a web of editors, beta readers, cover artists, and an audience that fuels the creator. Quiloria makes that web visible, accessible, and native to the platform.

## Core Principles

1. **Creativity-first language** — No git jargon. No "repositories" or "pull requests." The interface speaks in the language of storytelling: drafts, threads, paths, suggestions, retellings.
2. **Writers stay in control** — Readers can influence, react, and suggest — but the creator always holds the pen. Collaboration is opt-in, never forced.
3. **Show the craft** — Revision history, collaboration credits, and the creative process itself are part of the experience. Readers can see how a story evolved, not just the final product.
4. **Multi-discipline by design** — A story on Quiloria can be prose, illustrated prose, a comic, or interactive fiction. The platform doesn't privilege one format.

---

## Creative Vocabulary

We reject technical jargon. Every concept gets a name that feels native to storytelling:

| Concept | Quiloria Term | What it means |
|---|---|---|
| Repository | **Story Project** | The home for a story — chapters, art, notes, collaborators |
| Branch | **Path** | An alternate version or direction for a story |
| Fork | **Retelling** | Someone else's take on your world (with attribution) |
| Pull Request | **Suggestion** | A proposed change from a collaborator or reader |
| Commit | **Revision** | A saved snapshot of the story at a point in time |
| Issue | **Thread** | A discussion about a plot hole, idea, or direction |
| README | **Story Brief** | The pitch — synopsis, genre, tone, and what roles are needed |
| Merge | **Weave** | Accepting a suggestion into the main story |
| Contributor | **Collaborator** | Anyone with a creative role on the project |
| Star/Like | **Spark** | A reader showing love for a story |

---

## User Roles

Not rigid categories — more like hats people wear. One person can wear many.

- **Writer** — Creates prose, scripts, or interactive narratives
- **Illustrator** — Adds visual art, character designs, scene illustrations, comic panels
- **Editor** — Refines, restructures, and polishes
- **Worldbuilder** — Develops lore, maps, timelines, character bibles
- **Reader** — Consumes, reacts, discusses, and (when invited) influences

---

## MVP Scope

### What the MVP Must Prove

Three things. If these work, the platform has legs:

1. **Writing + reading on Quiloria feels better than the alternatives** — the editor is a joy, the reading experience is beautiful, serialization is native
2. **Collaboration between creatives actually happens** — a writer finds an illustrator, they work on a story together, the result is better than either could do alone
3. **Readers feel like participants, not passengers** — without overriding the creator's vision

### What the MVP Explicitly Defers

- Monetization (patronage, premium chapters, commissions marketplace)
- Mobile apps (responsive web only)
- AI-assisted writing tools
- Real-time collaborative editing (start with async — suggestions/revisions)
- Branching/interactive fiction (Path system)
- Retellings (forking)
- Advanced discovery algorithm
- Internationalization

---

## MVP Feature Set

### Phase 1 — "The Desk" (Write + Read)

The foundation. A writer can create, a reader can discover and enjoy.

#### Content Formats

Every Story Project selects a format at creation. The format determines the editor experience, the reading experience, and how collaboration works. Each format is built to honour how that form of storytelling actually works — not a one-size-fits-all editor with toggles.

**Prose** — Novels, novellas, short stories, serial fiction
- Block-based rich text editor with chapters as the primary unit
- Support for inline illustrations, full-bleed art blocks, and chapter header art
- The classic Quiloria experience: beautiful typography, generous margins, the feeling of reading a real book
- Collaboration: writers suggest edits, illustrators place art within the text

**Webtoon / Comic** — Vertical-scroll comics, manga-style panels, graphic novels
- **Panel-based editor** — not a text editor with images. The atomic unit is the panel, not the paragraph. Artists upload panels in sequence; the editor handles layout, gutters, spacing, and reading flow
- **Vertical scroll** (webtoon style) as the default reading mode — this is how the audience already reads digital comics
- **Page-based layout** as an alternative for graphic novels and traditional manga that want a page-turn feel
- Support for **speech bubbles and text overlays** — artists can upload clean art and add dialogue/narration through the platform, or upload fully lettered panels
- **Script view** — for writer-artist collaborations, the writer can author a comic script (panel descriptions, dialogue, stage directions) that the artist sees alongside their canvas. The script is a living reference, not a static document
- Collaboration: the writer writes the script, the artist draws panels, the letterer (or writer) adds dialogue. Each role has clear ownership of their layer

**Illustrated Prose** — The hybrid: stories where text and art are equal partners
- A blend of the prose and visual editors. Text blocks and illustration blocks are interleaved freely, with neither dominating
- Think children's books, art books, or visual novels where every spread has both prose and a full illustration
- The illustrator and writer work in parallel — the editor shows both layers and how they compose together
- Reading experience: text and art flow together naturally, with layout that adapts to the balance of each chapter (some chapters might be text-heavy, others almost entirely visual)

**Poetry** — Poems, collections, spoken word (with optional audio)
- A minimal editor that respects line breaks, stanza spacing, and visual arrangement — poetry is spatial, and the editor honours that
- Support for **concrete/visual poetry** where the shape of the text on the page is part of the work
- Optional **audio layer** — poets can record spoken-word performances attached to the text. Readers can read, listen, or both simultaneously, with the text highlighting in sync
- Collections as the organising unit (instead of chapters): a poetry project is a collection of individual poems
- Illustration support: visual artists can pair art with individual poems

**Screenplay / Script** — Film, TV, stage plays, audio drama
- Industry-standard formatting: scene headings (INT/EXT), action lines, character names, dialogue, parentheticals — auto-formatted as the writer types
- **Table read mode** — a reading experience designed for scripts: clean, mono-spaced, with character names highlighted. Optionally assign characters to collaborators for a virtual table read
- Collaboration: multiple writers can suggest scene rewrites; a director/showrunner role can approve

Each format gets:
- Its own **editor** tuned to that medium
- Its own **reading experience** tuned to how audiences consume that medium
- Its own **collaboration model** tuned to how creators in that medium actually work together
- Full revision history, marginalia, sparks, and all the social features — these are universal

#### Story Editor (Universal)
- Auto-saving drafts with revision history ("see how this chapter evolved")
- **Mood & Tone controls** — set chapter-level ambiance: color accent, suggested reading music/playlist link, pacing tag (slow burn, action, contemplative)
- Clean distraction-free writing mode

#### Story Project Page
- **Story Brief** — cover image, title, synopsis, genre tags, tone tags, content rating (required), content notes
- Chapter list with publish status (draft / published)
- **The Shelf** — a prominent, visual-first gallery of all art and illustrations in the story. Not a sidebar or afterthought — this is a top-level tab alongside Chapters. Readers can browse art independently, see the artist's name on each piece, and spark individual illustrations. For stories with strong visual work, The Shelf becomes a discovery entry point on its own
- **Equal credit** — collaborator names displayed at the same size and prominence. "Written by X · Illustrated by Y" — not "by X (art: Y)". The illustrator is a co-creator, not a footnote
- Story stats: word count, chapter count, reader count, sparks (split: story sparks + art sparks)

#### Reading Experience
- Beautiful, typography-focused reading view
- **Illustrations are part of the narrative, not decorations.** They can be placed inline (woven between paragraphs), full-bleed (edge-to-edge, interrupting the text for dramatic effect), as chapter headers, or as page-break moments. The illustrator controls presentation — sizing, bleed, framing — not just the writer
- Chapter navigation with progress indicator
- **Marginalia** — readers can highlight passages and leave short reactions (not full comments — think emoji reactions or one-line thoughts anchored to specific paragraphs). Marginalia works on illustrations too — readers can react to a specific piece of art, not just text
- **Art Sparks** — individual illustrations can be sparked separately. This gives illustrators direct, visible feedback. A chapter might have 200 sparks on the writing and 500 on a single illustration — both are celebrated
- End-of-chapter discussion thread
- Follow a story to get notified on new chapters
- **Creator Updates** — a lightweight feed pinned to the Story Project page. Writers can post short updates to followers: "Chapter 8 is delayed — moving house this week", "Sneak peek at the new character design from @illustrator", "Halfway through the final arc, here's a teaser paragraph." Not a full blog — more like project status notes. Keeps readers informed and connected to the creative process without any schedule pressure from the platform

#### Discovery
- Browse by **genre**, **tone**, and **format** — format is a top-level filter, not a tag. Readers looking for webtoons shouldn't have to wade through novels to find them
- **Format-native browse views** — prose stories show cover + synopsis + excerpt. Comics show cover + sample panels. Poetry shows a featured poem. Each format puts its best foot forward in the browse grid
- **"Illustrated Stories"** as a prominent filter — not buried in tags. Readers who care about visual storytelling can find it immediately
- **Art-first discovery** — a dedicated browse mode where you see illustrations first, then tap through to the story. Beautiful art pulls readers in; the prose keeps them. This is a different discovery path than title/synopsis and gives illustrators a front door, not a side entrance
- "Just Published" feed (chronological, no algorithm — keep it honest for MVP)
- Curated "Staff Picks" (manual curation to seed quality early on) — including "Art Picks" that highlight exceptional illustration work specifically
- Search by title, author, tag

#### Profiles
- Bio, avatar, role badges (Writer, Illustrator, etc.)
- "My Stories" — stories you've created or collaborated on
- "My Shelf" — stories you're following/reading
- **Portfolio** — for illustrators, this is the centerpiece of their profile, not a subsection. A visual grid of their best work: standalone pieces, story illustrations, character designs. Think ArtStation-quality presentation, not a list of links. Each piece links back to the Story Project it belongs to, creating a natural bridge between the artist's portfolio and the stories they've brought to life
- **Portfolio for writers too** — excerpts, not just titles. A writer's profile shows a curated selection of their best passages alongside cover art, giving visitors a taste of their voice before clicking through

---

### Phase 2 — "The Workshop" (Collaborate)

This is what makes Quiloria different. Creative collaboration as a first-class feature.

#### Open Calls
- A writer can post an **Open Call** on their Story Project: "Looking for an illustrator for a dark fantasy serial" with details on style, scope, and commitment
- Creatives can browse Open Calls and respond with a pitch + portfolio samples
- Writer reviews and invites a collaborator

#### Creative Agreement (Required Gate)
Before any collaboration begins, all parties must sign a **Creative Agreement**. This is not optional — it's the gate that unlocks the collaboration space.

When a story owner invites a collaborator (or accepts one from an Open Call), both parties are presented with an agreement screen before any work can start. The agreement covers:

- **Ownership split** — Who owns what percentage of the final work? Default: story owner retains primary ownership, collaborators retain ownership of their individual contributions (e.g., an illustrator owns their art, but grants a license to the story project)
- **Usage rights** — Can the story be published externally (print, audiobook, adaptation)? Who needs to approve? Default: all parties must approve external publication
- **Credit** — How each collaborator is credited. Non-negotiable minimum: all collaborators are always visibly credited on the Story Project page. Additional credit terms (cover credit, "story by X, illustrated by Y") are set here
- **Revenue sharing** — If/when monetization is added, what's the split? Can be set now even if payouts come later. Default: proportional to ownership split
- **Exit terms** — What happens if a collaborator leaves mid-project? Their existing contributions remain (with credit), but they stop having input on future direction. Either party can propose revised terms at any time
- **Derivative works** — Can collaborators use characters/world elements in their own separate projects? Default: no, unless explicitly granted

**How it works in the UI:**
1. Story owner invites collaborator and selects a template agreement (or customizes)
2. Collaborator reviews the terms alongside the Story Brief
3. Both parties confirm — the agreement is timestamped and stored
4. Only then does the collaborator gain access to the collaboration space
5. Either party can view the agreement at any time from the project settings
6. Amendments require mutual consent (both parties re-confirm)

**Agreement Templates** (to reduce friction):
- **Equal Partners** — 50/50 ownership, mutual approval on everything
- **Lead + Contributor** — Owner retains primary ownership (e.g., 80/20), contributor retains rights to their individual work
- **Work for Hire** — Collaborator contributes under full assignment to the owner (for cases where someone is being commissioned)
- **Custom** — Blank slate, fill in every field

This keeps things human and clear. No fine print, no legalese — plain language agreements that both parties understand before the first word is written or the first sketch is drawn.

#### Collaboration Space
- Collaborators get access to the Story Project based on their role:
  - **Writers/Editors** can submit **Suggestions** (proposed changes to chapters with before/after diff, described in human-readable terms)
  - **Worldbuilders** can contribute to a shared **Lore Book** (a simple wiki-style section: characters, places, timeline)
- All contributions are credited — the platform tracks who wrote what, who illustrated what
- **Threads** — discussion space within a Story Project for collaborators to discuss direction, plot, characters

#### The Studio (Illustrator Workspace)
Illustrators get their own dedicated workspace within the Story Project — not just an upload button bolted onto the writer's editor. This is where visual storytelling happens.

- **Art Board** — a space to post works-in-progress, sketches, color studies, and variations. The writer can see progress and give feedback in context, with annotation tools (draw on the image to point at specific areas, leave pinned comments). This replaces the "send a PNG over Discord and hope for useful feedback" workflow
- **Chapter Context View** — the illustrator can see the chapter text alongside their canvas. Read the scene, then illustrate it — without switching tabs or apps. Key passages can be pinned/highlighted by the writer as "illustration moments" to guide the artist on what scenes would benefit from visual treatment
- **Character & Scene Sheets** — structured pages for character designs (front/side/expression sheets), location art, prop designs, and mood boards. These are first-class entities in the project, not files in a folder. Writers reference them when writing ("she wore the outfit from Sheet 3"), artists iterate on them over time
- **Placement Control** — when an illustration is ready, the artist proposes where and how it appears in the chapter: inline, full-bleed, chapter header, or page break. They control framing, sizing, and cropping. The writer approves placement, but the artist drives the visual presentation. Neither is subordinate to the other
- **Version History** — art gets the same revision treatment as prose. See how an illustration evolved from rough sketch to final. Readers can optionally view this process (if the artist enables it), making the craft visible

#### Suggestion Flow
- A collaborator submits a Suggestion (a proposed edit to a chapter or section)
- The story owner sees a clean diff: what changed and why (collaborator includes a note)
- Owner can **Weave** (accept), **Revise** (accept with modifications), or **Pass** (decline with feedback)
- All of this is visible in the revision history — "Chapter 4, Revision 3: Woven suggestion from @artistname — added rain scene illustration"

---

### Phase 3 — "The Hearth" (Community)

Light community features that make readers feel like they belong.

#### Reader Engagement
- **Sparks** — the primary "I love this" signal (replaces likes/stars/kudos)
- **Marginalia** enhanced — readers can see each other's highlights and reactions (opt-in, like a shared book club annotation layer)
- **Chapter Reactions** — at the end of each chapter, readers can leave a quick emotional reaction (not just "like" — more like: "I gasped", "I cried", "I need more", "I saw that twist coming")
- **Story Discussions** — per-chapter and overall story discussion threads

#### Creator Updates
- Writers can post **Updates** to their followers — progress notes, behind-the-scenes, sneak peeks
- Think of it like a lightweight blog attached to the story project — "Chapter 12 is in editing, here's a sneak peek at @illustrator's new character design"

#### Story Jams (Stretch)
- Time-boxed creative events: "Write a 3-chapter ghost story in 48 hours"
- Teams form on the platform (writer + illustrator + editor)
- Community votes on winners
- Great for onboarding new users and generating content

---

## Key Pages (Site Map)

```
/                           Landing page (current)
/browse                     Discover stories by genre/tag/format
/story/[slug]               Story Project page (brief, chapters, shelf, collaborators)
/story/[slug]/read/[ch]     Reading view for a chapter
/story/[slug]/workshop      Collaboration space (suggestions, threads, lore book)
/story/[slug]/calls         Open Calls for collaborators
/create                     New Story Project setup
/write/[slug]/[chapter]     Story editor
/profile/[username]         User profile
/profile/[username]/edit    Edit profile
/notifications              Chapter drops, suggestion updates, new followers
/jams                       Story Jams (Phase 3)
```

---

## Technical Decisions (MVP)

### Editor
- **Tiptap** (ProseMirror-based) — extensible, supports custom blocks (illustration blocks, mood blocks), has collaboration extensions for later
- Chapters as separate documents, not one giant doc
- Images stored in object storage (S3/R2), referenced in editor content

### Data
- **PostgreSQL** via Prisma — stories, chapters, users, collaborations, suggestions
- Key models: User, StoryProject, Chapter, Revision, Suggestion, Thread, Comment, Illustration, OpenCall, Spark

### Auth
- **NextAuth.js** — email + OAuth (Google, GitHub to start)
- Role-based access per Story Project (owner, collaborator by role, reader)

### Infrastructure
- **Next.js App Router** (already set up)
- **Vercel** for hosting (natural fit)
- **Cloudflare R2** or **Uploadthing** for media storage
- **Resend** for transactional emails (chapter drop notifications)

### Styling
- **Tailwind CSS** (already set up) + current design system (ink, linen, amber, espresso palette)
- **Framer Motion** (already installed) for interactions

---

## Content Stewardship

We don't call it "moderation" — we call it stewardship. The philosophy: **trust creators to be honest about what they're publishing, give readers the tools to make informed choices, and act decisively only when trust is violated.**

This mirrors every other decision in the platform: creators are in control, agreements are upfront, and the platform provides structure without imposing pressure.

### Creator-Set Content Ratings

When publishing a Story Project, the creator sets a **Content Rating** — this is required, not optional. Like the Creative Agreement, it's a gate: you can't publish without rating your work.

- **All Ages** — safe for any reader
- **Teen+** — mild language, mild violence, romantic themes without explicit content
- **Mature** — strong language, graphic violence, sexual themes, heavy subject matter
- **Explicit** — sexually explicit content, extreme violence, content intended for adults only

Alongside the rating, creators tag specific **Content Notes** from a structured list:
- Violence / Graphic violence
- Sexual content / Explicit sexual content
- Strong language
- Self-harm / Suicide themes
- Substance use
- Abuse / Trauma
- Horror / Disturbing imagery

These aren't warnings that shame — they're signals that respect the reader. A horror writer shouldn't feel judged for tagging "disturbing imagery." A romance writer shouldn't feel stigmatized for tagging "sexual content." The framing is neutral: "here's what's in this story so you can decide if it's for you."

### Reader-Side Controls

Readers set their own **Comfort Preferences** in their profile:
- Default content rating threshold (e.g., "show me everything up to Mature")
- Specific content note filters (e.g., "hide stories tagged with self-harm themes")
- These are private — no one sees a reader's filters

Stories beyond a reader's threshold are hidden from browse and search by default, with an option to reveal them. Not blocked — just not surfaced. The reader is always in control.

### Community Flagging

Any reader can flag content for one of three reasons:
1. **Misrated** — "This story is rated Teen+ but contains content that should be Mature or Explicit" (the most common and most important flag — the system depends on honest ratings)
2. **Harmful content** — Content that violates platform rules: hate speech, real-person harassment, content sexualizing minors, doxxing, or incitement to violence
3. **Spam / Bad faith** — AI-generated content farms, plagiarism, or content that exists solely to game the platform

Flags are not downvotes. Flagging is about trust violations, not taste disagreements. "I didn't like this story" is not a flag. "This story is rated All Ages but contains graphic violence" is.

### Review & Response

At MVP scale, review is manual — a small stewardship team (even if it's just the founders initially):

- **Misrated flags** → Review the content, adjust the rating if warranted, notify the creator with a clear explanation. First time is a correction, not a punishment. Repeat offenders get a rating lock (the platform sets their rating and they can't lower it)
- **Harmful content flags** → Review against clear, published platform rules. If confirmed: content is removed, creator is notified with the specific rule violated. Severe violations (CSAM, doxxing) are immediate removal + account suspension, no warnings
- **Spam flags** → Review, remove if confirmed, ban repeat offenders

**Appeals:** Creators can appeal any moderation action. Appeals go to a different reviewer than the original decision. The process is transparent — the creator sees the flag reason, the rule cited, and the decision rationale.

### What We Don't Do

- **No pre-publication review.** Creators publish freely. Trust first, intervene only when trust is broken.
- **No algorithmic suppression.** We don't quietly shadow-hide content based on engagement signals or vague "quality" scores. If content is on the platform, it's discoverable within the reader's comfort preferences. If it violates rules, it's removed — not half-hidden.
- **No moral judgments on legal content.** The platform hosts fiction. Fiction explores dark themes. A story with violence, morally grey characters, or uncomfortable subject matter is not inherently a moderation problem — it's storytelling. Content ratings and notes exist precisely so that readers can self-select.
- **No tolerance for genuine harm.** The line is clear: hate speech targeting real groups, content sexualizing minors, harassment of real people, doxxing, and incitement to real-world violence are not fiction and are not protected. This is non-negotiable.

### Platform Rules (Published, Plain Language)

A short, clear document — not a 40-page terms of service. Creators and readers can read the full rules in under 5 minutes. The rules cover:
1. Rate your content honestly
2. Credit collaborators as agreed
3. Don't plagiarize
4. No hate speech targeting real groups
5. No content sexualizing minors
6. No harassment of real people
7. No doxxing or sharing private information
8. No incitement to real-world violence
9. No spam or bad-faith content farming
10. Respect the Creative Agreement you signed

Ten rules, plain language, no ambiguity.

---

## Design Philosophy

### The Reading Experience
The reading view should feel like holding a beautifully typeset book — not scrolling a web page. Think generous margins, elegant serif typography (Playfair Display is already in the project), comfortable line heights, and illustrations that breathe within the text rather than being crammed thumbnails.

### The Writing Experience
The editor should feel like a calm, private workshop — not a noisy SaaS tool. Minimal chrome, maximum focus. The toolbar appears when you need it and vanishes when you don't. Writing here should feel like writing in a nice journal, not in Google Docs.

### The Collaboration Experience
Collaboration should feel like passing notes between trusted friends — not filing tickets. Suggestions are conversations, not code reviews. The diff view should highlight what changed in human-readable language ("added a new paragraph after the dialogue scene"), not raw text diffs.

### Emotional Palette
The current design system is strong — dark, warm, literary. Expand it:
- **Ink** (#0A0A0A) — the void before the story begins
- **Linen** (#F5F0E8) — the page, the text, the light
- **Amber** (#D4A574) — warmth, creativity, the glow of inspiration
- **Espresso** (#2A1F1A) — depth, the weight of good prose
- **Genre accents** — each genre gets a signature color (already implemented in the landing page)

---

## Success Metrics (MVP)

Not vanity metrics. Signals that the core loops work:

1. **Do writers finish stories?** — % of stories with 3+ published chapters
2. **Do readers come back?** — return rate after first story read
3. **Do collaborations form?** — % of Open Calls that result in at least one accepted collaborator
4. **Do suggestions get woven?** — % of suggestions accepted (too low = friction, too high = rubber stamping)
5. **Do readers engage beyond reading?** — % of readers who leave at least one marginalia or reaction

---

## Open Questions

- **~~Moderation~~** — Resolved: see Content Stewardship section below.
- **~~Intellectual property~~** — Resolved: see Creative Agreement below.
- **~~The illustrator experience~~** — Resolved: illustrators get The Studio (dedicated workspace), Art Board (WIP/feedback), Character & Scene Sheets, Placement Control over how art appears in chapters, art-specific Sparks, art-first discovery paths, and ArtStation-quality portfolio profiles. Visual storytelling is a first-class discipline, not an add-on.
- **~~Serialization cadence~~** — Resolved: fully freeform, no enforced schedule. Writers set their own pace. The platform provides a Story Updates feed (pinned to the Story Project page) where creators can post progress notes, delay announcements, sneak peeks, and behind-the-scenes content — keeping readers informed without platform-imposed pressure. See Creator Updates in Phase 3.
- **~~Content formats~~** — Resolved: five distinct formats, each with a native editor, reading experience, and collaboration model. Prose, Webtoon/Comic, Illustrated Prose, Poetry, and Screenplay/Script. No one-size-fits-all editor.

---

## Implementation Priority

### The approach: editor-first development

The editors are the product. If a writer opens Quiloria and it doesn't feel better than Word, Scrivener, or a plain notepad — nothing else matters. Discovery, community, collaboration — all of that is worthless if the creative tool itself isn't exceptional.

Current tools fail creators in specific ways:
- **Word / Google Docs** — built for business documents. They don't understand chapters, scenes, pacing, or tone. Formatting is a chore. No concept of a "story" as a structured object.
- **Scrivener** — understands story structure but feels like 2008 desktop software. No collaboration, no web, no visual storytelling.
- **Wattpad's editor** — bare minimum. A text box with bold/italic. Feels like writing in a comment field.
- **Comic artists** — juggle Clip Studio / Photoshop for drawing, then manually export and upload to Webtoon/Tapas. No integrated workflow from panel to publication.
- **Poets** — fight Google Docs for line spacing. No tool respects the spatial nature of poetry.
- **Screenwriters** — pay $250 for Final Draft or use free alternatives that feel like they were built as a school project.

We build the editors first, in isolation, and make them genuinely excellent. Then we wrap the platform around them.

```
PHASE 0 — "The Craft" (Editors + Reading Views)
│
│   Build these as standalone tools. No auth, no accounts, no social
│   features. Just the purest possible creative tools. A writer should
│   be able to open Quiloria and start writing immediately — and never
│   want to go back to Word.
│
├── Prose Editor
│   ├── Block-based (Tiptap/ProseMirror), chapters as the primary unit
│   ├── Chapter management (reorder, nest into parts/acts)
│   ├── Scene breaks, epigraphs, author notes as first-class blocks
│   ├── Inline illustration placement (for later collaboration)
│   ├── Full-bleed image blocks, chapter header art slots
│   ├── Mood & Tone controls (chapter-level ambiance)
│   ├── Distraction-free writing mode (just you and the page)
│   ├── Word count, chapter stats, reading time estimates
│   ├── Auto-save + local revision history
│   └── Prose Reading View — beautiful, typeset, book-like
│
├── Webtoon / Comic Editor
│   ├── Panel-based upload + sequencing (drag to reorder)
│   ├── Gutter and spacing controls
│   ├── Speech bubble / text overlay tool (place on panels)
│   ├── Episode structure (episodes = chapters)
│   ├── Thumbnail generation for episode list
│   ├── Vertical scroll reading view (webtoon standard)
│   ├── Page-turn reading view (graphic novel / manga)
│   └── Script view — text panel descriptions alongside art panels
│
├── Poetry Editor
│   ├── Line-break and stanza-aware formatting
│   ├── Visual/concrete poetry support (spatial text arrangement)
│   ├── Collection structure (poems as individual pieces, not chapters)
│   ├── Audio recording layer (record spoken word, synced to text)
│   └── Poetry Reading View — centred, spacious, respects the form
│
├── Illustrated Prose Editor
│   ├── Hybrid: text blocks and illustration blocks interleaved freely
│   ├── Layout controls (text wraps around art, art breaks text, side-by-side)
│   ├── Spread-based thinking (how does this two-page spread look?)
│   └── Illustrated Reading View — text and art flow together naturally
│
├── Screenplay / Script Editor
│   ├── Auto-formatting (scene headings, action, dialogue, parentheticals)
│   ├── Character name auto-complete
│   ├── Scene navigator / outline view
│   ├── Table read mode (reading view with character highlighting)
│   └── Script Reading View — clean, mono-spaced, industry-standard
│
└── Universal Editor Features
    ├── Keyboard-first — fast for power users, discoverable for new users
    ├── Command palette (quick actions, formatting, navigation)
    ├── Focus mode (current chapter/scene only, everything else fades)
    ├── Dark + light themes (writing is personal — respect preference)
    ├── Export: PDF, EPUB, plain text, Markdown (your work is yours)
    └── Offline support (PWA — writers write everywhere, not just online)

PHASE 1 — "The Desk" (Platform Foundations)
│
│   Wrap the editors in a platform. Add accounts, projects, publishing,
│   and the reading/discovery experience.
│
├── Auth + user profiles (with portfolio support)
├── Story Project creation (brief, cover, genre tags, format, content rating)
├── Reader comfort preferences (rating threshold, content note filters)
├── Publishing flow (draft → published)
├── Browse / discovery (genre, format, art-first mode, search)
├── The Shelf (art gallery per story, individual art sparks)
├── Creator Updates (progress notes, teasers, delay announcements)
├── Sparks + follow system
├── Marginalia (inline reactions on text and art)
└── Community flagging + manual review

PHASE 2 — "The Workshop" (Collaboration)
├── Collaboration invites + roles + Creative Agreement gate
├── The Studio (illustrator workspace: Art Board, Character Sheets, Placement Control)
├── Suggestion system (propose → review → weave/pass)
├── Revision history (human-readable, for both prose and art)
├── Comic script view (writer scripts ↔ artist panels)
├── Open Calls
├── Lore Book (simple wiki)
└── Threads (project discussions)

PHASE 3 — "The Hearth" (Community)
├── Chapter reactions (emotional responses)
├── Enhanced marginalia (shared annotation layer)
├── Story Jams
└── Notification system (email + in-app)
```

---

*This is a living document. Update as decisions are made and assumptions are tested.*
