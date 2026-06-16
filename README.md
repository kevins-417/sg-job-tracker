# Singapore Job Application Tracker

A job-search command centre for the Singapore market: track applications across
local portals, manage a Kanban pipeline, log interviews, and — the part a
generic tracker skips — see how your applications stack up against Employment
Pass thresholds and local salary benchmarks.

Stack: **Vite + React + TypeScript** frontend, **Express + PostgreSQL** backend,
organised as an npm-workspaces monorepo.

---

## Features

- **Dashboard** — KPI cards, applications-by-month, source-portal breakdown, upcoming actions.
- **Applications** — drag-and-drop Kanban board *and* a sortable table, with status/portal filters and global search.
- **Companies** — per-company profiles with applied/open/contacts stats.
- **Interviews** — upcoming vs. past rounds with meeting links.
- **Analytics** — conversion funnel, best-performing portals, resume performance.
- **Auto-apply** — search profiles, daily + manual match refresh, tailored cover letters, and a paginated review queue; applied jobs stay listed (greyed) and aren't re-suggested. See [Auto-apply](#auto-apply-prepare-and-review-queue) below.
- **SG Market Insights** — EP-eligibility counts, salary-vs-benchmark gauges, portal response rates.

Light/dark mode throughout. Sample data is seeded so every screen is populated on first run.

---

## Project layout

```
sg-job-tracker/
├── client/            # Vite + React + TypeScript frontend
│   └── src/
│       ├── pages/     # one file per view (Dashboard, Applications, …)
│       ├── components/# shared UI primitives + form/drawer
│       └── lib/       # types, constants, the typed API client
├── server/            # Express + Postgres API
│   └── src/
│       ├── db/        # pool, schema.sql, migrate, seed, row mappers
│       ├── repositories/  # all SQL lives here
│       ├── routes.ts  # REST endpoints
│       └── validators.ts  # Zod request schemas
├── Dockerfile         # single-image build (API serves the built client)
├── docker-compose.yml # app + Postgres, with one-shot migrate+seed
└── render.yaml        # one-click cloud deploy (Render)
```

---

## Run locally (without Docker)

**Prerequisites:** Node 20+, and a PostgreSQL database you can reach.

1. **Install dependencies** (installs both workspaces):
   ```bash
   npm install
   ```

2. **Configure environment.** Copy the template and edit if needed:
   ```bash
   cp .env.example .env
   ```
   The default `DATABASE_URL` points at `postgresql://sgjt:sgjt@localhost:5432/sgjt`.
   Create that database/user, or point the URL at your own.

3. **Create the schema and seed sample data:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start both servers** (API on :4000, frontend on :5173):
   ```bash
   npm run dev
   ```
   Open **http://localhost:5173**. The Vite dev server proxies `/api` to the
   backend, so there's nothing else to configure.

---

## Run locally with Docker

One command brings up Postgres, runs migrate + seed, and serves the app:

```bash
docker compose up --build
```

Open **http://localhost:4000** (in the Docker setup the API serves the built
frontend from the same port).

---

## Deploy to the cloud

You asked whether this can run in the cloud — yes. Two common shapes:

### Option A — One service (simplest)

