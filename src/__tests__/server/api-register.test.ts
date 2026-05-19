import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// We need to mock these before importing the route
vi.mock("@/server/db", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    query: { stories: { findFirst: vi.fn() } },
  };
  return { db: mockDb };
});

vi.mock("@/server/password", () => ({
  hashPassword: vi.fn(() => Promise.resolve("hashed-password")),
}));

vi.mock("@/server/api-utils", () => ({
  applyRateLimit: vi.fn(() => null),
  applyPersistentRateLimit: vi.fn(() => Promise.resolve(null)),
}));

describe("POST /api/auth/register", () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();

    // Re-mock for each test
    vi.doMock("@/server/db", () => {
      const selectMock = vi.fn();
      const insertMock = vi.fn();
      return {
        db: {
          select: selectMock.mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: insertMock.mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: "new-user-id", email: "test@example.com" },
              ]),
            }),
          }),
        },
      };
    });

    vi.doMock("@/server/password", () => ({
      hashPassword: vi.fn().mockResolvedValue("hashed-password"),
    }));

    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
      applyPersistentRateLimit: vi.fn().mockResolvedValue(null),
    }));

    const mod = await import("@/app/api/auth/register/route");
    POST = mod.POST;
  });

  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      }),
      body: JSON.stringify(body),
    });
  }

  it("rejects request with missing email", async () => {
    const req = makeRequest({ password: "password123" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("rejects request with missing password", async () => {
    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const req = makeRequest({ email: "test@example.com", password: "short" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("8 characters");
  });

  it("rejects invalid email format", async () => {
    const req = makeRequest({ email: "not-an-email", password: "password123" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("rejects overly long email", async () => {
    const req = makeRequest({
      email: "a".repeat(250) + "@x.com",
      password: "password123",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("rejects overly long display name", async () => {
    const req = makeRequest({
      email: "test@example.com",
      password: "password123",
      displayName: "x".repeat(101),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    // Override the select mock to return an existing user
    const { db } = await import("@/server/db");
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "existing-user" }]),
        }),
      }),
    });

    const req = makeRequest({
      email: "existing@example.com",
      password: "password123",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });

  it("successfully registers a new user", async () => {
    const req = makeRequest({
      email: "new@example.com",
      password: "password123",
      displayName: "New User",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("new-user-id");
    expect(body.data.email).toBe("test@example.com");
  });

  it("handles unique constraint race condition (23505)", async () => {
    // Override the insert mock to throw unique violation
    const { db } = await import("@/server/db");
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(
          Object.assign(new Error("unique"), { code: "23505" })
        ),
      }),
    });

    const req = makeRequest({
      email: "race@example.com",
      password: "password123",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});
