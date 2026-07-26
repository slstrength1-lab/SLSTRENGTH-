# SL Strength OS — Next-Phase Roadmap

Where the platform goes after the Notion backend is live. This is a **planning document** —
no code here. Phases are ordered by priority and dependency; each builds on the last.

> **Not started yet, by design:** authentication. This phase's #1 item scopes it; do not
> implement login until it's explicitly approved. Everything today runs as a single
> "logged-in" demo client / single coach.

**Current baseline (done):** Notion is the source of truth. Reads + writes flow
UI → `lib/store.ts` → `lib/notion.ts` → Notion, with sample-data fallback. Client portal
(6 pages) and coach dashboard are built and styled. No auth, no payments, single-tenant.

---

## Phase 1 — Athlete login system  ⭐ next

**Goal:** real users sign in; each athlete sees only their own data; the coach sees the
roster.

**Scope**
- Email/password + magic-link (and/or Google) sign-in.
- Session management; protected routes for `/dashboard…/messages` and `/coach`.
- Role model: `athlete` vs `coach` (later `admin`).
- Map an authenticated user → their Notion **Client** record (by email) so
  `getCurrentClient()` stops being a hard-coded pick.

**Approach (fits current architecture)**
- Add **NextAuth (Auth.js)** or **Clerk**. Recommendation: **Clerk** for speed to a premium
  UX, or **Auth.js** to stay dependency-light and self-owned.
- Replace `getCurrentClient()` in `lib/store.ts` with "resolve the session's email → Client"
  — the pages don't change.
- Gate `/coach` behind the `coach` role via middleware.
- Store the athlete↔Client link by email first; add a `User ID` field to the Clients DB if
  you need a stable non-email key.

**Dependencies:** none beyond the live backend. **Risk:** low–medium. **Est.:** 1–2 sessions.
**Do not start without explicit sign-off** (per the current instruction).

---

## Phase 2 — Client portal (fill out the athlete experience)

**Goal:** turn the prototype pages into the full delivery experience once athletes log in.

**Scope**
- **Nutrition, Progress, Messages, Weekly Priorities** are currently sample-only — give each
  a real Notion (or Postgres) home so they persist per athlete.
- Real training logging: the week/day/exercise structure lives in a spreadsheet today —
  move it into a **Workouts/Sets** database or a JSON field on Programs so athletes can log
  actual sets/reps/RPE.
- Check-in history charts fed by real submissions; photo uploads for progress.
- Push/email notifications when the coach reviews a check-in.

**Approach:** add databases + mappers + store accessors (see `production-setup.md` §3).
Keep the existing components; only wire new data. **Dependencies:** Phase 1 (per-user data).
**Est.:** 2–3 sessions.

---

## Phase 3 — Coach dashboard expansion

**Goal:** make `/coach` the full operating cockpit, not just an overview.

**Scope**
- Drill-in **client detail** pages (history, program, check-ins, sales in one view).
- **Write actions from the UI:** inline "New Lead", drag-to-stage pipeline that calls
  `PATCH /api/leads/:id`, "Assign Program" modal → `POST /api/programs`, check-in review →
  writes coach `Adjustments`.
- Content pipeline board (create/move content), revenue drill-downs, cohort retention.
- Optimistic UI everywhere (reuse the check-in form's "Saved / Unable to sync" pattern).

**Approach:** the write endpoints already exist — this is mostly UI wiring + a few new
store/adapter calls. **Dependencies:** Phases 1–2. **Est.:** 2–4 sessions.

---

## Phase 4 — HPOS agent integration (AI layer)

**Goal:** an AI "High-Performance OS" agent that reads the whole OS and assists the coach
and athletes.

**Scope**
- Coach copilot: "who's at risk this week?", "draft adjustments for Marcus", "summarize the
  pipeline" — grounded in live Notion data.
- Athlete assistant: answer plan/nutrition questions from their own records only.
- Auto-drafting: check-in review suggestions, content ideas, follow-up messages.

**Approach**
- Server-side agent using the Claude API with **tools** that call the existing adapter
  functions (`getClients`, `getCheckIns`, `createProgram`, …) — the adapter is already the
  clean tool boundary.
- Strict data scoping by role/tenant (an athlete's agent can only see their own rows).
- Keep humans in the loop: agent proposes, coach approves before anything writes.

**Dependencies:** Phases 1 (identity/scoping) and 3 (write actions). **Risk:** medium
(data privacy, prompt-injection from user content). **Est.:** 3–5 sessions.

---

## Phase 5 — Payments / subscriptions

**Goal:** collect coaching fees and drive access from subscription state.

**Scope**
- **Stripe** subscriptions/checkout; plans map to coaching packages.
- Webhooks → write to the **Sales** DB (and a new `Subscriptions` DB); update Client
  `Status` on churn/renewal.
- Gate portal access by active subscription; dunning + renewal reminders.
- Coach revenue metrics fed by real Stripe data instead of manual Business Metrics rows.

**Approach:** Stripe Checkout + a `/api/webhooks/stripe` route that uses the existing write
layer. **Dependencies:** Phase 1 (identity to attach a customer). **Risk:** medium (billing
correctness, webhook idempotency). **Est.:** 2–4 sessions.

---

## Phase 6 — Multi-team SaaS architecture

**Goal:** SL Strength OS as a product other coaches/teams can use — true multi-tenancy.

**Scope**
- **Tenant model:** each coach/team gets isolated data; row-level scoping on every read/write.
- Migrate the system of record from a single Notion workspace to a **scalable DB
  (Postgres/Supabase)** — Notion doesn't multi-tenant or scale to many teams. Keep Notion as
  an optional per-tenant integration/export.
- Org/roles/permissions, per-tenant billing (extends Phase 5), onboarding, admin console.
- Background jobs, rate limiting, observability, backups.

**Approach:** introduce a tenant-aware data layer behind the same `lib/store.ts` interface
so the UI is unaffected; add a migration path from the Notion adapter to the DB adapter.
**Dependencies:** Phases 1 & 5. **Risk:** high (architectural). **Est.:** multi-phase / weeks.

---

## Priority summary

| # | Phase | Depends on | Risk | Rough size |
|---|---|---|---|---|
| 1 | Athlete login | live backend | low–med | 1–2 sessions |
| 2 | Client portal | 1 | low | 2–3 sessions |
| 3 | Coach dashboard expansion | 1–2 | low–med | 2–4 sessions |
| 4 | HPOS agent | 1, 3 | med | 3–5 sessions |
| 5 | Payments/subscriptions | 1 | med | 2–4 sessions |
| 6 | Multi-team SaaS | 1, 5 | high | weeks |

**Recommended immediate next step:** get the live `NOTION_API_KEY` in place and confirm
`Live mode`, then start **Phase 1 (auth)** — but only on explicit approval, since auth is
intentionally deferred right now.

---

## Guardrails for every phase

- Don't redesign the existing UI/design system — extend it.
- Every new resource: model in `types.ts` → mapper + read/write in `notion.ts` → accessor in
  `store.ts` → page data call. Never call Notion from a component.
- Keep the sample-fallback + status logging so the app always runs without a key.
- Secrets only via environment variables; never commit them.
