import "server-only";
import { sql } from "drizzle-orm";
import { inkDropTransactions } from "@/server/db/schema";

/**
 * Debit a user's Ink Drop balance within a transaction.
 * Locks the row, checks balance, debits sender, credits recipient (70/30 split).
 *
 * @returns { success: true, balance } or { error: "INSUFFICIENT_BALANCE", balance }
 */
export async function transferDrops(
  tx: any, // drizzle transaction
  opts: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: string;
    message: string;
  }
): Promise<
  | { success: true; newBalance: number }
  | { error: "INSUFFICIENT_BALANCE"; balance: number }
> {
  const { fromUserId, toUserId, amount, type, message } = opts;
  const creatorShare = Math.floor(amount * 0.7);

  // Lock sender row and check balance
  const [sender] = await tx.execute(
    sql`SELECT ink_drop_balance FROM users WHERE id = ${fromUserId} FOR UPDATE`
  );
  const balance = Number((sender as any)?.ink_drop_balance ?? 0);

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
  });

  return { success: true, newBalance: balance - amount };
}
