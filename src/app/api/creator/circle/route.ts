import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { creatorCircles, stories, chapters } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

// GET — fetch current user's circle config
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "read");
    if (rl) return rl;

    const [circle] = await db
      .select()
      .from(creatorCircles)
      .where(eq(creatorCircles.creatorId, session.user.id));

    // Also fetch subscriber count + monthly income
    if (circle) {
      const [stats] = await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE status = 'active') AS subscriber_count,
          coalesce(sum(price_at_subscription) FILTER (WHERE status = 'active'), 0) AS monthly_income
        FROM circle_subscriptions
        WHERE creator_id = ${session.user.id}
      `);

      return NextResponse.json({
        circle,
        subscriberCount: Number((stats as any)?.subscriber_count ?? 0),
        monthlyIncome: Number((stats as any)?.monthly_income ?? 0),
      });
    }

    return NextResponse.json({ circle: null, subscriberCount: 0, monthlyIncome: 0 });
  } catch (error) {
    console.error("GET /api/creator/circle error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch circle" } },
      { status: 500 }
    );
  }
}

// PUT — create or update circle config
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const body = await request.json();
    const { isActive, confidantPrice, confidantDescription, earlyAccessDays } = body;

    // Validate price range: 300-800 drops/month
    if (confidantPrice !== undefined) {
      if (typeof confidantPrice !== "number" || confidantPrice < 300 || confidantPrice > 800) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Confidant price must be between 300 and 800 drops" } },
          { status: 400 }
        );
      }
    }

    // Validate early access days: 1-7
    if (earlyAccessDays !== undefined) {
      if (typeof earlyAccessDays !== "number" || earlyAccessDays < 1 || earlyAccessDays > 7) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Early access days must be between 1 and 7" } },
          { status: 400 }
        );
      }
    }

    // Must have at least one published chapter to activate
    if (isActive === true) {
      const [published] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chapters)
        .innerJoin(stories, eq(chapters.storyId, stories.id))
        .where(
          and(
            eq(stories.userId, session.user.id),
            eq(chapters.status, "published")
          )
        );
      if (Number(published?.count ?? 0) === 0) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "You need at least one published chapter to activate your Circle" } },
          { status: 400 }
        );
      }
    }

    // Upsert circle config
    const [existing] = await db
      .select({ id: creatorCircles.id })
      .from(creatorCircles)
      .where(eq(creatorCircles.creatorId, session.user.id));

    const values = {
      isActive: isActive ?? false,
      confidantPrice: confidantPrice ?? 500,
      confidantDescription: confidantDescription ?? null,
      earlyAccessDays: earlyAccessDays ?? 3,
      updatedAt: new Date(),
    };

    let circle;
    if (existing) {
      [circle] = await db
        .update(creatorCircles)
        .set(values)
        .where(eq(creatorCircles.id, existing.id))
        .returning();
    } else {
      [circle] = await db
        .insert(creatorCircles)
        .values({ creatorId: session.user.id, ...values })
        .returning();
    }

    return NextResponse.json({ circle });
  } catch (error) {
    console.error("PUT /api/creator/circle error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update circle" } },
      { status: 500 }
    );
  }
}
