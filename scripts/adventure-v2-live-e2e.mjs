// Live e2e against next dev + real DB: the full v2 table with the M9 additions.
// Seats: Director (fixture GM), Sister Vael (fixture player, at the table),
// Corvin Ashe (fixture player, deliberately OFFLINE — the AFK case), and a
// freshly registered watcher (100 starter drops funds the gold gestures).
// Proves live: pen-pass notification + dampener, Director stall failsafe,
// Stranger ballot on real floor rounds, gold gild/table-gold with splits,
// and the Threshold: warm-up answered + lifted pre-begin (the lifted line
// opens the story), a wager pinned + anonymously held (sealed at begin,
// settled to a gold stamp through the real EndSessionModal).
//
// Usage: `npx next dev` on :3000 (AUTH_TRUST_HOST not needed there),
// migrations 0051+0052 applied, then `node scripts/adventure-v2-live-e2e.mjs`.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const STORY_ID = "20f6b192-61e8-49c3-8d9f-6825823cce7d";
const GM_EMAIL = "v2cut-gm-1783026883@example.com";
const VAEL_EMAIL = "v2cut-vael-1783026883@example.com";
const PASSWORD = "inkdrop-test-1";
const VAEL_CHAR = "606b8953-4944-4ae4-8c9d-90f38a8b6716";
const CORVIN_CHAR = "a81edbc2-05f9-48f6-aa8d-185d659eeb64";
const SHOT = (n) => `/tmp/adventure-v2-shots/live-${n}.png`;
const log = (...a) => console.log("▸", ...a);
const ts = Date.now();

const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  return page;
};

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const submit = page.getByRole("button", { name: "Return to my page" });
  // Hydration can eat the first keystrokes — retype until the form takes.
  for (let i = 0; i < 5; i++) {
    await page.locator("#email").fill("");
    await page.locator("#email").pressSequentially(email, { delay: 10 });
    await page.locator("#password").fill("");
    await page.locator("#password").pressSequentially(PASSWORD, { delay: 10 });
    if (await submit.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(700);
  }
  await submit.click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
}

// jfetch runs in-page so cookies + origin ride along (no CSRF dance).
const jfetch = (page, url, init) =>
  page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    { url, init },
  );

// ── Seats ──────────────────────────────────────────────────
const gm = await mkPage();
await login(gm, GM_EMAIL);
log("Director signed in");

const vael = await mkPage();
await login(vael, VAEL_EMAIL);
log("Vael signed in");

// Reuse a funded watcher when given (register is 5/hour per IP); register
// a fresh one otherwise — new accounts start with 100 drops either way.
const watcher = await mkPage();
if (process.env.WATCHER_EMAIL) {
  await login(watcher, process.env.WATCHER_EMAIL);
  log("watcher signed in:", process.env.WATCHER_EMAIL);
} else {
  await watcher.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  const regSubmit = watcher.locator("button[type=submit]");
  for (let i = 0; i < 5; i++) {
    await watcher.fill("#displayName", "A Shape In The Dark");
    await watcher.fill("#email", `v2watch-${ts}@example.com`);
    await watcher.fill("#password", PASSWORD);
    await watcher.fill("#confirmPassword", PASSWORD);
    if (await regSubmit.isEnabled().catch(() => false)) break;
    await watcher.waitForTimeout(700);
  }
  await regSubmit.click();
  try {
    await watcher.waitForURL((u) => !u.pathname.includes("register"), { timeout: 45000 });
  } catch (err) {
    await watcher.screenshot({ path: SHOT("fail-register") });
    console.log("register page text:", (await watcher.locator("body").innerText()).slice(0, 400));
    throw err;
  }
  log("watcher registered (100 starter drops)");
}

// ── Setup via product APIs (GM seat) ───────────────────────
const chair = await jfetch(gm, `/api/stories/${STORY_ID}`, {
  method: "PATCH",
  body: {
    campaignStrangerEnabled: true,
    campaignStrangerName: "the Gravekeeper",
    campaignStrangerNature: "It tends what the living bury and forget.",
  },
});
log("Stranger chair enabled:", chair.status === 200);

