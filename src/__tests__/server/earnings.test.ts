import { describe, expect, it } from "vitest";
import { allocateShares } from "@/server/services/ink-drops";
import { CREATOR_SHARE } from "@/lib/constants";

// Pure allocation math behind distributeEarnings (Track B keystone): split a
// gross Ink-Drop payment across makers by weight, whole drops only, remainder
// to the owner. The ledger stores GROSS; balances get floor(gross * share).

const OWNER = "owner-id";
const A = "collab-a";
const B = "collab-b";

const sumGross = (shares: { gross: number }[]) =>
  shares.reduce((n, s) => n + s.gross, 0);

describe("allocateShares", () => {
  it("single owner (no agreement) keeps the whole gross", () => {
    const shares = allocateShares(100, [{ userId: OWNER, weight: 1 }], OWNER);
    expect(shares).toHaveLength(1);
    expect(shares[0]).toEqual({
      userId: OWNER,
      gross: 100,
      credited: Math.floor(100 * CREATOR_SHARE), // 70
    });
  });

  it("splits by weight and always sums back to gross", () => {
    const shares = allocateShares(
      100,
      [
        { userId: OWNER, weight: 60 },
        { userId: A, weight: 40 },
      ],
      OWNER
    );
    expect(sumGross(shares)).toBe(100);
    expect(shares.find((s) => s.userId === OWNER)?.gross).toBe(60);
    expect(shares.find((s) => s.userId === A)?.gross).toBe(40);
  });

  it("hands the flooring remainder to the owner", () => {
    // 100 split three ways: 33.33 each → floors to 33/33/33, 1 left over.
    const shares = allocateShares(
      100,
      [
        { userId: OWNER, weight: 1 },
        { userId: A, weight: 1 },
        { userId: B, weight: 1 },
      ],
      OWNER
    );
    expect(sumGross(shares)).toBe(100);
    // Remainder lands on the owner, not a collaborator.
    expect(shares.find((s) => s.userId === OWNER)?.gross).toBe(34);
    expect(shares.find((s) => s.userId === A)?.gross).toBe(33);
    expect(shares.find((s) => s.userId === B)?.gross).toBe(33);
  });

  it("even fallback split (the campaign cast) when owner is a recipient", () => {
    // Mirrors gold's fallback: equal weights, remainder to the Director/owner.
    const shares = allocateShares(
      10,
      [
        { userId: OWNER, weight: 1 },
        { userId: A, weight: 1 },
        { userId: B, weight: 1 },
      ],
      OWNER
    );
    expect(sumGross(shares)).toBe(10);
    expect(shares.find((s) => s.userId === OWNER)?.gross).toBe(4); // 3 + remainder 1
    expect(shares.find((s) => s.userId === A)?.gross).toBe(3);
    expect(shares.find((s) => s.userId === B)?.gross).toBe(3);
  });

  it("gives the remainder to the first recipient when the owner isn't one", () => {
    const shares = allocateShares(
      100,
      [
        { userId: A, weight: 1 },
        { userId: B, weight: 1 },
        { userId: "collab-c", weight: 1 },
      ],
      OWNER
    );
    expect(sumGross(shares)).toBe(100);
    expect(shares.find((s) => s.userId === A)?.gross).toBe(34); // first gets remainder
  });

  it("credits floor(gross * CREATOR_SHARE) per share", () => {
    const shares = allocateShares(
      100,
      [
        { userId: OWNER, weight: 50 },
        { userId: A, weight: 50 },
      ],
      OWNER
    );
    for (const s of shares) {
      expect(s.credited).toBe(Math.floor(s.gross * CREATOR_SHARE));
    }
  });

  it("returns nothing for a zero or negative gross", () => {
    expect(allocateShares(0, [{ userId: OWNER, weight: 1 }], OWNER)).toEqual([]);
    expect(allocateShares(-5, [{ userId: OWNER, weight: 1 }], OWNER)).toEqual([]);
  });

  it("returns nothing when there are no recipients", () => {
    expect(allocateShares(100, [], OWNER)).toEqual([]);
  });

  it("degenerate all-zero weights fall back to the owner", () => {
    const shares = allocateShares(
      100,
      [
        { userId: A, weight: 0 },
        { userId: B, weight: 0 },
      ],
      OWNER
    );
    expect(shares).toHaveLength(1);
    expect(shares[0].userId).toBe(OWNER);
    expect(shares[0].gross).toBe(100);
  });

  it("drops recipients whose floored share rounds to zero", () => {
    // A tiny gross against a large weight gap: the 1%-weight maker gets 0 and
    // is pruned so we don't log empty ledger rows.
    const shares = allocateShares(
      10,
      [
        { userId: OWNER, weight: 99 },
        { userId: A, weight: 1 },
      ],
      OWNER
    );
    expect(sumGross(shares)).toBe(10);
    expect(shares.find((s) => s.userId === A)).toBeUndefined();
    expect(shares.find((s) => s.userId === OWNER)?.gross).toBe(10);
  });
});
