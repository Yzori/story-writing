// Usage: build + `next start -p 3457`, mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive the v2 dice ritual end-to-end at /demo-adventure-v2.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE-ERR:", m.text()));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });

const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });

// ── 1. Boot state (Director view): fixture slip for Lyra is live ──
await page.waitForSelector("text=the dice are with");
log("boot: slip live, Director sees 'the dice are with Lyra':",
  await page.locator("text=the dice are with").count());
log("boot: ask printed:", await page.getByText("Decipher the rune sequence").count());
log("boot: holds/breaks stakes printed:",
  await page.getByText("you read the binding clear", { exact: false }).count(),
  await page.getByText("The runes burn your skin", { exact: false }).count());
log("boot: Roll button hidden for Director:", await page.getByRole("button", { name: "Roll", exact: true }).count());
await page.screenshot({ path: SHOT("1-slip-director") });

// ── 2. Switch to Lyra, roll ──
await roleBtn("Lyra").click();
const rollBtn = page.getByRole("button", { name: "Roll", exact: true });
await rollBtn.waitFor();
log("Lyra sees Roll button");
await page.screenshot({ path: SHOT("2-slip-lyra") });
await rollBtn.click();
await page.waitForSelector('[role="status"]', { timeout: 8000 });
const stamp = await page.locator('[role="status"]').innerText();
log("stamp:", JSON.stringify(stamp.replace(/\n/g, " · ")));
await page.screenshot({ path: SHOT("3-stamp") });

// slip settles → set line joins the story, pen returns to the Director
await page.waitForSelector("text=/— Lyra rolled:/", { timeout: 8000 });
log("set line in story:", JSON.stringify(await page.locator("p", { hasText: "— Lyra rolled:" }).first().innerText()));
await page.waitForSelector("text=the Director is writing", { timeout: 8000 });
log("pen returned: Lyra sees 'the Director is writing…'");
log("slip gone:", (await page.getByText("the dice are with").count()) === 0);
await page.screenshot({ path: SHOT("4-setline") });

// ── 3. Director calls a fresh roll via "/" ──
await roleBtn("the Director").click();
const quill = page.locator("textarea");
await quill.waitFor();
await quill.fill("/");
await page.waitForSelector("text=Call for a roll");
log("'/' summons the moves menu");
// probe: commit disabled while the menu is open
log("probe: 'Add to the story' disabled while menu open:",
  await page.getByRole("button", { name: "Add to the story" }).isDisabled());
await page.screenshot({ path: SHOT("5-slash-menu") });
await page.getByRole("button", { name: "Call for a roll" }).click();
await page.waitForSelector("text=a roll — the slip prints");

// probe: Ask disabled until who + ask are set
const askBtn = page.getByRole("button", { name: "Ask for the roll" });
log("probe: Ask disabled at start:", await askBtn.isDisabled());
const rollCall = page.locator("div", { hasText: "a roll — the slip prints" }).last();
await rollCall.getByRole("button", { name: "Kaelen" }).click();
await page.getByLabel("What's at stake").fill("Cross the hall before the lantern turns.");
await page.getByLabel("What happens if the roll holds").fill("you reach the stair unseen");
await page.getByLabel("What happens if the roll breaks").fill("the light finds you");
log("Ask enabled after fields:", !(await askBtn.isDisabled()));
await page.screenshot({ path: SHOT("6-rollcall") });
await askBtn.click();
await page.waitForSelector("text=the dice are with");
log("slip printed for Kaelen; Director view shows murmur");
log("slip shows 'rolls the dice':", await page.getByText("rolls the dice").count());
await page.screenshot({ path: SHOT("7-slip-kaelen") });

// ── 4. Kaelen rolls ──
await roleBtn("Kaelen").click();
await page.getByRole("button", { name: "Roll", exact: true }).click();
await page.waitForSelector("text=/— Kaelen rolled: .*\\. It (holds|breaks)/", { timeout: 15000 });
log("set line (dried):", JSON.stringify(await page.locator("p", { hasText: "— Kaelen rolled:" }).first().innerText()));
log("Lyra's earlier set line (dried):", JSON.stringify(await page.locator("p", { hasText: "— Lyra rolled:" }).first().innerText()));
await page.screenshot({ path: SHOT("8-setline-kaelen") });

// ── 5. Probes: Never mind; viewer sees the calm page ──
await roleBtn("the Director").click();
await quill.fill("/");
await page.getByRole("button", { name: "Call for a roll" }).click();
await page.getByRole("button", { name: "Never mind" }).click();
await page.waitForSelector("textarea");
log("probe: Never mind returns to the quill");
await roleBtn("a viewer").click();
log("probe: viewer sees waiting line:", await page.getByText("is writing…").count());

await browser.close();
console.log("DONE");
