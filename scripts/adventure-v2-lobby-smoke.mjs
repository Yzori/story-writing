// Usage: build + `next start -p 3457` (or SMOKE_BASE), mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive the Threshold (lobby) at /demo-adventure-v2: switch to the lobby
// stage, watch the room brighten as the table gathers, answer + lift the
// warm-up, pin/hold a wager as the viewer, take a temperature, then Begin —
// the match strikes, the lifted line opens the story, and the book seals.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);
const fail = (msg) => {
  console.error("✗ FAIL:", msg);
  process.exitCode = 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE-ERR:", m.text()));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });
await page.waitForSelector("text=the dice are with");

const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });

// ── 1. Through the door: the lobby stage ──
await roleBtn("lobby").click();
await page.waitForSelector(".manuscript-room--unlit", { timeout: 8000 });
log("the room is unlit");
await page.waitForSelector(".ghost-line", { timeout: 8000 });
log("the ghost overture drifts");
await page.waitForSelector("text=2 of 4 at the table", { timeout: 8000 });
await page.screenshot({ path: SHOT("lobby-1-unlit") });

// ── 2. The table gathers ──
await roleBtn("someone arrives").click();
await page.waitForSelector("text=3 of 4 at the table", { timeout: 8000 });
log("someone arrived — the room steps brighter");

// ── 3. The warm-up: Kaelen answers, the Director lifts ──
await page.waitForSelector("text=answer in a line", { timeout: 8000 });
await roleBtn("Kaelen").click();
await page
  .getByLabel("Answer the question in one line")
  .fill("Of counting coins that kept changing their faces.");
await page.getByRole("button", { name: "Add your line" }).click();
await page.waitForSelector("text=changing their faces", { timeout: 8000 });
log("Kaelen answered in his ink");
await roleBtn("the Director").click();
await page.locator("text=lift this line").first().click();
await page.waitForSelector("text=this line will open the story", { timeout: 8000 });
log("the Director lifted a line");
await page.screenshot({ path: SHOT("lobby-2-lifted") });

// ── 4. The viewer's hands: pin a wager, hold one ──
await roleBtn("a viewer").click();
await page.waitForSelector("text=held by 6", { timeout: 8000 });
await page.locator("text=+ I think this happens…").first().click();
await page
  .getByLabel("Your wager — what you think happens tonight")
  .first()
  .fill("The dice betray Kaelen twice.");
await page.getByRole("button", { name: "pin it" }).first().click();
await page.waitForSelector("text=The dice betray Kaelen", { timeout: 8000 });
log("viewer pinned a wager");
await page.locator("text=hold it").first().click();
await page.waitForSelector("text=you hold it", { timeout: 8000 });
log("viewer held a wager");
await page.screenshot({ path: SHOT("lobby-3-wagers") });

// ── 5. A temperature (never a vote) ──
await roleBtn("the Director").click();
await page.getByRole("button", { name: "Call it off" }).click();
await page.getByRole("button", { name: "Leave a question for the cast" }).click();
await page.getByRole("button", { name: "by leaning" }).click();
await page.getByLabel("The question").fill("tonight: blood, or banter?");
await page.getByLabel("Option 1").fill("blood");
await page.getByLabel("Option 2").fill("banter");
await page.getByRole("button", { name: "Leave the question" }).click();
await page.waitForSelector("text=a temperature", { timeout: 8000 });
if ((await page.getByRole("button", { name: /Add the winner/ }).count()) !== 0) {
  fail("a temperature must never offer a resolve");
}
log("temperature posed — no resolve affordance exists");
await roleBtn("Lyra").click();
await page.getByRole("button", { name: /blood/ }).first().click();
await page.waitForSelector("text=your lean", { timeout: 8000 });
log("Lyra leaned");

// Put the warm-up back so Begin has a line to lift.
await roleBtn("the Director").click();
await page.getByRole("button", { name: "Call it off" }).click();
await page.getByRole("button", { name: "Leave a question for the cast" }).click();
await page.getByRole("button", { name: "Leave the question" }).click();
await roleBtn("Lyra").click();
await page
  .getByLabel("Answer the question in one line")
  .fill("Of a door underwater, and someone knocking from the other side.");
await page.getByRole("button", { name: "Add your line" }).click();
await page.waitForSelector("text=door underwater", { timeout: 8000 });
await roleBtn("the Director").click();
await page.locator("text=lift this line").first().click();
await page.waitForSelector("text=this line will open the story", { timeout: 8000 });

// ── 6. Begin: the match strikes, the lifted line opens the story ──
await page.getByRole("button", { name: "Begin the session" }).click();
await page.waitForSelector(".match-strike", { timeout: 8000 });
log("the match struck");
if ((await page.locator(".manuscript-room--unlit").count()) !== 0) {
  fail("the room should be lit after begin");
}
await page.waitForSelector("p:has-text('door underwater')", { timeout: 8000 });
log("the lifted answer opened the story");
await page.waitForSelector(".wager-slip--sealed", { timeout: 8000 });
if ((await page.locator("text=+ I think this happens…").count()) !== 0) {
  fail("the wager composer must vanish at begin");
}
log("the book sealed — slips dimmed, hands gone");
await page.screenshot({ path: SHOT("lobby-4-begun") });

// ── 7. The rim folds to a strip on a phone ──
await page.setViewportSize({ width: 375, height: 800 });
await page.waitForTimeout(600);
const stripVisible = await page
  .locator(".lg\\:hidden .wager-slip")
  .first()
  .isVisible()
  .catch(() => false);
if (!stripVisible) fail("phone viewport should dock the slips as a strip");
else log("phone: slips docked as a strip");
await page.screenshot({ path: SHOT("lobby-5-phone") });

await browser.close();
if (process.exitCode === 1) {
  console.error("lobby smoke FAILED");
} else {
  log("lobby smoke complete");
}
