# Editor's Desk and Story Intelligence - Implementation Guide

## Overview

Quiloria uses AI as private editorial support, not as the author of the work.
Editor’s Desk handles selected-text polish and review. Story Intelligence uses
cached artifacts, such as chapter summaries and continuity reports, so future
features do not need to re-read a full manuscript on every request.

---

## What's Implemented

### 1. Backend Infrastructure

**Files Created:**
- `/src/server/services/ai.ts` - AI service layer with Anthropic integration
- `/src/app/api/ai/assist/route.ts` - API endpoint with tier checks and rate limiting
- Daily usage reset added to `/src/app/api/cron/route.ts`

**Features:**
- Anthropic Claude integration
- 11 different AI prompt types
- Subscription tier enforcement (Free: limited editorial taste, Pro: 50/day, Premium: cached reports)
- Daily usage tracking and reset at midnight
- Story Bible context integration
- Premium-only features (plot holes, continuity, pacing, character arc)
- Story Intelligence artifact table for cached summaries, timelines, and reports

### 2. Frontend Components

**File Created:**
- `/src/components/editor/AIAssistantPanel.tsx` - Editor’s Desk panel with:
  - Prompt type selection
  - Usage stats display
  - Desk-note preview with apply/reject
  - Upgrade prompts for free users
  - Premium feature upsells

### 3. Environment Setup

**Added to `.env.example`:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Updated:**
- `/src/server/env.ts` - Environment variable validation
- Real provider keys must stay out of source control and docs.

### 4. Database Schema

Already exists in `/src/server/db/schema.ts`:
```typescript
users.aiRequestsThisMonth - Counter for current usage
users.aiRequestsResetAt - Next reset timestamp
users.subscriptionTier - 'free' | 'pro' | 'premium'
storyIntelligenceArtifacts - Cached chapter/story summaries and reports
```

---

## AI Features by Tier

### Free Tier - Limited Taste

- Fix Grammar only
- Lifetime quota controlled by `FREE_AI_LIFETIME_GENERATIONS`

### Pro Tier ($9.99/month) - 50 requests/day

**Editor’s Desk:**
- ✅ Explore Next Beat - Private brainstorming draft, not automatic prose
- ✅ Rephrase - Improve clarity and flow
- ✅ Expand - Add detail and depth
- ✅ Summarize - Create concise summary
- ✅ Fix Grammar - Correct errors
- ✅ Improve Dialogue - Enhance conversations
- ✅ Enhance Description - Add sensory details

### Premium Tier ($29.99/month)

**All Pro features PLUS cached Story Intelligence:**
- ✨ Plot Hole Detection - Find inconsistencies
- ✨ Continuity Check - Track character/timeline errors
- ✨ Pacing Analysis - Identify rushed/slow sections
- ✨ Character Arc Analysis - Monitor character development

---

## API Endpoints

### `POST /api/ai/assist`

Generate an Editor’s Desk suggestion or story review note.

**Request:**
```typescript
{
  promptType: "continue" | "rephrase" | "expand" | ...,
  context: string,              // Surrounding text
  selectedText?: string,         // Text to transform (for rephrase, expand, etc.)
  storyId?: string              // Optional for Story Bible context
}
```

**Response (Success):**
```typescript
{
  suggestion: string,
  tokensUsed: number,
  usage: {
    current: number,            // Current usage count
    limit: number | null,       // Daily limit
    remaining: number | null,   // Requests left today
    resetAt: Date              // When counter resets
  }
}
```

**Response (Free User Without Access):**
```typescript
{
  error: {
    code: "SUBSCRIPTION_REQUIRED",
    message: "This AI feature requires a Pro or Premium subscription",
    upgradeUrl: "/pricing"
  }
}
```

**Response (Pro User hitting limit):**
```typescript
{
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Daily AI limit reached (50 requests). Resets at midnight.",
    upgradeUrl: "/pricing",
    remainingRequests: 0,
    resetAt: Date
  }
}
```

**Response (Premium Required):**
```typescript
{
  error: {
    code: "PREMIUM_REQUIRED",
    message: "This AI feature requires a Premium subscription",
    upgradeUrl: "/pricing"
  }
}
```

### `GET /api/ai/assist`

Get current AI usage stats.

**Response:**
```typescript
{
  tier: "free" | "pro" | "premium",
  usage: {
    current: number,
    limit: number | null,
    remaining: number | null,
    resetAt: Date
  },
  hasAccess: boolean
}
```

---

## How to Integrate into Editor

### Option 1: Add to ToolkitPanel

Edit `/src/components/editor/ToolkitPanel.tsx`:

1. Add to props:
```typescript
interface ToolkitPanelProps {
  // ... existing props
  onOpenEditorDesk: () => void;
}
```

2. Add to writing tools array:
```typescript
const writingTools: ToolCard[] = [
  // ... existing tools
  {
    label: "Editor’s Desk",
    description: "Private editorial checks and story notes",
    icon: <span className="text-xl">✨</span>,
    badge: aiUsage ? `${aiUsage.remaining || 0} left` : "Locked",
    onClick: onOpenEditorDesk,
  },
];
```

### Option 2: Add Button to StatusBar

