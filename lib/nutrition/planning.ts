/**
 * Nutrition planning math — turn a person's stats + goal into daily calorie and
 * macro targets. Pure and deterministic (no API, no AI), evidence-based.
 *
 * The BMR/RMR equation is chosen by the data available, because no single formula
 * is right for everyone:
 *   • Body-fat % known  → lean-mass based: Cunningham (500 + 22·LBM) for athletes,
 *                          Katch–McArdle (370 + 21.6·LBM) otherwise. These "see"
 *                          body composition, so they don't under-feed a lean,
 *                          muscular client the way weight-only equations do.
 *   • Under 18          → Schofield age-banded (WHO/FAO standard for 3–18 y) plus a
 *                          small growth-energy allowance. Mifflin is an ADULT
 *                          equation with no growth term and under-predicts teens.
 *   • Adult, no BF%     → Mifflin–St Jeor (the modern adult default).
 *
 * Goal adjustment then applies a floored surplus/deficit:
 *   • gain     → TDEE + max(15% of TDEE, 400 kcal)  — always clearly ABOVE TDEE.
 *   • lose     → deficit off TDEE, never below BMR   — (gentler for adolescents).
 *   • recomp   → slight deficit, never below BMR.
 *   • maintain → TDEE.
 *
 * This is the foundation every plan is built on; the AI meal generator fills these
 * targets with real foods from the nutrition service.
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
  /** Body-fat %, e.g. 15. When provided, a lean-mass equation (Cunningham /
   *  Katch–McArdle) is used — the accurate choice for athletes. */
  bodyFatPct?: number;
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
  /** Signed adjustment applied to TDEE to reach `calories` (+surplus / −deficit). */
  surplus: number;
  weightKg: number;
  goal: Goal;
  /** Which BMR/RMR equation was used (for coach transparency). */
  equation: string;
  /** Non-blocking cautions (e.g. adolescent, deficit capped at BMR). */
  warnings: string[];
  method: string;
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2, // desk job, little exercise
  light: 1.375, // 1–3 sessions/wk
  moderate: 1.55, // 3–5 sessions/wk
  very: 1.725, // 6–7 sessions/wk
  athlete: 1.9, // 2-a-days / physical job + training
};

// Protein target (g/kg bodyweight) by goal.
const PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 2.4, // preserve lean mass in a deficit
  recomp: 2.4,
  maintain: 2.0,
  gain: 2.0,
};

const toKg = (w: number, unit?: string) => (unit === "lb" ? w * 0.45359237 : w);
const toCm = (h: number, unit?: string) => (unit === "in" ? h * 2.54 : h);
const r = (n: number) => Math.round(n);

/** Mifflin–St Jeor — the modern adult default (validated ≥19 y). */
function mifflinBMR(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}

/**
 * Schofield (WHO/FAO) weight-based BMR — the standard for children/adolescents.
 * Age-banded; we cover the bands that matter for a coaching roster (3–60 y) and
 * clamp beyond. Returns kcal/day.
 */
function schofieldBMR(sex: Sex, kg: number, age: number): number {
  if (sex === "male") {
    if (age < 3) return 59.512 * kg - 30.4;
    if (age < 10) return 22.706 * kg + 504.3;
    if (age < 18) return 17.686 * kg + 658.2;
    if (age < 30) return 15.057 * kg + 692.2;
    if (age < 60) return 11.472 * kg + 873.1;
    return 11.711 * kg + 587.7;
  }
  if (age < 3) return 58.317 * kg - 31.1;
  if (age < 10) return 20.315 * kg + 485.9;
  if (age < 18) return 13.384 * kg + 692.6;
  if (age < 30) return 14.818 * kg + 486.6;
  if (age < 60) return 8.126 * kg + 845.6;
  return 9.082 * kg + 658.5;
}

