import { NextRequest, NextResponse } from "next/server";
import {
  processCircleRenewals,
  processCommissionAutoComplete,
  resetAIUsageCounters,
} from "@/server/services/scheduled-jobs";

/**
 * POST /api/cron
 * Runs scheduled jobs: Circle renewals + commission auto-complete.
 * Protected by a secret token. Call via external cron (e.g., Vercel Cron, GitHub Actions).
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  try {
    const [renewalResults, autoCompleteResults, aiResetResults] = await Promise.all([
      processCircleRenewals(),
      processCommissionAutoComplete(),
      resetAIUsageCounters(),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      renewals: renewalResults,
      autoComplete: autoCompleteResults,
      aiReset: aiResetResults,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Cron job failed" } },
      { status: 500 }
    );
  }
}
