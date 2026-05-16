import { chromium } from "playwright";

const html = String.raw`<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; background: #f5efe5; font-family: Arial, sans-serif; }
      .panel { width: 520px; margin: 32px auto; border: 1px solid #dacdbd; border-radius: 12px; overflow: hidden; }
      .grid { display: grid; gap: 4px; background: #dacdbd; }
      .cols-1 { grid-template-columns: minmax(0, 1fr); }
      .cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
      .slot { height: 140px; background: #fffaf2; border: 1px dashed #b8aa99; color: #776b5f; }
      .span-2 { grid-column: span 2 / span 2; }
      .span-3 { grid-column: span 3 / span 3; }
    </style>
  </head>
  <body>
    <select data-testid="layout">
      <option value="single">1 frame</option>
      <option value="side-by-side">2 side</option>
      <option value="stack">Stack</option>
      <option value="top-pair-bottom" selected>2 + 1</option>
      <option value="grid-4">2 x 2</option>
      <option value="mosaic-5">2 + 3</option>
      <option value="grid-6">2 x 3</option>
    </select>
    <section class="panel"><div class="grid" data-testid="grid"></div></section>
    <script>
      const slotCount = (layout) => layout === "grid-6" ? 6 : layout === "mosaic-5" ? 5 : layout === "grid-4" ? 4 : layout === "top-pair-bottom" ? 3 : layout === "side-by-side" || layout === "stack" ? 2 : 1;
      const gridClass = (layout) => layout === "stack" || layout === "single" ? "cols-1" : layout === "mosaic-5" ? "cols-6" : "cols-2";
      const slotClass = (layout, index) => {
        if (layout === "top-pair-bottom" && index === 2) return " span-2";
        if (layout === "mosaic-5") return index < 2 ? " span-3" : " span-2";
        return "";
      };
      const render = () => {
        const layout = document.querySelector("[data-testid='layout']").value;
        const grid = document.querySelector("[data-testid='grid']");
        grid.className = "grid " + gridClass(layout);
        grid.innerHTML = "";
        for (let i = 0; i < slotCount(layout); i += 1) {
          const button = document.createElement("button");
          button.className = "slot" + slotClass(layout, i);
          button.textContent = "Frame " + (i + 1);
          grid.append(button);
        }
      };
      document.querySelector("[data-testid='layout']").addEventListener("change", render);
      render();
    </script>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
await page.setContent(html);

const countSlots = () => page.locator(".slot").count();

if (await countSlots() !== 3) throw new Error("2 + 1 should start with three slots");
await page.getByTestId("layout").selectOption("single");
if (await countSlots() !== 1) throw new Error("single layout should shrink to one slot");
await page.getByTestId("layout").selectOption("side-by-side");
if (await countSlots() !== 2) throw new Error("side-by-side layout should show two slots");
await page.getByTestId("layout").selectOption("top-pair-bottom");
if (await countSlots() !== 3) throw new Error("2 + 1 layout should restore three slots");
await page.getByTestId("layout").selectOption("grid-4");
if (await countSlots() !== 4) throw new Error("2 x 2 layout should show four slots");
await page.getByTestId("layout").selectOption("mosaic-5");
if (await countSlots() !== 5) throw new Error("2 + 3 layout should show five slots");
await page.getByTestId("layout").selectOption("grid-6");
if (await countSlots() !== 6) throw new Error("2 x 3 layout should show six slots");

console.log(JSON.stringify({ ok: true, layoutControlsSlotCount: true }));
await browser.close();
