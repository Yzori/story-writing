import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  stories,
  suggestions,
  openCalls,
  openCallResponses,
  campaignApplications,
  campaignSessions,
  commissions,
} from "@/server/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";

/**
 * GET /api/user/attention
 *
 * Aggregates "things waiting on you" across stories the user owns —
 * suggestions to review, open-call pitches, campaign applicants, commission
 * requests. Used by the Dashboard "Today" widget.
 *
 * Each section returns at most a few items so the widget stays scannable.
 * Counts reflect the *total* pending items, not just the previewed ones.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    // Stories the user owns — needed for almost every other lookup.
    const ownedStories = await db
      .select({
        id: stories.id,
        title: stories.title,
        slug: stories.slug,
        writingMode: stories.writingMode,
      })
      .from(stories)
      .where(and(eq(stories.userId, userId), isNull(stories.deletedAt)));

    const ownedStoryIds = ownedStories.map((s) => s.id);
    const storyById = new Map(ownedStories.map((s) => [s.id, s]));

    // ── 1. Pending suggestions on owned stories ──────────────
    const pendingSuggestions =
      ownedStoryIds.length > 0
        ? await db
            .select({
              id: suggestions.id,
              storyId: suggestions.storyId,
              chapterId: suggestions.chapterId,
              note: suggestions.note,
              createdAt: suggestions.createdAt,
            })
            .from(suggestions)
            .where(
              and(
                inArray(suggestions.storyId, ownedStoryIds),
                eq(suggestions.status, "pending"),
              ),
            )
            .orderBy(suggestions.createdAt)
            .limit(50)
        : [];

    // ── 2. Pending open-call responses ───────────────────────
    const myCalls =
      ownedStoryIds.length > 0
        ? await db
            .select({ id: openCalls.id, storyId: openCalls.storyId, role: openCalls.role, title: openCalls.title })
            .from(openCalls)
            .where(inArray(openCalls.storyId, ownedStoryIds))
        : [];
    const callIds = myCalls.map((c) => c.id);
    const callById = new Map(myCalls.map((c) => [c.id, c]));

    const pendingPitches =
      callIds.length > 0
        ? await db
            .select({
              id: openCallResponses.id,
              callId: openCallResponses.callId,
              createdAt: openCallResponses.createdAt,
            })
            .from(openCallResponses)
            .where(
              and(
                inArray(openCallResponses.callId, callIds),
                eq(openCallResponses.status, "pending"),
              ),
            )
            .limit(50)
        : [];

    // ── 3. Campaign applicants awaiting decision ─────────────
    const campaignStoryIds = ownedStories
      .filter((s) => s.writingMode === "campaign")
      .map((s) => s.id);
    const pendingApplicants =
      campaignStoryIds.length > 0
        ? await db
            .select({
              id: campaignApplications.id,
              storyId: campaignApplications.storyId,
              createdAt: campaignApplications.createdAt,
            })
            .from(campaignApplications)
            .where(
              and(
                inArray(campaignApplications.storyId, campaignStoryIds),
                eq(campaignApplications.status, "pending"),
              ),
            )
            .limit(50)
        : [];

    // ── 4. Campaign sessions in draft (haven't started yet) ──
    const draftSessions =
      campaignStoryIds.length > 0
        ? await db
            .select({
              id: campaignSessions.id,
              storyId: campaignSessions.storyId,
              title: campaignSessions.title,
            })
            .from(campaignSessions)
            .where(
              and(
                inArray(campaignSessions.storyId, campaignStoryIds),
                eq(campaignSessions.status, "draft"),
              ),
            )
            .limit(20)
        : [];

    // ── 5. Commission requests awaiting your quote/response ──
    // (Artisan side — commissions where the user is the artisan and status is requested)
    const incomingCommissions = await db
      .select({
        id: commissions.id,
        brief: commissions.brief,
        patronId: commissions.patronId,
        createdAt: commissions.createdAt,
      })
      .from(commissions)
      .where(and(eq(commissions.artisanId, userId), eq(commissions.status, "requested")))
      .limit(20);

    // ── Build response items ─────────────────────────────────
    const items: Array<{
      kind: string;
      label: string;
      detail?: string;
      href: string;
      createdAt: string;
    }> = [];

    for (const s of pendingSuggestions.slice(0, 3)) {
      const story = storyById.get(s.storyId);
      if (!story) continue;
      items.push({
        kind: "suggestion",
        label: `Review suggestion on ${story.title}`,
        detail: s.note ?? undefined,
        href: `/story/${story.slug ?? story.id}/workshop`,
        createdAt: s.createdAt as unknown as string,
      });
    }

    for (const p of pendingPitches.slice(0, 3)) {
      const call = callById.get(p.callId);
      const story = call ? storyById.get(call.storyId) : null;
      if (!call || !story) continue;
      items.push({
        kind: "pitch",
        label: `Review pitch for "${call.title}"`,
        detail: `${call.role} role`,
        href: `/story/${story.slug ?? story.id}/calls`,
        createdAt: p.createdAt as unknown as string,
      });
    }

    for (const a of pendingApplicants.slice(0, 3)) {
      const story = storyById.get(a.storyId);
      if (!story) continue;
      items.push({
        kind: "applicant",
        label: `Review campaign applicant for ${story.title}`,
        href: `/campaign/${story.id}`,
        createdAt: a.createdAt as unknown as string,
      });
    }

    for (const c of incomingCommissions.slice(0, 3)) {
      const briefPreview = c.brief.length > 60 ? c.brief.slice(0, 60) + "…" : c.brief;
      items.push({
        kind: "commission",
        label: `Quote a commission`,
        detail: briefPreview,
        href: `/scriptorium/commissions/${c.id}`,
        createdAt: c.createdAt as unknown as string,
      });
    }

    return NextResponse.json({
      data: {
        items,
        counts: {
          suggestions: pendingSuggestions.length,
          pitches: pendingPitches.length,
          applicants: pendingApplicants.length,
          draftSessions: draftSessions.length,
          commissions: incomingCommissions.length,
          total:
            pendingSuggestions.length +
            pendingPitches.length +
            pendingApplicants.length +
            incomingCommissions.length,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/user/attention error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load attention items" } },
      { status: 500 },
    );
  }
}
