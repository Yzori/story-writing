import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { workshopMessages, users } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/server/auth";
import { verifyCollaboratorAccess } from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string }> };

/**
 * GET /api/stories/[storyId]/chat
 * List workshop messages (last 100). Requires collaborator access.
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

    const messages = await db
      .select({
        id: workshopMessages.id,
        content: workshopMessages.content,
        type: workshopMessages.type,
        metadata: workshopMessages.metadata,
        createdAt: workshopMessages.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(workshopMessages)
      .leftJoin(users, eq(workshopMessages.userId, users.id))
      .where(eq(workshopMessages.storyId, storyId))
      .orderBy(desc(workshopMessages.createdAt))
      .limit(100);

    // Return in chronological order (oldest first)
    return NextResponse.json({ data: messages.reverse() });
  } catch (error) {
    console.error("GET /api/stories/[storyId]/chat error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch messages" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stories/[storyId]/chat
 * Send a workshop message. Requires collaborator access.
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

    const limited = applyRateLimit(request, session.user.id, "write");
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
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 2000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Message must be 1-2000 characters" } },
        { status: 400 }
      );
    }

    const type = typeof body.type === "string" && ["chat", "edit", "join", "leave", "suggestion", "publish"].includes(body.type)
      ? body.type
      : "chat";
    let metadata = "{}";
    if (body.metadata && typeof body.metadata === "object") {
      const serialized = JSON.stringify(body.metadata);
      if (serialized.length > 5000) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Metadata too large" } },
          { status: 400 }
        );
      }
      metadata = serialized;
    }

    const [msg] = await db
      .insert(workshopMessages)
      .values({
        storyId,
        userId: session.user.id,
        content,
        type,
        metadata,
      })
      .returning();

    // Re-fetch with user join
    const [enriched] = await db
      .select({
        id: workshopMessages.id,
        content: workshopMessages.content,
        type: workshopMessages.type,
        metadata: workshopMessages.metadata,
        createdAt: workshopMessages.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(workshopMessages)
      .leftJoin(users, eq(workshopMessages.userId, users.id))
      .where(eq(workshopMessages.id, msg.id));

    return NextResponse.json({ data: enriched }, { status: 201 });
  } catch (error) {
    console.error("POST /api/stories/[storyId]/chat error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send message" } },
      { status: 500 }
    );
  }
}
