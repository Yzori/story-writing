// Live smoke for Adventures slice 3 — the audience. A table plays; an
// anonymous reader watches (lantern lit, no account); a signed-in
// reader sparks a passage, backs a character, and sends a suggestion;
// the Director weaves the suggestion in (credited) and puts a question
// to the house; the reader votes with drops.
//
// Usage: `npx next dev` on :3000, migrations 0059-0061 applied, then
// `node scripts/adventures-audience-smoke.mjs` (uses fixture users).
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const TS = process.env.REUSE_TS ?? "1783783673398";
const AUD_EMAIL = process.env.AUD_EMAIL ?? "adv-wren-1783783814106@example.com";
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp/adventures-shots-watch";
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

// ── the table plays a scene ──────────────────────────────────
const wren = await mkPage();
await login(wren, `adv-wren-${TS}@example.com`);
const mira = await mkPage();
await login(mira, `adv-mira-${TS}@example.com`);
const jonas = await mkPage();
await login(jonas, `adv-jonas-${TS}@example.com`);

const created = await jfetch(wren, "/api/adventures", {
  method: "POST",
  body: {
    title: `The Ninth Wake ${Date.now() % 10000}`,
    premise: "Eight funerals in a mountain village, each stranger than the last.",
    genre: "horror",
    pace: "turn-daily",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "board",
  },
});
const advId = created.json?.data?.id;
check("table opened", created.status === 201);
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
await jfetch(wren, `/api/adventures/${advId}/start`, { method: "POST" });
await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "open", title: "The First Wake", opening: "<p>The bell above the chapel had been muffled with grave-cloth.</p>" },
});
const direction = await jfetch(wren, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Snow fills the pass. Nobody leaves before spring.</p>" },
});
check("the table is playing", direction.status === 201);

// ── anonymous reader ─────────────────────────────────────────
const anon = await mkPage();
// Land somewhere first so relative fetches have an origin.
await anon.goto(`${BASE}/adventures/${advId}/watch`, { waitUntil: "domcontentloaded" });
const anonWatch = await jfetch(anon, `/api/adventures/${advId}/watch`);
check("anon reader opens the room", anonWatch.status === 200 && anonWatch.json?.data?.adventure?.title.includes("Ninth Wake"));
check("no hands or whispers leak to the audience", anonWatch.json?.data?.hands === undefined);

await jfetch(anon, `/api/adventures/${advId}/watch/presence`, {
  method: "POST",
  body: { token: "anonlantern0000000001" },
});
const afterBeat = await jfetch(anon, `/api/adventures/${advId}/watch`);
check("the lantern is lit (presence counts)", (afterBeat.json?.data?.audience?.present ?? 0) >= 1);

const anonSpark = await jfetch(anon, `/api/adventures/${advId}/watch/spark`, {
  method: "POST",
  body: { passageId: direction.json.data.id },
});
check("anon can't spark (sign-in required)", anonSpark.status === 401);

// ── signed-in reader ─────────────────────────────────────────
const reader = await mkPage();
await login(reader, AUD_EMAIL);

const spark = await jfetch(reader, `/api/adventures/${advId}/watch/spark`, {
  method: "POST",
  body: { passageId: direction.json.data.id },
});
check("reader sparks the passage", spark.status === 200);
const sparkedPassages = await jfetch(reader, `/api/adventures/${advId}/watch/passages`);
const sparked = sparkedPassages.json?.data?.find((p) => p.id === direction.json.data.id);
check("spark count + mine show on the page", sparked?.sparks === 1 && sparked?.sparkedByMe === true);

const watchState = await jfetch(reader, `/api/adventures/${advId}/watch`);
const ilsaSeat = watchState.json.data.seats.find((s) => s.characterName === "Ilsa Voss");
const back = await jfetch(reader, `/api/adventures/${advId}/watch/back`, {
  method: "POST",
  body: { seatId: ilsaSeat.id },
});
check("reader backs Ilsa", back.status === 200);
const backed = await jfetch(reader, `/api/adventures/${advId}/watch`);
check("backing counts on the rail", backed.json.data.seats.find((s) => s.id === ilsaSeat.id)?.backers === 1);
check("my backing is remembered", backed.json.data.myBackingSeatId === ilsaSeat.id);

const suggestion = await jfetch(reader, `/api/adventures/${advId}/watch/suggest`, {
  method: "POST",
  body: { content: "The ninth coffin is already in the crypt — and it's warm." },
});
check("reader sends a suggestion", suggestion.status === 201);

// ── the Director answers ─────────────────────────────────────
const stack = await jfetch(wren, `/api/adventures/${advId}/suggestions`);
const waiting = stack.json?.data?.[0];
check("director sees the suggestion stack", !!waiting && waiting.content.includes("ninth coffin"));

const canonized = await jfetch(wren, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: {
    content: "<p>In the crypt below, the ninth coffin waited. It was warm to the touch.</p>",
    canonizeSuggestionId: waiting.id,
  },
});
check("director weaves it in", canonized.status === 201);

const credited = await jfetch(anon, `/api/adventures/${advId}/watch/passages`);
const creditLine = credited.json?.data?.find((p) => p.id === canonized.json.data.id);
check("the passage carries the reader's credit", !!creditLine?.readerCredit);

const readerNotifs = await jfetch(reader, "/api/notifications");
check(
  "the reader is told their words made the book",
  (readerNotifs.json?.data?.notifications ?? []).some(
    (n) => n.type === "adventure" && n.message.includes("written into")
  )
);

// ── the house votes ──────────────────────────────────────────
const houseVote = await jfetch(wren, `/api/adventures/${advId}/house-vote`, {
  method: "POST",
  body: {
    question: "Whose funeral is the ninth?",
    options: ["The gravedigger's", "The narrator's", "No one's — the coffin is bait"],
  },
});
check("director asks the house", houseVote.status === 201, `status=${houseVote.status}`);

const voteState = await jfetch(reader, `/api/adventures/${advId}/watch`);
const hv = voteState.json?.data?.houseVote;
check("the question shows on the watch rail", hv?.question?.includes("ninth"));

const cast = await jfetch(reader, `/api/stories/${voteState.json.data.adventure.storyId}/crossroads/${hv.id}/vote`, {
  method: "POST",
  body: { optionIndex: 2, amount: 5 },
});
check("reader votes with 5 drops", cast.status === 200 || cast.status === 201, `status=${cast.status}`);

const tallied = await jfetch(anon, `/api/adventures/${advId}/watch`);
check(
  "the tally moves",
  tallied.json?.data?.houseVote?.options?.[2]?.drops === 5 &&
    tallied.json?.data?.houseVote?.options?.[2]?.pct === 100
);

// ── the watch page itself, anonymous ─────────────────────────
// domcontentloaded: the watch page keeps an SSE stream open, so
// networkidle never fires.
await anon.goto(`${BASE}/adventures/${advId}/watch`, { waitUntil: "domcontentloaded" });
await anon.waitForTimeout(3500);
await anon.waitForTimeout(1500);
await anon.screenshot({ path: `${SHOT_DIR}/watch-anon.png`, fullPage: true });
const anonText = await anon.locator("body").innerText();
check("anon watch page renders the story", anonText.includes("ninth coffin"));
check("anon watch page shows the lanterns", anonText.includes("reading live"));
check("anon watch page shows the house vote", anonText.includes("Whose funeral"));
check("anon is invited to sign in, not blocked", anonText.includes("Sign in"));

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
