# SL Strength OS — AI Architecture Review

_Senior AI Systems Architect review of `SL_Strength_AI_Agent_Ecosystem.md`._
_Status: design doc. No code. Grounds every recommendation in the system that
already exists (`lib/notion.ts`, `lib/store.ts`, `lib/analytics/*`, the `/coach`
dashboard, the Notion data sources)._

---

## 1. Executive Summary

The proposed ecosystem is directionally right — shared data, single
responsibility, human-in-the-loop — but it makes one structural mistake that,
left unchecked, becomes a maintenance and cost sink:

> **It labels 14 things "agents" when only ~4 of them need to be agents.**

Most of the fourteen are **deterministic services** (pipeline math, macro
calculations, revenue reporting, risk flags, reminder scheduling). Turning
those into LLM "agents" makes them slower, more expensive, less predictable,
and harder to debug — for logic a plain function does perfectly. You have
already proven this instinct: `lib/analytics/*` computes leads, client health,
revenue, and risk **deterministically today**, with no LLM. That layer is the
real backbone. The AI belongs in a thin layer on top of it — for **judgment**
(reading a free-text check-in), **generation** (drafting a program, an email,
a caption), and **synthesis** (the morning brief).

**The reframe:**

```
Data model (Notion — exists)
    ↓
Deterministic services (lib/analytics — exists, extend)
    ↓
A SMALL set of LLM advisors (new — ~4)
    ↓
Recommendation & Approval ledger (new — the missing backbone)
    ↓
Human review (approval inbox — new UI)
    ↓
Execution service (applies approved changes)
    ↓
History / audit (the ledger IS the history)
```

The single most important thing the original document is **missing** is the
**Recommendation & Approval ledger** — the entity and workflow where agents
write their proposals, a human approves/rejects, and an execution service
applies the change. Without it, "human approval" and "traceable" are slogans,
not architecture. Build that first, before any agent.

**Bottom line:** consolidate 14 → 4 advisors + a shared services layer (mostly
built) + the approval ledger. Keep Notion for now but design for a Postgres
migration at ~50–100 clients. Ship read-only value first, earn trust, then let
the system act.

---

## 2. Recommended Final Agent List

Four LLM advisors. Everything else is a **service** (deterministic) or a
**capability** (shared, called by advisors), not a standalone agent.

| # | Advisor | Merges (from the 14) | Why it's genuinely an agent |
|---|---------|----------------------|-----------------------------|
| **A1** | **Executive Strategist & Briefing** | CEO/Business Director (1) + Executive Daily Briefing (14) | Synthesizes the whole business into a daily brief + weekly review. Read-only, low-risk, highest trust-building value. |
| **A2** | **Client Coaching Advisor** | Check-In Analysis (7) + Client Success (4, LLM parts) + Programming (5) + Nutrition (6, planning parts) | Reads a client's full state and drafts: check-in responses, program updates, nutrition adjustments. The core coaching leverage. |
| **A3** | **Sales Assistant** | Sales & CRM (2, LLM parts) | Drafts follow-ups, discovery-call prep, proposals off the deterministic pipeline. Monetizes the IG leads you're about to drive. |
| **A4** | **Growth & Content Engine** | Marketing (3) + Content Repurposing (13) + Product Development (12) | Content ideation, repurposing one idea into many assets, product/launch planning. Pure generation. |
| _(A5, later)_ | **Research Advisor** | Research & Education (11) | Evidence lookups on demand. Low frequency; add in a late phase. |

### Deterministic services (NOT agents — extend `lib/analytics/*`)

| Service | From the 14 | Status today |
|---------|-------------|--------------|
| CRM / pipeline metrics | Sales & CRM (2) | ✅ `lib/analytics/leads.ts` |
| Client health / risk / retention flags | Client Success (4) | ✅ `clientHealthScore`, `lib/analytics/risk` |
| Nutrition math (calories/macros) | Nutrition (6) | Formulas — build as pure functions, **not** an LLM |
| Finance / revenue / profit | Finance (9) | ✅ `lib/analytics/revenue` (extend for expenses) |
| Operations / tasks / SOPs | Operations (10) | Data + light service |
| Reminder scheduling | Client Success / Comms | Deterministic rules + cron |

### Shared capability (NOT an agent)

- **Communications drafting** (from Comms, 8) is a **shared capability** every
  advisor calls (Sales drafts follow-ups, Coaching drafts client messages,
  Briefing drafts nudges). It is not a standalone agent — making it one just
  adds a hop. Implement it as `lib/agents/shared/draft.ts`.