/** Cunningham (1980): RMR = 500 + 22·LBM. Preferred for athletes when BF% is known. */
const cunninghamRMR = (lbmKg: number) => 500 + 22 * lbmKg;
/** Katch–McArdle: RMR = 370 + 21.6·LBM. Lean-mass based, general population. */
const katchMcArdleRMR = (lbmKg: number) => 370 + 21.6 * lbmKg;

interface BmrChoice {
  bmr: number;
  equation: string;
}

/** Choose the right BMR/RMR equation for this client. */
function chooseBMR(s: ClientStats, kg: number, cm: number): BmrChoice {
  const bf = s.bodyFatPct;
  const isTeen = s.age < 18;

  // 1) Body composition known → lean-mass equation (the athlete-accurate path).
  if (typeof bf === "number" && bf > 0 && bf < 60) {
    const lbm = kg * (1 - bf / 100);
    const athlete = s.activity === "athlete" || s.activity === "very";
    return athlete
      ? { bmr: cunninghamRMR(lbm), equation: `Cunningham (lean mass ${Math.round(lbm)} kg @ ${bf}% BF)` }
      : { bmr: katchMcArdleRMR(lbm), equation: `Katch–McArdle (lean mass ${Math.round(lbm)} kg @ ${bf}% BF)` };
  }

  // 2) Adolescent → Schofield (Mifflin is adult-only and has no growth term).
  if (isTeen) return { bmr: schofieldBMR(s.sex, kg, s.age), equation: "Schofield (age-banded, adolescent)" };

  // 3) Adult default → Mifflin–St Jeor.
  return { bmr: mifflinBMR(s.sex, kg, cm, s.age), equation: "Mifflin–St Jeor (adult)" };
}

/** Compute daily calorie + macro targets from a client's stats and goal. */
export function calcTargets(s: ClientStats): MacroTargets {
  const kg = toKg(s.weight, s.weightUnit);
  const cm = toCm(s.height, s.heightUnit);
  const isTeen = s.age < 18;
  const warnings: string[] = [];

  const { bmr, equation } = chooseBMR(s, kg, cm);

  // Total daily expenditure. Growing adolescents deposit tissue every day — the
  // IOM adds a small growth-energy allowance (~25 kcal/day) on top of expenditure.
  let tdee = bmr * ACTIVITY_FACTOR[s.activity];
  if (isTeen) tdee += 25;

  // Goal adjustment with hard safety floors.
  let calories: number;
  if (s.calorieOverride != null) {
    calories = s.calorieOverride;
  } else if (s.goal === "gain") {
    // Always meaningfully ABOVE maintenance — a growing/hard-gaining client can't
    // gain on a timid +12%. Floor the surplus so small clients still get enough.
    calories = tdee + Math.max(tdee * 0.15, 400);
  } else if (s.goal === "maintain") {
    calories = tdee;
  } else {
    // lose / recomp — a deficit off TDEE, but never below BMR (unsafe), and
    // gentler for adolescents who are still growing.
    const deficitPct = s.goal === "lose" ? (isTeen ? 0.1 : 0.2) : 0.05;
    const raw = tdee * (1 - deficitPct);
    calories = Math.max(raw, bmr);
    if (raw < bmr) warnings.push("Deficit capped at BMR — going lower isn't safe or sustainable.");
  }

  // Adolescent cautions.
  if (isTeen) {
    warnings.push(
      "Client is under 18 — targets use the Schofield adolescent equation with a growth allowance. Growing athletes generally need MORE, not fewer, calories; keep a parent/guardian informed and prioritise food quality.",
    );
    if (s.goal === "lose") {
      warnings.push("Calorie deficits aren't recommended for growing adolescents — consider Maintain or Recomp and let them lean out as they grow.");
    }
  }

  const proteinPerKg = s.proteinPerKg ?? PROTEIN_PER_KG[s.goal];
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
    surplus: r(calories - tdee),
    weightKg: Math.round(kg * 10) / 10,
    goal: s.goal,
    equation,
    warnings,
    method: `${equation} + activity ×${ACTIVITY_FACTOR[s.activity]} + goal adjustment`,
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
