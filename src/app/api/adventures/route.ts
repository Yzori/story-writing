import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventures,
  adventureSeats,
  stories,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { createAdventureSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";
import { PACE_DUE_HOURS } from "@/server/services/adventure-table";

/**
 * GET /api/adventures
 * Adventures where the caller holds a seat, newest first.
 */
export async function GET(request: NextRequest) {
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

    const rows = await db
      .select({
        adventure: adventures,
        storyTitle: stories.title,
        myRole: adventureSeats.role,
      })
      .from(adventureSeats)
      .innerJoin(adventures, eq(adventureSeats.adventureId, adventures.id))
      .innerJoin(stories, eq(adventures.storyId, stories.id))
      .where(
        and(
          eq(adventureSeats.userId, session.user.id),
          eq(adventureSeats.status, "seated")
        )
      )
      .orderBy(desc(adventures.updatedAt));

    return NextResponse.json({
      data: rows.map(({ adventure, storyTitle, myRole }) => ({
        id: adventure.id,
        storyId: adventure.storyId,
        title: storyTitle,
        premise: adventure.premise,
        genre: adventure.genre,
        pace: adventure.pace,
        status: adventure.status,
        actNo: adventure.actNo,
        sceneNo: adventure.sceneNo,
        myRole,
        updatedAt: adventure.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/adventures error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load adventures" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/adventures
 * Open a table: creates the linked story (writingMode 'adventure'),
 * the adventure, the director seat, and the open writer seats. The
 * caller takes either the director seat or one writer seat.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = createAdventureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const {
      title,
      premise,
      genre,
      pace,
      mySeat,
      writerSeats,
      boardVisibility,
      characterName,
      characterBrief,
      inkColor,
    } = parsed.data;
    const userId = session.user.id;

    const created = await db.transaction(async (tx) => {
      const [story] = await tx
        .insert(stories)
        .values({
          title,
          slug: generateSlug(title),
          userId,
          synopsis: premise,
          genres: [genre],
          writingMode: "adventure",
        })
        .returning();

      const [adventure] = await tx
        .insert(adventures)
        .values({
          storyId: story.id,
          ownerId: userId,
          premise,
          genre,
          pace,
          turnDueHours: PACE_DUE_HOURS[pace] ?? 48,
          boardVisibility,
        })
        .returning();

      await tx.insert(adventureSeats).values({
        adventureId: adventure.id,
        role: "director",
        ...(mySeat === "director"
          ? {
              userId,
              status: "seated",
              joinedAt: new Date(),
            }
          : { status: "open" }),
      });

      const writerValues = Array.from({ length: writerSeats }, (_, i) => {
        const mine = mySeat === "writer" && i === 0;
        return {
          adventureId: adventure.id,
          role: "writer" as const,
          ...(mine
            ? {
                userId,
                status: "seated" as const,
                joinedAt: new Date(),
                characterName: characterName ?? "",
                characterBrief: characterBrief ?? "",
                inkColor: inkColor ?? "amber",
              }
            : { status: "open" as const }),
        };
      });
      await tx.insert(adventureSeats).values(writerValues);

      return adventure;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/adventures error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to open the table" } },
      { status: 500 }
    );
  }
}
