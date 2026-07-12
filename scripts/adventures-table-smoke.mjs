// Live smoke for Adventures ("the table"), slice 1: three fresh users —
// a Director and two writers — play a full scene through the real APIs
// and the real play page. Proves: create table, invite link, join with a
// character, start, open scene, direction, raise hand (+whisper privacy),
// pass spotlight, sign (spotlight returns to the desk), step forward
// (once per act enforced), close scene / new act, afterSort polling.
//
// Usage: `npx next dev` on :3000, migration 0059 applied, then
// `node scripts/adventures-table-smoke.mjs`.
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const ts = Date.now();
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp/adventures-shots";
const SHOT = (n) => `${SHOT_DIR}/${n}.png`;
const log = (...a) => console.log("▸", ...a);
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(ok ? "  ✓" : "  ✗ FAIL", label, detail);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  return page;
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

async function register(page, name, email) {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  const submit = page.locator("button[type=submit]");
  for (let i = 0; i < 5; i++) {
    await page.fill("#displayName", name);
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirmPassword", PASSWORD);
    if (await submit.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(700);
  }
  await submit.click();
  await page.waitForURL((u) => !u.pathname.includes("register"), { timeout: 45000 });
  log(`${name} registered`);
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

// ── cast ─────────────────────────────────────────────────────
// Register is 5/hour per IP — reuse fixture users on reruns:
//   REUSE_TS=<ts> node scripts/adventures-table-smoke.mjs
const reuse = process.env.REUSE_TS;
const wren = await mkPage();
const mira = await mkPage();
const jonas = await mkPage();
if (reuse) {
  await login(wren, `adv-wren-${reuse}@example.com`);
  await login(mira, `adv-mira-${reuse}@example.com`);
  await login(jonas, `adv-jonas-${reuse}@example.com`);
} else {
  await register(wren, "Wren", `adv-wren-${ts}@example.com`);
  await register(mira, "Mira", `adv-mira-${ts}@example.com`);
  await register(jonas, "Jonas", `adv-jonas-${ts}@example.com`);
  console.log("  (reuse these later: REUSE_TS=" + ts + ")");
}

// ── open the table ───────────────────────────────────────────
const created = await jfetch(wren, "/api/adventures", {
  method: "POST",
  body: {
    title: "The Hollow Lantern",
    premise:
      "The customs house has been locked since the drowning, but locks in Port Merrow answer to salt before they answer to keys.",
    genre: "mystery",
    pace: "turn-daily",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "private",
  },
});
check("director opens the table", created.status === 201, `status=${created.status}`);
const advId = created.json?.data?.id;

const invite = await jfetch(wren, `/api/adventures/${advId}/invite`, { method: "POST" });
const joinPath = invite.json?.data?.joinPath;
check("invite link minted", invite.status === 200 && !!joinPath);
const token = joinPath.split("/").pop();

// ── writers take their seats ─────────────────────────────────
const joinMira = await jfetch(mira, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Ilsa Voss", characterBrief: "tide-surgeon", inkColor: "teal" },
});
check("Mira takes a seat", joinMira.status === 201, `status=${joinMira.status}`);

const joinJonas = await jfetch(jonas, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Brother Calder", characterBrief: "defrocked cartographer", inkColor: "lavender" },
});
check("Jonas takes a seat", joinJonas.status === 201, `status=${joinJonas.status}`);

const joinAgain = await jfetch(mira, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Duplicate", characterBrief: "", inkColor: "rose" },
});
check("double-join refused", joinAgain.status === 409, `status=${joinAgain.status}`);

// ── start + first scene ──────────────────────────────────────
const early = await jfetch(mira, `/api/adventures/${advId}/start`, { method: "POST" });
check("only the Director starts", early.status === 403, `status=${early.status}`);

const started = await jfetch(wren, `/api/adventures/${advId}/start`, { method: "POST" });
check("adventure starts", started.status === 200, `status=${started.status}`);

const scene = await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: {
    action: "open",
    title: "The Customs House After Dark",
    opening: "<p>The ledgers are stacked like headstones, and one drawer stands open.</p>",
  },
});
check("scene one opens with an opening passage", scene.status === 201);

const direction = await jfetch(wren, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>On the desk, a letter sealed in grey wax. The harbor bell rings once.</p><p>Ilsa — you came here for the ledgers. The bell says you're not alone.</p>" },
});
check("director signs direction", direction.status === 201, `status=${direction.status}`);

// writer can't sign without the spotlight
const tooSoon = await jfetch(mira, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Ilsa did not flinch.</p>" },
});
check("writer without spotlight is refused", tooSoon.status === 409, `status=${tooSoon.status}`);

