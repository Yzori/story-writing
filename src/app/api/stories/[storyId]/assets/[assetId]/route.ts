import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { storyAssets, stories, collaborators } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string; assetId: string }> };

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

    const story = await db.query.stories.findFirst({
      where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
    });
    if (!story) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
    }
    if (story.userId !== session.user.id) {
      const collab = await db.query.collaborators.findFirst({
        where: and(
          eq(collaborators.storyId, storyId),
          eq(collaborators.userId, session.user.id),
          eq(collaborators.status, "accepted"),
        ),
      });
      if (!collab) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "You don't have access to this story" } }, { status: 403 });
      }
    }

    await db.delete(storyAssets).where(and(eq(storyAssets.id, assetId), eq(storyAssets.storyId, storyId)));
    return NextResponse.json({ data: { id: assetId } });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete asset" } }, { status: 500 });
  }
}
