import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/landing-experience", { waitUntil: "networkidle" });
await page.mouse.move(1080, 450);
await page.waitForTimeout(700);
await page.mouse.click(1080, 450);
await page.waitForTimeout(3400);
// hover the CTA to see the book-plate
await page.getByRole("button", { name: "Step inside" }).hover();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/shore-0-bookplate.png" });
// enter the pirate cove
await page.locator('button[aria-label^="Enter Adventure"]').click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/shore-1-cove.png" });
// pick the first tale
await page.getByRole("button", { name: /The Wrong Lighthouse/ }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/shore-2-tale.png" });
// back to the shore, then the archipelago
await page.getByRole("button", { name: "⟵ more tales from this shore" }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "⟵ the archipelago" }).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: "/tmp/shore-3-back.png" });
await browser.close();
