import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventureApplications,
  stories,
  users,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { adventureApplicationSchema } from "@/lib/validations";
import { createNotification } from "@/server/services/notifications";
import {
  loadAdventureContext,
  showUpRecord,
} from "@/server/services/adventure-table";

type RouteParams = { params: Promise<{ adventureId: string }> };

/**
 * GET /api/adventures/[adventureId]/applications
 * Pending asks, with each writer's show-up record. Owner/Director only.
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
    const limited = applyRateLimit(request, session.user.id, "read");
    if (limited) return limited;

    const { adventureId } = await params;
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

    const rows = await db
      .select({
        application: adventureApplications,
        userName: users.displayName,
        userFallbackName: users.name,
      })
      .from(adventureApplications)
      .leftJoin(users, eq(adventureApplications.userId, users.id))
      .where(
        and(
          eq(adventureApplications.adventureId, adventureId),
          eq(adventureApplications.status, "pending")
        )
      )
      .orderBy(asc(adventureApplications.createdAt));

    const data = [];
    for (const row of rows) {
      data.push({
        id: row.application.id,
        userId: row.application.userId,
        userName: row.userName ?? row.userFallbackName ?? "—",
        seatRole: row.application.seatRole,
        note: row.application.note,
        createdAt: row.application.createdAt,
        record: await showUpRecord(row.application.userId),
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/adventures/[adventureId]/applications",
      "Failed to load applications",
    );
  }
}

/**
 * POST /api/adventures/[adventureId]/applications
 * Ask for a seat from the board. One ask per table; the owner and
 * the Director hear about it.
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
    const body = await request.json();
    const parsed = adventureApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ctx = await loadAdventureContext(adventureId, session.user.id);
    if (!ctx || ctx.adventure.boardVisibility !== "board") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Adventure not found" } },
        { status: 404 }
      );
    }
    if (ctx.adventure.status !== "casting" && ctx.adventure.status !== "running") {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "This adventure has ended." } },
        { status: 409 }
      );
    }
    if (ctx.seats.some((s) => s.userId === session.user.id)) {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "You're already at this table." } },
        { status: 409 }
      );
    }
    const seatOpen = ctx.seats.some(
      (s) => s.role === parsed.data.seatRole && s.status === "open"
    );
    if (!seatOpen) {
      return NextResponse.json(
        { error: { code: "NOT_ALLOWED", message: "That seat is already taken." } },
        { status: 409 }
      );
    }

    try {
      const [application] = await db
        .insert(adventureApplications)
        .values({
          adventureId,
          userId: session.user.id,
          seatRole: parsed.data.seatRole,
          note: parsed.data.note,
        })
        .returning();

      const [story] = await db
        .select({ title: stories.title })
        .from(stories)
        .where(eq(stories.id, ctx.adventure.storyId));
      const askerName = session.user.name ?? "A writer";
      const recipients = new Set<string>([ctx.adventure.ownerId]);
      if (ctx.directorSeat?.userId) recipients.add(ctx.directorSeat.userId);
      for (const userId of recipients) {
        if (userId === session.user.id) continue;
        createNotification(
          userId,
          "adventure",
          `${askerName} asks for a seat at "${story?.title ?? "your table"}"`,
          `/adventures/${adventureId}`
        );
      }

      return NextResponse.json({ data: application }, { status: 201 });
    } catch {
      // Unique (adventureId, userId) — they already asked.
      return NextResponse.json(
        { error: { code: "ALREADY_ASKED", message: "You've already asked this table." } },
        { status: 409 }
      );
    }
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/adventures/[adventureId]/applications",
      "Failed to ask for a seat",
    );
  }
}
