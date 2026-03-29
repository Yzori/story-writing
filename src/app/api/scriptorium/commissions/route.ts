import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  commissions,
  offerings,
  users,
  inkDropTransactions,
} from "@/server/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createNotification } from "@/server/services/notifications";

// GET — list user's commissions (as patron or artisan)
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

    const url = new URL(request.url);
    const role = url.searchParams.get("role"); // 'patron' | 'artisan' | null (both)

    const conditions = [];
    if (role === "patron") {
      conditions.push(eq(commissions.patronId, session.user.id));
    } else if (role === "artisan") {
      conditions.push(eq(commissions.artisanId, session.user.id));
    } else {
      conditions.push(
        or(
          eq(commissions.patronId, session.user.id),
          eq(commissions.artisanId, session.user.id)
        )!
      );
    }

    const results = await db
      .select({
        id: commissions.id,
        status: commissions.status,
        brief: commissions.brief,
        quotedPrice: commissions.quotedPrice,
        agreedPrice: commissions.agreedPrice,
        deliveryDeadline: commissions.deliveryDeadline,
        createdAt: commissions.createdAt,
        offering: {
          id: offerings.id,
          title: offerings.title,
          craft: offerings.craft,
        },
        patron: {
          id: sql<string>`patron.id`,
          displayName: sql<string>`patron.display_name`,
        },
        artisan: {
          id: sql<string>`artisan.id`,
          displayName: sql<string>`artisan.display_name`,
        },
      })
      .from(commissions)
      .innerJoin(offerings, eq(commissions.offeringId, offerings.id))
      .innerJoin(sql`users AS patron`, sql`patron.id = ${commissions.patronId}`)
      .innerJoin(sql`users AS artisan`, sql`artisan.id = ${commissions.artisanId}`)
      .where(and(...conditions))
      .orderBy(desc(commissions.updatedAt))
      .limit(50);

    return NextResponse.json({ commissions: results });
  } catch (error) {
    console.error("GET commissions error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch commissions" } },
      { status: 500 }
    );
  }
}

// POST — request a commission
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
    const { offeringId, brief, storyId } = body;

    if (!offeringId || !brief || brief.length < 20 || brief.length > 3000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Brief must be 20-3000 characters" } },
        { status: 400 }
      );
    }

    // Get offering
    const [offering] = await db
      .select()
      .from(offerings)
      .where(and(eq(offerings.id, offeringId), eq(offerings.isActive, true)));

    if (!offering) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Offering not found or inactive" } },
        { status: 404 }
      );
    }

    // Can't commission yourself
    if (offering.artisanId === session.user.id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "You cannot commission your own offering" } },
        { status: 400 }
      );
    }

    const [commission] = await db
      .insert(commissions)
      .values({
        offeringId,
        patronId: session.user.id,
        artisanId: offering.artisanId,
        storyId: storyId || null,
        brief,
        maxRevisions: offering.revisionRounds,
      })
      .returning();

    // Notify artisan
    createNotification(
      offering.artisanId,
      "circle", // reusing for now, could add "commission" type
      `New commission request for "${offering.title}"`,
      `/scriptorium?tab=commissions`
    );

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error("POST commission error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create commission" } },
      { status: 500 }
    );
  }
}