// Pre-flight: only one session may be live per campaign — close any
// stragglers a previous crashed run left behind.
const existing = await jfetch(gm, `/api/stories/${STORY_ID}/campaign/sessions`);
for (const s of existing.json?.data ?? []) {
  if (s.status === "active") {
    await jfetch(gm, `/api/stories/${STORY_ID}/campaign/sessions/${s.id}`, {
      method: "PATCH",
      body: { status: "completed" },
    });
    log("closed stale active session", s.id);
  }
}

const created = await jfetch(gm, `/api/stories/${STORY_ID}/campaign/sessions`, {
  method: "POST",
  body: {
    title: "M9 Live Proof",
    opening:
      "The vault beneath the proving ground has one door, and tonight it stands open.",
  },
});
const SESSION_ID = created.json?.data?.id;
if (!SESSION_ID) throw new Error("session create failed: " + JSON.stringify(created));
log("session created:", SESSION_ID);

const roster = await jfetch(
  gm,
  `/api/stories/${STORY_ID}/campaign/sessions/${SESSION_ID}/roster`,
  { method: "PUT", body: { characterIds: [VAEL_CHAR, CORVIN_CHAR] } },
);
log("roster set (Vael + Corvin present):", roster.status === 200);

const PLAY = `${BASE}/campaign/${STORY_ID}/play/${SESSION_ID}`;
const WATCH = `${BASE}/campaign/${STORY_ID}/watch/${SESSION_ID}`;

// ── 0. The Threshold (lobby) ───────────────────────────────
// Before the light: the Director leaves a warm-up, Vael answers, the line
// is lifted; the watcher pins a wager and a second (anonymous) token holds
// it. Begin must print the lifted line right after the opening, resolve the
// lobby round, and seal the book.
const wagersUrl = `/api/stories/${STORY_ID}/campaign/sessions/${SESSION_ID}/wagers`;
const floorUrl = `/api/stories/${STORY_ID}/campaign/sessions/${SESSION_ID}/floor-rounds`;

const warmup = await jfetch(gm, floorUrl, {
  method: "POST",
  body: { prompt: "what did your character dream last night?", mode: "warmup" },
});
if (!warmup.json?.data?.id) throw new Error("warmup open failed: " + JSON.stringify(warmup));
const warmupId = warmup.json.data.id;
const answered = await jfetch(vael, `${floorUrl}/${warmupId}/submissions`, {
  method: "POST",
  body: {
    characterId: VAEL_CHAR,
    type: "dialogue",
    content: "Of a door underwater, and someone knocking from the other side.",
  },
});
const answerId = answered.json?.data?.submissions?.find((s) => s.userId)?.id;
if (!answerId) throw new Error("warmup answer failed: " + JSON.stringify(answered));
const lifted = await jfetch(gm, `${floorUrl}/${warmupId}`, {
  method: "PATCH",
  body: { liftSubmissionId: answerId },
});
log("LOBBY LIVE: warm-up answered + lifted:", lifted.status === 200);

const pinned = await jfetch(watcher, wagersUrl, {
  method: "POST",
  body: { content: "Someone lies to the ferryman." },
});
const wagerId = pinned.json?.data?.find((w) => w.isMine)?.id;
if (!wagerId) throw new Error("wager pin failed: " + JSON.stringify(pinned));
const held = await jfetch(watcher, `${wagersUrl}/${wagerId}/holds`, {
  method: "POST",
  body: { token: `anon-hold-${ts}` },
});
log("LOBBY LIVE: wager pinned + anonymously held:", held.status === 200);

// ── Begin ──────────────────────────────────────────────────
// Begin via the same PATCH the button fires (dev hydration makes the click
// itself flaky to automate; the route is what we're proving).
const begun = await jfetch(
  gm,
  `/api/stories/${STORY_ID}/campaign/sessions/${SESSION_ID}`,
  { method: "PATCH", body: { status: "active" } },
);
if (begun.status !== 200) throw new Error("begin failed: " + JSON.stringify(begun));

// The begin transaction's lobby duties, proven on the real stack:
const roundAfter = await jfetch(gm, floorUrl);
log(
  "LOBBY LIVE: lobby round resolved at begin (no live round):",
  roundAfter.json?.data === null,
);
const sealedTry = await jfetch(watcher, wagersUrl, {
  method: "POST",
  body: { content: "Too late." },
});
log("LOBBY LIVE: book sealed at begin (wager 403):", sealedTry.status === 403);
await gm.goto(PLAY, { waitUntil: "domcontentloaded" });
await gm.waitForSelector("text=one door, and tonight it stands open", { timeout: 15000 });
log("session live; opening printed");
await gm.waitForSelector("p:has-text('door underwater')", { timeout: 15000 });
log("LOBBY LIVE: lifted answer printed after the opening");