// ── hands ────────────────────────────────────────────────────
const hand = await jfetch(mira, `/api/adventures/${advId}/hand`, {
  method: "POST",
  body: { whisper: "Ilsa knows that wax — let me open the letter." },
});
check("Mira raises a hand with a whisper", hand.status === 201);

const wrenView = await jfetch(wren, `/api/adventures/${advId}`);
const jonasView = await jfetch(jonas, `/api/adventures/${advId}`);
const wrenSeesWhisper = wrenView.json?.data?.hands?.[0]?.whisper?.includes("wax");
const jonasSeesWhisper = jonasView.json?.data?.hands?.[0]?.whisper ?? "";
check("director reads the whisper", !!wrenSeesWhisper);
check("other writers never see the whisper", jonasSeesWhisper === "");

// ── spotlight round trip ─────────────────────────────────────
const miraSeatId = wrenView.json.data.seats.find((s) => s.characterName === "Ilsa Voss").id;
const jonasSeatId = wrenView.json.data.seats.find((s) => s.characterName === "Brother Calder").id;
const directorSeatId = wrenView.json.data.seats.find((s) => s.role === "director").id;

const badPass = await jfetch(mira, `/api/adventures/${advId}/spotlight`, {
  method: "POST",
  body: { toSeatId: miraSeatId },
});
check("writers can't pass the spotlight", badPass.status === 409, `status=${badPass.status}`);

const pass = await jfetch(wren, `/api/adventures/${advId}/spotlight`, {
  method: "POST",
  body: { toSeatId: miraSeatId },
});
check("director passes the spotlight to Mira", pass.status === 200);

const miraSigns = await jfetch(mira, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Ilsa did not flinch at the bell. Flinching was for people who still believed the harbor could surprise them.</p>" },
});
check("Mira signs her passage", miraSigns.status === 201);

const afterSign = await jfetch(wren, `/api/adventures/${advId}`);
check(
  "spotlight returns to the Director's desk",
  afterSign.json?.data?.adventure?.spotlightSeatId === directorSeatId
);
check(
  "Mira's hand was resolved by her signature",
  (afterSign.json?.data?.hands ?? []).length === 0
);

// ── step forward ─────────────────────────────────────────────
const step = await jfetch(jonas, `/api/adventures/${advId}/step-forward`, { method: "POST" });
check("Jonas steps forward (takes the spotlight)", step.status === 200, `status=${step.status}`);

const jonasSigns = await jfetch(jonas, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>The dark between the shelves sighed, and Calder stepped out of it, hands up, grin first.</p>" },
});
check("Jonas signs after stepping forward", jonasSigns.status === 201);

const stepAgain = await jfetch(jonas, `/api/adventures/${advId}/step-forward`, { method: "POST" });
check("second step-forward this act is refused", stepAgain.status === 409, `status=${stepAgain.status}`);

// ── scenes + acts ────────────────────────────────────────────
const close = await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "close" },
});
check("director closes the scene", close.status === 201);

const actTwo = await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "open", title: "The Harbor Bell", newAct: true },
});
check("act two, scene one opens", actTwo.status === 201);

const stepFresh = await jfetch(jonas, `/api/adventures/${advId}/step-forward`, { method: "POST" });
check("new act refreshes the step-forward token", stepFresh.status === 200, `status=${stepFresh.status}`);
// hand the spotlight back so the page shows the desk state
await jfetch(jonas, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Calder reached the rope first. It was still warm.</p>" },
});

// ── polling cursor ───────────────────────────────────────────
const all = await jfetch(mira, `/api/adventures/${advId}/passages`);
const tail = await jfetch(mira, `/api/adventures/${advId}/passages?afterSort=2`);
check(
  "afterSort cursor returns only the tail",
  (all.json?.data?.length ?? 0) > (tail.json?.data?.length ?? 0) && (tail.json?.data ?? []).every((p) => p.sortOrder > 2)
);

// ── the play page, both chairs ───────────────────────────────
// (domcontentloaded: the play page keeps an SSE stream open, so
// networkidle never fires)
await wren.goto(`${BASE}/adventures/${advId}`, { waitUntil: "domcontentloaded" });
await wren.waitForTimeout(3500);
await wren.screenshot({ path: SHOT("director"), fullPage: true });
const wrenText = await wren.locator("body").innerText();
check("director page shows the title", wrenText.includes("The Hollow Lantern"));
check("director page shows the desk", wrenText.includes("Director"));

await mira.goto(`${BASE}/adventures/${advId}`, { waitUntil: "domcontentloaded" });
await mira.waitForTimeout(3500);
await mira.screenshot({ path: SHOT("writer"), fullPage: true });
const miraText = await mira.locator("body").innerText();
check("writer page shows the signed passages", miraText.includes("Ilsa did not flinch"));
check("writer page offers the hand", miraText.toLowerCase().includes("raise your hand"));

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
