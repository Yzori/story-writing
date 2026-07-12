// Live smoke for Adventures — "the room is alive" + the curtain call.
// A table plays over the SSE streams instead of polling: presence
// beats light the embers, a writer's keystrokes show as "writing now"
// on the Director's screen, a signed passage lands cross-screen in
// seconds without reload, the audience stream keeps up, and when the
// Director closes the book the curtain call plays live for everyone.
//
// Usage: `npx next dev` on :3000, migrations 0059-0062 applied, then
// `REUSE_TS=<ts> node scripts/adventures-live-smoke.mjs` (fixture
// users; register is 5/hour/IP so reuse a seeded cast's timestamp).
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const TS = process.env.REUSE_TS ?? "1783783673398";
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp/adventures-shots-live";
const log = (...a) => console.log("▸", ...a);
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(ok ? "  ✓" : "  ✗ FAIL", label, detail);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  return ctx.newPage();
};

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const submit = page.getByRole("button", { name: "Return to my page" });
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
  log(`${email} signed in`);
}

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

// Collect SSE messages from inside a page for `ms` milliseconds.
const listenSse = (page, url, ms) =>
  page.evaluate(
    ({ url, ms }) =>
      new Promise((resolve) => {
        const events = [];
        const source = new EventSource(url);
        source.onmessage = (e) => {
          try {
            events.push(JSON.parse(e.data));
          } catch {}
        };
        setTimeout(() => {
          source.close();
          resolve(events);
        }, ms);
      }),
    { url, ms },
  );

// ── cast assembles a fresh table ─────────────────────────────
const wren = await mkPage();
await login(wren, `adv-wren-${TS}@example.com`);
const mira = await mkPage();
await login(mira, `adv-mira-${TS}@example.com`);
const jonas = await mkPage();
await login(jonas, `adv-jonas-${TS}@example.com`);

const created = await jfetch(wren, "/api/adventures", {
  method: "POST",
  body: {
    title: `The Ember Ledger ${Date.now() % 10000}`,
    premise: "A city where debts are paid in remembered warmth.",
    genre: "fantasy",
    pace: "turn-daily",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "private",
  },
});
const advId = created.json?.data?.id;
check("table opened", created.status === 201, advId ?? "");
const invite = await jfetch(wren, `/api/adventures/${advId}/invite`, { method: "POST" });
const token = invite.json.data.joinPath.split("/").pop();
await jfetch(mira, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Ilsa Voss", characterBrief: "tide-surgeon", inkColor: "teal" },
});
await jfetch(jonas, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Brother Calder", characterBrief: "cartographer", inkColor: "lavender" },
});
const started = await jfetch(wren, `/api/adventures/${advId}/start`, { method: "POST" });
check("the adventure starts", started.status === 200);
await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "open", title: "The Cold Bank", opening: "<p>The teller's drawer held no coins, only candle stubs.</p>" },
});

// ── presence beats + state carries them ──────────────────────
const beat = await jfetch(mira, `/api/adventures/${advId}/presence`, {
  method: "POST",
  body: { writing: true },
});
check("presence beat lands", beat.status === 200);

const state = await jfetch(wren, `/api/adventures/${advId}`);
const seats = state.json?.data?.seats ?? [];
const miraSeat = seats.find((s) => s.characterName === "Ilsa Voss");
const pv = (state.json?.data?.presence ?? []).find((p) => p.seatId === miraSeat?.id);
check("state carries presence: at the table + writing", pv?.atTable === true && pv?.writing === true);

const retire = await jfetch(mira, `/api/adventures/${advId}/presence`, {
  method: "POST",
  body: { writing: false },
});
const state2 = await jfetch(wren, `/api/adventures/${advId}`);
const pv2 = (state2.json?.data?.presence ?? []).find((p) => p.seatId === miraSeat?.id);
check("a writing=false beat retires the pulse", retire.status === 200 && pv2?.writing === false && pv2?.atTable === true);

// ── the table stream pushes a passage as it lands ────────────
const passSpot = await jfetch(wren, `/api/adventures/${advId}/spotlight`, {
  method: "POST",
  body: { toSeatId: miraSeat.id },
});
check("spotlight passed to Ilsa", passSpot.status === 200 || passSpot.status === 201);

const streamPromise = listenSse(wren, `/api/adventures/${advId}/stream?afterSort=-1`, 9000);
await wren.waitForTimeout(1500);
const signed = await jfetch(mira, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Ilsa slid her ledger across the counter: three warm Junes, one lost hearth.</p>" },
});
check("Ilsa signs while the Director's stream is open", signed.status === 201);
const events = await streamPromise;
check("stream opened with full state", events.some((e) => e.state?.adventure?.id === advId));
const streamedPassages = events.flatMap((e) => e.passages ?? []);
check(
  "the signed passage arrived over the wire",
  streamedPassages.some((p) => p.content.includes("three warm Junes")),
);
check(
  "spotlight return rode along as a state change",
  events.some((e) => e.state && e.state.adventure.spotlightSeatId !== miraSeat.id),
);

