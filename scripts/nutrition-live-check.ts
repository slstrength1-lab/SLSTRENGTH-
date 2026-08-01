/**
 * Live validation — hits the REAL provider endpoints and prints a report. Run
 * this once your keys are set (locally or in the deploy env). Providers without
 * credentials are skipped, not failed. Open Food Facts needs no key, so it runs
 * everywhere with network access.
 *
 *   npx tsx scripts/nutrition-live-check.ts
 *
 * Env: USDA_FDC_API_KEY, FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET (optional)
 */
import { createNutritionService, nutritionConfigStatus } from "../lib/nutrition/config";

type Row = { check: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
const add = (check: string, status: Row["status"], detail: string) => {
  rows.push({ check, status, detail });
  console.log(`  ${status === "PASS" ? "✓" : status === "SKIP" ? "–" : "✗"} ${check} — ${detail}`);
};

async function main() {
  console.log("NUTRITION LAYER — LIVE VALIDATION\n" + "=".repeat(44));
  const status = nutritionConfigStatus();
  console.log("Providers:", status.providers.map((p) => `${p.id}${p.enabled ? "" : "(off)"}`).join(", "));
  status.warnings.forEach((w) => console.log("  !", w));

  const svc = createNutritionService();
  const usda = status.providers.find((p) => p.id === "usda")?.enabled;
  const fs = status.providers.find((p) => p.id === "fatsecret")?.enabled;

  // 1. Search (any provider) — whole food
  try {
    const foods = await svc.searchFoods("chicken breast", { limit: 3 });
    if (foods.length) add("search 'chicken breast'", "PASS", `${foods.length} results, top: "${foods[0].name}" (${foods[0].source}), ${Math.round(foods[0].per100g.calories ?? 0)} kcal/100g, ${foods[0].per100g.protein ?? "?"}g protein`);
    else add("search 'chicken breast'", "FAIL", "no results");
  } catch (e) {
    add("search 'chicken breast'", "FAIL", (e as Error).message);
  }

  // 2. Barcode (OFF/FatSecret) — a well-known UPC
  try {
    const f = await svc.getByBarcode("737628064502");
    if (f) add("barcode 737628064502", "PASS", `"${f.name}" via ${f.source}, ${Math.round(f.per100g.calories ?? 0)} kcal/100g`);
    else add("barcode 737628064502", "FAIL", "not found (try another UPC)");
  } catch (e) {
    add("barcode 737628064502", "FAIL", (e as Error).message);
  }

  // 3. Micronutrients (USDA) — requires key
  if (usda) {
    try {
      const foods = await svc.searchFoods("spinach raw", { limit: 1 });
      const p = foods[0]?.per100g ?? {};
      add("USDA micronutrients", p.iron !== undefined || p.vitaminK !== undefined ? "PASS" : "FAIL", `iron=${p.iron ?? "?"}mg, vitK=${p.vitaminK ?? "?"}µg, calcium=${p.calcium ?? "?"}mg`);
    } catch (e) {
      add("USDA micronutrients", "FAIL", (e as Error).message);
    }
  } else add("USDA micronutrients", "SKIP", "USDA_FDC_API_KEY not set");

  // 4. FatSecret enrichment — requires creds
  if (fs) {
    try {
      const foods = await svc.searchFoods("big mac", { limit: 2 });
      add("FatSecret restaurant/branded", foods.length ? "PASS" : "FAIL", foods.length ? `top: "${foods[0].name}"` : "no results");
    } catch (e) {
      add("FatSecret restaurant/branded", "FAIL", (e as Error).message);
    }
  } else add("FatSecret restaurant/branded", "SKIP", "FatSecret credentials not set");

  // 5. Recipe aggregation
  try {
    const { analyzeRecipe } = await import("../lib/nutrition/recipe");
    const r = await analyzeRecipe(svc, { ingredients: [{ query: "oats", amount: 80, unit: "g" }, { query: "banana", amount: 1, unit: "serving" }], servings: 1 });
    add("recipe aggregation", r.total.calories ? "PASS" : "FAIL", `${Math.round(r.total.calories ?? 0)} kcal total, ${r.unresolvedCount} unresolved`);
  } catch (e) {
    add("recipe aggregation", "FAIL", (e as Error).message);
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log("\n" + "=".repeat(44));
  console.log(`LIVE REPORT: ${pass} passed · ${fail} failed · ${skip} skipped`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Live check crashed:", e);
  process.exit(1);
});
