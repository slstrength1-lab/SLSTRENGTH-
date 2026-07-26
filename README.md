# SL Strength OS

The operating system for **SL Strength** — Shane Lanteigne's premium online coaching
business. This repo now holds two layers:

1. **The backend** — the live data architecture in Notion (Clients, Leads, Sales,
   Check-ins, Programs, Content, Business Metrics) plus the Command Center dashboard.
   See [`docs/architecture.md`](docs/architecture.md) and
   [`docs/command-center.md`](docs/command-center.md).
2. **The interface prototype** — a Next.js app that shows what the future SL Strength
   **client portal** and **coach dashboard** look like on top of that backend.

> **Notion is the source of truth.** Every page reads through a data layer
> (`lib/store.ts`) backed by the Notion adapter (`lib/notion.ts`). Set `NOTION_API_KEY`
> and the app serves live Notion data; leave it unset (or if a query fails) and it falls
> back to bundled sample data so the prototype always renders.

## Run the prototype

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

- `/` — experience selector
- **Client portal:** `/dashboard`, `/training`, `/nutrition`, `/checkins`, `/progress`, `/messages`
- **Coach dashboard:** `/coach`
- Use **"Switch to Coach / Client view"** in the sidebar to move between the two.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · lucide-react. No component library —
a small in-house design system (`components/primitives.tsx`) keeps the premium black/red
athletic look consistent and the bundle lean. Charts are dependency-free inline SVG.

## Structure

```
app/
  page.tsx                 # OS entry / experience selector
  (portal)/                # Client portal (shared sidebar layout)
    dashboard, training, nutrition, checkins, progress, messages
  coach/                   # Coach dashboard
  api/                     # REST stubs: clients, leads, sales, checkins,
                           #   programs, content, metrics
components/                # AppShell, Brand, primitives, charts, feature UI
lib/
  types.ts                 # Domain models (mirror the Notion databases)
  notion.ts                # Notion adapter — live queries + property mappers + fallback
  store.ts                 # Async data layer the pages call (caching + enrichment)
  data.ts                  # Sample data (fallback + prototype-only features)
  format.ts                # Formatting + derived-metric helpers
docs/                      # Notion backend architecture + Command Center guide
```

## Data models

`Client`, `Lead`, `Sale`, `CheckIn`, `Program`, `ContentItem`, `Metric` in
[`lib/types.ts`](lib/types.ts) mirror the Notion databases one-to-one (each carries an
optional `notionId`). Training structure (`ProgramWeek → WorkoutDay → Exercise`) and the
client `NutritionPlan` are nested types that will live inside the Program / Client records.

## Live Notion connection

The Notion backend is wired up (via `@notionhq/client` v5, API version 2025-09-03).

1. Create a Notion integration at <https://www.notion.so/my-integrations> and **share each
   SL Strength database with it**.
2. Copy `.env.example` to `.env.local` and set `NOTION_API_KEY` (optionally
   `NOTION_DEMO_CLIENT_EMAIL` to choose which client the portal logs in as).
3. `npm run dev` — the console logs the mode on first query:
   - `[notion] Live mode …` → querying real Notion data sources.
   - `[notion] Sample mode …` → no key set, serving sample data.

**How it flows:** pages → `lib/store.ts` (async, per-request cached) → `lib/notion.ts`
(queries the seven data sources by ID and maps each page to the `lib/types.ts` interfaces)
→ Notion. If a query throws, that resource logs a warning and falls back to sample data —
the page still renders. Data pages are `force-dynamic`, so each request reads fresh Notion
data rather than a build-time snapshot.

**Notion-backed:** Clients, Leads, Sales, Check-ins, Programs, Content, Business Metrics.
**Sample-only (no Notion database yet):** the nutrition plan, body-composition history,
message thread, and weekly priorities — these serve representative sample data per client.
The detailed week/day/exercise training structure lives in the linked spreadsheet, so live
Programs are shown with a sample training template.

Nothing in `components/` changed for the live cutover — only the adapter, a new data layer,
and the pages' data calls (`await`).

## Operating principles

Premium experience · high-touch where it matters · automation for repetitive tasks ·
AI-assisted decisions · simple systems before complex ones.
