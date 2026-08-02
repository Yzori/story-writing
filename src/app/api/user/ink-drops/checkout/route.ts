import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { inkDropCheckoutSchema } from "@/lib/validations";
import { stripe, INK_DROP_TIERS } from "@/server/stripe";

/**
 * POST /api/user/ink-drops/checkout
 * Create a Stripe Checkout Session for purchasing Ink Drops.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 5,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const body = await request.json();
    const { tier } = inkDropCheckoutSchema.parse(body);
    const tierInfo = INK_DROP_TIERS[tier];

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tierInfo.drops} Ink Drops`,
              description: `${tierInfo.label} pack — ${tierInfo.drops} Ink Drops for tipping creators on Quiloria`,
            },
            unit_amount: tierInfo.priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        tier,
        dropAmount: String(tierInfo.drops),
      },
      success_url: `${origin}/settings/ink-drops?success=true&drops=${tierInfo.drops}`,
      cancel_url: `${origin}/settings/ink-drops?canceled=true`,
      customer_email: session.user.email || undefined,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/user/ink-drops/checkout",
      "Failed to create checkout session",
    );
  }
}
