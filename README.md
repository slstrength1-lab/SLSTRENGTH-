# SL Strength OS

The operating system for **SL Strength** — Shane Lanteigne's premium online coaching
business. This repo now holds two layers:

1. **The backend** — the live data architecture in Notion (Clients, Leads, Sales,
   Check-ins, Programs, Content, Business Metrics) plus the Command Center dashboard.
   See [`docs/architecture.md`](docs/architecture.md) and
   [`docs/command-center.md`](docs/command-center.md).
2. **The interface prototype** — a Next.js app that shows what the future SL Strength
   **client portal** and **coach dashboard** look like on top of that backend.

> The prototype uses realistic **sample data**. It is API-ready: every page reads through
> an adapter (`lib/notion.ts`) that will return live Notion data once a key is added,
> with no page changes required.

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
  data.ts                  # Realistic sample data (the in-memory "database")
  notion.ts                # Notion adapter — swap sample data for live data here
  format.ts                # Formatting + derived-metric helpers
docs/                      # Notion backend architecture + Command Center guide
```

## Data models

`Client`, `Lead`, `Sale`, `CheckIn`, `Program`, `ContentItem`, `Metric` in
[`lib/types.ts`](lib/types.ts) mirror the Notion databases one-to-one (each carries an
optional `notionId`). Training structure (`ProgramWeek → WorkoutDay → Exercise`) and the
client `NutritionPlan` are nested types that will live inside the Program / Client records.

## Connecting Notion later

1. `npm install @notionhq/client` and set `NOTION_API_KEY` in `.env.local`.
2. Implement the functions in [`lib/notion.ts`](lib/notion.ts) against the data-source IDs
   already listed there (they match the live workspace).
3. Map each Notion property to the model fields in `lib/types.ts`.

Nothing in `app/` or `components/` changes — the UI only ever calls the adapter and the
API routes. `lib/notion.ts` exposes `isLive` (true once the key is set) so you can roll the
backend over incrementally.

## Operating principles

Premium experience · high-touch where it matters · automation for repetitive tasks ·
AI-assisted decisions · simple systems before complex ones.
