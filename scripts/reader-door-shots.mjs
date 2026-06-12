// Verify the reader test-drive funnel: deep entry from the film's read door,
// shore → tale → excerpt CTA, and that the plain route still opens at doors.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp/reader-door";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1 — deep entry: ?world=reader lands in the archipelago, no doors
await page.goto(`${BASE}/landing-experience?world=reader`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500); // portal reveal + island bloom
await page.screenshot({ path: `${OUT}-1-deep-entry.png` });

// 2 — sail to a genre world (satellites bob — force the click)
const horror = page.locator("button", { hasText: "The haunted reach" }).first();
const sat = horror.or(page.locator('[aria-label*="horror" i]').first());
try {
  await sat.click({ force: true, timeout: 4000 });
} catch {
  // fall back: click any satellite-ish button containing "shore"
  await page.locator("text=/tales on this shore/i").first().click({ force: true, timeout: 4000 }).catch(() => {});
}
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}-2-shore.png` });

// 3 — open a tale plate, then read
const lantern = page.locator(".group\\/tale").first();
await lantern.click({ force: true, timeout: 4000 }).catch(() => {});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}-3-plate.png` });
await page.locator("button", { hasText: "read chapter one" }).first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}-4-page.png` });

// the excerpt CTA — fixtures (dev DB empty) should still say "on quiloria"
const cta = await page.locator("a", { hasText: /keep reading/i }).first();
console.log("excerpt CTA:", await cta.textContent(), "→", await cta.getAttribute("href"));

// 5 — plain route still opens at the doors
await page.goto(`${BASE}/landing-experience`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}-5-doors.png` });

// 6 — the film's read doors now point at the portal
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const hrefs = await page.$$eval("a", (as) =>
  as.filter((a) => /step into a story|read/i.test(a.textContent || "")).map((a) => `${(a.textContent || "").trim().slice(0, 30)} → ${a.getAttribute("href")}`)
);
console.log("film read links:", hrefs);

await browser.close();
console.log("done → /tmp/reader-door-*.png");
