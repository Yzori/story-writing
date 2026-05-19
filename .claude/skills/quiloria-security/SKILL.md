---
name: quiloria-security
description: >
  Apply security best practices when building features for the Quiloria
  writing platform. Use when implementing authentication, authorization,
  input handling, file uploads, API routes, database queries, or any
  code that handles user data. Use when user says "auth", "login",
  "security", "permissions", "sanitize", "XSS", "CSRF", "injection",
  "upload", "validate", or when reviewing code for security issues.
  Also activates during API route creation and middleware work.
---

# Quiloria Security Skill

Security guidelines for the Quiloria writing platform. This skill
should influence all backend and frontend code that touches user
data, authentication, or external input.

## Threat Model

Quiloria handles:
- **User credentials** (email, password, OAuth tokens)
- **User content** (stories, chapters — potentially sensitive creative work)
- **File uploads** (cover images)
- **Rich HTML content** (Tiptap editor output stored and rendered)
- **Public-facing pages** (published stories readable by anyone)

Key threat vectors:
1. Stored XSS via chapter content or story bible entries
2. Unauthorized access to other users' unpublished stories
3. Malicious file uploads disguised as images
4. Content scraping / unauthorized bulk download of published stories
5. Account takeover via session hijacking

## Authentication

### Implementation Checklist

```
[ ] Use Auth.js v5 or Supabase Auth — never roll your own
[ ] Enforce HTTPS in production
[ ] Set secure, httpOnly, sameSite cookies
[ ] Implement CSRF protection (built into Auth.js)
[ ] Add rate limiting on login/register endpoints
[ ] Hash passwords with bcrypt (cost factor >= 12) if not using OAuth-only
[ ] Validate email format server-side before account creation
[ ] Implement account lockout after 5 failed login attempts (15min cooldown)
```

### Session Handling

```typescript
// Always verify session in server components and API routes
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  // session.user.id is now safe to use for queries
}
```

### Middleware Protection

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/write") ||
                      req.nextUrl.pathname.startsWith("/api/stories");

  if (isProtected && !req.auth) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/write/:path*", "/api/stories/:path*", "/api/user/:path*"],
};
```

## Authorization

### Row-Level Security

**Every database query MUST scope by user_id.** This is the single most
critical security rule.

```typescript
// CORRECT — scoped to user
const story = await db.select()
  .from(stories)
  .where(and(
    eq(stories.id, storyId),
    eq(stories.userId, session.user.id)
  ));

// WRONG — any user can access any story
const story = await db.select()
  .from(stories)
  .where(eq(stories.id, storyId));
```

### Public vs Private Content

```typescript
// Public story access (reader pages)
const story = await db.select()
  .from(stories)
  .where(and(
    eq(stories.id, storyId),
    eq(stories.isPublic, true),
    isNull(stories.deletedAt)
  ));

// Only return published chapters for public access
const chapters = await db.select({
    id: chapters.id,
    title: chapters.title,
    content: chapters.content,
    wordCount: chapters.wordCount,
  })
  .from(chapters)
  .where(and(
    eq(chapters.storyId, storyId),
    eq(chapters.status, "published"),
    isNull(chapters.deletedAt)
  ))
  .orderBy(chapters.sortOrder);
```

### Permission Checks

Create a helper to avoid repetition:

```typescript
// src/lib/auth-helpers.ts
export async function requireStoryOwner(storyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("UNAUTHORIZED");

  const [story] = await db.select({ id: stories.id })
    .from(stories)
    .where(and(
      eq(stories.id, storyId),
      eq(stories.userId, session.user.id),
      isNull(stories.deletedAt)
    ));

  if (!story) throw new AuthError("NOT_FOUND");
  return { userId: session.user.id, storyId: story.id };
}
```

## Input Validation

### API Input

Validate all incoming data with Zod schemas:

```typescript
import { z } from "zod";

const UpdateStorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  synopsis: z.string().max(5000).optional(),
  genres: z.array(z.string().max(50)).max(10).optional(),
  contentRating: z.enum(["everyone", "teen", "mature"]).optional(),
  status: z.enum(["draft", "ongoing", "complete", "hiatus"]).optional(),
  dedication: z.string().max(1000).optional(),
  language: z.string().max(50).optional(),
});

