import { vi } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

// Mock next/server
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server") as Record<string, unknown>;
  return {
    ...actual,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        const status = (init as { status?: number })?.status || 200;
        const headers = (init as { headers?: Record<string, string> })?.headers || {};
        return {
          status,
          headers: new Map(Object.entries(headers)),
          json: () => Promise.resolve(body),
          ok: status >= 200 && status < 300,
        };
      },
    },
  };
});

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    query: {},
    transaction: vi.fn(),
  },
}));
