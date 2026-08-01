/**
 * Offline test suite for the Nutrition Integration Layer. Runs fully without
 * network or API keys by injecting a mock `fetch`, so it deterministically
 * exercises normalization, caching, rate limiting, retries, circuit breaking,
 * per-provider mapping, and automatic fallback. Produces a logged report.
 *
 *   npx tsx scripts/nutrition-test.ts
 */
import { MemoryCache } from "../lib/nutrition/cache/memory";
import { TokenBucket } from "../lib/nutrition/http/ratelimit";
import { CircuitBreaker } from "../lib/nutrition/http/circuit";
import { Http, type FetchLike } from "../lib/nutrition/http/client";
import { toGrams, gramsToOz, isMass, isVolume } from "../lib/nutrition/units";
import { scaleProfile, toPer100g, addProfiles, multiplyProfile, roundProfile, num } from "../lib/nutrition/normalize";
import { UsdaProvider } from "../lib/nutrition/providers/usda";
import { OpenFoodFactsProvider } from "../lib/nutrition/providers/openfoodfacts";
import { FatSecretProvider } from "../lib/nutrition/providers/fatsecret";
import { NutritionService } from "../lib/nutrition/service";
import { analyzeRecipe, ingredientGrams, sumProfiles } from "../lib/nutrition/recipe";
import { nutritionConfigStatus } from "../lib/nutrition/config";
import { calcTargets, splitAcrossMeals, comparePlan } from "../lib/nutrition/planning";
import { InMemoryFoodMemory } from "../lib/nutrition/history";
import type { NutritionProvider } from "../lib/nutrition/providers/provider";
import type { Capability, FoodItem } from "../lib/nutrition/types";

/* ---- tiny test harness ------------------------------------------------ */
type Result = { name: string; ok: boolean; error?: string };
const results: Result[] = [];
let current = "";
async function test(name: string, fn: () => void | Promise<void>) {
  current = name;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: (e as Error).message });
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}
function group(g: string) {
  console.log(`\n▸ ${g}`);
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}
function near(a: number | undefined, b: number, tol: number, msg: string) {
  assert(typeof a === "number" && Math.abs(a - b) <= tol, `${msg} (got ${a}, want ~${b})`);
}

/* ---- mock fetch -------------------------------------------------------- */
type Route = { match: (url: string) => boolean; respond: (url: string) => { status?: number; json?: unknown; throw?: Error } };
function mockFetch(routes: Route[]): FetchLike {
  return async (url: string) => {
    for (const r of routes) {
      if (r.match(url)) {
        const out = r.respond(url);
        if (out.throw) throw out.throw;
        return new Response(JSON.stringify(out.json ?? {}), { status: out.status ?? 200, headers: { "content-type": "application/json" } });
      }
    }
    return new Response("no route", { status: 404 });
  };
}
const noSleep = async () => {};
const fixedClock = (t = 1_000_000) => () => t;

/* ---- fixtures ---------------------------------------------------------- */
const usdaSearch = {
  foods: [
    {
      fdcId: 171077,
      description: "Chicken breast, raw",
      dataType: "Foundation",
      servingSize: 120,
      servingSizeUnit: "g",
      foodNutrients: [
        { nutrientNumber: "1008", unitName: "KCAL", value: 120 },
        { nutrientNumber: "1003", unitName: "G", value: 22.5 },
        { nutrientNumber: "1004", unitName: "G", value: 2.6 },
        { nutrientNumber: "1005", unitName: "G", value: 0 },
        { nutrientNumber: "1093", unitName: "MG", value: 45 },
        { nutrientNumber: "1092", unitName: "MG", value: 334 },
        { nutrientNumber: "1114", unitName: "UG", value: 0.2 },
        { nutrientNumber: "1162", unitName: "MG", value: 0 },
      ],
    },
  ],
};
const offProduct = {
  status: 1,
  product: {
    code: "737628064502",
    product_name: "Thai peanut noodle kit",
    brands: "Simply Asia",
    serving_quantity: 85,
    nutriments: {
      "energy-kcal_100g": 389,
      proteins_100g: 11,
      carbohydrates_100g: 71,
      fat_100g: 6.7,
      fiber_100g: 3.6,
      sugars_100g: 8,
      sodium_100g: 0.6, // grams → 600 mg
      calcium_100g: 0.04, // grams → 40 mg
      "vitamin-c_100g": 0.006, // grams → 6 mg
      "vitamin-a_100g": 0.0004, // grams → 400 µg
    },
  },
};
const fsToken = { access_token: "tok", expires_in: 3600 };
const fsFoodGet = {
  food: {
    food_id: "35755",
    food_name: "Almonds",
    brand_name: "Generic",
    food_type: "Generic",
    servings: {
      serving: [
        { serving_description: "100 g", metric_serving_amount: "100.0", metric_serving_unit: "g", calories: "579", protein: "21.15", carbohydrate: "21.55", fat: "49.93", fiber: "12.5", sodium: "1", calcium: "269", iron: "3.71", vitamin_c: "0" },
        { serving_description: "1 oz (23 whole)", metric_serving_amount: "28.35", metric_serving_unit: "g", calories: "164", protein: "6", carbohydrate: "6.1", fat: "14.2" },
      ],
    },
  },
};

