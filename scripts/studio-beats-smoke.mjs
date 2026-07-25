// Verify the Studio hub:
//   1. first night (empty studio)
//   2. the manuscript's closing lines in the Write card, server-rendered
//   3. the Hemingway bridge surviving a reload (it's in the DB now, not
//      localStorage — the reload is the whole point of the check)
//   4. the absence greeting, driven by users.last_seen_at
//   5. the turn-due chair card + clock, from a seeded live table
//   6. the same, in the Vellum theme
//
// Needs the dev server up and DATABASE_URL reachable.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const OUT = process.env.OUT_DIR || "/tmp/studio-beats";
const stamp = Date.now();
const email = `studio-${stamp}@example.com`;

await fs.mkdir(OUT, { recursive: true });
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });

// ── env ──
for (const f of [".env", ".env.local"]) {
  try {
    for (const line of (await fs.readFile(f, "utf8")).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  // dev-only React noise from the app's CSP; predates this page and is not ours
  if (m.type() === "error" && !m.text().includes("eval() is not supported")) {
    problems.push(`console: ${m.text()}`);
  }
});

// ── register ──
await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Studio Tester");
await page.fill("#email", email);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(1200);
await page.click("button[type=submit]");
await page.waitForURL(/welcome|create|write|dashboard/, { timeout: 20000 });
const [me] = await sql`select id from users where email = ${email}`;
if (!me) throw new Error("registration did not create a user");
console.log("registered", me.id);

// ── 1. first night ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.mouse.click(720, 1500); // fast-forward the arrival ceremony
await page.waitForTimeout(2200);
await shot(page, "1-first-night", { fullPage: true });

// ── 2. the manuscript hero ──
const seeded = await page.evaluate(async () => {
  const s = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The Cartographer of Drowned Cities", format: "novel", genres: ["Fantasy"] }),
  }).then((r) => r.json());
  const storyId = s.data?.story?.id ?? s.data?.id;
  if (!storyId) return { error: JSON.stringify(s).slice(0, 300) };
  const c = await fetch(`/api/stories/${storyId}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The Salt Archive",
      content:
        "<p>The archive smelled of kelp and old candle smoke, and Maren had learned to read its moods the way sailors read the sky.</p>" +
        "<p>She unrolled the last chart across the table and weighted its corners with whatever the sea had given up that morning. The drowned city was there, of course — it was always there — but tonight its streets had moved again, the ink rearranging itself the way it did when somebody, somewhere below, was still alive enough to dream. She dipped her pen, and the water in the inkwell went dark.</p>",
    }),
  }).then((r) => r.json());
  return { storyId, chapter: c.data ? "ok" : JSON.stringify(c).slice(0, 300) };
});
console.log("seeded story:", JSON.stringify(seeded));

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
// The manuscript quote must be in the server HTML — assert before any
// animation settles. The Write chair card keeps the END of the closing lines.
const heroInHtml = await page.getByText("the water in the inkwell went dark").count();
if (!heroInHtml) problems.push("manuscript closing lines missing from the Write card");
await page.waitForTimeout(3200);
await shot(page, "2-manuscript", { fullPage: true });
await shot(page, "2b-hero", { clip: { x: 0, y: 0, width: 1440, height: 800 } });

// ── 3. the bridge note, across a reload ──
const bridgeBtn = page.getByText("+ a line for tomorrow-you");
if (await bridgeBtn.count()) {
  await bridgeBtn.click();
  await page.keyboard.type("Maren finds the second inkwell — the one that writes in salt.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  // clear every local trace, so what survives can only have come from the DB
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("quiloria-bridge-"))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const survived = await page.getByText("the one that writes in salt").count();
  if (!survived) problems.push("bridge note did not survive a reload without localStorage");
  else console.log("bridge note persisted server-side ✓");
  await shot(page, "3-bridge-note", { clip: { x: 0, y: 0, width: 1440, height: 900 } });
} else {
  problems.push("bridge note affordance not found");
}

// ── 4. the absence greeting, from the DB ──
await sql`update users set last_seen_at = now() - interval '6 days' where id = ${me.id}`;
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const greeted = await page.getByText("6 days away").count();
if (!greeted) problems.push("absence greeting did not read from users.last_seen_at");
else console.log("absence greeting from DB ✓");
await shot(page, "4-six-days-away", { clip: { x: 0, y: 0, width: 1440, height: 620 } });

// ── 5. a table with the spotlight on me ──
const [advStory] = await sql`
  insert into stories (user_id, title, format, writing_mode, status, synopsis)
  values (${me.id}, 'The Lantern Road', 'novel', 'adventure', 'draft', 'Four strangers, one road, no way back.')
  returning id`;
const [adv] = await sql`
  insert into adventures (story_id, owner_id, premise, genre, pace, turn_due_hours, status, act_no, scene_no, board_visibility)
  values (${advStory.id}, ${me.id}, 'Four strangers walk a road that remembers them.', 'Fantasy', 'turn-2-days', 48, 'running', 2, 4, 'board')
  returning id`;
const [mySeat] = await sql`
  insert into adventure_seats (adventure_id, user_id, role)
  values (${adv.id}, ${me.id}, 'writer') returning id`;
const [director] = await sql`
  insert into users (email, name, display_name)
  values (${`director-${stamp}@example.com`}, 'Wren', 'Wren Ashgrove') returning id`;
await sql`insert into adventure_seats (adventure_id, user_id, role) values (${adv.id}, ${director.id}, 'director')`;
await sql`insert into adventure_seats (adventure_id, user_id, role) values (${adv.id}, null, 'writer')`;
// the spotlight is mine, with three hours left on it
await sql`
  update adventures
  set spotlight_seat_id = ${mySeat.id}, spotlight_since = now(), spotlight_due_at = now() + interval '3 hours'
  where id = ${adv.id}`;
// the house is watching, and the director is at the table
await sql`
  insert into adventure_audience_presence (adventure_id, token, last_heartbeat)
  values (${adv.id}, ${`t1-${stamp}`}, now()), (${adv.id}, ${`t2-${stamp}`}, now()), (${adv.id}, ${`t3-${stamp}`}, now())`;
const [dirSeat] = await sql`
  select id from adventure_seats where adventure_id = ${adv.id} and user_id = ${director.id}`;
await sql`
  insert into adventure_seat_presence (adventure_id, seat_id, last_seen, writing_at)
  values (${adv.id}, ${dirSeat.id}, now(), now())`;

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const turnHero = await page.getByText(/the scene is yours/).count();
if (!turnHero) problems.push("turn-due chair card did not light up for a live table");
else console.log("turn-due chair card ✓");
const clock = await page.getByText(/hours? left/).count();
if (!clock) problems.push("turn clock missing");
await shot(page, "5-turn-due", { fullPage: true });
await shot(page, "5b-turn-hero", { clip: { x: 0, y: 0, width: 1440, height: 900 } });

// ── 6. the same page in Vellum ──
await page.evaluate(() => localStorage.setItem("quiloria-theme", "light"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await shot(page, "6-vellum", { fullPage: true });
await shot(page, "6b-vellum-hero", { clip: { x: 0, y: 0, width: 1440, height: 900 } });

// ── 7. mobile ──
await page.evaluate(() => localStorage.setItem("quiloria-theme", "dark"));
await page.setViewportSize({ width: 390, height: 1400 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2800);
await shot(page, "7-mobile", { fullPage: true });

await browser.close();
await sql.end();

if (problems.length) {
  console.error("\nPROBLEMS:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`\nall checks passed → ${OUT}/`);
