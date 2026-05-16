import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #111; font-family: sans-serif; }
      .panel { position: relative; width: 420px; margin: 80px auto; border: 1px solid #5b5148; border-radius: 12px; overflow: hidden; background: #211c17; }
      .image { position: relative; width: 100%; height: 420px; background: linear-gradient(135deg, #2c241e, #5c4128); }
      .bubble { position: absolute; z-index: 5; left: 86%; top: 48%; width: 34%; transform: translate(-50%, -50%); padding: 12px; border-radius: 18px; background: white; color: #111; text-align: center; }
      .toolbar-wrap { position: absolute; left: 0; right: 0; z-index: 20; top: 36%; display: flex; justify-content: center; padding: 0 8px; pointer-events: none; }
      .toolbar { pointer-events: auto; display: flex; max-width: 100%; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px; border-radius: 8px; border: 1px solid #5b5148; background: rgba(17, 14, 12, 0.92); padding: 6px 8px; }
      button { font-size: 9px; white-space: nowrap; }
    </style>
  </head>
  <body>
    <div class="panel" data-testid="panel">
      <div class="image" data-testid="image">
        <div class="bubble" data-testid="bubble">edge bubble</div>
        <div class="toolbar-wrap" data-testid="toolbar-wrap">
          <div class="toolbar" data-testid="toolbar">
            <button>Speech</button><button>Thought</button><button>Narrate</button><button>Shout</button>
            <button>↙</button><button>↘</button><button>↖</button><button>↗</button><button>✕</button>
            <button>S</button><button>M</button><button>L</button><button>Del</button>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.setContent(html);

const image = await page.getByTestId("image").boundingBox();
const toolbar = await page.getByTestId("toolbar").boundingBox();
if (!image || !toolbar) throw new Error("missing image or toolbar");

const withinLeft = toolbar.x >= image.x;
const withinRight = toolbar.x + toolbar.width <= image.x + image.width + 1;
const withinTop = toolbar.y >= image.y;
const withinBottom = toolbar.y + toolbar.height <= image.y + image.height + 1;

if (!withinLeft || !withinRight || !withinTop || !withinBottom) {
  throw new Error(`toolbar escaped image bounds: ${JSON.stringify({ image, toolbar })}`);
}

console.log(JSON.stringify({
  ok: true,
  toolbarInsideImage: true,
  toolbarWidth: Math.round(toolbar.width),
  imageWidth: Math.round(image.width),
}));

await browser.close();
