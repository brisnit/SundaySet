# Any Song & AutoChart

**Architecture audit · no code written**

What the song and chart architecture already does, what it can’t do yet, and the smallest safe foundation for searching almost any song and getting a usable chart out of it.

- **Repo** SetMeister · `main`
- **Read at** commit `dbc330d`
- **Status** awaiting your approval

---

## The short version

**The chart format is already right.** `SongChart.sections` stores structured JSON where every line is a `{chords, lyrics}` pair — chords and lyrics separated at the row level. That separation was built for transposition, but it turns out to be exactly the licensing boundary you asked for in §2: SetMeister can render a chart chords-only by dropping the lyric row. Keep it as canonical. ChordPro becomes import/export only.

**The gap that matters is provenance, and it is a legal gap rather than a data one.** Right now nothing on a chart records where it came from. A hand-typed chart, a machine guess and a licensed import are indistinguishable in the database. That has to land before any importer does.

**First provider should be MusicBrainz, not Spotify.** Spotify deprecated the audio-features and audio-analysis endpoints on 27 November 2024 — new apps get a 403 — so it cannot legitimately give us key or BPM, the two fields we would have wanted it for. Extended quota now also requires 250,000 monthly active users to even apply.

---

## Contents

1. [What exists today](#1-what-song-and-chart-architecture-already-exists)
2. [Reusable as-is](#2-what-can-be-reused)
3. [What must change](#3-what-needs-to-change)
4. [Canonical chart format](#4-recommended-canonical-chart-representation)
5. [Provider abstraction](#5-recommended-provider-abstraction)
6. [First metadata API](#6-best-legitimate-metadata-api-for-the-first-provider)
7. [Credentials needed](#7-required-credentials-and-accounts)
8. [Duplicate detection](#8-proposed-duplicate-detection)
9. [Chart provenance](#9-proposed-chart-provenance-model)
10. [CatalogSong long term](#10-how-catalogsong-fits-long-term)
11. [AutoChart architecture](#11-autochart-future-architecture)
12. [Copyright boundaries](#12-copyright-and-licensing-boundaries)
13. [Schema changes](#13-exact-additive-schema-changes)
14. [First vertical slice](#14-smallest-first-vertical-slice)
15. [Sequence](#15-recommended-implementation-sequence)

---

## 1. What song and chart architecture already exists

Five models carry songs today, and they are cleanly separated already.

| Model | Scope | Carries |
| --- | --- | --- |
| `CatalogSong` | Global, no tenant | Curated shelf behind Discover. Title, artist, CCLI number, default key, BPM, song types, themes, difficulty, `popularity`, `isPublicDomain`, streaming links. 60 seeded rows. Unique on `(title, artist)`. |
| `Song` | Tenant — `churchId` | What a workspace owns. All of the above plus `genres[]`, `churchKey`, `alternateKeys[]`, `familiarity`, `status`, `lyrics`, denormalized `lastPlayedOn`. Optional `catalogSongId` back to the shelf. |
| `SongChart` | 1:1 with Song | `format` (PLAIN \| STRUCTURED), `key`, `capo`, `sections Json`, `bodyText`. |
| `SongAttachment` | Many per Song | Uploaded files. `kind` is already PDF \| IMAGE \| **AUDIO**. |
| `SongUsage`, `ServiceSong` | Tenant | Play history, and a song’s slot in a set with its own `key`. |

### The chart representation

Charts are already structured. `src/lib/validation/song.ts` defines the shape, and the comment there already anticipates this work:

```
section = {
  label:  "Verse 1",
  type:   VERSE | PRECHORUS | CHORUS | BRIDGE | INTRO
        | OUTRO | TAG | INSTRUMENTAL | OTHER,
  lines:  [{ chords: "G      D/F#   Em",
             lyrics: "Purple rain, purple rain" }],
  notes?: "string"
}
```

Alongside it, `parseChartBody` turns a pasted chords-over-lyrics block into that shape, `looksLikeChordRow` tells a chord row from a lyric row by regex, and `serializeChartBody` goes back the other way.

### What is *not* there

- **No transposition.** `SETLIST_KEYS` exists and the set builder has a key dropdown, but it only labels the slot — it does not rewrite a single chord.
- **No provider layer.** `src/lib/integrations/` exists as an empty directory.
- **No external identifiers.** `catalogSongId` points only at our own seed table.
- **No provenance on charts.** Nothing records who or what wrote one.

---

## 2. What can be reused

**Verdict: Reuse**

More than I expected. Four things carry straight over.

- **The chart JSON model** — Already the canonical structured format. Don’t rebuild it — §4 argues it is the right answer for licensing reasons as well as musical ones.
- **The `StorageAdapter` pattern** — A typed interface, env-driven selection in `getStorage()`, a `storageStatus()` that reports availability so the UI degrades instead of breaking, a typed `UploadError`, and a local fallback for dev. That is precisely the shape `SongSearchProvider` needs. Copy it rather than inventing a second convention.
- **`addSongFromCatalog`’s contract** — It already looks for an existing row and returns it rather than duplicating. The “Already in your library” behaviour in §6 of your brief is an extension of this, not a new idea.
- **Tenancy and caching** — `scope(ctx)` / `scopedById(ctx, id)` on every query, and React `cache()` memoization in the data layer. Both apply unchanged.

---

## 3. What needs to change

**Verdict: Change**

1. **`Song` has no external identity.** There is nowhere to record that this row is MusicBrainz recording `4d5a…`, or that its ISRC is `USWB19902312`. Without that, duplicate detection can only ever compare strings.
2. **`SongChart` has no provenance.** The single most important gap. See §9.
3. **No search provider layer**, and no outbound rate limiting or response caching to hang one on.
4. **Add Song is form-first.** `/songs/new` goes straight to a blank `SongForm`. It needs a search step in front — without removing the manual form, because a provider outage must not stop someone adding a song.

> **NOTED, NOT FIXED**
>
> `SongChart.songId` is `@unique`, so a song can hold exactly one chart. That blocks “alternate arrangements” eventually. It is not needed for this slice and unpicking it is a real migration, so I would leave it and revisit when arrangements are actually being built.
>
> `getDiscover` loads every `CatalogSong` with no `take` and scores them in memory. Fine at 60 rows, not fine at 10,000. Worth knowing before the shelf grows.

---

## 4. Recommended canonical chart representation

**Verdict: Recommend**

**Keep the SetMeister structured JSON as canonical. Treat ChordPro purely as an import and export format.** That is your third option, and it is the right one, but for a reason worth being explicit about.

ChordPro embeds chords inside the lyric string: `[G]Purple [D]rain`. One string, chords and words fused. Our format keeps them as two parallel rows. Musically these are equivalent; legally they are not. You asked in §2 for a system that can know a song without implying it can redistribute the lyrics. With paired rows, SetMeister renders a chords-only chart by dropping the lyric row — a one-line change at the renderer. With ChordPro as canonical, the same operation means parsing every line to pull the chords back out.

**The separation is a licensing feature, not just a formatting choice.** That decides it.

### Everything else you listed is reachable from here

| Capability | How it lands |
| --- | --- |
| Transposition | A pure function over the `chords` string. Lyrics never touched. |
| Nashville numbers | The same function with a different output alphabet, given the key. |
| Capo suggestions | Derived — find the capo position giving the most open shapes. |
| Sections | Already there, with a nine-value type enum. |
| Bars / measures | Additive field on the line object. `sections` is `Json`, so no migration. |
| Per-chord confidence, alternates | Same — additive inside the JSON, no migration. This is what makes AutoChart cheap to add later. |
| Print / PDF, mobile view | Renderers over the same tree. Both routes already exist. |
| Alternate arrangements | The one thing that needs schema work, because of the 1:1 constraint. Deferred. |

No change to the chart format is required for the first slice.

---

## 5. Recommended provider abstraction

**Verdict: Recommend**

Mirror `StorageAdapter` so there is one convention in the codebase, not two.

```ts
// src/lib/music/types.ts
export type ExternalSong = {
  provider:     string;   // "musicbrainz"
  externalId:   string;   // stable id at that provider
  title:        string;
  artist:       string;
  album?:       string;
  releaseYear?: number;
  durationMs?:  number;
  isrc?:        string;
  genres?:      Genre[];  // OUR enum, normalized
  defaultKey?:  string;   // only if legitimately available
  bpm?:         number;   // same
};

export type SongSearchProvider = {
  readonly name: string;
  search(q: string, o: { limit: number; signal?: AbortSignal })
    : Promise<ExternalSong[]>;
};
```

Plus `getSongSearch()` and `songSearchStatus()` alongside them, exactly parallel to `getStorage()` / `storageStatus()`, and a `MockSongSearchProvider` returning fixed results for tests and for any environment without credentials.

### Two boundaries worth naming

**Genres are normalized at the edge.** Providers return free-text tags — MusicBrainz alone has thousands. The adapter maps them onto our 19-value `Genre` enum and drops what does not map. Raw provider tags never reach the database. Otherwise the enum you just added in Phase C stops meaning anything.

**Key and BPM are optional in the type and empty in practice.** MusicBrainz does not carry them. Rather than guess, the first version leaves both blank for the user to fill in. A wrong BPM is worse than a missing one — it gets played.

---

## 6. Best legitimate metadata API for the first provider

**Verdict: MusicBrainz**

| Candidate | Verdict | Why |
| --- | --- | --- |
| **MusicBrainz** | **First** | Open, documented for third-party use, CC0 data, no key needed to start. Covers every genre you listed plus deep back-catalogue and obscure material that streaming search ranks badly. Returns title, artist, release, first-release date, duration, **ISRC**, and a stable MBID. |
| Spotify | **Not first** | `audio-features` and `audio-analysis` deprecated 27 Nov 2024; new apps get 403. Extended quota needs 250,000 MAU to apply. It cannot give us key or BPM, and it has a growth ceiling. |
| Deezer | **Second, later** | Public catalog endpoints need no auth and do return ISRC and BPM, which is genuinely attractive. Terms are written for Deezer-integrated apps and BPM coverage is uneven — worth adding behind the interface after a proper terms review, not as the foundation. |
| Apple Music | Later | Requires a paid Apple Developer account and JWT signing. Fine as a provider, heavy as a first one. |
| SongSelect / CCLI | Interface only | Not self-serve. Requires a commercial agreement. Build the seam, plug in when the paperwork exists. |

> **TWO MUSICBRAINZ CONSTRAINTS THAT SHAPE THE DESIGN**
>
> **One request per second, per IP**, and a meaningful `User-Agent` with contact details is mandatory — anonymous agents are throttled hard. So search must run *server-side*: the limit is per-IP, so browser-side calls would be per-user and would leak the identification obligation. That forces debouncing, a shared rate limiter, and a response cache — all of which §12 of your brief wanted anyway.
>
> **Commercial use is a paid supporter tier.** Free while non-commercial; MetaBrainz asks commercial users onto a plan, with the start-up (Bronze) tier at roughly $100–499/month. This is a business decision, not a technical blocker — but it should be on the record now rather than discovered at launch.

---

## 7. Required credentials and accounts

**For the first slice: none.** That is the main argument for MusicBrainz.

| Item | When | Detail |
| --- | --- | --- |
| MusicBrainz contact string | Now | One env var. Something like `SetMeister/1.0 ( https://setmeister.app; you@… )`. No API key, no signup. |
| MetaBrainz supporter tier | Before commercial launch | Not before this slice. Worth budgeting for. |
| `BLOB_READ_WRITE_TOKEN` | Already outstanding | Unrelated to this work, but still unset — chart PDFs and avatar photos do not upload in production. AutoChart audio would need it too. |
| Spotify client id / secret | Not needed | Only if Spotify is added later, and it would not carry key or BPM. |
| CCLI SongSelect agreement | Not needed | Commercial negotiation, not a signup. |
| AcoustID key | AutoChart only | Free, for audio fingerprinting. Far out. |

---

## 8. Proposed duplicate detection

**Verdict: Recommend**

Four tiers, and the difference between certain and probable drives the interface.

| Signal | Confidence | What happens |
| --- | --- | --- |
| `provider` + `externalId` already on a Song here | **Certain** | “Already in your library” — link straight to it. No add button. |
| ISRC match | **Certain** | Same. ISRC identifies a specific recording. |
| Normalized title + artist | **Probable** | “Looks like you already have this.” Show both. **Go to existing** or **Add anyway**. Never decided for them. |
| Anything weaker | — | Just add it. |

Normalizing means: lowercase, strip diacritics and punctuation, collapse whitespace, and drop the suffixes that make the same song look like four songs — `(Live)`, `(Radio Edit)`, `- Remastered 2011`, `feat. …`. That is the fiddly part and where the unit tests go.

**No stored normalized columns yet.** A workspace has tens of songs; loading them and comparing in memory is fine and avoids widening the migration. Revisit around a thousand songs per workspace.

> **EXISTING CONSTRAINT, WORTH KNOWING**
>
> `@@unique([churchId, title, artist])` already blocks exact string duplicates at the database level — but `artist` is nullable and Postgres treats NULLs as distinct, so two rows with the same title and no artist slip through. Not worth changing now; worth not being surprised by.

---

## 9. Proposed chart provenance model

**Verdict: Recommend**

Six fields on `SongChart`. I have tried to include only what is actually load-bearing.

| Field | Why it is necessary |
| --- | --- |
| `source` | The whole point. Enum, defaulted to `USER_CREATED` so every existing row is already correct without a backfill. |
| `sourceProvider` | Which licensor or provider. Needed the moment there is more than one. |
| `sourceRef` | Their id for the chart. Needed to re-fetch, to attribute, and to honour a takedown. |
| `sourceCapturedAt` | When we took it. Matters for licence terms and for “is this stale”. |
| `editedByUser` | Flips true on any edit after import. This is what lets the interface *stop* saying “AutoChart draft, unverified” once a human has been through it. |
| `confidence` | 0–1, AUTOCHART only. Drives whether we warn. |

### Deliberately left out

- **Per-chord confidence and alternate interpretations** — these belong inside the `sections` JSON, which is a `Json` column, so they cost no migration whenever AutoChart arrives.
- **Licensing / rights metadata blobs** — there is no licensed provider yet, so any shape I invented now would be a guess. Model it against real terms when real terms exist.

> **LYRICS — THE SHARPEST EDGE**
>
> `Song.lyrics` already exists and is user-entered. Rather than add a column to track its origin, the rule is simpler and safer: **no provider import ever writes `Song.lyrics`. Ever.** Enforce it in the import function and assert it in a test, so the guarantee is executable rather than documentary.

---

## 10. How CatalogSong fits long term

**Verdict: Keep, narrowed**

**Keep it, and narrow its job to curated editorial content.** Do not repurpose it, do not replace it with provider search, and above all do not write provider results into it.

- It is the only thing making Discover’s “Recommended for your church” work. The scoring reads `songTypes`, `themes`, `difficulty` and `popularity` against the workspace’s profile. Those are *editorial judgements*. No metadata API returns them, and no amount of provider search will.
- Its `@@unique([title, artist])` is global, across all tenants. Writing search results into it would create cross-tenant coupling and constraint collisions the first time two workspaces searched the same song.
- `Recommendation` holds a foreign key to it.

So the long-term shape is three genuinely different things, and the confusion only comes from two of them currently sharing a page:

- **CatalogSong — the curated shelf** — Small, editorial, hand-scored. Powers recommendations. Grows by our choice, not by user searches.
- **Provider search — the whole world** — On demand, cached briefly, never persisted wholesale.
- **Song — what a workspace owns** — Created only when someone actually adds something.

Discover then holds two surfaces: curated sections from the shelf, and “Search any song” from the providers. Your instinct in §10 — don’t import millions of rows — is preserved exactly.

---

## 11. AutoChart future architecture

**Verdict: Design only**

Your pipeline is right. Four structural points matter *now*, because they constrain what we build this month.

1. **AutoChart is a job, not a request.** Analysing a four-minute recording takes longer than a serverless function may run. It needs durable state — `QUEUED / RUNNING / READY / FAILED` — and a result the user comes back to. Designing it as a server action would be a dead end.
2. **Output lands in the same `sections` JSON as a hand-written chart**, with `source: AUTOCHART` and a confidence. One representation, one editor, one renderer, one print path. There is no separate “AutoChart editor” — the user reviews a machine draft in the editor they already know.
3. **Per-chord detail goes in the JSON, not in columns.** `lines[].chordSpans[]` holding `{ symbol, startMs, confidence, alternates[] }`. Because `sections` is already `Json`, that arrives with no migration at all.
4. **Audio rides the existing attachment path.** `AttachmentKind.AUDIO` already exists, and `assertUploadable` is already the gate. The authorized-input boundary is therefore the upload, which is the right place for it — we only ever analyse a file a user deliberately handed us.

> **BE HONEST ABOUT ACCURACY**
>
> Automatic chord recognition sits somewhere around 75–85% on straightforward diatonic pop and falls off badly on jazz, extended harmony and dense mixes. The interface must never present a result as settled. “AutoChart draft — check it before you play it”, with low-confidence chords visibly marked, and the warning disappearing once `editedByUser` flips.

Nothing here gets built now. The only obligation on the first slice is not to preclude it — and adding `AUTOCHART` to the source enum and `confidence` to the chart today means the day AutoChart lands, it needs no migration.

---

## 12. Copyright and licensing boundaries

**Verdict: Enforced rules**

| Material | Rule |
| --- | --- |
| Metadata — title, artist, album, year, duration, ISRC | Factual, safe. MusicBrainz data is CC0. |
| Lyrics | Never imported, from any provider. `Song.lyrics` stays user-entered only. |
| Cover art | Not fetched, not hotlinked. `CatalogSong.artworkSeed` already generates a deterministic gradient instead — keep that answer for provider results too. |
| Chord transcriptions | A chord *sequence* is thin copyright ground; someone’s published *transcription* is their work. No scraping Ultimate Guitar, Chordify, Songsterr, Musicnotes, SongSelect or lyrics sites. Licensed providers only, behind the interface. |
| Audio | Never fetched from YouTube or Spotify URLs. The existing `spotifyUrl` / `youtubeUrl` fields are links *out* and must stay that way. |
| Public domain | Different rules — may carry lyrics. `CatalogSong.isPublicDomain` already exists; extend the flag to `Song` when hymns need it. |

The general principle running through all of it: **SetMeister may know facts about a recording without possessing the recording or its words.** Metadata search and content acquisition stay separate systems, which is why §5 and §11 are different sections rather than one.

---

## 13. Exact additive schema changes

**Verdict: One migration**

Everything below is nullable or defaulted. No backfill, no data movement, no destructive statement.

```prisma
model Song {
  // … unchanged …
  externalProvider  String?    // "musicbrainz"
  externalId        String?    // the MBID
  isrc              String?
  releaseYear       Int?
  durationMs        Int?

  @@index([churchId, externalProvider, externalId])
  @@index([churchId, isrc])
}

enum ChartSource {
  USER_CREATED      // typed or pasted in the editor
  USER_IMPORTED     // a file the user supplied
  CHORDPRO
  AUTOCHART
  LICENSED_PROVIDER
  SONGSELECT
  OTHER
}

model SongChart {
  // … unchanged …
  source            ChartSource @default(USER_CREATED)
  sourceProvider    String?
  sourceRef         String?
  sourceCapturedAt  DateTime?
  editedByUser      Boolean     @default(false)
  confidence        Float?
}
```

**Explicitly not touched:**

- `CatalogSong` — nothing at all, including no `genres` field. Still deferred, as you asked.
- `SongChart.songId @unique` — alternate arrangements stay deferred.
- `Song.lyrics`, `@@unique([churchId, title, artist])`.
- Tenancy, invitations, RSVP, scheduling, setlists, `db-url.ts`, bootstrap safeguards. Untouched.

The two new indexes are on `Song`, which holds tens of rows per workspace in production today, so index creation is instant rather than a lock to worry about. As before, I would generate the migration, read the SQL, confirm it is `ALTER TABLE … ADD COLUMN`, `CREATE TYPE` and `CREATE INDEX` only, count production songs and sets, deploy, then count again.

---

## 14. Smallest first vertical slice

**Verdict: Build this**

Exactly what you sketched in §11 of your brief, and deliberately nothing beyond it.

1. `src/lib/music/` — `types.ts`, `musicbrainz.ts`, `mock.ts`, and an `index.ts` exposing `getSongSearch()` and `songSearchStatus()`.
2. Server-side search, rate limited to one request per second with a small in-memory cache keyed on the query. Provider failure returns an empty result and a message — it never throws into the page.
3. `/songs/new` becomes search-first: a search box on top, **enter details manually** underneath. The existing form stays exactly as it is.
4. `checkForDuplicate(ctx, external)` returning `{ kind: "exact" | "probable" | "none", song? }`.
5. `addSongFromExternal(ctx, external)` — metadata only, never lyrics, sets the external identifiers, leaves key and BPM blank.
6. Redirect to the existing song detail page, where **Add chords** already works.
7. The provenance schema lands in the same migration, and `upsertSongChart` starts writing `source: USER_CREATED` and `editedByUser: true`. Nothing reads it yet — it is there so AutoChart and licensed providers need no migration later.

**Explicitly not in the slice:** ChordPro, transposition, Nashville, AutoChart, audio, licensed chart providers, Discover changes, `CatalogSong.genres`.

### Tests that would go with it

- Provider contract, run against the mock.
- Normalization and duplicate tiers — the fiddly part: `(Live)`, `feat.`, diacritics, remaster suffixes.
- An assertion that import never writes `Song.lyrics`. This is the executable version of the §9 rule.
- Tenancy: a song added in workspace A is invisible from workspace B.
- Provider outage leaves the manual form working.

---

## 15. Recommended implementation sequence

**Slice 1 — next · Any Song foundation**
Provider abstraction, MusicBrainz, duplicate detection, search-first Add Song, provenance schema. Ends with: search “Purple Rain”, add it, land on the song page, add chords by hand.

**Slice 2 — Transposition**
The highest value per unit of work in the whole plan, and I would argue for it before any second provider. Pure functions over chart JSON that already exists — no new dependency, no legal surface, no migration. It also makes the set builder’s key dropdown mean something, which today it does not. Nashville and capo suggestions come with it.

**Slice 3 — ChordPro import / export**
A small adapter against the canonical format. Unlocks a real migration path for people arriving from other tools, which matters for adoption.

**Slice 4 — Second metadata provider**
Deezer or Apple Music behind the same interface, after a terms review. This is what proves the abstraction is honest rather than theoretical.

**Slice 5 — Licensed chart provider**
The chart-source interface plus one real integration, if and when a commercial agreement exists. Gated on paperwork, not engineering.

**Slice 6 — AutoChart**
Job queue, authorized audio upload only, output into the existing chart editor with confidence marking. The largest piece by a distance, and the one that benefits most from everything above already being in place.

> **ONE SCHEDULING NOTE**
>
> The MetaBrainz supporter tier needs settling before commercial launch, not before Slice 1 — but it is the kind of thing that is much cheaper to plan for now than to discover during a launch week.

---

## What I need from you before writing code

1. **MusicBrainz as the first provider**, accepting the one-request-per-second limit and the commercial-tier question later — or would you rather I build the interface plus mock only, and defer picking a provider?
2. **The additive migration in §13** — five fields on `Song`, six on `SongChart`, one new enum, two indexes.
3. **Slice 1 scope as written in §14**, with the manual Add Song form kept alongside the search.
4. **Transposition as Slice 2**, ahead of a second provider. This is the one place I would push back on the brief’s ordering — it is small, it is entirely ours, and it is the thing that makes a chart genuinely usable on a Sunday.
