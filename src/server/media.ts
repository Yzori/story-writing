import { createHash } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Local-disk media storage.
//
// Webtoon images used to live as base64 data URLs inside Postgres rows (panel
// `frames` JSON, panel `imageData`, asset-tray rows) — multi-MB payloads on
// every panels fetch, re-sent on every save, uncacheable. Now the write path
// externalizes any incoming data URL to a file under UPLOAD_DIR and stores a
// small `/api/media/...` URL instead; `/api/media/[...path]` serves the bytes
// with immutable cache headers.
//
// Files are content-addressed (sha256 → filename), which makes writes
// idempotent, dedupes identical images across panels/stories, and means URLs
// never need invalidation. Nothing deletes files when rows are deleted — a
// hash may be referenced from many rows, and disk is the cheap side of this
// trade; a sweep can reconcile later if it ever matters.
//
// Access: media URLs are served without auth. The filename is half a sha256
// of the content — unguessable — which matches how covers and most CDNs treat
// image assets. Gated chapters still gate the panel *data* (the URLs); the
// bytes behind a leaked URL were always one screenshot away.
// ─────────────────────────────────────────────────────────────────────────────

/** Resolved lazily so tests and scripts can set UPLOAD_DIR before first use. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Decoded ceiling; the Zod caps on the JSON fields are the base64 ceiling. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/;

export class MediaError extends Error {}

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

/**
 * Persist one base64 image data URL to disk and return its serving URL.
 * Content-addressed and sharded (`img/ab/<hash>.<ext>`), so repeat saves of
 * the same bytes are free and one directory never holds every file.
 */
export async function saveDataUrlImage(dataUrl: string): Promise<string> {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) throw new MediaError("Unsupported image format — use PNG, JPEG, WebP, or GIF.");
  const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (buf.length === 0) throw new MediaError("Empty image.");
  if (buf.length > MAX_IMAGE_BYTES) throw new MediaError("Image is too large (5MB max).");
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 32);
  const rel = path.join("img", hash.slice(0, 2), `${hash}.${MIME_EXT[m[1]]}`);
  const abs = path.join(uploadDir(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  try {
    await stat(abs); // already stored — content addressing makes this a no-op
  } catch {
    await writeFile(abs, buf);
  }
  return `/api/media/${rel.split(path.sep).join("/")}`;
}

/** Data URL in → media URL out; anything else (already a URL, empty) passes through. */
export async function externalizeImage(value: string | null | undefined): Promise<string | null | undefined> {
  if (!value || !isDataUrl(value)) return value;
  return saveDataUrlImage(value);
}

/**
 * Externalize every data URL inside a panel `frames` JSON payload.
 * Leaves malformed JSON untouched — the Zod layer owns rejecting that.
 */
export async function externalizeFramesJson(framesJson: string | null | undefined): Promise<string | null | undefined> {
  if (!framesJson || !framesJson.includes("data:")) return framesJson;
  let frames: unknown;
  try {
    frames = JSON.parse(framesJson);
  } catch {
    return framesJson;
  }
  if (!Array.isArray(frames)) return framesJson;
  const out = await Promise.all(
    frames.map(async (frame) => {
      if (frame && typeof frame === "object" && typeof (frame as { imageData?: unknown }).imageData === "string") {
        const f = frame as { imageData: string };
        return { ...f, imageData: (await externalizeImage(f.imageData)) ?? "" };
      }
      return frame;
    })
  );
  return JSON.stringify(out);
}
