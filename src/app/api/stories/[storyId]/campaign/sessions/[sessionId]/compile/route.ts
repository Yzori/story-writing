import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { compileSessionToChapter } from "@/server/services/compile-session-to-chapter";
import { verifySessionGmAccess } from "@/server/services/collaboration";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * POST /api/stories/[storyId]/campaign/sessions/[sessionId]/compile
 * Compile a completed session's turns into a chapter draft. GM only.
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

    const { storyId, sessionId } = await params;

    // Verify story exists and user is the running GM (acting GM or owner)
    const check = await verifySessionGmAccess(storyId, sessionId, session.user.id);
    if (check.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Story not found" } },
        { status: 404 }
      );
    }
    if (check.error === "FORBIDDEN") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only the GM can compile sessions",
          },
        },
        { status: 403 }
      );
    }
    if (check.error) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to compile session" } },
        { status: 500 }
      );
    }
    const campaignSession = check.session;

    if (campaignSession.status !== "completed") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Session must be completed before compiling",
          },
        },
        { status: 400 }
      );
    }

    const result = await compileSessionToChapter(storyId, campaignSession);

    if (result.status === "no-content") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Session has no story content to compile — only OOC messages and dice rolls",
          },
        },
        { status: 400 }
      );
    }

    if (result.status === "already") {
      return NextResponse.json(
        {
          data: {
            chapterId: result.chapterId,
            message: "Session already compiled",
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          chapterId: result.chapterId,
          message: "Session compiled to chapter draft",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/stories/[storyId]/campaign/sessions/[sessionId]/compile",
      "Failed to compile session",
    );
  }
}
