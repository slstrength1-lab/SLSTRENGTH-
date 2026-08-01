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

/**
 * Onboarding lifecycle stages (Step 6D). Ordered from first contact to fully
 * onboarded; matches the Clients."Onboarding Stage" select options in Notion.
 * Checklist items themselves live in Coach Notes (no Tasks database).
 */
export type OnboardingStage =
  | "Welcome"
  | "Intake"
  | "Program Assigned"
  | "Nutrition Set"
  | "First Check-in"
  | "Onboarded";

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
  | "Nurture"
  | "Lost"; // additive (Leads/CRM Step 1 Notion option); Closed Won remains the convert trigger

export type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed";
export type PaymentType = "Monthly" | "Paid in Full" | "One-time" | "Deposit" | "Per Session";

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
  /** Recurring billing (Client Command Center). Optional — set in Notion. */
  billingStatus?: BillingStatus;
  plan?: string;
  nextPaymentDate?: string; // ISO
  cancelledDate?: string; // ISO — set when membership is cancelled (churn/retention)
  /** Saved nutrition planning inputs (JSON: stats + prefs + latest targets) — lets
   *  re-planning need only the new weight. And the last generated plan (text). */
  nutritionProfile?: string;
  mealPlan?: string;
  /** Nutrition rollups (Notion computes these from the Nutrition log). */
  avgNutritionCompliance?: number; // 0-100
  lastNutritionLog?: string; // ISO
  /** Date of birth (Clients.Birthday) — powers the dashboard birthday calendar. */
  birthday?: string; // ISO
  /**
   * Contact + training rollups already present in the Clients Notion database,
   * surfaced additively (Step 6A). Optional — undefined when blank / no rows yet.
   */
  phone?: string;
  workoutCompletion?: number; // 0-100 (Workout Completion % rollup)
  avgRPE?: number; // Avg RPE rollup
  lastWorkout?: string; // ISO (Last Workout rollup)
  totalExercisesLogged?: number; // Total Exercises Logged rollup
  totalCheckIns?: number; // Total Check-ins rollup
  /** Onboarding lifecycle (Step 6D) — optional; set in Notion, no migration. */
  onboardingStage?: OnboardingStage;
  onboardingStarted?: string; // ISO
  onboardingCompleted?: string; // ISO
}

export type BillingStatus = "Active" | "Past Due" | "Paused" | "Cancelled" | "Trial";

/**
 * Per-client business metrics for the Command Center Business module. All
 * fields are computed live from the client's Sales rows + Client fields
 * (see store.summarizeBusiness) — nothing is stored or fabricated.
 */
export interface BusinessSummary {
  lifetimeRevenue: number;
  monthlyRevenue: number; // contracted (Monthly Rate)
  payments: number; // count of Paid sales
  avgMonthlyValue: number;
  lastPayment: string; // ISO or ""
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number | null; // fraction (0.1 = +10%); null when no last-month base
  monthlyTrend: { month: string; amount: number }[];
  retentionMonths: number;
  clientAgeMonths: number;
  valueScore: number; // 0-100
}

/**
 * Owner (CEO) Dashboard — portfolio-wide business summary. Every field is
 * computed live by store.summarizePortfolio() from the existing databases
 * (Clients, Sales, Programs, Check-ins, Workouts, Coach Notes, Nutrition, Leads)
 * plus the owner's config targets. Nothing here is stored or fabricated.
 */
