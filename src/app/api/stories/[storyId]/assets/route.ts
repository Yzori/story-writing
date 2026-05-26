import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyAssets, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { createAssetSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/** Owner or accepted collaborator may read/write a story's asset library. */
async function assertAccess(storyId: string, userId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { ok: false as const, status: 404, message: "Story not found" };
  if (story.userId === userId) return { ok: true as const };
  const collab = await db.query.collaborators.findFirst({
    where: and(
      eq(collaborators.storyId, storyId),
      eq(collaborators.userId, userId),
      eq(collaborators.status, "accepted"),
    ),
  });
  if (!collab) return { ok: false as const, status: 403, message: "You don't have access to this story" };
  return { ok: true as const };
}

/** GET /api/stories/[storyId]/assets — list the story's reusable images. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    const { storyId } = await params;
    const access = await assertAccess(storyId, session.user.id);
    if (!access.ok) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: access.message } }, { status: access.status });
    }
    const assets = await db
      .select()
      .from(storyAssets)
      .where(eq(storyAssets.storyId, storyId))
      .orderBy(desc(storyAssets.createdAt));
    return NextResponse.json({ data: assets });
  } catch (error) {
    console.error("GET assets error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch assets" } }, { status: 500 });
  }
}

/** POST /api/stories/[storyId]/assets — add an image to the library. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId } = await params;
    const access = await assertAccess(storyId, session.user.id);
    if (!access.ok) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: access.message } }, { status: access.status });
    }

    const parsed = createAssetSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(storyAssets)
      .values({ storyId, name: parsed.data.name || "", imageData: parsed.data.imageData })
      .returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST asset error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create asset" } }, { status: 500 });
  }
}