**Net: 14 proposed → 4 advisors (+1 later) + 6 services + 1 capability.**

---

## 3. Suggested Merges & Removals

- **Merge CEO (1) + Daily Briefing (14) → A1 Executive Strategist.** They are
  the same reader of the same aggregate state at two cadences (daily brief,
  weekly review). One advisor, two triggers.
- **Merge Check-In Analysis (7) + Client Success (4) → A2.** Risk detection is
  deterministic (already built); check-in reading is the LLM half. They feed
  the same output (what does this client need this week?). One advisor.
- **Fold Programming (5) + Nutrition planning (6) into A2** as distinct
  _skills_ ("propose program update", "propose nutrition update"). They share
  the identical pattern: read client → propose change → human approves → apply.
  Keep the **nutrition math** as a deterministic service the skill calls.
- **Merge Marketing (3) + Content Repurposing (13) + Product Development (12)
  → A4 Growth Engine.** All three are content/asset generation off the same
  brand context. Three agents here is over-decomposition.
- **Demote Sales & CRM (2):** the CRM half is a service (built); only the
  drafting half is A3.
- **Demote Nutrition (6), Finance (9), Operations (10):** services, not agents.
- **Convert Communications (8) into a shared capability**, not an agent.
- **Defer Research (11)** to a late phase (A5).

---

## 4. Missing Pieces (the important part)

The document describes the actors but not the **infrastructure that makes
human-in-the-loop real**. These are prerequisites, not nice-to-haves:

1. **Recommendation & Approval ledger** — a first-class entity: every agent
   output is a row (`type`, `entity`, `summary`, `payload`, `risk_tier`,
   `status: pending/approved/rejected/applied`, `dedup_key`, `created_by`,
   `reviewed_by`, timestamps). This is the bus, the audit trail, and the
   history all at once. **Nothing should be built before this.**
2. **Approval Inbox UI** — a `/coach/approvals` surface where you review, edit,
   approve, or reject proposals in batches. The approval step needs a home.
3. **Execution service** — the ONLY thing that writes approved changes into
   domain tables (programs, nutrition, messages). Agents never write domain
   data directly; they only emit recommendations. This is what enforces "no
   agent modifies another agent's data."
4. **Context Assembler** — one shared service that gathers a client's (or the
   business's) full context once, so every advisor reads consistent, cached
   input instead of re-querying Notion. Prevents duplicated logic and rate-limit
   pain.
5. **Guardrails / evals** — validation on domain-critical output (a proposed
   program that exceeds sane volume, a macro target below a floor, a message
   with a broken booking link). Structured outputs + schema validation +
   a small eval set per advisor.
6. **Observability & cost controls** — log every LLM call: tokens, cost,
   latency, which prompt version. Without this, cost and quality drift silently.
7. **Prompt/skill versioning** — treat prompts as versioned artifacts
   (`lib/prompts/`), so you can roll back a regression.
8. **Idempotency / dedup** — a `dedup_key` per recommendation so the same
   proposal doesn't reappear every run (the exact bug pattern `convertLead`'s
   skip-hooks already guard against — apply it system-wide).
9. **Access control for scale** — you now have a password wall; multi-coach
   needs per-coach data scoping and roles (see §6).

---

## 5. Phase-by-Phase Roadmap

Reordered from the original, and justified. Sequencing principle: **build the
approval backbone first; ship read-only advisors before write actions; protect
existing clients before scaling acquisition; deterministic before LLM.**

### Phase 0 — Foundation (the real MVP prerequisite)
_The original doc skips straight to agents; this is what must exist first._
- Recommendation & Approval ledger (entity + store).
- Approval Inbox UI (`/coach/approvals`).
- Execution service + risk-tier field driving auto-vs-approve.
- Context Assembler, LLM wrapper (structured outputs, retries, cost log),
  prompt versioning scaffold.
- **Why first:** every agent depends on a place to put proposals and a way to
  approve them. Without Phase 0, agents have nowhere safe to write.

### Phase 1 — Executive OS (A1, read-only)
- Executive Strategist: daily brief + weekly review off existing analytics.
- **Why here:** highest leverage, **zero write risk** (it only reads and
  summarizes), and it builds your trust in the system's judgment before you
  ever let it touch client data. You already put CEO first — agreed, for a
  different reason: it's the safest place to start.

