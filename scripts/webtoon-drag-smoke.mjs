import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #111; font-family: sans-serif; }
      .panel { position: relative; width: 420px; margin: 80px auto; border: 1px solid #5b5148; border-radius: 12px; overflow: hidden; background: #211c17; }
      .image { width: 100%; height: 560px; background: linear-gradient(135deg, #2c241e, #5c4128); }
      .handle { position: absolute; left: 12px; top: 12px; z-index: 4; width: 28px; height: 28px; border-radius: 999px; border: 0; background: #d4a574; cursor: grab; }
      .bubble { position: absolute; z-index: 5; left: 50%; top: 40%; width: 34%; transform: translate(-50%, -50%); padding: 12px; border-radius: 18px; background: white; color: #111; text-align: center; cursor: grab; user-select: none; }
    </style>
  </head>
  <body>
    <div class="panel" data-testid="panel">
      <div class="image"></div>
      <button class="handle" data-testid="handle">1</button>
      <div class="bubble" data-testid="bubble">move me</div>
    </div>
    <script>
      const panel = document.querySelector("[data-testid=panel]");
      const bubble = document.querySelector("[data-testid=bubble]");
      const handle = document.querySelector("[data-testid=handle]");
      let bubbleDrag = null;
      let panelDrag = null;

      bubble.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        bubble.setPointerCapture(event.pointerId);
        const rect = panel.getBoundingClientRect();
        bubbleDrag = { x: event.clientX, y: event.clientY, left: 50, top: 40, w: rect.width, h: rect.height };
      });
      bubble.addEventListener("pointermove", (event) => {
        if (!bubbleDrag) return;
        event.stopPropagation();
        const left = Math.max(5, Math.min(95, bubbleDrag.left + ((event.clientX - bubbleDrag.x) / bubbleDrag.w) * 100));
        const top = Math.max(5, Math.min(95, bubbleDrag.top + ((event.clientY - bubbleDrag.y) / bubbleDrag.h) * 100));
        bubble.style.left = left + "%";
        bubble.style.top = top + "%";
      });
      bubble.addEventListener("pointerup", (event) => {
        event.stopPropagation();
        bubbleDrag = null;
      });

      handle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        const currentY = Number(panel.dataset.y || 0);
        panelDrag = { y: event.clientY, currentY };
      });
      handle.addEventListener("pointermove", (event) => {
        if (!panelDrag) return;
        const y = panelDrag.currentY + event.clientY - panelDrag.y;
        panel.dataset.y = String(y);
        panel.style.transform = "translateY(" + y + "px)";
      });
      handle.addEventListener("pointerup", () => {
        panelDrag = null;
      });
    </script>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.setContent(html);

const panel = page.getByTestId("panel");
const bubble = page.getByTestId("bubble");
const handle = page.getByTestId("handle");
const beforePanel = await panel.boundingBox();
const beforeBubble = await bubble.boundingBox();
if (!beforePanel || !beforeBubble) throw new Error("missing panel or bubble");

await page.mouse.move(beforeBubble.x + beforeBubble.width / 2, beforeBubble.y + beforeBubble.height / 2);
await page.mouse.down();
await page.mouse.move(beforeBubble.x + beforeBubble.width / 2 + 80, beforeBubble.y + beforeBubble.height / 2 + 40, { steps: 8 });
await page.mouse.up();

const afterBubbleDragPanel = await panel.boundingBox();
const afterBubble = await bubble.boundingBox();
if (!afterBubbleDragPanel || !afterBubble) throw new Error("missing panel or bubble after drag");
if (Math.abs(afterBubbleDragPanel.y - beforePanel.y) > 1) throw new Error("panel moved while dragging bubble");
if (Math.abs(afterBubble.x - beforeBubble.x) < 20) throw new Error("bubble did not move enough");

const handleBox = await handle.boundingBox();
if (!handleBox) throw new Error("missing reorder handle");
await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
await page.mouse.down();
await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 60, { steps: 6 });
await page.mouse.up();
const afterHandleDragPanel = await panel.boundingBox();
if (!afterHandleDragPanel) throw new Error("missing panel after handle drag");
if (Math.abs(afterHandleDragPanel.y - afterBubbleDragPanel.y) < 20) throw new Error("handle did not move panel");

console.log(JSON.stringify({
  ok: true,
  panelStayedDuringBubbleDrag: true,
  bubbleMoved: true,
  handleMovesPanel: true,
}));

await browser.close();
