import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  users,
  stories,
  chapters,
  staffPicks,
  storyBoosts,
  campaignSessions,
  campaignTurns,
  sessionRoster,
  playerCharacters,
  spectatorPresence,
  storyDonations,
  follows,
  sparks,
  storyJams,
  jamEntries,
  creatorUpdates,
  readingProgress,
  notifications,
  comments,
} from "@/server/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { hashPassword } from "@/server/password";
import { generateSlug, countWords } from "@/lib/utils";

/**
 * Dev-only seeding endpoint for the For You reader.
 *
 * POST /api/dev/seed-fyr
 *
 * Creates 3 authors and 6 public published stories with chapters, covering:
 *  - 2 flash pieces (<1500 words) for the anonymous demo loop
 *  - 1 multi-chapter novel for the between-chapters moment
 *  - 1 staff-picked story
 *  - 2 genre-varied filler stories
 *
 * Safe to re-run (idempotent on email).
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Disabled in production" },
      { status: 403 },
    );
  }

  try {
    // Ensure migrations 0010 + 0011 columns exist (lazy apply for dev)
    await db.execute(
      sql`ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "feed_impressions" integer DEFAULT 0 NOT NULL`,
    );
    await db.execute(
      sql`ALTER TABLE "story_boosts" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'standard' NOT NULL`,
    );
    await db.execute(
      sql`ALTER TABLE "story_boosts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL`,
    );

    const passwordHash = await hashPassword("demo1234");

    // ── Authors ─────────────────────────────────────────────
    const authors: { email: string; name: string; display: string }[] = [
      { email: "mira@demo.quiloria", name: "Mira", display: "Mira Halvén" },
      { email: "caleb@demo.quiloria", name: "Caleb", display: "Caleb Orr" },
      {
        email: "jules@demo.quiloria",
        name: "Jules",
        display: "Jules Okonkwo",
      },
    ];
    const authorIds: Record<string, string> = {};
    for (const a of authors) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, a.email),
      });
      if (existing) {
        authorIds[a.email] = existing.id;
      } else {
        const [row] = await db
          .insert(users)
          .values({
            email: a.email,
            name: a.name,
            displayName: a.display,
            password: passwordHash,
            bio: "Seeded demo author.",
          })
          .returning({ id: users.id });
        authorIds[a.email] = row.id;
      }
    }

    // Clean slate: delete any existing stories owned by the demo authors so
    // re-running doesn't accumulate duplicates (generateSlug adds a random
    // suffix each call, so titles alone don't dedupe).
    const demoAuthorIds = Object.values(authorIds);
    if (demoAuthorIds.length > 0) {
      await db
        .delete(stories)
        .where(inArray(stories.userId, demoAuthorIds));
      // chapters + staff_picks + boosts + sessions + turns + roster +
      // characters + spectators + donations + follows + sparks + jamEntries
      // all cascade via story_id onDelete.
      // Jams have a FK to the creator user, not to a story, so clean them
      // explicitly here.
      await db
        .delete(storyJams)
        .where(inArray(storyJams.createdBy, demoAuthorIds));
      // Per-user surfaces that don't cascade from story delete
      await db
        .delete(notifications)
        .where(inArray(notifications.userId, demoAuthorIds));
      await db
        .delete(readingProgress)
        .where(inArray(readingProgress.userId, demoAuthorIds));
    }

    // ── Story definitions ────────────────────────────────────
    const para = (text: string) => `<p>${text}</p>`;

    const storyDefs = [
      {
        authorEmail: "mira@demo.quiloria",
        title: "The Cartographer's Apology",
        synopsis:
          "A mapmaker with shaking hands is asked to chart a city that does not want to be found.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800",
        genres: ["literary", "historical"],
        format: "novel",
        staffPick: true,
        flash: false,
        chapters: [
          {
            title: "i. The Commission",
            content:
              para(
                "Henri's hands had been steady once. Steady enough to draw the coastline of Brittany across forty leagues of vellum without lifting the quill. Now they trembled when he reached for his tea.",
              ) +
              para(
                "The woman who had come for him that morning wore a coat the colour of wet slate. She did not give her name. She placed a leather pouch on his table and said only: \"We need someone to map a city that does not wish to be mapped.\"",
              ) +
              para(
                "He should have refused. He was sixty-one years old. His wife was dead. His daughter had not written in four winters. The trembling hand, the cold room, the dwindling shelf of ink.",
              ) +
              para(
                "Instead he said, \"Show me what you have.\"",
              ) +
              para(
                "From the pouch she drew a single sheet of paper. On it was a sketch — crude, done in hurry — of a cathedral that did not exist, beside a river that did not exist, beneath a sky whose stars were in the wrong places.",
              ) +
              para(
                "\"This is what the last cartographer left us,\" she said. \"Before he stopped speaking.\"",
              ),
          },
          {
            title: "ii. The Road South",
            content:
              para(
                "They travelled for six days. Henri did not ask where. The woman — she called herself Aude, though he did not believe it was her name — paid for their lodgings in silver coins too old to spend without attracting notice.",
              ) +
              para(
                "On the sixth evening the road narrowed, the trees leaned inward, and the horses refused to go further. Aude dismounted without protest and began walking. Henri followed, his satchel of instruments heavier with each step.",
              ) +
              para(
                "The city appeared at dusk, the way a bruise appears on skin — not suddenly, but as a gradual admission that it had been there all along. Walls the colour of old honey. Bells that did not ring.",
              ) +
              para(
                "\"Draw what you see,\" Aude told him. \"Only that. Nothing more.\"",
              ) +
              para(
                "Henri unrolled his vellum. He uncapped his ink. His hand, for the first time in eleven years, did not shake.",
              ),
          },
          {
            title: "iii. The First Map",
            content:
              para(
                "He began with the walls. That was the discipline of the thing — always the walls first, then the gates, then the principal streets. A map was a kind of argument: here is where a place begins, here is where it ends, here is what connects one part of it to another.",
              ) +
              para(
                "But the walls of this city kept changing length while he measured them. Not dramatically. Not enough for Aude to notice when he mentioned it. A finger's breadth here. A hand's span there. As if the city were breathing.",
              ) +
              para(
                "By the second day he had given up on the walls and begun instead to map the light. Where it fell. Where it refused to fall. Where it pooled in the streets at noon like standing water.",
              ) +
              para(
                "Aude watched him work and said nothing. She took the finished sheets from his hands each evening and rolled them into a copper tube she wore across her back.",
              ) +
              para(
                "On the fourth night he asked her: \"What happened to the last cartographer?\"",
              ) +
              para(
                "She was a long time in answering. \"He drew the city the way it wished to be drawn,\" she said finally. \"And then he could no longer see the world outside it.\"",
              ) +
              para(
                "Henri looked down at his hands. They were, he noticed, steady as a younger man's. And he understood, with a small cold certainty, that he had already begun to disappear.",
              ),
          },
        ],
      },
      {
        authorEmail: "caleb@demo.quiloria",
        title: "Small Weather",
        synopsis: "A flash piece about the woman who keeps the lighthouse at the edge of a sea that no longer exists.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
        genres: ["literary"],
        format: "novel",
        staffPick: false,
        flash: true,
        chapters: [
          {
            title: "Small Weather",
            content:
              para(
                "The sea left in the spring of the fourteenth year. Not drained, not dried — left, the way a guest leaves a house when the welcome has gone thin.",
              ) +
              para(
                "Orla kept the lighthouse anyway. The council had offered her a pension and a cottage inland, and she had accepted neither. Her mother had kept the light. Her mother's mother had kept the light. There was nothing in her that knew how to stop.",
              ) +
              para(
                "She climbed the spiral stairs at dusk. She lit the lamp. She wound the clockwork that turned the great brass lens. The beam swept out across the empty basin — across salt flats where fishing boats lay on their sides like the bones of enormous animals — and came back to her, and swept out again.",
              ) +
              para(
                "Sometimes at night she thought she could still hear the sea. Not the memory of it. The thing itself, distant, the way you hear a voice in another room when the door is closed.",
              ) +
              para(
                "On the hundredth night after the sea had gone, she climbed the stairs and found a man standing at the top of the lighthouse. He was dripping wet. Seawater pooled around his boots on the iron floor.",
              ) +
              para(
                "\"I'm sorry,\" he said. \"I think I'm lost.\"",
              ) +
              para(
                "Orla considered him for a long moment. Then she turned, and went back down the stairs, and put the kettle on.",
              ),
          },
        ],
      },
      {
        authorEmail: "jules@demo.quiloria",
        title: "The Fox Who Counted Stars",
        synopsis: "A short fable for anyone who has ever lost count.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800",
        genres: ["fantasy", "fable"],
        format: "novel",
        staffPick: true,
        flash: true,
        chapters: [
          {
            title: "The Fox Who Counted Stars",
            content:
              para(
                "There was once a fox who believed that if he could count every star in the sky, the world would finally make sense to him.",
              ) +
              para(
                "He began on a summer night, when the air was warm and the sky was deep. One, he said. Two. Three. By the time the moon rose he was at four hundred and seventy-three and his throat was dry.",
              ) +
              para(
                "The owl, who was old and patient, asked him what he was doing. The fox explained. The owl said: \"There are more stars than there are words to name them. You will never finish.\"",
              ) +
              para(
                "\"I know,\" said the fox. \"That is not the point.\"",
              ) +
              para(
                "He counted every night for the rest of his life. On the night he died, under a sky crowded with the late stars of autumn, he was at eleven thousand and something. The number does not matter.",
              ) +
              para(
                "What matters is that the world had begun, at last, to make sense to him — not because he had counted them all, but because he had stopped expecting to.",
              ),
          },
        ],
      },
      {
        authorEmail: "mira@demo.quiloria",
        title: "Letters to a Drowned Brother",
        synopsis:
          "An epistolary novella written to a ghost who is beginning to answer back.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
        genres: ["literary", "grief"],
        format: "novel",
        staffPick: false,
        flash: false,
        chapters: [
          {
            title: "First Letter",
            content:
              para(
                "Dearest Emil — I have started this letter eight times and I will not apologise for starting it a ninth. You were always the patient one.",
              ) +
              para(
                "The house is the same. The cat has learned to sleep on the other pillow. I have not. I find I am writing to you the way one writes to a landlord about a leak — firmly, politely, in the hope that something will finally be done about it.",
              ) +
              para(
                "It is raining tonight. It was raining the last night too. There is a smallness to grief that no one warned me about — not the size of it, which everyone warns you about, but the smallness. The way it fits inside a teacup. The way it rides the bus with you, pays its fare, gets off two stops before yours.",
              ) +
              para(
                "I miss you. I am trying to say that without flourishing. It is harder than I expected.",
              ),
          },
          {
            title: "Second Letter",
            content:
              para(
                "Dearest Emil — Something strange has happened. I do not know if you will believe me. I do not know if you are in a position to believe anything.",
              ) +
              para(
                "Last night I wrote you a letter and left it on the kitchen table because I could not bear to burn it. This morning when I came down there was a second letter next to it. The handwriting was not mine. It was not yours either, not exactly — but it was close, Emil, closer than anything I have seen in three years. It said only: \"Keep writing. I am reading them.\"",
              ) +
              para(
                "I sat with it for an hour. Then I went for a walk, and when I came back it was still there, and I put it in the drawer where I used to keep your letters from university, and I thought: I am either going mad or I am not alone.",
              ) +
              para(
                "Either way, I will keep writing.",
              ),
          },
        ],
      },
      {
        authorEmail: "caleb@demo.quiloria",
        title: "Machine Season",
        synopsis:
          "In a factory town where the machines dream, a new worker starts to hear what they are dreaming about.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800",
        genres: ["science-fiction", "literary"],
        format: "novel",
        staffPick: false,
        flash: false,
        chapters: [
          {
            title: "Intake",
            content:
              para(
                "They gave her a grey coverall and a set of earplugs and a laminated card with the factory rules printed in six languages. \"Do not speak to the machines,\" rule seven said. \"They are not listening to you.\"",
              ) +
              para(
                "Dala tucked the card into her breast pocket. Her shift began at four in the morning. The factory floor was the size of a cathedral and smelled like hot copper and something faintly sweet, like pear skins.",
              ) +
              para(
                "The machines were enormous. They did things she did not understand to metal parts she did not recognise. She was responsible for a single conveyor belt, and for pressing a single button when a red light came on, and for not speaking to the machines.",
              ) +
              para(
                "On her third day she took out her earplugs by accident. She heard the humming first. Then, underneath the humming, a sound she could not place — a sound like someone singing very quietly in a room a long way off.",
              ) +
              para(
                "She put her earplugs back in. She did not tell anyone. But that night, walking home along the canal, she found herself humming the same tune.",
              ),
          },
        ],
      },
      {
        authorEmail: "jules@demo.quiloria",
        title: "The Gardener of Small Hours",
        synopsis:
          "A woman tends a garden that blooms only between 3 and 4 a.m.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800",
        genres: ["magical-realism", "literary"],
        format: "novel",
        staffPick: false,
        flash: false,
        chapters: [
          {
            title: "Three O'Clock",
            content:
              para(
                "Her alarm was set for two forty-five. She did not need it — she woke, now, a minute before it rang, the way her body had learned to wake for a nursing infant years ago and had never quite unlearned.",
              ) +
              para(
                "She dressed in the dark. Wool socks, the old coat, the boots by the back door. The kettle she left for afterwards. The garden did not like the smell of tea.",
              ) +
              para(
                "At three o'clock exactly she unlocked the gate and stepped through. The flowers were already opening. They were not any flowers she could have named — her grandmother had called them night-candles, but her grandmother had called many things by names no one else used.",
              ) +
              para(
                "They gave off a faint cold light. Enough to read by, if you were patient. She knelt in the damp earth and began to pull the weeds that only grew during this one hour of the night, and she thought about her daughter, and about the letter she had not yet answered, and about whether any of this was real.",
              ),
          },
        ],
      },
    ];

    const created: { id: string; title: string; chapters: number }[] = [];

    for (const def of storyDefs) {
      const authorId = authorIds[def.authorEmail];
      const slug = generateSlug(def.title);

      const [story] = await db
        .insert(stories)
        .values({
          userId: authorId,
          title: def.title,
          slug,
          synopsis: def.synopsis,
          coverImageUrl: def.coverImageUrl,
          genres: def.genres,
          format: def.format,
          status: "published",
          isPublic: true,
          publishedAt: new Date(),
        })
        .returning({ id: stories.id });

      let sortOrder = 0;
      for (const ch of def.chapters) {
        await db.insert(chapters).values({
          storyId: story.id,
          title: ch.title,
          content: ch.content,
          wordCount: countWords(ch.content),
          sortOrder: sortOrder++,
          status: "published",
        });
      }

      if (def.staffPick) {
        await db.insert(staffPicks).values({
          storyId: story.id,
          curatorNote: "A quiet, confident piece worth your evening.",
          pickedBy: "The editors",
        });
      }

      created.push({
        id: story.id,
        title: def.title,
        chapters: def.chapters.length,
      });
    }

    // ── Extra readers for donations, follows, spectators ────
    const readerDefs: { email: string; display: string }[] = [
      { email: "reader-ada@demo.quiloria", display: "Ada" },
      { email: "reader-bram@demo.quiloria", display: "Bram" },
      { email: "reader-cora@demo.quiloria", display: "Cora" },
      { email: "reader-dima@demo.quiloria", display: "Dima" },
      { email: "reader-eir@demo.quiloria", display: "Eir" },
    ];
    const readerIds: Record<string, string> = {};
    for (const r of readerDefs) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, r.email),
      });
      if (existing) {
        readerIds[r.email] = existing.id;
      } else {
        const [row] = await db
          .insert(users)
          .values({
            email: r.email,
            name: r.display,
            displayName: r.display,
            password: passwordHash,
            inkDropBalance: 500,
          })
          .returning({ id: users.id });
        readerIds[r.email] = row.id;
      }
    }

    // Shared "now" for all time-based inserts below
    const now = new Date();

    // ── Adventure story + live session ──────────────────────
    // We build this as a dedicated campaign story by Jules so the hero,
    // trending, and live-adventures sections all have something to render.
    const adventureSlug = generateSlug("The Hollow King");
    const [adventureStory] = await db
      .insert(stories)
      .values({
        userId: authorIds["jules@demo.quiloria"],
        title: "The Hollow King",
        slug: adventureSlug,
        synopsis:
          "Four strangers wake inside a keep that should not exist, holding memories that are not theirs.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1572177215152-32f247303126?w=1200",
        genres: ["dark-fantasy", "mystery"],
        format: "novel",
        writingMode: "campaign",
        status: "published",
        isPublic: true,
        publishedAt: new Date(),
      })
      .returning({ id: stories.id });
    created.push({ id: adventureStory.id, title: "The Hollow King", chapters: 0 });

    // Characters for the live session
    const characterDefs = [
      {
        userId: authorIds["mira@demo.quiloria"],
        name: "Kestrel the Scholar",
      },
      {
        userId: authorIds["caleb@demo.quiloria"],
        name: "Brand the Silent",
      },
      {
        userId: readerIds["reader-ada@demo.quiloria"],
        name: "Yewen Dalgarro",
      },
      {
        userId: readerIds["reader-bram@demo.quiloria"],
        name: "Old Mother Ivy",
      },
    ];
    const characterRows = [];
    for (const c of characterDefs) {
      const [row] = await db
        .insert(playerCharacters)
        .values({
          storyId: adventureStory.id,
          userId: c.userId,
          name: c.name,
          status: "active",
        })
        .returning({ id: playerCharacters.id, userId: playerCharacters.userId });
      characterRows.push(row);
    }

    // Live session — one that has a recent turn (within last 2 minutes)
    const [liveSession] = await db
      .insert(campaignSessions)
      .values({
        storyId: adventureStory.id,
        title: "Into the Hollow",
        summary:
          "The party crosses the outer gate and finds the first of the sleeping watchers.",
        opening:
          "The keep of the Hollow King is older than any kingdom that remembers its name.",
        status: "active",
      })
      .returning({ id: campaignSessions.id });

    for (const char of characterRows) {
      await db.insert(sessionRoster).values({
        sessionId: liveSession.id,
        characterId: char.id,
        userId: char.userId,
        status: "present",
      });
    }

    // A few turns, most recent within the last minute
    const turns = [
      {
        at: new Date(now.getTime() - 8 * 60 * 1000),
        userId: authorIds["jules@demo.quiloria"],
        type: "narration",
        content:
          "You cross the threshold together. The air inside the keep is colder than the winter outside — a dry cold, like a held breath.",
      },
      {
        at: new Date(now.getTime() - 6 * 60 * 1000),
        userId: characterRows[0].userId,
        characterId: characterRows[0].id,
        type: "action",
        content: "Kestrel lifts her lantern and sweeps it slowly across the threshold stones.",
      },
      {
        at: new Date(now.getTime() - 4 * 60 * 1000),
        userId: characterRows[1].userId,
        characterId: characterRows[1].id,
        type: "dialogue",
        content: "\"Someone has been here recently. The dust is wrong.\"",
      },
      {
        at: new Date(now.getTime() - 90 * 1000),
        userId: authorIds["jules@demo.quiloria"],
        type: "narration",
        content:
          "The door at the far end of the hall gives way with a breath — not a sound, but an exhalation, as if the keep itself had been holding its breath for centuries and chose, now, to let it go.",
      },
    ];
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      await db.insert(campaignTurns).values({
        sessionId: liveSession.id,
        userId: t.userId,
        characterId: (t as { characterId?: string }).characterId ?? null,
        type: t.type,
        content: t.content,
        sortOrder: i,
        createdAt: t.at,
      });
    }

    // A handful of live spectators
    const spectatorUserIds = [
      readerIds["reader-cora@demo.quiloria"],
      readerIds["reader-dima@demo.quiloria"],
      readerIds["reader-eir@demo.quiloria"],
    ];
    for (let i = 0; i < spectatorUserIds.length; i++) {
      await db.insert(spectatorPresence).values({
        sessionId: liveSession.id,
        token: `seed-spectator-${i}-${Date.now()}`,
        userId: spectatorUserIds[i],
        lastHeartbeat: new Date(now.getTime() - i * 5 * 1000),
      });
    }

    // A second, recently-active (but not-live) session
    const [recentSession] = await db
      .insert(campaignSessions)
      .values({
        storyId: adventureStory.id,
        title: "The Long Dusk",
        summary:
          "After the first watch, the party must decide who carries the lantern through the descent.",
        status: "active",
      })
      .returning({ id: campaignSessions.id });
    for (const char of characterRows.slice(0, 3)) {
      await db.insert(sessionRoster).values({
        sessionId: recentSession.id,
        characterId: char.id,
        userId: char.userId,
        status: "present",
      });
    }
    await db.insert(campaignTurns).values({
      sessionId: recentSession.id,
      userId: authorIds["jules@demo.quiloria"],
      type: "narration",
      content:
        "The descent takes longer than any of you expected, as if the stair were unfolding itself beneath your feet.",
      sortOrder: 0,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    });

    // ── Follows, sparks, donations, jams, updates ───────────
    const allStoryIds = created.map((c) => c.id);
    const readerIdList = Object.values(readerIds);

    // Each reader follows 3 random stories
    for (const rId of readerIdList) {
      const shuffled = [...allStoryIds].sort(() => Math.random() - 0.5);
      for (const sId of shuffled.slice(0, 3)) {
        await db
          .insert(follows)
          .values({
            userId: rId,
            storyId: sId,
            createdAt: new Date(
              now.getTime() - Math.random() * 6 * 24 * 60 * 60 * 1000,
            ),
          })
          .onConflictDoNothing();
      }
    }

    // Sparks
    for (const rId of readerIdList) {
      const shuffled = [...allStoryIds].sort(() => Math.random() - 0.5);
      for (const sId of shuffled.slice(0, 4)) {
        await db
          .insert(sparks)
          .values({
            userId: rId,
            storyId: sId,
            createdAt: new Date(
              now.getTime() - Math.random() * 6 * 24 * 60 * 60 * 1000,
            ),
          })
          .onConflictDoNothing();
      }
    }

    // Donations — a few across different stories. Each donation needs the
    // recipient user id, which is the story's author.
    const storyAuthor: Record<string, string> = {
      "The Cartographer's Apology": authorIds["mira@demo.quiloria"],
      "Small Weather": authorIds["caleb@demo.quiloria"],
      "Letters to a Drowned Brother": authorIds["mira@demo.quiloria"],
      "Machine Season": authorIds["caleb@demo.quiloria"],
      "The Fox Who Counted Stars": authorIds["jules@demo.quiloria"],
      "The Gardener of Small Hours": authorIds["jules@demo.quiloria"],
      "The Hollow King": authorIds["jules@demo.quiloria"],
    };
    const donationPlan: { reader: string; story: string; amount: number; msg: string }[] = [
      { reader: "reader-ada@demo.quiloria", story: "The Cartographer's Apology", amount: 50, msg: "This gave me chills." },
      { reader: "reader-bram@demo.quiloria", story: "Small Weather", amount: 25, msg: "So quiet and so loud." },
      { reader: "reader-cora@demo.quiloria", story: "Letters to a Drowned Brother", amount: 100, msg: "" },
      { reader: "reader-dima@demo.quiloria", story: "Machine Season", amount: 10, msg: "Haunted." },
      { reader: "reader-eir@demo.quiloria", story: "The Fox Who Counted Stars", amount: 75, msg: "Read this to my kid. Twice." },
    ];
    for (const d of donationPlan) {
      const story = created.find((c) => c.title === d.story);
      const authorId = storyAuthor[d.story];
      if (!story || !authorId) continue;
      await db.insert(storyDonations).values({
        storyId: story.id,
        fromUserId: readerIds[d.reader],
        toUserId: authorId,
        amount: d.amount,
        message: d.msg,
        createdAt: new Date(
          now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000,
        ),
      });
    }

    // Creator updates
    const letters = created.find((c) => c.title === "Letters to a Drowned Brother");
    if (letters) {
      await db.insert(creatorUpdates).values({
        storyId: letters.id,
        userId: authorIds["mira@demo.quiloria"],
        content: "Chapter three is almost done. It took me by surprise.",
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      });
    }

    // ── Personal surfaces for Mira (demo "current user") ───
    // So the Continue zone + Today strip light up on her signed-in home.
    const mira = authorIds["mira@demo.quiloria"];
    const cartographer = created.find(
      (c) => c.title === "The Cartographer's Apology",
    );
    const fox = created.find((c) => c.title === "The Fox Who Counted Stars");

    // Mira has reading progress on "The Fox Who Counted Stars"
    if (fox) {
      const foxChapters = await db
        .select({ id: chapters.id })
        .from(chapters)
        .where(eq(chapters.storyId, fox.id))
        .orderBy(chapters.sortOrder)
        .limit(1);
      if (foxChapters[0]) {
        await db
          .insert(readingProgress)
          .values({
            userId: mira,
            storyId: fox.id,
            chapterId: foxChapters[0].id,
            scrollPercent: 64,
            pageNumber: 2,
            updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
          })
          .onConflictDoNothing();
      }
    }

    // Mira has a draft-in-progress
    await db.insert(stories).values({
      userId: mira,
      title: "Untitled — the bone garden",
      slug: generateSlug("Untitled the bone garden"),
      synopsis: "",
      format: "novel",
      status: "draft",
      isPublic: false,
      updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });

    // A reader comment on Mira's Cartographer story (last 24h)
    if (cartographer) {
      const cartoChapters = await db
        .select({ id: chapters.id })
        .from(chapters)
        .where(eq(chapters.storyId, cartographer.id))
        .orderBy(chapters.sortOrder)
        .limit(1);
      if (cartoChapters[0]) {
        await db.insert(comments).values({
          userId: readerIds["reader-ada@demo.quiloria"],
          chapterId: cartoChapters[0].id,
          storyId: cartographer.id,
          content:
            "I read this three times and still can't tell if Aude is real.",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        });
      }
    }

    // An unread notification for Mira
    await db.insert(notifications).values({
      userId: mira,
      type: "comment",
      message: "Ada left a comment on The Cartographer's Apology",
      href: cartographer ? `/story/${cartographer.id}` : "/",
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    // A jam that's open + closes in 2 days
    const jamSubmissionEnds = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const jamVotingEnds = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const [jam] = await db
      .insert(storyJams)
      .values({
        title: "The Hollow Jam",
        description:
          "Write a flash piece of under 1000 words about a place that should not exist.",
        theme: "Impossible Places",
        bannerUrl:
          "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200",
        createdBy: authorIds["jules@demo.quiloria"],
        submissionStartsAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        submissionEndsAt: jamSubmissionEnds,
        votingStartsAt: jamSubmissionEnds,
        votingEndsAt: jamVotingEnds,
        wordCountMin: 100,
        wordCountMax: 1000,
        status: "open",
      })
      .returning({ id: storyJams.id });

    // A jam entry
    const smallWeather = created.find((c) => c.title === "Small Weather");
    if (smallWeather) {
      await db.insert(jamEntries).values({
        jamId: jam.id,
        storyId: smallWeather.id,
        userId: authorIds["caleb@demo.quiloria"],
        submittedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      });
    }

    // ── Demo boosts ──────────────────────────────────────────
    // Seed one hero boost and one standard boost so the home page shows
    // the Sponsored pill + sponsored strip working end-to-end.
    const heroPick = created.find((c) => c.title === "The Cartographer's Apology");
    const standardPick = created.find((c) => c.title === "Machine Season");
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (heroPick) {
      await db
        .insert(storyBoosts)
        .values({
          storyId: heroPick.id,
          userId: authorIds["mira@demo.quiloria"],
          inkDropsCost: 300,
          tier: "hero",
          status: "active",
          startsAt: now,
          expiresAt: in24h,
        })
        .onConflictDoNothing();
    }
    if (standardPick) {
      await db
        .insert(storyBoosts)
        .values({
          storyId: standardPick.id,
          userId: authorIds["caleb@demo.quiloria"],
          inkDropsCost: 50,
          tier: "standard",
          status: "active",
          startsAt: now,
          expiresAt: in24h,
        })
        .onConflictDoNothing();
    }

    return NextResponse.json({
      ok: true,
      authors: Object.keys(authorIds).length,
      stories: created,
      boosts: {
        hero: heroPick?.title ?? null,
        standard: standardPick?.title ?? null,
      },
      loginHint: "demo authors password: demo1234",
    });
  } catch (error) {
    console.error("seed-fyr error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
