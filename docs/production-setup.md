# SL Strength OS — Production Setup

How to make Notion the live production backend for the app. Written for **Windows**
(PowerShell), with macOS/Linux notes where they differ.

---

## 1. Add the Notion integration

The app authenticates to Notion with an **integration secret** (a token that starts with
`ntn_`). You create it once, then share it with the seven databases.

1. Go to <https://www.notion.so/my-integrations> → **New integration**.
   - Name it e.g. `SL Strength OS`.
   - Associate it with the **Shane Lanteigne's Space** workspace.
   - Capabilities: **Read content**, **Update content**, **Insert content** (all three —
     the app both reads and writes).
2. Copy the **Internal Integration Secret** (`ntn_...`). Treat it like a password.
3. **Share each database with the integration** (this is the step people forget — without
   it every query returns `403`/`404`):
   - Open each database's page in Notion → top-right **•••** → **Connections** →
     **Connect to** → pick `SL Strength OS`.
   - Do this for all seven: **Clients, Leads, Sales, Check-ins, Programs, Content,
     Business Metrics**. (Connecting the parent **SL Strength OS** hub page shares
     everything nested under it in one step.)

> The seven data source IDs are already hard-coded in `lib/notion.ts` (`NOTION_DATA_SOURCES`)
> and match this workspace, so you do **not** need to look them up.

---

## 2. Where environment variables go

### Local development
The token lives in **`.env.local`** in the project root — never in code, never committed
(`.gitignore` already excludes it).

Project root on Windows (example): `C:\Users\<you>\SLSTRENGTH\SLSTRENGTH-\.env.local`

Create/edit it:
```powershell
# from the project root
notepad .env.local
```
Contents:
```
NOTION_API_KEY=ntn_your_secret_here
NOTION_DEMO_CLIENT_EMAIL=
```
- `NOTION_API_KEY` — paste your secret after the `=`, no quotes, no spaces.
- `NOTION_DEMO_CLIENT_EMAIL` — optional; which client the portal "logs in" as. Leave blank
  to use the first Active client.

Then restart the dev server so it picks up the change:
```powershell
# Ctrl+C to stop, then:
npm run dev
```
On startup the console prints which mode it's in:
- `[notion] Live mode — NOTION_API_KEY detected.` → talking to real Notion.
- `[notion] Sample mode — NOTION_API_KEY not set.` → serving bundled sample data.

### Production hosting (e.g. Vercel / Netlify)
Do **not** upload `.env.local`. Instead set the same variables in the host's dashboard:
- Vercel: Project → **Settings → Environment Variables** → add `NOTION_API_KEY`
  (and optionally `NOTION_DEMO_CLIENT_EMAIL`) for the Production (and Preview) environments →
  redeploy.
- The app reads `process.env.NOTION_API_KEY` identically in every environment.

---

## 3. How to connect a new database

When you add another Notion database later (e.g. `Payments`, `Sessions`):

1. In Notion, **share the new database with the integration** (step 1.3 above).
2. Get its **data source ID**: open the database, copy the link; the ID is the
   `collection://<id>` value (or ask a Claude Code session to fetch it).
3. In **`lib/notion.ts`**:
   - Add the ID to `NOTION_DATA_SOURCES`.
   - Add a `mapX()` function that maps its Notion properties to a TypeScript interface in
     `lib/types.ts` (copy an existing mapper as a template).
   - Add a `getX()` (read) and, if needed, a `createX()` (write) to the `notion` object,
     using `fetchOrFallback(...)` / the `w*` property builders already in the file.
4. Expose it to the UI through **`lib/store.ts`** (an async accessor) — the pages call the
   store, never Notion directly.

No UI component changes are required to surface new *data* on existing pages — only the
adapter + store + a page's data call.

---

## 4. How to switch computers

`.env.local` is intentionally **not** in git, so a fresh clone has no secret. On the new
machine:

```powershell
cd $HOME
mkdir SLSTRENGTH; cd SLSTRENGTH
git clone https://github.com/slstrength1-lab/SLSTRENGTH-.git
cd SLSTRENGTH-
git checkout claude/sl-strength-os-foundation-y5i9wa
npm install
# recreate the secret file (it did NOT come from git):
"NOTION_API_KEY=ntn_your_secret_here`nNOTION_DEMO_CLIENT_EMAIL=" | Out-File -Encoding utf8 .env.local
npm run dev    # http://localhost:3000
```
(macOS/Linux: same steps; use `printf 'NOTION_API_KEY=...\n' > .env.local`.)

Prerequisites: **Node.js 18.18+** (`node -v`) and **Git** (`git --version`). Your Notion
secret is the same across machines — reuse the one integration; you don't make a new one
per computer.

---

## 5. How future Claude Code sessions should continue development

Give a new session this orientation:

- **What this is:** a Next.js 14 (App Router) + TypeScript + Tailwind app — a client portal
  (`/dashboard`, `/training`, `/nutrition`, `/checkins`, `/progress`, `/messages`) and a
  coach dashboard (`/coach`) on top of a Notion backend.
- **Branch:** work on `claude/sl-strength-os-foundation-y5i9wa` (or the current default).
- **Architecture (read these first):** `README.md`, `docs/architecture.md`,
  `docs/command-center.md`, and this file.
- **Data flow:** pages → `lib/store.ts` (async, per-request cached) → `lib/notion.ts`
  (adapter: reads via `dataSources.query`, writes via `pages.create`/`pages.update`) →
  Notion. Sample data in `lib/data.ts` is the fallback + the source for prototype-only
  features (nutrition, progress, messages, priorities) that have no Notion DB yet.
- **The golden rule for backend work:** only touch `lib/notion.ts`, `lib/store.ts`, and
  page data calls. **Do not restyle or redesign the components** in `components/` — the
  design system (`components/primitives.tsx`, the black/red theme) is intentional and
  stable.
- **Conventions:** models mirror Notion 1:1 (`lib/types.ts`); every read/write falls back
  to sample data and logs status; data pages/routes are `force-dynamic`.
- **Verify before finishing:** `npm run build` (must pass) and, if a key is present,
  confirm the startup log says `Live mode`.
- **Secrets:** never hardcode or commit the token; it only ever comes from
  `process.env.NOTION_API_KEY`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Log says `Sample mode` after adding the key | Dev server not restarted, or key in the wrong file | Ensure `NOTION_API_KEY` is in `.env.local` at the project root; restart `npm run dev` |
| `Request to Notion API failed with status: 403` | Integration not shared with that database | Share the database (or the hub page) with the integration (step 1.3) |
| `... status: 404` | Wrong/void data source ID, or DB not shared | Confirm the DB is connected to the integration; verify the ID in `NOTION_DATA_SOURCES` |
| A page shows sample data while others are live | Only some databases shared, or that page uses a prototype-only feature | Share all seven DBs; note nutrition/progress/messages/priorities are sample by design |
| `401 unauthorized` | Bad or rotated token | Re-copy the integration secret into `.env.local` |