The Express server serves the built frontend, so you deploy a **single web
service** plus a managed Postgres. A [`render.yaml`](./render.yaml) blueprint is
included for [Render](https://render.com):

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo. It provisions a free
   Postgres and a web service automatically.
3. After the first deploy, open the service **Shell** and run once:
   ```bash
   node server/dist/db/migrate.js && node server/dist/db/seed.js
   ```

The same pattern works on **Railway** or **Fly.io**: build with
`npm run build`, start with `node server/dist/index.js`, set `DATABASE_URL` and
`PGSSL=true`, and run the migrate/seed commands once.

### Option B — Split frontend and backend

Host the API on Render/Railway and the static frontend on Vercel/Netlify:

- Backend: same as above.
- Frontend: build command `npm --workspace client run build`, output
  `client/dist`. Set `VITE_API_BASE` to your API origin
  (e.g. `https://sgjt-api.onrender.com`) and set `CORS_ORIGIN` on the backend to
  your frontend URL.

### Managed Postgres

Free tiers that work out of the box (all need `PGSSL=true`):
[Neon](https://neon.tech), [Supabase](https://supabase.com),
or the Render/Railway built-in Postgres. Paste their connection string into
`DATABASE_URL`.

---

## Environment variables

| Variable        | Purpose                                                        | Local default |
|-----------------|----------------------------------------------------------------|---------------|
| `DATABASE_URL`  | Postgres connection string                                     | `postgresql://sgjt:sgjt@localhost:5432/sgjt` |
| `PGSSL`         | `true` if your DB requires SSL (Neon, Supabase, Render, …)      | `false` |
| `PORT`          | API port                                                       | `4000` |
| `CORS_ORIGIN`   | Allowed frontend origin(s), comma-separated                    | `http://localhost:5173` |
| `VITE_API_BASE` | API origin for the frontend; empty uses the dev proxy/same-origin | *(empty)* |

---

## API

Base path `/api`. All bodies are JSON.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/applications` | List all applications |
| GET | `/applications/:id` | One application |
| POST | `/applications` | Create |
| PUT | `/applications/:id` | Update |
| DELETE | `/applications/:id` | Delete |
| GET | `/companies` | List companies |
| POST | `/companies` | Create / update (upsert) |
| DELETE | `/companies/:id` | Delete |
| GET | `/resumes` | List resumes |
| GET | `/profiles` | List search profiles |
| POST | `/profiles` | Create / update a profile |
| DELETE | `/profiles/:id` | Delete a profile (rules are kept, detached) |
| GET | `/auto-apply/rules` | List matching rules (optionally `?profileId=`) |
| POST | `/auto-apply/rules` | Create / update a rule |
| DELETE | `/auto-apply/rules/:id` | Delete a rule |
| POST | `/auto-apply/rules/:id/run` | Refresh one rule (scan + prepare) |
| POST | `/auto-apply/refresh` | Refresh all enabled rules (the "Refresh now" button) |
| GET | `/auto-apply/queue` | Paginated review queue (`?page=&pageSize=&profileId=`) |
| GET | `/auto-apply/applied` | Paginated applied feed (`?page=&pageSize=`) |
| GET | `/auto-apply/attempts` | Full activity log |
| PUT | `/auto-apply/attempts/:id/cover` | Edit a prepared cover letter |
| POST | `/auto-apply/attempts/:id/submit` | Mark submitted-by-user; creates a tracked application |
| POST | `/auto-apply/attempts/:id/dismiss` | Remove an item from the queue |
| GET | `/health` | Health check |

---

## Auto-apply (prepare-and-review queue)

This is **not** silent auto-submission, and that's deliberate. Software that
logs into MyCareersFuture, LinkedIn, JobStreet, etc. as you and fires off
applications violates every one of those portals' terms of service and gets
real accounts banned — LinkedIn in particular detects and suspends for it. It
would also attach your name to applications you never saw. So this build does
the part that actually saves time — reading postings, judging fit, and
tailoring materials — and leaves the final click to you.

**How it works:**

1. You create a **matching rule**: target job titles, key skills /
   responsibilities, industries, a salary floor, preferred work arrangement
   (on-site / hybrid / remote), locations, minimum experience, which résumé to
   attach, and an optional cover-letter style note.
2. Running the rule scans available jobs and, for each strong match, **prepares
   a ready-to-go application**: a fit score (0–100), the specific reasons it
   matched, and a **tailored cover letter** woven from the matched skills and
   the company/role.
3. The matches land in a **review queue**, ranked by fit. You read each one,
   edit the cover letter if you like, then either **Submit** or **Dismiss**.
4. **Submit** opens the job posting in a new tab so *you* apply on the portal,
   and records the application in your tracker (status `Applied`, with a
   timeline note). It never sends anything to the portal itself.

A salary floor acts as a hard gate (jobs paying below it are dropped entirely);
every other criterion contributes weighted points toward the fit score, and
criteria you leave blank simply don't count.

The job feed here is a **sample**. Wiring a real one is the Phase 2 integration
and is intentionally left out — replace the `MOCK_FEED` in
`server/src/repositories/autoApply.ts` with a real, ToS-compliant source when
you're ready. The cover-letter generator is deterministic and template-based
(no external API); swap in an LLM call there if you want richer letters.

### Refresh, profiles, applied-job handling, and pagination

- **Search profiles.** Group separate searches (e.g. "Senior PM — Fintech" vs
  "Product Lead — Govtech"), each with its own rules. Switch profiles from the
  bar at the top of the Auto-apply page; the queue and rules filter to match.
- **Daily + manual refresh.** Enabled rules with auto-refresh on are re-scanned
  automatically every 24 hours (on server boot and via a timer), and you can
  force a refresh anytime with **Refresh now**. Each rule records its last
  refresh time.
- **Applied jobs stay visible and aren't re-suggested.** When you submit an
  item, it moves to a greyed **Applied** list and is recorded as "seen", so
  refreshes never surface it again. Dismissed jobs are likewise suppressed. To
  let a job reappear, delete its application from the **Applications** page —
  that frees it for future refreshes.
- **Pagination.** Both the review queue and the applied feed are paginated, so a
  long list of matches stays manageable.

> On free hosting that sleeps (e.g. Render free tier), the once-per-boot refresh
> is what keeps matches current — the app re-scans when it wakes. For guaranteed
> daily runs independent of traffic, add a scheduled ping or a cron job hitting
> `POST /auto-apply/refresh`.

---

## Notes & caveats

- **Work-pass figures are illustrative.** The EP and S Pass salary thresholds in
  `client/src/lib/constants.ts` are placeholders and rise with age. Verify
  against [MOM](https://www.mom.gov.sg) before relying on them.
- **No auth yet.** The spec lists email/Google login; this scaffold leaves
  authentication as the next step. Add it as Express middleware on `/api` and a
  login screen on the client.
- **Timeline & interviews** are stored as JSONB on the application row, since
  they're always read and written together with their parent.

---

## Scripts (root)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run API + frontend together (watch mode) |
| `npm run build` | Build both workspaces for production |
| `npm start` | Run the compiled server (serves the built client) |
| `npm run db:migrate` | Apply the schema |
| `npm run db:seed` | Load sample data |
