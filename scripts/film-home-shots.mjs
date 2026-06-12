import { chromium } from "playwright";

// Walkthrough of /mockup-homepage-v4 (time-driven) — gate, then the
// film plays itself; we capture each synced beat and the handoff
// WITHOUT scrolling, then the lower sections.
const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/mockup-homepage-v4", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("video");
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/tmp/film-0-gate.png" });

  // Press begin (quietly — CI has no audio device anyway)
  await page.getByRole("button", { name: "watch quietly" }).click();

  // Capture at film timestamps by polling video.currentTime
  const captureAt = async (t, name) => {
    await page.waitForFunction(
      (time) => document.querySelector("video")?.currentTime >= time,
      t,
      { timeout: 30000 }
    );
    await page.screenshot({ path: `/tmp/film-${name}.png` });
  };

  await captureAt(2.5, "1-writer-beat");
  await captureAt(7, "2-crossing-beat");
  await captureAt(11, "3-reader-beat");
  // Brand card: letters land ~1.2s after handoff (t=14.4), drop ~2s
  await captureAt(15.7, "4a-brand-letters");
  await captureAt(16.6, "4b-brand-drop");
  await page.waitForTimeout(4500); // brand holds 2.9s, then handoff settles
  await page.screenshot({ path: "/tmp/film-5-handoff-settled.png" });

  // Lower sections (normal scroll)
  await page.evaluate(() => {
    document.querySelectorAll("section")[1]?.scrollIntoView({ behavior: "instant" });
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "/tmp/film-6-shelf.png" });

  await page.evaluate(() => {
    document.querySelectorAll("section")[2]?.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "/tmp/film-7-doors.png" });

  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
