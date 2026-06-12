// Full reader-continuity loop: seed a published horror story as a writer,
// then as a stranger — sail the portal (taste), read the real chapter (place),
// hit the keep-your-place card, register, confirm prefilled preferences, and
// land back on the page with progress imported.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp/continuity";
const ts = Date.now();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// ── 1 · seed: writer account + published public horror story ──
await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Lantern Keeper");
await page.fill("#email", `writer-${ts}@example.com`);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(800);
await page.click("button[type=submit]");
await page.waitForURL(/welcome|create|write|dashboard/, { timeout: 20000 });

const seeded = await page.evaluate(async () => {
  const post = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Hollow Lantern", format: "novel", writingMode: "solo" }),
  });
  const story = (await post.json()).data;
  const paras = [
    "The lantern over the chapel door had burned for two hundred years, and the village paid its keeper well to never ask what it kept out.",
    "Mara took the job the week her mother stopped speaking, because silence in a house is heavier than any wick. The first night, the flame turned green at exactly three, and something in the orchard turned to watch it.",
    "By the fourth night she had learned the rules: trim the wick at dusk, never whistle on the path, and if the light goes out, do not — under any circumstance — relight it where it can see you.",
  ].map((p) => `<p>${p}</p>`).join("");
  const chPost = await fetch(`/api/stories/${story.id}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Green Hour", content: paras }),
  });
  const ch = (await chPost.json()).data;
  await fetch(`/api/stories/${story.id}/chapters/${ch.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: paras, status: "published" }),
  });
  await fetch(`/api/stories/${story.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic: true, status: "published", genres: ["Horror"], synopsis: "A lantern that keeps something out, and the girl paid to keep it burning." }),
  });
  const fresh = await fetch(`/api/stories/${story.id}`).then((r) => r.json());
  return { storyId: story.id, slug: fresh.data.slug, chapterId: ch.id };
});
console.log("seeded:", seeded);

// ── 2 · become a stranger ──
await ctx.clearCookies();
await page.evaluate(() => localStorage.clear());

// portal journey: horror world → taste captured
await page.goto(`${BASE}/landing-experience?world=reader`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.locator("text=The haunted reach").first().click({ force: true, timeout: 5000 }).catch(async () => {
  // satellite labels vary — click the horror world image region instead
  await page.locator('img[src*="world-horror"]').first().click({ force: true, timeout: 5000 });
});
await page.waitForTimeout(1800);
const taste = await page.evaluate(() => localStorage.getItem("quiloria-taste-v1"));
console.log("taste after shore visit:", taste);

// ── 3 · anon reads the real chapter ──
await page.goto(`${BASE}/story/${seeded.slug}/read/${seeded.chapterId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.mouse.wheel(0, 3000);
await page.waitForTimeout(1200);
await page.mouse.wheel(0, 3000);
await page.waitForTimeout(1500);
const place = await page.evaluate(() => localStorage.getItem("quiloria-anon-reading-v1"));
console.log("anon place:", place);
await page.screenshot({ path: `${OUT}-1-keep-place-card.png` });

// ── 4 · the invitation → register ──
await page.locator("a", { hasText: "keep my place" }).first().click({ timeout: 5000 });
await page.waitForURL(/register/, { timeout: 8000 });
await page.fill("#displayName", "Night Reader");
await page.fill("#email", `reader-${ts}@example.com`);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(800);
await page.click("button[type=submit]");

// should land on preferences with Horror pre-selected and next= back to the chapter
await page.waitForURL(/welcome\/preferences/, { timeout: 20000 }).catch(async (e) => {
  console.log("register stall — URL:", page.url());
  console.log("page text:", await page.evaluate(() => document.body.innerText.slice(0, 400)));
  await page.screenshot({ path: `${OUT}-register-stall.png` });
  throw e;
});
console.log("post-register URL:", page.url());
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}-2-prefs-prefilled.png` });

// step through: genres → length → comfort → submit
await page.locator("button", { hasText: /Next \(/ }).click({ timeout: 5000 });
await page.waitForTimeout(500);
await page.locator("button", { hasText: /^Next$/ }).click({ timeout: 5000 });
await page.waitForTimeout(500);
await page.locator("button", { hasText: "Show me stories" }).click({ timeout: 5000 });

// should land back on the chapter
await page.waitForURL(new RegExp(`/story/${seeded.slug}/read/`), { timeout: 15000 });
console.log("after preferences URL:", page.url());
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}-3-back-on-page.png` });

// progress imported?
const progress = await page.evaluate(async (storyId) => {
  const r = await fetch(`/api/reading-progress?storyId=${storyId}`);
  return r.ok ? (await r.json()).data : null;
}, seeded.storyId);
console.log("imported progress:", JSON.stringify(progress));
const leftovers = await page.evaluate(() => ({
  place: localStorage.getItem("quiloria-anon-reading-v1"),
  taste: localStorage.getItem("quiloria-taste-v1"),
}));
console.log("localStorage after loop:", JSON.stringify(leftovers));

await browser.close();
console.log("done → /tmp/continuity-*.png");
