# 🏆 SL Strength Command Center

The daily CEO dashboard. One page Shane opens every morning to run SL Strength without
opening seven separate databases.

- **Page:** [🏆 SL Strength Command Center](https://app.notion.com/p/3a9a58f71c0f81a185e0e63d5fd04d87)
  — page ID `3a9a58f7-1c0f-81a1-85e0-e63d5fd04d87`, nested under the
  [SL Strength OS](https://app.notion.com/p/3a9a58f71c0f810599e7eb3abbc017fd) hub.

It answers five questions at a glance: **who needs attention, what sales activity is due,
what client actions are required, what content is next, and how the business is
performing.**

## Sections & linked views

All views are **live linked views** of the existing databases — no data is duplicated.

| Section | View | Source | Type | Filter / config |
|---|---|---|---|---|
| 1 · Today's Priorities | Follow-Ups Needed | Leads | Table | `Next Follow-up` on or before **today** (overdue + due-today), soonest first |
| 1 · Today's Priorities | Client Actions Needed | Clients | Table | `Status` = Active, sorted by `Last Check-In` (oldest first) |
| 2 · Sales Dashboard | Sales Pipeline | Leads | Board | Grouped by `Stage`, sorted by `Est. Value` |
| 3 · Client Success | Active Clients | Clients | Table | `Status` = Active |
| 3 · Client Success | Needs Attention | Clients | Table | `Risk Level` = Yellow or Red |
| 4 · Content Engine | Content Calendar | Content | Calendar | By `Publish Date` |
| 4 · Content Engine | Content Production | Content | Board | Grouped by `Status` |
| 5 · CEO Metrics | Weekly Scoreboard | Business Metrics | Table | Sorted by `Week Of` (latest first) |
| 6 · Quick Links | — | — | — | Links into each database for fast entry |

### Fields added to power the dashboard (Phase 2)

- **Clients:** `Risk Level` (Green/Yellow/Red), `Last Check-In` (rollup — latest check-in
  date), `Avg Compliance %` (rollup — average of check-in compliance).
- **Leads:** `Next Action` (free text); `Stage` options changed to the sales pipeline:
  New → Contacted → Qualified → Call Scheduled → Offer Presented → Closed Won → Nurture.
- **Content:** `Status` options changed to the production line: Idea → Writing → Filming
  → Editing → Scheduled → Published.
- **Business Metrics:** `Calls`, `Close Rate %`, `Retention %`.

### Notes / known limits

- **Sales KPIs** (Total Leads, Calls Scheduled, Clients Closed, Pipeline Value) read from
  the Pipeline board itself: card counts per column, plus a `Sum` calculation on
  `Est. Value` for Pipeline Value (turn the calculation on at the bottom of the board).
  There is no separate "live number" block — Notion boards surface these natively.
- **Current weight / per-week compliance** live on each client's linked Check-ins. The
  dashboard shows `Avg Compliance %` and `Last Check-In` at the client level; open a
  client to see their weight trend. (A Notion rollup can't return the *latest* number,
  only aggregates, so "current weight" isn't a client-level field.)
- **Quick Links** are links into each database (clicking opens it ready for a new row).
  For true one-click intake, add a native Notion **＋ New** button wired to a template
  inside each database — that has to be done in the Notion UI.

## How to use it

### Daily (5–10 min, morning)
1. **Section 1 — Today's Priorities.** Clear *Follow-Ups Needed* (message every overdue /
   due-today lead, then update their `Stage` and `Next Action`). Scan *Client Actions
   Needed* — the clients at the top haven't checked in the longest.
2. **Section 2 — Sales Dashboard.** Drag pipeline cards forward as conversations progress.
   Book calls, send offers, close.
3. **Section 3 — Client Success.** Glance at *Needs Attention*. Anyone Yellow or Red gets
   a personal touch today.

### Weekly (Sunday, ~20 min)
1. **Section 5 — CEO Metrics.** Add one `Business Metrics` row for the week: Active
   Clients, MRR, Revenue, New Leads, Calls, Close Rate %, Retention %, Content Published.
2. **Section 4 — Content Engine.** Plan the week's content on the calendar and move each
   piece along the production board.
3. Re-set `Risk Level` on every active client based on their latest check-in.

### Monthly (~30 min)
1. Review the **Weekly Scoreboard** trend — MRR, close rate, and retention over the last
   4–5 weeks. Is the business growing, and is delivery holding?
2. Look at where leads stall in the pipeline and where clients churn from, and adjust the
   plan for the month ahead.

---

*Phase 2 of SL Strength OS. Still no automation — this is the manual operating cockpit
that a future automation layer will feed and act on.*
