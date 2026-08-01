/**
 * USDA FoodData Central — PRIMARY provider. Authoritative whole foods + the best
 * micronutrient coverage; CC0 public-domain (free for commercial use). Needs a
 * free api.data.gov key (USDA_FDC_API_KEY).
 *
 * Docs: https://fdc.nal.usda.gov/api-guide.html
 */
import type { Capability, FoodItem, NutrientProfile, NutrientKey, SearchOptions, Serving, FoodDataType } from "../types";
import { num } from "../normalize";
import { Http } from "../http/client";
import { canonicalId, type NutritionProvider, type ProviderConfig } from "./provider";

const BASE = "https://api.nal.usda.gov/fdc/v1";

// canonical key ← USDA nutrient numbers, with the canonical unit we store in.
const MAP: Record<NutrientKey, { numbers: string[]; unit: "kcal" | "g" | "mg" | "µg" }> = {
  calories: { numbers: ["1008", "2047", "2048"], unit: "kcal" },
  protein: { numbers: ["1003"], unit: "g" },
  carbs: { numbers: ["1005"], unit: "g" },
  fat: { numbers: ["1004"], unit: "g" },
  satFat: { numbers: ["1258"], unit: "g" },
  transFat: { numbers: ["1257"], unit: "g" },
  fiber: { numbers: ["1079", "2033"], unit: "g" },
  sugar: { numbers: ["2000", "1063"], unit: "g" },
  addedSugar: { numbers: ["1235"], unit: "g" },
  sodium: { numbers: ["1093"], unit: "mg" },
  cholesterol: { numbers: ["1253"], unit: "mg" },
  potassium: { numbers: ["1092"], unit: "mg" },
  calcium: { numbers: ["1087"], unit: "mg" },
  iron: { numbers: ["1089"], unit: "mg" },
  magnesium: { numbers: ["1090"], unit: "mg" },
  zinc: { numbers: ["1095"], unit: "mg" },
  phosphorus: { numbers: ["1091"], unit: "mg" },
  vitaminA: { numbers: ["1106"], unit: "µg" },
  vitaminC: { numbers: ["1162"], unit: "mg" },
  vitaminD: { numbers: ["1114"], unit: "µg" },
  vitaminK: { numbers: ["1185"], unit: "µg" },
  vitaminE: { numbers: ["1109"], unit: "mg" },
  water: { numbers: ["1051"], unit: "g" },
  omega3: { numbers: ["1404", "1280"], unit: "g" },
  omega6: { numbers: ["1316", "1313"], unit: "g" },
};

const UNIT_FACTOR: Record<string, number> = { G: 1, MG: 1e-3, UG: 1e-6, "µG": 1e-6, MCG: 1e-6 };
function toCanonical(value: number, fromUnit: string, target: "kcal" | "g" | "mg" | "µg"): number | undefined {
  const u = (fromUnit || "").toUpperCase();
  if (target === "kcal") return u === "KJ" ? value / 4.184 : value;
  const grams = UNIT_FACTOR[u];
  if (grams === undefined) return undefined; // e.g. IU — skip rather than guess
  const inGrams = value * grams;
  return target === "g" ? inGrams : target === "mg" ? inGrams * 1e3 : inGrams * 1e6;
}

// Tolerant extraction: /foods/search and /food/{id} shape nutrients differently.
interface RawNutrient {
  nutrientNumber?: string;
  number?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: { number?: string; unitName?: string };
}
function profileFrom(nutrients: RawNutrient[]): NutrientProfile {
  const byNumber = new Map<string, { value: number; unit: string }>();
  for (const n of nutrients || []) {
    const number = n.nutrientNumber ?? n.number ?? n.nutrient?.number;
    const unit = n.unitName ?? n.nutrient?.unitName ?? "";
    const value = num(n.value ?? n.amount);
    if (number && value !== undefined && !byNumber.has(number)) byNumber.set(number, { value, unit });
  }
  const out: NutrientProfile = {};
  for (const key of Object.keys(MAP) as NutrientKey[]) {
    for (const number of MAP[key].numbers) {
      const hit = byNumber.get(number);
      if (hit) {
        const v = toCanonical(hit.value, hit.unit, MAP[key].unit);
        if (v !== undefined) {
          out[key] = v;
          break;
        }
      }
    }
  }
  return out;
}

const dataType = (t?: string): FoodDataType =>
  t === "Branded" ? "branded" : t === "Foundation" ? "foundation" : t === "SR Legacy" ? "sr_legacy" : t?.startsWith("Survey") ? "survey" : "generic";

interface RawFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: RawNutrient[];
}

function mapFood(raw: RawFood): FoodItem {
  const servings: Serving[] = [{ label: "100 g", grams: 100 }];
  if (raw.servingSize && (raw.servingSizeUnit || "").toLowerCase().startsWith("g")) {
    servings.unshift({ label: `${raw.servingSize} g`, grams: raw.servingSize, amount: raw.servingSize, unit: "g", isDefault: true });
  }
  return {
    id: canonicalId("usda", String(raw.fdcId)),
    provider: "usda",
    providerFoodId: String(raw.fdcId),
    name: (raw.description || "").trim(),
    brand: raw.brandName || raw.brandOwner || undefined,
    barcode: raw.gtinUpc || undefined,
    dataType: dataType(raw.dataType),
    servings,
    defaultServing: servings.find((s) => s.isDefault) ?? servings[0],
    per100g: profileFrom(raw.foodNutrients || []),
    source: "USDA FoodData Central",
    fetchedAt: new Date().toISOString(),
  };
}

export class UsdaProvider implements NutritionProvider {
  readonly id = "usda";
  readonly label = "USDA FoodData Central";
  readonly capabilities = new Set<Capability>(["search", "branded", "barcode", "micros"]);
  readonly enabled: boolean;
  private http: Http;
  private key: string;

  constructor(cfg: ProviderConfig) {
    this.key = cfg.usdaApiKey || "";
    this.enabled = Boolean(this.key);
    this.http = new Http("usda", { ratePerSec: 3, burst: 10, ...cfg });
  }

  private auth(url: string): string {
    return `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(this.key)}`;
  }

  async searchFoods(query: string, opts: SearchOptions = {}): Promise<FoodItem[]> {
    const body = JSON.stringify({
      query,
      pageSize: opts.limit ?? 15,
      dataType: ["Foundation", "SR Legacy", "Branded", "Survey (FNDDS)"],
    });
    const data = await this.http.json<{ foods?: RawFood[] }>(this.auth(`${BASE}/foods/search`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: opts.signal,
    });
    return (data.foods || []).map(mapFood);
  }

  async getByBarcode(barcode: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    const data = await this.http.json<{ foods?: RawFood[] }>(this.auth(`${BASE}/foods/search`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: barcode, dataType: ["Branded"], pageSize: 10 }),
      signal: opts.signal,
    });
    const match = (data.foods || []).find((f) => f.gtinUpc && f.gtinUpc.replace(/^0+/, "") === barcode.replace(/^0+/, ""));
    return match ? mapFood(match) : null;
  }

  async getById(providerFoodId: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    try {
      const raw = await this.http.json<RawFood>(this.auth(`${BASE}/food/${encodeURIComponent(providerFoodId)}`), {
        signal: opts.signal,
      });
      return raw?.fdcId ? mapFood(raw) : null;
    } catch (e) {
      if ((e as { code?: string }).code === "not_found") return null;
      throw e;
    }
  }
}
