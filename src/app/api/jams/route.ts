import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyJams, jamEntries, users } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { createJamSchema } from "@/lib/validations";
import { computeJamStatus } from "@/server/services/jams";

/**
 * GET /api/jams
 * List all jams. Public. Supports ?status= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = applyRateLimit(request, null, "read");
    if (rl) return rl;

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");

    const rows = await db
      .select({
        id: storyJams.id,
        title: storyJams.title,
        description: storyJams.description,
        theme: storyJams.theme,
        bannerUrl: storyJams.bannerUrl,
        submissionStartsAt: storyJams.submissionStartsAt,
        submissionEndsAt: storyJams.submissionEndsAt,
        votingStartsAt: storyJams.votingStartsAt,
        votingEndsAt: storyJams.votingEndsAt,
        wordCountMin: storyJams.wordCountMin,
        wordCountMax: storyJams.wordCountMax,
        maxEntries: storyJams.maxEntries,
        status: storyJams.status,
        createdAt: storyJams.createdAt,
        creatorName: users.displayName,
        entryCount: sql<number>`(
          select count(*) from jam_entries
          where jam_entries.jam_id = ${storyJams.id}
        )`,
      })
      .from(storyJams)
      .leftJoin(users, eq(storyJams.createdBy, users.id))
      .orderBy(desc(storyJams.createdAt))
      .limit(50);

    // Compute live status from timestamps
    const jams = rows.map((jam) => ({
      ...jam,
      liveStatus: computeJamStatus({
        ...jam,
        submissionStartsAt: new Date(jam.submissionStartsAt),
        submissionEndsAt: new Date(jam.submissionEndsAt),
        votingStartsAt: new Date(jam.votingStartsAt),
        votingEndsAt: new Date(jam.votingEndsAt),
      }),
    }));

    const filtered = statusFilter
      ? jams.filter((j) => j.liveStatus === statusFilter)
      : jams;

    return NextResponse.json({ data: filtered });
  } catch (error) {
    return handleRouteError(error, "GET /api/jams", "Failed to fetch jams");
  }
}

/**
 * POST /api/jams
 * Create a jam. Admin only.
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

    // Admin check
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const body = await request.json();
    const validated = createJamSchema.parse(body);

    const [jam] = await db
      .insert(storyJams)
      .values({
        ...validated,
        submissionStartsAt: new Date(validated.submissionStartsAt),
        submissionEndsAt: new Date(validated.submissionEndsAt),
        votingStartsAt: new Date(validated.votingStartsAt),
        votingEndsAt: new Date(validated.votingEndsAt),
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: jam }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/jams", "Failed to create jam");
  }
}
