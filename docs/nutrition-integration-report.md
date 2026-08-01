# Nutrition Data Integration Layer — Technical Report

**For:** HPOS (High Performance OS) + SL Strength Business OS
**Status:** PROPOSAL — awaiting approval before implementation
**Author:** SL Strength OS engineering
**Date:** 2026‑08‑01

> One nutrition service, referenced everywhere: college athletes, online clients, your own
> nutrition, future mobile/web, and every AI agent call the *same* `NutritionService`. Providers
> are swappable behind an interface; the app never knows which API answered.

---

## 1. Recommended APIs

After evaluating USDA FoodData Central, Open Food Facts, Nutritionix, FatSecret, Edamam, and
Spoonacular against all 20 ranking criteria, the recommended **free** trio is:

| Role | API | What it does best | Auth | Free limit | Commercial |
|---|---|---|---|---|---|
| **① Primary** | **USDA FoodData Central** | Whole foods, best micronutrients, authoritative US data | `data.gov` API key | ~1,000 req/hr/key (raisable) | ✅ CC0 public domain |
| **② Secondary + Barcode** | **Open Food Facts** | Barcode/UPC lookups, packaged & international foods | None (User‑Agent required) | ~100 req/min (polite use) | ✅ ODbL (attribution + share‑alike) |
| **③ Enrichment** | **FatSecret Platform API** | Branded foods, restaurant items, recipes, barcode redundancy | OAuth 2.0 (client id/secret) | **5,000 calls/day** (Basic, US) | ✅ with "Powered by FatSecret" attribution |

**Recipes/meal‑plans/grocery lists are built on top of this trio**, not bought: recipe nutrition =
sum of ingredient lookups through the same providers. A paid recipe API (Spoonacular/Edamam) is an
optional future provider slot, not a dependency.

---

## 2. Why they were selected

- **USDA FDC (primary):** The gold standard for accuracy and micronutrients. It is the only source
  with complete, lab‑measured micro profiles (vitamins A/C/D/K, iron, calcium, magnesium, potassium,
  zinc, phosphorus, cholesterol, etc.) for whole foods — exactly what athlete and clinical nutrition
  needs. Public‑domain (CC0), so zero licensing risk for commercial use across all your products.
  Actively maintained by the U.S. government → maximum long‑term reliability.
- **Open Food Facts (barcode/fallback):** The best **free** barcode database on earth (millions of
  products, global), no API key, and an offline‑friendly full data export. It fills USDA's weak spot
  (packaged/branded scanning) at $0. Crowdsourced, so it's the fallback, not the source of truth.
- **FatSecret (enrichment):** By far the most generous *commercial‑friendly* free tier of the
  branded/restaurant APIs — **5,000 calls/day vs. Nutritionix's ~200–500** — plus recipes, barcode,
  and clean OAuth docs. Covers restaurant/branded items USDA and OFF miss.

**Rejected:** *Nutritionix* (free tier gutted, no free commercial use, $50–$1,850+/mo — great NLP,
but not free); *Edamam* (free tier is dev‑only, low monthly cap, paid for commercial); *Spoonacular*
(excellent recipes/meal‑plan, but ~150 pts/day free and dev‑only). These become **optional future
providers** behind the same interface if/when a specific feature justifies a paid plan.

---

## 3. Pros and Cons

**USDA FoodData Central**
- ➕ Authoritative, best micros, CC0/commercial, free, reliable, large (Foundation + SR Legacy +
  FNDDS survey + ~1.5M branded). ➖ Branded data quality varies, no restaurant menus, no recipe
  endpoint, serving sizes need normalization, hourly rate cap.

**Open Food Facts**
- ➕ Barcode king, no key, free, global, offline export, active community. ➖ Crowdsourced accuracy
  varies, micros often incomplete, must send a User‑Agent, rate‑limited, **ODbL share‑alike** (see §8).

**FatSecret**
- ➕ 5,000/day free, branded + restaurant + recipes + barcode, solid docs, OAuth. ➖ Basic tier is
  US‑only, requires attribution, OAuth adds a little setup, premium is quote‑based.

---

## 4. Free Tier Limitations (summary)

| API | Key limits | Gotchas |
|---|---|---|
| USDA FDC | ~1,000 req/hr per key (can request higher); `DEMO_KEY` heavily throttled | Register a real key; batch where possible |
| Open Food Facts | ~100 req/min product reads / ~10 req/min search (polite‑use policy; IP ban if abused) | Mandatory `User-Agent`; use daily export for bulk work |
| FatSecret | **5,000 calls/day** (Basic), US dataset only | OAuth token refresh; attribution required; premium = no cap (quote) |

