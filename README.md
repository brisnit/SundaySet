# SetMeister

**AI-powered worship planning and team scheduling.**

> Plan months of worship in minutes.
> Build the set. Schedule the team. Get Sunday ready.

SetMeister helps worship leaders build sets from their church's *own* song
library, schedule musicians and tech, send invitations, track responses, and
plan weeks or months of Sundays at a time — with the AI proposing and the
worship leader approving.

---

## Status

MVP in progress. Milestones **M1–M3 complete**: foundation, data model, auth,
tenant-scoped data layer, and a fully seeded demo church.
See [CLAUDE_HANDOFF.md](./CLAUDE_HANDOFF.md) for architecture, decisions, and
what comes next.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL · Prisma 7 (via the `pg` driver adapter) |
| Auth | Auth.js v5 — email + password, and Resend magic links when configured |
| AI | Provider-agnostic; OpenAI default, Anthropic adapter alongside |
| Email | Resend |
| Files | Vercel Blob |
| Validation | Zod |
| Tests | Vitest |

## Local setup

Requires **Node 20.19+** (developed on 24).

```bash
git clone https://github.com/brisnit/SundaySet.git setmeister
cd setmeister
npm install
cp .env.example .env
```

> **Do not keep this project inside an iCloud-synced folder** (`~/Desktop` or
> `~/Documents` when Desktop & Documents sync is on). iCloud creates conflict
> copies of the files Next rewrites in `.next/`, which breaks typechecking, and
> its indexing of `node_modules` is a real source of stalls. The working copy
> lives at `~/Developer/SetMeister`.

### Database

Prisma 7 ships a local Postgres, so no Docker or signup is needed for development:

```bash
npx prisma dev --name setmeister     # leave running in its own terminal
```

It prints a `DATABASE_URL` and a `SHADOW_DATABASE_URL`. Copy both into `.env`
(also set `DIRECT_URL` to the same value as `DATABASE_URL`).

> **The ports change on each start.** If the app cannot connect, restart
> `prisma dev` and update `.env`.

For a hosted database (and for production), use Neon and set `DATABASE_URL` to
the **pooled** connection string and `DIRECT_URL` to the **direct** one —
migrations cannot run through a pooler.

Then:

```bash
npm run db:migrate     # apply migrations
npm run db:seed        # load the demo church
npm run dev
```

### Signing in

The seed creates a demo church, **Northminster Community Church**:

| Account | Password | Role |
|---|---|---|
| `britt@northminster.example` | `setmeister-demo` | Owner / worship leader |
| `mike@northminster.example` | `setmeister-demo` | Musician |

The sign-in form is pre-filled with the owner account.

## Commands

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | lint → typecheck → test → build (run before pushing) |
| `npx prisma dev --name setmeister` | Start the local Postgres (own terminal) |
| `npm test` | Vitest |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reseed the demo church |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and reseed |

## Environment variables

Full documented list in [`.env.example`](./.env.example). Required to boot:
`DATABASE_URL` and `AUTH_SECRET`. Everything else degrades gracefully — AI,
email and uploads switch themselves off with an explanation rather than
crashing, so the app is fully explorable with no third-party accounts.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection used by the app |
| `DIRECT_URL` | Direct connection, migrations only |
| `AUTH_SECRET` | Auth.js signing secret (`npx auth secret`) |
| `AI_PROVIDER` / `AI_MODEL` | `openai` (default) or `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI provider credentials |
| `RESEND_API_KEY` / `EMAIL_FROM` | Invitation email |
| `BLOB_READ_WRITE_TOKEN` | Chord chart PDF storage |
| `APP_URL` | Absolute base for invitation links |
| `INVITATION_TOKEN_SECRET` | Signs public accept/decline tokens |

## Architecture notes

**Tenant isolation.** Every church-owned row carries `churchId`. No `prisma.*`
call lives in `app/` — all reads go through `lib/data/*`, where each function
requires a `ChurchContext` and composes its filter from a single `scope()`
helper. Records are fetched with `findFirst({ id, churchId })`, never
`findUnique({ id })`, so another church's id is indistinguishable from a
nonexistent one. Both properties are covered by tests.

**AI proposes, the leader approves.** The eligible-song pool is computed in
code *before* the model is called; the model chooses and sequences within that
pool; the result is re-validated against every rule before anything is saved,
and always as a draft. Deterministic code owns repeat windows, blockout dates,
song counts and date maths. The model owns theme understanding, matching,
sequencing and explanation.

**Dates.** Services store a calendar `date` plus a local `"HH:mm"` time and the
church's timezone — not a UTC instant. A recurring 10:00 service must not drift
across daylight saving boundaries.

**Liturgical calendar.** Easter and every date derived from it are computed, not
seeded, so any future year can be planned with no data entry.

## Seed data

`npm run db:seed` builds a demo church with 60 songs (15 hymns), a full year of
weekly service history, 15 team members with blockout dates, and four upcoming
Sundays in a sermon series. The history is composed deliberately so the library
exercises every rotation state the product reports on — two genuinely overplayed
favourites, songs ready to return after months of rest, and new songs the
congregation has not learned yet.

## Known MVP limitations

- **Ask SetMeister is not wired up yet.** The library, usage history and
  constraint groundwork are in place; the conversational layer is the next
  milestone.
- **CCLI is not integrated.** Song records carry a `ccliNumber` field and there
  is an adapter seam for it, but no seeded numbers and no API — showing invented
  numbers would imply an integration that does not exist.
- **Discover uses seeded demo data.** Nothing is scraped. Spotify, Apple Music
  and YouTube links are modelled but not fetched.
- **Roster expectations are church-wide.** The "which positions are open" check
  uses one default list rather than a per-service-type template.
- **Chord charts are seeded for public-domain hymns only**, to avoid reproducing
  copyrighted lyrics.

## Deployment

Targets Vercel. `npm run build` runs `prisma generate` first, and `postinstall`
regenerates the client on install. Use a pooled `DATABASE_URL` at runtime and a
direct `DIRECT_URL` for `prisma migrate deploy`. Uploads go to Vercel Blob —
nothing is written to the local filesystem.

## Repository note

The GitHub repository is named `SundaySet`, the product's former name. This is
intentional and the repository will not be renamed.
