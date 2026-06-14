import "server-only";
import { db } from "@/server/db";
import { stories, collaborators, campaignSessions } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type StoryOwner = Pick<typeof stories.$inferSelect, "userId">;
type SessionActingGm = Pick<typeof campaignSessions.$inferSelect, "actingGmId">;

/**
 * The user currently empowered to RUN a session: the session's acting GM if one
 * is set (planned handoff or table-consented takeover), otherwise the story
 * owner. This governs session-running powers ONLY — narration, spotlight, rolls,
 * clocks, scene, floor, end & compile. Campaign ownership (transfer,
 * applications, charter) is always `story.userId`. See docs/adventure-audit.md (D2).
 */
export function resolveSessionGmId(story: StoryOwner, session: SessionActingGm): string {
  return session.actingGmId ?? story.userId;
}

/** Whether `userId` may run this session (acting GM or, by default, the owner). */
export function isSessionGm(story: StoryOwner, session: SessionActingGm, userId: string): boolean {
  return userId === resolveSessionGmId(story, session);
}

/**
 * Verify that a user may RUN a given session — i.e. they are the session's
 * running GM (acting GM if set, else the story owner). Loads the story and the
 * session (scoped to the story) and returns both. Use this for session-running
 * routes (spotlight, rolls, clocks, floor, end, compile…). Campaign-ownership
 * actions (transfer, applications, charter) must keep using verifyStoryOwnership.
 */
export async function verifySessionGmAccess(
  storyId: string,
  sessionId: string,
  userId: string
): Promise<
  | { story: typeof stories.$inferSelect; session: typeof campaignSessions.$inferSelect; error?: never }
  | { error: "NOT_FOUND" | "FORBIDDEN"; story?: never; session?: never }
> {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });
  if (!story) return { error: "NOT_FOUND" };

  const session = await db.query.campaignSessions.findFirst({
    where: eq(campaignSessions.id, sessionId),
  });
  if (!session || session.storyId !== storyId) return { error: "NOT_FOUND" };

  if (!isSessionGm(story, session, userId)) return { error: "FORBIDDEN" };

  return { story, session };
}

/**
 * Verify that a user has collaborator-level access to a story.
 * Returns the story if the user is the owner or an accepted collaborator.
 * Returns an error string otherwise.
 */
export async function verifyCollaboratorAccess(
  storyId: string,
  userId: string
): Promise<
  | { story: typeof stories.$inferSelect; error?: never }
  | { error: "NOT_FOUND" | "FORBIDDEN"; story?: never }
> {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });

  if (!story) return { error: "NOT_FOUND" };

  // Owner always has access
  if (story.userId === userId) return { story };

  // Check if user is an accepted collaborator
  const collab = await db.query.collaborators.findFirst({
    where: and(
      eq(collaborators.storyId, storyId),
      eq(collaborators.userId, userId),
      eq(collaborators.status, "accepted")
    ),
  });

  if (!collab) return { error: "FORBIDDEN" };

  return { story };
}

/**
 * Verify that a user is the owner of a story.
 */
export async function verifyStoryOwnership(
  storyId: string,
  userId: string
): Promise<
  | { story: typeof stories.$inferSelect; error?: never }
  | { error: "NOT_FOUND" | "FORBIDDEN"; story?: never }
> {
  const story = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), isNull(stories.deletedAt)),
  });

  if (!story) return { error: "NOT_FOUND" };
  if (story.userId !== userId) return { error: "FORBIDDEN" };

  return { story };
}
