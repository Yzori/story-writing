import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  processCircleRenewals,
  processCommissionAutoComplete,
  resetAIUsageCounters,
  processEmailDigests,
  processCampaignAbandonment,
  processAdventureDeadlines,
} from "@/server/services/scheduled-jobs";

/** App-wide advisory lock id for the cron sweep (arbitrary, stable). */
const CRON_LOCK_ID = 7_201_965;

/**
 * POST /api/cron
 * Runs scheduled jobs: Circle renewals + commission auto-complete.
 * Protected by a secret token. Call via external cron (e.g., Vercel Cron, GitHub Actions).
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (timing-safe: length equality first, then constant-time body compare)
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  const expected = cronSecret ? Buffer.from(`Bearer ${cronSecret}`) : null;
  const provided = Buffer.from(authHeader);

  if (
    !expected ||
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  // Transaction-scoped advisory lock: overlapping cron invocations
  // (retries, multiple instances) are what turn the jobs' select-then-
  // update spots into real duplicates. The loser skips cleanly instead
  // of racing. xact-scoped so release is automatic on the same
  // connection — a pooled session-level unlock could land elsewhere.
  // The jobs open their own connections; only the lock lives here.
  return await db.transaction(async (tx) => {
    const [lock] = await tx.execute(
      sql`SELECT pg_try_advisory_xact_lock(${CRON_LOCK_ID}) AS acquired`
    );
    if (!(lock as { acquired?: boolean } | undefined)?.acquired) {
      return NextResponse.json({
        skipped: true,
        reason: "Another cron run is in progress",
        timestamp: new Date().toISOString(),
      });
    }

    // allSettled: one failing job must not hide the results of jobs that
    // already committed their work (these are not transactional siblings).
    const jobs = {
      renewals: processCircleRenewals(),
      autoComplete: processCommissionAutoComplete(),
      aiReset: resetAIUsageCounters(),
      digests: processEmailDigests(),
      abandonment: processCampaignAbandonment(),
      adventures: processAdventureDeadlines(),
    };

    const settled = await Promise.allSettled(Object.values(jobs));
    const names = Object.keys(jobs);

    const results: Record<string, unknown> = { timestamp: new Date().toISOString() };
    let failures = 0;
    settled.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") {
        results[names[i]] = outcome.value;
      } else {
        failures += 1;
        console.error(`Cron job ${names[i]} error:`, outcome.reason);
        results[names[i]] = { error: "failed" };
      }
    });

    return NextResponse.json(results, { status: failures > 0 ? 500 : 200 });
  });
}