### Phase 2 — Client Operations (A2)
- Check-in analysis, client risk surfacing, program/nutrition proposals,
  client-message drafts — all through the approval inbox.
- **Why before sales:** retention is cheaper than acquisition, and as you scale
  IG leads the real risk is dropping the ball on **current** clients. Protect
  revenue you have before chasing more. This is also your core coaching moat.

### Phase 3 — Sales (A3)
- Follow-up drafts, discovery prep, proposals off the pipeline.
- **Why here:** you're about to drive IG traffic — this converts it. Placed
  after Client Ops because a solo coach can work a handful of leads manually,
  but can't manually out-coach a growing roster. _(Challenge point: if lead
  volume spikes fast, pull a lightweight follow-up **reminder** — deterministic,
  already partly built — forward into Phase 1.)_

### Phase 4 — Growth & Content (A4)
- Content engine, repurposing, product/launch planning.
- **Why here:** scales the top of funnel once the machine below it (capture →
  convert → coach → retain) actually works. Marketing into a leaky funnel wastes
  spend.

### Phase 5 — Advanced Automation & Scale
- Graduate high-confidence, low-risk actions from "approve" to "auto."
- Research Advisor (A5). Multi-coach access control. Postgres migration if
  client count warrants. Event-driven triggers replacing cron polling.
- **Why last:** you only automate what you've watched succeed under human review
  for weeks. Automation is earned, not assumed.

---

## 6. Shared Data Architecture

### Core entities
Notion data sources you **already have**: Clients, Leads, Sales (Revenue),
Check-ins, Programs, Content, Business Metrics, Workouts, Nutrition, Coach Notes.

**Add:**
- **Recommendations/Actions** (the ledger — §4.1). _Critical, build first._
- **Tasks** (operations, follow-ups with due dates/owners).
- **Products** (digital products, pricing, launch state) — for A4.
- **SOPs / Documents** (ops knowledge the system can reference).
- **Communications log** (what was drafted, edited, sent, when) — for audit.
- **Coaches** (later — identity + data scoping for multi-coach).
- **Activity/Timeline** (optional unified per-entity event log).

### How every agent reads/writes without duplicating logic
This is the rule that keeps the system maintainable — you already enforce a
version of it:

1. **Reads** go through the **services layer** (`lib/analytics` + `lib/store`),
   never raw Notion. Analytics is the single definition of every metric.
2. **Domain writes** go through **typed store mutations** (`lib/notion` write
   builders) — never ad-hoc.
3. **Agents never write domain tables.** They write **only** to the
   Recommendations ledger. The **execution service** applies approved rows to
   domain tables. This is the mechanism behind "no agent modifies another
   agent's data" — enforced by design, not by convention.
4. **One Context Assembler** produces the context object every advisor consumes,
   so "what is this client's situation" is computed once, one way.

```
Notion (data)  ──►  lib/store (fetch)  ──►  lib/analytics (compute, the truth)
                                                   │
                                     Context Assembler (gather once)
                                                   │
                                          LLM Advisor (propose)
                                                   │
                                     Recommendations ledger (pending)
                                                   │
                                     Approval Inbox (human edits/approves)
                                                   │
                                     Execution service (writes domain tables)
                                                   │
                                     Ledger row → applied (history/audit)
```

---

## 7. Agent Communication

The proposed linear pipeline is good; four upgrades make it scalable:

1. **The ledger is the bus.** Agents don't call each other. They read shared
   state and emit recommendations. A1 (Briefing) reads the ledger to compile
   the brief. Fully decoupled and auditable.
2. **Cadence/event-driven, not polling.** Triggers fire agents: "new check-in →
   enqueue A2 analysis," "Monday 7am → A1 weekly review." Use scheduled
   functions/cron now; graduate to event-driven later. Agents are stateless
   functions of `(entity, context) → recommendation`.
3. **Idempotent with dedup keys.** Same input → same recommendation, deduped —
   no proposal spam.
4. **Structured outputs.** Every advisor returns schema-validated JSON (tool
   use), so output is typed before it hits the ledger and can't corrupt it.

---

## 8. Automation Roadmap (what to automate, and how far)

