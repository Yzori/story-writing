// Live smoke for Adventures slice 4 — the book & the clock. A table
// plays two acts and the Director closes the book: acts become
// published chapters with a colophon, the story goes public, writers
// become collaborators, everyone is told. Then the clock: an overdue
// spotlight is nudged exactly once via the cron sweep.
//
// Usage: `npx next dev` on :3000, CRON_SECRET in .env.local, then
// `node scripts/adventures-book-smoke.mjs`.
import { chromium } from "playwright";
import postgres from "postgres";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const TS = process.env.REUSE_TS ?? "1783783673398";
const CRON_SECRET = process.env.CRON_SECRET ?? "dev-cron-secret-quiloria";
const DB_URL = process.env.DATABASE_URL ?? "postgresql://quiloria:quiloria@localhost:5432/quiloria";
const log = (...a) => console.log("▸", ...a);
let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(ok ? "  ✓" : "  ✗ FAIL", label, detail);
  if (!ok) failures++;
};

const sql = postgres(DB_URL, { max: 1 });
const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 950 } });
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

const wren = await mkPage();
await login(wren, `adv-wren-${TS}@example.com`);
const mira = await mkPage();
await login(mira, `adv-mira-${TS}@example.com`);
const jonas = await mkPage();
await login(jonas, `adv-jonas-${TS}@example.com`);

// ── play two acts ────────────────────────────────────────────
const created = await jfetch(wren, "/api/adventures", {
  method: "POST",
  body: {
    title: `Dead Letters Office ${Date.now() % 10000}`,
    premise: "A postal bureau for mail addressed to the deceased. This week, the deceased started writing back.",
    genre: "mystery",
    pace: "turn-daily",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "private",
  },
});
const advId = created.json.data.id;
const storyId = created.json.data.storyId;
const invite = await jfetch(wren, `/api/adventures/${advId}/invite`, { method: "POST" });
const token = invite.json.data.joinPath.split("/").pop();
await jfetch(mira, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Ilsa Voss", characterBrief: "clerk of the dead letters", inkColor: "teal" },
});
await jfetch(jonas, `/api/adventures/join/${token}`, {
  method: "POST",
  body: { characterName: "Brother Calder", characterBrief: "night sorter", inkColor: "copper" },
});
await jfetch(wren, `/api/adventures/${advId}/start`, { method: "POST" });

// premature close: nothing written yet
const tooEarly = await jfetch(wren, `/api/adventures/${advId}/finish`, { method: "POST" });
check("an empty book can't be closed", tooEarly.status === 409);

await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "open", title: "The Morning Sort", opening: "<p>The first letter of the day was addressed in fresh ink to a man four years drowned.</p>" },
});
const wrenView = await jfetch(wren, `/api/adventures/${advId}`);
const miraSeatId = wrenView.json.data.seats.find((s) => s.characterName === "Ilsa Voss").id;
await jfetch(wren, `/api/adventures/${advId}/spotlight`, { method: "POST", body: { toSeatId: miraSeatId } });
await jfetch(mira, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>Ilsa weighed the letter and found it heavier than paper has any right to be.</p>" },
});
await jfetch(wren, `/api/adventures/${advId}/scenes`, { method: "POST", body: { action: "close" } });
await jfetch(wren, `/api/adventures/${advId}/scenes`, {
  method: "POST",
  body: { action: "open", title: "The Reply", newAct: true, opening: "<p>By nightfall there were nine more, all in the same hand.</p>" },
});
const direction = await jfetch(wren, `/api/adventures/${advId}/passages`, {
  method: "POST",
  body: { content: "<p>The sorting office lamps burned low. Something scratched inside the dead-letter bin.</p>" },
});
check("two acts on the page", direction.status === 201);

// only the Director closes the book
const notDirector = await jfetch(mira, `/api/adventures/${advId}/finish`, { method: "POST" });
check("writers can't close the book", notDirector.status === 404 || notDirector.status === 403);

// ── close the book ───────────────────────────────────────────
const finished = await jfetch(wren, `/api/adventures/${advId}/finish`, { method: "POST" });
check("the Director closes the book", finished.status === 200, `status=${finished.status}`);
check("two acts → two chapters", finished.json?.data?.chapters === 2);

const again = await jfetch(wren, `/api/adventures/${advId}/finish`, { method: "POST" });
check("a closed book stays closed", again.status === 409);

const [storyRow] = await sql`select is_public, status from stories where id = ${storyId}`;
check("the story is public and complete", storyRow.is_public === true && storyRow.status === "complete");

