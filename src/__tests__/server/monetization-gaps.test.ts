import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createMockChapter,
  createMockParams,
  createMockRequest,
  createMockStory,
  getResponseData,
} from "../helpers";

describe("monetization regressions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("credits Ink Drops for one-time Stripe payment checkout sessions", async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });
    const insertReturning = vi.fn().mockResolvedValue([{ id: "tx-1" }]);
    const insertOnConflict = vi.fn().mockReturnValue({ returning: insertReturning });
    const insertValues = vi.fn().mockReturnValue({ onConflictDoNothing: insertOnConflict });
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    vi.doMock("next/headers", () => ({
      headers: vi.fn().mockResolvedValue(new Headers({ "stripe-signature": "sig" })),
    }));

    vi.doMock("@/server/stripe", () => ({
      stripe: {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_test_drops",
                mode: "payment",
                metadata: { userId: "user-1", dropAmount: "500" },
              },
            },
          }),
        },
      },
    }));

    vi.doMock("@/server/db", () => ({
      db: {
        transaction: vi.fn(async (callback) => callback({ insert, update })),
      },
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });

    const response = await POST(request);
    const { status } = await getResponseData(response);

    expect(status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        toUserId: "user-1",
        amount: 500,
        type: "purchase",
        stripeSessionId: "cs_test_drops",
      }),
    );
    expect(updateSet).toHaveBeenCalled();
  });

  it("does not return published gated chapter content before unlock", async () => {
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {
        query: {
          chapters: {
            findFirst: vi.fn().mockResolvedValue(
              createMockChapter({
                id: "chapter-1",
                status: "published",
                gatingTier: "standard",
                content: "<p>Paid content</p>",
              }),
            ),
          },
          stories: {
            findFirst: vi.fn().mockResolvedValue(
              createMockStory({
                id: "story-1",
                userId: "author-1",
                status: "published",
                isPublic: true,
              }),
            ),
          },
          collaborators: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      },
    }));

    const { GET } = await import("@/app/api/stories/[storyId]/chapters/[chapterId]/route");
    const response = await GET(
      createMockRequest("/api/stories/story-1/chapters/chapter-1"),
      createMockParams({ storyId: "story-1", chapterId: "chapter-1" }),
    );
    const { status, body } = await getResponseData(response);

    expect(status).toBe(402);
    expect((body as { data?: unknown }).data).toBeUndefined();
  });

  it("denies paid AI when the subscription is past due", async () => {
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "user-1",
                subscriptionTier: "pro",
                subscriptionStatus: "past_due",
                subscriptionEndsAt: new Date(Date.now() + 86400000),
                aiRequestsThisMonth: 0,
                aiRequestsResetAt: null,
                aiFreeGenerationsUsed: 0,
              },
            ]),
          }),
        }),
      },
    }));
    vi.doMock("@/server/services/ai", () => ({
      generateAIAssistance: vi.fn(),
      generateStoryIntelligence: vi.fn(),
    }));

    const { POST } = await import("@/app/api/ai/assist/route");
    const response = await POST(
      createMockRequest("/api/ai/assist", {
        method: "POST",
        body: { promptType: "continue", context: "Once upon a time" },
      }),
    );
    const { status, body } = await getResponseData(response);

    expect(status).toBe(402);
    expect((body as { error: { code: string } }).error.code).toBe("SUBSCRIPTION_REQUIRED");
  });

  it("rejects invalid AI prompt types before generation", async () => {
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {},
    }));
    vi.doMock("@/server/services/ai", () => ({
      generateAIAssistance: vi.fn(),
      generateStoryIntelligence: vi.fn(),
    }));

    const { POST } = await import("@/app/api/ai/assist/route");
    const response = await POST(
      createMockRequest("/api/ai/assist", {
        method: "POST",
        body: { promptType: "write-my-book", context: "Once upon a time" },
      }),
    );
    const { status, body } = await getResponseData(response);

    expect(status).toBe(400);
    expect((body as { error: { code: string } }).error.code).toBe("VALIDATION_ERROR");
  });

  it("does not expose story bible metadata to unauthorized AI requests", async () => {
    vi.doMock("@/server/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
    }));
    vi.doMock("@/server/api-utils", () => ({
      applyRateLimit: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("@/server/db", () => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "user-1",
                subscriptionTier: "pro",
                subscriptionStatus: "active",
                subscriptionEndsAt: null,
                aiRequestsThisMonth: 0,
                aiRequestsResetAt: new Date(Date.now() + 86400000),
                aiFreeGenerationsUsed: 0,
              },
            ]),
          }),
        }),
        update: vi.fn(),
      },
    }));
    vi.doMock("@/server/services/collaboration", () => ({
      verifyCollaboratorAccess: vi.fn().mockResolvedValue({ error: "FORBIDDEN" }),
    }));
    vi.doMock("@/server/services/ai", () => ({
      generateAIAssistance: vi.fn(),
      generateStoryIntelligence: vi.fn(),
    }));

    const { POST } = await import("@/app/api/ai/assist/route");
    const response = await POST(
      createMockRequest("/api/ai/assist", {
        method: "POST",
        body: {
          promptType: "continue",
          context: "Once upon a time",
          storyId: "00000000-0000-4000-8000-000000000001",
        },
      }),
    );
    const { status, body } = await getResponseData(response);

    expect(status).toBe(403);
    expect((body as { error: { code: string } }).error.code).toBe("FORBIDDEN");
  });
});
