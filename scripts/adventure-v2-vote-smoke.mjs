// Usage: build + `next start -p 3457`, mkdir -p /tmp/adventure-v2-shots, then run with node.
// Drive the v2 vote end-to-end at /demo-adventure-v2.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3457";
const SHOT = (n) => `/tmp/adventure-v2-shots/${n}.png`;
const log = (...a) => console.log("▸", ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(BASE + "/demo-adventure-v2", { waitUntil: "networkidle" });
const roleBtn = (label) => page.locator("div.fixed.right-4 button", { hasText: label });

// Clear the boot dice slip first: Lyra rolls it away.
await page.waitForSelector("text=the dice are with");
await roleBtn("Lyra").click();
await page.getByRole("button", { name: "Roll", exact: true }).click();
await page.waitForSelector("text=/— Lyra rolled:/", { timeout: 10000 });
await page.waitForSelector("text=the Director is writing", { timeout: 10000 });
log("setup: boot dice slip resolved, pen with the Director");

// ── 1. Director opens the vote via "/" ──
await roleBtn("the Director").click();
const quill = page.locator("textarea");
await quill.waitFor();
await quill.fill("/");
await page.waitForSelector("text=Put it to a vote");
log("'/' menu shows both moves:",
  await page.getByRole("button", { name: "Call for a roll" }).count(),
  await page.getByRole("button", { name: "Put it to a vote" }).count());
await page.getByRole("button", { name: "Put it to a vote" }).click();
await page.waitForSelector("text=a vote — the table writes lines");
await page.getByLabel("The question to put to a vote").fill("The altar splits open. What does the party do?");
await page.screenshot({ path: SHOT("v1-votecall") });
await page.getByRole("button", { name: "Open the vote" }).click();
await page.waitForSelector("text=put to a vote — the table writes, then votes");
log("vote block printed; Director sees:", JSON.stringify(await page.getByText("waiting for lines").count()), "waiting-murmur");
// probe: resolve disabled with no lines
log("probe: 'Add the winner' disabled with no lines:",
  await page.getByRole("button", { name: "Add the winner to the story" }).isDisabled());
await page.screenshot({ path: SHOT("v2-open-empty") });

// ── 2. Kaelen writes a line ──
await roleBtn("Kaelen").click();
const lineBox = page.getByLabel("Write your line for the vote");
await lineBox.fill("draws his blade and steps between Lyra and the altar, ready for whatever crawls out.");
await page.getByRole("button", { name: "Add your line" }).click();
await page.waitForSelector("text=draws his blade and steps");
log("Kaelen's line on the table; composer gone for him:",
  (await page.getByLabel("Write your line for the vote").count()) === 0);

// ── 3. Elara writes a rival line; the table's rule: no voting your own ──
await roleBtn("Elara").click();
await page.getByLabel("Write your line for the vote").fill("The dead in the walls whisper all at once. Elara raises a hand — not to fight, but to listen.");
await page.getByRole("button", { name: "Add your line" }).click();
await page.waitForSelector("text=The dead in the walls whisper");
log("probe: own line not clickable:",
  (await page.locator("button", { hasText: "The dead in the walls whisper" }).count()) === 0);
await page.locator("button", { hasText: "draws his blade" }).click();
await page.waitForSelector("text=your vote");
log("Elara voted Kaelen's line");

// probe: vote toggle — tap again takes it back
await page.locator("button", { hasText: "draws his blade" }).click();
log("probe: tap again removes vote:", (await page.getByText("your vote").count()) === 0);
await page.locator("button", { hasText: "draws his blade" }).click();

// ── 4. Kaelen votes Elara's line; Lyra votes Kaelen's ──
await roleBtn("Kaelen").click();
await page.locator("button", { hasText: "The dead in the walls whisper" }).click();
await roleBtn("Lyra").click();
await page.locator("button", { hasText: "draws his blade" }).click();
await page.waitForSelector("text=2 votes");
log("Kaelen's line at 2 votes");
await page.screenshot({ path: SHOT("v3-votes-in") });

// ── 5. The viewer leans ──
await roleBtn("a viewer").click();
await page.waitForSelector("text=tap a line to lean");
await page.locator("button", { hasText: "draws his blade" }).click();
await page.waitForSelector("text=your lean");
log("viewer leaned; lean printed:",
  JSON.stringify(await page.locator("p", { hasText: /viewer.*lean/i }).first().innerText()));
await page.screenshot({ path: SHOT("v4-viewer-lean") });

// ── 6. Director adds the winner ──
await roleBtn("the Director").click();
const winBtn = page.getByRole("button", { name: "Add the winner to the story" });
log("resolve enabled with votes in:", !(await winBtn.isDisabled()));
await winBtn.click();
await page.waitForSelector("text=/— put to a vote: Kaelen's line carried, 2 votes to 1\\./");
log("record line:", JSON.stringify(await page.locator("p", { hasText: "— put to a vote" }).first().innerText()));
await page.waitForSelector("p:has-text('draws his blade and steps between Lyra and the altar, ready for whatever crawls out.')", { timeout: 12000 });
log("winning passage replayed into the story");
log("vote block gone:", (await page.getByText("put to a vote — the table writes").count()) === 0);
log("pen with the Director (quill visible):", (await page.locator("textarea").count()) === 1);
await page.screenshot({ path: SHOT("v5-resolved") });

// ── 7. Probe: call it off ──
await quill.fill("/");
await page.getByRole("button", { name: "Put it to a vote" }).click();
await page.getByLabel("The question to put to a vote").fill("A throwaway question?");
await page.getByRole("button", { name: "Open the vote" }).click();
await page.waitForSelector("text=put to a vote — the table writes");
await page.getByRole("button", { name: "Call it off" }).click();
await page.waitForSelector("textarea");
log("probe: Call it off returns to the quill, nothing printed:",
  (await page.getByText("A throwaway question?").count()) === 0);

await browser.close();
console.log("DONE");
