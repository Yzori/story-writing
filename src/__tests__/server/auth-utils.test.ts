import { beforeEach, describe, expect, it, vi } from "vitest";

type AttemptRow = {
  key: string;
  attempts: number;
  firstAttemptAt: Date;
  lockedUntil: Date | null;
  updatedAt: Date;
};

const rows = new Map<string, AttemptRow>();

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_left: unknown, right: string) => ({ right })),
  };
});

vi.mock("@/server/db", () => ({
  db: {
    query: {
      loginAttempts: {
        findFirst: vi.fn((query: { where?: { right?: string }; columns?: Record<string, boolean> }) => {
          const key = query.where?.right;
          const row = key ? rows.get(key) : undefined;
          if (!row) return Promise.resolve(undefined);
          if (!query.columns) return Promise.resolve(row);
          return Promise.resolve(
            Object.fromEntries(
              Object.keys(query.columns).map((column) => [column, row[column as keyof AttemptRow]])
            )
          );
        }),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn((value: AttemptRow) => ({
        onConflictDoUpdate: vi.fn(({ set }: { set: AttemptRow }) => {
          rows.set(value.key, { ...value, ...set });
          return Promise.resolve();
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn((condition: { right?: string }) => {
        if (condition.right) rows.delete(condition.right);
        return Promise.resolve();
      }),
    })),
  },
}));

describe("auth utilities", () => {
  beforeEach(() => {
    rows.clear();
    delete process.env.TRUST_PROXY_HEADERS;
    delete process.env.VERCEL;
  });

  it("normalizes email addresses consistently", async () => {
    const { normalizeEmail } = await import("@/server/auth-utils");
    expect(normalizeEmail("  Writer@Example.COM ")).toBe("writer@example.com");
  });

  it("ignores forwarded IP headers unless proxy headers are trusted", async () => {
    const { getLoginAttemptKey } = await import("@/server/auth-utils");
    const request = new Request("https://quiloria.test/login", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getLoginAttemptKey(" Writer@Example.COM ", request)).toBe("writer@example.com:direct");

    process.env.TRUST_PROXY_HEADERS = "1";
    expect(getLoginAttemptKey(" Writer@Example.COM ", request)).toBe(
      "writer@example.com:203.0.113.10"
    );
  });

  it("locks a login key after five failed attempts and clears on success", async () => {
    const { clearLoginAttempts, getLoginLockoutSeconds, recordFailedLogin } = await import(
      "@/server/auth-utils"
    );
    const key = "writer@example.com:203.0.113.10";
    await clearLoginAttempts(key);

    for (let i = 0; i < 4; i++) {
      await recordFailedLogin(key, 1_000 + i);
      expect(await getLoginLockoutSeconds(key, 2_000)).toBe(0);
    }

    await recordFailedLogin(key, 2_000);
    expect(await getLoginLockoutSeconds(key, 2_000)).toBeGreaterThan(0);

    await clearLoginAttempts(key);
    expect(await getLoginLockoutSeconds(key, 2_000)).toBe(0);
  });
});
