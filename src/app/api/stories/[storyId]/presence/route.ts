import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { editorPresence, users, collaborators } from "@/server/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

const PRESENCE_STALE_SECONDS = 45;

/**
 * GET /api/stories/[storyId]/presence
 * Returns all active presences (heartbeat within last 45s).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const { storyId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error) {
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "NOT_FOUND" ? "Story not found" : "Not authorized" } },
        { status: check.error === "NOT_FOUND" ? 404 : 403 }
      );
    }

    const cutoff = new Date(Date.now() - PRESENCE_STALE_SECONDS * 1000);

    const presences = await db
      .select({
        userId: editorPresence.userId,
        chapterId: editorPresence.chapterId,
        status: editorPresence.status,
        lastHeartbeat: editorPresence.lastHeartbeat,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(editorPresence)
      .leftJoin(users, eq(editorPresence.userId, users.id))
      .where(
        and(
          eq(editorPresence.storyId, storyId),
          gt(editorPresence.lastHeartbeat, cutoff)
        )
      );

    // Enrich with collaborator role
    const collabs = await db
      .select({ userId: collaborators.userId, role: collaborators.role })
      .from(collaborators)
      .where(and(eq(collaborators.storyId, storyId), eq(collaborators.status, "accepted")));

    const roleMap = new Map(collabs.map((c) => [c.userId, c.role]));
    // Story owner is always "writer"
    if (check.story) roleMap.set(check.story.userId, "writer");

    const data = presences.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      role: roleMap.get(p.userId) || "writer",
      chapterId: p.chapterId,
      status: p.status,
      lastHeartbeat: p.lastHeartbeat,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/stories/[storyId]/presence",
      "Failed to fetch presences",
    );
  }
}

/**
 * PUT /api/stories/[storyId]/presence
 * Upsert heartbeat. Returns lock info if chapter is locked by another user.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write", { max: 120, windowSeconds: 60 });
    if (limited) return limited;

    const { storyId } = await params;
    const check = await verifyCollaboratorAccess(storyId, session.user.id);
    if (check.error) {
      return NextResponse.json(
        { error: { code: check.error, message: check.error === "NOT_FOUND" ? "Story not found" : "Not authorized" } },
        { status: check.error === "NOT_FOUND" ? 404 : 403 }
      );
    }

    const body = await request.json();
    const chapterId = body.chapterId ?? null;
    const status = body.status === "editing" ? "editing" : "viewing";

    // Upsert presence
    await db
      .insert(editorPresence)
      .values({
        storyId,
        userId: session.user.id,
        chapterId,
        status,
        lastHeartbeat: new Date(),
      })
      .onConflictDoUpdate({
        target: [editorPresence.storyId, editorPresence.userId],
        set: {
          chapterId,
          status,
          lastHeartbeat: new Date(),
        },
      });

    // Check if someone else has an editing lock on this chapter
    let lock = { locked: false, lockedBy: null as { userId: string; displayName: string } | null };

    if (status === "editing" && chapterId) {
      const cutoff = new Date(Date.now() - PRESENCE_STALE_SECONDS * 1000);
      const existing = await db
        .select({
          userId: editorPresence.userId,
          displayName: users.displayName,
        })
        .from(editorPresence)
        .leftJoin(users, eq(editorPresence.userId, users.id))
        .where(
          and(
            eq(editorPresence.storyId, storyId),
            eq(editorPresence.chapterId, chapterId),
            eq(editorPresence.status, "editing"),
            gt(editorPresence.lastHeartbeat, cutoff),
            sql`${editorPresence.userId} != ${session.user.id}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Someone else is editing — revert this user to viewing
        await db
          .update(editorPresence)
          .set({ status: "viewing", lastHeartbeat: new Date() })
          .where(
            and(
              eq(editorPresence.storyId, storyId),
              eq(editorPresence.userId, session.user.id)
            )
          );
        lock = {
          locked: true,
          lockedBy: { userId: existing[0].userId, displayName: existing[0].displayName || "Someone" },
        };
      }
    }

    return NextResponse.json({ data: { chapterId, status: lock.locked ? "viewing" : status }, lock });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/stories/[storyId]/presence",
      "Failed to update presence",
    );
  }
}

/**
 * DELETE /api/stories/[storyId]/presence
 * Remove presence (on page unload).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true }); // Silent OK for beacon calls
    }

    const { storyId } = await params;

    await db
      .delete(editorPresence)
      .where(
        and(
          eq(editorPresence.storyId, storyId),
          eq(editorPresence.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Don't fail on cleanup
  }
}

/**
 * POST /api/stories/[storyId]/presence
 * Alias for DELETE — used by navigator.sendBeacon on page unload (beacon only supports POST).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body._action === "leave") {
      return DELETE(request, { params });
    }
    // Default: treat as heartbeat (same as PUT)
    return PUT(request, { params });
  } catch {
    return NextResponse.json({ success: true });
  }
}
