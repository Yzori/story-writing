import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #111; }
      .page { width: 680px; margin: 40px auto; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 24px; }
      .panel { height: 180px; border-radius: 8px; background: #d4a574; }
      .half { width: calc(50% - 12px); }
      .full { width: 100%; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="panel half" data-testid="left"></div>
      <div class="panel half" data-testid="right"></div>
      <div class="panel full" data-testid="below"></div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.setContent(html);

const left = await page.getByTestId("left").boundingBox();
const right = await page.getByTestId("right").boundingBox();
const below = await page.getByTestId("below").boundingBox();
if (!left || !right || !below) throw new Error("missing layout panels");

if (Math.abs(left.y - right.y) > 1) {
  throw new Error("half-width panels did not share a row");
}

if (right.x <= left.x + left.width) {
  throw new Error("right panel did not sit to the right of left panel");
}

if (below.y <= left.y + left.height) {
  throw new Error("full-width panel did not flow below the half-width row");
}

if (below.width < left.width + right.width) {
  throw new Error("full-width panel is not spanning the row");
}

console.log(JSON.stringify({
  ok: true,
  halfPanelsShareRow: true,
  fullPanelBelow: true,
}));

await browser.close();
