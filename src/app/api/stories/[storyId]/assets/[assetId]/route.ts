import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyAssets, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string; assetId: string }> };

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

/**
 * GET /api/stories/[storyId]/assets/[assetId]
 * Default: the full asset as JSON ({ data }), including imageData — used when
 * dropping an asset into a panel.
 * With `?raw=1`: the decoded image bytes with the right Content-Type — used by
 * the tray thumbnails so the list endpoint never has to ship base64 blobs.
 * Assets are immutable per id, so raw responses are cacheable (private).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { storyId, assetId } = await params;
    const access = await assertAccess(storyId, session.user.id);
    if (!access.ok) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: access.message } }, { status: access.status });
    }

    const asset = await db.query.storyAssets.findFirst({
      where: and(eq(storyAssets.id, assetId), eq(storyAssets.storyId, storyId)),
    });
    if (!asset) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Asset not found" } }, { status: 404 });
    }

    if (request.nextUrl.searchParams.get("raw")) {
      // Stored as a data URL (canvas.toDataURL output): data:<mime>;base64,<payload>
      // Data URLs from canvas.toDataURL are single-line: data:<mime>;base64,<payload>
      const match = asset.imageData.match(/^data:(image\/[a-z0-9.+-]+);base64,([^\s]+)$/i);
      if (!match) {
        return NextResponse.json(
          { error: { code: "UNSUPPORTED", message: "Asset image data is not a valid image" } },
          { status: 415 },
        );
      }
      const bytes = Buffer.from(match[2], "base64");
      return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": match[1],
          "Content-Length": String(bytes.byteLength),
          // Immutable per id; private because the library is owner/collab-only.
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("GET asset error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch asset" } }, { status: 500 });
  }
}

/** DELETE /api/stories/[storyId]/assets/[assetId] — remove a library image. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { storyId, assetId } = await params;
    const access = await assertAccess(storyId, session.user.id);
    if (!access.ok) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: access.message } }, { status: access.status });
    }

    await db.delete(storyAssets).where(and(eq(storyAssets.id, assetId), eq(storyAssets.storyId, storyId)));
    return NextResponse.json({ data: { id: assetId } });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete asset" } }, { status: 500 });
  }
}
