# Nutrition Data Integration Layer

The permanent nutrition backbone for **SL Strength OS, HPOS, athlete & client
plans, personal nutrition, and every AI agent**. One service, three free
providers behind a swappable interface, with automatic fallback, caching,
retries, and rate-limit protection.

> Framework-agnostic (`lib/nutrition/` — no Next.js/Notion imports in the core),
> so it lifts cleanly into a shared `@sl/nutrition` package for HPOS/mobile later
> with no rewrite.

- **①  USDA FoodData Central** — primary: whole foods + best micronutrients (free key)
- **②  Open Food Facts** — barcode/UPC + packaged foods (no key)
- **③  FatSecret** — restaurant/branded/recipes enrichment (free app, 5,000/day)

## Contents
- [Installation & Configuration](#installation--configuration)
- [Quick start](#quick-start)
- [API routes](#api-routes)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Adding / replacing a provider](#adding--replacing-a-provider)
- [Caching](#caching)
- [Testing](#testing)
- [Free-tier limits & known limitations](#free-tier-limits--known-limitations)
- [Maintenance guide](#maintenance-guide)

---

## Installation & Configuration

No new npm deps — the layer is pure TypeScript on `fetch`. It works **with zero
keys** (Open Food Facts needs none). Add keys to unlock the other two providers.

Copy `.env.example` → `.env.local` and fill in what you have:

```bash
USDA_FDC_API_KEY=          # free: https://fdc.nal.usda.gov/api-key-signup.html
FATSECRET_CLIENT_ID=       # free app: https://platform.fatsecret.com/platform-api
FATSECRET_CLIENT_SECRET=
NUTRITION_USER_AGENT=      # optional; identifies you to Open Food Facts
```

Check what's live at any time:

```bash
npm run nutrition:check        # live validation against real endpoints (needs network + keys)
# or GET /api/nutrition/status  in the running app
```

A **missing key disables only that provider** — the service keeps working on the
rest, and `nutritionConfigStatus()` returns a helpful warning telling you exactly
what to set and where to get it.

## Quick start

```ts
import { agents } from "@/lib/nutrition";

const foods = await agents.searchFoods("chicken breast");        // fallback across providers
const bar   = await agents.getByBarcode("737628064502");         // OFF → FatSecret → USDA
const full  = await agents.getFood("usda:171077");               // by canonical id

// nutrition for a portion
const per150g = agents.nutrientsFor(foods[0], 150);              // {calories, protein, ...}

// recipe / meal / day / week
const recipe = await agents.analyzeRecipe({
  ingredients: [{ query: "oats", amount: 80, unit: "g" }, { query: "banana", amount: 1, unit: "serving" }],
  servings: 1,
});
const day  = agents.dailyTotals([mealA, mealB, mealC]);          // profiles
const week = agents.weeklyTotals([day1, day2, /* ... */]);
```

Or hold the service directly (`getNutritionService()`), or build a custom one
(`createNutritionService({ providers, cache })`) for tests / a different cache.

## API routes

All under `/api/nutrition` (server-side, `nodejs` runtime). Coach-session gated by
the existing middleware.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/nutrition/status` | Which providers are live + config warnings |
| GET | `/api/nutrition/search?q=&limit=` | Food search (with fallback) |
| GET | `/api/nutrition/barcode?code=` | Barcode/UPC lookup |
| GET | `/api/nutrition/food/{id}` | Full nutrition for a canonical id (`usda:171077`) |
| POST | `/api/nutrition/recipe` | Recipe/meal nutrition from `{ ingredients, servings }` |

## Architecture

```
callers (OS · HPOS · mobile · web · AI agents)
        │  agents.* façade  /  getNutritionService()
        ▼
   NutritionService  ── cache ── rate-limit + retry + circuit ── normalize→canonical
        │  ordered fallback
        ▼
  USDA ▸ Open Food Facts ▸ FatSecret ▸ (future providers)
```

- **Canonical model** (`types.ts`): every provider normalizes to `FoodItem` +
  `NutrientProfile` (per-100 g source of truth; servings scale from it). Callers
  never see a provider's raw shape.
- **Automatic fallback** (`service.ts`): search/barcode/food try capable providers
  in priority order; a miss or error falls through to the next, invisibly.
- **Resilience** (`http/`): per-provider token-bucket rate limiter, exponential
  backoff retry, circuit breaker, request timeout. All clocks/`fetch` injectable.
- **Caching** (`cache/`): in-memory LRU + TTL by default; `CacheStore` interface
  for a Postgres/Redis backend later. Foods cache 30 days → free tiers scale far.

## Folder structure

```
lib/nutrition/
  index.ts             public API (import from here)
  types.ts             canonical FoodItem / NutrientProfile / Ingredient / …
  errors.ts            typed error taxonomy
  units.ts             metric/imperial + serving math
  normalize.ts         scale / sum / round profiles
  service.ts           NutritionService (fallback orchestration)
  config.ts            env → providers, status/health, singleton factory
  recipe.ts            recipe/meal/day/week aggregation
  history.ts           favorites + recents (pluggable FoodMemory)
  http-status.ts       NutritionError → HTTP status (for routes)
  cache/               CacheStore interface + in-memory LRU
  http/                client, ratelimit, retry(backoff in client), circuit
  providers/           provider.ts interface + usda / openfoodfacts / fatsecret
  agents/facade.ts     the surface AI agents use
app/api/nutrition/     status · search · barcode · food/[id] · recipe
scripts/
  nutrition-test.ts        offline suite  (npm run test:nutrition)
  nutrition-live-check.ts  live validation (npm run nutrition:check)
```

## Adding / replacing a provider

1. Implement `NutritionProvider` (see `providers/provider.ts`) in a new file —
   `id`, `label`, `capabilities`, `enabled`, and `searchFoods` / `getByBarcode` /
   `getById` returning canonical `FoodItem`s. Reuse the `Http` client for
   rate-limit/retry/circuit for free.
2. Register it in `config.ts` → `buildProviders()` (order = fallback priority).
3. Add any key to `.env.example` + `nutritionConfigStatus()`.

**No feature code changes** — everything already calls `NutritionService`.
Replacing a provider is the same: swap the class in `buildProviders()`.

## Caching

Default `MemoryCache` (LRU, per-entry TTL). To back it with a shared store at
scale, implement `CacheStore` (`cache/store.ts`) and pass it to
`createNutritionService({ cache })` (or `new NutritionService(providers, store)`).
TTLs live in `CACHE_TTL` (foods/barcodes 30 days, searches 1 day).

## Testing

```bash
npm run test:nutrition     # 27 offline tests, no network/keys — deterministic
npm run nutrition:check    # live validation against real endpoints (needs keys+network)
```

The offline suite injects a mock `fetch`, so it fully exercises normalization,
caching (TTL/LRU), rate limiting, retries, circuit breaking, per-provider mapping,
and automatic fallback — the failure paths you can't reliably hit against a live API.

## Free-tier limits & known limitations

| Provider | Free limit | Notes |
|---|---|---|
| USDA FDC | ~1,000 req/hr/key | Register a real key (DEMO_KEY is throttled). CC0 — commercial OK. |
| Open Food Facts | ~a few req/sec (polite) | No key; **User-Agent required**. ODbL — attribution; don't redistribute a merged DB. |
| FatSecret | 5,000 calls/day (Basic, US) | OAuth; **"Powered by FatSecret" attribution**; Basic is US-only. |

- Restaurant/branded coverage is best via FatSecret; USDA branded quality varies;
  OFF is crowdsourced (fallback, not source of truth).
- Recipes/meal-plans/grocery lists are **computed by aggregation** here, not via a
  paid recipe API — add a Spoonacular/Edamam provider later only if a specific
  feature needs it.
- Volume→mass uses ~1 g/ml unless a provider gives serving grams (it usually does).

## Maintenance guide

- **Keys rotate** in env only — never in code. `nutrition:check` confirms them.
- **Provider drift:** if a provider changes response shapes, only that one
  `providers/*.ts` file changes; the offline suite's fixtures make regressions
  obvious. Bump the fixture + mapping together.
- **Scaling past free tiers:** flip on FatSecret Premier (no cap) or add a paid
  provider — one file, no feature changes. Add a shared `CacheStore` first; it's
  the cheapest lever.
- **Attribution:** keep "Powered by FatSecret" and Open Food Facts credit visible
  wherever their data is shown.
