import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyAssets, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { createAssetSchema } from "@/lib/validations";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/** Hard cap on library size — keeps a story's asset tray (and table) bounded. */
const MAX_ASSETS_PER_STORY = 100;

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
    // Metadata only — imageData can be ~1MB of base64 per asset, and the list
    // is consumed solely for tray thumbnails (served via the [assetId]?raw=1
    // image endpoint). Full bytes are fetched per-asset on demand.
    const assets = await db
      .select({
        id: storyAssets.id,
        name: storyAssets.name,
        createdAt: storyAssets.createdAt,
      })
      .from(storyAssets)
      .where(eq(storyAssets.storyId, storyId))
      .orderBy(desc(storyAssets.createdAt))
      .limit(MAX_ASSETS_PER_STORY);
    return NextResponse.json({ data: assets });
  } catch (error) {
    return handleRouteError(error, "GET /api/stories/[storyId]/assets", "Failed to fetch assets");
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

    const [{ total }] = await db
      .select({ total: count() })
      .from(storyAssets)
      .where(eq(storyAssets.storyId, storyId));
    if (total >= MAX_ASSETS_PER_STORY) {
      return NextResponse.json(
        {
          error: {
            code: "LIMIT_REACHED",
            message: `This story's library is full (${MAX_ASSETS_PER_STORY} images). Delete some assets to add more.`,
          },
        },
        { status: 422 },
      );
    }

    const [created] = await db
      .insert(storyAssets)
      .values({ storyId, name: parsed.data.name || "", imageData: parsed.data.imageData })
      .returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/stories/[storyId]/assets", "Failed to create asset");
  }
}
