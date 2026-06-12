import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/landing-experience", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("quiloria-landing-last-tale-v1"));
await page.mouse.move(1080, 450);
await page.waitForTimeout(600);
await page.mouse.click(1080, 450);
await page.waitForTimeout(2750);
await page.screenshot({ path: "/tmp/birth-1.png" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/birth-2.png" });
// enter adventure shore (retry against bobbing motion)
for (let i = 0; i < 4; i++) {
  await page.locator('button[aria-label^="Enter Adventure"]').click({ force: true });
  try { await page.getByText("Three tales are told").waitFor({ timeout: 2500 }); break; } catch {}
}
await page.getByRole("button", { name: /Saltbones/ }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "read chapter one →" }).click();
await page.waitForTimeout(1400);
await page.getByRole("button", { name: "↺ begin again" }).click();
await page.waitForTimeout(900);
await page.mouse.move(1080, 450);
await page.waitForTimeout(500);
await page.mouse.click(1080, 450);
await page.waitForTimeout(3400);
await page.getByRole("button", { name: "Continue reading" }).hover();
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/birth-3-resume.png" });
await browser.close();
