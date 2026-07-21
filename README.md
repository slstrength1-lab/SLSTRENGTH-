# SLSTRENGTH- — AI Performance Ecosystem

Sports performance, built as one connected system: the operating procedures that run a performance program, the product that puts nutrition guidance in athletes' hands, the dashboards that make data legible, the automation that keeps it all running, and the Claude agents that do the work alongside the humans.

## Vision

Most performance programs run on a patchwork of spreadsheets, group chats, and one-off scripts. This repository is an attempt to run one instead: a single place where process (`performance-os`), product (`wolves-nutrition`), visualization (`dashboards`), automation, and AI agents share the same reference library and the same conventions, so nothing lives only in one person's head.

## Architecture

The repository is organized as a monorepo of nine top-level domains. They fall into three layers:

**Operating layer** — how the program runs day to day
- [`performance-os/`](performance-os/) — process, playbooks, roadmap, and handoffs. The "how we work" layer.
- [`claude-agents/`](claude-agents/) — the AI agent roster (strength coach, sports scientist, nutritionist, recovery, recruiting, content, video analysis, coding assistant) coordinated by a `master-coordinator`.

**Product layer** — what athletes and staff actually use
- [`wolves-nutrition/`](wolves-nutrition/) — the nutrition app (frontend, API, Supabase backend, Netlify hosting).
- [`dashboards/`](dashboards/) — read-oriented views for coaches, athletes, and admins.
- [`automation/`](automation/) — scripts, scheduled jobs, and workflows that connect the other systems.

**Shared reference layer** — material every domain above draws on
- [`prompt-library/`](prompt-library/) — reusable prompts, organized by discipline.
- [`templates/`](templates/) — starter templates for documents, prompts, reports, and code.
- [`knowledge-base/`](knowledge-base/) — the research library (papers, ISSN/GSSI/NCAA resources, books, articles, videos).
- [`assets/`](assets/) — shared brand and media assets.

Each folder's own `README.md` explains its purpose in more detail and, where useful, maps its subfolders.

## Folder map

```
.
├── performance-os/       process, playbooks, roadmap, handoffs
├── wolves-nutrition/     the nutrition app (frontend, API, Supabase, Netlify)
├── dashboards/           coach / athlete / admin dashboards
├── automation/           scripts, scheduled jobs, workflows
├── claude-agents/        AI agent roster + master coordinator
├── prompt-library/       reusable prompts by discipline
├── templates/            document / prompt / report / code templates
├── knowledge-base/       research papers, ISSN, GSSI, NCAA, books, articles, videos
└── assets/               shared brand and media assets
```

## Getting started

This repository is currently in its **scaffolding phase**: the folder structure, conventions, and documentation are in place, but the `wolves-nutrition` app, dashboards, and automation scripts have not been built yet. To find your way around:

1. Read this README and `performance-os/systems/README.md` for the big picture.
2. Pick the domain folder relevant to your task and read its `README.md`.
3. Follow the naming and placement conventions already established there — every folder explains not just what it holds, but what it *doesn't* (e.g. how `automation/reporting` differs from `dashboards`).

There is no build, lint, or test command yet because there is no application code yet. Once real code lands in a folder (most likely `wolves-nutrition/app` first), add real commands here and in `CLAUDE.md`.

## Technology stack

Intended stack, to be confirmed as each piece is actually built:

- **wolves-nutrition**: Next.js (or similar) frontend, Supabase (Postgres + edge functions) for the backend, Netlify for hosting/deploy.
- **automation**: Python and Node scripts, GitHub Actions for CI/CD, n8n for visual workflows.
- **claude-agents**: Claude, orchestrated via a master-coordinator agent, drawing on `prompt-library` and `knowledge-base`.
- **dashboards**: to be determined alongside `wolves-nutrition`'s frontend choice, likely sharing components.

## Roadmap

See [`performance-os/roadmap/`](performance-os/roadmap/) for the living roadmap. At a high level:

1. **Scaffolding** (current) — repository structure, conventions, and documentation.
2. **Wolves Nutrition MVP** — first working version of the nutrition app on Supabase + Netlify.
3. **Agent rollout** — bring the `claude-agents` roster online against real prompt-library content.
4. **Dashboards** — coach and athlete views on top of live data.
5. **Automation** — scheduled reporting, n8n workflows, CI/CD.

## Contribution guide

- Match the placement conventions already documented in each folder's `README.md` rather than introducing a new top-level folder — if something doesn't fit, raise it before adding one.
- Keep naming kebab-case, matching the existing folders.
- New Claude agents follow the pattern in `claude-agents/<agent-name>/README.md`; new prompts are categorized under `prompt-library/<category>/`, not left at the top level.
- Update a folder's `README.md` when its purpose or contents change materially — stale documentation is worse than none.
- Update `CLAUDE.md` whenever real build/lint/test tooling is introduced.

## Version history

- **v0.1.0** — Initial ecosystem scaffold: full monorepo folder structure, per-folder documentation, MIT license, and `.gitignore` established. No application code yet.
