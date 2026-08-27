# SetMeister — Project Handoff

> **Read this first.** This document is the persistent memory for Claude Code sessions on
> this project. Update it at the end of every working session.

**Last updated:** 2026-08-26 (end of night)
**Status:** **Live in production with demo data.** All five MVP blocks complete.
**Repository:** `~/Developer/SetMeister` (moved out of iCloud — see §18)
**Production:** https://sunday-set-ten.vercel.app
**Commit:** `759a212` — local, `origin/main` and production all in sync
**Tests:** 339 passing, 18 files · `npm run verify` green

---

# NEXT SESSION — START HERE

## ⚠️ Tomorrow does NOT begin with feature development

The user was explicit. The order is:

1. **Read this handoff and verify production is healthy.**
2. **The user uses SetMeister themselves on the live site** — real hands, real phone.
3. **Capture the UX/workflow changes they want from that actual use.**
4. **Decide how to replace the demo Northminster data with their real church data,
   safely** — see §25 before touching anything.
5. Load their real songs and team.
6. Configure Vercel Blob so production chart PDFs work (§26).
7. Prepare one real upcoming service.
8. Run the full leader → invitation → Accept/Decline workflow with real data.
9. **Only after all of that**, decide what to build next.

Do not propose or start new features before step 9. If asked "what next?", the answer
is step 1.

## Restarting the local environment

```bash
# 1. Local Postgres — leave running in its own terminal.
cd ~/Developer/SetMeister
npx prisma dev --name setmeister

# 2. App, in a second terminal.
cd ~/Developer/SetMeister
npm run dev            # http://localhost:3000
```

Dependencies, the local database and its seeded data all survive a reboot. If
`prisma dev` prints different ports than 51214/51215, copy them into `.env`.

**The first page load after starting Postgres can 500** while pglite warms up
(Prisma `P1017`). Reload. Not a code fault — do not "fix" the data layer over it.

**Never run `next build` or `next typegen` while a dev server is running** — concurrent
writers corrupt `.next/types`.

## Demo login (local and production)

| Account | Password | Role |
|---|---|---|
| `britt@northminster.example` | `setmeister-demo` | Owner / worship leader |
| `mike@northminster.example` | `setmeister-demo` | Musician |

## Verifying production quickly

```bash
curl -s https://sunday-set-ten.vercel.app/api/auth/csrf     # expect a csrfToken JSON
npx vercel ls sunday-set                                    # expect newest ● Ready
```

A JSON body of `{"message":"There was a problem with the server configuration..."}`
means an Auth.js config assertion failed — see §16 and §23, not a credentials problem.

---

## 1. Product

**SetMeister** — AI-powered worship planning and team scheduling.

- **Value proposition:** Plan months of worship in minutes.
- **Core promise:** Build the set. Schedule the team. Get Sunday ready.
- **AI assistant name:** *Ask SetMeister*

### Naming rules (IMPORTANT)
The product was formerly called **SundaySet**. It is now **SetMeister** everywhere:
copy, navigation, metadata, emails, AI assistant labels, seed content, docs, page
titles, application name, branding.

**Exception:** the GitHub repository stays `brisnit/SundaySet`. Do **not** rename or
recreate it. Expect the mismatch between the repo name (`SundaySet`) and the local
directory (`SetMeister`) — this is intentional.

### The one idea the MVP must prove
A worship leader asks SetMeister to plan several weeks of worship, and SetMeister
generates appropriate sets **from that church's own song library**, respecting song
history, style, sermon themes, holidays, and team availability.

### Product principles
1. Save time immediately.
2. The church's song library is the source of truth.
3. **AI proposes; the worship leader approves.**
4. Scheduling rules are deterministic wherever possible.
5. Know what the church actually sings — don't just recommend popular worship music.
6. Musicians need almost no training.
7. Don't clone Planning Center. Win on simplicity and intelligent planning.

---

## 2. Current state of the repository

Inspected 2026-08-24.

| Fact | Value |
|---|---|
| Remote | `https://github.com/brisnit/SundaySet.git` |
| Remote refs | **none** — remote is still an empty repository (nothing pushed yet) |
| Local dir | `/Users/briztheman/Developer/SetMeister` (moved out of iCloud 2026-08-24) |
| Local state | branch `main`, Next.js 16 app scaffolded, schema migrated |
| Prior work found | **None.** Greenfield build. |

### What exists and passes (`npm run verify` — 58 tests, all green)
**M1 Foundation** — Next.js 16.3.2 / React 19.2.8 / TS strict / Tailwind v4, `@/*` alias,
Zod env contract with graceful feature degradation, pooled Prisma client, design tokens,
app shell with sidebar + mobile bottom nav.

**M2 Data & auth** — 30-model schema migrated (`20260824214610_init`). Auth.js v5 with
password + optional Resend magic link, `proxy.ts` route guard, `requireChurchContext()`,
role/permission matrix, tenant-scoped `lib/data` repositories.

**M3 Seed** — Northminster Community Church: 60 songs (15 hymns), 52 weeks of service
history, 15 team members with blockouts, 4 upcoming Sundays in a sermon series.

**Pages rendering real data:** `/` `/login` `/home` `/plan` `/songs` `/team` `/messages`
`/settings` `/ask`. Sign-in verified end to end against the running production build.

**Tests (58):** liturgical calendar (17) · song usage intelligence (14) · role matrix (12)
· tenant scoping via recording stub (7) · cross-tenant isolation against real data (8).

### Local toolchain
| Tool | Status |
|---|---|
| node | v24.16.0 |
| npm | 11.13.0 |
| git | 2.50.1 |
| pnpm | not installed → **use npm** |
| gh CLI | not installed → git over HTTPS; user handles GitHub auth |
| psql / docker | **not installed** → no local Postgres. Requires a hosted dev DB (see §9) |

---

## 3. Proposed technical architecture

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript `strict` | Server Components by default |
| Styling | Tailwind CSS v4 | |
| Components | shadcn/ui (Radix primitives) | Accessible dialogs/menus for WCAG AA |
| DB | PostgreSQL — **Neon** (decided) | Serverless, branchable, native to Vercel |
| ORM | Prisma | `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations) |
| Auth | Auth.js v5 + Prisma adapter | **Credentials AND Resend magic link** (both — decided) |
| AI | Internal provider abstraction | **OpenAI is the default**; Anthropic adapter also built. `AI_PROVIDER` switches. |
| Email | Resend + React Email | |
| File storage | Vercel Blob behind a storage adapter | **No local filesystem persistence** |
| Validation | Zod (v4) | Forms, server actions, AI output |
| Drag & drop | dnd-kit | Has keyboard sensors — required for a11y |
| Dates | date-fns + tz support | See §9 decision D5 |
| Tests | Vitest | Business logic first |

### Layering
```
app/            routes, server components, server actions (thin)
components/     UI (ui/ = shadcn primitives, feature dirs alongside)
lib/
  auth/         Auth.js config, session helpers, requireChurchContext()
  data/         repository layer — ALL db access; every fn takes ChurchContext
  domain/       pure business logic (constraints, rotation, usage, liturgical) — unit tested
  ai/           provider abstraction, context assembly, schemas, validation, repair
  email/        Resend client + templates
  storage/      blob adapter
  integrations/ CCLI / Spotify / Apple / YouTube adapter INTERFACES (stubs, clearly unimplemented)
