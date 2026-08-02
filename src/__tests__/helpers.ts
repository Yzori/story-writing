import { vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * Type of a Next.js route handler (App Router).
 */
// ctx is intentionally `any`: handlers narrow params per-route, and tests for
// param-less routes call with a single argument.
export type RouteHandler = (
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handlers narrow params per-route
  ctx?: any
) => Promise<NextResponse | Response>;

/**
 * Loosely-typed JSON body used in test assertions.
 */
export type JsonBody = {
  /* eslint-disable @typescript-eslint/no-explicit-any -- assertion convenience */
  data?: any;
  error?: any;
  [key: string]: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
};

/**
 * Create a mock NextRequest for testing API routes.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {} } = options;

  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;

  const reqHeaders = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": "127.0.0.1",
    ...headers,
  });

  const init: { method: string; headers: Headers; body?: string } = {
    method,
    headers: reqHeaders,
  };

  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, init);
}

/**
 * Create mock route params (Next.js 15+ async params pattern).
 */
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

/**
 * Helper to extract JSON from a mock response.
 */
export async function getResponseData(response: {
  json: () => Promise<unknown>;
  status: number;
}) {
  const body = await response.json();
  return { body, status: response.status };
}

/**
 * Module mock for `@/server/api-utils`: rate limiting waved through, plus
 * real-shaped `errorResponse`/`handleRouteError` so a route that reaches
 * its terminal catch still answers with the standard error body.
 */
export function mockApiUtils(overrides: Record<string, unknown> = {}) {
  return {
    applyRateLimit: vi.fn().mockReturnValue(null),
    applyPersistentRateLimit: vi.fn().mockResolvedValue(null),
    errorResponse: (code: string, message: string, status: number) =>
      NextResponse.json({ error: { code, message } }, { status }),
    handleRouteError: (
      _error: unknown,
      _context: string,
      message = "Something went wrong. Please try again."
    ) =>
      NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message } },
        { status: 500 }
      ),
    ...overrides,
  };
}

/**
 * Mock authenticated session.
 */
export async function mockAuth(
  userId: string = "user-1",
  extra: Record<string, unknown> = {}
) {
  const { auth } = await import("@/server/auth");
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: userId, name: "Test User", email: "test@example.com", ...extra },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

/**
 * Mock unauthenticated session.
 */
export async function mockNoAuth() {
  const { auth } = await import("@/server/auth");
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

/**
 * Create a mock story record.
 */
export function createMockStory(overrides: Record<string, unknown> = {}) {
  return {
    id: "story-1",
    userId: "user-1",
    title: "Test Story",
    format: "novel",
    writingMode: "solo",
    synopsis: "A test story",
    coverImageUrl: null,
    genres: ["Fantasy"],
    contentRating: "everyone",
    status: "draft",
    slug: "test-story",
    dedication: "",
    language: "English",
    isPublic: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock chapter record.
 */
export function createMockChapter(overrides: Record<string, unknown> = {}) {
  return {
    id: "chapter-1",
    storyId: "story-1",
    title: "Chapter One",
    content: "<p>Hello world</p>",
    wordCount: 2,
    sortOrder: 0,
    status: "draft",
    authorNoteBefore: "",
    authorNoteAfter: "",
    outline: "",
    version: 1,
    sessionId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
