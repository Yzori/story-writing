import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  sessionRoster,
  playerCharacters,
  users,
  campaignSessions,
} from "@/server/db/schema";
import { eq, and, ne, inArray, notInArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { updateSessionRosterSchema } from "@/lib/validations";
import {
  verifyCollaboratorAccess,
  verifyStoryOwnership,
} from "@/server/services/collaboration";
import { applyRateLimit } from "@/server/api-utils";

type RouteParams = {
  params: Promise<{ storyId: string; sessionId: string }>;
};

/**
 * GET /api/stories/[storyId]/campaign/sessions/[sessionId]/roster
 * List roster for a session with character + user info.
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

    const { storyId, sessionId } = await params;

    const check = await verifyCollaboratorAccess(storyId, session.user.id);
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
            message: "Not a collaborator on this story",
          },
        },
        { status: 403 }
      );
    }

    // Verify session belongs to story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!campaignSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const roster = await db
      .select({
        id: sessionRoster.id,
        sessionId: sessionRoster.sessionId,
        characterId: sessionRoster.characterId,
        userId: sessionRoster.userId,
        status: sessionRoster.status,
        createdAt: sessionRoster.createdAt,
        character: {
          id: playerCharacters.id,
          name: playerCharacters.name,
          portrait: playerCharacters.portrait,
          status: playerCharacters.status,
        },
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(sessionRoster)
      .leftJoin(
        playerCharacters,
        eq(sessionRoster.characterId, playerCharacters.id)
      )
      .leftJoin(users, eq(sessionRoster.userId, users.id))
      .where(eq(sessionRoster.sessionId, sessionId));

    return NextResponse.json({ data: roster });
  } catch (error) {
    console.error(
      "GET /api/stories/[storyId]/campaign/sessions/[sessionId]/roster error:",
      error
    );
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch session roster",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/roster
 * GM sets who's present (bulk upsert). Characters in the list become present/introduced;
 * characters NOT in the list become absent.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const check = await verifyStoryOwnership(storyId, session.user.id);
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
            message: "Only the GM can update the roster",
          },
        },
        { status: 403 }
      );
    }

    // Verify session belongs to story
    const campaignSession = await db.query.campaignSessions.findFirst({
      where: and(
        eq(campaignSessions.id, sessionId),
        eq(campaignSessions.storyId, storyId)
      ),
    });
    if (!campaignSession) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSessionRosterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { characterIds } = parsed.data;

    // Fetch characters to get userId mapping
    const characters =
      characterIds.length > 0
        ? await db
            .select({
              id: playerCharacters.id,
              userId: playerCharacters.userId,
            })
            .from(playerCharacters)
            .where(
              and(
                eq(playerCharacters.storyId, storyId),
                inArray(playerCharacters.id, characterIds)
              )
            )
        : [];

    // Fetch existing roster entries for this session
    const existingEntries = await db
      .select()
      .from(sessionRoster)
      .where(eq(sessionRoster.sessionId, sessionId));

    const existingByCharId = new Map(
      existingEntries.map((e) => [e.characterId, e])
    );

    // For "introduced" detection: find characters that have been in ANY prior session roster
    // (any session for this story that is NOT the current session)
    const priorRosterEntries =
      characterIds.length > 0
        ? await db
            .select({
              characterId: sessionRoster.characterId,
            })
            .from(sessionRoster)
            .innerJoin(
              campaignSessions,
              eq(sessionRoster.sessionId, campaignSessions.id)
            )
            .where(
              and(
                eq(campaignSessions.storyId, storyId),
                ne(sessionRoster.sessionId, sessionId),
                inArray(sessionRoster.characterId, characterIds),
                eq(sessionRoster.status, "present")
              )
            )
        : [];

    const priorCharacterIds = new Set(
      priorRosterEntries.map((e) => e.characterId)
    );

    // Upsert each character in the list
    for (const char of characters) {
      const isIntroduced = !priorCharacterIds.has(char.id);
      const status = isIntroduced ? "introduced" : "present";
      const existing = existingByCharId.get(char.id);

      if (existing) {
        await db
          .update(sessionRoster)
          .set({ status })
          .where(eq(sessionRoster.id, existing.id));
      } else {
        await db.insert(sessionRoster).values({
          sessionId,
          characterId: char.id,
          userId: char.userId,
          status,
        });
      }
    }

    // Mark absent: all roster entries for this session NOT in the character list
    if (characterIds.length > 0) {
      const absentEntries = existingEntries.filter(
        (e) => !characterIds.includes(e.characterId)
      );
      for (const entry of absentEntries) {
        await db
          .update(sessionRoster)
          .set({ status: "absent" })
          .where(eq(sessionRoster.id, entry.id));
      }
    } else {
      // All absent
      if (existingEntries.length > 0) {
        await db
          .update(sessionRoster)
          .set({ status: "absent" })
          .where(eq(sessionRoster.sessionId, sessionId));
      }
    }

    // Fetch updated roster
    const updatedRoster = await db
      .select({
        id: sessionRoster.id,
        sessionId: sessionRoster.sessionId,
        characterId: sessionRoster.characterId,
        userId: sessionRoster.userId,
        status: sessionRoster.status,
        createdAt: sessionRoster.createdAt,
        character: {
          id: playerCharacters.id,
          name: playerCharacters.name,
          portrait: playerCharacters.portrait,
          status: playerCharacters.status,
        },
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(sessionRoster)
      .leftJoin(
        playerCharacters,
        eq(sessionRoster.characterId, playerCharacters.id)
      )
      .leftJoin(users, eq(sessionRoster.userId, users.id))
      .where(eq(sessionRoster.sessionId, sessionId));

    return NextResponse.json({ data: updatedRoster });
  } catch (error) {
    console.error(
      "PUT /api/stories/[storyId]/campaign/sessions/[sessionId]/roster error:",
      error
    );
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update session roster",
        },
      },
      { status: 500 }
    );
  }
}