With caching (foods are effectively static, so 80–95% cache‑hit rates are normal), these limits
comfortably support **thousands of users**. See §5.

---

## 5. Expected Monthly Capacity

Assumptions: aggressive caching (canonical foods cached indefinitely; barcodes cached; searches
cached ~24h). Typical hit rate after warm‑up: **~90%**, so only ~10% of lookups reach a provider.

| Provider | Raw free ceiling | Effective lookups @ 90% cache | Realistic users supported |
|---|---|---|---|
| USDA (primary) | ~720K/day (1K/hr) | ~7.2M user‑lookups/day equivalent | Thousands, easily |
| OFF (barcode) | ~144K/day (100/min) | ~1.4M barcode‑scans/day equivalent | Thousands |
| FatSecret | 5,000/day | ~50K enrichment‑lookups/day | Hundreds–low thousands |

Practical monthly capacity at $0: **well beyond your current + near‑future roadmap** (personal +
college athletes + online clients). FatSecret's 5K/day is the first ceiling you'd hit at scale —
mitigated by routing most traffic to USDA/OFF and only using FatSecret for restaurant/branded misses.

---

## 6. Integration Strategy

- **Framework‑agnostic module.** Ships as pure TypeScript in `lib/nutrition/` inside SL Strength OS
  **now**, with *zero* Next.js/Notion coupling, so it lifts cleanly into a shared package
  (`@sl/nutrition`) for HPOS, mobile, and web **later** — no rewrite. This satisfies "one system
  everywhere" without prematurely standing up a separate deployed service (which we can do later by
  wrapping the same module in an API route/edge function).
- **Canonical model.** Every provider result is normalized to one `FoodItem` + `NutrientProfile`
  (per‑100g **and** per‑serving; consistent units), so callers never see provider‑specific shapes.
- **Automatic fallback.** `NutritionService` queries providers by priority with a circuit breaker:
  USDA → (miss/error) → OFF → (miss/error) → FatSecret. Barcode routes to OFF → FatSecret → USDA.
  Failure of one provider is invisible to the caller.
- **Cross‑cutting concerns** are centralized: caching, retry w/ exponential backoff, per‑provider
  rate‑limit token buckets, error taxonomy, and normalization all live in the service layer — never
  in feature code.
- **AI‑agent ready.** A small typed façade (`searchFoods`, `getByBarcode`, `analyzeRecipe`,
  `computeMealTotals`, …) is what every agent (Nutrition, Meal‑Planning, Recovery, Performance,
  Strength, Programming, Medical) calls. Agents get structured data, never raw HTTP.

---

## 7. Architecture Diagram

```
        SL Strength OS · HPOS · Mobile · Web · AI Agents
                 │  (all call ONE façade)
                 ▼
        ┌─────────────────────────────┐
        │      NutritionService       │  search / barcode / recipe / macros / totals
        └─────────────┬───────────────┘
                      │ uses
      ┌───────────────┼─────────────────────────────┐
      ▼               ▼                              ▼
 ┌─────────┐   ┌────────────┐               ┌────────────────┐
 │  Cache  │   │ RateLimiter │               │  Normalizer    │  → canonical FoodItem
 │ (LRU +  │   │ + Retry +   │               │ (units, per‑g/ │    + NutrientProfile
 │  Store) │   │ Circuit BR) │               │  per‑serving)  │
 └─────────┘   └────────────┘               └────────────────┘
                      │ ordered fallback
      ┌───────────────┼───────────────┬───────────────────────┐
      ▼               ▼               ▼                        ▼
 ┌──────────┐  ┌──────────────┐  ┌──────────────┐     ┌───────────────┐
 │ USDA     │  │ OpenFoodFacts│  │ FatSecret    │     │ Future:       │
 │ Provider │  │ Provider     │  │ Provider     │ ... │ Spoonacular/  │
 │ (primary)│  │ (barcode)    │  │ (enrichment) │     │ Edamam/custom │
 └──────────┘  └──────────────┘  └──────────────┘     └───────────────┘
      │               │               │
      ▼               ▼               ▼
  api.nal.usda.gov  world.off.org   platform.fatsecret.com
```

**Provider interface (design sketch):**
```ts
interface NutritionProvider {
  id: "usda" | "off" | "fatsecret" | string;
  capabilities: Set<"search" | "barcode" | "branded" | "restaurant" | "recipe" | "micros">;
  searchFoods(q: string, opts?): Promise<FoodItem[]>;
  getByBarcode(upc: string): Promise<FoodItem | null>;
  getById(providerFoodId: string): Promise<FoodItem | null>;
  // optional: analyzeIngredient(text) / getRecipe(id)
}
```

