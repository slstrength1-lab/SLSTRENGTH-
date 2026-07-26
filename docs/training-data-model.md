# SL Strength OS — Training Data Model (Workouts)

The internal, queryable home for workout-level training data — the foundation the
HPOS AI Strength Coach agents analyze. Before this, exercise detail lived only in
per-program Google Sheets (the Programs `Program Link`), invisible to the system.

## Why a separate Workouts database

The workspace already uses one consistent shape: a **hub (Clients)** with **spokes**
(Programs, Check-ins, Sales), each carrying a `Client` relation, and rollups flowing
back up to the hub. Workouts is a new spoke that follows the same pattern.

Alternatives rejected:
- **JSON blob on Programs** — opaque to Notion views/rollups *and* to AI querying; can't
  filter or aggregate.
- **Toggles/tables in the program page body** — unstructured, not queryable.
- **Flat relational Workouts DB** ✅ — queryable, rollup-able, viewable, and it is the
  clean tool boundary the adapter (and future AI agents) call.

## Grain

**One row = one exercise, in one day, of one week, of one program.** Chosen over
set-per-row: it matches the app's `Exercise → WorkoutDay → ProgramWeek` types and the
coaching workflow, and keeps row counts reasonable (a 4-week × 4-day × 6-exercise block
≈ 96 rows). Per-set logging can be layered on later without changing this table.

## Schema — `Workouts` (data source `7f5e8a76-c1f1-4f66-856b-122ea2e9904c`)

| Property | Type | Purpose |
|---|---|---|
| Exercise | Title | e.g. "Back Squat" — consistent naming enables cross-program tracking |
| Program | Relation → Programs (dual `Workouts`) | parent program |
| Client | Relation → Clients (dual `Workouts`) | denormalized for direct per-client AI queries |
| Week | Number | 1…N, orderable for progression |
| Day | Number | 1…N within the week |
| Focus | Text | optional session label ("Lower A") |
| Order | Number | exercise order within the day (A1, A2, B1…) |
| Sets | Number | prescribed |
| Reps | Text | prescribed — supports "5", "8-10", "AMRAP" |
| Load | Text | prescribed — "225 lb", "RPE 8", "BW", "70% 1RM" |
| Actual Load (lb) | Number | performed top-set load (numeric for AI) |
| Actual Reps | Number | performed reps (numeric for AI) |
| RPE | Number | rate of perceived exertion, 1–10 |
| Tempo | Text | "3-1-1-0" |
| Completed | Checkbox | drives Completion % rollups |
| Date | Date | when performed/scheduled — calendar ordering |
| Notes | Text | coach/athlete notes |
| Volume (lb) | Formula | `Sets × Actual Reps × Actual Load (lb)` — computed training volume |

### Rollups added (mirroring Check-ins / Sales)

- **Programs:** `Total Exercises` (count), `Completion %` (percent checked), `Last Logged` (latest date).
- **Clients:** `Total Exercises Logged` (count), `Workout Completion %` (percent checked),
  `Last Workout` (latest date), `Avg RPE` (average).

## Non-breaking guarantee

Nothing existing was modified destructively. The two dual relations added a reciprocal
`Workouts` property to Programs and Clients, and the rollups are new properties. The
adapter reads every database by explicit property name, so new properties are ignored by
existing code. The Programs `Program Link` (Google Sheet) stays as the migration source.

## How the app consumes it

```
Notion Workouts rows
  → lib/notion.ts  mapWorkout()  → WorkoutRow[]        (notion.getWorkouts)
  → lib/store.ts   weeksFromWorkouts()  → ProgramWeek[]  (grouped Week→Day→Order)
  → programForClient / programsForClient attach .weeks
  → components/ProgramStructure renders it — unchanged
```

- **Coach client-detail** (`programsForClient`) uses **only** real Workouts rows. Empty DB
  → the existing clean empty state (never sample data).
- **Athlete Training** (`programForClient`) prefers real Workouts rows, and falls back to a
  sample template only while the DB is empty (prototype convenience).

No data is fabricated: the database ships empty and `weeksFromWorkouts([])` returns `[]`.

## HPOS AI-readiness

Because the data is flat, relational, and numeric where it counts (Week, Sets, RPE,
Actual Load/Reps, Volume), agents can answer questions directly through the adapter — the
clean tool boundary:

- "Show Back Squat load progression over the last 8 weeks" (Exercise + Week + Actual Load).
- "Compute weekly training volume per muscle group" (Volume formula, grouped).
- "Flag sessions where RPE exceeded the prescription" (RPE vs Load).
- "What's each client's workout adherence this block?" (`Workout Completion %` rollup).

Future extensions (non-breaking): an **Exercise Library** relation for canonical exercise
identity, and per-set logging as a child `Sets` table if set-level granularity is needed.
