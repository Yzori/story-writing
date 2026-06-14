import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { characterChampions, playerCharacters } from "@/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = { params: Promise<{ storyId: string; characterId: string }> };

async function championState(characterId: string, userId: string | null) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(characterChampions)
    .where(eq(characterChampions.characterId, characterId));
  let championed = false;
  if (userId) {
    const mine = await db.query.characterChampions.findFirst({
      where: and(
        eq(characterChampions.characterId, characterId),
        eq(characterChampions.userId, userId),
      ),
    });
    championed = Boolean(mine);
  }
  return { count, championed };
}

/** GET — champion count for a character (+ whether the caller champions it). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { characterId } = await params;
  const session = await auth();
  return NextResponse.json({ data: await championState(characterId, session?.user?.id ?? null) });
}

/** POST — champion a character. Auth required. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to champion a character" } }, { status: 401 });
    }
    const rl = applyRateLimit(request, session.user.id, "write");
    if (rl) return rl;

    const { storyId, characterId } = await params;
    const character = await db.query.playerCharacters.findFirst({
      where: and(eq(playerCharacters.id, characterId), eq(playerCharacters.storyId, storyId)),
    });
    if (!character) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Character not found" } }, { status: 404 });
    }

    await db
      .insert(characterChampions)
      .values({ userId: session.user.id, characterId, storyId })
      .onConflictDoNothing();

    return NextResponse.json({ data: await championState(characterId, session.user.id) });
  } catch (error) {
    console.error("POST champion error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to champion" } }, { status: 500 });
  }
}

/** DELETE — stop championing. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    const { characterId } = await params;
    await db
      .delete(characterChampions)
      .where(and(eq(characterChampions.characterId, characterId), eq(characterChampions.userId, session.user.id)));
    return NextResponse.json({ data: await championState(characterId, session.user.id) });
  } catch (error) {
    console.error("DELETE champion error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to remove champion" } }, { status: 500 });
  }
}
