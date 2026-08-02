import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { flags } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/admin";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";

/**
 * PATCH /api/admin/flags/[flagId]
 * Update a flag's status (dismiss or action it).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const limited = applyRateLimit(request, session!.user!.id, "write");
  if (limited) return limited;

  try {
    const { flagId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["dismissed", "actioned"].includes(status)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Status must be 'dismissed' or 'actioned'",
          },
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(flags)
      .set({ status })
      .where(eq(flags.id, flagId))
      .returning({ id: flags.id, status: flags.status });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Flag not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return handleRouteError(err, "PATCH /api/admin/flags/[flagId]", "Failed to update flag");
  }
}
