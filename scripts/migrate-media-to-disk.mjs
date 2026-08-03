// Move existing base64 webtoon images out of Postgres onto local disk.
//
//   node scripts/migrate-media-to-disk.mjs [--dry-run]
//
// Converts, idempotently (rerunning is safe — converted rows hold URLs, and
// files are content-addressed so rewrites are no-ops):
//   - panels.image_data + panels.frames (JSON entries with data URLs)
//   - story_assets.image_data
//
// Needs DATABASE_URL (read from .env/.env.local like the other scripts) and
// writes under UPLOAD_DIR (default ./uploads). Run it once after deploying
// the media-on-disk build; new writes externalize themselves.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

for (const f of [".env", ".env.local"]) {
  try {
    for (const line of (await fs.readFile(f, "utf8")).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const DRY = process.argv.includes("--dry-run");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

let filesWritten = 0;
let bytesMoved = 0;
let skipped = 0;

async function saveDataUrl(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) return null; // unknown format — leave the row as it is
  const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 32);
  const rel = path.join("img", hash.slice(0, 2), `${hash}.${MIME_EXT[m[1]]}`);
  const abs = path.join(UPLOAD_DIR, rel);
  if (!DRY) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    try {
      await fs.stat(abs);
    } catch {
      await fs.writeFile(abs, buf);
      filesWritten += 1;
      bytesMoved += buf.length;
    }
  } else {
    bytesMoved += buf.length;
  }
  return `/api/media/${rel.split(path.sep).join("/")}`;
}

async function convertValue(value) {
  if (!value || !value.startsWith("data:")) return value;
  const url = await saveDataUrl(value);
  if (!url) skipped += 1;
  return url ?? value;
}

async function convertFrames(framesJson) {
  if (!framesJson || !framesJson.includes("data:")) return framesJson;
  let frames;
  try {
    frames = JSON.parse(framesJson);
  } catch {
    return framesJson;
  }
  if (!Array.isArray(frames)) return framesJson;
  for (const frame of frames) {
    if (frame && typeof frame.imageData === "string") {
      frame.imageData = await convertValue(frame.imageData);
    }
  }
  return JSON.stringify(frames);
}

// ── panels (batched by id — rows can be multi-MB) ──
let panelCount = 0;
for (;;) {
  const rows = await sql`
    select id, image_data, frames from panels
    where image_data like 'data:%' or frames like '%data:image%'
    order by id limit 25`;
  if (rows.length === 0) break;
  for (const row of rows) {
    const imageData = await convertValue(row.image_data);
    const frames = await convertFrames(row.frames);
    if (!DRY) {
      await sql`update panels set image_data = ${imageData}, frames = ${frames} where id = ${row.id}`;
    }
    panelCount += 1;
  }
  if (DRY) break; // dry-run would loop forever on the unchanged WHERE
}

// ── story_assets ──
let assetCount = 0;
for (;;) {
  const rows = await sql`
    select id, image_data from story_assets
    where image_data like 'data:%'
    order by id limit 50`;
  if (rows.length === 0) break;
  for (const row of rows) {
    const imageData = await convertValue(row.image_data);
    if (!DRY) {
      await sql`update story_assets set image_data = ${imageData} where id = ${row.id}`;
    }
    assetCount += 1;
  }
  if (DRY) break;
}

await sql.end();
console.log(
  `${DRY ? "[dry-run] " : ""}panels touched: ${panelCount}, assets touched: ${assetCount}, ` +
    `files written: ${filesWritten}, image bytes moved: ${(bytesMoved / 1024 / 1024).toFixed(1)}MB` +
    (skipped ? `, left in place (unknown format/oversize): ${skipped}` : "")
);
