import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureApplications,
  adventureSeats,
  stories,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { resolveAdventureApplicationSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";
import { loadAdventureContext } from "@/server/services/adventure-table";

type RouteParams = {
  params: Promise<{ adventureId: string; applicationId: string }>;
};
const CONFLICT = "APPLICATION_CONFLICT";

/**
 * PATCH /api/adventures/[adventureId]/applications/[applicationId]
 * Accept (seats the writer, or hands over the director's seat) or
 * decline. Owner/Director only; the seat claim is row-locked.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  let denyReason: string | null = null;
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

    const { adventureId, applicationId } = await params;
    const body = await request.json();
    const parsed = resolveAdventureApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    const canReview =
      ctx &&
      (ctx.adventure.ownerId === session.user.id ||
        ctx.mySeat?.role === "director");
    if (!canReview) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }

    const [story] = await db
      .select({ title: stories.title })
      .from(stories)
      .where(eq(stories.id, ctx.adventure.storyId));
    const title = story?.title ?? "the table";

    const result = await db.transaction(async (tx) => {
      const [application] = await tx
        .select()
        .from(adventureApplications)
        .where(
          and(
            eq(adventureApplications.id, applicationId),
            eq(adventureApplications.adventureId, adventureId)
          )
        )
        .for("update");
      if (!application || application.status !== "pending") {
        denyReason = "That ask has already been answered.";
        throw new Error(CONFLICT);
      }

      const now = new Date();
      if (parsed.data.action === "decline") {
        await tx
          .update(adventureApplications)
          .set({ status: "declined", resolvedAt: now })
          .where(eq(adventureApplications.id, application.id));
        return { application, seated: false };
      }

      const [openSeat] = await tx
        .select()
        .from(adventureSeats)
        .where(
          and(
            eq(adventureSeats.adventureId, adventureId),
            eq(adventureSeats.role, application.seatRole),
            eq(adventureSeats.status, "open"),
            isNull(adventureSeats.userId)
          )
        )
        .orderBy(asc(adventureSeats.createdAt))
        .limit(1)
        // skipLocked: a concurrent accept holding one seat must not make
        // this one report "filled" while other seats sit open.
        .for("update", { skipLocked: true });
      if (!openSeat) {
        denyReason = "That seat has been filled.";
        throw new Error(CONFLICT);
      }

      await tx
        .update(adventureSeats)
        .set({ userId: application.userId, status: "seated", joinedAt: now })
        .where(eq(adventureSeats.id, openSeat.id));
      await tx
        .update(adventureApplications)
        .set({ status: "accepted", resolvedAt: now })
        .where(eq(adventureApplications.id, application.id));

      return { application, seated: true };
    });

    if (result.seated) {
      createNotification(
        result.application.userId,
        "adventure",
        `You have a seat at "${title}" — come to the table`,
        `/adventures/${adventureId}`
      );
    }

    return NextResponse.json({
      data: { status: parsed.data.action === "accept" ? "accepted" : "declined" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === CONFLICT) {
      return NextResponse.json(
        {
          error: {
            code: "APPLICATION_CONFLICT",
            message: denyReason ?? "The table changed — refresh and try again.",
          },
        },
        { status: 409 }
      );
    }
    return handleRouteError(
      error,
      "PATCH /api/adventures/[adventureId]/applications/[applicationId]",
      "Failed to answer the ask",
    );
  }
}
