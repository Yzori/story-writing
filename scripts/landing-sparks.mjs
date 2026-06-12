import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/landing-experience", { waitUntil: "networkidle" });
await page.mouse.move(1080, 450);
await page.waitForTimeout(300);
await page.mouse.click(1080, 450);
// catch sparks mid-flight at a few moments
await page.waitForTimeout(3400);
await page.screenshot({ path: "/tmp/sparks-1.png" });
await page.waitForTimeout(2200);
await page.screenshot({ path: "/tmp/sparks-2.png" });
await page.waitForTimeout(3000);
await page.screenshot({ path: "/tmp/sparks-3.png" });
await browser.close();
