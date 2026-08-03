// Smoke the Glass Stage dashboard:
//   1. first night (empty studio hero → "Start your first story")
//   2. seeded manuscript → jacket + last-line watermark + Continue CTA
//   3. week's-ink bars from seeded writing_sessions
//   4. Read tab: continue-reading hero + bookmarks table
//   5. Stats tab: earnings by source from seeded ink_drop_transactions
//   6. Vellum theme sanity shot
//
// Needs the dev server up and DATABASE_URL reachable.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const OUT = process.env.OUT_DIR || "/tmp/glass-stage";
const stamp = Date.now();
const email = `glass-${stamp}@example.com`;

await fs.mkdir(OUT, { recursive: true });
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });

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
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("eval() is not supported")) {
    problems.push(`console: ${m.text()}`);
  }
});

// ── register ──
await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
await page.fill("#displayName", "Glass Tester");
await page.fill("#email", email);
await page.fill("#password", "inkdrop-test-1");
await page.fill("#confirmPassword", "inkdrop-test-1");
await page.waitForTimeout(1200);
await page.click("button[type=submit]", { timeout: 45000 });
await page.waitForURL(/welcome|create|write|dashboard/, { timeout: 20000 });
const [me] = await sql`select id from users where email = ${email}`;
if (!me) throw new Error("registration did not create a user");
console.log("registered", me.id);

// ── 1. first night ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.mouse.click(720, 1300); // fast-forward the arrival ceremony
await page.waitForTimeout(2600);
const emptyCta = await page.getByText("Start your first story").count();
if (!emptyCta) problems.push("empty studio is missing its start CTA");
await shot(page, "1-first-night", { fullPage: true });

// ── seed: a manuscript, a fortnight of sessions, some ink ──
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
        "<p>She dipped her pen, and the water in the inkwell went dark.</p>",
    }),
  }).then((r) => r.json());
  const chapterId = c.data?.chapter?.id ?? c.data?.id;
  return { storyId, chapterId: chapterId ?? JSON.stringify(c).slice(0, 200) };
});
console.log("seeded story:", JSON.stringify(seeded));
if (seeded.error) throw new Error(seeded.error);

for (let i = 0; i < 7; i++) {
  const words = [420, 0, 610, 380, 0, 900, 740][i];
  if (words === 0) continue;
  await sql`
    insert into writing_sessions (user_id, story_id, date, words_written, duration_minutes)
    values (${me.id}, ${seeded.storyId}, (now() - make_interval(days => ${6 - i}))::date, ${words}, 30)`;
}
await sql`
  insert into ink_drop_transactions (from_user_id, to_user_id, amount, type, message)
  values (${me.id}, ${me.id}, 120, 'tip', 'smoke'), (${me.id}, ${me.id}, 300, 'circle', 'smoke'), (${me.id}, ${me.id}, 45, 'unlock', 'smoke')`;
if (typeof seeded.chapterId === "string" && seeded.chapterId.length === 36) {
  await sql`
    insert into reading_progress (user_id, story_id, chapter_id, scroll_percent)
    values (${me.id}, ${seeded.storyId}, ${seeded.chapterId}, 62)`;
}

// ── 2. the manuscript hero ──
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
const heroInHtml = await page.getByText("the water in the inkwell went dark").count();
if (!heroInHtml) problems.push("last-line watermark missing from the studio hero");
await page.waitForTimeout(3400);
const continueCta = await page.getByText(/Continue Chapter \d+/).count();
if (!continueCta) problems.push("Continue CTA missing");
await shot(page, "2-studio", { fullPage: true });

// ── 3. week's ink ──
const weekInk = await page.getByText("The week's ink").count();
if (!weekInk) problems.push("week's-ink bars did not render despite seeded sessions");

// ── 4. Read tab ──
await page.getByLabel("Dashboard surfaces").getByRole("button", { name: "Read" }).click();
await page.waitForTimeout(2600);
const readHero = await page.getByText("Where you stopped").count();
const bookmarks = await page.getByText("Your bookmarks").count();
if (!bookmarks) problems.push("Read tab: bookmarks panel missing");
console.log("read hero (continue-reading present):", readHero > 0);
await shot(page, "4-read", { fullPage: true });

// ── 5. Stats tab ──
await page.getByLabel("Dashboard surfaces").getByRole("button", { name: "Stats" }).click();
await page.waitForTimeout(2600);
for (const label of ["Where the ink comes from", "Your readers"]) {
  if (!(await page.getByText(label).count())) problems.push(`Stats tab: "${label}" missing`);
}
const tips = await page.getByText("Tips").count();
if (!tips) problems.push("Stats tab: seeded tip did not appear in the source breakdown");
await shot(page, "5-stats", { fullPage: true });

// ── 6. Vellum ──
await page.emulateMedia({ colorScheme: "light" });
await page.evaluate(() => {
  document.documentElement.classList.remove("theme-dark");
  document.documentElement.classList.add("theme-light");
});
await page.waitForTimeout(800);
await shot(page, "6-vellum-stats", { fullPage: true });

await browser.close();
await sql.end();

if (problems.length) {
  console.error("PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("glass stage smoke ✓ — shots in", OUT);
