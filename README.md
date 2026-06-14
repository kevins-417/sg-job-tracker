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
- **Auto-apply (preview)** — rule-driven *drafting*. See [Auto-apply](#auto-apply-preview) below.
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
| GET | `/auto-apply/rules` | List auto-apply rules |
| POST | `/auto-apply/rules` | Create / update a rule |
| DELETE | `/auto-apply/rules/:id` | Delete a rule |
| POST | `/auto-apply/rules/:id/run` | Run the matcher for a rule |
| GET | `/auto-apply/attempts` | Recent auto-apply activity |
| GET | `/health` | Health check |

---

## Auto-apply (preview)

The product spec lists **"automatic job scraping from Singapore portals"** as a
*Phase 2* enhancement and recruiter-email parsing as *Phase 3*. It does **not**
ask for unattended submission of applications to third-party portals — and for
good reason, since each portal (MyCareersFuture, LinkedIn, JobStreet, …) has its
own terms of service.

This build includes auto-apply as a **review-first preview** that respects that
boundary:

- A **rule** describes what you want drafted: keywords, industries, portals, a
  minimum salary, and which resume to attach.
- Running a rule scans a **sample job feed** (a real feed is the Phase 2
  integration and is intentionally not wired up) and, in **draft mode**, creates
  `Draft` applications matching your criteria for you to review and submit
  yourself.
- **Submit mode is blocked by design.** The server refuses to auto-submit, logs
  each match as `blocked`, and creates nothing. Even configuring a rule to skip
  review is overridden server-side.

So "auto-apply" here means *auto-draft for your review* — never silent
submission. To extend it into real scraping later, replace the mock feed in
`server/src/repositories/autoApply.ts` and add a properly authenticated,
ToS-compliant portal integration.

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