Edit `/src/components/editor/StatusBar.tsx`:

1. Add AI usage state:
```typescript
const [aiUsage, setAIUsage] = useState<{remaining: number | null} | null>(null);

useEffect(() => {
  fetch('/api/ai/assist')
    .then(res => res.json())
    .then(data => setAIUsage(data.usage));
}, []);
```

2. Add button:
```typescript
<button
  onClick={onOpenEditorDesk}
  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface/50"
  title="Editor’s Desk"
>
  <span className="text-gold">✨</span>
  {aiUsage?.remaining !== null && (
    <span className="text-xs text-text-ghost">{aiUsage.remaining}</span>
  )}
</button>
```

### Option 3: Add to Main Editor Page

Edit `/src/app/write/[storyId]/page.tsx`:

1. Import the component:
```typescript
import AIAssistantPanel from "@/components/editor/AIAssistantPanel";
```

2. Add state:
```typescript
const [showAIAssistant, setShowAIAssistant] = useState(false);
```

3. Add handler to get selected text:
```typescript
const handleOpenEditorDesk = () => {
  const editor = editorRef.current;
  if (!editor) return;

  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to);

  setShowAIAssistant(true);
};

const handleAIAccept = (suggestion: string) => {
  const editor = editorRef.current;
  if (!editor) return;

  const { from } = editor.state.selection;
  editor.chain().focus().insertContentAt(from, suggestion).run();
  setShowAIAssistant(false);
};
```

4. Add to JSX:
```typescript
{showAIAssistant && (
  <AIAssistantPanel
    storyId={params.storyId}
    selectedText={/* get from editor */}
    context={activeChapter?.content || ''}
    onAccept={handleAIAccept}
    onClose={() => setShowAIAssistant(false)}
  />
)}
```

5. Add keyboard shortcut (Cmd/Ctrl+K):
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handleOpenEditorDesk();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Setup Instructions

### 1. Configure Anthropic API Key

Add an Anthropic key to your local and production environments:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Never commit a real provider key. Rotate any key that appears in source,
documentation, logs, or chat.

### 2. Configure Cron Job

Set up a daily cron job to reset usage counters:

**Vercel Cron (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 0 * * *"
  }]
}
```

**Or GitHub Actions (`.github/workflows/cron.yml`):**
```yaml
name: Daily Cron
on:
  schedule:
    - cron: '0 0 * * *'  # Midnight UTC
jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: |
          curl -X POST https://your-domain.com/api/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 3. Add CRON_SECRET Environment Variable

```bash
# .env.local
CRON_SECRET=your-random-secret-here
```

---

## Cost Monitoring

Anthropic bills per token, and model pricing can change. Check current provider
pricing before setting production quotas or plan margins.

Recommended posture for a writing platform: frame AI as optional editorial
support for critique, continuity, organization, and light polish. Avoid making
generative continuation the core value proposition.

---

## Testing

### Test with curl:

```bash
# Get usage stats
curl http://localhost:3000/api/ai/assist \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Generate AI assistance
curl -X POST http://localhost:3000/api/ai/assist \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "promptType": "continue",
    "context": "The old wizard peered into the crystal ball, his eyes widening at what he saw.",
    "storyId": "your-story-id"
  }'
```

### Test upgrade flows:

1. **Free user:** Should only access the limited free `Fix Grammar` taste while quota remains
2. **Pro user (under limit):** Should get suggestion + updated usage count
3. **Pro user (at limit):** Should see rate limit error with upgrade prompt
4. **Premium user:** Should get unlimited suggestions

### Test Premium features:

```bash
curl -X POST http://localhost:3000/api/ai/assist \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_PREMIUM_SESSION" \
  -d '{
    "promptType": "plot-holes",
    "context": "Full story text here...",
    "storyId": "your-story-id"
  }'
```

---

## Next Steps

1. ✅ Backend complete
2. ✅ UI component complete
3. ⏳ Choose integration point (ToolkitPanel, StatusBar, or keyboard shortcut)
4. ⏳ Add `ANTHROPIC_API_KEY` to environment
5. ⏳ Test with different subscription tiers
6. ⏳ Monitor costs and adjust limits if needed

---

## Monitoring

Track AI usage in your database:

```sql
-- Top AI users
SELECT
  u.email,
  u.subscription_tier,
  u.ai_requests_this_month,
  u.ai_requests_reset_at
FROM users u
WHERE u.subscription_tier != 'free'
ORDER BY u.ai_requests_this_month DESC
LIMIT 10;

-- Daily AI usage stats
SELECT
  subscription_tier,
  COUNT(*) as user_count,
  AVG(ai_requests_this_month) as avg_requests,
  SUM(ai_requests_this_month) as total_requests
FROM users
WHERE subscription_tier != 'free'
GROUP BY subscription_tier;
```

---

## Future Enhancements

- [ ] Add cached chapter health checks
- [ ] Build Story Intelligence artifacts after meaningful chapter saves
- [ ] Add "Ask my story" over cached summaries and story-bible entries
- [ ] Track which features users use most
- [ ] A/B test prompt templates
- [ ] Generate chapter summaries asynchronously
- [ ] Synthesize reader feedback for creators
