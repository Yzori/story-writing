import "server-only";
import { db } from "@/server/db";
import {
  chapters,
  campaignSessions,
  campaignTurns,
  campaignGold,
  characterMarks,
  playerCharacters,
} from "@/server/db/schema";
import { eq, and, asc, isNull, isNotNull, sql } from "drizzle-orm";
import { compileSessionToHTML } from "@/server/services/compile-session";
import { countWords } from "@/lib/utils";
import { isStoryTurnType } from "@/lib/campaign-turns";

type CompileResult =
  | { status: "compiled" | "already"; chapterId: string }
  | { status: "no-content"; chapterId?: never };

/**
 * Compile a session's turns into a draft chapter and atomically claim the
 * session (`chapterId`). Post-authorization core, shared by the GM compile
 * route and the cron auto-seal sweep — the caller owns the status/permission
 * gates. Idempotent: a session that already carries a chapter returns it.
 *
 * Concurrency: two callers can both pass the "chapterId is null" pre-check;
 * only one UPDATE flips the column. The loser deletes its orphan chapter and
 * returns the winner's id — same contract for the HTTP route and the sweep.
 */
export async function compileSessionToChapter(
  storyId: string,
  session: typeof campaignSessions.$inferSelect
): Promise<CompileResult> {
  if (session.chapterId) {
    return { status: "already", chapterId: session.chapterId };
  }

  const sessionId = session.id;

  const turns = await db
    .select({
      id: campaignTurns.id,
      userId: campaignTurns.userId,
      type: campaignTurns.type,
      content: campaignTurns.content,
      metadata: campaignTurns.metadata,
      characterName: playerCharacters.name,
    })
    .from(campaignTurns)
    .leftJoin(playerCharacters, eq(campaignTurns.characterId, playerCharacters.id))
    .where(eq(campaignTurns.sessionId, sessionId))
    .orderBy(asc(campaignTurns.sortOrder));

  const hasStoryContent =
    turns.some((t) => isStoryTurnType(t.type)) || !!session.opening;
  if (!hasStoryContent) {
    return { status: "no-content" };
  }

  const sessionMarks = await db
    .select({
      kind: characterMarks.kind,
      text: characterMarks.text,
      characterName: playerCharacters.name,
    })
    .from(characterMarks)
    .leftJoin(playerCharacters, eq(characterMarks.characterId, playerCharacters.id))
    .where(and(eq(characterMarks.sessionId, sessionId), eq(characterMarks.storyId, storyId)))
    .orderBy(asc(characterMarks.createdAt));

  const gildedRows = await db
    .selectDistinct({ turnId: campaignGold.turnId })
    .from(campaignGold)
    .where(and(eq(campaignGold.sessionId, sessionId), isNotNull(campaignGold.turnId)));

  const compiledHTML = compileSessionToHTML({
    sessionTitle: session.title,
    sessionOpening: session.opening,
    turns,
    marks: sessionMarks
      .filter((m): m is { kind: string; text: string; characterName: string } =>
        !!m.characterName && ["scar", "vow", "debt", "memory"].includes(m.kind),
      )
      .map((m) => ({
        kind: m.kind as "scar" | "vow" | "debt" | "memory",
        text: m.text,
        characterName: m.characterName,
      })),
    gildedTurnIds: gildedRows
      .map((r) => r.turnId)
      .filter((id): id is string => !!id),
  });

  const [maxResult] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${chapters.sortOrder}), -1)` })
    .from(chapters)
    .where(and(eq(chapters.storyId, storyId), isNull(chapters.deletedAt)));

  const nextOrder = (maxResult?.maxOrder ?? -1) + 1;
  const wordCount = countWords(compiledHTML);

  const [chapter] = await db
    .insert(chapters)
    .values({
      storyId,
      title: session.title,
      content: compiledHTML,
      wordCount,
      sortOrder: nextOrder,
      status: "draft",
      sessionId,
    })
    .returning();

  const claimed = await db
    .update(campaignSessions)
    .set({ chapterId: chapter.id })
    .where(and(eq(campaignSessions.id, sessionId), isNull(campaignSessions.chapterId)))
    .returning({ chapterId: campaignSessions.chapterId });

  if (claimed.length === 0) {
    // Lost the race — roll back our orphan and return the winner's claim.
    await db.delete(chapters).where(eq(chapters.id, chapter.id));
    const winner = await db.query.campaignSessions.findFirst({
      where: eq(campaignSessions.id, sessionId),
    });
    return { status: "already", chapterId: winner?.chapterId ?? chapter.id };
  }

  return { status: "compiled", chapterId: chapter.id };
}
