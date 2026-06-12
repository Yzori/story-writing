// Verify the Arrival ceremony: register a throwaway user (real flow sets the
// "new" flag), visit /dashboard, capture the veil → drop → open beats, then
// replay the "return" variant via the sessionStorage flag.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/tmp/arrival";
const stamp = Date.now();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ── register (sets the "new" arrival flag on success) ──
await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Arrival Tester");
await page.fill("#email", `arrival-${stamp}@example.com`);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(1200); // let the valid-form ink drop settle
await page.click("button[type=submit]");
await page.waitForURL(/welcome|create|write/, { timeout: 20000 });
console.log("registered, landed on", page.url());

// ── first studio entrance → "new" ceremony ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}-new-1-veil.png` });
await page.waitForTimeout(1200); // ~2.8s: drop falling / splash
await page.screenshot({ path: `${OUT}-new-2-drop.png` });
await page.waitForTimeout(800); // ~3.6s: hole opening
await page.screenshot({ path: `${OUT}-new-3-open.png` });
await page.waitForTimeout(1500); // done — studio with motes
await page.screenshot({ path: `${OUT}-new-4-studio.png` });

// flag consumed — a plain reload must NOT replay the ceremony
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}-no-replay.png` });

// ── "return" variant via the flag (what login sets) ──
await page.evaluate(() => {
  sessionStorage.setItem("quiloria-arrival-v1", JSON.stringify({ kind: "return", t: Date.now() }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}-return-1-veil.png` });

// click-to-skip fast-forwards to the reveal
await page.mouse.click(720, 700);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}-return-2-skipped.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}-return-3-studio.png` });

await browser.close();
console.log("done → /tmp/arrival-*.png");
