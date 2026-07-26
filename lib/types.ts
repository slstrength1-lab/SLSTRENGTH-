/**
 * SL Strength OS — domain models.
 *
 * These mirror the Notion databases that back the business today
 * (Clients, Leads, Sales, Check-ins, Programs, Content, Business Metrics)
 * so the prototype can be wired to the Notion API later with minimal changes.
 * Each `notionId` field is where the Notion page ID will live once connected.
 */

export type ID = string;

/* ------------------------------------------------------------------ */
/* Enums / unions (match Notion select options)                        */
/* ------------------------------------------------------------------ */

export type ClientStatus =
  | "Onboarding"
  | "Active"
  | "Paused"
  | "Churned"
  | "Completed";

export type RiskLevel = "Green" | "Yellow" | "Red";

export type CoachingFocus =
  | "Body Transformation"
  | "Strength"
  | "Nutrition"
  | "Hybrid";

export type LeadStage =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Call Scheduled"
  | "Offer Presented"
  | "Closed Won"
  | "Nurture";

export type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed";
export type PaymentType = "Monthly" | "Paid in Full" | "One-time" | "Deposit";

export type ProgramType =
  | "Strength"
  | "Hypertrophy"
  | "Fat Loss"
  | "Peaking"
  | "General";
export type ProgramPhase =
  | "Foundation"
  | "Accumulation"
  | "Intensification"
  | "Deload"
  | "Peak";
export type ProgramStatus = "Draft" | "Active" | "Completed";

export type CheckInStatus = "Pending" | "Submitted" | "Reviewed";
export type RatingLow = "Low" | "Moderate" | "High";
export type SleepRating = "Poor" | "Okay" | "Good";

export type ContentStatus =
  | "Idea"
  | "Writing"
  | "Filming"
  | "Editing"
  | "Scheduled"
  | "Published";
export type ContentPillar =
  | "Education"
  | "Transformation"
  | "Behind the Scenes"
  | "Promotion"
  | "Authority";

/* ------------------------------------------------------------------ */
/* Core records (one per Notion database)                              */
/* ------------------------------------------------------------------ */

export interface Client {
  id: ID;
  notionId?: string;
  name: string;
  email: string;
  avatarInitials: string;
  status: ClientStatus;
  coachingFocus: CoachingFocus[];
  startDate: string; // ISO
  renewalDate: string; // ISO
  monthlyRate: number;
  primaryGoal: string;
  riskLevel: RiskLevel;
  source: string;
  /** Denormalized rollups (Notion computes these from Check-ins / Sales). */
  currentPhase: ProgramPhase;
  compliance: number; // 0-100, avg compliance
  lastCheckIn: string; // ISO
  lifetimeRevenue: number;
}

export interface Lead {
  id: ID;
  notionId?: string;
  name: string;
  stage: LeadStage;
  email: string;
  source: string;
  interest: CoachingFocus[];
  estValue: number;
  nextFollowUp: string; // ISO
  nextAction: string;
  notes: string;
  goal?: string;
  problem?: string;
}

export interface Sale {
  id: ID;
  notionId?: string;
  title: string;
  clientId: ID;
  amount: number;
  date: string; // ISO
  package: string;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
}

export interface CheckIn {
  id: ID;
  notionId?: string;
  title: string;
  clientId: ID;
  date: string; // ISO
  bodyweight: number;
  compliance: number; // 0-100
  energy: RatingLow;
  sleep: SleepRating;
  stress: RatingLow;
  wins: string;
  challenges?: string;
  notes?: string;
  adjustments: string; // coach's response (set on review, not by the client)
  status: CheckInStatus;
}

export interface Program {
  id: ID;
  notionId?: string;
  name: string;
  clientId: ID;
  type: ProgramType;
  phase: ProgramPhase;
  startDate: string;
  endDate: string;
  status: ProgramStatus;
  link?: string;
  weeks: ProgramWeek[];
}

export interface ContentItem {
  id: ID;
  notionId?: string;
  title: string;
  platform: string[];
  format: string;
  pillar: ContentPillar;
  status: ContentStatus;
  publishDate: string; // ISO
  hookNotes: string;
}

export interface Metric {
  id: ID;
  notionId?: string;
  period: string;
  weekOf: string; // ISO
  activeClients: number;
  newLeads: number;
  newClients: number;
  revenue: number;
  mrr: number;
  churned: number;
  contentPublished: number;
  calls: number;
  closeRate: number; // %
  retention: number; // %
}

/* ------------------------------------------------------------------ */
/* Training structure (nested inside Program)                          */
/* ------------------------------------------------------------------ */

export interface Exercise {
  name: string;
  sets: number;
  reps: string; // e.g. "5" or "8-10" or "AMRAP"
  load: string; // e.g. "225 lb", "RPE 8", "BW"
  rest: string; // e.g. "2-3 min"
  notes?: string;
  tempo?: string;
  // Optional performance fields (populated from the Notion Workouts database).
  rpe?: number;
  actualLoad?: number; // lb
  actualReps?: number;
  completed?: boolean;
}

/**
 * One row of the Notion Workouts database — the exercise-per-session grain that
 * backs HPOS training analysis. The store groups these by Program → Week → Day
 * → Order to assemble `ProgramWeek[]` for the UI.
 */
export interface WorkoutRow {
  id: ID;
  notionId?: string;
  programId: ID;
  clientId: ID;
  week: number;
  day: number;
  focus: string;
  order: number;
  exercise: string;
  sets: number;
  reps: string; // prescribed
  load: string; // prescribed
  actualLoad?: number; // lb, performed
  actualReps?: number; // performed
  rpe?: number; // 1-10
  tempo?: string;
  completed: boolean;
  date?: string; // ISO
  notes?: string;
}

export interface WorkoutDay {
  day: string; // "Day 1 — Lower A"
  focus: string; // "Squat / Posterior Chain"
  completed: boolean;
  exercises: Exercise[];
}

export interface ProgramWeek {
  week: number;
  label: string; // "Week 3 — Accumulation"
  days: WorkoutDay[];
}

/* ------------------------------------------------------------------ */
/* Nutrition (client-level plan; lives in Notion client record later) */
/* ------------------------------------------------------------------ */

export interface MacroTarget {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
}

export interface NutritionPlan {
  clientId: ID;
  strategy: string; // "Moderate deficit — training-day carb cycling"
  target: MacroTarget;
  todayConsumed: MacroTarget;
  waterTargetLiters: number;
  waterConsumedLiters: number;
  weekAdherence: number[]; // last 7 days adherence %, 0-100
}

/* ------------------------------------------------------------------ */
/* Progress + messaging                                                */
/* ------------------------------------------------------------------ */

export interface ProgressPoint {
  date: string; // ISO
  weight: number;
  bodyFat?: number; // %
  leanMass?: number; // lb
  waist?: number; // in
}

export interface Message {
  id: ID;
  from: "coach" | "client";
  author: string;
  body: string;
  timestamp: string; // ISO
  read: boolean;
}

export interface WeeklyPriority {
  id: ID;
  label: string;
  done: boolean;
}
