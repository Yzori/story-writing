// Seeds a demo Adventure ("the table") played to an interesting
// mid-flight state, with a chair for YOU — so one person can test the
// whole loop without recruiting co-writers. Pairs with the dev "Play
// the cast" panel on the play/watch pages for the other seats.
//
// What you get: act 2 underway, a hand raised with a whisper, an
// audience (lanterns lit, passages sparked, a character backed), one
// suggestion already woven in (credited) and one waiting, and a house
// vote with drops on it.
//
// Usage (dev server on :3000, migrations 0059-0061 applied):
//   node scripts/seed-demo-adventure.mjs
//     → creates a fresh owner account for you and seats it as DIRECTOR
//   SEAT=writer node scripts/seed-demo-adventure.mjs
//     → fixture Wren directs; you sit as a writer, spotlight on you
//   OWNER_EMAIL=you@example.org OWNER_PASSWORD=… node scripts/seed-demo-adventure.mjs
//     → use your real dev account instead of a fresh one
//   REUSE_TS=<ts> node scripts/seed-demo-adventure.mjs
//     → reuse a previous run's fixture cast (register is 5/hour/IP)
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const PASSWORD = "inkdrop-test-1";
const SEAT = process.env.SEAT === "writer" ? "writer" : "director";
const ts = process.env.REUSE_TS ?? Date.now();
const reuse = !!process.env.REUSE_TS;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
const OWNER_CHARACTER = process.env.OWNER_CHARACTER ?? "Marlowe Finch";
const log = (...a) => console.log("▸", ...a);
const die = (msg) => {
  console.error("✗", msg);
  process.exit(1);
};

const browser = await chromium.launch();
const mkPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  return page;
};

async function login(page, email, password = PASSWORD, timeout = 20000) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const submit = page.getByRole("button", { name: "Return to my page" });
  for (let i = 0; i < 5; i++) {
    await page.locator("#email").fill("");
    await page.locator("#email").pressSequentially(email, { delay: 10 });
    await page.locator("#password").fill("");
    await page.locator("#password").pressSequentially(password, { delay: 10 });
    if (await submit.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(700);
  }
  await submit.click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout });
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
  try {
    await page.waitForURL((u) => !u.pathname.includes("register"), { timeout: 30000 });
  } catch {
    die(
      `registering ${email} did not complete — likely the 5/hour/IP register ` +
        `rate limit. Rerun with REUSE_TS=<ts from a previous run>, or wait an hour.`
    );
  }
  log(`${name} registered (${email})`);
}

// Sign in if the account exists, register it if it doesn't.
async function ensure(page, name, email) {
  try {
    await login(page, email, PASSWORD, 8000);
  } catch {
    await register(page, name, email);
  }
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
    { url, init }
  );

const must = (label, r, okStatuses = [200, 201]) => {
  if (!okStatuses.includes(r.status)) {
    die(`${label} failed — status ${r.status}: ${JSON.stringify(r.json)?.slice(0, 300)}`);
  }
  return r;
};

// ── the cast ─────────────────────────────────────────────────
const cast = {
  wren: `adv-wren-${ts}@example.com`,
  mira: `adv-mira-${ts}@example.com`,
  jonas: `adv-jonas-${ts}@example.com`,
  odile: `adv-odile-${ts}@example.com`,
  owner: OWNER_EMAIL ?? `adv-owner-${ts}@example.com`,
};

const owner = await mkPage();
const wren = await mkPage();
const mira = await mkPage();
const jonas = await mkPage();
const odile = await mkPage();
const anon = await mkPage();

if (OWNER_EMAIL) {
  if (!OWNER_PASSWORD) die("OWNER_EMAIL set but OWNER_PASSWORD missing");
  await login(owner, OWNER_EMAIL, OWNER_PASSWORD);
} else {
  await ensure(owner, "You", cast.owner);
}
await ensure(wren, "Wren", cast.wren);
await ensure(mira, "Mira", cast.mira);
await ensure(jonas, "Jonas", cast.jonas);
await ensure(odile, "Odile", cast.odile);
if (!reuse) console.log(`  (rerun with this cast, no re-registering: REUSE_TS=${ts})`);

// ── open the table ───────────────────────────────────────────
const director = SEAT === "director" ? owner : wren;
const title = `The Salt-Glass Letters ${String(Date.now()).slice(-4)}`;

const created = must(
  "open the table",
  await jfetch(director, "/api/adventures", {
    method: "POST",
    body: {
      title,
      premise:
        "Every letter that leaves Port Merrow is copied by someone in the lighthouse. The copies are better than the originals — and lately, they arrive first.",
      genre: "mystery",
      pace: "turn-daily",
      mySeat: "director",
      writerSeats: 3,
      boardVisibility: "board",
    },
  })
);
const advId = created.json.data.id;
log(`table opened: ${title}`);

