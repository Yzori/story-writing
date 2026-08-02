import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { compileAdventure } from "@/server/services/compile-adventure";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/finish
 * The Director closes the book: the adventure compiles act-by-act
 * into published chapters on the linked story, credited to the whole
 * table.
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

    const { adventureId } = await params;
    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || ctx.mySeat?.role !== "director") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (ctx.adventure.status !== "running") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "This adventure isn't running." } },
        { status: 409 }
      );
    }

    const result = await compileAdventure(adventureId, "finished");
    if (result.status === "no-content") {
      return NextResponse.json(
        {
          error: {
            code: "NO_CONTENT",
            message: "There's nothing on the page yet — write before you close the book.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      data: {
        finished: true,
        storyId: ctx.adventure.storyId,
        chapters: result.status === "compiled" ? result.chapterIds.length : 0,
      },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/finish",
      "Failed to close the book",
    );
  }
}
