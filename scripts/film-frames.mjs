import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto("http://localhost:3000/hero-video.mp4");
const video = page.locator("video");
for (const t of [0.5, 2, 4, 6, 8, 10, 12, 14, 16, 17.3]) {
  await page.evaluate((time) => {
    const v = document.querySelector("video");
    v.pause();
    v.currentTime = time;
    return new Promise((r) => { v.onseeked = r; setTimeout(r, 2000); });
  }, t);
  await page.waitForTimeout(300);
  await video.screenshot({ path: `/tmp/frame-${String(t).replace(".", "_")}.png` });
}
await browser.close();