export interface OwnerSummary {
  /* Revenue */
  mrr: number;
  arr: number;
  monthlyRevenue: number; // Paid sales, current month
  revenueLastMonth: number;
  revenueGrowth: number | null; // fraction; null when no last-month base
  revenueGoal: number;
  revenueRemaining: number;
  goalProgress: number; // 0-100
  revenueTrend: { month: string; amount: number }[]; // last 6 months, Paid
  /* Clients */
  activeClients: number;
  newClientsThisMonth: number;
  clientCapacity: number;
  capacityFill: number; // 0-100
  pausedClients: number;
  pastDueClients: number;
  cancelledClients: number;
  avgClientValue: number; // MRR / active
  avgClientLifetimeMonths: number;
  churnRate: number | null; // fraction of active lost this month
  clientGrowthTrend: { month: string; count: number }[]; // active count, last 6 months
  /* Revenue depth (Phase — analytics layer) */
  clientLifetimeValue: number; // avg lifetime revenue per client who has paid
  avgRevenuePerClient: number; // ARPC — lifetime revenue / paying clients
  /* Growth */
  lostThisMonth: number; // clients cancelled this calendar month
  conversionRate: number | null; // Leads: Closed Won / total (null when no leads)
  capacityRemaining: number; // clientCapacity - activeClients (>=0)
  newLeads: number; // leads created / open this month
  /* Health */
  portfolioCompliance: number; // 0-100, avg check-in compliance of active
  workoutCompletion: number | null; // 0-100, null until Workout rows exist
  nutritionCompliance: number | null; // 0-100, null until Nutrition logs exist
  topClients: TopClient[];
  recentPayments: Sale[];
  upcomingPayments: UpcomingPayment[];
  /* Operations */
  programsActive: number;
  programsEnding: number;
  pendingNotes: number;
  openAiRecs: number;
  nutritionPlans: number;
  completedCheckIns: number; // Reviewed, current month
  activity: ActivityItem[];
  /* Priorities + calendar */
  priorities: PriorityGroup[];
  calendar: CalendarEvent[];
}

export interface TopClient {
  id: ID;
  name: string;
  initials: string;
  lifetimeRevenue: number;
  monthlyRate: number;
}

export interface UpcomingPayment {
  clientId: ID;
  name: string;
  initials: string;
  date: string; // ISO
  amount: number;
}

export type PriorityTone = "red" | "amber" | "sky" | "emerald";

export interface PriorityItem {
  clientId: ID;
  name: string;
  initials: string;
  detail: string;
}

export interface PriorityGroup {
  key: string;
  label: string;
  tone: PriorityTone;
  items: PriorityItem[];
}

export type CalendarEventType =
  | "Check-in"
  | "Consultation"
  | "Payment"
  | "Renewal"
  | "Program Start"
  | "Program End"
  | "Birthday";

export interface CalendarEvent {
  date: string; // ISO
  type: CalendarEventType;
  label: string; // client / lead name
  detail?: string;
}

export type ActivityType = "payment" | "checkin" | "note" | "client";

