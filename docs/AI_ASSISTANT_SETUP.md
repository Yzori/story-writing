# Editor's Desk Setup Checklist

## ✅ What's Already Done

Editor’s Desk is implemented as a private editorial tool:
- ✅ Backend API with Anthropic integration
- ✅ Subscription tier enforcement (Free/Pro/Premium)
- ✅ Usage tracking (50/day for Pro, cached reports for Premium)
- ✅ UI component for private editorial checks
- ✅ Editor integration (Cmd/Shift+K keyboard shortcut)
- ✅ Command Palette integration
- ✅ Daily usage reset in cron job
- ✅ Story Bible context integration
- ✅ All code committed to git

## 🔧 What You Need to Do

### 1. Configure an Anthropic API Key

Add an Anthropic API key to your local and production environments:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Never commit a real provider key to the repository. If a key is exposed in docs,
chat, logs, or git history, rotate it in the provider console before using AI
features again.

**Cost:** Anthropic bills per token. Check current Anthropic pricing before
setting production quotas, because model pricing changes over time.

**Product posture:** AI should be framed as an optional editorial assistant:
continuity checks, critique, organization, and light polish. Avoid presenting it
as the author of the work.

### 2. Set Up Daily Usage Reset (Optional but Recommended)

The AI usage counter needs to reset at midnight daily. You have two options:

#### Option A: Vercel Cron (If deploying to Vercel)

Create `vercel.json` in project root:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 0 * * *"
  }]
}
```

Add `CRON_SECRET` to your environment:
```bash
# In Vercel dashboard or .env.local
CRON_SECRET=your-random-secret-here
```

#### Option B: GitHub Actions (Works anywhere)

Create `.github/workflows/daily-cron.yml`:

```yaml
name: Daily Cron Job
on:
  schedule:
    - cron: '0 0 * * *'  # Midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  reset-ai-usage:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: |
          curl -X POST https://your-production-url.com/api/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -f || exit 1
```

Add `CRON_SECRET` to GitHub repository secrets.

#### Option C: Manual Testing (Development only)

For testing, you can manually call the endpoint:

```bash
# Test locally
curl -X POST http://localhost:3000/api/cron \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

**Note:** If you don't set up the cron job, Pro users will only get their counter reset when:
- They hit the limit and it checks if reset is needed
- The next request after midnight

This still works, but is less clean than a proper cron job.

### 3. Test Editor's Desk

#### Test with Free Tier User:

1. Open editor: `http://localhost:3000/write/[story-id]`
2. Press `Cmd/Shift+K` (or `Ctrl/Shift+K` on Windows)
3. **Expected:** Should see a limited free grammar-polish allowance, if
   free polish passes remain.
4. Exhausted free users should see the upgrade prompt and `/pricing` link.

#### Test with Pro Tier User:

1. Update a user to Pro tier in database:
```sql
UPDATE users
SET subscription_tier = 'pro',
    ai_requests_this_month = 0,
    ai_requests_reset_at = NOW() + INTERVAL '1 day'
WHERE email = 'your-test-email@example.com';
```

2. Open editor and press `Cmd/Shift+K`
3. **Expected:** Should see "50 of 50 requests remaining today"
4. Select some text, choose "Rephrase", click "Generate"
5. **Expected:** Should get AI suggestion if `ANTHROPIC_API_KEY` is configured.
6. **Expected:** Counter updates to "49 of 50 requests remaining today"

#### Test with Premium Tier User:

1. Update user to Premium:
```sql
UPDATE users
SET subscription_tier = 'premium'
WHERE email = 'your-test-email@example.com';
```

2. Open editor and press `Cmd/Shift+K`
3. **Expected:** Should see the Premium Story Intelligence state
4. **Expected:** Can access Premium-only features:
   - Plot Hole Detection
   - Continuity Check
   - Pacing Analysis
   - Character Arc Analysis

#### Test Usage Limit:

1. As Pro user, make 50 AI requests (or manually set):
```sql
UPDATE users
SET ai_requests_this_month = 50
WHERE email = 'your-test-email@example.com';
```

