# Subscription System Implementation

## Overview

A complete tiered subscription system has been implemented for the story platform, offering three tiers:

- **Free**: Basic writing and publishing, monetization via Ink Drops
- **Pro ($9.99/mo)**: Editor’s Desk editorial tools (50 requests/day), advanced analytics, exports, collaboration (up to 3 co-authors), priority support
- **Premium ($29.99/mo)**: Cached Story Intelligence reports, plot hole detection, unlimited collaboration, track changes, custom author website, professional marketplace access

## Architecture

### Database Schema

Added to `src/server/db/schema.ts`:

```typescript
// Subscription fields
subscriptionTier: text("subscription_tier").notNull().default("free")
subscriptionStatus: text("subscription_status").notNull().default("active")
stripeCustomerId: text("stripe_customer_id")
stripeSubscriptionId: text("stripe_subscription_id")
subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true })
trialEndsAt: timestamp("trial_ends_at", { withTimezone: true })

// AI usage tracking
aiRequestsThisMonth: integer("ai_requests_this_month").notNull().default(0)
aiRequestsResetAt: timestamp("ai_requests_reset_at", { withTimezone: true })
```

Migration: `drizzle/0012_subscription_tiers.sql`

### Stripe Integration

**File**: `src/server/stripe.ts`

Defines subscription plans with pricing, features, and AI request limits.

### Permission System

**File**: `src/server/permissions.ts`

Provides access control and usage tracking:

- `canUseAI(userId)` - Check if user can use AI features (respects tier limits)
- `incrementAIUsage(userId)` - Increment AI request counter
- `getFeatureAccess(tier)` - Get feature access flags for a tier
- `canExportFiles(userId)` - Check export permissions
- `canAccessPremiumFeature(userId, feature)` - Generic premium check

## API Routes

### POST /api/billing/subscribe

Creates Stripe Checkout session for new subscription.

**Request**: `{ tier: "pro" | "premium", interval: "monthly" | "yearly" }`
**Response**: `{ url: "https://checkout.stripe.com/..." }`

### POST /api/billing/cancel

Cancels subscription at end of billing period.

### POST /api/billing/portal

Redirects to Stripe Customer Portal for payment management.

### POST /api/webhooks/stripe

Handles Stripe webhook events:
- `checkout.session.completed` - Activate new subscription
- `customer.subscription.updated` - Handle plan changes
- `customer.subscription.deleted` - Downgrade to free
- `invoice.payment_succeeded` - Confirm recurring payment
- `invoice.payment_failed` - Mark subscription as past_due

## Frontend Components

### Feature Gating

```tsx
import { FeatureGate, useFeatureAccess } from "@/components/billing/FeatureGate";

// Wrapper component
<FeatureGate feature="Editor’s Desk" tier="pro">
  <AIButton />
</FeatureGate>

// Or use the hook
const hasProAccess = useFeatureAccess("pro");
```

### Upgrade Prompts

```tsx
import { UpgradePrompt, UpgradeBadge } from "@/components/billing/UpgradePrompt";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

// Inline banner
<UpgradePrompt feature="Editor’s Desk" tier="pro" inline />

// Full card
<UpgradePrompt feature="Editor’s Desk" tier="pro" />

// Modal
<UpgradeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  feature="Editor’s Desk"
  tier="pro"
/>
```

### Pages

- **/pricing** - Public pricing page with tier comparison
- **/settings/billing** - User subscription management dashboard

## Implementation in Editor

Export functions in `src/app/write/[storyId]/page.tsx` are gated:

```typescript
const hasProAccess = useFeatureAccess("pro");

const handleExportPdf = async () => {
  if (!hasProAccess) {
    setUpgradeModal({ isOpen: true, feature: "PDF Export", tier: "pro" });
    return;
  }
  // ... export logic
};
```

## Environment Variables

Add to `.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...

# Webhook Secret (from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Setup Instructions

### 1. Create Stripe Products

In [Stripe Dashboard](https://dashboard.stripe.com):

1. Go to Products > Add Product
2. Create "Pro" product: $9.99/mo and $99/yr
3. Create "Premium" product: $29.99/mo and $299/yr
4. Copy Price IDs to `.env.local`

### 2. Set up Webhook

1. Go to Developers > Webhooks > Add endpoint
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy signing secret to `.env.local`

### 3. Run Database Migration

```bash
npm run db:push
```

### 4. Test Subscription Flow

1. Go to `/pricing`
2. Click "Upgrade to Pro"
3. Use test card: `4242 4242 4242 4242`
4. Verify webhook received in Stripe Dashboard
5. Check user tier updated in database
6. Test export features (should work)
7. Test as free user (should show modal)

### 5. Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Feature Access Reference

### Free Tier
✅ Write stories (all 5 formats)
✅ Publish to Browse
✅ Monetize via Ink Drops
❌ Limited free editorial taste only
❌ No exports
❌ No collaboration

### Pro Tier ($9.99/mo)
✅ All Free features
✅ Editor’s Desk editorial tools (50/day)
✅ Export PDF/EPUB/DOCX
✅ Collaboration (up to 3)
✅ Advanced analytics

### Premium ($29.99/mo)
✅ All Pro features
✅ **Unlimited** AI
✅ **Unlimited** collaboration
✅ Plot hole detection
✅ Track changes mode
✅ Custom author website

## Files Created/Modified

### Database
- `src/server/db/schema.ts`
- `drizzle/0012_subscription_tiers.sql`

### Backend
- `src/server/stripe.ts`
- `src/server/permissions.ts`
- `src/app/api/billing/subscribe/route.ts`
- `src/app/api/billing/cancel/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

### Frontend
- `src/components/billing/FeatureGate.tsx`
- `src/components/billing/UpgradePrompt.tsx`
- `src/components/billing/UpgradeModal.tsx`
- `src/components/billing/index.ts`
- `src/app/pricing/page.tsx`
- `src/app/settings/billing/page.tsx`
- `src/app/write/[storyId]/page.tsx` (export gating)

## Next Steps

1. ✅ Backend infrastructure
2. ✅ Frontend UI
3. ✅ Export feature gates
4. ⏳ Create Stripe products
5. ⏳ Configure webhook
6. ⏳ Run migration
7. ⏳ Test end-to-end
8. ⏳ Implement cached Story Intelligence reports
9. ⏳ Add collaboration gating
10. ⏳ Build analytics dashboard
