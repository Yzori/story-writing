import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #111; font-family: Arial, sans-serif; }
      .phone { width: 360px; min-height: 640px; margin: 0 auto; background: #17120f; }
      .panel { position: relative; width: 340px; height: 500px; margin: 16px auto; overflow: hidden; border-radius: 12px; background: #211c17; }
      .badge { position: absolute; left: 8px; top: 8px; width: 28px; height: 28px; border-radius: 50%; background: #d4a574; z-index: 10; }
      .controls { position: absolute; right: 8px; top: 8px; z-index: 20; display: flex; max-width: calc(100% - 56px); align-items: center; justify-content: flex-end; gap: 4px; padding: 4px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; background: rgba(20,16,13,.7); opacity: 1; }
      .btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 0; border-radius: 999px; background: transparent; color: #ddd; font-size: 11px; }
      .delete { color: rgb(205, 89, 102); }
      .settings { position: absolute; left: 8px; right: 8px; top: 56px; z-index: 30; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: #2a241e; }
      .settings select { width: 100%; height: 32px; margin-top: 6px; border-radius: 6px; }
      .frame-controls { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 4px; opacity: 1; }
      .frame-controls select { width: 96px; height: 36px; border-radius: 6px; background: rgba(20,16,13,.8); color: #ddd; font-size: 11px; }
      .frame-controls .btn { width: 36px; height: 36px; background: rgba(20,16,13,.8); }
      .bubble { position: absolute; left: 50%; top: 42%; width: 46%; transform: translate(-50%, -50%); min-height: 44px; padding: 10px 12px; border-radius: 18px; border: 2px solid #222; background: white; color: #111; touch-action: none; text-align: center; }
      .drag-handle { position: absolute; top: -16px; left: 50%; width: 48px; height: 28px; transform: translateX(-50%); border-radius: 999px; background: rgba(20,16,13,.9); color: #d4a574; }
      .mobile-bubble-toolbar { position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; justify-content: center; pointer-events: none; }
      .mobile-bubble-toolbar > div { pointer-events: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 100%; padding: 8px; border-radius: 12px; background: rgba(20,16,13,.9); }
      .mobile-bubble-toolbar button { min-width: 36px; height: 36px; border: 0; border-radius: 8px; color: #ddd; background: transparent; }
    </style>
  </head>
  <body>
    <main class="phone">
      <section class="panel" data-testid="panel">
        <div class="badge"></div>
        <div class="controls" data-testid="panel-controls">
          <button class="btn">T</button>
          <button class="btn">N</button>
          <button class="btn">+</button>
          <button class="btn">S</button>
          <button class="btn">D</button>
          <button class="btn delete">X</button>
        </div>
        <div class="settings" data-testid="settings">
          <label>Frame layout<select><option>2 x 3</option></select></label>
        </div>
        <div class="bubble" data-testid="bubble">
          <button class="drag-handle" data-testid="drag-handle" aria-label="Drag bubble"></button>
          Tap to edit
        </div>
        <div class="frame-controls" data-testid="frame-controls">
          <select><option>Panel fit</option></select>
          <button class="btn">R</button>
          <button class="btn delete">X</button>
        </div>
        <div class="mobile-bubble-toolbar" data-testid="bubble-toolbar">
          <div>
            <button>Speech</button><button>Thought</button><button>↙</button><button>M</button><button>X</button>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 740 },
  isMobile: true,
  hasTouch: true,
});
await page.setContent(html);

const panel = await page.getByTestId("panel").boundingBox();
const controls = await page.getByTestId("panel-controls").boundingBox();
const settings = await page.getByTestId("settings").boundingBox();
const frameControls = await page.getByTestId("frame-controls").boundingBox();
const toolbar = await page.getByTestId("bubble-toolbar").boundingBox();
const handle = await page.getByTestId("drag-handle").boundingBox();

if (!panel || !controls || !settings || !frameControls || !toolbar || !handle) {
  throw new Error("missing mobile controls");
}

const controlOpacity = await page.getByTestId("panel-controls").evaluate((node) => getComputedStyle(node).opacity);
if (controlOpacity !== "1") throw new Error(`mobile panel controls should be visible, got opacity ${controlOpacity}`);

if (controls.x < panel.x || controls.x + controls.width > panel.x + panel.width + 1) {
  throw new Error(`mobile panel controls overflow: ${JSON.stringify({ panel, controls })}`);
}

if (settings.x < panel.x || settings.x + settings.width > panel.x + panel.width + 1) {
  throw new Error(`mobile settings overflow: ${JSON.stringify({ panel, settings })}`);
}

const smallButtons = await page.locator(".controls .btn").evaluateAll((nodes) =>
  nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return Math.min(rect.width, rect.height);
  }).filter((size) => size < 40)
);
if (smallButtons.length > 0) throw new Error(`panel buttons below touch target: ${smallButtons.join(",")}`);

if (frameControls.y < panel.y + panel.height / 2) {
  throw new Error(`frame controls should live away from top toolbar: ${JSON.stringify({ panel, frameControls })}`);
}

if (toolbar.y < panel.y + panel.height * 0.6) {
  throw new Error(`mobile bubble toolbar should be bottom anchored: ${JSON.stringify({ panel, toolbar })}`);
}

if (handle.width < 44 || handle.height < 24) {
  throw new Error(`bubble drag handle too small: ${JSON.stringify(handle)}`);
}

console.log(JSON.stringify({
  ok: true,
  mobilePanelControlsVisible: true,
  touchTargets: true,
  settingsContained: true,
  frameControlsReachable: true,
  bubbleToolbarBottomAnchored: true,
  dragHandle: { width: Math.round(handle.width), height: Math.round(handle.height) },
}));

await browser.close();
