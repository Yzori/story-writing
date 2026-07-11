import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { adventures, adventureSeats, stories, users } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { showUpRecord } from "@/server/services/adventure-table";

/**
 * GET /api/adventures/board?seat=director|writer&genre=&pace=
 * The playbill board: open tables, either seat can be the open one.
 * Ordered pace-match first — a table that writes at your speed is a
 * table that finishes — then genre match, then the host's record.
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

    const seatWanted = request.nextUrl.searchParams.get("seat"); // role I want to fill
    const genreWanted = request.nextUrl.searchParams.get("genre");
    const paceWanted = request.nextUrl.searchParams.get("pace");

    const boardRows = await db
      .select({ adventure: adventures, storyTitle: stories.title })
      .from(adventures)
      .innerJoin(stories, eq(adventures.storyId, stories.id))
      .where(
        and(
          eq(adventures.boardVisibility, "board"),
          inArray(adventures.status, ["casting", "running"])
        )
      )
      .orderBy(desc(adventures.updatedAt))
      .limit(60);

    if (boardRows.length === 0) return NextResponse.json({ data: [] });

    const seatRows = await db
      .select({
        seat: adventureSeats,
        userName: users.displayName,
        userFallbackName: users.name,
      })
      .from(adventureSeats)
      .leftJoin(users, eq(adventureSeats.userId, users.id))
      .where(
        inArray(
          adventureSeats.adventureId,
          boardRows.map((r) => r.adventure.id)
        )
      );

    const cards = [];
    for (const { adventure, storyTitle } of boardRows) {
      const seats = seatRows.filter(
        (s) => s.seat.adventureId === adventure.id
      );
      const openDirector = seats.some(
        (s) => s.seat.role === "director" && s.seat.status === "open"
      );
      const openWriters = seats.filter(
        (s) => s.seat.role === "writer" && s.seat.status === "open"
      ).length;
      if (!openDirector && openWriters === 0) continue;
      if (seatWanted === "director" && !openDirector) continue;
      if (seatWanted === "writer" && openWriters === 0) continue;

      // The host: the seated director if there is one, else the owner
      // (a cast seeking a Director).
      const directorSeat = seats.find(
        (s) => s.seat.role === "director" && s.seat.status === "seated"
      );
      const hostUserId = directorSeat?.seat.userId ?? adventure.ownerId;
      const hostName = directorSeat
        ? (directorSeat.userName ?? directorSeat.userFallbackName ?? "—")
        : null;
      const record = await showUpRecord(hostUserId);
      const seatedWriters = seats.filter(
        (s) => s.seat.role === "writer" && s.seat.status === "seated"
      ).length;

      cards.push({
        id: adventure.id,
        title: storyTitle,
        premise: adventure.premise,
        genre: adventure.genre,
        pace: adventure.pace,
        status: adventure.status,
        openDirector,
        openWriters,
        seatedWriters,
        hostName,
        hostRecord: record,
        isMine:
          adventure.ownerId === session.user.id ||
          seats.some((s) => s.seat.userId === session.user.id),
        paceMatch: paceWanted ? adventure.pace === paceWanted : null,
        genreMatch: genreWanted ? adventure.genre === genreWanted : null,
      });
    }

    // Pace first, then genre, then the host's record.
    cards.sort((a, b) => {
      const pace = Number(b.paceMatch ?? 0) - Number(a.paceMatch ?? 0);
      if (pace !== 0) return pace;
      const genre = Number(b.genreMatch ?? 0) - Number(a.genreMatch ?? 0);
      if (genre !== 0) return genre;
      return (
        (b.hostRecord.onTimePct ?? -1) - (a.hostRecord.onTimePct ?? -1) ||
        b.hostRecord.finished - a.hostRecord.finished
      );
    });

    return NextResponse.json({ data: cards });
  } catch (error) {
    console.error("GET /api/adventures/board error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to read the board" } },
      { status: 500 }
    );
  }
}