| Tier | Processes | Rule |
|------|-----------|------|
| **Safe to fully automate** | KPI/data aggregation; morning-brief **generation**; check-in **analysis** (not the reply); reminder **scheduling**; content-calendar **drafting**; pipeline metric updates; dedup/idempotency | Deterministic or read-only/no external side effects. Generate freely; a human still chooses to send/publish. |
| **Requires human approval** | Client-facing messages; program changes; nutrition changes; sales follow-ups **sent** to leads; email campaigns; **published** social posts; price changes; onboarding steps that touch the client | Anything that reaches a client/lead or changes their plan. Route through the approval inbox with a risk tier. Graduate the highest-confidence, lowest-risk of these to auto **only after** weeks of clean human-approved history. |
| **Always manual** | Firing/refunding a client; medical/injury judgment; contracts/legal; final sales close; any money movement; handling a distressed or complaining client | High-stakes, relational, or irreversible. The AI may _prepare_ context, never _decide_. |

The risk tier lives **on each recommendation**, so the same pipeline handles all
three tiers — auto-apply, queue-for-approval, or flag-for-manual — by policy,
not by special-casing.

---

## 9. Scalability Review

- **Modular by advisor + service.** Adding an agent = a new folder under
  `lib/agents/` that reads the Context Assembler and writes the ledger. No
  changes to existing agents. New product/business = new entities + services;
  the pattern holds.
- **Multi-coach:** add a `Coaches` entity and scope every query by coach; the
  services layer is the natural place to enforce scoping. Roles (coach / VA /
  owner) gate the approval inbox.
- **VAs:** the approval inbox is exactly the surface a VA operates — they clear
  low-risk queues; you keep high-risk. The system already assumes a human
  approver; it just needs roles.
- **The real ceiling is Notion, not the agent design.** Notion API is
  ~3 req/s, latency-heavy, non-transactional. Fine to ~50 clients with caching.
  **Plan the Postgres (Supabase) migration** as a swap behind `lib/store` —
  which already abstracts the data source, so the migration doesn't touch
  analytics or agents. Decide the trigger now (e.g. >50 active clients, or
  agent read volume stressing rate limits), keep the store swappable.

---

## 10. Risks & Bottlenecks

1. **Notion as system-of-record at scale** — rate limits, latency, no
   transactions. _Biggest technical risk._ Mitigate: cache, batch, plan the
   Postgres swap; keep the store abstraction clean.
2. **Over-automation eroding trust/quality** — one bad auto-sent program or
   macro change harms a client and your reputation. Mitigate: strict tiers,
   guardrails, start read-only, earn automation.
3. **The single-approver bottleneck** — if everything needs your approval, you
   become the constraint the system was meant to remove. Mitigate: batch
   approvals, great inbox UX, graduate low-risk actions to auto, delegate tiers
   to a VA.
4. **LLM cost/latency creep** — 14 polling agents would be death by a thousand
   calls. Mitigate: consolidate to 4, event-driven not polling, prompt caching
   of shared context, cheap models for near-deterministic tasks.
5. **Prompt drift, no evals** — silent quality decay. Mitigate: versioned
   prompts + eval set + spot-checks + cost/quality logging.
6. **PII / client health data** — sensitive. Mitigate: password wall (done),
   real auth for multi-user, least-privilege keys, minimize PII sent to the LLM.
7. **Scope creep** — 14 agents is itself the symptom. Mitigate: ledger + 1
   advisor, prove ROI, expand deliberately.

---

## 11. Recommendations Before Development Begins

1. **Build Phase 0 first** — the Recommendation & Approval ledger, the inbox,
   and the execution service. It's the backbone the original design omits.
2. **Consolidate 14 → 4 advisors** + shared services + a comms capability.
3. **Draw a hard line between deterministic services and LLM advisors.** Never
   agentify math (pipeline, macros, revenue, risk). Extend `lib/analytics/*`.
4. **Put a risk tier on every recommendation** and let policy — not code
   branches — decide auto / approve / manual.
5. **Adopt from day one:** Context Assembler, structured outputs + schema
   validation, prompt versioning, and LLM cost/latency logging.
6. **Keep the store swappable and pre-decide the Notion→Postgres trigger.**
7. **Enforce idempotency/dedup** on every agent output (reuse the `convertLead`
   skip-hook pattern).
8. **Ship read-only value first (A1), never let an agent touch a client until
   it's proven itself in the approval inbox.**

The architecture you sketched is a good instinct wrapped around a costly default
(everything is an agent). Strip it to a strong shared-services core, four
advisors, and one approval backbone, and it will scale from one coach to a
company without a rewrite.
