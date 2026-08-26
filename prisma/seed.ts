import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import type { SongType } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/auth/password";
import { resolvePooledUrl } from "../src/lib/db-url";
import { SEED_CHARTS, SEED_SONGS } from "./seed-data/songs";
import {
  DISCOVER_EXTRAS,
  SEED_TEAM,
  TECH_POSITIONS,
  WORSHIP_POSITIONS,
} from "./seed-data/team";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: resolvePooledUrl() }),
});

const CHURCH_SLUG = "northminster";
const DEMO_PASSWORD = "setmeister-demo";
const HISTORY_WEEKS = 52;
const DAY = 86_400_000;

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The next Sunday on or after `from`. */
function nextSunday(from: Date): Date {
  const base = utcDay(from);
  return new Date(base.getTime() + ((7 - base.getUTCDay()) % 7) * DAY);
}

function addWeeks(d: Date, weeks: number): Date {
  return new Date(d.getTime() + weeks * 7 * DAY);
}

async function main() {
  const today = utcDay(new Date());
  const thisSunday = nextSunday(today);

  console.log(`Seeding SetMeister — anchor Sunday ${thisSunday.toISOString().slice(0, 10)}`);

  // --- Reset the demo tenant -------------------------------------------
  await db.church.deleteMany({ where: { slug: CHURCH_SLUG } });
  await db.user.deleteMany({
    where: { email: { endsWith: "@northminster.example" } },
  });
  await db.catalogSong.deleteMany({ where: { source: "seed" } });

  // --- Church, leader, profile -----------------------------------------
  const church = await db.church.create({
    data: {
      name: "Northminster Community Church",
      slug: CHURCH_SLUG,
      timezone: "America/New_York",
    },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const britt = await db.user.create({
    data: {
      name: "Britt Hollis",
      email: "britt@northminster.example",
      emailVerified: new Date(),
      passwordHash,
    },
  });
  await db.membership.create({
    data: { userId: britt.id, churchId: church.id, role: "OWNER" },
  });

  // A second signed-in persona for testing the musician experience.
  const musicianUser = await db.user.create({
    data: {
      name: "Mike Alvarez",
      email: "mike@northminster.example",
      emailVerified: new Date(),
      passwordHash,
    },
  });
  await db.membership.create({
    data: { userId: musicianUser.id, churchId: church.id, role: "MUSICIAN" },
  });

  await db.worshipProfile.create({
    data: {
      churchId: church.id,
      styles: ["CONTEMPORARY", "MODERN_HYMNS", "ACOUSTIC", "COUNTRY"],
      songsPerService: 4,
      setStructure: ["Upbeat", "Mid", "Hymn", "Response"],
      hymnPreference: "ONE_PER_WEEK",
      repeatWindowWeeks: 8,
      preferredArtists: ["Phil Wickham", "Elevation Worship", "CityAlight", "Chris Tomlin"],
      avoidArtists: [],
      avoidSongs: [],
      difficulty: "MODERATE",
      vocalRangeNote: "Keep congregational melodies between A3 and D5.",
    },
  });

  const serviceType = await db.serviceType.create({
    data: {
      churchId: church.id,
      name: "Sunday 10:00 AM",
      dayOfWeek: 0,
      defaultStartTime: "10:00",
      defaultCallTime: "08:30",
      sortOrder: 0,
    },
  });

  // --- Positions ---------------------------------------------------------
  const positions = new Map<string, string>();
  let order = 0;
  for (const name of WORSHIP_POSITIONS) {
    const p = await db.position.create({
      data: { churchId: church.id, name, category: "WORSHIP", sortOrder: order++ },
    });
    positions.set(name, p.id);
  }
  order = 0;
  for (const name of TECH_POSITIONS) {
    const p = await db.position.create({
      data: { churchId: church.id, name, category: "TECH", sortOrder: order++ },
    });
    positions.set(name, p.id);
  }

  // --- Catalog (Discover) + church library -------------------------------
  for (const s of SEED_SONGS) {
    await db.catalogSong.create({
      data: {
        title: s.title,
        artist: s.artist,
        defaultKey: s.defaultKey,
        bpm: s.bpm,
        tempoCategory: s.tempo,
        songTypes: s.types,
        themes: s.themes,
        difficulty: s.difficulty,
        artworkSeed: s.title,
        popularity: s.popularity ?? 50,
        isPublicDomain: s.publicDomain ?? false,
      },
    });
  }
  for (const s of DISCOVER_EXTRAS) {
    await db.catalogSong.create({
      data: {
        title: s.title,
        artist: s.artist,
        defaultKey: s.defaultKey,
        bpm: s.bpm,
        tempoCategory: s.bpm >= 110 ? "FAST" : s.bpm >= 70 ? "MEDIUM" : "SLOW",
        songTypes: s.types as SongType[],
        themes: s.themes,
        difficulty: "MODERATE",
        artworkSeed: s.title,
        popularity: s.popularity,
      },
    });
  }

  const songIdByTitle = new Map<string, string>();
  for (const s of SEED_SONGS) {
    const catalog = await db.catalogSong.findUnique({
      where: { title_artist: { title: s.title, artist: s.artist } },
    });
    const song = await db.song.create({
      data: {
        churchId: church.id,
        catalogSongId: catalog?.id,
        title: s.title,
        artist: s.artist,
        defaultKey: s.defaultKey,
        churchKey: s.churchKey ?? s.defaultKey,
        bpm: s.bpm,
        tempoCategory: s.tempo,
        songTypes: s.types,
        themes: s.themes,
        difficulty: s.difficulty,
        familiarity: s.familiarity,
        status: "ACTIVE",
      },
    });
    songIdByTitle.set(s.title, song.id);
  }

  // Charts for public-domain hymns only.
  for (const [title, chart] of Object.entries(SEED_CHARTS)) {
    const songId = songIdByTitle.get(title);
    if (!songId) continue;
    await db.songChart.create({
      data: {
        songId,
        format: "STRUCTURED",
        key: chart.key,
        capo: chart.capo,
        sections: chart.sections,
      },
    });
  }

  // --- Team --------------------------------------------------------------
  const memberIdByName = new Map<string, string>();
  for (const m of SEED_TEAM) {
    const member = await db.teamMember.create({
      data: {
        churchId: church.id,
        userId:
          m.email === britt.email
            ? britt.id
            : m.email === musicianUser.email
              ? musicianUser.id
              : undefined,
        name: m.name,
        email: m.email,
        vocalRange: m.vocalRange,
        preferredPerMonth: m.preferredPerMonth,
        preferredServiceTypeId: serviceType.id,
        notes: m.notes,
        active: true,
        positions: {
          create: m.positions
            .filter((p) => positions.has(p))
            .map((p, i) => ({ positionId: positions.get(p)!, priority: 10 - i })),
        },
      },
    });
    memberIdByName.set(m.name, member.id);
  }

  // Blockouts, including Mike across the two Sundays the demo prompt mentions.
  await db.blockoutDate.createMany({
    data: [
      {
        teamMemberId: memberIdByName.get("Mike Alvarez")!,
        startDate: addWeeks(thisSunday, 1),
        endDate: addWeeks(thisSunday, 2),
        note: "Out of town — family wedding",
      },
      {
        teamMemberId: memberIdByName.get("Sarah Kim")!,
        startDate: addWeeks(thisSunday, 3),
        endDate: addWeeks(thisSunday, 3),
        note: "Travelling",
      },
      {
        teamMemberId: memberIdByName.get("David Osei")!,
        startDate: addWeeks(thisSunday, 2),
        endDate: addWeeks(thisSunday, 2),
        note: "Work conference",
      },
      {
        teamMemberId: memberIdByName.get("Priya Raman")!,
        startDate: addWeeks(thisSunday, 4),
        endDate: addWeeks(thisSunday, 5),
        note: "Visiting family",
      },
    ],
  });

  // --- Historical services -----------------------------------------------
  // A pre-SetMeister rotation, composed deliberately rather than randomly so
  // the seeded library exercises every usage state the product reports on.
  // A real church leans on a small core and quietly overuses a few favourites;
  // that "before" picture is exactly what the usage intelligence has to catch.
  const titlesWhere = (fn: (s: (typeof SEED_SONGS)[number]) => boolean) =>
    SEED_SONGS.filter(fn).map((s) => s.title);

  /** Never appear in history — they show as "Never played". */
  const NEVER_PLAYED = new Set(titlesWhere((s) => s.familiarity === "NEW"));

  /** Leaned on far too hard lately → Overplayed. */
  const HOUSE = "House of the Lord";
  const GOODNESS = "Goodness of God";
  const WAY_MAKER = "Way Maker";

  /** A tight mid-set rotation → Frequently used. */
  const FREQUENT = ["Same God", "Gratitude", "Build My Life"];

  /** Dropped out of rotation months ago → Ready to return. */
  const RESTED = [
    "Raise a Hallelujah",
    "Cornerstone",
    "Death Was Arrested",
    "Holy Water",
    "Tremble",
    "Broken Vessels (Amazing Grace)",
  ];

  const playable = (t: string) => !NEVER_PLAYED.has(t);
  const exclude = new Set([HOUSE, GOODNESS, WAY_MAKER, ...FREQUENT, ...RESTED]);

  const openerPool = titlesWhere((s) => s.types.includes("UPBEAT")).filter(
    (t) => playable(t) && !exclude.has(t),
  );
  const midPool = titlesWhere((s) => s.types.includes("MID_TEMPO")).filter(
    (t) => playable(t) && !exclude.has(t),
  );
  const hymnPool = titlesWhere((s) => s.types.includes("HYMN")).filter(playable);
  const closerPool = titlesWhere(
    (s) => s.types.includes("REFLECTIVE") || s.types.includes("RESPONSE"),
  ).filter((t) => playable(t) && !exclude.has(t));

  /**
   * Deterministic round-robin with a cursor per pool. Indexing a pool by week
   * number skips most of a large pool; a cursor guarantees every song in
   * rotation actually gets sung, so no song sits at "Core" but never played.
   */
  const cursors = new Map<string, number>();
  function cycle(pool: string[], name: string): string {
    if (pool.length === 0) return "";
    const i = cursors.get(name) ?? 0;
    cursors.set(name, i + 1);
    return pool[i % pool.length];
  }

  function setForWeek(w: number): string[] {
    const chosen: string[] = [];
    const push = (t: string) => {
      if (t && !chosen.includes(t)) chosen.push(t);
    };

    // Weeks are counted backwards as negatives. JavaScript's % keeps the sign,
    // so `w % 3 === 2` would never match — count forward from the oldest week.
    const k = -w;

    // Opener — the congregation's favourite every other week.
    push(k % 2 === 0 ? HOUSE : cycle(openerPool, "opener"));
    // Mid — Way Maker every third week, otherwise a tight three-song rotation.
    push(k % 3 === 2 ? WAY_MAKER : cycle(FREQUENT, "frequent"));
    // Third slot — a hymn two Sundays in three.
    push(k % 3 === 0 ? cycle(midPool, "mid") : cycle(hymnPool, "hymn"));
    // Closer — Goodness of God on alternate weeks; the rested set only ran
    // during the first half of the year, so it now reads as ready to return.
    push(k % 2 === 1 ? GOODNESS : w <= -19 ? cycle(RESTED, "rested") : cycle(closerPool, "closer"));

    // Backfill if a duplicate collapsed the set.
    let guard = 0;
    while (chosen.length < 4 && guard++ < 20) push(cycle(midPool, "mid"));
    return chosen.slice(0, 4);
  }

  const pastSeries = [
    { from: -26, to: -18, name: "Rooted", scriptures: ["Colossians 2:6-7", "Psalm 1:1-3", "Jeremiah 17:7-8"] },
    { from: -17, to: -9, name: "The Table", scriptures: ["Luke 22:14-20", "1 Corinthians 11:23-26", "Psalm 23:5"] },
    { from: -8, to: -1, name: "Summer Psalms", scriptures: ["Psalm 27", "Psalm 46", "Psalm 63", "Psalm 121"] },
  ];

  for (let w = -HISTORY_WEEKS; w <= -1; w++) {
    const date = addWeeks(thisSunday, w);
    const series = pastSeries.find((s) => w >= s.from && w <= s.to);

    const service = await db.service.create({
      data: {
        churchId: church.id,
        serviceTypeId: serviceType.id,
        date,
        startTime: "10:00",
        callTime: "08:30",
        status: "COMPLETED",
        sermon: series
          ? {
              create: {
                title: `${series.name} — Week ${w - series.from + 1}`,
                series: series.name,
                scripture:
                  series.scriptures[(w - series.from) % series.scriptures.length],
                description: `Part of the ${series.name} series.`,
              },
            }
          : undefined,
      },
    });

    for (const [i, title] of setForWeek(w).entries()) {
      const songId = songIdByTitle.get(title);
      const song = SEED_SONGS.find((s) => s.title === title);
      if (!songId || !song) continue;
      await db.serviceSong.create({
        data: {
          serviceId: service.id,
          songId,
          position: i + 1,
          key: song.churchKey ?? song.defaultKey,
        },
      });
      await db.songUsage.create({
        data: {
          churchId: church.id,
          songId,
          serviceId: service.id,
          playedOn: date,
          key: song.churchKey ?? song.defaultKey,
        },
      });
      await db.song.update({ where: { id: songId }, data: { lastPlayedOn: date } });
    }
  }

  // --- This Sunday and the upcoming plan ---------------------------------
  const lostAndFound = [
    {
      title: "The Prodigal Son",
      scripture: "Luke 15:11-32",
      description: "God's pursuit of people who have wandered away.",
    },
    {
      title: "The Lost Sheep",
      scripture: "Luke 15:1-7",
      description: "The shepherd who leaves the ninety-nine to find the one.",
    },
    {
      title: "The Lost Coin",
      scripture: "Luke 15:8-10",
      description: "Heaven's joy over one person who is found.",
    },
    {
      title: "The Father Who Runs",
      scripture: "Luke 15:20-24",
      description: "Grace that meets us before we finish our apology.",
    },
  ];

  const thisSundaySet = [
    "House of the Lord",
    "This Is Amazing Grace",
    "Blessed Assurance",
    "Goodness of God",
  ];
  const nextWeekSet = ["Great Things", "Same God", "Come Thou Fount of Every Blessing", "Gratitude"];

  for (const [i, sermon] of lostAndFound.entries()) {
    const date = addWeeks(thisSunday, i);
    // Week 0 is ready and invited; week 1 is planned but unstaffed; the rest
    // are empty drafts, so "Build With AI" has somewhere obvious to start.
    const status = i === 0 ? "INVITATIONS_SENT" : i === 1 ? "READY" : "DRAFT";

    const service = await db.service.create({
      data: {
        churchId: church.id,
        serviceTypeId: serviceType.id,
        date,
        startTime: "10:00",
        callTime: "08:30",
        status,
        title: i === 0 ? undefined : undefined,
        sermon: {
          create: {
            title: sermon.title,
            series: "Lost & Found",
            scripture: sermon.scripture,
            description: sermon.description,
          },
        },
      },
    });

    const set = i === 0 ? thisSundaySet : i === 1 ? nextWeekSet : [];
    for (const [j, title] of set.entries()) {
      const song = SEED_SONGS.find((s) => s.title === title)!;
      await db.serviceSong.create({
        data: {
          serviceId: service.id,
          songId: songIdByTitle.get(title)!,
          position: j + 1,
          key: song.churchKey ?? song.defaultKey,
        },
      });
    }

    if (i === 0) {
      // A realistic in-flight Sunday: mostly confirmed, one awaiting reply,
      // and Keys deliberately left open so the dashboard has a real alert.
      const roster: Array<[string, string, "ACCEPTED" | "INVITED"]> = [
        ["Britt Hollis", "Worship Leader", "ACCEPTED"],
        ["Mike Alvarez", "Electric Guitar", "ACCEPTED"],
        ["Sarah Kim", "Acoustic Guitar", "ACCEPTED"],
        ["David Osei", "Bass", "INVITED"],
        ["James Whitfield", "Drums", "ACCEPTED"],
        ["Rachel Boone", "Vocal", "ACCEPTED"],
        ["Chris Delgado", "Sound", "ACCEPTED"],
        ["Angela Ruiz", "Slides", "ACCEPTED"],
      ];
      for (const [name, position, status2] of roster) {
        await db.assignment.create({
          data: {
            serviceId: service.id,
            teamMemberId: memberIdByName.get(name)!,
            positionId: positions.get(position)!,
            status: status2,
            callTime: "08:30",
            respondedAt: status2 === "ACCEPTED" ? new Date() : null,
          },
        });
        await db.message.create({
          data: {
            churchId: church.id,
            kind: "INVITATION",
            status: "SENT",
            subject: `You're scheduled for Sunday — ${position}`,
            toEmail: SEED_TEAM.find((m) => m.name === name)!.email,
            teamMemberId: memberIdByName.get(name)!,
            serviceId: service.id,
            sentAt: new Date(Date.now() - 3 * DAY),
          },
        });
      }
    }
  }

  const [songCount, hymnCount, serviceCount, memberCount] = await Promise.all([
    db.song.count({ where: { churchId: church.id } }),
    db.song.count({ where: { churchId: church.id, songTypes: { has: "HYMN" } } }),
    db.service.count({ where: { churchId: church.id } }),
    db.teamMember.count({ where: { churchId: church.id } }),
  ]);

  console.log(`
  Seeded ${church.name}
    songs        ${songCount} (${hymnCount} hymns)
    services     ${serviceCount} (${HISTORY_WEEKS} completed, 4 upcoming)
    team         ${memberCount}
    this Sunday  ${thisSunday.toISOString().slice(0, 10)}

  Sign in:  britt@northminster.example  /  ${DEMO_PASSWORD}   (owner)
            mike@northminster.example   /  ${DEMO_PASSWORD}   (musician)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
