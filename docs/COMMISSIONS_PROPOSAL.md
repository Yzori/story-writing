# Workflow 3: Commissions & Creative Services — "The Scriptorium"

**Version:** 1.0
**Date:** 2026-03-29
**Status:** Proposal

---

## 1. Concept & Naming

The commission system is called **The Scriptorium** — a medieval workshop where skilled artisans produced manuscripts on commission. Language throughout uses craft metaphors:

| Generic Term | Quiloria Term |
|---|---|
| Gig / Service listing | **Offering** |
| Freelancer | **Artisan** |
| Client / Buyer | **Patron** |
| Order / Purchase | **Commission** |
| Storefront / Profile | **Studio** |
| Review | **Testimonial** |
| Dispute | **Arbitration** |
| Escrow hold | **Vault** |
| Service category | **Craft** |

This is not Fiverr with a literary skin. The distinction: every commission on Quiloria is tied to a creative work. You are not buying "500 words of content" — you are commissioning a chapter for your saga, cover art for your anthology, or a worldbuilding consultation for your campaign. The story is always the center of gravity.

---

## 2. Service Categories (Crafts)

### 2.1 Writing Crafts

| Craft | Description | Typical Deliverable | Format Tie-in |
|---|---|---|---|
| **Custom Chapter** | Commission a chapter or short story written to your brief, in your story's universe | Text delivered as a chapter draft in the patron's story | Novel, Poetry |
| **Ghostwriting** | Full story or multi-chapter arc written to spec | Delivered as a private story transferred to patron | Novel |
| **Poetry on Commission** | Occasion-specific poems — weddings, memorials, birthdays, love letters | Standalone text delivered via commission thread | Poetry |
| **Screenplay Coverage** | Professional feedback on a screenplay: structure, dialogue, pacing notes | Structured review document in commission thread | Screenplay |
| **Editing Pass** | Line editing, copy editing, or developmental editing of existing chapters | Suggestion-based edits using the existing suggestion system | All text formats |

### 2.2 Visual Crafts

| Craft | Description | Typical Deliverable | Format Tie-in |
|---|---|---|---|
| **Cover Art** | Story cover illustration or typography design | Image file uploaded to commission thread | All |
| **Character Art** | Character portraits, reference sheets, concept art | Image file(s) | All, especially Campaign |
| **Webtoon Panels** | Commission individual panels or full episode art | Panels delivered directly into patron's webtoon chapter | Webtoon |
| **Scene Illustration** | Interior illustrations for novel chapters | Image file linked to specific chapter | Novel, Illustrated |

### 2.3 Craft Services

| Craft | Description | Typical Deliverable | Format Tie-in |
|---|---|---|---|
| **Worldbuilding Consultation** | Lore development, magic systems, geography, history | Lore entries added to story's Lore Book | All, especially Campaign |
| **Editing & Proofreading** | Grammar, style, consistency review | Suggestion entries on specific chapters | All text formats |
| **GM for Hire** | Run a campaign session or one-shot adventure for a group | Live campaign session | Campaign |
| **Story Bible Assembly** | Organize and build out a comprehensive story bible | Bible entries added to story | Novel, Screenplay |

### 2.4 Gift Commissions

A distinct flow: any Craft can be commissioned *as a gift for someone else*. The patron specifies a recipient, the deliverable is wrapped and sent as a surprise notification.

Use case: "Commission a poem for my partner's birthday and deliver it to their Quiloria inbox on March 15."

---

## 3. Commission Flow

### 3.1 Lifecycle States

```
                                    ┌──────────┐
                                    │ CANCELED  │
                                    └─────▲─────┘
                                          │ (either party, before accepted)
                                          │
┌──────────┐    ┌──────────┐    ┌─────────┴┐    ┌───────────┐    ┌──────────┐
│ REQUESTED ├───►│  QUOTED  ├───►│ ACCEPTED │───►│ DELIVERED │───►│ COMPLETE │
└──────────┘    └──────────┘    └──────────┘    └───────────┘    └──────────┘
                      │                │               │               │
                      │                │               ▼               │
                      │                │         ┌───────────┐         │
                      │                │         │  REVISION  │        │
                      │                │         │ REQUESTED  ├────┐   │
                      │                │         └───────────┘    │   │
                      │                │               ▲          │   │
                      │                │               └──────────┘   │
                      │                │          (up to N revisions) │
                      │                │                              │
                      │                ▼                              │
                      │          ┌───────────┐                       │
                      └─────────►│ DECLINED  │                       │
                                 └───────────┘                       │
                                                                     │
                                                              ┌──────▼──────┐
                                                              │ ARBITRATION │
                                                              └─────────────┘
```

