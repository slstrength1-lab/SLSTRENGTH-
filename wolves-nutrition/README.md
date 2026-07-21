# wolves-nutrition

Wolves Nutrition — the nutrition product: a full-stack app for meal planning, recipes, and supplement guidance, backed by Supabase and deployed on Netlify.

| Folder | Purpose |
|---|---|
| `app/` | Frontend application code (pages/routes, app entry points) |
| `components/` | Shared UI components used across the app |
| `database/` | Schema definitions, migrations, and seed data (source of truth; mirrors `supabase/`) |
| `supabase/` | Supabase project config, edge functions, and generated types |
| `netlify/` | Netlify config, functions, and deploy settings |
| `api/` | API route handlers / server-side logic |
| `meal-plans/` | Meal-plan templates and generation logic |
| `recipes/` | Recipe data and related logic |
| `supplements/` | Supplement guidance data and logic |
| `nutrition-engine/` | Core calculation logic (macros, calories, recommendations) consumed by the app |
| `assets/` | Media used inside the app itself (as opposed to brand assets in the root `/assets`) |
| `docs/` | App-specific documentation: setup, environment variables, deployment |

## Status

Scaffolding only — no application code has been added yet. See `docs/README.md` for setup instructions once code lands here.
