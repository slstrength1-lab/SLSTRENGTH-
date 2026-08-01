/**
 * Open Food Facts — SECONDARY + BARCODE provider. The best free barcode/UPC
 * database; no API key. ODbL data (attribution required; do not redistribute a
 * merged database — see docs/nutrition). A descriptive User-Agent is mandatory.
 *
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
import type { Capability, FoodItem, NutrientProfile, NutrientKey, SearchOptions, Serving } from "../types";
import { num } from "../normalize";
import { Http } from "../http/client";
import { canonicalId, type NutritionProvider, type ProviderConfig } from "./provider";

const BASE = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,brands,serving_size,serving_quantity,nutriments";

// canonical key ← OFF nutriment field (all _100g values are grams except energy).
// factor converts grams → the canonical unit.
const MAP: Record<NutrientKey, { field: string; factor: number; kcal?: boolean }> = {
  calories: { field: "energy-kcal_100g", factor: 1, kcal: true },
  protein: { field: "proteins_100g", factor: 1 },
  carbs: { field: "carbohydrates_100g", factor: 1 },
  fat: { field: "fat_100g", factor: 1 },
  satFat: { field: "saturated-fat_100g", factor: 1 },
  transFat: { field: "trans-fat_100g", factor: 1 },
  fiber: { field: "fiber_100g", factor: 1 },
  sugar: { field: "sugars_100g", factor: 1 },
  addedSugar: { field: "added-sugars_100g", factor: 1 },
  sodium: { field: "sodium_100g", factor: 1e3 },
  cholesterol: { field: "cholesterol_100g", factor: 1e3 },
  potassium: { field: "potassium_100g", factor: 1e3 },
  calcium: { field: "calcium_100g", factor: 1e3 },
  iron: { field: "iron_100g", factor: 1e3 },
  magnesium: { field: "magnesium_100g", factor: 1e3 },
  zinc: { field: "zinc_100g", factor: 1e3 },
  phosphorus: { field: "phosphorus_100g", factor: 1e3 },
  vitaminA: { field: "vitamin-a_100g", factor: 1e6 },
  vitaminC: { field: "vitamin-c_100g", factor: 1e3 },
  vitaminD: { field: "vitamin-d_100g", factor: 1e6 },
  vitaminK: { field: "vitamin-k_100g", factor: 1e6 },
  vitaminE: { field: "vitamin-e_100g", factor: 1e3 },
  water: { field: "water_100g", factor: 1 },
  omega3: { field: "omega-3-fat_100g", factor: 1 },
  omega6: { field: "omega-6-fat_100g", factor: 1 },
};

interface RawProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
}

function profileFrom(n: Record<string, number | string> = {}): NutrientProfile {
  const out: NutrientProfile = {};
  for (const key of Object.keys(MAP) as NutrientKey[]) {
    const { field, factor, kcal } = MAP[key];
    const v = num(n[field]);
    if (v === undefined) continue;
    out[key] = kcal ? v : v * factor;
  }
  // energy fallback: kJ → kcal when kcal missing
  if (out.calories === undefined) {
    const kj = num(n["energy_100g"]) ?? num(n["energy-kj_100g"]);
    if (kj !== undefined) out.calories = kj / 4.184;
  }
  return out;
}

function mapProduct(p: RawProduct): FoodItem | null {
  if (!p.code) return null;
  const servings: Serving[] = [{ label: "100 g", grams: 100 }];
  const sg = num(p.serving_quantity);
  if (sg && sg > 0) {
    servings.unshift({ label: p.serving_size || `${sg} g`, grams: sg, amount: sg, unit: "g", isDefault: true });
  }
  return {
    id: canonicalId("off", p.code),
    provider: "off",
    providerFoodId: p.code,
    name: (p.product_name || "Unknown product").trim(),
    brand: p.brands?.split(",")[0]?.trim() || undefined,
    barcode: p.code,
    dataType: "branded",
    servings,
    defaultServing: servings.find((s) => s.isDefault) ?? servings[0],
    per100g: profileFrom(p.nutriments),
    source: "Open Food Facts (ODbL)",
    fetchedAt: new Date().toISOString(),
  };
}

export class OpenFoodFactsProvider implements NutritionProvider {
  readonly id = "off";
  readonly label = "Open Food Facts";
  readonly capabilities = new Set<Capability>(["search", "branded", "barcode"]);
  readonly enabled = true; // no key required
  private http: Http;
  private ua: string;

  constructor(cfg: ProviderConfig) {
    this.ua = cfg.userAgent || "SLStrengthOS-Nutrition/1.0";
    // OFF asks for polite use: ~ a few req/sec at most.
    this.http = new Http("off", { ratePerSec: 2, burst: 5, ...cfg });
  }

  private headers() {
    return { "User-Agent": this.ua, Accept: "application/json" };
  }

  async getByBarcode(barcode: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    try {
      const data = await this.http.json<{ status?: number; product?: RawProduct }>(
        `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
        { headers: this.headers(), signal: opts.signal },
      );
      if (data.status === 0 || !data.product) return null;
      return mapProduct({ ...data.product, code: data.product.code || barcode });
    } catch (e) {
      if ((e as { code?: string }).code === "not_found") return null;
      throw e;
    }
  }

  async getById(providerFoodId: string, opts?: SearchOptions): Promise<FoodItem | null> {
    // For OFF the product id IS the barcode.
    return this.getByBarcode(providerFoodId, opts);
  }

  async searchFoods(query: string, opts: SearchOptions = {}): Promise<FoodItem[]> {
    const url =
      `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=${opts.limit ?? 15}&fields=${FIELDS}`;
    const data = await this.http.json<{ products?: RawProduct[] }>(url, { headers: this.headers(), signal: opts.signal });
    return (data.products || []).map(mapProduct).filter((f): f is FoodItem => f !== null && Object.keys(f.per100g).length > 0);
  }
}