const invite = must(
  "mint invite",
  await jfetch(director, `/api/adventures/${advId}/invite`, { method: "POST" })
);
const token = invite.json.data.joinPath.split("/").pop();

// ── seats ────────────────────────────────────────────────────
must(
  "Mira joins",
  await jfetch(mira, `/api/adventures/join/${token}`, {
    method: "POST",
    body: {
      characterName: "Ilsa Voss",
      characterBrief: "tide-surgeon with a copied past",
      inkColor: "teal",
    },
  })
);
must(
  "Jonas joins",
  await jfetch(jonas, `/api/adventures/join/${token}`, {
    method: "POST",
    body: {
      characterName: "Brother Calder",
      characterBrief: "defrocked cartographer",
      inkColor: "lavender",
    },
  })
);
if (SEAT === "writer") {
  must(
    "you join as a writer",
    await jfetch(owner, `/api/adventures/join/${token}`, {
      method: "POST",
      body: {
        characterName: OWNER_CHARACTER,
        characterBrief: "the harbor's last honest letter-carrier",
        inkColor: "sage",
      },
    })
  );
}

// ── act one ──────────────────────────────────────────────────
must("start", await jfetch(director, `/api/adventures/${advId}/start`, { method: "POST" }));
must(
  "scene one opens",
  await jfetch(director, `/api/adventures/${advId}/scenes`, {
    method: "POST",
    body: {
      action: "open",
      title: "The Lighthouse Post Office",
      opening:
        "<p>The lamp room smells of hot brass and sealing wax. Forty-one letters hang from the drying line, and none of them were written here.</p>",
    },
  })
);
must(
  "direction",
  await jfetch(director, `/api/adventures/${advId}/passages`, {
    method: "POST",
    body: {
      content:
        "<p>The keeper is three days dead, and still the copies go out with the morning tide. Ilsa — the newest letter on the line is addressed to you, in your own handwriting. You never wrote it.</p>",
    },
  })
);

const state1 = must("read state", await jfetch(director, `/api/adventures/${advId}`));
const seats = state1.json.data.seats;
const seatOf = (name) => seats.find((s) => s.characterName === name)?.id;
const miraSeat = seatOf("Ilsa Voss");
const jonasSeat = seatOf("Brother Calder");
const ownerSeat = SEAT === "writer" ? seatOf(OWNER_CHARACTER) : seats.find((s) => s.role === "director").id;

must(
  "spotlight → Mira",
  await jfetch(director, `/api/adventures/${advId}/spotlight`, {
    method: "POST",
    body: { toSeatId: miraSeat },
  })
);
must(
  "Mira signs",
  await jfetch(mira, `/api/adventures/${advId}/passages`, {
    method: "POST",
    body: {
      content:
        "<p>Ilsa read the letter twice before touching it. Her own hand, her own abbreviations, the little anchor she dots her i's with when she's lying. Whoever copied her had copied the lying, too.</p>",
    },
  })
);
must("Jonas steps forward", await jfetch(jonas, `/api/adventures/${advId}/step-forward`, { method: "POST" }));
must(
  "Jonas signs",
  await jfetch(jonas, `/api/adventures/${advId}/passages`, {
    method: "POST",
    body: {
      content:
        "<p>Calder had mapped every current in the bay and never once found the one that carried the copies out. He set his instruments on the keeper's desk and began, methodically, to disbelieve the room.</p>",
    },
  })
);
must(
  "scene one closes",
  await jfetch(director, `/api/adventures/${advId}/scenes`, {
    method: "POST",
    body: { action: "close" },
  })
);
log("act one played and closed");

// ── act two, left live ───────────────────────────────────────
must(
  "act two opens",
  await jfetch(director, `/api/adventures/${advId}/scenes`, {
    method: "POST",
    body: {
      action: "open",
      title: "The Morning Tide",
      newAct: true,
      opening:
        "<p>Dawn. The drying line is empty. Forty-one letters have gone out on a boat nobody crews.</p>",
    },
  })
);
const direction2 = must(
  "act two direction",
  await jfetch(director, `/api/adventures/${advId}/passages`, {
    method: "POST",
    body: {
      content:
        "<p>One letter remains, pinned under the dead keeper's coffee cup. It is addressed to all three of you at once — and it is dated tomorrow.</p>",
    },
  })
);
must(
  "Mira raises a hand",
  await jfetch(mira, `/api/adventures/${advId}/hand`, {
    method: "POST",
    body: { whisper: "Ilsa recognizes the boat — it's her father's. Let me take this one." },
  })
);
// ── the audience arrives ─────────────────────────────────────
await anon.goto(`${BASE}/adventures/${advId}/watch`, { waitUntil: "domcontentloaded" });
for (let i = 0; i < 3; i++) {
  await jfetch(anon, `/api/adventures/${advId}/watch/presence`, {
    method: "POST",
    body: { token: `seedlantern${ts}${i}`.slice(0, 24).padEnd(20, "0") },
  });
}
log("three anonymous lanterns lit");

