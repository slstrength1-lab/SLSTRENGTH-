/**
 * FatSecret Platform API — ENRICHMENT provider. Branded + restaurant items,
 * recipes, and barcode; 5,000 calls/day free (Basic, US data). OAuth2
 * client-credentials. Requires "Powered by FatSecret" attribution.
 *
 * Docs: https://platform.fatsecret.com/docs/guides
 */
import type { Capability, FoodItem, NutrientProfile, NutrientKey, SearchOptions, Serving } from "../types";
import { num, toPer100g } from "../normalize";
import { toGrams } from "../units";
import { Http } from "../http/client";
import { canonicalId, type NutritionProvider, type ProviderConfig } from "./provider";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API = "https://platform.fatsecret.com/rest/server.api";

// FatSecret per-serving fields already use our canonical units (g / mg / µg).
const MAP: Record<NutrientKey, string> = {
  calories: "calories",
  protein: "protein",
  carbs: "carbohydrate",
  fat: "fat",
  satFat: "saturated_fat",
  transFat: "trans_fat",
  fiber: "fiber",
  sugar: "sugar",
  addedSugar: "added_sugars",
  sodium: "sodium",
  cholesterol: "cholesterol",
  potassium: "potassium",
  calcium: "calcium",
  iron: "iron",
  magnesium: "magnesium",
  zinc: "zinc",
  phosphorus: "phosphorus",
  vitaminA: "vitamin_a",
  vitaminC: "vitamin_c",
  vitaminD: "vitamin_d",
  vitaminK: "vitamin_k",
  vitaminE: "vitamin_e",
  water: "water",
  omega3: "omega_3",
  omega6: "omega_6",
};

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const b64 = (s: string): string =>
  typeof Buffer !== "undefined" ? Buffer.from(s).toString("base64") : btoa(s);

interface RawServing {
  serving_id?: string;
  serving_description?: string;
  measurement_description?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  [k: string]: string | undefined;
}
interface RawFood {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  servings?: { serving?: RawServing | RawServing[] };
}

function servingGrams(s: RawServing): number | undefined {
  const amt = num(s.metric_serving_amount);
  if (!amt) return undefined;
  const unit = (s.metric_serving_unit || "g").toLowerCase();
  try {
    return unit === "ml" ? amt : toGrams(amt, unit);
  } catch {
    return unit.startsWith("g") ? amt : undefined;
  }
}

function perServingProfile(s: RawServing): NutrientProfile {
  const out: NutrientProfile = {};
  for (const key of Object.keys(MAP) as NutrientKey[]) {
    const v = num(s[MAP[key]]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

function mapFood(raw: RawFood): FoodItem | null {
  if (!raw.food_id) return null;
  const rawServings = asArray(raw.servings?.serving);
  const servings: Serving[] = [];
  let per100g: NutrientProfile = {};
  let best: { grams: number; profile: NutrientProfile } | null = null;
  for (const rs of rawServings) {
    const grams = servingGrams(rs);
    const label = rs.serving_description || rs.measurement_description || "1 serving";
    if (grams && grams > 0) {
      servings.push({ label, grams });
      const profile = perServingProfile(rs);
      // Prefer the serving closest to 100 g as the per-100g anchor (least rounding).
      if (!best || Math.abs(grams - 100) < Math.abs(best.grams - 100)) best = { grams, profile };
    }
  }
  if (best) per100g = toPer100g(best.profile, best.grams);
  if (servings.length === 0) servings.push({ label: "100 g", grams: 100 });
  servings[0].isDefault = true;
  return {
    id: canonicalId("fatsecret", raw.food_id),
    provider: "fatsecret",
    providerFoodId: raw.food_id,
    name: (raw.food_name || "").trim(),
    brand: raw.brand_name || undefined,
    restaurant: raw.food_type === "Brand" ? raw.brand_name || undefined : undefined,
    dataType: raw.food_type === "Generic" ? "generic" : "branded",
    servings,
    defaultServing: servings[0],
    per100g,
    source: "Powered by FatSecret",
    fetchedAt: new Date().toISOString(),
  };
}

export class FatSecretProvider implements NutritionProvider {
  readonly id = "fatsecret";
  readonly label = "FatSecret";
  readonly capabilities = new Set<Capability>(["search", "branded", "restaurant", "barcode", "recipe", "micros"]);
  readonly enabled: boolean;
  private http: Http;
  private id_: string;
  private secret: string;
  private token: { value: string; expires: number } | null = null;
  private now: () => number;

  constructor(cfg: ProviderConfig) {
    this.id_ = cfg.fatSecretClientId || "";
    this.secret = cfg.fatSecretClientSecret || "";
    this.enabled = Boolean(this.id_ && this.secret);
    this.now = cfg.now ?? (() => Date.now());
    this.http = new Http("fatsecret", { ratePerSec: 5, burst: 10, ...cfg });
  }

  private async accessToken(signal?: AbortSignal): Promise<string> {
    if (this.token && this.token.expires > this.now() + 30_000) return this.token.value;
    const data = await this.http.json<{ access_token?: string; expires_in?: number; error?: string }>(TOKEN_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${b64(`${this.id_}:${this.secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&scope=basic",
      signal,
    });
    if (!data.access_token) throw new Error(`FatSecret token error: ${data.error ?? "no token"}`);
    this.token = { value: data.access_token, expires: this.now() + (data.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async call<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T> {
    const token = await this.accessToken(signal);
    const qs = new URLSearchParams({ ...params, format: "json" }).toString();
    return this.http.json<T>(`${API}?${qs}`, { method: "GET", headers: { Authorization: `Bearer ${token}` }, signal });
  }

  async searchFoods(query: string, opts: SearchOptions = {}): Promise<FoodItem[]> {
    const data = await this.call<{ foods?: { food?: RawFood | RawFood[] } }>(
      { method: "foods.search", search_expression: query, max_results: String(opts.limit ?? 15) },
      opts.signal,
    );
    const list = asArray(data.foods?.food).map((f) => f.food_id).filter(Boolean) as string[];
    // search returns summaries; hydrate the top few to full nutrition (bounded).
    const ids = list.slice(0, Math.min(opts.limit ?? 15, 8));
    const foods = await Promise.all(ids.map((id) => this.getById(id, opts).catch(() => null)));
    return foods.filter((f): f is FoodItem => f !== null);
  }

  async getById(providerFoodId: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    const data = await this.call<{ food?: RawFood }>({ method: "food.get.v4", food_id: providerFoodId }, opts.signal);
    return data.food ? mapFood(data.food) : null;
  }

  async getByBarcode(barcode: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    const found = await this.call<{ food_id?: { value?: string } }>(
      { method: "food.find_id_for_barcode", barcode },
      opts.signal,
    );
    const id = found.food_id?.value;
    if (!id || id === "0") return null;
    return this.getById(id, opts);
  }
}
