---
name: inkwell-backend
description: >
  Design and build backend features for the Inkwell writing platform.
  Use when creating API routes, database schemas, authentication,
  data models, server actions, or any server-side logic. Use when
  user says "API", "database", "auth", "backend", "schema", "migration",
  "server", "endpoint", "query", or discusses data persistence,
  user accounts, or cloud storage.
---

# Inkwell Backend Skill

You are building the backend for **Inkwell**, a writing platform where
authors create, manage, and publish serialized fiction.

## Current State

The app is currently client-only with localStorage persistence.
The backend needs to support transitioning from localStorage to
cloud-synced data without breaking the existing data models.

### Existing Data Models (src/lib/store.ts)

```typescript
// These are the client-side models — the backend schema should mirror them
Chapter { id, title, content, wordCount, createdAt, updatedAt, status, authorNoteBefore, authorNoteAfter, outline, snapshots[] }
ChapterSnapshot { id, content, wordCount, createdAt, label }
FrontMatter { epigraph, epigraphAttribution, foreword, showToc }
StoryMetadata { coverImageDataUrl, synopsis, genres[], contentRating, status, dedication, language }
StoryBible { characters[], places[], notes[] }  // each with id, name, description, details
TypographySettings { dropCaps, sceneBreakStyle }
WritingGoals { dailyTarget, sessions[] }
StoryProject { id, title, chapters[], metadata, bible, frontMatter, typography, goals, activeChapterId, createdAt, updatedAt }
```

## Tech Stack Guidance

### Recommended Stack
- **Framework:** Next.js 16 App Router (already in use)
- **Database:** PostgreSQL via Supabase or Neon
- **ORM:** Drizzle ORM (type-safe, lightweight, SQL-first)
- **Auth:** NextAuth.js v5 (Auth.js) or Supabase Auth
- **File Storage:** Supabase Storage or S3 for cover images
- **Real-time:** Supabase Realtime or Yjs (already a dependency)

### Why These Choices
- Drizzle over Prisma: lighter, no binary engine, better edge runtime support
- Supabase: provides DB + auth + storage + realtime in one — reduces infra complexity
- Next.js server actions: reduce API route boilerplate for mutations

## Database Schema Design

### Principles
1. **Mirror the client models** — keep the same field names and structures so migration is straightforward
2. **Multi-tenant from day one** — every table has `user_id` as a foreign key
3. **Soft delete** — use `deleted_at` timestamp instead of hard deletes for stories and chapters
4. **Optimistic updates** — the client updates immediately, syncs in the background
5. **Content as text** — store chapter HTML content as `text`, not JSONB (Tiptap outputs HTML)

### Core Tables

```sql
-- Users (managed by auth provider, this is the app profile)
users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Stories (maps to StoryProject)
stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Story',
  synopsis text DEFAULT '',
  cover_image_url text,          -- moved from dataUrl to file storage
  genres text[] DEFAULT '{}',
  content_rating text DEFAULT 'everyone',
  status text DEFAULT 'draft',    -- story-level status
  dedication text DEFAULT '',
  language text DEFAULT 'English',
  -- Front matter
  epigraph text DEFAULT '',
  epigraph_attribution text DEFAULT '',
  foreword text DEFAULT '',
  show_toc boolean DEFAULT false,
  -- Typography
  drop_caps boolean DEFAULT false,
  scene_break_style text DEFAULT 'asterism',
  -- Goals
  daily_word_target integer DEFAULT 500,
  -- Visibility
  is_public boolean DEFAULT false,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Chapters
chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  content text DEFAULT '',        -- Tiptap HTML
  word_count integer DEFAULT 0,
  sort_order integer NOT NULL,
  status text DEFAULT 'draft',    -- draft | published
  author_note_before text DEFAULT '',
  author_note_after text DEFAULT '',
  outline text DEFAULT '',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Chapter Snapshots
chapter_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  word_count integer DEFAULT 0,
  label text DEFAULT '',
  created_at timestamptz DEFAULT now()
)

-- Story Bible Entries
bible_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,             -- 'character' | 'place' | 'note'
  name text NOT NULL,
  description text DEFAULT '',
  details text DEFAULT '',        -- JSON or free text for extra fields
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Writing Sessions (for goal tracking)
writing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  story_id uuid REFERENCES stories(id),
  date date NOT NULL,
  words_written integer DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)
```

### Indexes

```sql
CREATE INDEX idx_stories_user ON stories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chapters_story ON chapters(story_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_bible_story ON bible_entries(story_id, type);
CREATE INDEX idx_sessions_user_date ON writing_sessions(user_id, date DESC);
CREATE INDEX idx_stories_public ON stories(is_public, published_at DESC) WHERE is_public = true AND deleted_at IS NULL;
```

## API Design

### Route Structure

```
src/app/api/
  stories/
    route.ts              — GET (list), POST (create)
    [storyId]/
      route.ts            — GET, PATCH, DELETE
      chapters/
        route.ts          — GET (list), POST (create)
        reorder/
          route.ts        — PATCH (bulk reorder)
        [chapterId]/
          route.ts        — GET, PATCH, DELETE
          snapshots/
            route.ts      — GET, POST
      bible/
        route.ts          — GET, POST
        [entryId]/
          route.ts        — PATCH, DELETE
      publish/
        route.ts          — POST (publish story)
  user/
    profile/
      route.ts            — GET, PATCH
    goals/
      route.ts            — GET, PATCH
    sessions/
      route.ts            — GET, POST
```

### Server Actions (preferred for mutations)

For simple mutations, prefer Next.js server actions over API routes:

```typescript
// src/app/actions/stories.ts
"use server";

export async function updateStoryTitle(storyId: string, title: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await db.update(stories)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(stories.id, storyId), eq(stories.userId, session.user.id)));

  revalidatePath(`/write`);
}
```

### API Response Format

```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string } }

// Paginated
{ data: T[], cursor: string | null, hasMore: boolean }
```

## Sync Strategy

### Offline-First Architecture

1. **Client writes to localStorage immediately** (existing behavior)
2. **Background sync** pushes changes to server
3. **Conflict resolution:** last-write-wins with `updatedAt` timestamp
4. **Queue mutations** when offline, flush when connection restored

```typescript
// Sync status states
type SyncStatus = "synced" | "syncing" | "pending" | "conflict" | "offline";
```

### Migration Path from localStorage

1. Phase 1: Add auth — users can sign up/in but data stays in localStorage
2. Phase 2: Add "sync to cloud" button — one-time upload of localStorage data
3. Phase 3: Background auto-sync — bidirectional sync with conflict handling
4. Phase 4: Remove localStorage as primary — cloud-first with localStorage as cache

## Rules

1. **Every query must scope by `user_id`** — never expose data cross-user
2. **Use parameterized queries** — never interpolate user input into SQL
3. **Validate all input server-side** — don't trust client data shapes
4. **Return minimal data** — don't send full chapter content in list endpoints
5. **Use `updatedAt` for optimistic concurrency** — reject stale updates
6. **Rate limit write endpoints** — especially chapter content saves (debounce to 1/5s)
7. **Keep cover images under 2MB** — compress on upload
8. **Store word counts server-side** — recalculate on content save, don't trust client
9. **Paginate chapter lists** — stories can have 100+ chapters
10. **Log all destructive operations** — soft delete, not hard delete
