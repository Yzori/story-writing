import { chromium } from "playwright";

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/landing-experience", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/shot-1-doors.png" });

  // lean on writer
  await page.mouse.move(360, 450);
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/shot-2-lean.png" });

  // cross into writer world
  await page.mouse.click(360, 450);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/shot-3-crossing.png" });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "/tmp/shot-4-writer-world.png" });

  // hover a hotspot
  const spot = page.locator('button[aria-label^="The Writing Hall"]');
  await spot.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/shot-5-hotspot.png" });

  // CTA → page
  await page.getByRole("button", { name: "Begin writing" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "/tmp/shot-6-writer-page.png" });

  // restart and go reader
  await page.getByRole("button", { name: "↺ begin again" }).click();
  await page.waitForTimeout(800);
  await page.mouse.move(1080, 450);
  await page.waitForTimeout(700);
  await page.mouse.click(1080, 450);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "/tmp/shot-7-reader-world.png" });

  await page.getByRole("button", { name: "Step inside" }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "/tmp/shot-8-reader-page.png" });

  await browser.close();
};
run();