const chapterRows = await sql`select title, status, content from chapters where story_id = ${storyId} order by sort_order`;
check("chapters are published acts", chapterRows.length === 2 && chapterRows.every((c) => c.status === "published"));
check("the colophon credits the table", chapterRows[1].content.includes("Written at the table") && chapterRows[1].content.includes("as Ilsa Voss"));
check("scene titles survive into the book", chapterRows[0].content.includes("The Morning Sort"));

const collabRows = await sql`select user_id, status from collaborators where story_id = ${storyId}`;
check("writers are story collaborators", collabRows.length === 2 && collabRows.every((c) => c.status === "accepted"));

const miraNotifs = await jfetch(mira, "/api/notifications");
check(
  "the table is told the book is closed",
  (miraNotifs.json?.data?.notifications ?? []).some((n) => n.message.includes("The book is closed"))
);

// ── the clock: overdue spotlight nudges once ─────────────────
const created2 = await jfetch(wren, "/api/adventures", {
  method: "POST",
  body: {
    title: `Overdue Turn ${Date.now() % 10000}`,
    premise: "A table for testing the clock.",
    genre: "mystery",
    pace: "turn-daily",
    mySeat: "director",
    writerSeats: 2,
    boardVisibility: "private",
  },
});
const advId2 = created2.json.data.id;
const invite2 = await jfetch(wren, `/api/adventures/${advId2}/invite`, { method: "POST" });
const token2 = invite2.json.data.joinPath.split("/").pop();
await jfetch(mira, `/api/adventures/join/${token2}`, {
  method: "POST",
  body: { characterName: "Ilsa Voss", characterBrief: "", inkColor: "teal" },
});
await jfetch(jonas, `/api/adventures/join/${token2}`, {
  method: "POST",
  body: { characterName: "Brother Calder", characterBrief: "", inkColor: "sage" },
});
// Space out from the first table's writes — the per-user write limit
// is 30/min and a smoke burns through it faster than any human.
log("cooling the write rate limit (65s)…");
await new Promise((r) => setTimeout(r, 65_000));

const started2 = await jfetch(wren, `/api/adventures/${advId2}/start`, { method: "POST" });
check("second table starts", started2.status === 200, `status=${started2.status}`);
const scene2 = await jfetch(wren, `/api/adventures/${advId2}/scenes`, {
  method: "POST",
  body: { action: "open", title: "Waiting", opening: "<p>The table waits.</p>" },
});
check("second table's scene opens", scene2.status === 201, `status=${scene2.status}`);
const view2 = await jfetch(wren, `/api/adventures/${advId2}`);
const miraSeat2 = view2.json.data.seats.find((s) => s.characterName === "Ilsa Voss").id;
const pass2 = await jfetch(wren, `/api/adventures/${advId2}/spotlight`, { method: "POST", body: { toSeatId: miraSeat2 } });
check("second table's spotlight lands on Mira", pass2.status === 200, `status=${pass2.status}`);

// Force the deadline into the past — three days overdue (past 2× the window).
await sql`update adventures set spotlight_since = now() - interval '4 days', spotlight_due_at = now() - interval '3 days' where id = ${advId2}`;

const cron = async () =>
  fetch(`${BASE}/api/cron`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  }).then((r) => r.json());

const first = await cron();
// >= because reruns can leave other overdue fixtures in the dev DB;
// the per-adventure notification check below is the precise one.
check(
  "cron nudges the overdue writer and the director",
  first.adventures?.nudgedWriters >= 1 && first.adventures?.nudgedDirectors >= 1,
  JSON.stringify(first.adventures)
);
const second = await cron();
check(
  "the nudge doesn't repeat (deduped per spotlight grant)",
  second.adventures?.nudgedWriters === 0 && second.adventures?.nudgedDirectors === 0,
  JSON.stringify(second.adventures)
);

const miraNudge = await jfetch(mira, "/api/notifications");
check(
  "the writer hears the table waiting",
  (miraNudge.json?.data?.notifications ?? []).some((n) => n.message.includes("table is waiting"))
);

// ── idle table abandons + compiles ───────────────────────────
await sql`update adventures set updated_at = now() - interval '15 days' where id = ${advId2}`;
const third = await cron();
check("an idle table closes itself", (third.adventures?.abandoned ?? 0) >= 1, JSON.stringify(third.adventures));
const [abandonedRow] = await sql`select status from adventures where id = ${advId2}`;
check("the idle table is marked abandoned", abandonedRow.status === "abandoned");
const abandonedChapters = await sql`select count(*)::int as n from chapters c join stories s on c.story_id = s.id join adventures a on a.story_id = s.id where a.id = ${advId2}`;
check("what was written is compiled", abandonedChapters[0].n >= 1);

await browser.close();
await sql.end();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
