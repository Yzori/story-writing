// The bridge, captured on the way out of the editor: write words, click a
// link that leaves the desk, answer the prompt, and find the line quoted on
// the manuscript hero back in the studio.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = process.env.OUT_DIR || "/tmp/studio-beats";
const stamp = Date.now();
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Bridge Tester");
await page.fill("#email", `bridge-${stamp}@example.com`);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(1200);
await page.click("button[type=submit]");
await page.waitForURL(/welcome|create|write|dashboard/, { timeout: 20000 });

const { storyId } = await page.evaluate(async () => {
  const s = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Second Letter", format: "novel", genres: ["Fantasy"] }),
  }).then((r) => r.json());
  const storyId = s.data?.story?.id ?? s.data?.id;
  await fetch(`/api/stories/${storyId}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Letter", content: "<p>It arrived on a Tuesday.</p>" }),
  });
  return { storyId };
});

// ── write something, so the desk has a reason to ask ──
await page.goto(`${BASE}/write/${storyId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const canvas = page.locator(".ProseMirror").first();
if (!(await canvas.count())) {
  problems.push("editor canvas never mounted");
} else {
  await canvas.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" She did not open it for eleven days, and by then the ink had changed its mind.");
  await page.waitForTimeout(2500); // let the autosave + session counter settle
}

// ── leave the desk ──
const out = page.locator('a[href="/dashboard"], a[href^="/read"], a[href^="/browse"]').first();
if (await out.count()) {
  await out.click();
} else {
  // the nav is a dock; fall back to any link that leaves this story
  await page.locator(`a[href^="/"]:not([href^="/write/${storyId}"])`).first().click();
}
await page.waitForTimeout(1200);

const asked = await page.getByText("Where were you headed?").count();
if (!asked) {
  problems.push("the desk did not ask for a bridge note on the way out");
} else {
  console.log("prompt appeared on the way out ✓");
  await page.screenshot({ path: path.join(OUT, "8-bridge-prompt.png") });
  await page.keyboard.type("She opens the second letter — and it's addressed to someone else.");
  await page.keyboard.press("Enter");
  await page.waitForURL(/dashboard|read|browse/, { timeout: 15000 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const quoted = await page.getByText("addressed to someone else").count();
  if (!quoted) problems.push("the note did not reach the studio's manuscript hero");
  else console.log("note quoted back in the studio ✓");
  await page.screenshot({ path: path.join(OUT, "9-bridge-on-hero.png"), clip: { x: 0, y: 0, width: 1440, height: 1000 } });
}

await browser.close();
if (problems.length) {
  console.error("\nPROBLEMS:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`\nall checks passed → ${OUT}/`);
