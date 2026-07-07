import "server-only";
import { db } from "@/server/db";
import {
  chapters,
  stories,
  users,
  agreements,
  campaignSessions,
  campaignTurns,
  campaignGold,
  characterMarks,
  playerCharacters,
} from "@/server/db/schema";
import { eq, and, asc, desc, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import {
  compileSessionToHTML,
  type CompileContributor,
  type CompileSplit,
} from "@/server/services/compile-session";
import { resolveSplitRecipients } from "@/server/services/ink-drops";
import { countWords } from "@/lib/utils";
import { isStoryTurnType } from "@/lib/campaign-turns";
import { safeParseJson } from "@/lib/safe-json";

type ColophonTurn = { userId: string; type: string; content: string; characterName: string | null };

/**
 * Build the colophon data — the hands that made the book and how the take
 * splits. Word counts come from story turns; display names from users; the
 * split is resolved the SAME way distributeEarnings pays it (via the shared
 * resolveSplitRecipients), so the receipt on the page can't drift from the pay.
 */
async function buildColophon(
  storyId: string,
  session: typeof campaignSessions.$inferSelect,
  turns: ColophonTurn[]
): Promise<{ contributors: CompileContributor[]; split: CompileSplit | null; gmUserId: string }> {
  const [story] = await db
    .select({ ownerId: stories.userId })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  const ownerId = story?.ownerId ?? session.storyId;
  const gmUserId = session.actingGmId ?? ownerId;

  // Words + character per author, over story turns only.
  const byUser = new Map<string, { words: number; characterName: string | null }>();
  for (const t of turns) {
    if (!isStoryTurnType(t.type)) continue;
    const cur = byUser.get(t.userId) ?? { words: 0, characterName: null };
    cur.words += countWords(t.content);
    if (!cur.characterName && t.characterName) cur.characterName = t.characterName;
    byUser.set(t.userId, cur);
  }

  const userIds = [...byUser.keys()];
  const nameRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const displayNameOf = (userId: string) => {
    const r = nameRows.find((n) => n.id === userId);
    return r?.displayName || r?.name || "a writer";
  };

  const contributors: CompileContributor[] = userIds
    .map((userId) => {
      const info = byUser.get(userId)!;
      const isDirector = userId === gmUserId;
      return {
        userId,
        role: info.characterName ?? (isDirector ? "the Director" : "a writer"),
        displayName: displayNameOf(userId),
        words: info.words,
        isDirector,
      };
    })
    // Director first, then the players by contribution.
    .sort((a, b) => (a.isDirector === b.isDirector ? b.words - a.words : a.isDirector ? -1 : 1));

  // The split, resolved exactly as the ledger pays it.
  const [agreement] = await db
    .select({ splits: agreements.splits })
    .from(agreements)
    .where(and(eq(agreements.storyId, storyId), eq(agreements.status, "active")))
    .orderBy(desc(agreements.version))
    .limit(1);
  const validSplits = (agreement
    ? safeParseJson<{ userId: string; percent: number }[]>(agreement.splits, [])
    : []
  ).filter((s) => typeof s?.userId === "string" && s.percent > 0);

  const { recipients, usedAgreement } = resolveSplitRecipients(
    validSplits,
    userIds,
    ownerId
  );
  const totalWeight = recipients.reduce((sum, r) => sum + r.weight, 0) || 1;
  const split: CompileSplit = {
    usedAgreement,
    ownerId,
    shares: recipients.map((r) => ({
      userId: r.userId,
      percent: (r.weight / totalWeight) * 100,
    })),
  };

  return { contributors, split, gmUserId };
}

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

  const { contributors, split, gmUserId } = await buildColophon(storyId, session, turns);

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
    contributors,
    split,
    gmUserId,
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
