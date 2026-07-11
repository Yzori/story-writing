// Live smoke for Adventures slice 2 — the board. A host posts a table
// to the board; a stranger finds it, asks for a seat with a note, the
// host reads the ask (with show-up record) and seats them; the new
// writer brings their character via seat setup.
//
// Usage: `npx next dev` on :3000, migrations 0059-0060 applied, then
// `HOST_EMAIL=... ASKER_EMAIL=... node scripts/adventures-board-smoke.mjs`
// (defaults to the slice-1 fixture users).
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const HOST_EMAIL = process.env.HOST_EMAIL ?? "adv-wren-1783783673398@example.com";
const ASKER_EMAIL = process.env.ASKER_EMAIL ?? "adv-mira-1783783814106@example.com";
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp/adventures-shots-board";
const log = (...a) => console.log("▸", ...a);
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(ok ? "  ✓" : "  ✗ FAIL", label, detail);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
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

const host = await mkPage();
await login(host, HOST_EMAIL);
const asker = await mkPage();
await login(asker, ASKER_EMAIL);

// host posts a table to the board
const created = await jfetch(host, "/api/adventures", {
  method: "POST",
  body: {
    title: `Saltmarsh Requiem ${Date.now() % 10000}`,
    premise:
      "A funeral barge arrives three days early, and the town it was meant for no longer exists. Elegiac, slow-burning, salt in everything.",
    genre: "mystery",
    pace: "turn-2-days",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "board",
  },
});
check("host posts a table to the board", created.status === 201);
const advId = created.json?.data?.id;

// the stranger finds it
const board = await jfetch(asker, "/api/adventures/board?seat=writer&pace=turn-2-days");
const card = (board.json?.data ?? []).find((c) => c.id === advId);
check("the table shows on the board", !!card);
check("card says who's seeking", card?.openWriters === 2 && !card?.openDirector);
check("pace-matched card sorts to the top", board.json?.data?.[0]?.id === advId);

// ask for a seat
const ask = await jfetch(asker, `/api/adventures/${advId}/applications`, {
  method: "POST",
  body: { seatRole: "writer", note: "I write slow tides and slower grief. I'd bring the barge-keeper." },
});
check("asker asks for a seat", ask.status === 201, `status=${ask.status}`);

const askTwice = await jfetch(asker, `/api/adventures/${advId}/applications`, {
  method: "POST",
  body: { seatRole: "writer", note: "again" },
});
check("asking twice is refused", askTwice.status === 409);

// non-host can't read the asks
const snoop = await jfetch(asker, `/api/adventures/${advId}/applications`);
check("only the host reads the asks", snoop.status === 404, `status=${snoop.status}`);

// host reviews + accepts
const asks = await jfetch(host, `/api/adventures/${advId}/applications`);
const theAsk = asks.json?.data?.[0];
check("host sees the ask with a note", theAsk?.note?.includes("barge-keeper"));
check("ask carries a show-up record", theAsk?.record !== undefined);

const accepted = await jfetch(host, `/api/adventures/${advId}/applications/${theAsk.id}`, {
  method: "PATCH",
  body: { action: "accept" },
});
check("host gives them the seat", accepted.status === 200, `status=${accepted.status}`);

const acceptTwice = await jfetch(host, `/api/adventures/${advId}/applications/${theAsk.id}`, {
  method: "PATCH",
  body: { action: "accept" },
});
check("an answered ask stays answered", acceptTwice.status === 409);

// the new writer is seated, characterless — seat setup
const state = await jfetch(asker, `/api/adventures/${advId}`);
check("the asker is seated", state.status === 200 && !!state.json?.data?.mySeatId);
const mySeat = state.json?.data?.seats?.find((s) => s.id === state.json.data.mySeatId);
check("seat has no character yet", mySeat?.characterName === "");

const setup = await jfetch(asker, `/api/adventures/${advId}/seat`, {
  method: "PATCH",
  body: { characterName: "The Barge-Keeper", characterBrief: "keeper of the early dead", inkColor: "sage" },
});
check("seat setup lands", setup.status === 200);

// notification reached the asker
const notifs = await jfetch(asker, "/api/notifications");
const seatNotif = (notifs.json?.data?.notifications ?? []).find(
  (n) => n.type === "adventure" && n.href === `/adventures/${advId}`
);
check("the asker was told they have a seat", !!seatNotif);

// the board page renders
await asker.goto(`${BASE}/adventures`, { waitUntil: "networkidle" });
await asker.waitForTimeout(1200);
await asker.screenshot({ path: `${SHOT_DIR}/board.png`, fullPage: true });
const boardText = await asker.locator("body").innerText();
check("board page shows the playbill", boardText.includes("Saltmarsh Requiem"));
check("board page shows the quick match", boardText.includes("Find me a seat"));

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
