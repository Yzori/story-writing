import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  processCircleRenewals,
  processCommissionAutoComplete,
  resetAIUsageCounters,
  processEmailDigests,
  processCampaignAbandonment,
  processAdventureDeadlines,
} from "@/server/services/scheduled-jobs";

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
}
