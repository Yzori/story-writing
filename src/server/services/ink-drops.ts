import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { agreements, inkDropTransactions } from "@/server/db/schema";
import type * as schema from "@/server/db/schema";
import type * as authSchema from "@/server/db/auth-schema";
import { CREATOR_SHARE } from "@/lib/constants";
import { safeParseJson } from "@/lib/safe-json";

type FullSchema = typeof schema & typeof authSchema;
type DrizzleTx = PgTransaction<
  PostgresJsQueryResultHKT,
  FullSchema,
  ExtractTablesWithRelations<FullSchema>
>;

/**
 * Debit a user's Ink Drop balance within a transaction.
 * Locks the row, checks balance, debits sender, credits recipient (70/30 split).
 *
 * @returns { success: true, balance } or { error: "INSUFFICIENT_BALANCE", balance }
 */
export async function transferDrops(
  tx: DrizzleTx,
  opts: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: string;
    message: string;
    sessionId?: string;
  }
): Promise<
  | { success: true; newBalance: number }
  | { error: "INSUFFICIENT_BALANCE"; balance: number }
> {
  const { fromUserId, toUserId, amount, type, message, sessionId } = opts;
  const creatorShare = Math.floor(amount * CREATOR_SHARE);

  // Lock sender row and check balance
  const [sender] = await tx.execute(
    sql`SELECT ink_drop_balance FROM users WHERE id = ${fromUserId} FOR UPDATE`
  );
  const balance = Number((sender as { ink_drop_balance?: number | string } | undefined)?.ink_drop_balance ?? 0);

  if (balance < amount) {
    return { error: "INSUFFICIENT_BALANCE", balance };
  }

  // Debit sender
  await tx.execute(
    sql`UPDATE users SET ink_drop_balance = ink_drop_balance - ${amount} WHERE id = ${fromUserId}`
  );

  // Credit recipient (70%)
  await tx.execute(
    sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${creatorShare} WHERE id = ${toUserId}`
  );

  // Log transaction
  await tx.insert(inkDropTransactions).values({
    fromUserId,
    toUserId,
    amount,
    type,
    message,
    sessionId: sessionId ?? null,
  });

  return { success: true, newBalance: balance - amount };
}

/**
 * One share of a distributed payment.
 * `gross` is the portion of the payment attributed to this maker (what the
 * ledger records); `credited` is what actually lands in their balance after
 * the platform cut (`floor(gross * CREATOR_SHARE)`).
 */
export type EarningShare = { userId: string; gross: number; credited: number };

/**
 * Split a gross payment across makers by weight, allocating whole Ink Drops.
 * Floor each share, then hand the rounding remainder to the owner (or, if the
 * owner isn't a recipient, the first one) so the parts always sum back to
 * `gross`. Pure — no I/O — so the allocation math is unit-testable on its own.
 *
 * Recipients are assumed unique by userId; callers dedupe before calling.
 */
export function allocateShares(
  gross: number,
  recipients: { userId: string; weight: number }[],
  ownerId: string,
  creatorShare: number = CREATOR_SHARE
): EarningShare[] {
  if (gross <= 0 || recipients.length === 0) return [];

  const totalWeight = recipients.reduce((sum, r) => sum + r.weight, 0);
  const effective =
    totalWeight > 0
      ? recipients
      : // Degenerate weights (all zero) → everything to the owner.
        [{ userId: ownerId, weight: 1 }];
  const divisor = totalWeight > 0 ? totalWeight : 1;

  const shares: EarningShare[] = effective.map((r) => ({
    userId: r.userId,
    gross: Math.floor((gross * r.weight) / divisor),
    credited: 0,
  }));

  const remainder = gross - shares.reduce((sum, s) => sum + s.gross, 0);
  if (remainder > 0) {
    const target = shares.find((s) => s.userId === ownerId) ?? shares[0];
    target.gross += remainder;
  }

  for (const share of shares) {
    share.credited = Math.floor(share.gross * creatorShare);
  }

  return shares.filter((s) => s.gross > 0);
}

/**
 * Pay a gross Ink-Drop payment out to the makers — the one place the money
 * path honors a signed agreement.
 *
 * Precedence:
 *  1. An **active** agreement's signed `splits` → pay each participant by
 *     their percent (the consent layer, finally enforced).
 *  2. Else `fallbackRecipients` → even split across them (e.g. the campaign
 *     cast for gold).
 *  3. Else → all to the story owner.
 *
 * Credits `floor(gross * CREATOR_SHARE)` per share and records the *gross*
 * portion in `inkDropTransactions` (the earnings report re-applies the cut,
 * so the ledger must store gross, exactly as every existing payout does).
 *
 * The caller owns debiting the payer and any balance check; this only
 * distributes the credit. Must run inside the caller's transaction.
 */
export async function distributeEarnings(
  tx: DrizzleTx,
  opts: {
    storyId: string;
    ownerId: string;
    fromUserId: string;
    gross: number;
    type: string;
    message?: string | null;
    sessionId?: string | null;
    /** Even-split recipients when there's no active agreement. */
    fallbackRecipients?: string[];
  }
): Promise<{ shares: EarningShare[]; usedAgreement: boolean }> {
  const {
    storyId,
    ownerId,
    fromUserId,
    gross,
    type,
    message = null,
    sessionId = null,
    fallbackRecipients,
  } = opts;

  if (gross <= 0) return { shares: [], usedAgreement: false };

  // 1. The signed agreement, if one is active.
  const [agreement] = await tx
    .select({ splits: agreements.splits })
    .from(agreements)
    .where(and(eq(agreements.storyId, storyId), eq(agreements.status, "active")))
    .orderBy(desc(agreements.version))
    .limit(1);

  const parsedSplits = agreement
    ? safeParseJson<{ userId: string; percent: number }[]>(agreement.splits, [])
    : [];
  const validSplits = parsedSplits.filter(
    (s) => typeof s?.userId === "string" && s.percent > 0
  );

  let recipients: { userId: string; weight: number }[];
  let usedAgreement = false;

  if (validSplits.length > 0) {
    recipients = validSplits.map((s) => ({ userId: s.userId, weight: s.percent }));
    usedAgreement = true;
  } else if (fallbackRecipients && fallbackRecipients.length > 0) {
    recipients = [...new Set(fallbackRecipients)].map((userId) => ({
      userId,
      weight: 1,
    }));
  } else {
    recipients = [{ userId: ownerId, weight: 1 }];
  }

  const shares = allocateShares(gross, recipients, ownerId);

  for (const share of shares) {
    if (share.credited > 0) {
      await tx.execute(
        sql`UPDATE users SET ink_drop_balance = ink_drop_balance + ${share.credited} WHERE id = ${share.userId}`
      );
    }
    await tx.insert(inkDropTransactions).values({
      fromUserId,
      toUserId: share.userId,
      amount: share.gross,
      type,
      message,
      sessionId,
    });
  }

  return { shares, usedAgreement };
}