await watcher.goto(WATCH, { waitUntil: "domcontentloaded" });
await watcher.waitForSelector("text=you are in the dark", { timeout: 15000 });
log("watcher in the dark");
await watcher.waitForSelector(".wager-slip--sealed", { timeout: 15000 });
log("LOBBY LIVE: sealed slip pinned at the watcher's rim");

await vael.goto(PLAY, { waitUntil: "domcontentloaded" });
try {
  await vael.waitForSelector("text=the Director is writing", { timeout: 25000 });
} catch (err) {
  await vael.screenshot({ path: SHOT("fail-vael") });
  await gm.screenshot({ path: SHOT("fail-gm") });
  console.log("vael page text:", (await vael.locator("body").innerText()).slice(0, 500));
  throw err;
}
log("Vael at the table, waiting");

// ── 1. Pass to OFFLINE Corvin → notification + stall failsafe ──
const gmQuill = gm.locator("textarea");
await gmQuill.fill(
  "The ledger lies open on the altar stone. @Corvin its first page bears your name.",
);
await gm.getByRole("button", { name: "Add to the story" }).click();
await gm.waitForSelector("text=Corvin is writing", { timeout: 15000 });
log("pen passed to Corvin (offline)");

const takeBack = gm.getByRole("button", { name: "Take the pen back" });
await takeBack.waitFor({ timeout: 5000 });
log("P0 LIVE: Director sees 'Take the pen back'");
await gm.screenshot({ path: SHOT("1-stall-hands") });

// Vael, waiting, must NOT see the Director's hands.
log(
  "probe: Vael has no stall controls:",
  (await vael.getByRole("button", { name: "Take the pen back" }).count()) === 0,
);

await takeBack.click();
await gmQuill.waitFor({ timeout: 10000 });
log("P0 LIVE: pen reclaimed, Director's quill is back");

// ── 2. Pass to Vael (online) → her notification + she writes ──
await gmQuill.fill("@Sister the seal answers older hands. Break it.");
await gm.getByRole("button", { name: "Add to the story" }).click();
await gm.waitForSelector("text=Sister is writing", { timeout: 15000 });

const vaelQuill = vael.locator("textarea");
await vaelQuill.waitFor({ timeout: 15000 });
log("Vael holds the pen");
const vaelNotifs = await jfetch(vael, "/api/notifications");
const penNotes = (vaelNotifs.json?.data?.notifications ?? []).filter(
  (n) => n.type === "pen",
);
log(
  "P1 LIVE: Vael's pen notification:",
  penNotes.length,
  JSON.stringify(penNotes[0]?.message ?? "NONE"),
);
await vael.screenshot({ path: SHOT("2-vael-pen") });

await vaelQuill.fill(
  "Sister Vael lays both palms on the seal and lets the old words leave her.",
);
await vael.getByRole("button", { name: "Add to the story" }).click();
await gmQuill.waitFor({ timeout: 15000 });
log("pen auto-returned to the Director after Vael's passage");

// Dampener: Vael JUST wrote — passing to her again must not re-notify.
await gmQuill.fill("@Sister the seal splits — keep going.");
await gm.getByRole("button", { name: "Add to the story" }).click();
await vaelQuill.waitFor({ timeout: 15000 });
const vaelNotifs2 = await jfetch(vael, "/api/notifications");
const penNotes2 = (vaelNotifs2.json?.data?.notifications ?? []).filter(
  (n) => n.type === "pen",
);
log("P1 LIVE dampener: still", penNotes2.length, "pen note(s) — no spam:",
  penNotes2.length === penNotes.length);
await vaelQuill.fill("She keeps going, and the vault listens.");
await vael.getByRole("button", { name: "Add to the story" }).click();
await gmQuill.waitFor({ timeout: 15000 });

