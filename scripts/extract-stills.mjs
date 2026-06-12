import { chromium } from "playwright";

// Pull three portrait stills out of hero-video.mp4 for the "IV · The Ways"
// section: alone (writer at desk), together (ink crossing the shelves),
// alive (dragon + reader). Crops avoid the baked-in caption zones.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000/hero-video.mp4");
await page.waitForSelector("video");

const seek = (t) =>
  page.evaluate((time) => {
    const v = document.querySelector("video");
    v.pause();
    v.currentTime = time;
    return new Promise((r) => { v.onseeked = r; setTimeout(r, 2500); });
  }, t);

const box = await page.locator("video").boundingBox();
const crop = (fx, fw) => ({
  x: box.x + box.width * fx,
  y: box.y + box.height * 0.04,
  width: box.width * fw,
  height: box.height * 0.92,
});

await seek(0.8);
await page.screenshot({ path: "public/landing/still-alone.png", clip: crop(0.03, 0.4) });

await seek(7.6);
await page.screenshot({ path: "public/landing/still-together.png", clip: crop(0.3, 0.4) });

await seek(12.3);
await page.screenshot({ path: "public/landing/still-alive.png", clip: crop(0.5, 0.4) });

await browser.close();
