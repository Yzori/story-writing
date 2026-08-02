import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  users,
  stories,
  chapters,
  comments,
  sparks,
  follows,
  notifications,
  writingSessions,
  collaborators,
  reactions,
  playerCharacters,
  readingProgress,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { applyRateLimit, errorResponse, handleRouteError } from "@/server/api-utils";

/**
 * GET /api/account/export
 * GDPR Art. 15 — Right of access / data portability.
 * Returns a JSON dump of all user data.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const limited = applyRateLimit(request, session.user.id, "read", {
      max: 3,
      windowSeconds: 3600,
    });
    if (limited) return limited;

    const userId = session.user.id;

    // Fetch all user data in parallel
    const [
      [userData],
      userStories,
      userChapters,
      userComments,
      userSparks,
      userFollows,
      userNotifications,
      userSessions,
      userCollabs,
      userReactions,
      userCharacters,
      userProgress,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          displayName: users.displayName,
          bio: users.bio,
          role: users.role,
          comfortRating: users.comfortRating,
          readingMode: users.readingMode,
          readingFont: users.readingFont,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db
        .select({
          id: stories.id,
          title: stories.title,
          format: stories.format,
          synopsis: stories.synopsis,
          genres: stories.genres,
          status: stories.status,
          createdAt: stories.createdAt,
        })
        .from(stories)
        .where(eq(stories.userId, userId)),
      db
        .select({
          id: chapters.id,
          storyId: chapters.storyId,
          title: chapters.title,
          content: chapters.content,
          wordCount: chapters.wordCount,
          createdAt: chapters.createdAt,
        })
        .from(chapters)
        .innerJoin(stories, eq(chapters.storyId, stories.id))
        .where(eq(stories.userId, userId)),
      db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(eq(comments.userId, userId)),
      db
        .select({ storyId: sparks.storyId, createdAt: sparks.createdAt })
        .from(sparks)
        .where(eq(sparks.userId, userId)),
      db
        .select({ storyId: follows.storyId, createdAt: follows.createdAt })
        .from(follows)
        .where(eq(follows.userId, userId)),
      db
        .select({
          type: notifications.type,
          message: notifications.message,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
      db
        .select({
          id: writingSessions.id,
          storyId: writingSessions.storyId,
          wordsWritten: writingSessions.wordsWritten,
          durationMinutes: writingSessions.durationMinutes,
          createdAt: writingSessions.createdAt,
        })
        .from(writingSessions)
        .where(eq(writingSessions.userId, userId)),
      db
        .select({
          storyId: collaborators.storyId,
          role: collaborators.role,
          status: collaborators.status,
          createdAt: collaborators.createdAt,
        })
        .from(collaborators)
        .where(eq(collaborators.userId, userId)),
      db
        .select({
          chapterId: reactions.chapterId,
          type: reactions.type,
          createdAt: reactions.createdAt,
        })
        .from(reactions)
        .where(eq(reactions.userId, userId)),
      db
        .select({
          id: playerCharacters.id,
          name: playerCharacters.name,
          createdAt: playerCharacters.createdAt,
        })
        .from(playerCharacters)
        .where(eq(playerCharacters.userId, userId)),
      db
        .select({
          storyId: readingProgress.storyId,
          chapterId: readingProgress.chapterId,
          updatedAt: readingProgress.updatedAt,
        })
        .from(readingProgress)
        .where(eq(readingProgress.userId, userId)),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userData,
      stories: userStories,
      chapters: userChapters,
      comments: userComments,
      sparks: userSparks,
      follows: userFollows,
      notifications: userNotifications,
      writingSessions: userSessions,
      collaborations: userCollabs,
      reactions: userReactions,
      characters: userCharacters,
      readingProgress: userProgress,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="quiloria-data-export-${userId}.json"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/account/export");
  }
}