**Proposed folder structure:**
```
lib/nutrition/
  index.ts                 # public façade (the ONLY import feature code uses)
  service.ts               # NutritionService: fallback, orchestration
  types.ts                 # FoodItem, NutrientProfile, Serving, enums
  normalize.ts             # provider → canonical, unit math
  units.ts                 # metric/imperial + serving conversions
  cache/  store.ts memory.ts     # CacheStore interface + in‑memory LRU (Postgres/Redis later)
  http/   client.ts retry.ts ratelimit.ts circuit.ts
  providers/
    provider.ts            # NutritionProvider interface + registry
    usda.ts  openfoodfacts.ts  fatsecret.ts
  agents/  facade.ts        # thin, agent‑friendly helpers
  __tests__/               # per‑provider + service + fallback + conversions
docs/nutrition/            # generated docs (install, config, dev guide, add‑provider)
```

---

## 8. Security Review

- **No hardcoded keys.** All secrets via env vars: `USDA_FDC_API_KEY`, `FATSECRET_CLIENT_ID`,
  `FATSECRET_CLIENT_SECRET` (OFF needs none). Ship `.env.example`, startup validation, and clear
  "missing key → helpful message + graceful degradation" behavior (a missing FatSecret key simply
  disables that provider; USDA + OFF keep working).
- **Server‑side only.** All provider calls run server‑side (route handlers / server actions); keys
  never reach the browser or the mobile client. Mobile/web call *your* nutrition endpoints, not the
  vendors directly.
- **FatSecret IP allow‑list.** FatSecret can restrict by server IP — documented as an optional
  hardening step.
- **Licensing/legal:** USDA = CC0 (no obligations). FatSecret = display "Powered by FatSecret"
  attribution. **Open Food Facts = ODbL:** using nutrition *values* in‑app requires attribution;
  **redistributing a combined database** triggers share‑alike. Mitigation: treat OFF as a
  lookup/cache source, keep provider provenance on each record, show attribution, and do **not**
  publish a merged public database. (Flagged so it's a conscious choice, not an accident.)
- **Input hardening:** barcodes/queries validated and length‑capped before outbound calls; provider
  responses treated as untrusted and schema‑checked during normalization.

---

## 9. Cost Analysis

| Horizon | Providers | Monthly cost |
|---|---|---|
| **Now → thousands of users** | USDA + OFF + FatSecret (all free) + caching | **$0** |
| Heavy restaurant/branded scale | + FatSecret Premier (no cap) | Quote (only if 5K/day is exceeded) |
| Rich recipes/meal‑plans as a product | + Spoonacular/Edamam provider | Optional, usage‑based |
| Photo food recognition (future) | + vision provider or model | Separate, opt‑in |

The architecture means **cost is a per‑provider toggle**, never a rewrite. You start at $0 and only
pay when a *specific* premium capability earns its keep.

---

## 10. Long‑Term Recommendation

1. **Build the trio + abstraction now**, framework‑agnostic, in `lib/nutrition/`. It becomes the
   permanent backbone for every product and agent.
2. **Cache hard.** Persist the canonical cache (start in‑memory; add a Postgres/Redis `CacheStore`
   when you migrate off Notion) — this is what makes free tiers scale to thousands of users.
3. **Compute recipes/meal‑plans/grocery yourself** from ingredient lookups + your AI agents, rather
   than renting a recipe API — cheaper, and it keeps one source of truth.
4. **Keep providers swappable.** If USDA changes, or you add Spoonacular for meal‑plans, or a paid
   tier later — it's one file implementing `NutritionProvider`, zero changes to feature code.
5. **Extract to `@sl/nutrition` when HPOS needs it** — the module is designed for that lift from day
   one, so HPOS and SL Strength OS share the exact same nutrition brain.

---

### Decisions I need from you before building

1. **Trio confirmed?** USDA (primary) + Open Food Facts (barcode/fallback) + FatSecret (enrichment).
2. **Home:** build as a framework‑agnostic `lib/nutrition/` module in SL Strength OS now, designed to
   extract into a shared `@sl/nutrition` package for HPOS/mobile later. (vs. standalone service now.)
3. **Recipes:** compute from ingredient aggregation now (free); add Spoonacular/Edamam later only if
   needed. OK?
4. **Cache:** in‑memory LRU now + a `CacheStore` interface so Postgres/Redis drops in when you leave
   Notion. OK?
5. **Keys:** you'll create a free `data.gov` key and a free FatSecret app (id/secret). I'll provide
   exact signup steps + `.env.example`. OK?

On approval, I'll implement the full layer, wire the provider abstraction + fallback + caching + rate
limiting + tests, run and log every test, fix issues, and deliver the integration summary + docs.
