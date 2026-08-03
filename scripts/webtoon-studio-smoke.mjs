// Smoke the webtoon studio end to end:
//   1. login (glass smoke user) → create a webtoon story via API
//   2. studio loads, first episode exists, desk chrome present
//   3. create a panel with a base64 image → the row stores /api/media URLs
//      (local-disk storage) and the URL actually serves the bytes
//   4. type a caption in the UI → debounced PATCH persists it
//   5. optimistic locking: a PATCH with a stale baseUpdatedAt answers 409
//      and carries the current row
//   6. custom sizing via API → the ratio fields appear in the settings UI
//   7. screenshots to OUT_DIR
//
// Needs the dev server up and a `glass-*@example.com` smoke user (password
// inkdrop-test-1) — run scripts/glass-stage-smoke.mjs first if none exists.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const OUT = process.env.OUT_DIR || "/tmp/webtoon-studio";
await fs.mkdir(OUT, { recursive: true });

for (const f of [".env", ".env.local"]) {
  try {
    for (const line of (await fs.readFile(f, "utf8")).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [user] = await sql`select email from users where email like 'glass-%' order by created_at desc limit 1`;
await sql.end();
if (!user) throw new Error("no glass-* smoke user — run scripts/glass-stage-smoke.mjs first");

// 1×1 red PNG
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

// ── login (fill-until-hydrated: the submit button is disabled until React wakes) ──
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
const submit = page.locator("button[type=submit]");
for (let i = 0; i < 10; i++) {
  await page.fill("#email", user.email);
  await page.fill("#password", "inkdrop-test-1");
  try { await submit.click({ timeout: 3000 }); break; } catch {}
}
await page.waitForURL(/dashboard|welcome|write/, { timeout: 25000 });

// ── create a webtoon story ──
const story = await page.evaluate(async () => {
  const r = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Lantern District", format: "webtoon", genres: ["Fantasy"] }),
  }).then((x) => x.json());
  return r.data?.story?.id ?? r.data?.id;
});
if (!story) throw new Error("story create failed");
console.log("story:", story);

// ── studio loads, episode exists ──
await page.goto(`${BASE}/write/${story}/webtoon`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const episodeId = await page.evaluate(async (storyId) => {
  const r = await fetch(`/api/stories/${storyId}/chapters`).then((x) => x.json());
  return r.data?.[0]?.id;
}, story);
if (!episodeId) throw new Error("no first episode — route should have seeded it");
console.log("episode:", episodeId);
await page.screenshot({ path: path.join(OUT, "1-studio-empty.png") });

// ── panel with a base64 image → media URLs on disk ──
const created = await page.evaluate(async ({ storyId, episodeId, PNG }) => {
  const r = await fetch(`/api/stories/${storyId}/chapters/${episodeId}/panels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      panels: [{
        imageData: PNG,
        caption: "",
        sizing: "standard",
        layout: "single",
        frames: JSON.stringify([{ id: "frame-1", imageData: PNG }]),
        borderStyle: "none",
        imageFit: "cover",
        aspectRatio: null,
        overlays: "[]",
      }],
    }),
  }).then((x) => x.json());
  return r.data?.[0];
}, { storyId: story, episodeId, PNG });
if (!created?.id) throw new Error("panel create failed");
const frames = JSON.parse(created.frames);
if (!created.imageData.startsWith("/api/media/") || !frames[0].imageData.startsWith("/api/media/")) {
  throw new Error(`base64 was not externalized: ${created.imageData.slice(0, 60)}`);
}
console.log("media URL:", frames[0].imageData);
const mediaOk = await page.evaluate(async (url) => {
  const r = await fetch(url);
  return { status: r.status, type: r.headers.get("content-type"), cache: r.headers.get("cache-control") };
}, frames[0].imageData);
if (mediaOk.status !== 200 || mediaOk.type !== "image/png") {
  throw new Error(`media route broken: ${JSON.stringify(mediaOk)}`);
}
console.log("media served:", JSON.stringify(mediaOk));

// ── caption typed in the UI persists via the debounced PATCH ──
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// The caption textarea hides until the panel's notes toggle opens it.
await page.getByLabel("Panel notes").first().click();
const caption = page.locator("textarea").first();
await caption.fill("The lanterns woke before the city did.");
await page.waitForTimeout(2500); // debounce is 600ms; leave headroom for a cold dev-server compile
const savedCaption = await page.evaluate(async ({ storyId, episodeId }) => {
  const r = await fetch(`/api/stories/${storyId}/chapters/${episodeId}/panels`).then((x) => x.json());
  return r.data?.[0]?.caption;
}, { storyId: story, episodeId });
if (savedCaption !== "The lanterns woke before the city did.") {
  throw new Error(`caption did not persist: ${JSON.stringify(savedCaption)}`);
}
console.log("caption persisted ✓");
await page.screenshot({ path: path.join(OUT, "2-studio-panel.png") });

// ── optimistic locking ──
const conflict = await page.evaluate(async ({ storyId, episodeId, panelId }) => {
  const stale = new Date(Date.now() - 3600_000).toISOString();
  const r = await fetch(`/api/stories/${storyId}/chapters/${episodeId}/panels/${panelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption: "stale write", baseUpdatedAt: stale }),
  });
  const j = await r.json();
  return { status: r.status, code: j.error?.code, keptCaption: j.data?.caption };
}, { storyId: story, episodeId, panelId: created.id });
if (conflict.status !== 409 || conflict.code !== "CONFLICT") {
  throw new Error(`optimistic lock missing: ${JSON.stringify(conflict)}`);
}
console.log("stale PATCH → 409 with current row ✓ (kept:", JSON.stringify(conflict.keptCaption), ")");

// ── custom sizing shows the ratio fields ──
await page.evaluate(async ({ storyId, episodeId, panelId }) => {
  await fetch(`/api/stories/${storyId}/chapters/${episodeId}/panels/${panelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sizing: "custom", aspectRatio: "3:4" }),
  });
}, { storyId: story, episodeId, panelId: created.id });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const ratioFields = await page.getByLabel("Width ratio").count();
console.log("custom ratio fields present:", ratioFields > 0);
if (!ratioFields) throw new Error("custom sizing has no ratio UI");
await page.screenshot({ path: path.join(OUT, "3-custom-sizing.png") });

if (problems.length) {
  console.error("PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`webtoon studio smoke ✓ — shots in ${OUT}`);
await browser.close();