export interface ActivityItem {
  id: ID;
  type: ActivityType;
  date: string; // ISO
  title: string;
  detail?: string;
  clientId?: ID;
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
  /**
   * CRM foundation (Leads/CRM Step 1). All optional & additive — existing
   * records/sample data need no migration. Surfaced by mapLead from the
   * (already-additive) Notion Leads schema.
   */
  phone?: string;
  leadId?: number; // Notion auto-increment "Lead ID"
  convertedClient?: string; // Client page id (Converted Client relation)
  closeProbability?: number; // 0-100
  assignedCoach?: string;
  lastContact?: string; // ISO
  consultDate?: string; // ISO
  createdDate?: string; // ISO — Notion page created_time
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

/**
 * Result of the lead → client conversion orchestration (convertLead). Structured
 * so callers can report exactly what ran vs. what was deferred to a later phase.
 */
export interface ConversionStep {
  name: string;
  status: "completed" | "skipped";
  detail?: string;
}
export interface ConversionResult {
  success: boolean;
  clientId: string;
  created: boolean; // a new client was created on this call
  alreadyConverted: boolean; // lead already had a Converted Client
  stepsCompleted: string[];
  skippedSteps: { name: string; reason: string }[];
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

/**
 * One row of the Notion Nutrition database (weekly log grain). Backs the
 * Client Command Center's Nutrition module and HPOS nutrition analysis.
 */
export interface NutritionLog {
  id: ID;
  notionId?: string;
  clientId: ID;
  date: string; // ISO — week the log covers
  strategy: string;
  targetCalories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  caloriesActual: number;
  compliance: number; // 0-100
  notes?: string;
}

/**
 * Coach Notes classification unions (match the Notion select options).
 * `AI Recommendation` is where a future AI layer writes its output — the same
 * database, the same shape a coach reads.
 */
export type NoteType =
  | "Coaching Note"
  | "Programming Decision"
  | "Nutrition Decision"
  | "Athlete Concern"
  | "Follow-up"
  | "AI Recommendation";
export type NoteStatus = "New" | "In Progress" | "Actioned" | "Archived";
export type NotePriority = "Low" | "Medium" | "High";

/**
 * One row of the Notion Coach Notes database — the client's running coaching
 * log. Structured (type/status/priority/body/date/author) so a future AI agent
 * can read history and write recommendations back as notes.
 */
export interface CoachNote {
  id: ID;
  notionId?: string;
  clientId: ID;
  /** Optional Lead relation (Leads/CRM Step 1) — a note may belong to a lead
   * instead of (or as well as) a client. Additive; existing notes leave it unset. */
  leadId?: ID;
  created: string; // ISO
  author: string;
  type: NoteType;
  body: string;
  status: NoteStatus;
  priority?: NotePriority;
}

/* ------------------------------------------------------------------ */
/* AI layer — Recommendation & Approval ledger (Phase 0 foundation)     */
/* ------------------------------------------------------------------ */

/**
 * Risk tier decides how a recommendation flows once produced:
 *   safe   — read-only / no external side effect; may auto-apply (Phase 5).
 *   review — reaches a client/lead or changes a plan; requires human approval.
 *   manual — high-stakes/irreversible; the AI only prepares context, never acts.
 * The tier lives on the recommendation so one pipeline handles all three by
 * policy, not by special-casing.
 */
export type RiskTier = "safe" | "review" | "manual";

export type RecommendationStatus =
  | "pending" // awaiting human review
  | "approved" // approved, not yet executed
  | "applied" // executed into a domain record
  | "rejected" // declined by the human
  | "dismissed"; // no longer relevant (superseded / stale)

/** What the recommendation proposes — maps to an advisor + an execution path. */
export type RecommendationKind =
  | "Briefing" // A1 — read-only daily/weekly synthesis
  | "Check-in Response" // A2
  | "Program Update" // A2
  | "Nutrition Update" // A2
  | "Client Message" // A2 / comms capability
  | "Sales Follow-up" // A3
  | "Content" // A4
  | "Product" // A4
  | "Ops Task"; // operations

/** Which advisor emitted it (see docs/ai-architecture-review.md). */
export type AgentSource =
  | "Strategist" // A1
  | "Coaching Advisor" // A2
  | "Sales Assistant" // A3
  | "Growth Engine" // A4
  | "System"; // deterministic / non-LLM origin

/**
 * One row of the AI Recommendations ledger — the approval backbone. Every agent
 * writes proposals here (never to domain tables directly); a human approves or
 * rejects in the /coach/approvals inbox; the execution service applies approved
 * rows to the real databases. The ledger is simultaneously the bus, the audit
 * trail, and the history.
 */
export interface Recommendation {
  id: ID;
  notionId?: string;
  title: string;
  kind: RecommendationKind;
  source: AgentSource;
  riskTier: RiskTier;
  status: RecommendationStatus;
  /** Human-readable rationale — why the agent proposes this. */
  summary: string;
  /** The proposed content: message text, program notes, brief body, caption… */
  draft: string;
  clientId?: ID;
  clientName?: string;
  leadId?: ID;
  leadName?: string;
  /** Idempotency key so the same proposal doesn't reappear each run. */
  dedupKey?: string;
  confidence?: number; // 0-100
  created: string; // ISO
  reviewed?: string; // ISO — when a human acted
  reviewedBy?: string;
  /** Id of the domain record created when an approved rec is executed. */
  appliedResultId?: string;
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