// ── the audience stream keeps up, anonymously ────────────────
const anon = await mkPage();
await anon.goto(`${BASE}/adventures/${advId}/watch`, { waitUntil: "domcontentloaded" });
const watchEvents = await listenSse(anon, `/api/adventures/${advId}/watch/stream`, 5000);
check(
  "watch stream opens for a reader with no account",
  watchEvents.some((e) => e.state?.adventure?.id === advId),
);
check(
  "watch stream carries the sparked page",
  watchEvents.some((e) => (e.passages ?? []).some((p) => p.content.includes("three warm Junes"))),
);
check(
  "no hands or whispers leak into the watch stream",
  watchEvents.every((e) => !e.state || e.state.hands === undefined),
);

// ── the honest "writing now": UI cross-screen ────────────────
await jfetch(wren, `/api/adventures/${advId}/spotlight`, {
  method: "POST",
  body: { toSeatId: miraSeat.id },
});
// the play page keeps an SSE connection open — networkidle never
// fires there; wait for content instead.
await wren.goto(`${BASE}/adventures/${advId}`, { waitUntil: "domcontentloaded" });
await wren.getByText("The Cold Bank", { exact: false }).first().waitFor({ timeout: 20000 });
await mira.goto(`${BASE}/adventures/${advId}`, { waitUntil: "domcontentloaded" });
await mira.locator("textarea").first().waitFor({ timeout: 20000 });
check(
  "spotlight chip is honest before any typing (no 'writing now')",
  !(await wren.getByText("writing now", { exact: false }).first().isVisible().catch(() => false)),
);
await mira.locator("textarea").first().pressSequentially("The vault door remembered ", { delay: 30 });
const sawWriting = await wren
  .getByText("writing now", { exact: false })
  .first()
  .waitFor({ state: "visible", timeout: 15000 })
  .then(() => true)
  .catch(() => false);
check("Director sees 'writing now' while Ilsa's keys land", sawWriting);
await wren.screenshot({ path: `${SHOT_DIR}/1-cast-bar-writing.png` });

// the passage crosses screens without a reload
await mira.locator("textarea").first().fill("The vault door remembered every hand that had ever opened it.");
await mira.getByRole("button", { name: "Sign it onto the page" }).click();
const crossed = await wren
  .getByText("every hand that had ever opened it", { exact: false })
  .first()
  .waitFor({ state: "visible", timeout: 10000 })
  .then(() => true)
  .catch(() => false);
check("signed passage appears on the Director's page, no reload", crossed);
await wren.screenshot({ path: `${SHOT_DIR}/2-passage-crossed.png` });

// ── the curtain falls, live for everyone ─────────────────────
const early = await jfetch(anon, `/api/adventures/${advId}/curtain`);
check("curtain refuses while the table is running", early.status === 409);

const finished = await jfetch(wren, `/api/adventures/${advId}/finish`, { method: "POST" });
check("the Director closes the book", finished.status === 200);

const curtainOnMira = await mira
  .getByText("Curtain call", { exact: false })
  .first()
  .waitFor({ state: "visible", timeout: 12000 })
  .then(() => true)
  .catch(() => false);
check("curtain call rises on Ilsa's screen, live", curtainOnMira);
await mira.waitForTimeout(3500); // let the credits finish their walk
await mira.screenshot({ path: `${SHOT_DIR}/3-curtain-call.png`, fullPage: true });

const curtain = await jfetch(anon, `/api/adventures/${advId}/curtain`);
const cd = curtain.json?.data;
check("curtain payload: credits for everyone who played", (cd?.credits?.length ?? 0) >= 2);
check("curtain payload: the run's numbers", (cd?.stats?.words ?? 0) > 0 && (cd?.stats?.scenes ?? 0) >= 1);
check("curtain payload: the book has an address", !!cd?.book?.slug && (cd?.book?.chapters ?? 0) >= 1);

const openBook = await mira.getByRole("link", { name: "Open the book" }).count();
check("'Open the book' waits at the end", openBook >= 1);

await anon.goto(`${BASE}/adventures/${advId}/watch`, { waitUntil: "domcontentloaded" });
await anon.getByText("Curtain call", { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
const watchCurtain = await anon
  .getByText("Curtain call", { exact: false })
  .first()
  .isVisible()
  .catch(() => false);
check("the audience gets the curtain call too", watchCurtain);
await anon.waitForTimeout(3500);
await anon.screenshot({ path: `${SHOT_DIR}/4-watch-curtain.png`, fullPage: true });

await browser.close();
console.log(failures === 0 ? "\nAll live checks green." : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
