import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto("http://localhost:3000/mockup-browse-concepts/hearth", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo({ top: 320, behavior: "instant" }));
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/hearth-1-wall.png" });
// pull a spine
await page.getByTitle("The Obsidian Crown — Kaelen Thorne").click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/hearth-2-pulled.png" });
await browser.close();
