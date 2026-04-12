# AI Assistant Setup Checklist

## ✅ What's Already Done

The AI Writing Assistant is **fully implemented** and integrated:
- ✅ Backend API with **Claude 3.5 Sonnet** integration (Anthropic)
- ✅ Subscription tier enforcement (Free/Pro/Premium)
- ✅ Usage tracking (50/day for Pro, unlimited for Premium)
- ✅ UI component with beautiful modal
- ✅ Editor integration (Cmd/Shift+K keyboard shortcut)
- ✅ Command Palette integration
- ✅ Daily usage reset in cron job
- ✅ Story Bible context integration
- ✅ All code committed to git

## 🔧 What You Need to Do

### 1. ✅ Anthropic API Key Already Configured!

**Good news:** Your Anthropic API key is already in `.env.local`!

```bash
ANTHROPIC_API_KEY=sk-ant-...REDACTED
```

**The AI Assistant is ready to use right now!** Just press `Cmd/Shift+K` in the editor.

**Cost:** Anthropic bills per token. With Claude 3.5 Sonnet:
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- **~$0.0048 per AI request** (avg 1000 input + 500 output tokens)
- Pro user (50 req/day): **~$4.83/month**
- Your profit margin: **52%** ($9.99 revenue - $4.83 cost)

**Why Claude over OpenAI?**
- ✨ **Superior creative writing** - More natural, literary prose
- ✨ **Better voice matching** - Maintains author's style and tone
- ✨ **Longer context** - 200K tokens vs GPT-4o-mini's 128K
- ✨ **Nuanced storytelling** - Better at character development and emotional depth

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

### 3. Test the AI Assistant

#### Test with Free Tier User:

1. Open editor: `http://localhost:3000/write/[story-id]`
2. Press `Cmd/Shift+K` (or `Ctrl/Shift+K` on Windows)
3. **Expected:** Should see "AI Features Locked" message with "View Plans" button
4. Click "View Plans" → Should redirect to `/pricing`

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
5. **Expected:** Should get AI suggestion (if OPENAI_API_KEY is configured)
6. **Expected:** Counter updates to "49 of 50 requests remaining today"

#### Test with Premium Tier User:

1. Update user to Premium:
```sql
UPDATE users
SET subscription_tier = 'premium'
WHERE email = 'your-test-email@example.com';
```

2. Open editor and press `Cmd/Shift+K`
3. **Expected:** Should see "Unlimited AI • Premium" badge
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

2. Try to use AI Assistant
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

### Pro users see "Unlimited AI"

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

Once you've added the `OPENAI_API_KEY`, the AI Assistant is fully functional:

1. ✅ Open editor
2. ✅ Press `Cmd/Shift+K` (or search "AI" in Command Palette)
3. ✅ Select a prompt type
4. ✅ Click "Generate"
5. ✅ Accept or reject the suggestion

**That's it!** The feature is production-ready.

## 💡 Tips

- **Start with Pro tier** for testing (50 requests/day is plenty)
- **Monitor costs** via OpenAI dashboard
- **Set up billing alerts** in OpenAI to avoid surprises
- **Use GPT-4o-mini** (default) for Pro, can upgrade to GPT-4o for Premium later
- **Story Bible context** automatically includes character names from the Story Bible for better suggestions

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Free users see upgrade prompt
- ✅ Pro users see usage counter (X/50)
- ✅ Premium users see "Unlimited AI" badge
- ✅ Suggestions generate within 3-5 seconds
- ✅ Usage counter increments after each request
- ✅ Pro users hit limit at 50 requests
- ✅ Counter resets at midnight (if cron configured)

**The feature is ready — just add your OpenAI API key!**
