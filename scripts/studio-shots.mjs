// Verify the redesigned Studio: register a throwaway user, seed a story +
// chapter through the real APIs (so /api/dashboard has a manuscript to
// quote), then capture the greeting / manuscript hero / shelf, the bridge
// note, the empty first-night state, and the returning-after-days greeting.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp/studio";
const stamp = Date.now();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

// ── register ──
await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Studio Tester");
await page.fill("#email", `studio-${stamp}@example.com`);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(1200);
await page.click("button[type=submit]");
await page.waitForURL(/welcome|create|write|dashboard/, { timeout: 20000 });
console.log("registered, landed on", page.url());

// ── empty studio first (skip the arrival ceremony for clean shots) ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.mouse.click(720, 1500); // fast-forward the arrival if present
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}-1-first-night.png`, fullPage: true });

// ── seed a story + a chapter with real prose via the APIs ──
const seeded = await page.evaluate(async () => {
  const s = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Cartographer of Drowned Cities", format: "novel", genres: ["Fantasy"] }),
  }).then((r) => r.json());
  const storyId = s.data?.story?.id ?? s.data?.id;
  if (!storyId) return { error: JSON.stringify(s) };
  const c = await fetch(`/api/stories/${storyId}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The Salt Archive",
      content:
        "<p>The archive smelled of kelp and old candle smoke, and Maren had learned to read its moods the way sailors read the sky.</p>" +
        "<p>She unrolled the last chart across the table and weighted its corners with whatever the sea had given up that morning. The drowned city was there, of course — it was always there — but tonight its streets had moved again, the ink rearranging itself the way it did when somebody, somewhere below, was still alive enough to dream. She dipped her pen, and the water in the inkwell went dark.</p>",
    }),
  }).then((r) => r.json());
  return { storyId, chapter: c.data ? "ok" : JSON.stringify(c) };
});
console.log("seeded:", JSON.stringify(seeded));

// ── the studio with a manuscript ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}-2-manuscript.png`, fullPage: true });
await page.screenshot({ path: `${OUT}-2b-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });

// ── leave a bridge note ──
const bridgeBtn = page.getByText("+ a line for tomorrow-you");
if (await bridgeBtn.count()) {
  await bridgeBtn.click();
  await page.keyboard.type("Maren finds the second inkwell — the one that writes in salt.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}-3-bridge-note.png` });
} else {
  console.log("WARN: bridge note button not found");
}

// ── returning after six days — the absence-scaled greeting ──
await page.evaluate(() => {
  localStorage.setItem("quiloria-last-seen", String(Date.now() - 6 * 86_400_000));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}-4-six-days-away.png` });

await browser.close();
console.log("done → /tmp/studio-*.png");
