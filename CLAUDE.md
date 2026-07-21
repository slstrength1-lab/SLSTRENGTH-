# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is a monorepo scaffold for an AI-driven sports performance ecosystem. The full folder structure and documentation are in place, but no application code has been written yet — there is no build, lint, or test tooling because there is nothing yet to build, lint, or test. Update this section (and add real commands below) once code actually lands, most likely in `wolves-nutrition/app`.

## Architecture

Nine top-level domains, in three layers — see the root `README.md` for the full explanation and a folder map:

- **Operating layer**: `performance-os/` (process, playbooks, roadmap, handoffs) and `claude-agents/` (the AI agent roster, coordinated by `claude-agents/master-coordinator`).
- **Product layer**: `wolves-nutrition/` (the nutrition app: frontend, API, Supabase, Netlify), `dashboards/` (coach/athlete/admin views), `automation/` (scripts, scheduled jobs, workflows).
- **Shared reference layer**: `prompt-library/` (prompts by discipline), `templates/` (starter templates), `knowledge-base/` (research library), `assets/` (shared brand/media).

Every folder has its own `README.md` explaining its purpose and, importantly, how it differs from similarly-named folders elsewhere (e.g. `automation/reporting` vs. `dashboards`, or `wolves-nutrition/assets` vs. root `assets/`). Read the local `README.md` before adding files to a folder — the distinctions are deliberate, not accidental overlap.

## Working here

- Don't create a new top-level folder without checking whether an existing domain already covers it — the structure was designed to avoid duplication between e.g. `knowledge-base` (reference material) and `performance-os/research` (original/active research).
- Keep naming kebab-case, matching existing folders.
- New Claude agents go under `claude-agents/<agent-name>/`, following the existing folders' pattern. New prompts go under `prompt-library/<category>/`, not at the top level.
- Once real code is added (build tooling, an actual app, tests), update this file with the real build/lint/test commands and keep this architecture section in sync with reality — do not let it go stale.
