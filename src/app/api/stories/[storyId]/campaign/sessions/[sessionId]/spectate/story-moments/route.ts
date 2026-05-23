import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";
import { db } from "@/server/db";
import {
  campaignSessions,
  campaignTurns,
  stories,
  storyMomentAmplifications,
} from "@/server/db/schema";
import { isLegacyCinematicSceneBreak } from "@/lib/campaign-turns";
import { storyMomentAmplificationSchema } from "@/lib/validations";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

async function verifyPublicSession(storyId: string, sessionId: string) {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.isPublic, true), isNull(stories.deletedAt)),
  });
  if (!story) return null;

  const session = await db.query.campaignSessions.findFirst({
    where: and(eq(campaignSessions.id, sessionId), eq(campaignSessions.storyId, storyId)),
  });
  return session ? { story, session } : null;
}

async function getMomentTurnIds(sessionId: string) {
  const turns = await db
    .select({
      id: campaignTurns.id,
      type: campaignTurns.type,
      metadata: campaignTurns.metadata,
    })
    .from(campaignTurns)
    .where(eq(campaignTurns.sessionId, sessionId));

  return turns
    .filter((turn) => turn.type === "story-moment" || isLegacyCinematicSceneBreak(turn.type, turn.metadata))
    .map((turn) => turn.id);
}

async function getAmplificationState(sessionId: string, token: string | null) {
  const turnIds = await getMomentTurnIds(sessionId);
  if (turnIds.length === 0) {
    return { counts: {}, amplifiedTurnIds: [] };
  }

  const rows = await db
    .select({
      turnId: storyMomentAmplifications.turnId,
      count: sql<number>`count(*)`,
    })
    .from(storyMomentAmplifications)
    .where(and(
      eq(storyMomentAmplifications.sessionId, sessionId),
      inArray(storyMomentAmplifications.turnId, turnIds),
    ))
    .groupBy(storyMomentAmplifications.turnId);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.turnId] = Number(row.count ?? 0);
  }

  let amplifiedTurnIds: string[] = [];
  if (token) {
    const mine = await db
      .select({ turnId: storyMomentAmplifications.turnId })
      .from(storyMomentAmplifications)
      .where(and(
        eq(storyMomentAmplifications.sessionId, sessionId),
        eq(storyMomentAmplifications.token, token),
        inArray(storyMomentAmplifications.turnId, turnIds),
      ));
    amplifiedTurnIds = mine.map((row) => row.turnId);
  }

  return { counts, amplifiedTurnIds };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "read", { max: 60, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const verified = await verifyPublicSession(storyId, sessionId);
    if (!verified) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const token = request.nextUrl.searchParams.get("token");
    return NextResponse.json({ data: await getAmplificationState(sessionId, token) });
  } catch (error) {
    console.error("GET story moment amplifications error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load story moment amplifications" } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rl = applyRateLimit(request, null, "write", { max: 12, windowSeconds: 60 });
    if (rl) return rl;

    const { storyId, sessionId } = await params;
    const verified = await verifyPublicSession(storyId, sessionId);
    if (!verified) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = storyMomentAmplificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 },
      );
    }

    const turn = await db.query.campaignTurns.findFirst({
      where: and(eq(campaignTurns.id, parsed.data.turnId), eq(campaignTurns.sessionId, sessionId)),
    });
    if (!turn || (turn.type !== "story-moment" && !isLegacyCinematicSceneBreak(turn.type, turn.metadata))) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Only story moments can be amplified" } },
        { status: 400 },
      );
    }

    const authSession = await auth();
    await db
      .insert(storyMomentAmplifications)
      .values({
        sessionId,
        turnId: turn.id,
        token: parsed.data.token,
        userId: authSession?.user?.id ?? null,
      })
      .onConflictDoNothing({
        target: [storyMomentAmplifications.turnId, storyMomentAmplifications.token],
      });

    return NextResponse.json({ data: await getAmplificationState(sessionId, parsed.data.token) });
  } catch (error) {
    console.error("POST story moment amplification error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to amplify story moment" } },
      { status: 500 },
    );
  }
}
