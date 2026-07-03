// Usage: build + `next start -p 3457`, mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive The House's gold gestures end-to-end at /demo-adventure-v2:
// the pre-gilded line, tap-a-line → set it in gold, leave gold for the table,
// the flare, and the calm of every other chair (no reach, no gold hand).
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });
const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });
await page.waitForSelector("text=the dice are with");

// ── 1. The fixture line arrives already gilded, on every chair ──
log("pre-gilded line visible (t-2 shimmer):", (await page.locator(".ink-gilded").count()) >= 1);

// Cast chairs: no gild reach, no gold hand in the signature.
log("probe: Director has no gild reach:", (await page.locator(".gild-reach").count()) === 0);
log("probe: Director has no 'leave gold':", (await page.getByText("leave gold ✦").count()) === 0);

// ── 2. The viewer's chair: lines are within the dark's reach ──
await roleBtn("a viewer").click();
await page.waitForSelector(".gild-reach");
const reachCount = await page.locator(".gild-reach").count();
log("viewer: story lines within reach:", reachCount, "(set lines excluded)");
log("viewer: 'leave gold' hand at the page's foot:", (await page.getByText("leave gold ✦").count()) === 1);
await page.screenshot({ path: SHOT("g1-viewer-reach") });

// ── 3. Tap a line → the gold slip quotes it → set it in gold ──
await page.locator(".gild-reach").first().click();
await page.waitForSelector("text=set this line in gold");
log("gild slip open; law printed:", (await page.getByText("gold buys light, never the story").count()) === 1);
log("well shown:", JSON.stringify(await page.locator("text=your well holds").first().innerText()));
await page.screenshot({ path: SHOT("g2-gild-slip") });
// probe: Never mind closes without light
await page.getByRole("button", { name: "Never mind" }).click();
log("probe: Never mind leaves no new gold:", (await page.locator(".ink-gilded").count()) === 1);

await page.locator(".gild-reach").first().click();
await page.waitForSelector("text=set this line in gold");
await page.getByRole("button", { name: "Set it in gold" }).click();
await page.waitForSelector("text=the room grows brighter");
await page.waitForSelector(".gold-flare");
log("gold set: flare fired:", (await page.locator(".gold-flare").count()) === 1);
await page.screenshot({ path: SHOT("g3-flare") });
await page.waitForSelector("text=set this line in gold", { state: "detached", timeout: 5000 });
log("second line now gilded:", (await page.locator(".ink-gilded").count()) === 2);

// ── 4. Leave gold for the table (no line quoted) ──
await page.getByText("leave gold ✦").click();
await page.waitForSelector("text=leave gold for the table");
log("table slip has no quoted line:", (await page.locator("text=set this line in gold").count()) === 0);
// pick 10 so the demo well never runs dry mid-smoke
await page.getByRole("button", { name: "10", exact: true }).click();
await page.getByRole("button", { name: "Leave gold", exact: true }).click();
await page.waitForSelector("text=the room grows brighter");
log("table gold: no new gilded line:", (await page.locator(".ink-gilded").count()) === 2);
await page.screenshot({ path: SHOT("g4-table-gold") });

// ── 5. The cast sees the light but keeps clean hands ──
await page.waitForSelector("text=leave gold for the table", { state: "detached", timeout: 5000 });
await roleBtn("Lyra").click();
log("Lyra sees both gilded lines:", (await page.locator(".ink-gilded").count()) === 2);
log("probe: Lyra has no gild reach:", (await page.locator(".gild-reach").count()) === 0);
await page.screenshot({ path: SHOT("g5-cast-sees-gold") });

await browser.close();
console.log("DONE");
