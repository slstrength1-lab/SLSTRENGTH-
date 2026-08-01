/**
 * Pure nutrient-profile math: scale a per-100 g profile to any gram amount, sum
 * profiles (recipes / meals / days), and round for display. No I/O.
 */
import { NUTRIENT_KEYS, type NutrientProfile, type NutrientKey } from "./types";

/** Scale a per-100 g profile to `grams`. */
export function scaleProfile(per100g: NutrientProfile, grams: number): NutrientProfile {
  const f = grams / 100;
  const out: NutrientProfile = {};
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k];
    if (typeof v === "number") out[k] = v * f;
  }
  return out;
}

/** Given a profile for `grams`, derive the per-100 g profile (inverse of scale). */
export function toPer100g(profile: NutrientProfile, grams: number): NutrientProfile {
  if (grams <= 0) return {};
  const f = 100 / grams;
  const out: NutrientProfile = {};
  for (const k of NUTRIENT_KEYS) {
    const v = profile[k];
    if (typeof v === "number") out[k] = v * f;
  }
  return out;
}

/** Sum any number of profiles (missing values treated as 0, absent when all absent). */
export function addProfiles(...profiles: NutrientProfile[]): NutrientProfile {
  const out: NutrientProfile = {};
  for (const k of NUTRIENT_KEYS) {
    let sum = 0;
    let present = false;
    for (const p of profiles) {
      const v = p[k];
      if (typeof v === "number") {
        sum += v;
        present = true;
      }
    }
    if (present) out[k] = sum;
  }
  return out;
}

/** Multiply a profile by a scalar (e.g. total → per-serving with 1/servings). */
export function multiplyProfile(p: NutrientProfile, factor: number): NutrientProfile {
  const out: NutrientProfile = {};
  for (const k of NUTRIENT_KEYS) {
    const v = p[k];
    if (typeof v === "number") out[k] = v * factor;
  }
  return out;
}

/** Round for display: calories/whole-number-ish to 0 dp, small micros to sensible dp. */
export function roundProfile(p: NutrientProfile): NutrientProfile {
  const out: NutrientProfile = {};
  for (const k of NUTRIENT_KEYS) {
    const v = p[k];
    if (typeof v !== "number") continue;
    const dp = k === "calories" || k === "sodium" || k === "potassium" ? 0 : v < 1 ? 2 : 1;
    out[k] = Math.round(v * 10 ** dp) / 10 ** dp;
  }
  return out;
}

/** Coerce a possibly-string/NaN provider value into a finite number or undefined. */
export function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : undefined;
}
