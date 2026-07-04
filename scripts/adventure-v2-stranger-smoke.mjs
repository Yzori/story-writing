// Usage: build + `next start -p 3457` (or SMOKE_BASE against dev), mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive the Stranger end-to-end at /demo-adventure-v2: the fixture deed is
// already on the page in moon-silver; the Director wakes the Stranger via
// "/", frames two deeds, the viewer chooses, the Director adds the deed.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });
const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });

// ── 0. The fixture Stranger is already in the book ──
await page.waitForSelector("text=the dice are with");
log("fixture record line printed:",
  (await page.getByText("— the Gravekeeper stirred: the house chose its deed, 7 voices to 4.").count()) === 1);
const deedLine = page.locator("p", { hasText: "wrote Lyra's name in grave-script" }).first();
log("fixture deed present:", (await deedLine.count()) === 1);
log("deed inked in moon-silver:",
  JSON.stringify(await deedLine.evaluate((el) => getComputedStyle(el).color)));
log("chair on the signature line:",
  (await page.getByText("☾ the Gravekeeper").count()) >= 1);

// Clear the boot dice slip: Lyra rolls it away.
await roleBtn("Lyra").click();
await page.getByRole("button", { name: "Roll", exact: true }).click();
await page.waitForSelector("text=/— Lyra rolled:/", { timeout: 10000 });
await page.waitForSelector("text=the Director is writing", { timeout: 10000 });
log("setup: boot dice slip resolved, pen with the Director");

// ── 1. Director wakes the Stranger via "/" ──
await roleBtn("the Director").click();
const quill = page.locator("textarea");
await quill.waitFor();
await quill.fill("/");
await page.waitForSelector("text=Wake the Stranger");
log("'/' menu offers the Stranger:",
  await page.getByRole("button", { name: "Wake the Stranger" }).count());
await page.getByRole("button", { name: "Wake the Stranger" }).click();
await page.waitForSelector("text=the Gravekeeper wakes — the audience chooses what it does");
// probe: needs a moment + two deeds
log("probe: commit disabled while empty:",
  await page.getByRole("button", { name: "Put it to the audience" }).isDisabled());
await page.getByLabel("The moment the Stranger wakes into").fill("The altar light gutters — something crosses it.");
await page.getByLabel("Deed 1").fill("The Gravekeeper snuffs the altar light with a closed fist.");
log("probe: still disabled with one deed:",
  await page.getByRole("button", { name: "Put it to the audience" }).isDisabled());
await page.getByLabel("Deed 2").fill("The Gravekeeper speaks Kaelen's debt aloud, so every soul in the room hears it.");
await page.screenshot({ path: SHOT("s1-strangercall") });
await page.getByRole("button", { name: "Put it to the audience" }).click();
await page.waitForSelector("text=the audience chooses its deed");
log("ballot printed at the live edge");
log("probe: 'Add its deed' disabled with no voices yet:",
  await page.getByRole("button", { name: "Add its deed to the story" }).isDisabled());
await page.screenshot({ path: SHOT("s2-ballot-open") });

// ── 2. Players cannot choose — the dark decides ──
await roleBtn("Kaelen").click();
await page.waitForSelector("text=the audience is deciding");
log("probe: player sees no deed buttons:",
  (await page.locator("button", { hasText: "snuffs the altar light" }).count()) === 0);

// ── 3. The viewer chooses (and can move their voice) ──
await roleBtn("a viewer").click();
await page.waitForSelector("text=tap a deed — the audience decides together");
await page.locator("button", { hasText: "snuffs the altar light" }).click();
await page.waitForSelector("text=your choice");
log("viewer chose a deed");
await page.locator("button", { hasText: "speaks Kaelen's debt aloud" }).click();
await page.waitForSelector("text=your choice");
log("probe: voice moves to the other deed:",
  (await page.locator("button", { hasText: "speaks Kaelen's debt aloud" }).locator("text=your choice").count()) === 1);
await page.screenshot({ path: SHOT("s3-viewer-choice") });

// ── 4. Director adds the chosen deed ──
await roleBtn("the Director").click();
const addBtn = page.getByRole("button", { name: "Add its deed to the story" });
await page.waitForFunction(
  () => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Add its deed to the story"));
    return btn && !btn.disabled;
  },
  { timeout: 15000 },
);
log("resolve enabled once voices are in");
await addBtn.click();
await page.waitForSelector("text=/— the Gravekeeper stirred: the house chose its deed, \\d+ voice/");
log("record line printed");
await page.waitForSelector("p:has-text('Gravekeeper s')", { timeout: 12000 });
log("ballot gone:", (await page.getByText("the audience chooses its deed").count()) === 0);
log("pen with the Director (quill visible):", (await page.locator("textarea").count()) === 1);
await page.screenshot({ path: SHOT("s4-resolved") });

// ── 5. Probe: the veto — Call it off prints nothing ──
await quill.fill("/");
await page.getByRole("button", { name: "Wake the Stranger" }).click();
await page.getByLabel("The moment the Stranger wakes into").fill("A throwaway moment?");
await page.getByLabel("Deed 1").fill("Throwaway deed one.");
await page.getByLabel("Deed 2").fill("Throwaway deed two.");
await page.getByRole("button", { name: "Put it to the audience" }).click();
await page.waitForSelector("text=the Gravekeeper stirs");
await page.getByRole("button", { name: "Call it off" }).click();
await page.waitForSelector("textarea");
log("probe: veto returns to the quill, nothing printed:",
  (await page.getByText("Throwaway deed one.").count()) === 0);

// ── 6. Probe: @-naming the Stranger inks silver in the cast list ──
await quill.fill("The shadows lengthen. @Grave");
await page.waitForSelector(".move-card button");
log("probe: @ list offers the Stranger:",
  (await page.locator(".move-card button", { hasText: "Gravekeeper" }).count()) === 1);
await page.locator(".move-card button", { hasText: "Gravekeeper" }).click();
log("probe: mention completed:",
  (await quill.inputValue()).includes("@Gravekeeper"));

await browser.close();
console.log("DONE");
