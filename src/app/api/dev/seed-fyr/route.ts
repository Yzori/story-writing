import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  users,
  stories,
  chapters,
  staffPicks,
  storyBoosts,
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
      // chapters + staff_picks cascade via onDelete
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

    // ── Demo boosts ──────────────────────────────────────────
    // Seed one hero boost and one standard boost so the home page shows
    // the Sponsored pill + sponsored strip working end-to-end.
    const heroPick = created.find((c) => c.title === "The Cartographer's Apology");
    const standardPick = created.find((c) => c.title === "Machine Season");
    const now = new Date();
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