const feed = must("watch feed", await jfetch(odile, `/api/adventures/${advId}/watch/passages`));
const passageIds = feed.json.data.map((p) => p.id);
must(
  "Odile sparks the direction",
  await jfetch(odile, `/api/adventures/${advId}/watch/spark`, {
    method: "POST",
    body: { passageId: direction2.json.data.id },
  })
);
if (passageIds[1]) {
  await jfetch(odile, `/api/adventures/${advId}/watch/spark`, {
    method: "POST",
    body: { passageId: passageIds[1] },
  });
}
must(
  "Odile backs Ilsa",
  await jfetch(odile, `/api/adventures/${advId}/watch/back`, {
    method: "POST",
    body: { seatId: miraSeat },
  })
);
must(
  "Odile suggests (this one stays pending for you)",
  await jfetch(odile, `/api/adventures/${advId}/watch/suggest`, {
    method: "POST",
    body: { content: "The boat isn't uncrewed — it's crewed by the recipients of the first copies." },
  })
);
const sug2 = must(
  "Odile suggests again",
  await jfetch(odile, `/api/adventures/${advId}/watch/suggest`, {
    method: "POST",
    body: { content: "The keeper died holding a pen with no ink in it." },
  })
);

// Weave the second suggestion in, so the credit line is on display.
const stack = must("suggestion stack", await jfetch(director, `/api/adventures/${advId}/suggestions`));
const toCanonize = stack.json.data.find((s) => s.id === sug2.json.data?.id) ?? stack.json.data[0];
must(
  "director weaves a suggestion in",
  await jfetch(director, `/api/adventures/${advId}/passages`, {
    method: "POST",
    body: {
      content:
        "<p>On the floor beside the desk, half under the chair: the keeper's pen. Calder lifted it to the light. The reservoir was bone dry — and by the nib-wear, it had been dry for years.</p>",
      canonizeSuggestionId: toCanonize.id,
    },
  })
);

// ── the house votes ──────────────────────────────────────────
must(
  "house vote opens",
  await jfetch(director, `/api/adventures/${advId}/house-vote`, {
    method: "POST",
    body: {
      question: "Who is doing the copying?",
      options: [
        "The dead keeper — death didn't stop him",
        "The lighthouse itself",
        "Ilsa's father, from the boat",
      ],
    },
  })
);
const watchState = must("watch state", await jfetch(odile, `/api/adventures/${advId}/watch`));
const hv = watchState.json.data.houseVote;
const storyId = watchState.json.data.adventure.storyId;
must(
  "Odile votes 5 drops",
  await jfetch(odile, `/api/stories/${storyId}/crossroads/${hv.id}/vote`, {
    method: "POST",
    body: { optionIndex: 2, amount: 5 },
  })
);

// Last move: in writer mode, leave the spotlight on YOUR character so
// you can sign the moment you open the page.
if (SEAT === "writer") {
  must(
    "spotlight → you",
    await jfetch(wren, `/api/adventures/${advId}/spotlight`, {
      method: "POST",
      body: { toSeatId: ownerSeat },
    })
  );
}

await browser.close();

// ── the handoff ──────────────────────────────────────────────
const line = "─".repeat(64);
console.log(`\n${line}\nDEMO ADVENTURE READY — "${title}"\n${line}`);
console.log(`
Your seat:   ${SEAT === "director" ? "DIRECTOR — the desk is yours" : `WRITER — ${OWNER_CHARACTER}, and the spotlight is on you`}
Sign in as:  ${cast.owner}${OWNER_EMAIL ? "  (your account)" : `  /  ${PASSWORD}`}

Play:        ${BASE}/adventures/${advId}
Watch:       ${BASE}/adventures/${advId}/watch
Board:       ${BASE}/adventures

Where things stand:
  · Act 2 is open; the last passage wove in Odile's suggestion (credited).
  · Mira's hand is UP with a whisper${SEAT === "director" ? " — read it and pass her the spotlight" : ""}.
  · One suggestion is still waiting in the Director's stack.
  · House vote "Who is doing the copying?" is live with 5 drops cast.
  · 3 anonymous lanterns + Odile are in the room.

The rest of the cast (password ${PASSWORD}):
  Wren   ${cast.wren}${SEAT === "writer" ? "  ← the Director" : ""}
  Mira   ${cast.mira}  (Ilsa Voss)
  Jonas  ${cast.jonas}  (Brother Calder)
  Odile  ${cast.odile}  (audience)

No account-juggling needed: the "Play the cast" panel (bottom-left on
the play and watch pages, dev only) acts as any of them.
${line}`);
