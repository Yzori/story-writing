import { db } from "@/lib/db";
import { stories, collaborators } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
