import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  adventurePassages,
  adventures,
  adventureScenes,
  adventureSeats,
  chapters,
  collaborators,
  stories,
  users,
} from "@/server/db/schema";
import { countWords } from "@/lib/utils";
import { createNotification } from "@/server/services/notifications";

type EndStatus = "finished" | "abandoned";

export type CompileAdventureResult =
  | { status: "compiled"; chapterIds: string[] }
  | { status: "already" }
  | { status: "no-content" };

/**
 * Close the book: atomically flip the adventure out of 'running'
 * (the flip IS the compile claim — losers of a race see 'already'),
 * compile each act into one published chapter on the linked story,
 * stamp the colophon into the last chapter, make the story public,
 * and seat every writer as a story collaborator so credits and
 * future splits exist. Every seat is told the book is closed.
 */
export async function compileAdventure(
  adventureId: string,
  endStatus: EndStatus
): Promise<CompileAdventureResult> {
  const now = new Date();
  // Nothing written → nothing to close; bail before claiming so the
  // adventure stays running.
  const passages = await db
    .select()
    .from(adventurePassages)
    .where(eq(adventurePassages.adventureId, adventureId))
    .orderBy(asc(adventurePassages.sortOrder));
  if (passages.length === 0) return { status: "no-content" };

  // Claim + compile + publish are one transaction: without it, a crash
  // after the status flip leaves a 'finished' adventure with zero
  // chapters, and every retry short-circuits on the claim — the book
  // would be unrecoverable through this path.
  const compiled = await db.transaction(async (tx) => {
    // Atomically flip out of 'running' — the flip is the compile claim.
    const [claimed] = await tx
      .update(adventures)
      .set({ status: endStatus, updatedAt: now })
      .where(and(eq(adventures.id, adventureId), eq(adventures.status, "running")))
      .returning();
    if (!claimed) return { status: "already" as const };

    const scenes = await tx
      .select()
      .from(adventureScenes)
      .where(eq(adventureScenes.adventureId, adventureId));
    const sceneById = new Map(scenes.map((s) => [s.id, s] as const));

    const seatRows = await tx
      .select({
        seat: adventureSeats,
        userName: users.displayName,
        userFallback: users.name,
      })
      .from(adventureSeats)
      .leftJoin(users, eq(adventureSeats.userId, users.id))
      .where(eq(adventureSeats.adventureId, adventureId));

    // Passages per act, in page order.
    const actNos = [...new Set(passages.map((p) => sceneById.get(p.sceneId)?.actNo ?? 1))].sort(
      (a, b) => a - b
    );

    const [story] = await tx
      .select({ id: stories.id, ownerId: stories.userId, title: stories.title })
      .from(stories)
      .where(eq(stories.id, claimed.storyId));
    if (!story) return { status: "no-content" as const };

    const [maxResult] = await tx
      .select({ maxOrder: sql<number>`coalesce(max(${chapters.sortOrder}), -1)` })
      .from(chapters)
      .where(and(eq(chapters.storyId, story.id), isNull(chapters.deletedAt)));
    let nextOrder = (maxResult?.maxOrder ?? -1) + 1;

    const chapterIds: string[] = [];
    for (const actNo of actNos) {
      const actPassages = passages.filter(
        (p) => (sceneById.get(p.sceneId)?.actNo ?? 1) === actNo
      );
      let html = "";
      let lastSceneId: string | null = null;
      for (const passage of actPassages) {
        if (passage.sceneId !== lastSceneId) {
          lastSceneId = passage.sceneId;
          const scene = sceneById.get(passage.sceneId);
          if (scene) {
            html += scene.title
              ? `<h3>${escapeHtml(scene.title)}</h3>\n`
              : `<hr>\n`;
          }
        }
        html += passage.content + "\n";
      }
      const isLastAct = actNo === actNos[actNos.length - 1];
      if (isLastAct) html += colophonHtml(seatRows, passages, endStatus);

      const [chapter] = await tx
        .insert(chapters)
        .values({
          storyId: story.id,
          title: actNos.length > 1 ? `Act ${actNo}` : "The Adventure",
          content: html,
          wordCount: countWords(html),
          sortOrder: nextOrder++,
          status: "published",
        })
        .returning({ id: chapters.id });
      chapterIds.push(chapter.id);
    }

    // The finished book is readable — that's the promise on the rail.
    await tx
      .update(stories)
      .set({ isPublic: true, status: "complete", updatedAt: now })
      .where(eq(stories.id, story.id));

    // Everyone at the table is a collaborator on the book.
    const seatedUserIds = [
      ...new Set(
        seatRows
          .map((row) => row.seat.userId)
          .filter((id): id is string => !!id && id !== story.ownerId)
      ),
    ];
    if (seatedUserIds.length > 0) {
      await tx
        .insert(collaborators)
        .values(
          seatedUserIds.map((userId) => ({
            storyId: story.id,
            userId,
            role: "writer" as const,
            status: "accepted" as const,
            invitedBy: story.ownerId,
          }))
        )
        .onConflictDoNothing();
    }

    return {
      status: "compiled" as const,
      chapterIds,
      storyTitle: story.title,
      notifyIds: [
        ...new Set(
          seatRows.map((row) => row.seat.userId).filter((id): id is string => !!id)
        ),
      ],
    };
  });

  if (compiled.status !== "compiled") return compiled;
  const { chapterIds, storyTitle, notifyIds } = compiled;
  // Side effects stay outside the transaction — a notification hiccup
  // must not roll the compiled book back. Awaited so a serverless
  // instance can't freeze before the inserts land.
  for (const userId of notifyIds) {
    await createNotification(
      userId,
      "adventure",
      endStatus === "finished"
        ? `The book is closed — "${storyTitle}" is compiled and readable`
        : `"${storyTitle}" went quiet — what was written is compiled`,
      `/adventures/${adventureId}`
    ).catch(() => {});
  }

  return { status: "compiled", chapterIds };
}

function colophonHtml(
  seatRows: Array<{
    seat: typeof adventureSeats.$inferSelect;
    userName: string | null;
    userFallback: string | null;
  }>,
  passages: Array<typeof adventurePassages.$inferSelect>,
  endStatus: EndStatus
): string {
  const wordsBySeat = new Map<string, number>();
  for (const passage of passages) {
    wordsBySeat.set(
      passage.seatId,
      (wordsBySeat.get(passage.seatId) ?? 0) + passage.wordCount
    );
  }
  const played = seatRows
    .filter((row) => row.seat.userId && (wordsBySeat.get(row.seat.id) ?? 0) > 0)
    .sort((a, b) => {
      if (a.seat.role !== b.seat.role) return a.seat.role === "director" ? -1 : 1;
      return (wordsBySeat.get(b.seat.id) ?? 0) - (wordsBySeat.get(a.seat.id) ?? 0);
    });
  const lines = played
    .map((row) => {
      const name = escapeHtml(row.userName ?? row.userFallback ?? "a writer");
      const as =
        row.seat.role === "director"
          ? "the Director"
          : row.seat.characterName
            ? `as ${escapeHtml(row.seat.characterName)}`
            : "a writer";
      return `<p>${name} — ${as}</p>`;
    })
    .join("\n");
  return `
<hr>
<section data-type="colophon">
<h3>Written at the table</h3>
${lines}
<p><em>${
    endStatus === "finished"
      ? "An adventure, played to its end."
      : "An adventure, as far as the table carried it."
  }</em></p>
</section>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
