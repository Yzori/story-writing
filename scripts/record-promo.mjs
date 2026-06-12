// Records /promo?record at 1920x1080 with Playwright's built-in screencast.
// The page holds mahogany black for 1.5s, plays the 55s film once, then sets
// data-promo-done="true". We hold the final frame ~2s and close.
//
//   node scripts/record-promo.mjs <baseURL> <outDir>

import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3199";
const outDir = process.argv[3] ?? "/tmp/promo-rec";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
});

// prewarm so the dev-server compile doesn't eat into the real take
const warm = await ctx.newPage();
await warm.goto(`${base}/promo?record`, { waitUntil: "networkidle", timeout: 120000 });
await warm.waitForTimeout(2500); // fonts settle
await warm.close();

const page = await ctx.newPage();
// the Next dev-tools indicator floats above everything; keep it out of the take
await page.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = "nextjs-portal{display:none!important}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});
await page.goto(`${base}/promo?record`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-promo-done="true"]', { timeout: 120000 });
await page.waitForTimeout(2000);
const video = page.video();
await page.close();
const path = await video.path();
await ctx.close();
await browser.close();
console.log(`VIDEO:${path}`);
