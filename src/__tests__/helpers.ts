import { vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * Type of a Next.js route handler (App Router).
 */
export type RouteHandler<P extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  ctx: { params: Promise<P> }
) => Promise<NextResponse | Response>;

/**
 * Loosely-typed JSON body used in test assertions.
 */
export type JsonBody = {
  data?: unknown;
  error?: { code?: string; message?: string; details?: unknown };
  [key: string]: unknown;
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