/* ---- run --------------------------------------------------------------- */
async function main() {
  console.log("NUTRITION INTEGRATION LAYER — OFFLINE TEST SUITE\n" + "=".repeat(52));

  group("Unit conversions");
  await test("grams identity + oz/lb", () => {
    near(toGrams(1, "oz"), 28.3495, 0.01, "1 oz");
    near(toGrams(1, "lb"), 453.592, 0.01, "1 lb");
    near(toGrams(2, "cup"), 473.176, 0.1, "2 cups (as ml, density 1)");
    near(gramsToOz(56.699), 2, 0.01, "grams→oz");
    assert(isMass("oz") && !isVolume("oz"), "oz is mass");
    assert(isVolume("tbsp") && !isMass("tbsp"), "tbsp is volume");
  });

  group("Profile math");
  await test("scale + inverse round-trip", () => {
    const per100 = { calories: 200, protein: 20 };
    const at50 = scaleProfile(per100, 50);
    near(at50.calories, 100, 0.001, "scale calories");
    const back = toPer100g(at50, 50);
    near(back.calories, 200, 0.001, "inverse to per100g");
  });
  await test("add + multiply + round", () => {
    const sum = addProfiles({ calories: 100, protein: 10 }, { calories: 50, fat: 5 });
    near(sum.calories, 150, 0.001, "sum calories");
    near(sum.protein, 10, 0.001, "protein carried");
    near(sum.fat, 5, 0.001, "fat carried");
    near(multiplyProfile({ calories: 300 }, 1 / 3).calories, 100, 0.001, "per-serving");
    assert(roundProfile({ calories: 149.7, iron: 0.234 }).calories === 150, "round calories 0dp");
    assert(roundProfile({ iron: 0.234 }).iron === 0.23, "round micro 2dp");
    assert(num("12.5") === 12.5 && num("x") === undefined, "num coercion");
  });

  group("MemoryCache (TTL + LRU)");
  await test("set/get/expire/evict", async () => {
    let t = 0;
    const c = new MemoryCache({ max: 2, now: () => t });
    await c.set("a", 1, 1000);
    assert((await c.get<number>("a")) === 1, "get a");
    t = 1001;
    assert((await c.get("a")) === undefined, "a expired");
    t = 0;
    await c.set("x", 1);
    await c.set("y", 2);
    await c.get("x"); // touch x → y now oldest
    await c.set("z", 3); // evicts oldest (y)
    assert((await c.get("y")) === undefined, "y evicted (LRU)");
    assert((await c.get("x")) === 1 && (await c.get("z")) === 3, "x,z retained");
  });

  group("Rate limiter (token bucket)");
  await test("burst then throttle then refill", () => {
    let t = 0;
    const b = new TokenBucket(2, 1, () => t); // 2 burst, 1/sec
    assert(b.take().ok && b.take().ok, "2 bursts ok");
    const third = b.take();
    assert(!third.ok && third.waitMs > 0, "3rd throttled with wait");
    t = 1000; // 1s later → +1 token
    assert(b.take().ok, "refilled after 1s");
  });

  group("Circuit breaker");
  await test("opens after threshold, half-opens after cooldown, closes on success", () => {
    let t = 0;
    const cb = new CircuitBreaker(3, 5000, () => t);
    assert(cb.canRequest(), "closed initially");
    cb.failure(); cb.failure(); cb.failure();
    assert(!cb.canRequest(), "open after 3 failures");
    t = 5001;
    assert(cb.canRequest(), "half-open after cooldown");
    cb.success();
    assert(cb.state() === "closed" && cb.canRequest(), "closed after success");
  });

  group("HTTP client (retry / status mapping / circuit)");
  await test("200 returns json", async () => {
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => ({ json: { ok: 1 } }) }]) });
    const r = await http.json<{ ok: number }>("https://x/");
    assert(r.ok === 1, "json body");
  });
  await test("404 → not_found (no retry)", async () => {
    let calls = 0;
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => { calls++; return { status: 404 }; } }]) });
    let code = "";
    await http.json("https://x/").catch((e) => (code = e.code));
    assert(code === "not_found" && calls === 1, "not_found, single call");
  });
  await test("500 retries then throws provider error", async () => {
    let calls = 0;
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => { calls++; return { status: 500 }; } }]) });
    let code = "";
    await http.json("https://x/", { retries: 2 }).catch((e) => (code = e.code));
    assert(code === "provider" && calls === 3, `retried 3x (got ${calls})`);
  });
  await test("recovers on 2nd attempt", async () => {
    let calls = 0;
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => { calls++; return calls === 1 ? { status: 503 } : { json: { ok: 1 } }; } }]) });
    const r = await http.json<{ ok: number }>("https://x/");
    assert(r.ok === 1 && calls === 2, "succeeded after 1 retry");
  });
  await test("429 → rate_limit", async () => {
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => ({ status: 429 }) }]) });
    let code = "";
    await http.json("https://x/", { retries: 0 }).catch((e) => (code = e.code));
    assert(code === "rate_limit", "rate_limit code");
  });
  await test("network throw is retried then wrapped", async () => {
    let calls = 0;
    const http = new Http("t", { ratePerSec: 100, burst: 100, sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch([{ match: () => true, respond: () => { calls++; return { throw: new Error("ECONNRESET") }; } }]) });
    let code = "";
    await http.json("https://x/", { retries: 1 }).catch((e) => (code = e.code));
    assert(code === "network" && calls === 2, `network wrapped, retried (${calls})`);
  });

  group("USDA provider mapping");
  await test("search maps nutrients per 100g + serving", async () => {
    const p = new UsdaProvider({ usdaApiKey: "k", sleep: noSleep, fetchImpl: mockFetch([{ match: (u) => u.includes("/foods/search"), respond: () => ({ json: usdaSearch }) }]) });
    const [f] = await p.searchFoods("chicken");
    assert(f.provider === "usda" && f.id === "usda:171077", "canonical id");
    near(f.per100g.calories, 120, 0.001, "kcal");
    near(f.per100g.protein, 22.5, 0.001, "protein");
    near(f.per100g.sodium, 45, 0.001, "sodium mg");
    near(f.per100g.potassium, 334, 0.001, "potassium mg");
    near(f.per100g.vitaminD, 0.2, 0.001, "vit D µg");
    assert(f.defaultServing?.grams === 120, "120g serving");
    assert(f.dataType === "foundation", "foundation type");
  });
  await test("barcode matches gtinUpc", async () => {
    const branded = { foods: [{ fdcId: 1, description: "Bar", dataType: "Branded", gtinUpc: "0737628064502", foodNutrients: [{ nutrientNumber: "1008", unitName: "KCAL", value: 250 }] }] };
    const p = new UsdaProvider({ usdaApiKey: "k", sleep: noSleep, fetchImpl: mockFetch([{ match: (u) => u.includes("/foods/search"), respond: () => ({ json: branded }) }]) });
    const f = await p.getByBarcode("737628064502");
    assert(f?.barcode === "0737628064502", "matched by UPC (leading-zero tolerant)");
  });

  group("Open Food Facts provider mapping");
  await test("barcode maps + g→mg/µg conversions", async () => {
    const p = new OpenFoodFactsProvider({ sleep: noSleep, fetchImpl: mockFetch([{ match: (u) => u.includes("/api/v2/product/"), respond: () => ({ json: offProduct }) }]) });
    const f = await p.getByBarcode("737628064502");
    assert(f?.provider === "off", "off provider");
    near(f?.per100g.calories, 389, 0.001, "kcal");
    near(f?.per100g.sodium, 600, 0.001, "sodium g→mg");
    near(f?.per100g.calcium, 40, 0.001, "calcium g→mg");
    near(f?.per100g.vitaminC, 6, 0.001, "vit C g→mg");
    near(f?.per100g.vitaminA, 400, 0.001, "vit A g→µg");
    assert(f?.defaultServing?.grams === 85, "serving grams");
  });

  group("FatSecret provider mapping");
  await test("token + food.get.v4 per-serving → per100g", async () => {
    const routes: Route[] = [
      { match: (u) => u.includes("connect/token"), respond: () => ({ json: fsToken }) },
      { match: (u) => u.includes("food.get"), respond: () => ({ json: fsFoodGet }) },
    ];
    const p = new FatSecretProvider({ fatSecretClientId: "i", fatSecretClientSecret: "s", sleep: noSleep, now: fixedClock(), fetchImpl: mockFetch(routes) });
    const f = await p.getById("35755");
    assert(f?.provider === "fatsecret", "fatsecret provider");
    near(f?.per100g.calories, 579, 0.5, "kcal per100g from 100g serving");
    near(f?.per100g.protein, 21.15, 0.01, "protein");
    near(f?.per100g.calcium, 269, 0.5, "calcium mg");
    assert(f!.servings.length >= 2, "multiple servings parsed");
  });

  group("Service fallback + cache");
  const mkProvider = (id: string, caps: Capability[], impl: Partial<NutritionProvider>): NutritionProvider => ({
    id, label: id, enabled: true, capabilities: new Set(caps),
    searchFoods: async () => [], getByBarcode: async () => null, getById: async () => null, ...impl,
  });
  const food = (id: string): FoodItem => ({ id: `${id}:1`, provider: id, providerFoodId: "1", name: id, dataType: "generic", servings: [{ label: "100 g", grams: 100 }], per100g: { calories: 100, protein: 10 }, source: id, fetchedAt: "" });

  await test("provider A throws → B answers; both logged", async () => {
    const events: string[] = [];
    let bCalls = 0;
    const svc = new NutritionService(
      [
        mkProvider("a", ["search"], { searchFoods: async () => { throw new Error("boom"); } }),
        mkProvider("b", ["search"], { searchFoods: async () => { bCalls++; return [food("b")]; } }),
      ],
      new MemoryCache(),
      { logger: (e) => events.push(`${e.op}:${e.provider}:${e.ok}`) },
    );
    const r = await svc.searchFoods("eggs");
    assert(r[0].provider === "b" && bCalls === 1, "fell over to B");
    assert(events.includes("search:a:false") && events.includes("search:b:true"), "both logged");
  });
  await test("second call is served from cache (no provider hit)", async () => {
    let calls = 0;
    const svc = new NutritionService([mkProvider("a", ["search"], { searchFoods: async () => { calls++; return [food("a")]; } })], new MemoryCache());
    await svc.searchFoods("rice");
    await svc.searchFoods("rice");
    assert(calls === 1, `cached (provider called ${calls}x)`);
  });
  await test("all providers fail → AllProvidersFailedError", async () => {
    const svc = new NutritionService([mkProvider("a", ["search"], { searchFoods: async () => { throw new Error("x"); } })], new MemoryCache());
    let name = "";
    await svc.searchFoods("beef").catch((e) => (name = e.name));
    assert(name === "AllProvidersFailedError", "all failed error");
  });
  await test("barcode prefers OFF ordering", async () => {
    const order: string[] = [];
    const svc = new NutritionService(
      [
        mkProvider("usda", ["barcode"], { getByBarcode: async () => { order.push("usda"); return null; } }),
        mkProvider("off", ["barcode"], { getByBarcode: async () => { order.push("off"); return food("off"); } }),
      ],
      new MemoryCache(),
    );
    const f = await svc.getByBarcode("737628064502");
    assert(f?.provider === "off" && order[0] === "off", "OFF tried first");
  });
  await test("getFood routes by canonical id prefix", async () => {
    const svc = new NutritionService([mkProvider("usda", ["search"], { getById: async (fid) => food(`usda#${fid}`) })], new MemoryCache());
    const f = await svc.getFood("usda:12345");
    assert(f?.name === "usda#12345", "routed to usda.getById with id");
  });
  await test("validation errors", async () => {
    const svc = new NutritionService([mkProvider("a", ["search"], {})], new MemoryCache());
    let e1 = "", e2 = "", e3 = "";
    await svc.searchFoods("x").catch((e) => (e1 = e.code));
    await svc.getByBarcode("123").catch((e) => (e2 = e.code));
    await svc.getFood("noprefix").catch((e) => (e3 = e.code));
    assert(e1 === "validation" && e2 === "validation" && e3 === "validation", "all validation");
  });

  group("Recipes, meals, totals");
  await test("ingredientGrams: mass, serving, servingLabel", () => {
    const f = food("x");
    f.servings = [{ label: "100 g", grams: 100 }, { label: "1 cup", grams: 240 }];
    f.defaultServing = f.servings[0];
    near(ingredientGrams(f, { amount: 2, unit: "oz" }), 56.699, 0.01, "2 oz");
    near(ingredientGrams(f, { amount: 3, unit: "serving" }), 300, 0.001, "3 servings");
    near(ingredientGrams(f, { amount: 2, servingLabel: "1 cup" }), 480, 0.001, "2 cups");
  });
  await test("analyzeRecipe sums + per-serving + unresolved", async () => {
    const svc = new NutritionService(
      [mkProvider("a", ["search"], { searchFoods: async (q) => (q.includes("nothing") ? [] : [food("a")]) })],
      new MemoryCache(),
    );
    const r = await analyzeRecipe(svc, { ingredients: [{ query: "oats", amount: 100, unit: "g" }, { query: "milk", amount: 200, unit: "g" }, { query: "nothing here", amount: 1 }], servings: 2 });
    near(r.total.calories, 300, 0.001, "sum of 100g+200g @100kcal/100g");
    near(r.perServing.calories, 150, 0.001, "per serving /2");
    assert(r.unresolvedCount === 1, "one unresolved");
  });
  await test("sumProfiles totals", () => {
    const t = sumProfiles([{ calories: 100 }, { calories: 250, protein: 30 }]);
    assert(t.entries === 2, "entry count");
    near(t.total.calories, 350, 0.001, "day total");
  });

  group("Config + history");
  await test("config status reflects env", () => {
    const s = nutritionConfigStatus();
    assert(s.ready === true, "OFF keeps it ready");
    assert(s.providers.find((p) => p.id === "off")?.enabled === true, "OFF always enabled");
    assert(typeof s.warnings.length === "number", "warnings present when keys missing");
  });
  await test("favorites + recents", async () => {
    const m = new InMemoryFoodMemory(3);
    await m.addFavorite("u1", food("a"));
    assert((await m.listFavorites("u1")).length === 1, "one favorite");
    for (const id of ["a", "b", "c", "d"]) await m.recordRecent("u1", { ...food(id), id: `${id}:1` });
    const recents = await m.listRecent("u1");
    assert(recents.length === 3 && recents[0].id === "d:1", "recents capped + newest first");
  });

  group("Planning (macro targets)");
  await test("Mifflin–St Jeor + goal split", () => {
    // 90 kg male, 180 cm, 30 y, moderate, cut
    const t = calcTargets({ sex: "male", age: 30, weight: 90, height: 180, activity: "moderate", goal: "lose" });
    near(t.bmr, 1880, 2, "BMR"); // 10*90 + 6.25*180 - 5*30 + 5 = 1880
    near(t.tdee, 2914, 5, "TDEE = BMR*1.55");
    near(t.calories, 2331, 5, "cut = TDEE*0.8");
    near(t.protein, 216, 1, "2.4 g/kg protein");
    assert(t.carbs > 0 && t.fat >= 0.6 * 90, "fat floor + carbs fill remainder");
    // macro calories should reconcile to total (within rounding)
    near(t.protein * 4 + t.carbs * 4 + t.fat * 9, t.calories, 12, "macros ≈ calories");
  });
  await test("lb/in units + maintain", () => {
    const t = calcTargets({ sex: "female", age: 28, weight: 150, weightUnit: "lb", height: 65, heightUnit: "in", activity: "light", goal: "maintain" });
    near(t.weightKg, 68, 0.5, "lb→kg");
    near(t.protein, 136, 2, "2.0 g/kg");
    assert(Math.abs(t.calories - t.tdee) < 2, "maintain ≈ TDEE");
  });
  await test("split + compare", () => {
    const t = calcTargets({ sex: "male", age: 25, weight: 80, height: 175, activity: "very", goal: "gain" });
    const meals = splitAcrossMeals(t, 4);
    assert(meals.length === 4, "4 meals");
    near(meals.reduce((n, m) => n + m.protein, 0), t.protein, 4, "meal protein sums to target");
    const cmp = comparePlan(t, { calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat });
    assert(cmp.protein.pct === 100 && cmp.calories.pct === 100, "on-target = 100%");
  });

  /* ---- report ---------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log("\n" + "=".repeat(52));
  console.log(`TEST REPORT: ${passed}/${results.length} passed, ${failed} failed`);
  if (failed) {
    console.log("\nFailures:");
    for (const r of results.filter((r) => !r.ok)) console.log(`  ✗ ${r.name}: ${r.error}`);
    process.exit(1);
  }
  console.log("ALL TESTS PASSED ✓");
}

main().catch((e) => {
  console.error("SUITE CRASHED in:", current, "\n", e);
  process.exit(1);
});
