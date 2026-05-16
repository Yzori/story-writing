import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #f5efe5; }
      .panel { width: 600px; margin: 40px auto; background: #efe5d7; border: 1px solid #dacdbd; border-radius: 12px; overflow: hidden; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; background: #dacdbd; }
      .frame { height: 180px; background: #fffaf2; border: 1px dashed #b8aa99; display: grid; place-items: center; color: #776b5f; font: 700 14px Arial, sans-serif; }
      .bottom { grid-column: span 2 / span 2; }
    </style>
  </head>
  <body>
    <section class="panel" data-testid="panel">
      <div class="grid" data-testid="grid">
        <button class="frame" data-testid="frame-1">Frame 1<br>Drop or click</button>
        <button class="frame" data-testid="frame-2">Frame 2<br>Drop or click</button>
        <button class="frame bottom" data-testid="frame-3">Frame 3<br>Drop or click</button>
      </div>
    </section>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 720 } });
await page.setContent(html);

const panel = await page.getByTestId("panel").boundingBox();
const frame1 = await page.getByTestId("frame-1").boundingBox();
const frame2 = await page.getByTestId("frame-2").boundingBox();
const frame3 = await page.getByTestId("frame-3").boundingBox();

if (!panel || !frame1 || !frame2 || !frame3) throw new Error("missing frame layout elements");

const sameTopRow = Math.abs(frame1.y - frame2.y) < 1;
const bottomBelow = frame3.y > frame1.y + frame1.height;
const topSpanWidth = frame2.x + frame2.width - frame1.x;
const bottomFullWidth = Math.abs(frame3.x - frame1.x) < 1 && Math.abs(frame3.width - topSpanWidth) < 1;
const dropZoneLabels = await page.locator(".frame").evaluateAll((nodes) =>
  nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim())
);

if (!sameTopRow || !bottomBelow || !bottomFullWidth || dropZoneLabels.length !== 3) {
  throw new Error(JSON.stringify({ panel, frame1, frame2, frame3, sameTopRow, bottomBelow, bottomFullWidth, dropZoneLabels }));
}

console.log(JSON.stringify({
  ok: true,
  visibleDropZones: dropZoneLabels.length,
  topPairSharesRow: true,
  bottomFrameSpansPanel: true,
  panelWidth: Math.round(panel.width),
}));

await browser.close();