2. Try to use Editor’s Desk
3. **Expected:** Error message "Daily AI limit reached (50 requests). Resets at midnight."
4. **Expected:** Shows "Upgrade to Premium" link

#### Test Daily Reset:

1. Call the cron endpoint:
```bash
curl -X POST http://localhost:3000/api/cron \
  -H "Authorization: Bearer your-cron-secret"
```

2. **Expected Response:**
```json
{
  "timestamp": "2025-04-12T00:00:00.000Z",
  "renewals": { "renewed": 0, "lapsed": 0, "errors": 0 },
  "autoComplete": { "completed": 0, "errors": 0 },
  "aiReset": { "reset": 5, "errors": 0 }
}
```

3. Check database:
```sql
SELECT email, ai_requests_this_month, ai_requests_reset_at
FROM users
WHERE subscription_tier != 'free';
```

**Expected:** All users should have `ai_requests_this_month = 0`

## 🐛 Troubleshooting

### "AI service is not configured" error

**Cause:** ANTHROPIC_API_KEY is missing or invalid

**Fix:**
1. Check `.env.local` has `ANTHROPIC_API_KEY=sk-ant-...`
2. Restart dev server
3. Check Anthropic Console (https://console.anthropic.com) to ensure key is active

### "Not enough Ink Drops" error (even though testing AI)

**Cause:** This error is for Ink Drops currency, not AI requests. Wrong error.

**Fix:** This shouldn't happen with AI requests. If you see this, there's a bug. AI requests are separate from Ink Drops.

### Usage counter doesn't reset

**Cause:** Cron job not running or CRON_SECRET mismatch

**Fix:**
1. Manually call `/api/cron` endpoint
2. Check cron job logs
3. Verify CRON_SECRET matches

### Pro users see Premium copy

**Cause:** Database has wrong tier

**Fix:**
```sql
UPDATE users SET subscription_tier = 'pro' WHERE email = 'user@example.com';
```

### Premium features show "Upgrade to Premium"

**Cause:** User tier is 'pro' not 'premium'

**Fix:**
```sql
UPDATE users SET subscription_tier = 'premium' WHERE email = 'user@example.com';
```

## 📊 Monitoring AI Usage

Track AI costs and usage:

```sql
-- Top AI users
SELECT
  email,
  subscription_tier,
  ai_requests_this_month,
  ai_requests_reset_at
FROM users
WHERE subscription_tier != 'free'
ORDER BY ai_requests_this_month DESC
LIMIT 20;

-- Daily AI stats
SELECT
  subscription_tier,
  COUNT(*) as user_count,
  AVG(ai_requests_this_month) as avg_requests,
  SUM(ai_requests_this_month) as total_requests
FROM users
WHERE subscription_tier != 'free'
GROUP BY subscription_tier;

-- Estimated daily costs
SELECT
  SUM(ai_requests_this_month) * 0.00045 as estimated_cost_usd
FROM users
WHERE subscription_tier != 'free';
```

## 🚀 Ready to Use!

Once you've added the `ANTHROPIC_API_KEY`, Editor’s Desk is functional:

1. ✅ Open editor
2. ✅ Press `Cmd/Shift+K` (or search "Editor’s Desk" in Command Palette)
3. ✅ Select a prompt type
4. ✅ Click "Generate"
5. ✅ Apply or reject the desk note

**That's it!** The feature is production-ready.

## 💡 Tips

- **Start with Pro tier** for testing (50 requests/day is plenty)
- **Monitor costs** via the Anthropic dashboard
- **Set up billing alerts** in Anthropic to avoid surprises
- **Prefer cached Story Intelligence artifacts** over full-manuscript checks
- **Story Bible context** automatically includes character names from the Story Bible for better suggestions

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Free users get grammar-polish only while quota remains
- ✅ Pro users see usage counter (X/50)
- ✅ Premium users see Story Intelligence report access
- ✅ Suggestions generate within 3-5 seconds
- ✅ Usage counter increments after each request
- ✅ Pro users hit limit at 50 requests
- ✅ Counter resets at midnight (if cron configured)

**The feature is ready once `ANTHROPIC_API_KEY` is configured.**