### 3.2 Step-by-Step Flow

**Step 1 — Request** (Patron initiates)
- Patron visits an artisan's Studio or clicks "Commission" on a specific Offering
- Fills out a brief: what they want, which story it's for (optional), deadline preference, reference materials
- Can attach files (images, text excerpts, mood boards)
- No money changes hands yet

**Step 2 — Quote** (Artisan responds)
- Artisan reviews the brief and responds with:
  - Price in Ink Drops (within their Offering's stated range, or custom)
  - Estimated delivery time
  - Number of revision rounds included (default: 2)
  - Scope clarifications or counter-proposals
- Artisan can also decline with a reason

**Step 3 — Accept** (Patron commits)
- Patron reviews the quote and accepts
- Ink Drops are deducted from patron's balance and placed in **Vault** (escrow)
- Both parties see a confirmation with the agreed terms
- Commission thread opens for ongoing communication

**Step 4 — Work & Deliver** (Artisan creates)
- Artisan works on the commission, can send progress updates in the thread
- When ready, artisan marks the commission as "Delivered" and attaches the deliverable
- For integrated deliverables (chapters, panels, lore entries), the artisan delivers directly into the patron's story as a draft

**Step 5 — Review & Complete** (Patron accepts)
- Patron reviews the delivery
- Three options:
  - **Accept** — Ink Drops release from Vault to artisan. Patron can leave a testimonial.
  - **Request Revision** — Sends back with notes. Uses one of the included revision rounds.
  - **Raise Arbitration** — If the work fundamentally doesn't match the brief. See Section 7.

**Step 6 — Testimonial** (Optional)
- After completion, patron can leave a rating (1-5 quills) and written testimonial
- Artisan can respond publicly to the testimonial

### 3.3 Auto-Complete Timer

If a patron does not respond within **7 days** of delivery, the commission auto-completes and Ink Drops are released to the artisan. A reminder notification is sent at day 3 and day 6.

### 3.4 Cancellation Rules

| State | Who can cancel | Consequence |
|---|---|---|
| Requested | Either party | No penalty |
| Quoted | Either party | No penalty |
| Accepted (work not started) | Patron | Full refund from Vault |
| Accepted (work started) | Patron | 50% refund, 50% to artisan (for time spent) |
| Accepted | Artisan | Full refund to patron, cancellation noted on artisan profile |
| Delivered | Neither | Must use revision or arbitration flow |

---

## 4. The Vault (Escrow System)

### 4.1 How It Works

The Vault is a ledger-based escrow system using the existing `inkDropTransactions` table with new transaction types.

When a patron accepts a quote:
1. Patron's `inkDropBalance` is decremented by the commission price
2. An `inkDropTransactions` record is created with type `commission-escrow`
3. The commission record references this transaction

When the commission completes:
1. Artisan's `inkDropBalance` is incremented by (price minus platform cut)
2. A `commission-release` transaction is created for the artisan
3. A `commission-fee` transaction records the platform's cut

### 4.2 New Transaction Types

Added to `inkDropTransactions.type`:

| Type | Description |
|---|---|
| `commission-escrow` | Patron's drops held in vault |
| `commission-release` | Drops released to artisan on completion |
| `commission-fee` | Platform's percentage cut |
| `commission-refund` | Drops returned to patron on cancellation |
| `commission-partial-refund` | Partial refund (late cancellation) |

### 4.3 Balance Visibility

- Patron sees: "Your balance: 1,200 drops (340 in Vault)" — so they know what's committed
- Artisan sees: "Pending earnings: 850 drops" — so they know what's coming

No new column needed on `users` — vault balance is computed from open `commission-escrow` transactions that haven't been released or refunded.

---

## 5. Pricing Structure

### 5.1 Creator-Set Pricing in Ink Drops

All commission prices are denominated in Ink Drops. This is intentional:
- Keeps the platform's virtual currency as the unit of exchange
- Avoids turning Quiloria into a payment processor for real-money freelance work
- Makes commissioning feel like an in-platform interaction, not a business transaction
- Simplifies tax/regulatory burden (platform sells drops; drops are spent internally)

### 5.2 Offering Price Ranges

Artisans set a **minimum** and **maximum** price per Offering. The actual price is set in the Quote step, within or near this range.

Suggested reference ranges (artisans can set whatever they want):

| Craft | Suggested Min | Suggested Max | Real-$ Equivalent |
|---|---|---|---|
| Custom Chapter (1k-3k words) | 100 drops | 500 drops | $0.70 - $3.50 |
| Poetry on Commission | 50 drops | 300 drops | $0.35 - $2.10 |
| Cover Art | 200 drops | 1,500 drops | $1.40 - $10.50 |
| Character Art | 150 drops | 1,000 drops | $1.05 - $7.00 |
| Webtoon Panels (per panel) | 100 drops | 500 drops | $0.70 - $3.50 |
| Editing Pass (per chapter) | 75 drops | 400 drops | $0.53 - $2.80 |
| Worldbuilding Consultation | 100 drops | 600 drops | $0.70 - $4.20 |
| GM for Hire (per session) | 200 drops | 1,000 drops | $1.40 - $7.00 |
| Story Bible Assembly | 150 drops | 800 drops | $1.05 - $5.60 |
| Screenplay Coverage | 100 drops | 500 drops | $0.70 - $3.50 |

Note: These are intentionally modest. This is a community marketplace for creative hobbyists, not a professional freelance market. The value proposition is creative collaboration and community engagement, not income replacement.

### 5.3 Platform Cut

**15% on all commissions.**

- Covers escrow infrastructure, dispute resolution, and platform maintenance
- Deducted at release time, not at escrow time (so refunds are always full amount)
- Displayed transparently: artisan sees "You'll receive 425 drops (500 minus 75 platform fee)" before accepting a commission request

Comparison: Fiverr takes 20%. Etsy takes 6.5% + payment processing. Ko-fi takes 0% (but has no escrow). 15% is competitive for a platform that provides escrow, dispute resolution, and an integrated creative workspace.

### 5.4 Future: Real-Money Cashout

Not in MVP. But the architecture should support a future where artisans can cash out Ink Drops to real money via Stripe Connect. This means:
- Keep clean transaction records with types
- Track platform fees separately
- Maintain an audit trail for every drop movement

---

## 6. The Studio (Artisan Storefront)

### 6.1 Relationship to Existing Profile

The Studio is an extension of the existing Guild Profile (`guildProfiles` table), not a separate entity. The Guild Profile already tracks:
- `roles` (writer, illustrator, editor, worldbuilder)
- `genres` (preferred genres)
- `availability` (open, selective, busy, unavailable)
- `tagline`, `portfolioLinks`, `showcaseStoryIds`
- `yearsWriting`, `lookingFor`

The Studio adds a "Commissions" tab to the creator's public profile page, listing their active Offerings.

### 6.2 Studio Components

**Offerings Grid** — Cards showing each service the artisan provides:
- Craft type (with icon)
- Title (artisan-written, e.g., "Dark Fantasy Cover Illustrations")
- Description
- Price range
- Estimated turnaround
- Sample work thumbnails (pulled from portfolio or attached directly)
- Availability indicator (accepting / waitlisted / closed)

**Testimonials Section** — Aggregated ratings and recent reviews across all Offerings.

**Commission Queue Indicator** — "Currently working on 3 commissions" — sets expectations for turnaround.

### 6.3 Discoverability

**Scriptorium Browse Page** (`/scriptorium`)
- Browse all Offerings across the platform
- Filter by: Craft type, genre, price range, turnaround time, artisan role
- Sort by: rating, price, recently active, completion count
- Search by keyword

**Profile Integration** — The artisan's profile shows a "Visit Studio" link when they have active Offerings.

**Story Page Integration** — On a story page, if the story needs collaborators (has open calls), a sidebar section says "Looking for an illustrator? Browse the Scriptorium" with links to relevant Offerings.

---

## 7. Testimonials & Trust

### 7.1 Rating System

After commission completion, the patron rates the artisan:

- **Overall: 1-5 Quills** (displayed as feather quill icons)
- **Tags** (optional, select from predefined list):
  - "Exceeded expectations"
  - "Great communication"
  - "Fast delivery"
  - "True to brief"
  - "Beautiful craft"
  - "Would commission again"

The artisan can also rate the patron (visible only to other artisans considering commissions from that patron):
- **Patron rating: 1-5** (private, visible to artisans only)
- Tags: "Clear brief," "Respectful," "Prompt reviewer," "Reasonable expectations"

### 7.2 Trust Signals

Displayed on the artisan's Studio and Offering cards:

| Signal | How Earned |
|---|---|
| **Completion Rate** | % of accepted commissions delivered (e.g., "98% completion") |
| **Average Rating** | Mean quill rating across all testimonials |
| **Commission Count** | Total completed commissions |
| **Response Time** | Median time to first response on new requests |
| **Member Since** | Account age |
| **Verified Creator** | Has published stories with 10+ sparks (proves active community member) |

### 7.3 Review Integrity

- Testimonials can only be left after a commission reaches COMPLETE status
- One testimonial per commission (no edit, but patron can append a follow-up)
- Artisan can publicly reply to any testimonial (one reply per testimonial)
- Flagging system: testimonials can be flagged using existing `flags` table
- No deletion by either party — only admin can remove abusive reviews

---

## 8. Dispute Resolution (Arbitration)

### 8.1 When Arbitration Triggers

A patron can raise arbitration only after delivery, if:
- The deliverable fundamentally doesn't match the agreed brief
- The artisan delivered placeholder/low-effort work
- The artisan ghosted after accepting (auto-triggered after 14 days of no activity)

An artisan can raise arbitration if:
- The patron is demanding work far beyond the agreed scope
- The patron refuses to accept despite work matching the brief

### 8.2 Arbitration Flow

1. **Filing** — The raising party explains the issue with evidence (screenshots, the commission thread)
2. **Response** — The other party has 72 hours to respond
3. **Resolution** — For MVP, arbitration is resolved by platform admin. Future: community arbitrators.
4. **Outcomes:**
   - Full release to artisan (work matches brief)
   - Full refund to patron (work doesn't match)
   - Partial release (e.g., 60% artisan / 40% refund — work was partially done)
   - Commission voided, both parties flagged (bad faith on both sides)

### 8.3 Prevention

Most disputes come from unclear briefs. The system helps prevent this:
- Commission request form has structured fields (not just free text)
- Quote response requires artisan to restate what they'll deliver
- Both parties must confirm scope before Vault lock
- Revision rounds exist specifically to handle "almost right" situations

---

## 9. Integration with Existing Systems

### 9.1 Collaboration System Bridge

The commission system and the collaboration system serve different needs but should interoperate:

| Collaboration System | Commission System |
|---|---|
| Ongoing relationship | One-off transaction |
| Collaborator is credited on the story | Artisan may or may not be credited |
| No payment | Ink Drop payment with escrow |
| Open Calls are public recruitment | Commissions are private requests |

**Bridge Feature:** When a commission completes, the patron can optionally invite the artisan as a collaborator on the story. The commission thread becomes part of the collaboration history.

**Open Call to Commission:** If someone responds to an Open Call, the story owner can convert the response into a paid commission. The pitch becomes the brief.

### 9.2 Campaign Integration

**GM for Hire** commissions integrate with the campaign system:
- The commission creates a campaign session placeholder
- The GM is added as a collaborator on the campaign story
- The session itself is the deliverable
- Spectators can tip during the session (separate from the commission payment)

### 9.3 Notification Integration

New notification types added to the existing system:

| Event | Recipient | Type |
|---|---|---|
| New commission request | Artisan | `commission` |
| Quote received | Patron | `commission` |
| Commission accepted (vault locked) | Artisan | `commission` |
| Delivery submitted | Patron | `commission` |
| Revision requested | Artisan | `commission` |
| Commission complete | Both | `commission` |
| Arbitration filed | Other party | `commission` |
| Auto-complete warning (day 3) | Patron | `commission` |
| Auto-complete warning (day 6) | Patron | `commission` |
| Auto-complete executed | Both | `commission` |

Email notifications enabled for `commission` type (added to `EMAIL_ENABLED_TYPES`).

### 9.4 Ink Drop Transaction Integration

All commission financial flows go through the existing `inkDropTransactions` table with the new types from Section 4.2. The creator earnings dashboard at `/creator/earnings` gains a new "Commissions" tab alongside the existing "Tips" view.

---

## 10. Data Model (New Tables)

### 10.1 `offerings` — Service Listings

```
offerings
├── id: uuid (PK)
├── userId: uuid (FK → users) — the artisan
├── craft: text — 'custom-chapter' | 'poetry' | 'cover-art' | 'character-art' |
│                  'webtoon-panels' | 'editing' | 'worldbuilding' | 'gm-for-hire' |
│                  'story-bible' | 'screenplay-coverage' | 'ghostwriting' | 'scene-illustration'
├── title: text — artisan-written title
├── description: text — rich description of the service
├── minPrice: integer — minimum Ink Drops
├── maxPrice: integer — maximum Ink Drops
├── turnaroundDays: integer — estimated delivery time
├── revisionsIncluded: integer — default revision rounds (default: 2)
├── sampleImages: text — JSON array of image URLs
├── genres: text[] — genres this offering covers
├── formats: text[] — story formats this applies to (novel, poetry, webtoon, etc.)
├── maxActiveCommissions: integer — queue limit (default: 5)
├── status: text — 'active' | 'paused' | 'archived'
├── completedCount: integer — cache of completed commissions
├── avgRating: integer — cache of average rating (stored as rating * 100 for precision)
├── createdAt: timestamp
├── updatedAt: timestamp
```

### 10.2 `commissions` — Individual Commission Orders

```
commissions
├── id: uuid (PK)
├── offeringId: uuid (FK → offerings) — which offering this is for
├── patronId: uuid (FK → users) — who's paying
├── artisanId: uuid (FK → users) — who's creating
├── storyId: uuid (FK → stories, nullable) — the story this is for, if any
├── status: text — 'requested' | 'quoted' | 'accepted' | 'delivered' |
│                   'revision-requested' | 'complete' | 'canceled' | 'declined' | 'arbitration'
├── brief: text — patron's description of what they want
├── briefAttachments: text — JSON array of file URLs
├── quotedPrice: integer (nullable) — Ink Drops quoted by artisan
├── quotedTurnaroundDays: integer (nullable)
├── quotedRevisions: integer (nullable) — revision rounds in this quote
├── revisionsUsed: integer — how many revisions have been used (default: 0)
├── quoteNote: text (nullable) — artisan's note with the quote
├── escrowTransactionId: uuid (FK → inkDropTransactions, nullable)
├── releaseTransactionId: uuid (FK → inkDropTransactions, nullable)
├── deliveryNote: text (nullable) — artisan's note on delivery
├── deliveryAttachments: text — JSON array of file URLs
├── isGift: boolean — whether this is a gift commission (default: false)
├── giftRecipientId: uuid (FK → users, nullable)
├── giftMessage: text (nullable)
├── giftDeliverAt: timestamp (nullable) — scheduled delivery for gifts
├── canceledBy: uuid (FK → users, nullable)
├── cancelReason: text (nullable)
├── completedAt: timestamp (nullable)
├── autoCompleteAt: timestamp (nullable) — set to now+7d on delivery
├── createdAt: timestamp
├── updatedAt: timestamp
```

### 10.3 `commission_messages` — Thread Communication

```
commission_messages
├── id: uuid (PK)
├── commissionId: uuid (FK → commissions)
├── userId: uuid (FK → users) — who sent this message
├── content: text
├── attachments: text — JSON array of file URLs
├── isSystemMessage: boolean — auto-generated status updates (default: false)
├── createdAt: timestamp
```

### 10.4 `commission_testimonials` — Reviews

```
commission_testimonials
├── id: uuid (PK)
├── commissionId: uuid (FK → commissions, unique)
├── patronId: uuid (FK → users)
├── artisanId: uuid (FK → users)
├── patronRating: integer — 1-5 quills (patron rates artisan)
├── patronTags: text[] — predefined positive tags
├── patronComment: text (nullable)
├── artisanRating: integer (nullable) — 1-5 (artisan rates patron, private)
├── artisanTags: text[] (nullable)
├── artisanReply: text (nullable) — public reply from artisan
├── createdAt: timestamp
├── updatedAt: timestamp
```

### 10.5 `arbitrations` — Dispute Records

```
arbitrations
├── id: uuid (PK)
├── commissionId: uuid (FK → commissions, unique)
├── filedBy: uuid (FK → users)
├── reason: text
├── evidence: text — JSON array of file URLs
├── respondentStatement: text (nullable)
├── resolution: text (nullable) — 'artisan-full' | 'patron-full' | 'partial' | 'voided'
├── resolutionNote: text (nullable)
├── resolvedBy: uuid (FK → users, nullable) — admin who resolved
├── artisanPayout: integer (nullable) — drops released to artisan
├── patronRefund: integer (nullable) — drops returned to patron
├── status: text — 'filed' | 'responded' | 'resolved'
├── respondByDeadline: timestamp — 72h from filing
├── createdAt: timestamp
├── resolvedAt: timestamp (nullable)
```

---

## 11. MVP Scope

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Artisans can create Offerings and patrons can browse them.

- Schema: `offerings` table + migration
- API: CRUD for offerings (create, read, update, archive)
- Validation: Zod schemas for offering creation/update
- UI: "Studio" tab on profile page with offering cards
- UI: `/scriptorium` browse page with filters
- Guild Profile integration: availability status controls offering visibility

### Phase 2: Commission Flow (Weeks 3-4)

**Goal:** Full request-to-complete lifecycle with escrow.

- Schema: `commissions`, `commission_messages` tables + migration
- API: Commission request, quote, accept, deliver, revision, complete, cancel
- Vault: Escrow lock/release/refund logic in `inkDropTransactions`
- UI: Commission request form (from offering page)
- UI: Commission thread page with message history
- UI: Artisan dashboard — incoming requests, active commissions, completed
- UI: Patron dashboard — my commissions (outgoing)
- Notifications: all commission lifecycle events
- Auto-complete: cron or check-on-read for 7-day auto-release

### Phase 3: Trust & Discovery (Weeks 5-6)

**Goal:** Testimonials, ratings, and improved discovery.

- Schema: `commission_testimonials` table + migration
- API: Create/read testimonials, artisan reply
- UI: Testimonial submission flow after completion
- UI: Rating display on offering cards and Studio
- UI: Scriptorium browse — sort by rating, completion count
- Trust signals: completion rate, response time calculations
- Cached stats: `completedCount` and `avgRating` on offerings (updated on completion)

### Phase 4: Arbitration & Polish (Week 7)

**Goal:** Dispute resolution and edge cases.

- Schema: `arbitrations` table + migration
- API: File arbitration, respond, resolve (admin)
- UI: Arbitration filing form
- Admin: Arbitration queue page
- Gift commissions: scheduled delivery flow
- Integration: Open Call to Commission conversion
- Integration: Post-commission collaborator invite

### Deferred (Post-MVP)

- Real-money cashout via Stripe Connect
- Community arbitrators (elected from high-reputation creators)
- Commission bundles ("Illustrate my entire 10-chapter webtoon" as a single commission with milestones)
- Repeat commission discounts (artisan can offer % off to returning patrons)
- Commission templates (pre-filled briefs for common requests)
- Scriptorium "Featured Artisan" spotlight (boosted with Ink Drops, like story boosts)

---

## 12. Key Design Decisions

### 12.1 Why Ink Drops Only (No Direct Real Money)

Keeping commissions in Ink Drops means:
- No need for Stripe Connect, 1099s, or payment splitting in MVP
- Platform already handles drop purchases via Stripe checkout
- Tax burden stays simple: Quiloria sells virtual currency; what users do with it is internal
- Lower friction: users already have drop balances from tipping
- Future cashout can be added without changing the commission flow

The trade-off: commissions are limited to hobbyist price points. This is by design. Quiloria is a creative community, not a freelance marketplace. If someone wants to charge $500 for cover art, they should use a real freelance platform and bring the result back to Quiloria.

### 12.2 Why the Auto-Complete Timer

Without auto-complete, artisans would be at the mercy of unresponsive patrons. The 7-day window (with reminders at day 3 and 6) balances:
- Giving patrons enough time to review
- Protecting artisans from indefinite escrow holds
- Creating urgency without pressure

### 12.3 Why Structured Briefs Over Free-Form

The number one source of commission disputes on every platform is mismatched expectations. Structured brief fields (what, for which story, deadline, references) force patrons to think through what they actually want, and give artisans concrete deliverables to quote against.

### 12.4 Why Revision Rounds Are Explicit

"Unlimited revisions" is a lie that destroys freelancer margins. Explicit revision counts:
- Set expectations upfront
- Let artisans price fairly (more revisions = higher price)
- Give the patron a clear path if they're not satisfied
- Create a natural escalation to arbitration if revisions are exhausted

### 12.5 Why Patron Ratings Are Private

If patron ratings were public, patrons would retaliate against artisans who rate them poorly. Private patron ratings (visible only to artisans) let the community quietly identify problematic patrons without creating conflict.

---

## 13. Platform Economics

### 13.1 Revenue Model

At 15% platform cut:
- A 500-drop commission generates 75 drops for the platform
- At ~$0.007/drop (Mega tier), that's roughly $0.53 per commission
- At scale (1,000 commissions/month), that's ~$530/month in platform revenue from commissions alone
- Plus increased Ink Drop purchases driven by commission demand

### 13.2 Flywheel Effect

```
More artisans listing offerings
         │
         ▼
More patrons buying Ink Drops to commission work
         │
         ▼
More Ink Drops circulating in the economy
         │
         ▼
More creators earning drops → spending on their own commissions
         │
         ▼
More artisans listing offerings (loop)
```

Commissions create a **demand sink** for Ink Drops that complements tips and boosts. Tips are voluntary and small. Boosts are self-serve. Commissions are the first feature where users *need* to buy drops to get something specific done. This is the strongest Ink Drop purchase driver.

---

## 14. What Makes This Different from Fiverr

| Aspect | Fiverr | Quiloria Scriptorium |
|---|---|---|
| **Context** | Generic services marketplace | Creative community where both parties are storytellers |
| **Deliverables** | Files exchanged outside any creative tool | Delivered directly into the patron's story (chapters, panels, lore entries) |
| **Currency** | Real money with complex payment splits | Ink Drops — simple, in-platform, low friction |
| **Price point** | $5-$10,000+ (professional services) | 50-1,500 drops (~$0.35-$10.50) — hobbyist/community pricing |
| **Relationship** | Transactional buyer-seller | Artisan-patron with optional upgrade to collaborator |
| **Discovery** | SEO-driven search | Community-driven: linked to stories, profiles, open calls |
| **Identity** | Freelancer brand | Creator identity already established through published work |
| **Trust** | Reviews from strangers | Testimonials from people whose stories you've read |
| **Vibe** | "Get your logo in 24 hours" | "Commission a master calligrapher to illuminate your manuscript" |

The key insight: on Quiloria, the artisan's published work IS their portfolio. You don't need a separate samples section when you can read their actual stories, see their webtoon art, or watch their campaign sessions. The platform itself is the proof of craft.

---

## 15. Open Questions

1. **File storage** — Commission attachments (briefs, deliverables) need a file upload system. Does the platform currently support file uploads beyond image URLs? If not, this is a prerequisite.

2. **Direct delivery into stories** — The "deliver a chapter directly into the patron's story" flow requires the artisan to have temporary write access to the patron's story. How does this interact with the collaboration permission model? Likely: commission acceptance auto-creates a temporary collaborator role scoped to the specific deliverable.

3. **Minimum balance requirement** — Should patrons need sufficient Ink Drops before they can even send a commission request? Or allow requests to go out freely and only require balance at acceptance time? Recommendation: require balance at acceptance, not at request. This avoids blocking exploratory conversations.

4. **Offering moderation** — Should offerings be reviewed before going live? For MVP, probably not. But flagging should be available from day one using the existing `flags` table.

5. **Commission visibility** — Should completed commissions be browsable? ("See what this artisan has made for others.") Only if both parties opt in. Default: private.
