import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyJams, jamEntries, stories, chapters } from "@/server/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { submitJamEntrySchema } from "@/lib/validations";
import { computeJamStatus } from "@/server/services/jams";

type RouteParams = { params: Promise<{ jamId: string }> };

/**
 * POST /api/jams/[jamId]/entries
 * Submit a story to a jam. Auth required.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { jamId } = await params;
    const body = await request.json();
    const { storyId } = submitJamEntrySchema.parse(body);

    // Verify jam exists and is open
    const jam = await db.query.storyJams.findFirst({
      where: eq(storyJams.id, jamId),
    });
    if (!jam) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Jam not found" } },
        { status: 404 }
      );
    }

    const liveStatus = computeJamStatus(jam);
    if (liveStatus !== "open") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Jam is not accepting submissions" } },
        { status: 400 }
      );
    }

    // Verify story belongs to user and is published
    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), eq(stories.userId, session.user.id)),
      columns: { id: true, isPublic: true },
    });
    if (!story) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found or not yours" } },
        { status: 404 }
      );
    }
    if (!story.isPublic) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Story must be published to submit" } },
        { status: 400 }
      );
    }

    // Compute total word count from chapters
    const [wordResult] = await db
      .select({ total: sql<number>`coalesce(sum(${chapters.wordCount}), 0)` })
      .from(chapters)
      .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)));
    const wordCount = Number(wordResult?.total ?? 0);
    if (jam.wordCountMin && wordCount < jam.wordCountMin) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: `Story must be at least ${jam.wordCountMin} words` } },
        { status: 400 }
      );
    }
    if (jam.wordCountMax && wordCount > jam.wordCountMax) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: `Story must be under ${jam.wordCountMax} words` } },
        { status: 400 }
      );
    }

    // Check max entries
    if (jam.maxEntries) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jamEntries)
        .where(eq(jamEntries.jamId, jamId));
      if (Number(count) >= jam.maxEntries) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "This jam has reached its entry limit" } },
          { status: 400 }
        );
      }
    }

    const [entry] = await db
      .insert(jamEntries)
      .values({
        jamId,
        storyId,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation (duplicate entry)
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "This story has already been submitted to this jam" } },
        { status: 409 }
      );
    }
    return handleRouteError(error, "POST /api/jams/[jamId]/entries", "Failed to submit entry");
  }
}
