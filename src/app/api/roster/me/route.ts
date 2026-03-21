import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guildProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { guildProfileSchema } from "@/lib/validations";
import { applyRateLimit } from "@/lib/api-utils";

/**
 * GET /api/roster/me
 * Get the current user's roster profile.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const profile = await db.query.guildProfiles.findFirst({
      where: eq(guildProfiles.userId, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        ...profile,
        portfolioLinks: profile.portfolioLinks ? JSON.parse(profile.portfolioLinks) : [],
      },
    });
  } catch (error) {
    console.error("GET /api/roster/me error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch roster profile" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roster/me
 * Create or update the current user's roster profile.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const body = await request.json();
    const parsed = guildProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const existing = await db.query.guildProfiles.findFirst({
      where: eq(guildProfiles.userId, session.user.id),
    });

    const profileData = {
      tagline: parsed.data.tagline ?? null,
      roles: parsed.data.roles,
      genres: parsed.data.genres ?? [],
      availability: parsed.data.availability,
      portfolioLinks: parsed.data.portfolioLinks
        ? JSON.stringify(parsed.data.portfolioLinks)
        : null,
      showcaseStoryIds: parsed.data.showcaseStoryIds ?? [],
      yearsWriting: parsed.data.yearsWriting ?? null,
      lookingFor: parsed.data.lookingFor ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db
        .update(guildProfiles)
        .set(profileData)
        .where(eq(guildProfiles.userId, session.user.id))
        .returning();

      return NextResponse.json({
        data: {
          ...updated,
          portfolioLinks: updated.portfolioLinks ? JSON.parse(updated.portfolioLinks) : [],
        },
      });
    }

    const [created] = await db
      .insert(guildProfiles)
      .values({
        userId: session.user.id,
        ...profileData,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          ...created,
          portfolioLinks: created.portfolioLinks ? JSON.parse(created.portfolioLinks) : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PUT /api/roster/me error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save roster profile" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roster/me
 * Remove the current user from the guild.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    await db
      .delete(guildProfiles)
      .where(eq(guildProfiles.userId, session.user.id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/roster/me error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to remove roster profile" } },
      { status: 500 }
    );
  }
}
