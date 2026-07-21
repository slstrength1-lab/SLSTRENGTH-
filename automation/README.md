# automation

Cross-cutting scripts and workflows that glue the other systems together — the automation layer, as opposed to `dashboards` (read-only views) or the product code in `wolves-nutrition`.

| Folder | Purpose |
|---|---|
| `python/` | Python scripts and jobs |
| `javascript/` | Node/JS scripts and jobs |
| `github-actions/` | CI/CD workflow definitions (`.yml` files, mirrored into `.github/workflows` when active) |
| `n8n/` | Exported n8n workflow definitions |
| `scripts/` | One-off or ad-hoc scripts that don't belong to a scheduled job |
| `cron/` | Scheduled job definitions and the scripts they run |
| `email/` | Email-sending logic and templates used by other automations |
| `reporting/` | Scripts that generate recurring reports (as opposed to `dashboards`, which are interactive) |
