# SL Strength OS

The operating system for **SL Strength** — Shane Lanteigne's premium online coaching business.

This repository documents the **data architecture** of the business, which lives in
Notion. Phase 1 is the foundation: the connected set of databases that every future
workflow, automation, and AI agent will plug into.

> Phase 1 is architecture only. Automation comes later — first we build the structure
> everything else connects to.

## Where it lives

- **Notion workspace:** Shane Lanteigne's Space
- **Hub page:** [🏋️ SL Strength OS](https://app.notion.com/p/3a9a58f71c0f810599e7eb3abbc017fd)
- **Daily dashboard:** [🏆 SL Strength Command Center](https://app.notion.com/p/3a9a58f71c0f81a185e0e63d5fd04d87)
  — the one page Shane opens each day (see [`docs/command-center.md`](docs/command-center.md))

## The seven databases

| Database | Purpose |
|---|---|
| 👥 **Clients** | The CRM heart — every active, paused, and past coaching client |
| 🎯 **Leads** | The sales pipeline — prospects from first contact to close |
| 💰 **Sales** | Every transaction, payment, and revenue record |
| 📊 **Check-ins** | Weekly client accountability and progress tracking |
| 🏋️ **Programs** | Individualized training programs assigned to clients |
| 🎬 **Content** | The content pipeline across all platforms |
| 📈 **Business Metrics** | Weekly KPI snapshots for the whole business |

**Clients** is the hub. Leads, Sales, Check-ins, and Programs all relate back to it, and
Clients rolls up each person's `Lifetime Revenue` and `Total Check-ins`.

See [`docs/architecture.md`](docs/architecture.md) for the full schema, relation map,
data source IDs, and views — the connection reference for building automation on top of
this foundation.

## Operating principles

- Premium coaching experience
- High-touch where it matters
- Automation for repetitive tasks
- AI-assisted decision making
- Simple systems before complex automation
