/**
 * Nutrition planning math — turn a person's stats + goal into daily calorie and
 * macro targets. Pure and deterministic (no API, no AI), evidence-based formulas
 * (Mifflin–St Jeor BMR → activity → goal → macro split). This is the foundation
 * every plan is built on; the AI meal generator fills these targets with real
 * foods from the nutrition service.
 */

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain" | "recomp";
export type Activity = "sedentary" | "light" | "moderate" | "very" | "athlete";

export interface ClientStats {
  sex: Sex;
  age: number; // years
  weight: number;
  weightUnit?: "kg" | "lb"; // default kg
  height: number;
  heightUnit?: "cm" | "in"; // default cm
  activity: Activity;
  goal: Goal;
  /** Optional overrides (coach judgement). */
  proteinPerKg?: number;
  fatPerKg?: number;
  /** Explicit calorie override; skips the goal adjustment when set. */
  calorieOverride?: number;
}

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  proteinPerKg: number;
  bmr: number;
  tdee: number;
  weightKg: number;
  goal: Goal;
  method: string;
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2, // desk job, little exercise
  light: 1.375, // 1–3 sessions/wk
  moderate: 1.55, // 3–5 sessions/wk
  very: 1.725, // 6–7 sessions/wk
  athlete: 1.9, // 2-a-days / physical job + training
};

// Goal calorie adjustment (fraction of TDEE) and protein target (g/kg bodyweight).
const GOAL: Record<Goal, { delta: number; proteinPerKg: number }> = {
  lose: { delta: -0.2, proteinPerKg: 2.4 }, // preserve lean mass in a deficit
  recomp: { delta: -0.05, proteinPerKg: 2.4 },
  maintain: { delta: 0, proteinPerKg: 2.0 },
  gain: { delta: 0.12, proteinPerKg: 2.0 },
};

const toKg = (w: number, unit?: string) => (unit === "lb" ? w * 0.45359237 : w);
const toCm = (h: number, unit?: string) => (unit === "in" ? h * 2.54 : h);
const r = (n: number) => Math.round(n);

/** Compute daily calorie + macro targets from a client's stats and goal. */
export function calcTargets(s: ClientStats): MacroTargets {
  const kg = toKg(s.weight, s.weightUnit);
  const cm = toCm(s.height, s.heightUnit);
  // Mifflin–St Jeor BMR
  const bmr = 10 * kg + 6.25 * cm - 5 * s.age + (s.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[s.activity];
  const g = GOAL[s.goal];
  const calories = s.calorieOverride ?? tdee * (1 + g.delta);

  const proteinPerKg = s.proteinPerKg ?? g.proteinPerKg;
  const protein = proteinPerKg * kg;
  const fat = Math.max((s.fatPerKg ?? 0.9) * kg, 0.6 * kg); // floor for hormonal health
  const remaining = calories - protein * 4 - fat * 9;
  const carbs = Math.max(remaining / 4, 0);
  const fiber = (calories / 1000) * 14; // ~14 g per 1000 kcal

  return {
    calories: r(calories),
    protein: r(protein),
    carbs: r(carbs),
    fat: r(fat),
    fiber: r(fiber),
    proteinPerKg: Math.round(proteinPerKg * 100) / 100,
    bmr: r(bmr),
    tdee: r(tdee),
    weightKg: Math.round(kg * 10) / 10,
    goal: s.goal,
    method: "Mifflin–St Jeor + activity factor + goal adjustment",
  };
}

/** Split daily targets across N meals (even split; protein slightly front/post-loaded is left to the AI). */
export function splitAcrossMeals(t: MacroTargets, meals: number): { calories: number; protein: number; carbs: number; fat: number }[] {
  const n = Math.max(1, meals);
  return Array.from({ length: n }, () => ({
    calories: r(t.calories / n),
    protein: r(t.protein / n),
    carbs: r(t.carbs / n),
    fat: r(t.fat / n),
  }));
}

/** How close an actual day of eating is to target (for review/coaching). */
export function comparePlan(target: MacroTargets, actual: { calories?: number; protein?: number; carbs?: number; fat?: number }) {
  const pct = (a: number | undefined, b: number) => (b > 0 ? Math.round(((a ?? 0) / b) * 100) : 0);
  return {
    calories: { actual: r(actual.calories ?? 0), target: target.calories, pct: pct(actual.calories, target.calories) },
    protein: { actual: r(actual.protein ?? 0), target: target.protein, pct: pct(actual.protein, target.protein) },
    carbs: { actual: r(actual.carbs ?? 0), target: target.carbs, pct: pct(actual.carbs, target.carbs) },
    fat: { actual: r(actual.fat ?? 0), target: target.fat, pct: pct(actual.fat, target.fat) },
  };
}