// ── 3. The Stranger, on real floor rounds ──────────────────
// Reload so the play page re-polls the house count (30s cadence otherwise).
await gm.reload({ waitUntil: "domcontentloaded" });
await gm.locator("textarea").waitFor({ timeout: 15000 });
await gm.locator("textarea").fill("/");
await gm.waitForSelector("text=Wake the Stranger", { timeout: 10000 });
log("Stranger move offered (house present)");
await gm.getByRole("button", { name: "Wake the Stranger" }).click();
await gm.getByLabel("The moment the Stranger wakes into").fill(
  "Dust stirs behind the altar though no door has opened.",
);
await gm.getByLabel("Deed 1").fill(
  "The Gravekeeper rights the fallen candle and relights it from nothing.",
);
await gm.getByLabel("Deed 2").fill(
  "The Gravekeeper closes the ledger before Vael can read the second page.",
);
await gm.getByRole("button", { name: "Put it to the audience" }).click();
await gm.waitForSelector("text=the audience chooses its deed", { timeout: 15000 });
log("ballot open at the live edge");

await watcher.waitForSelector("text=tap a deed — the audience decides together", {
  timeout: 20000,
});
await watcher.locator("button", { hasText: "rights the fallen candle" }).click();
await watcher.waitForSelector("text=your choice", { timeout: 10000 });
log("watcher chose a deed (free)");
await watcher.screenshot({ path: SHOT("3-watcher-ballot") });

const resolveBtn = gm.getByRole("button", { name: "Add its deed to the story" });
await gm.waitForFunction(
  () => {
    const b = [...document.querySelectorAll("button")].find(
      (x) => x.textContent?.includes("Add its deed to the story"),
    );
    return b && !b.disabled;
  },
  { timeout: 20000 },
);
await resolveBtn.click();
await gm.waitForSelector("text=/— the Gravekeeper stirred/", { timeout: 15000 });
await gm.waitForSelector("text=rights the fallen candle", { timeout: 15000 });
log("deed resolved: record line + silver deed on the page");
await gm.screenshot({ path: SHOT("4-stranger-resolved") });

// ── 4. Gold: gild a line + gold for the table ──────────────
await watcher.waitForSelector(".gild-reach", { timeout: 20000 });
await watcher.locator(".gild-reach").first().click();
await watcher.waitForSelector("text=set this line in gold", { timeout: 10000 });
await watcher.getByRole("button", { name: "Set it in gold" }).click();
await watcher.waitForSelector(".gold-flare", { timeout: 10000 });
await watcher.waitForSelector(".ink-gilded", { timeout: 10000 });
log("line set in gold; the room flared");
await watcher.screenshot({ path: SHOT("5-gilded") });

// The table sees the shimmer inside one poll cycle.
await gm.waitForSelector(".ink-gilded", { timeout: 15000 });
log("Director's page shows the gilded line");

await watcher.getByText("leave gold ✦").click();
await watcher.waitForSelector("text=gold buys light, never the story", { timeout: 10000 });
await watcher.getByRole("button", { name: "Leave gold", exact: true }).click();
await watcher.waitForSelector(".gold-flare", { timeout: 10000 });
log("gold left for the table");

// ── 5. End the session (and settle the wager) ──────────────
await gm.locator("textarea").fill("/");
await gm.waitForSelector("text=End the session", { timeout: 10000 });
await gm.getByRole("button", { name: "End the session" }).first().click();
await gm.getByLabel("Closing line (optional)").fill(
  "The candle holds. What it now lights was not on the first page.",
);
await gm.waitForSelector("text=Which of these came true?", { timeout: 10000 });
await gm
  .locator("label", { hasText: "Someone lies to the ferryman" })
  .locator("input[type=checkbox]")
  .check();
log("LOBBY LIVE: end modal lists the wager; checked as true");
await gm.getByRole("button", { name: "End the session" }).last().click();
await gm.waitForSelector("text=this session is written", { timeout: 15000 });
log("session ended: 'this session is written'");
await gm.screenshot({ path: SHOT("6-written") });

await watcher.waitForSelector("text=it came true", { timeout: 30000 });
log("LOBBY LIVE: true wager stamped gold in the dark");
await watcher.screenshot({ path: SHOT("7-wager-stamped") });

await browser.close();
console.log("SESSION_ID=" + SESSION_ID);
log("live e2e complete");