prisma/         schema.prisma, migrations, seed.ts
tests/          vitest
```

**Hard rule:** no `prisma.*` calls inside `app/`. Everything goes through `lib/data/*`,
which requires a `ChurchContext` and always filters on `churchId`. This is how tenant
isolation is enforced and made testable.

### Tenancy & authorization
- Every church-owned row carries `churchId`.
- `requireChurchContext()` resolves `{ user, church, membership, role }` server-side on
  every authed request; throws/redirects otherwise.
- Authorization is checked server-side in the data/action layer. UI hiding is never the
  control. Add a test that asserts cross-church reads return nothing.
- Public token routes (`/r/[token]`, `/a/[token]`) are the only unauthenticated data
  paths. Tokens: 32 random bytes, **only the hash stored**, single-purpose, expiring.

---

## 4. Proposed database schema

Prisma. Names are the intended model names.

### Auth & tenancy
- `User` — id, email, name, image, emailVerified, passwordHash?
- `Account`, `Session`, `VerificationToken` — Auth.js
- `Church` — name, slug, logoUrl, timezone, createdAt
- `Membership` — userId, churchId, `role`, status · unique(userId, churchId)
- `WorshipProfile` — 1:1 Church · styles[], songsPerService, setStructure[],
  hymnPreference, repeatWindowWeeks, preferredArtists[], avoidArtists[], avoidSongs[],
  difficulty, vocalRangeNote

`Role` enum: `OWNER | ADMIN | WORSHIP_LEADER | TEAM_LEADER | MUSICIAN | TECH | PASTOR`

### Songs (two-tier — this matters)
- **`CatalogSong`** — global, seeded. Powers **Discover** and onboarding song picking.
  title, artist, ccliNumber, defaultKey, bpm, tempoCategory, songTypes[], themes[],
  difficulty, artworkRef, spotifyUrl, appleMusicUrl, youtubeUrl, popularity, source.
- **`Song`** — **church-scoped repertoire** (the "My Songs" record; spec's `ChurchSong`).
  churchId, catalogSongId?, title, artist, ccliNumber, defaultKey, churchKey,
  alternateKeys[], bpm, tempoCategory, songTypes[], themes[], difficulty,
  leadVocalistPreference, lyrics, notes, links, `familiarity`, `status`, addedAt,
  lastPlayedOn (denormalized for sort).
- `SongChart` — songId, format `PLAIN|STRUCTURED`, key, capo, `sections Json`, bodyText.
  Structured shape: `[{ label, type, lines: [{ chords, lyrics }] }]` so **transposition
  can be added later without a migration**.
- `SongAttachment` — songId, kind, url, filename, mimeType, sizeBytes, uploadedById.
- `SongUsage` — churchId, songId, serviceId, playedOn, key. **The history ledger** driving
  repeat protection and rotation health.

Enums: `SongType` (UPBEAT, MID_TEMPO, REFLECTIVE, HYMN, COMMUNION, EASTER, CHRISTMAS,
ADVENT, RESPONSE, BAPTISM, PRAYER, OFFERING), `Familiarity` (NEW, LEARNING, FAMILIAR,
CORE, RETIRED), `Difficulty` (SIMPLE, MODERATE, ADVANCED).

`songTypes` is a controlled enum array; `themes` is `String[]` against a suggested
vocabulary. Both get GIN indexes. Rationale: keeps AI context compact and search fast;
a join table buys normalization we don't need at MVP scale.

### Planning
- `ServiceType` — churchId, name, dayOfWeek, defaultStartTime, defaultCallTime, active
- `Service` — churchId, serviceTypeId?, `date @db.Date`, startTime, callTime, title,
  notes, `status`, specialDateId?, createdById, publishedAt, aiPlanRunId?
- `Sermon` — 1:1 Service · title, scripture, series, description, notes, inferredThemes[]
- `ServiceSong` — serviceId, songId, position, key, notes, addedByAi, aiReason ·
  unique(serviceId, position)
- `SpecialDate` — churchId?, date, name, `kind`, isGlobal, recurrence

`ServiceStatus`: `DRAFT | READY | INVITATIONS_SENT | CONFIRMED | COMPLETED`

**Liturgical dates are computed in code**, not seeded — `lib/domain/liturgical.ts`
derives Easter (Meeus/Jones/Butcher) and from it Palm Sunday, Good Friday, Pentecost,
Advent, etc. for any year. `SpecialDate` rows store only church-created events
(Communion, Baptism, Youth Sunday, custom). This is what makes "plan my entire year"
work for any future year with no data entry.

### Team
- `TeamMember` — churchId, **userId? (nullable — a musician needs no account)**, name,
  email, phone, avatarUrl, vocalRange, preferredFrequencyPerMonth, preferredServiceTypeId,
  notes, active
- `Position` — churchId, name, category `WORSHIP|TECH|OTHER`, sortOrder (seeded + custom)
- `TeamMemberPosition` — teamMemberId, positionId (capabilities; one person, many roles)
- `Assignment` — serviceId, teamMemberId, positionId, `status`, callTime?, notes,
  respondedAt, createdByAi
- `Invitation` — assignmentId, tokenHash, expiresAt, sentAt, respondedAt, channel,
  providerMessageId
- `BlockoutDate` — teamMemberId, startDate, endDate, note
- `AvailabilityRequest` / `AvailabilityResponse` — periodStart/End; per-date
  `AVAILABLE|UNAVAILABLE|MAYBE`

`AssignmentStatus`: `PENDING | INVITED | ACCEPTED | DECLINED | CANCELLED`

### AI, messaging, recommendations
- `AiConversation` — churchId, userId, contextType `GLOBAL|SERVICE|SONG|SCHEDULE`, contextId
- `AiMessage` — conversationId, role, content, model, tokensIn/Out
- `AiPlanRun` — churchId, userId, kind `SET|MULTI_WEEK|TEAM`, requestJson, responseJson,
  warnings, status. **Audit trail** so every AI-created draft traces to its proposal.
- `Message` — churchId, kind, subject, recipient, serviceId?, status, providerId, sentAt
- `Recommendation` — churchId, catalogSongId, kind `HOT_NEW|SIMILAR|FOR_YOU`, score, reasons

---

## 5. Proposed route structure

```
(marketing)  /                          landing
             /login  /signup

(onboarding) /onboarding/church         name, leader, email, tz, service time, # services
             /onboarding/style          worship style profile
             /onboarding/songs          fast catalog picker → "+ Add to My Songs"
             /onboarding/team           optional roster seed

(app)        /home                      "What's happening Sunday?" + alerts
             /plan                      calendar — ?view=week|month|list
             /plan/new
             /plan/ai                   Plan With AI (multi-week)
             /plan/[serviceId]          set builder + team + sermon
             /plan/[serviceId]/print
             /songs                     My Songs: search, filters, list
             /songs/new
             /songs/[songId]            detail + usage intelligence
             /songs/[songId]/chart      chart editor
             /songs/[songId]/chart/print  print-friendly → PDF
             /songs/discover            Discover (seeded/demo data, labeled)
             /team                      roster
             /team/[memberId]
             /messages                  invitations / responses / availability
             /ask                       Ask SetMeister (global chat)
             /settings/church|worship|services|team|integrations|notifications|account

(musician)   /my/schedule               mobile-first
             /my/services/[serviceId]   set, keys, charts, listen links, notes
             /my/availability           "I'm Unavailable"

(public)     /r/[token]                 invitation accept / decline — NO ACCOUNT NEEDED
             /a/[token]                 availability response — NO ACCOUNT NEEDED

api/         /api/auth/[...nextauth]
             /api/ai/chat|set|plan|team    streaming
             /api/uploads                  Blob upload token
             /api/webhooks/resend
```

Mutations use **Server Actions**. API routes are reserved for AI streaming, uploads,
webhooks, and public token endpoints.

---

## 6. AI architecture

### The central design decision
**Compute the legal pool in code; let the model choose and sequence within it.**

```
1. lib/domain/constraints.ts  → eligible songs (repeat window, retired, blockouts,
                                 familiarity caps, hymn availability)   [deterministic]
2. lib/ai/context.ts          → compact structured context from that pool
3. provider.completeStructured(zodSchema)                                [probabilistic]
4. lib/ai/validate.ts         → re-check EVERY rule against the DB       [deterministic]
5. lib/ai/repair.ts           → one retry with violations fed back;
                                 then deterministic fill + surfaced warnings
6. Persist as DRAFT services. Never auto-publish.
```

This is what makes *"never silently violate rules"* true by construction rather than by
prompt instruction.

### Division of labor
| Deterministic code | AI |
|---|---|
| blocked dates, repeat windows, duplicate detection | sermon-theme understanding |
| required song count, hymn requirement | song↔theme matching |
| scheduling conflicts, rotation fairness | set sequencing / flow |
| date & liturgical calculations | explaining recommendations |
| invitation status, required team roles | conversational requests |
| tenant scoping | subjective musical judgment |

### Context budget
Songs are reduced to ~60 tokens each (`id, title, artist, types, themes, familiarity,
key, bpm, lastPlayed, uses90d, difficulty`). A 300-song library ≈ 18k tokens. Pre-filter
to a shortlist before prompting so multi-week runs stay affordable.

### Multi-week generation
One structured call across the whole date range (so cross-week repeat avoidance is
coherent), with per-service repair. Output validated against:
song exists · song belongs to this church · no prohibited repeats · correct count ·
hymn requirement · valid service dates · valid IDs.

### Never
- Invent songs not in the library unless explicitly asked. If an outside song is
  suggested, it is labeled **"Not currently in your library"**.
- Trust model output before Zod + domain validation.
- Publish anything. AI produces **drafts** only.

### Error messaging
Constraint failures must be human. Not `Generation failed`, but:
> SetMeister couldn't create a set because your library has only 2 hymns and an 8-week
> plan with one hymn per week needs 8 unique hymns.

…followed by real actions: *Add more hymns* · *Allow hymn repeats* · *Generate without
the hymn requirement*.

---

## 7. Implementation sequence

Each milestone = one meaningful commit. Lint, typecheck, tests, and production build
must pass before any push.

| # | Milestone | Contents |
|---|---|---|
| M1 | Foundation | Next.js + TS + Tailwind + shadcn, lint/format, Vitest, `.env.example`, app shell & nav (Home, Plan, Songs, Team, Messages, Ask SetMeister ✨) |
| M2 | Data & auth | Full Prisma schema, first migration, Auth.js, `requireChurchContext()`, `lib/data` repo layer, tenant-isolation tests |
| M3 | Seed | Northminster Community Church, leader Britt, ~22 songs w/ tags, historical `SongUsage`, team + blockouts, 2 completed + 4 upcoming Sundays, catalog for Discover |
| M4 | Songs | CRUD, search/filter, usage intelligence (Fresh→Overplayed→Ready to Return), chart editor, PDF upload via Blob, print view, Discover + Hot New Song |
| M5 | Planning | Calendar (week/month/list), service CRUD, manual set builder with dnd-kit reorder, sermon metadata, liturgical engine + special dates |
| M6 | Team | Roster, positions, fast multi-select scheduling, blockout dates, invitations + email, public accept/decline tokens, organizer notifications |
| M7 | AI | Provider abstraction, constraint engine, Ask SetMeister chat, single-set generation, multi-week planner, bulk draft save, contextual shortcuts |
| M8 | Polish & ship | Home dashboard + alerts, musician mobile view, Messages center, settings, empty/loading/error states, a11y + responsive QA, README, Vercel readiness |

**Onboarding** is built across M2 (church/style) and M4 (song picker).

### Demo workflow that must work end-to-end
> "Plan the next eight Sundays. Four songs each week, one hymn each Sunday, three
> contemporary songs, no repeats during the eight weeks, and consider sermon themes."

→ analyze library → check history → check hymn tags → consider sermon themes →
8 draft sets → explain any constraint it could not satisfy → **save all eight at once**.

---

## 8. Testing focus

Business logic before UI:
- repeat-window protection · AI result validation (valid + adversarial payloads)
- service song limits · blockout-date conflict detection · rotation fairness
- invitation token generation/validation/expiry · **cross-tenant access denial**
- liturgical date computation (verify Easter across several years)

---

## 9. Open decisions & technical risks

Blocking decisions were resolved on 2026-08-24 and are marked ✅ below.

| ID | Decision | Recommendation | Why it matters |
|---|---|---|---|
| **D1** | Dev/prod database host | ✅ **RESOLVED — Neon** | Needs `DATABASE_URL` (pooled) + `DIRECT_URL` (direct, for migrations). No local Postgres/Docker on this machine. |
| **D2** | Auth method | ✅ **RESOLVED — both** | Email+password (bcrypt) so the seeded demo logs in with zero email config, **plus** Resend magic link. |
| **D3** | AI provider | ✅ **RESOLVED — OpenAI default** | `AI_PROVIDER=openai`. Anthropic adapter built alongside so the default can flip via env with no code change. |
| **D4** | File storage | Vercel Blob behind an adapter | Serverless has no writable FS. |
| **D5** | Date/time model | Store `date` as DATE + `startTime` as local `"10:00"` + church timezone | Storing a UTC instant causes DST bugs for recurring services. **Very expensive to change later.** |
| D6 | Seed content & copyright | Seed titles/artists/CCLI numbers (facts) freely. **Do not seed lyrics or chord charts of copyrighted songs** — public-domain hymns only; placeholder structures elsewhere. | Real legal exposure. |
| D7 | Discover / artwork | Seeded demo data, clearly labeled. Generated gradient placeholders, **no scraping**. | Spec forbids unauthorized scraping. |
| D8 | CCLI | Adapter interface only, visibly unimplemented | Must not imply an official integration that isn't configured. |
| D9 | Musician access | Token links for respond + read-only schedule; account only for full `/my` | Spec: no account required to accept/decline. |
| D10 | Vercel function duration | Stream responses; set `maxDuration` on AI routes | Multi-week generation can exceed the default limit. |
| D11 | Prisma on Vercel | `postinstall: prisma generate`, pooled URL for runtime, direct URL for migrations | Common Vercel deploy failure. |
| D12 | Package manager | **npm** | pnpm not installed. |

### Additional risks
- **AI context growth** — large libraries inflate cost; mitigated by pre-filtering (§6).
- **Denormalized play counts** — derive from `SongUsage` via indexed aggregate; keep only
  `lastPlayedOn` denormalized for sorting, recomputed on usage write.
- **Drag & drop a11y** — dnd-kit keyboard sensors plus explicit "Move up / Move down"
  controls. Required for WCAG AA.
- **Email deliverability** — Resend needs a verified domain before real invitations send.

---

## 10. Environment variables

Full list lives in `.env.example` (created in M1). Vercel needs:

```
DATABASE_URL            # pooled Postgres
DIRECT_URL              # direct, for migrations
AUTH_SECRET
AUTH_URL / NEXTAUTH_URL
AI_PROVIDER             # anthropic | openai
ANTHROPIC_API_KEY       # or OPENAI_API_KEY / OPENAI_BASE_URL
AI_MODEL
RESEND_API_KEY
EMAIL_FROM
BLOB_READ_WRITE_TOKEN
APP_URL                 # absolute base for invitation links
INVITATION_TOKEN_SECRET
```

Never hard-code credentials. Secrets live only in `.env` / Vercel env vars.

---

## 11. Working agreements

- Repo stays `brisnit/SundaySet`. Never rename or recreate it.
- Clean commits at milestone boundaries. **No force pushing.**
- Before any push: `lint` → `typecheck` → `test` → `build`. Fix errors; never bypass.
- Commit or push only when the user asks.
- Product copy always says **SetMeister**.

---

## 12. Session log

| Date | Session | Outcome |
|---|---|---|
| 2026-08-24 | 1 | Inspected repo (empty), verified toolchain, produced architecture / schema / routes / sequence / risks. Created this document. |
| 2026-08-24 | 1 | Decisions resolved: Neon (D1), password + magic link (D2), OpenAI default (D3), phase-boundary reviews. |
| 2026-08-24 | 1 | **M1 complete**: scaffold, tooling, env contract, db client, liturgical domain + tests. **M2 schema written and migrated.** Verify green. |
| 2026-08-26 | 7 | **Deployed to production.** Neon provisioned, migrations + guarded bootstrap in the build, `db-url.ts` fallback, two empty-value bugs fixed. Live and verified at https://sunday-set-ten.vercel.app. Handoff rewritten for a fresh session. |
| 2026-08-26 | 6 | **Blocks 1–5 complete**: service CRUD, setlist builder, team CRUD, assignments with advisory conflicts, invitations + public RSVP. 103 → 339 tests. |
| 2026-08-24 | 5 | Moved the project out of iCloud-synced `~/Desktop` to `~/Developer/SetMeister`; removed the `* 2.*` workarounds; made `typecheck` run `next typegen` first. Shutdown checkpoint written. **M5 not started.** |
| 2026-08-24 | 4 | **M4 Songs complete**: CRUD, URL-driven search/filter/sort, song detail with play history, chord chart editor + print view, PDF upload behind a storage adapter, Discover with scored recommendations. See §17. |
| 2026-08-24 | 3 | Fixed sign-in failure: malformed `authjs.callback-url` cookie + `AUTH_URL` pinned to port 3000. See §16. Verify green (71 tests). |
| 2026-08-24 | 2 | Pushed `main` to GitHub. **M2 complete**: Auth.js, roles, repositories, scoping + isolation tests. **M3 complete**: 60-song seed with a year of history. App shell and read-only pages built so the product can be reviewed. Verify green (58 tests). |

<!-- Append a row per session. Keep §2 and §9 current — they are what a future session reads first. -->


---

## 13. Stack facts verified in this repo (NOT from training data)

Both Next.js and Prisma here are **newer than the model's training cutoff**. These
were confirmed by reading the bundled docs and the installed type definitions. Do not
substitute remembered APIs for what is written below.

### Next.js 16.3.2
| Fact | Detail |
|---|---|
| `middleware.ts` is now **`proxy.ts`** | Export a function named `proxy`. **Node.js runtime only** — `edge` is not supported in `proxy`. Auth.js docs still say `middleware`; use `proxy`. |
| Request APIs are **async only** | `cookies()`, `headers()`, `draftMode()`, and `params` / `searchParams` must be awaited. Synchronous access was removed, not just deprecated. |
| Typed route props | Run `npx next typegen` to get global `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext`. The scaffold's `layout.tsx` uses `LayoutProps`, so typecheck fails until typegen has run at least once. |
| Turbopack is the default | For both `next dev` and `next build`. |
| ESLint | `eslint-config-next` exports **flat config** from `eslint-config-next/core-web-vitals` and `/typescript`. Using `FlatCompat` with them throws a circular-JSON error. `next lint` is removed; the script is plain `eslint`. |
| Caching | `revalidateTag(tag, profile)` now takes **two** args. `updateTag(tag)` gives read-your-writes in Server Actions; `refresh()` refreshes the client router. `cacheLife` / `cacheTag` are stable (no `unstable_` prefix). |
| Do **not** set `cacheComponents` | It replaces the removed `experimental.dynamicIO` / `useCache`, and enabling it forces the Cache Components model and errors on uncached data outside `<Suspense>`. We are not adopting it. |
| Parallel routes | Now require a `default.js`. |

### Prisma 7.9.1
| Fact | Detail |
|---|---|
| Generator is `prisma-client` | Not `prisma-client-js`, and it **requires an explicit `output`**. Ours emits TypeScript to `src/generated/prisma` (gitignored; rebuilt by the `postinstall` hook). |
| Import path | `import { PrismaClient } from "@/generated/prisma/client"` — **not** `@prisma/client`. |
| `datasource` block has no `url` | The connection lives in `prisma.config.ts`. |
| A **driver adapter is mandatory** | Query compiler is enabled by default. Postgres uses `@prisma/adapter-pg` + `pg`. (There is no Neon-specific adapter in the supported table; `adapter-pg` talks to Neon fine.) |
| No `directUrl` | Prisma 7's config datasource accepts only `url` and `shadowDatabaseUrl`. So: `prisma.config.ts` gets the **direct** URL (CLI/migrations only), and `src/lib/db.ts` builds the **pooled** runtime connection from `DATABASE_URL`. |
| Seeding | Configured as `migrations.seed` in `prisma.config.ts`, not `package.json`. |
| `migrate dev` has no `--skip-seed` | The flag does not exist in v7. |

### Local development database
`npx prisma dev --name setmeister` starts a **local Postgres with no Docker and no
signup** — this is what unblocked M2/M3 before Neon was provisioned. It prints a
`DATABASE_URL` and a separate `SHADOW_DATABASE_URL`.

> **Ports are assigned dynamically on each start.** If the app cannot connect, restart
> `prisma dev` and update the URLs in `.env`. Current values were `51214` (main) and
> `51215` (shadow).

This makes Neon strictly a **production** requirement rather than a prerequisite for
local work — see D1.

### Dependency notes
- **`@react-email/components` is deprecated on npm.** Removed. Email templates are
  hand-written table-based HTML passed to Resend's `html` field — better deliverability
  and one less abandoned dependency.
- **`deepmerge-ts` advisory (GHSA-ggr8-5vv4-36mx)** reaches us only through
  `@prisma/config`, a dev-time CLI dependency. npm's suggested "fix" downgrades Prisma
  two majors. Resolved instead with a `package.json` override pinning `deepmerge-ts` to
  `^8.0.2`. **`npm audit` is clean — keep it that way.**
- `create-next-app` **rejects the capitalized directory name** `SetMeister` (npm package
  names cannot contain capitals). The app was scaffolded into a lowercase temp subdir
  and hoisted. `package.json` name is `setmeister`.


---

## 14. Decisions made while building M2 / M3

| Decision | Rationale |
|---|---|
| **Session establishes identity only; church + role are re-read from the DB per request** | A JWT is never trusted for authorization, so revoking a membership takes effect immediately rather than at token expiry. `getChurchContext()` is wrapped in React `cache` to dedupe within a request. |
| **`proxy.ts` is a UX redirect, not a security boundary** | It checks cookie *presence*, not validity. Every page and action calls `requireChurchContext()` / `requirePermission()` independently. Do not move authorization into it. |
| **`findFirst({ id, churchId })`, never `findUnique({ id })`** | Looking a row up by primary key and checking ownership afterwards is the classic cross-tenant leak. A test asserts no bare-id `findUnique` reaches the database. |
| **Two tenancy test layers** | `tenant-scoping.test.ts` uses a recording stub and runs everywhere including CI with no database. `tenant-isolation.test.ts` exercises real rows and skips loudly when no database is reachable. |
| **Seed history is composed, not random** | The first attempt spread plays evenly across all 60 songs, so nothing was ever Overplayed or Never-played and the usage feature had nothing to show. History is now deliberately shaped: two overused favourites, a tight mid rotation, a rested set, and new songs never sung. |
| **Per-pool cursors in the seed** | Indexing a pool by week number skips most of a large pool, which left CORE songs marked "never played" — a data contradiction. Cursors guarantee even traversal. |
| **Missing-chart alert counts only upcoming songs** | A library-wide count read "56 songs have no chord chart", which is true but not actionable. Nobody chases a chart for a song they are not about to play. |
| **CCLI numbers deliberately absent from seed** | Fabricated numbers would look like a working integration (D8). The field and adapter seam exist; the data does not. |
| **Charts seeded for public-domain hymns only** | D6. Reproducing copyrighted lyrics at scale is genuine legal exposure. |

### Gotcha worth remembering
Historical weeks are counted as **negative** offsets, and JavaScript's `%` keeps the
sign — `w % 3 === 2` is never true for negative `w`. This silently dropped two songs
from the entire seeded history. Count forward from the oldest week (`const k = -w`)
before taking a modulus.

---

## 15. Next up — M4 (Songs) — SUPERSEDED, kept for history; see §24 and §27

Current pages are read-only. M4 adds:
song CRUD and the add-song flow · search, filters and sort wired to the existing
`SongFilters` · song detail with full usage history · the chord chart editor and
print view · PDF upload through Vercel Blob · Discover and the Hot New Song card
(seeded `CatalogSong` rows and `DISCOVER_EXTRAS` are already in the database).

Still outstanding from earlier decisions: onboarding flow (D2 wiring exists, screens
do not), Neon provisioning for production, and the `OPENAI_API_KEY` needed to test
M7 end to end.


---

## 16. Sign-in failure — root cause and fix (session 3)

**Symptom.** After submitting the login form the browser showed raw JSON:
`{"message":"There was a problem with the server configuration. Check the server logs for more information."}`

**Root cause.** Auth.js validates the `authjs.callback-url` cookie in
`assertConfig`, which runs *before* anything else. If the value is not a valid
absolute http(s) URL or a root-relative path, it returns
`InvalidCallbackUrl` — and for a non-GET request it answers with a raw JSON 500
**regardless of `pages.error`**, so the configured error page never applies
(`@auth/core/index.js`, the `htmlPages` branch). The cookie then persists, so
every later attempt fails identically. Browsers scope cookies by host and
**ignore the port**, so a stale cookie from any other localhost project poisons
sign-in here.

Reproduced exactly with:
`POST /api/auth/callback/password` + `Cookie: authjs.callback-url=not-a-url`.

**Contributing misconfiguration (ours).** `.env` pinned
`AUTH_URL="http://localhost:3000"`. Auth.js then builds callback URLs against
that fixed origin no matter which port Next actually bound — so running on any
other port (very easy, since a stray server holding 3000 pushes `next dev` to
3001) sent users to the wrong origin after sign-in.

**Fixes**
| Change | File |
|---|---|
| Clear an unusable `authjs.callback-url` cookie on any matched request, making the failure self-healing instead of a permanent dead end | `src/proxy.ts` |
| Pure validator mirroring `@auth/core`'s `isValidHttpUrl`, covering both plain and `__Secure-` cookie names | `src/lib/auth/callback-url.ts` |
| `AUTH_URL` removed from `.env`; commented in `.env.example` with an explanation. With `trustHost: true` Auth.js infers the origin per request, so any port works | `.env`, `.env.example` |
| Login page renders `?error=` in plain language rather than leaving it invisible | `src/app/login/page.tsx` |
| 13 regression tests | `tests/callback-url.test.ts` |

**Do not reintroduce `AUTH_URL` for local development.** Set it only for a fixed
production domain.

**If sign-in ever returns that JSON again:** it is a cookie or config assertion,
not a credentials problem. Check the server log for the `[auth][error]` line —
an unreachable database surfaces as `CallbackRouteError` and is handled
gracefully with a friendly message, which is a different failure.


---

## 17. M4 — Songs

**Shipped**
| Area | Notes |
|---|---|
| CRUD | `/songs/new`, `/songs/[id]`, `/songs/[id]/edit`; retire (reversible, keeps history) vs delete |
| Search & filters | State lives in the URL, so a filtered library is shareable and the list stays server-rendered |
| Song detail | Rotation verdict, 90-day and YTD counts, full play history |
| Chord charts | Sectioned editor storing `{label, type, lines:[{chords, lyrics}]}`; pasted "chords over lyrics" text is parsed into that shape so transposition can be added without a migration |
| Print view | Its own `(print)` route group — no nav, no chrome. Browser Print-to-PDF is the MVP export |
| PDF upload | `lib/storage` adapter: Vercel Blob in production, local disk in development only |
| Discover | Scored against the church's own library and profile, with a Hot New Song card |

**Design decisions**
- **`scoreCandidate` is pure and dependency-free.** The MVP signal is the church's own
  library, not general popularity (popularity is capped at 20 of 100). Real music
  intelligence becomes another weighted term without callers changing. An avoid-list
  entry is an absolute veto, not a penalty.
- **Discover artwork is generated from the title hash.** Nothing is scraped or hotlinked.
- **Writes use `updateMany`/`deleteMany` with a scoped `where`**, never `update`/`delete`,
  which demand a unique selector and would key on a bare id. A wrong id affects zero rows.
  Tested in both directions.
- **`SongChart` has no `churchId`.** `upsertSongChart` proves ownership of the parent song
  through a scoped `findFirst` first; a test asserts the chart is never written when that
  lookup misses.
- **Print lives outside `(app)`** so it inherits no shell. Pages there still call
  `requireChurchContext()`, so dropping the layout drops no authorization.

**Environment gotchas found**
| Problem | Resolution |
|---|---|
| **`~/Desktop` is symlinked into iCloud Drive.** iCloud created `"routes.d 2.ts"` conflict copies of `.next/types/*`, breaking typecheck, and its indexing drove load average past 40 | `* 2.*` excluded in `tsconfig`, `eslint` and `prettier`. **The real fix is on the user's machine** — exclude this project (or at least `.next` and `node_modules`) from iCloud sync |
| Test suite flaked ~1 run in 3 with Postgres `08P01` | Parallel Vitest workers interleaved queries on one shared Prisma connection. `fileParallelism: false`; suite still runs in ~1.5s |
| Never run `next build`/`typegen` while a server is running | Concurrent writes to `.next` multiply the iCloud conflict copies |

**Still open:** onboarding screens, Neon for production, `OPENAI_API_KEY` for M7.


---

## 18. Move out of iCloud Drive (session 5)

`~/Desktop` is symlinked into iCloud Drive, so the whole project was being synced.
iCloud created conflict copies (`routes.d 2.ts`) of the rapidly-rewritten
`.next/types/*` files, which broke typecheck, and its indexing drove load average
past 40 — one `tsc` run blocked for over five minutes on I/O.

**Moved** `~/Desktop/Websites/SetMeister` → **`~/Developer/SetMeister`**
(`~/Developer` is not synced; only Desktop and Documents are).

| Check | Result |
|---|---|
| Files copied | 384 = 384 (artifacts excluded and rebuilt) |
| Git history | 4 commits, `git fsck` clean, remote and tracking intact |
| Database | Unaffected — `prisma dev` stores data globally under `~/Library/Application Support/prisma-dev-nodejs/setmeister/`, keyed by `--name`, not by project path. 60 songs / 56 services / 208 usage rows verified present |
| Dependencies | Reinstalled with `npm ci` |
| `npm run verify` | Green: lint, typecheck, 103 tests, production build |
| App | Runs, signs in, all routes 200 |

**Workarounds removed** now that the root cause is gone: the `* 2.*` exclusions in
`tsconfig.json`, `eslint.config.mjs` and `.prettierignore`. Verification still passes
without them.

**Kept**, because they were never about iCloud: the `.uploads` exclusions, and
`fileParallelism: false` in the Vitest config.

**Found during the move:** a fresh clone could not typecheck, because
`PageProps`/`LayoutProps`/`RouteContext` live in `.next/types`, which is gitignored.
`typecheck` now runs `next typegen` first.

The original copy at `~/Desktop/Websites/SetMeister` was left in place for the user
to delete.


---

## 19. Block 2 — setlist builder

Add, remove, reorder (Up/Down), and re-key songs on `/plan/[serviceId]`, plus a
searchable picker over the church's active library.

**Two schema facts drove the design**
- `@@unique([serviceId, songId])` — the schema already forbids a song appearing
  twice in one service, so duplicates are prevented rather than allowed. A
  `DuplicateSongError` maps to an inline message, and the picker hides songs
  already in the set.
- `@@unique([serviceId, position])` — checked per statement, so reordering cannot
  simply swap two rows. `renumber()` parks every row in a negative slot inside a
  transaction, then writes final 1..n positions. Removal renumbers the same way,
  so positions never develop holes.

**Tenancy.** `ServiceSong` has no `churchId`; every query reaches the tenant
through `service: scope(ctx)`, the pattern `SongAttachment` already used. Adding a
song re-checks that *both* the service and the song belong to the caller.

**Tests** — 25 in `tests/setlist.test.ts` plus 2 new tenancy assertions. The scoping
guard was verified non-vacuous by temporarily unscoping `setServiceSongKey`, which
made it fail as intended.


---

## 20. Block 3 — team members

`/team/new`, `/team/[teamMemberId]` (a profile, not a form) and `.../edit`.

**Fields** come straight from the existing `TeamMember` model: name, email, phone,
vocalRange, notes, active, `preferredPerMonth`, `preferredServiceTypeId`, plus
positions through `TeamMemberPosition`. Positions are read from the `Position`
table, never hardcoded.

**`userId` stays null.** Being on the roster never creates or requires an account;
a test asserts this in both create and read.

**Position sync writes only the difference** (add/remove), so existing join rows keep
their `priority`, which the scheduler will use to break ties. `TeamMemberPosition`
has no `churchId`, so it is written only after the parent member resolves
church-scoped, and every position id is re-checked against the church first.

**Permission is `team:manage`** — currently OWNER and ADMIN only. Worship leaders and
team leaders can view the roster but not edit it. If a worship leader should be able
to add people, that is a one-line change to the matrix in `lib/auth/roles.ts`, but it
was not changed unilaterally.

### Bug found and fixed: optional form fields rejected `null`

`formData.get()` returns `null` for a field that is **absent**, and `""` for one that
is present but empty. Both mean "left blank", but `z.string().optional()` only accepts
`undefined`, so an absent field failed with `Invalid input: expected string, received
null` — wrong, and unreadable for the user.

The same pattern existed in the **service and song** schemas, so all three now share
`lib/validation/form.ts` (`blankToUndefined`, `optionalFormText`, `optionalFormId`).
Note that in Zod 4 a bare `z.unknown()` still requires the key to be present; coerced
numeric fields need an explicit `.optional()` before `.transform()`.

Regression tests cover the null case for both the team and service schemas.

> **Testing note.** curl's `-F` interprets metacharacters in values, which made a
> phone number like `(555) 987-6543` look like an application error. Use
> `--form-string` when smoke-testing form actions.


---

## 21. Block 4 — team assignments

Assign, replace and remove people per position on `/plan/[serviceId]`.

### Schema finding: positions are not tied to services
`Position` relates only to `Church`, `TeamMemberPosition` and `Assignment`. There is
**no model for "positions required for this service or service type"**. As
pre-authorised, the scheduler lists the church's own active positions rather than
inventing a `ServiceTypePosition` join. If per-service-type templates are wanted
later ("Sunday needs 8 roles, Wednesday needs 3"), that is a new model and a
migration — flagged, not built.

### What the schema does allow
`@@unique([serviceId, teamMemberId, positionId])` means a person **can** hold several
positions in one service, and a position **can** hold several people. Only the exact
triple is forbidden. Both are covered by tests.

### Conflicts warn, never veto
`lib/domain/scheduling.ts` is pure and returns advisory conflicts:
`BLOCKED_OUT`, `DECLINED_THIS_SERVICE`, `INACTIVE` (severity *conflict*);
`ALREADY_IN_SERVICE`, `NOT_QUALIFIED`, `OVER_COMMITTED` (severity *caution*).

Nobody is ever removed from the candidate list for a conflict — a blocked-out person
appears with "Unavailable Sep 5 – Sep 12 (Holiday)" beside their name. Hiding them
would leave the leader wondering where they went. Conflicts are **recomputed on read**,
so a blockout added after the assignment still surfaces on the service page.

The only hard constraint is the database one, surfaced as `DuplicateAssignmentError`.

### Performance
The page ships one candidate pool and the picker evaluates conflicts per position in
the browser using the same `findConflicts`. Opening the picker for any of 13 positions
costs no round trip, so a whole Sunday can be staffed without waiting.

### Status
New assignments are created at the schema default **`PENDING`**, surfaced as "Not
invited yet". Block 5 moves them to `INVITED`. Reassigning resets to `PENDING` and
clears `respondedAt`, because an acceptance belonged to the person being replaced.

### Permission
Gated on **`team:schedule`** (OWNER, ADMIN, WORSHIP_LEADER, TEAM_LEADER) — distinct
from `team:manage`, which edits the roster and is OWNER/ADMIN only.


---

## 22. Block 5 — invite links and public RSVP

`Copy invite link` on `/plan/[serviceId]`, and a public `/r/[token]` RSVP page that
needs no account.

### Tokens
32 bytes of CSPRNG output, base64url. Only an **HMAC-SHA256 digest** is stored
(`INVITATION_TOKEN_SECRET`, falling back to `AUTH_SECRET`), so a dump of the
Invitation table yields no working links and precomputation is useless. The raw token
is returned exactly once, at generation, and is never readable again.

Tokens carry no church, service or member identifier — nothing is readable off the URL,
and lookup is by digest only, so a token can never be pointed at another tenant.
Malformed input is rejected by shape before it costs a query, and malformed,
unknown and revoked tokens all return the **same** generic page: whether a token ever
existed is not disclosed.

Expiry is **absolute at service date + 2 days**, so inviting months ahead is fine and
the link dies once it stops being useful.

> Changing `INVITATION_TOKEN_SECRET` invalidates every outstanding link.

### Multiple positions — how it was handled without a migration
`Invitation.assignmentId` is `@unique`, so the schema models one invitation **per
assignment**, not per person-per-service. A musician on two positions therefore has two
assignments.

Rather than migrate, `inviteMemberToService` issues an invitation for **every** position
that person holds and surfaces **one** link. Any of their tokens resolves to the same
page, which lists all their positions and answers for **all of them at once** — one
link, one decision, no RSVP-per-role. Keeping a row per assignment also means removing
one position does not kill the links belonging to the others.

**If a schema change is ever wanted**, the honest shape is an invitation keyed on
(serviceId, teamMemberId) rather than assignmentId. Not needed for the field test.

### Charts for people with no account
`/songs/**` requires a login, so chart links would have been dead for musicians.
`/r/[token]/chart/[songId]` serves the chart under the same token and **only for songs
in that service's setlist**, so a token cannot read the wider library.

### Product decisions
- **No decline reason.** There is no field for one. `Assignment.notes` is the planner's
  own field and overloading it would clobber their notes. A dedicated field is the
  right answer if this is wanted.
- **Responses can be changed** while the link is valid. Nothing in the schema prevents
  it, and forcing a musician to phone the leader to correct a mistap helps nobody.
- **Reissuing a link does not erase an existing answer**; revoking returns the
  assignment to `PENDING`.
- Status summary across positions: any decline wins, otherwise all-accepted, otherwise
  awaiting.


---

## 23. Production deployment

**Live:** https://sunday-set-ten.vercel.app · Vercel project `sunday-set`
(team `britt-midgettes-projects`), auto-deploying from `main` on every push.
**Database:** Neon `neon-beige-lighthouse` (`neondb`), provisioned through the
Vercel Marketplace integration.

### The database URL is resolved, not copied
The Neon integration injects `NEON_DATABASE_URL` / `NEON_DATABASE_URL_UNPOOLED`
(prefixed, because `DATABASE_URL` already existed at the time), and marks every
value **Sensitive** — so the values cannot be read back and copied into
`DATABASE_URL` by hand, by anyone.

`src/lib/db-url.ts` therefore accepts any of the names a Postgres provider is
likely to set, in priority order, treating an empty string as unset. The empty
`DATABASE_URL` / `DIRECT_URL` placeholders were deleted. **Nothing needs to be
kept in sync by hand.** If you later want the plain names, just set them — they
take priority.

### Deploys migrate and bootstrap themselves
`build` is `prisma generate && prisma migrate deploy && tsx prisma/bootstrap.ts
&& next build`. Migrations apply before the app serves, and the deploy fails
loudly if the database is unreachable rather than shipping against a missing
schema. `prisma/bootstrap.ts` seeds demo data **only when the database contains
no churches at all** — the seed itself deletes and recreates Northminster, which
would destroy real work on every deploy.

### Two bugs this surfaced, both now fixed
1. **`AUTH_SECRET` was empty**, so every auth request returned the same
   `assertConfig` JSON 500 as §16. Real secrets are now set for production and
   preview.
2. **`AI_PROVIDER=""` and `OPENAI_BASE_URL=""`** made the env schema reject an
   empty enum option and an empty URL, 500ing every request that read config.
   Blank values are now stripped before validation (`src/lib/env.ts`), so
   defaults and optionals apply. Same lesson as the FormData `null` fix in §20:
   *present but empty means unset.*

`AUTH_URL` is deliberately **not set** — pinning it to one origin is the §16 bug,
and `trustHost` lets Auth.js infer the origin, which also keeps preview
deployments working.

### Verified against the live site
Sign-in · all authed pages · seeded data · service detail with setlist and team ·
invite link generation (correct host) · public `/r/[token]` with **no cookies** ·
decline → leader sees "Declined" → re-accept.

### Known production gaps
- **`BLOB_READ_WRITE_TOKEN` is empty**, so chart PDF uploads refuse in
  production — by design, rather than writing to a disk that vanishes.
  Provision Vercel Blob to enable them.
- No email: `RESEND_API_KEY` was removed so no dead magic-link option appears.
  Invite links are copied and pasted by hand, as intended.
- Production currently holds **demo data**. Replacing it with the real church is
  a separate step.

> **Action ids differ per build.** When smoke-testing a server action over HTTP
> against production, read the id from the deployed client chunk
> (`createServerReference("<id>",…,"<name>")`) — a local build's ids will not match.


---

## 24. Completed on 2026-08-26

Five blocks, plus the production deployment. Every one verified with `npm run verify`
and exercised over real HTTP before being committed.

| Block | Commit | What shipped |
|---|---|---|
| 1 — Service create/edit/detail | `213a815` | `/plan/new`, `/plan/[serviceId]`, `.../edit`. Sermon on the same form (1:1 relation); clearing every sermon field deletes the row rather than leaving an empty one for the AI planner to read as a theme. Date parsed to UTC midnight, never a local instant. |
| 2 — Setlist builder | `2d90f08` | Add/remove/reorder/re-key on the service page, searchable picker. `renumber()` parks rows in negative slots inside a transaction because `@@unique([serviceId, position])` is checked per statement. Duplicates refused — `@@unique([serviceId, songId])` already forbids them. |
| 3 — Team member CRUD | `a919e76` | `/team/new`, profile page, edit. Positions read from the `Position` table, never hardcoded; sync writes only the difference so join rows keep their scheduler `priority`. `userId` stays null — the roster never requires an account. |
| 4 — Service team scheduling | `25077f6` | Assign / replace / remove per position. One person may hold several positions and a position several people, because the unique triple allows it. |
| 4 — Scheduling warnings | `25077f6` | `lib/domain/scheduling.ts`: blocked-out, declined, inactive (hard); already-in-service, not-qualified, over-committed (soft). **Advisory only — nobody is ever hidden or blocked.** Recomputed on read, so a blockout added later still surfaces. |
| 5 — Invitations + public RSVP | `2dcb9ec` | Copy-invite-link, `/r/[token]` with no account, Accept/Decline, `/r/[token]/chart/[songId]`. |
| Deployment | `6dc9adb` → `759a212` | Neon provisioned, migrations and bootstrap in the build, two empty-value bugs fixed, live and verified. |

### Bugs found and fixed today
1. **Optional form fields rejected `null`** (§20). `formData.get()` returns `null` for an
   absent field but `z.string().optional()` only accepts `undefined`. Affected the team,
   service **and** song schemas; all three now share `lib/validation/form.ts`.
2. **Empty environment variables rejected as invalid** (§23). `AI_PROVIDER=""` and
   `OPENAI_BASE_URL=""` 500'd every request that read config. Blanks are now stripped
   before validation.
3. **`AUTH_SECRET` was empty in production**, producing the §16 `assertConfig` JSON 500.

Both #1 and #2 are the same lesson: **present but empty means unset.** Keep it in mind
whenever adding a field that can legitimately be blank.

---

## 25. ⚠️ Production data safety — read before touching the database

### Production currently contains DEMO DATA
`https://sunday-set-ten.vercel.app` holds the seeded **Northminster Community Church**
demo: 60 songs, 15 team members, 56 services, invented people and history.

**This is not real church data.** Do not present it as such, do not build reporting on
it, and do not assume any row in it is meaningful. Replacing it with the user's real
Northminster data is an explicit, planned step (tomorrow, item 4) — and it needs a
deliberate decision about *how*, not an improvised wipe.

### The bootstrap seed must NEVER overwrite real data
`prisma/bootstrap.ts` runs on **every deploy**, before `next build`.

`prisma/seed.ts` **deletes and recreates** the Northminster church, its users and its
catalog songs. Run unguarded against a live database that is being used, it would
destroy real work every time anyone pushed.

The guard is therefore deliberately blunt:

```ts
const churches = await db.church.count();
if (churches > 0) return;   // leave it completely alone
```

**Rules for anyone changing this:**
- The guard is **"no churches at all"**, not "no demo church". Narrowing it to
  "delete the demo church only" reintroduces the danger, because the real church may
  end up on the same slug or the seed may be pointed at it.
- **Never** add a `--force`, `RESET_DB`, or "reseed on deploy" switch to the build.
  A destructive operation must not be reachable from an automated pipeline.
- Replacing production data is a **manual, one-off, reviewed** operation — not
  something a `git push` can trigger.
- If seeding real data, prefer **adding** to an empty database over deleting from a
  populated one.

### Britt Hollis test invitation
A **live invitation token exists in production** for Britt Hollis on the 30 Aug service,
created while verifying the flow end to end. It expires **1 Sep 2026** (service date + 2
days). Her assignment status was restored to `ACCEPTED` afterwards.

It is harmless — it points only at demo data — but it is a real bearer credential.
**Revoke it** from the service page (Team → Revoke) whenever convenient, or simply let
it expire. Revoking resets that assignment to `PENDING`, which is why it was left in
place rather than cleaned up automatically.

---

## 26. `db-url.ts` — do not undo this

`src/lib/db-url.ts` resolves the Postgres connection strings from **whichever variable
names the provider actually sets**, in priority order, treating an empty string as unset.

### Why it exists
Vercel's Neon integration injects `NEON_DATABASE_URL` and
`NEON_DATABASE_URL_UNPOOLED` — prefixed, because a `DATABASE_URL` variable already
existed when the integration was added — and marks every value **Sensitive**. Sensitive
values **cannot be read back**: `vercel env pull` returns the literal string
`[SENSITIVE]`. There is therefore no way to copy them into `DATABASE_URL` by hand
without going to the Neon dashboard, and doing so would create a second copy of a
secret that silently drifts when Neon rotates credentials.

### How it works
| Purpose | Names tried, in order |
|---|---|
| Pooled (the running app) | `DATABASE_URL` → `NEON_DATABASE_URL` → `POSTGRES_PRISMA_URL` → `NEON_POSTGRES_PRISMA_URL` → `POSTGRES_URL` → `NEON_POSTGRES_URL` |
| Direct (migrations) | `DIRECT_URL` → `NEON_DATABASE_URL_UNPOOLED` → `POSTGRES_URL_NON_POOLING` → `NEON_POSTGRES_URL_NON_POOLING`, falling back to the pooled URL |

Used by `prisma.config.ts` (CLI/migrations), `src/lib/db.ts` (runtime) and
`prisma/seed.ts`. It has **no imports**, because `prisma.config.ts` loads it outside the
Next.js runtime.

### Rules
- **`DATABASE_URL` still wins if set.** Local `.env` sets it, so local behaviour is
  unchanged. Setting the plain names in Vercel later would also just work.
- **Empty counts as unset.** A variable can exist with no value; `??` would return `""`.
- **Do not "simplify" this back to `process.env.DATABASE_URL`.** That is what was there
  before, and it is why the first production deploy failed with
  `Error: Connection url is empty`.
- The empty `DATABASE_URL` / `DIRECT_URL` placeholders were **deleted** from Vercel. Do
  not recreate them empty — an empty value is skipped, but a wrong one would win.

---

## 27. Outstanding — known remaining MVP work

**Do not start any of this without being asked.** Recorded so nothing is lost.

### Blocking a real-data field test
| Item | Note |
|---|---|
| **Vercel Blob not configured** | `BLOB_READ_WRITE_TOKEN` is empty in production, so **chart PDF uploads do not work there**. The storage adapter refuses in production rather than writing to a filesystem that vanishes — deliberate, not a bug. Development uses a local-disk fallback (`.uploads/`, gitignored). Provision Vercel Blob and set the token to enable it. |
| **Real church data not loaded** | See §25. Needs the user's song list and team roster. |
| **Bulk song entry** | No import path. Entering 40+ songs through the UI is slow; a one-off setup script was offered and not yet written. |

### Deferred features (never started)
- **Ask SetMeister / all AI** — placeholder page only. No AI calls anywhere. The
  architecture in §6 (compute the legal pool in code, validate after) still stands.
- **Email delivery** — no Resend. `RESEND_API_KEY` was deliberately removed from
  production so no dead magic-link option appears on the login page. Invite links are
  copied and pasted by hand, as intended. A verified sending domain takes DNS time.
- **Messages centre** — placeholder page.
- **Musician accounts / `/my/schedule`** — musicians respond by token only.
- **Availability requests and blockout self-service** — blockouts exist in the schema
  and are read by the conflict engine, but there is no UI to create them.
- **Onboarding screens** — the seed stands in for them.
- **Drag-and-drop setlist reordering** — `dnd-kit` is installed; Up/Down buttons ship
  today and are keyboard-accessible.
- **CCLI / Spotify / Apple / YouTube** — fields and adapter seams only, no integrations.
- **Discover** runs on a seeded catalogue; nothing is fetched or scraped.

### Product questions raised and left open
- **Positions are not tied to services.** `Position` has no relation to `Service` or
  `ServiceType`, so the scheduler lists all the church's active positions. Per-service-type
  templates ("Sunday needs 8 roles, Wednesday needs 3") would be a **new model and a
  migration** (§21).
- **Invitations are per-assignment**, not per person-per-service (§22). Handled without a
  migration; the honest long-term shape is keying on `(serviceId, teamMemberId)`.
- **`team:manage` is OWNER/ADMIN only** — worship leaders can view but not edit the
  roster. One line in `lib/auth/roles.ts` if that should change.
- **No decline reason** — no field exists and `Assignment.notes` belongs to the planner.
- **No hard delete for team members** — deactivate only, to preserve assignment history.
- **Multiple people per position** is allowed because the schema allows it.

## 28. Account settings (commit `127d11d`)

`/settings` is now the account page, not just a workspace readout.

**Editable:** name, phone, monogram colour, optional photo. **Read-only, on
purpose:** role and email, each shown with the reason.

- Role lives on `Membership`. A self-service role field would be privilege
  escalation — a MUSICIAN could make themselves OWNER. Role changes belong in
  member management, behind `members:manage`.
- Email is the sign-in identifier; changing it needs a verification round-trip.

**The monogram colour exists because blob storage is not configured.** An
account can change how it looks with no file storage at all. The photo upload
form only renders when `storageStatus().available` is true, and production
currently shows "Photo uploads need file storage configured" instead. Wiring
`BLOB_READ_WRITE_TOKEN` turns it on with no code change.

**Files:** `src/lib/validation/account.ts` (palette + schema),
`src/lib/data/account.ts`, `src/app/(app)/settings/actions.ts`,
`src/components/account/account-form.tsx`, `src/components/ui/avatar.tsx`.

**Invariant, tested in `tests/account.test.ts`:** no function in
`lib/data/account.ts` accepts a user id. They all resolve `ctx.userId`, so one
account can never edit another. A test asserts that across two workspaces.

`ChurchContext.user` now carries `avatarColor`, so the sidebar and mobile
header render the chosen icon via the shared `Avatar`.

**Migration `20260827030027_account_profile_fields`** — additive only: two
nullable columns (`avatarColor`, `phone`) on `User`. Applied to production by
the Vercel build; 60 songs and 13 sets verified intact afterwards.

### Also in this commit

- Card icons (Setlist, Details, Team, Blockouts) use the primary colour.
- **Fixed a dead button.** Both "Add team member" controls set a `picking`
  state that nothing rendered, so clicking did nothing and a set with no team
  had no way to get one. The two-step chooser now renders outside the slot
  list — it has to, because a slot only exists once somebody is in it.

### Testing server actions with curl

A `useActionState` action cannot be invoked by posting its `$ACTION_ID`. It
needs the progressive-enhancement fields exactly as rendered: `$ACTION_REF_n`,
`$ACTION_n:0`, `$ACTION_n:1`, `$ACTION_KEY`. Posting the bare action id returns
303 or "Connection closed." and writes nothing — which looks like a product bug
and is not. Scrape the hidden inputs from the page first. Also use
`--form-string`, not `-F`: `-F` mangles parentheses in phone numbers.