export async function PATCH(req: Request, { params }: { params: { storyId: string } }) {
  const body = await req.json();
  const parsed = UpdateStorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message }
    }, { status: 400 });
  }
  // Use parsed.data — guaranteed safe
}
```

### Chapter Content (HTML)

Tiptap outputs HTML. This HTML is stored and later rendered to readers.
**This is the #1 XSS vector.**

```typescript
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4",
  "strong", "em", "u", "s",
  "blockquote", "ul", "ol", "li",
  "a", "img", "hr", "span", "mark",
  "figure", "figcaption",
];

const ALLOWED_ATTRS = ["href", "src", "alt", "class", "data-type", "data-thread-id"];

export function sanitizeChapterContent(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: [],
    ADD_ATTR: [],
  });
}

// Use on every chapter content save
const cleanContent = sanitizeChapterContent(parsed.data.content);
```

### Rendering User Content

When displaying chapter content to readers:

```tsx
// CORRECT — sanitized before storage AND use dangerouslySetInnerHTML only for
// content that was sanitized on save
<div
  className="prose"
  dangerouslySetInnerHTML={{ __html: chapter.content }}
/>

// ALSO CORRECT — double-sanitize at render time for defense in depth
import DOMPurify from "dompurify";
<div
  className="prose"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapter.content) }}
/>

// WRONG — rendering unsanitized user input
<div dangerouslySetInnerHTML={{ __html: rawUserInput }} />
```

## File Uploads (Cover Images)

### Validation

```typescript
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function validateImageUpload(file: File) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum 2MB");
  }

  // Verify magic bytes (don't trust Content-Type alone)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const isValidImage = verifyMagicBytes(bytes);
  if (!isValidImage) {
    throw new Error("File content does not match an image format");
  }
}

function verifyMagicBytes(bytes: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  // GIF: 47 49 46
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  // WebP: starts with RIFF
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  return false;
}
```

### Storage

```typescript
// Generate safe filenames — never use user-provided names
import { randomUUID } from "crypto";

function generateStoragePath(userId: string, fileType: string): string {
  const ext = fileType.split("/")[1]; // jpeg, png, etc.
  return `covers/${userId}/${randomUUID()}.${ext}`;
}
```

## Rate Limiting

### API Rate Limits

```typescript
// src/lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Usage in API routes
const allowed = rateLimit(`save:${session.user.id}`, 30, 60_000); // 30/min
if (!allowed) {
  return Response.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    { status: 429 }
  );
}
```

### Recommended Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login attempts | 5 | 15 min |
| Chapter saves | 30 | 1 min |
| Story creation | 10 | 1 hour |
| Image uploads | 10 | 10 min |
| Public API reads | 60 | 1 min |
| Export generation | 5 | 10 min |

## Content Security Policy

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs these
      "style-src 'self' 'unsafe-inline'",                 // Tailwind needs inline
      "img-src 'self' blob: data: https://your-storage.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://your-api.supabase.co wss://your-realtime.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

## Environment Variables

```bash
# .env.local (NEVER commit this)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...           # min 32 chars, random
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # server-only, never expose to client
```

```typescript
// Validate env at startup
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
```

## Security Review Checklist

When reviewing any PR or code change, check:

```
[ ] All DB queries scoped by user_id
[ ] All user input validated with Zod schema
[ ] HTML content sanitized before storage
[ ] File uploads validated (type, size, magic bytes)
[ ] Auth checked in every API route and server action
[ ] No secrets in client-side code or git
[ ] No raw SQL with string interpolation
[ ] Rate limiting on write endpoints
[ ] Error messages don't leak internal details
[ ] Soft delete used instead of hard delete
[ ] CORS configured correctly for API routes
[ ] No eval() or Function() with user input
```

## Rules

1. **Never trust client data** — validate and sanitize everything server-side
2. **Scope every query by user_id** — this prevents the entire class of IDOR vulnerabilities
3. **Sanitize HTML on write AND on read** — defense in depth for XSS
4. **Use parameterized queries only** — Drizzle does this by default, never bypass it
5. **Keep secrets server-side** — env vars prefixed with `NEXT_PUBLIC_` are exposed to the client
6. **Log security events** — failed logins, permission denials, rate limit hits
7. **Fail closed** — if auth check errors, deny access, don't default to allowing
8. **Validate file uploads by content** — MIME types can be spoofed
9. **Return generic errors to users** — log details server-side only
10. **Review dependencies** — run `npm audit` regularly, pin major versions
