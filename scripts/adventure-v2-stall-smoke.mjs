// Usage: build + `next start -p 3457` (or SMOKE_BASE), mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive the Director's stall failsafe at /demo-adventure-v2: pass the pen,
// verify the Director keeps "Take the pen back" while a player writes (and
// that players see no such hand), then reclaim the pen.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE-ERR:", m.text()));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });
await page.waitForSelector("text=the dice are with");

const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });

// The fixture boots with a live slip — clear it so the Director holds the quill.
await page.getByRole("button", { name: "Call it off" }).click();
const quill = page.locator("textarea");
await quill.waitFor();
log("boot: slip called off, Director holds the quill");

// ── 1. Director passes the pen with @ ──
await quill.fill("The alley narrows to a knife's width. @Kaelen what do you do?");
await page.getByRole("button", { name: "Add to the story" }).click();
await page.waitForSelector("text=Kaelen is writing", { timeout: 8000 });
log("pen passed: 'Kaelen is writing…' on the Director's page");

// ── 2. The Director's hands are on the page ──
const takeBack = page.getByRole("button", { name: "Take the pen back" });
await takeBack.waitFor({ timeout: 4000 });
log("Director sees 'Take the pen back'");
await page.screenshot({ path: SHOT("stall-1-director-hands") });

// ── 3. Another player waits with no hands ──
await roleBtn("Lyra").click();
await page.waitForSelector("text=Kaelen is writing", { timeout: 4000 });
log("probe: Lyra sees no stall controls:",
  (await page.getByRole("button", { name: "Take the pen back" }).count()) === 0);
await page.screenshot({ path: SHOT("stall-2-player-calm") });

// ── 4. The Director reclaims the pen ──
await roleBtn("the Director").click();
await page.getByRole("button", { name: "Take the pen back" }).click();
await quill.waitFor({ timeout: 4000 });
log("pen reclaimed: the Director's quill is back");
log("probe: waiting line gone:",
  (await page.getByText("Kaelen is writing").count()) === 0);
await page.screenshot({ path: SHOT("stall-3-reclaimed") });

await browser.close();
log("stall smoke complete");
