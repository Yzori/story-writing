import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { stories, users, storyBoosts } from "@/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import {
  BOOST_TIERS,
  BoostTier,
  computeNextHeroSlot,
  reconcileBoosts,
} from "@/server/services/boosts";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * POST /api/stories/[storyId]/boost
 *
 * Boost a story on the home page. Body: { tier: "standard" | "hero" }.
 *
 *   - standard (50 drops, 24h): sponsored strip. No concurrency cap. Rejects
 *     if this story already has a standard boost active.
 *   - hero (300 drops, 24h): rotating hero carousel. Hard cap of 5 concurrent
 *     active boosts. If full, creates a pre-booked row that starts when the
 *     earliest current boost expires. Per-story queue cap of 3.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write", {
      max: 5,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { storyId } = await params;

    const body = await request.json().catch(() => ({}));
    const tier: BoostTier =
      body.tier === "hero" ? "hero" : "standard";
    const config = BOOST_TIERS[tier];

    // Verify story is owned by the user and published.
    const story = await db.query.stories.findFirst({
      where: and(
        eq(stories.id, storyId),
        eq(stories.userId, session.user.id),
        eq(stories.isPublic, true),
        isNull(stories.deletedAt),
      ),
    });
    if (!story) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Story not found or not published",
          },
        },
        { status: 404 },
      );
    }

    await reconcileBoosts();

    if (tier === "standard") {
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`story-boost:standard:${storyId}`}, 0))`
        );

        const [existing] = await tx
          .select({ id: storyBoosts.id })
          .from(storyBoosts)
          .where(
            and(
              eq(storyBoosts.storyId, storyId),
              eq(storyBoosts.tier, "standard"),
              sql`${storyBoosts.status} IN ('active','pending')`,
            ),
          )
          .limit(1);
        if (existing) {
          return { error: "ALREADY_BOOSTED" as const };
        }
        const [user] = await tx
          .select({ inkDropBalance: users.inkDropBalance })
          .from(users)
          .where(eq(users.id, session.user.id))
          .for("update");
        if (!user || user.inkDropBalance < config.cost) {
          return { error: "INSUFFICIENT_BALANCE" as const };
        }
        await tx
          .update(users)
          .set({
            inkDropBalance: sql`${users.inkDropBalance} - ${config.cost}`,
          })
          .where(eq(users.id, session.user.id));

        const now = new Date();
        const [boost] = await tx
          .insert(storyBoosts)
          .values({
            storyId,
            userId: session.user.id,
            inkDropsCost: config.cost,
            tier: "standard",
            status: "active",
            startsAt: now,
            expiresAt: new Date(now.getTime() + config.durationMs),
          })
          .returning();
        return { boost };
      });

      if ("error" in result) {
        const alreadyBoosted = result.error === "ALREADY_BOOSTED";
        return NextResponse.json(
          {
            error: {
              code: result.error,
              message: alreadyBoosted
                ? "This story already has an active boost"
                : `Not enough Ink Drops (need ${config.cost})`,
            },
          },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        boost: {
          tier: "standard",
          startsAt: result.boost.startsAt,
          expiresAt: result.boost.expiresAt,
          cost: config.cost,
          isImmediate: true,
        },
      });
    }

    // ── Hero tier with pre-booking ──────────────────────────
    // Hero slots are full-bleed cover backdrops, so a missing cover would
    // render as a bare gradient — not worth 300 drops to the creator.
    if (!story.coverImageUrl) {
      return NextResponse.json(
        {
          error: {
            code: "COVER_REQUIRED",
            message:
              "Hero boosts require a cover image. Add one from the story settings first.",
          },
        },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('story-boost:hero-scheduler', 0))`
      );

      const slot = await computeNextHeroSlot(storyId, tx);
      if ("blocked" in slot) {
        return { error: "QUEUE_FULL" as const };
      }
      const [user] = await tx
        .select({ inkDropBalance: users.inkDropBalance })
        .from(users)
        .where(eq(users.id, session.user.id))
        .for("update");
      if (!user || user.inkDropBalance < config.cost) {
        return { error: "INSUFFICIENT_BALANCE" as const };
      }
      await tx
        .update(users)
        .set({
          inkDropBalance: sql`${users.inkDropBalance} - ${config.cost}`,
        })
        .where(eq(users.id, session.user.id));

      const [boost] = await tx
        .insert(storyBoosts)
        .values({
          storyId,
          userId: session.user.id,
          inkDropsCost: config.cost,
          tier: "hero",
          status: slot.isImmediate ? "active" : "pending",
          startsAt: slot.startsAt,
          expiresAt: slot.expiresAt,
        })
        .returning();
      return { boost, slot };
    });

    if ("error" in result) {
      const queueFull = result.error === "QUEUE_FULL";
      return NextResponse.json(
        {
          error: {
            code: result.error,
            message: queueFull
              ? "This story already has the maximum number of hero boosts queued"
              : `Not enough Ink Drops (need ${config.cost})`,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      boost: {
        tier: "hero",
        startsAt: result.boost.startsAt,
        expiresAt: result.boost.expiresAt,
        cost: config.cost,
        isImmediate: result.slot.isImmediate,
        queuePosition: result.slot.queuePosition,
      },
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/stories/[storyId]/boost", "Failed to boost story");
  }
}

/**
 * GET /api/stories/[storyId]/boost
 * Returns the story's current boost status (any active or pending tier).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { storyId } = await params;
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    await reconcileBoosts();

    const rows = await db
      .select({
        id: storyBoosts.id,
        tier: storyBoosts.tier,
        status: storyBoosts.status,
        startsAt: storyBoosts.startsAt,
        expiresAt: storyBoosts.expiresAt,
      })
      .from(storyBoosts)
      .where(
        and(
          eq(storyBoosts.storyId, storyId),
          sql`${storyBoosts.status} IN ('active','pending')`,
        ),
      );

    return NextResponse.json({
      boosts: rows,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/stories/[storyId]/boost", "Failed to check boost");
  }
}
