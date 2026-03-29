import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { offerings, users, commissionTestimonials } from "@/server/db/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

const VALID_CRAFTS = [
  "custom-chapter", "cover-art", "character-art", "editing", "poetry",
  "worldbuilding", "gm-for-hire", "webtoon-panels", "screenplay-coverage",
  "scene-illustration", "ghostwriting", "story-bible",
];

// GET — browse offerings (public)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const craft = url.searchParams.get("craft");
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    const conditions = [eq(offerings.isActive, true)];
    if (craft && VALID_CRAFTS.includes(craft)) {
      conditions.push(eq(offerings.craft, craft));
    }

    const results = await db
      .select({
        id: offerings.id,
        craft: offerings.craft,
        title: offerings.title,
        description: offerings.description,
        priceMin: offerings.priceMin,
        priceMax: offerings.priceMax,
        deliveryDays: offerings.deliveryDays,
        revisionRounds: offerings.revisionRounds,
        completedCount: offerings.completedCount,
        portfolioUrls: offerings.portfolioUrls,
        artisan: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(offerings)
      .innerJoin(users, eq(offerings.artisanId, users.id))
      .where(and(...conditions))
      .orderBy(desc(offerings.completedCount), desc(offerings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(offerings)
      .where(and(...conditions));

    return NextResponse.json({
      offerings: results,
      total: Number(countResult?.count ?? 0),
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET offerings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch offerings" } },
      { status: 500 }
    );
  }
}

// POST — create an offering
export async function POST(request: NextRequest) {
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
    const { craft, title, description, priceMin, priceMax, deliveryDays, revisionRounds, portfolioUrls } = body;

    // Validate craft
    if (!craft || !VALID_CRAFTS.includes(craft)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid craft type" } },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!title || title.length < 5 || title.length > 100) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Title must be 5-100 characters" } },
        { status: 400 }
      );
    }
    if (!description || description.length < 20 || description.length > 2000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Description must be 20-2000 characters" } },
        { status: 400 }
      );
    }

    // Validate prices (50-1500 drops)
    if (!priceMin || !priceMax || priceMin < 50 || priceMax > 1500 || priceMin > priceMax) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Price must be 50-1500 drops, min <= max" } },
        { status: 400 }
      );
    }

    // Validate delivery days (1-30)
    const days = deliveryDays ?? 7;
    if (days < 1 || days > 30) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Delivery days must be 1-30" } },
        { status: 400 }
      );
    }

    // Max 10 active offerings per user
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(offerings)
      .where(and(eq(offerings.artisanId, session.user.id), eq(offerings.isActive, true)));

    if (Number(countResult?.count ?? 0) >= 10) {
      return NextResponse.json(
        { error: { code: "LIMIT_REACHED", message: "You can have at most 10 active offerings" } },
        { status: 400 }
      );
    }

    const [offering] = await db
      .insert(offerings)
      .values({
        artisanId: session.user.id,
        craft,
        title,
        description,
        priceMin,
        priceMax,
        deliveryDays: days,
        revisionRounds: Math.min(revisionRounds ?? 1, 5),
        portfolioUrls: JSON.stringify(portfolioUrls ?? []),
      })
      .returning();

    return NextResponse.json({ offering }, { status: 201 });
  } catch (error) {
    console.error("POST offering error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create offering" } },
      { status: 500 }
    );
  }
}
