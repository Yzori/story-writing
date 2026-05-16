import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #f5efe5; }
      .flow { width: 520px; margin: 24px auto; display: flex; flex-wrap: wrap; row-gap: 0; column-gap: 0; }
      .panel { width: 100%; background: transparent; }
      .panel.black { background: #000; padding: 4px; box-sizing: border-box; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 0; background: transparent; }
      .image { height: 180px; background: linear-gradient(90deg, #47331d, #d9a53b); }
      .notes { display: none; }
      .black .grid { gap: 4px; background: #000; padding: 0; }
      .black .image { border-bottom: 4px solid #000; }
    </style>
  </head>
  <body>
    <main class="flow">
      <section class="panel" data-testid="panel-1"><div class="grid"><div class="image" data-testid="image-1"></div></div><div class="notes"></div></section>
      <section class="panel" data-testid="panel-2"><div class="grid"><div class="image" data-testid="image-2"></div></div><div class="notes"></div></section>
      <section class="panel black" data-testid="black-panel"><div class="grid"><div class="image" data-testid="black-image"></div></div></section>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
await page.setContent(html);

const image1 = await page.getByTestId("image-1").boundingBox();
const image2 = await page.getByTestId("image-2").boundingBox();
if (!image1 || !image2) throw new Error("missing flow images");

const verticalGap = Math.round(image2.y - (image1.y + image1.height));
if (verticalGap !== 0) {
  throw new Error(`expected continuous webtoon flow, got ${verticalGap}px gap`);
}

const notesVisible = await page.locator(".notes").evaluateAll((nodes) =>
  nodes.some((node) => getComputedStyle(node).display !== "none")
);
if (notesVisible) throw new Error("empty panel notes should not create visible space");

const blackPanel = await page.getByTestId("black-panel").boundingBox();
const blackImage = await page.getByTestId("black-image").boundingBox();
if (!blackPanel || !blackImage) throw new Error("missing black divider panel");

const blackInset = Math.round(blackImage.x - blackPanel.x);
if (blackInset !== 4) {
  throw new Error(`expected visible black divider inset, got ${blackInset}px`);
}

console.log(JSON.stringify({ ok: true, verticalGap, notesAreOptional: true, blackDividerInset: blackInset }));
await browser.close();
