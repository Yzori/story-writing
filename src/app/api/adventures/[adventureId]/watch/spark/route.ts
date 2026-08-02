import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { adventurePassages, adventurePassageSparks } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { adventureSparkSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * POST /api/adventures/[adventureId]/watch/spark — spark a passage.
 * DELETE — take it back. Signed-in readers; free, one per passage.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return toggleSpark(request, params, "add");
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return toggleSpark(request, params, "remove");
}

async function toggleSpark(
  request: NextRequest,
  params: RouteParams["params"],
  mode: "add" | "remove"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to spark" } },
        { status: 401 }
      );
    }
    const limited = applyRateLimit(request, session.user.id, "write");
    if (limited) return limited;

    const { adventureId } = await params;
    const body = await request.json();
    const parsed = adventureSparkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const [passage] = await db
      .select({ id: adventurePassages.id })
      .from(adventurePassages)
      .where(
        and(
          eq(adventurePassages.id, parsed.data.passageId),
          eq(adventurePassages.adventureId, adventureId)
        )
      );
    if (!passage) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Passage not found" } },
        { status: 404 }
      );
    }

    if (mode === "add") {
      await db
        .insert(adventurePassageSparks)
        .values({ passageId: passage.id, userId: session.user.id })
        .onConflictDoNothing();
    } else {
      await db
        .delete(adventurePassageSparks)
        .where(
          and(
            eq(adventurePassageSparks.passageId, passage.id),
            eq(adventurePassageSparks.userId, session.user.id)
          )
        );
    }

    return NextResponse.json({ data: { sparked: mode === "add" } });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/adventures/[adventureId]/watch/spark",
      "Failed to spark",
    );
  }
}
