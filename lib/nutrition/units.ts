/**
 * Unit conversion + serving math. Mass is exact; volume→mass uses a density
 * (g/ml) that defaults to 1.0 (water-like) and can be overridden per food when a
 * provider gives a better serving weight. We always prefer a provider's stated
 * serving grams over volume estimation.
 */
import { validationError } from "./errors";

export type MassUnit = "g" | "kg" | "mg" | "oz" | "lb";
export type VolumeUnit = "ml" | "l" | "tsp" | "tbsp" | "cup" | "floz";
export type Unit = MassUnit | VolumeUnit | "serving" | (string & {});

const TO_GRAMS: Record<MassUnit, number> = { mg: 0.001, g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
const TO_ML: Record<VolumeUnit, number> = { ml: 1, l: 1000, tsp: 4.92892159375, tbsp: 14.78676478125, cup: 236.5882365, floz: 29.5735295625 };

const norm = (u: string): string => u.trim().toLowerCase().replace(/s$/, "").replace("fluid ounce", "floz").replace("ounce", "oz").replace("pound", "lb").replace("gram", "g").replace("tablespoon", "tbsp").replace("teaspoon", "tsp");

const MASS_ALIASES: Record<string, MassUnit> = { g: "g", gram: "g", kg: "kg", mg: "mg", oz: "oz", lb: "lb", pound: "lb" };
const VOL_ALIASES: Record<string, VolumeUnit> = { ml: "ml", milliliter: "ml", l: "l", liter: "l", tsp: "tsp", tbsp: "tbsp", cup: "cup", floz: "floz" };

export function isMass(unit: string): boolean {
  return norm(unit) in MASS_ALIASES;
}
export function isVolume(unit: string): boolean {
  return norm(unit) in VOL_ALIASES;
}

/** Convert an amount in `unit` to grams. `density` is g/ml for volume units. */
export function toGrams(amount: number, unit: string, density = 1): number {
  const u = norm(unit);
  if (u in MASS_ALIASES) return amount * TO_GRAMS[MASS_ALIASES[u]];
  if (u in VOL_ALIASES) return amount * TO_ML[VOL_ALIASES[u]] * density;
  throw validationError(`Cannot convert unit "${unit}" to grams`);
}

/** Convert grams to a target mass unit (for display). */
export function fromGrams(grams: number, unit: MassUnit): number {
  return grams / TO_GRAMS[unit];
}

/** Convenience metric/imperial mass display. */
export function gramsToOz(g: number): number {
  return g / TO_GRAMS.oz;
}
export function ozToGrams(oz: number): number {
  return oz * TO_GRAMS.oz;
}
export function lbToKg(lb: number): number {
  return (lb * TO_GRAMS.lb) / 1000;
}
export function kgToLb(kg: number): number {
  return (kg * 1000) / TO_GRAMS.lb;
}
