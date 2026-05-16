import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #111; }
      .panel { position: relative; width: 260px; height: 360px; margin: 60px auto; overflow: hidden; border-radius: 12px; background: #211c17; }
      .badge { position: absolute; left: 12px; top: 12px; width: 28px; height: 28px; border-radius: 50%; background: #d4a574; }
      .controls { position: absolute; right: 12px; top: 12px; z-index: 20; display: flex; max-width: calc(100% - 64px); align-items: center; justify-content: flex-end; gap: 6px; padding: 4px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; background: rgba(20,16,13,.55); }
      .btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: #ddd; font-size: 10px; }
      .copy { color: rgb(221,221,221); }
      .delete { border-color: rgba(205, 89, 102, .35); color: rgb(205, 89, 102); }
      .divider { width: 1px; height: 20px; background: rgba(255,255,255,.1); }
      .settings { position: absolute; right: 12px; top: 56px; z-index: 30; width: 240px; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08); background: #2a241e; }
      .settings select { width: 100%; height: 32px; margin-top: 6px; border: 1px solid rgba(255,255,255,.1); border-radius: 6px; background: #18130f; color: #ddd; }
      .frame-controls { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 4px; }
      .frame-controls select { width: 86px; height: 28px; border: 1px solid rgba(255,255,255,.1); border-radius: 6px; background: rgba(20,16,13,.76); color: #ddd; font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="panel" data-testid="panel">
      <div class="badge"></div>
      <div class="controls" data-testid="controls">
        <button class="btn">T</button>
        <button class="btn">N</button>
        <button class="btn">+</button>
        <button class="btn">⚙</button>
        <div class="divider"></div>
        <button class="btn copy" data-testid="copy">D</button>
        <button class="btn delete" data-testid="delete">X</button>
      </div>
      <div class="settings" data-testid="settings">
        <label>Panel shape<select><option>Standard</option></select></label>
        <label>Frame layout<select><option>2 + 1</option></select></label>
        <label>Dividers<select><option>No gap</option></select></label>
        <label>Default image fit<select><option>Cover</option></select></label>
      </div>
      <div class="frame-controls" data-testid="frame-controls">
        <select><option>Panel fit</option></select>
        <button class="btn copy">R</button>
        <button class="btn delete">X</button>
      </div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
await page.setContent(html);

const panel = await page.getByTestId("panel").boundingBox();
const controls = await page.getByTestId("controls").boundingBox();
const settings = await page.getByTestId("settings").boundingBox();
const frameControls = await page.getByTestId("frame-controls").boundingBox();
if (!panel || !controls || !settings || !frameControls) throw new Error("missing panel controls");

if (controls.x < panel.x || controls.x + controls.width > panel.x + panel.width + 1) {
  throw new Error(`controls escaped horizontally: ${JSON.stringify({ panel, controls })}`);
}

if (controls.y < panel.y || controls.y + controls.height > panel.y + panel.height + 1) {
  throw new Error(`controls escaped vertically: ${JSON.stringify({ panel, controls })}`);
}

if (controls.width > 236) {
  throw new Error(`compact controls grew too wide: ${JSON.stringify({ controls })}`);
}

if (settings.y < controls.y + controls.height) {
  throw new Error(`settings popover overlaps compact toolbar: ${JSON.stringify({ controls, settings })}`);
}

if (frameControls.y < panel.y + panel.height / 2) {
  throw new Error(`frame controls are still competing with top toolbar: ${JSON.stringify({ panel, frameControls })}`);
}

const iconStyles = await page.evaluate(() => {
  const copy = getComputedStyle(document.querySelector("[data-testid='copy']"));
  const remove = getComputedStyle(document.querySelector("[data-testid='delete']"));
  return {
    copyColor: copy.color,
    removeColor: remove.color,
  };
});

if (iconStyles.copyColor !== "rgb(221, 221, 221)") {
  throw new Error(`copy icon is not visibly styled by default: ${JSON.stringify(iconStyles)}`);
}

if (iconStyles.removeColor !== "rgb(205, 89, 102)") {
  throw new Error(`remove icon is not visibly styled by default: ${JSON.stringify(iconStyles)}`);
}

console.log(JSON.stringify({
  ok: true,
  controlsInsidePanel: true,
  compactPanelToolbar: true,
  settingsBelowToolbar: true,
  frameControlsAwayFromTopToolbar: true,
  iconsVisibleByDefault: true,
  controlsHeight: Math.round(controls.height),
  controlsWidth: Math.round(controls.width),
  panelWidth: Math.round(panel.width),
}));

await browser.close();
