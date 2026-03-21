import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockRequest, getResponseData } from "../helpers";

describe("GET /api/notifications", () => {
  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/notifications/route");
    const req = createMockRequest("/api/notifications");
    const res = await mod.GET(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(401);
    expect((body as any).error.code).toBe("UNAUTHORIZED");
  });

  it("returns notifications with unread count", async () => {
    vi.resetModules();

    const mockNotifications = [
      { id: "n1", type: "spark", message: "Someone sparked", read: false, createdAt: new Date() },
      { id: "n2", type: "follow", message: "Someone followed", read: true, createdAt: new Date() },
    ];

    vi.doMock("@/server/db", () => {
      // The route uses Promise.all with two db queries
      const selectMock = vi.fn();
      let callCount = 0;
      selectMock.mockImplementation(() => {
        callCount++;
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              if (callCount === 1) {
                // First query: notifications list
                return {
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue(mockNotifications),
                    }),
                  }),
                };
              }
              // Second query: unread count
              return [{ value: 1 }];
            }),
          }),
        };
      });

      return { db: { select: selectMock } };
    });
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/notifications/route");
    const req = createMockRequest("/api/notifications");
    const res = await mod.GET(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data.notifications).toHaveLength(2);
    expect((body as any).data.unreadCount).toBe(1);
    expect((body as any).data.hasMore).toBe(false);
  });

  it("handles DB errors gracefully", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockImplementation(() => {
          throw new Error("DB down");
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/notifications/route");
    const req = createMockRequest("/api/notifications");
    const res = await mod.GET(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(500);
  });
});

describe("PATCH /api/notifications", () => {
  it("requires authentication", async () => {
    vi.resetModules();

    vi.doMock("@/server/db", () => ({ db: {} }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/notifications/route");
    const req = createMockRequest("/api/notifications", { method: "PATCH" });
    const res = await mod.PATCH(req);
    const { status } = await getResponseData(res);

    expect(status).toBe(401);
  });

  it("marks all notifications as read", async () => {
    vi.resetModules();

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/server/db", () => ({
      db: {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: updateWhereMock,
          }),
        }),
      },
    }));
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Test" },
      }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));

    const mod = await import("@/app/api/notifications/route");
    const req = createMockRequest("/api/notifications", { method: "PATCH" });
    const res = await mod.PATCH(req);
    const { status, body } = await getResponseData(res);

    expect(status).toBe(200);
    expect((body as any).data.success).toBe(true);
    expect(updateWhereMock).toHaveBeenCalled();
  });
});
