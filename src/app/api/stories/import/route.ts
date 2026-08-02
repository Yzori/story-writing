import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { db } from "@/server/db";
import { stories, chapters } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { applyRateLimit, handleRouteError } from "@/server/api-utils";
import { sanitizeHtml } from "@/server/sanitize";

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB ceiling

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `story-${Date.now()}`
  );
}

function countWords(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/**
 * Splits a single concatenated HTML body into chapters at top-level h1/h2
 * boundaries. Mammoth maps Word's "Heading 1" to <h1> and "Heading 2" to
 * <h2>; our heuristic treats either as a chapter break. If the document has
 * neither, we return one chapter with everything in it.
 */
function splitIntoChapters(html: string): { title: string; content: string }[] {
  // Quick test — does the doc have any heading at all?
  if (!/<(h1|h2)\b/i.test(html)) {
    return [{ title: "Chapter 1", content: html.trim() || "<p></p>" }];
  }

  // Split on h1/h2 open tags. The lookahead keeps the heading at the start of
  // each chunk so we can extract it as the chapter title.
  const parts = html.split(/(?=<(?:h1|h2)\b)/i).filter((s) => s.trim());

  // Anything BEFORE the first heading gets prepended to the first chapter
  // (or becomes its own "Foreword" if substantial).
  const out: { title: string; content: string }[] = [];
  let preamble = "";
  for (const part of parts) {
    if (/^<(h1|h2)\b/i.test(part)) {
      const titleMatch = part.match(/^<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/i);
      const title = titleMatch
        ? titleMatch[2].replace(/<[^>]+>/g, "").trim() || `Chapter ${out.length + 1}`
        : `Chapter ${out.length + 1}`;
      const body = titleMatch ? part.slice(titleMatch[0].length).trim() : part;
      const fullBody = out.length === 0 && preamble ? preamble + body : body;
      out.push({ title: title.slice(0, 200), content: fullBody || "<p></p>" });
      preamble = "";
    } else {
      preamble += part;
    }
  }

  // If the doc had only preamble (shouldn't happen given the regex above)
  if (out.length === 0) {
    return [{ title: "Chapter 1", content: preamble.trim() || "<p></p>" }];
  }
  return out;
}

/**
 * POST /api/stories/import
 *
 * Imports a .docx file as a new story. The first heading (if any) becomes the
 * story title; remaining h1/h2 boundaries split into chapters. Falls back to
 * a single chapter if the document is unstructured.
 *
 * Multipart form field: `file` — a .docx upload, ≤ 10 MB.
 * Optional fields: `title`, `format` (defaults novel).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to import." } },
        { status: 401 },
      );
    }

    const limited = applyRateLimit(request, session.user.id, "write", {
      max: 5,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing 'file' field." } },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: { code: "TOO_LARGE", message: `File exceeds ${MAX_BYTES / 1024 / 1024} MB.` } },
        { status: 413 },
      );
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_TYPE", message: "Only .docx files are supported right now." } },
        { status: 400 },
      );
    }

    const userTitle = (form.get("title") as string | null)?.trim() || "";
    const format = (form.get("format") as string | null) || "novel";

    // Parse DOCX → HTML.
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value: rawHtml, messages } = await mammoth.convertToHtml({ buffer });
    const html = sanitizeHtml(rawHtml);

    // Derive title — explicit user title wins, else first heading, else file stem.
    let title = userTitle;
    if (!title) {
      const firstHeading = html.match(/<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/i);
      if (firstHeading) {
        title = firstHeading[2].replace(/<[^>]+>/g, "").trim().slice(0, 200);
      }
    }
    if (!title) title = file.name.replace(/\.docx$/i, "").trim() || "Imported story";

    const chunked = splitIntoChapters(html);

    // Insert story.
    const slug = generateSlug(title);
    const [story] = await db
      .insert(stories)
      .values({
        title,
        slug,
        userId: session.user.id,
        format,
        writingMode: "solo",
      })
      .returning();
    if (!story) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to create story." } },
        { status: 500 },
      );
    }

    // Insert chapters in order.
    const chapterRows = await db
      .insert(chapters)
      .values(
        chunked.map((c, i) => ({
          storyId: story.id,
          title: c.title,
          content: c.content,
          wordCount: countWords(c.content),
          sortOrder: i,
          status: "draft",
        })),
      )
      .returning({ id: chapters.id });

    return NextResponse.json({
      data: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        chapterCount: chapterRows.length,
        warnings: messages.filter((m) => m.type === "warning").map((m) => m.message).slice(0, 5),
      },
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/stories/import", "Failed to import the file.");
  }
}
