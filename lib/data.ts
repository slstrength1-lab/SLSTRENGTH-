/**
 * Sample data for the SL Strength OS prototype.
 *
 * This is the single in-memory "database". Every page reads from here today.
 * When Notion is connected, `lib/notion.ts` will return the same shapes so
 * the UI does not have to change.
 */

import type {
  Client,
  Lead,
  Sale,
  CheckIn,
  Program,
  ContentItem,
  Metric,
  NutritionPlan,
  ProgressPoint,
  Message,
  WeeklyPriority,
} from "./types";

/** The client currently "logged in" to the portal. */
export const CURRENT_CLIENT_ID = "cl_jordan";

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export const clients: Client[] = [
  {
    id: "cl_jordan",
    name: "Jordan Miles",
    email: "jordan@example.com",
    avatarInitials: "JM",
    status: "Active",
    coachingFocus: ["Body Transformation", "Strength"],
    startDate: "2026-02-01",
    renewalDate: "2026-12-01",
    monthlyRate: 300,
    primaryGoal: "Lose 20 lbs and pull a 405 deadlift by year-end.",
    riskLevel: "Green",
    source: "Instagram",
    currentPhase: "Accumulation",
    compliance: 92,
    lastCheckIn: "2026-07-21",
    lifetimeRevenue: 1800,
    birthday: "1995-08-04",
  },
  {
    id: "cl_sara",
    name: "Sara Nguyen",
    email: "sara@example.com",
    avatarInitials: "SN",
    status: "Active",
    coachingFocus: ["Strength"],
    startDate: "2026-03-15",
    renewalDate: "2026-09-15",
    monthlyRate: 350,
    primaryGoal: "First unassisted pull-up + add 15 lb to squat.",
    riskLevel: "Yellow",
    source: "Referral",
    currentPhase: "Intensification",
    compliance: 74,
    lastCheckIn: "2026-07-12",
    lifetimeRevenue: 1400,
  },
  {
    id: "cl_marcus",
    name: "Marcus Bell",
    email: "marcus@example.com",
    avatarInitials: "MB",
    status: "Active",
    coachingFocus: ["Nutrition", "Body Transformation"],
    startDate: "2026-05-01",
    renewalDate: "2026-11-01",
    monthlyRate: 250,
    primaryGoal: "Drop to 12% body fat for a summer photoshoot.",
    riskLevel: "Red",
    source: "Instagram",
    currentPhase: "Deload",
    compliance: 58,
    lastCheckIn: "2026-07-02",
    lifetimeRevenue: 750,
  },
  {
    id: "cl_priya",
    name: "Priya Shah",
    email: "priya@example.com",
    avatarInitials: "PS",
    status: "Active",
    coachingFocus: ["Hybrid"],
    startDate: "2026-01-10",
    renewalDate: "2027-01-10",
    monthlyRate: 400,
    primaryGoal: "Run a sub-25 5K while holding strength numbers.",
    riskLevel: "Green",
    source: "Word of Mouth",
    currentPhase: "Foundation",
    compliance: 88,
    lastCheckIn: "2026-07-20",
    lifetimeRevenue: 2400,
  },
  {
    id: "cl_devon",
    name: "Devon Carter",
    email: "devon@example.com",
    avatarInitials: "DC",
    status: "Onboarding",
    coachingFocus: ["Strength", "Nutrition"],
    startDate: "2026-07-18",
    renewalDate: "2027-01-18",
    monthlyRate: 300,
    primaryGoal: "Rebuild base after injury, then peak for a meet.",
    riskLevel: "Green",
    source: "Referral",
    currentPhase: "Foundation",
    compliance: 100,
    lastCheckIn: "2026-07-18",
    lifetimeRevenue: 300,
  },
  {
    id: "cl_alina",
    name: "Alina Torres",
    email: "alina@example.com",
    avatarInitials: "AT",
    status: "Paused",
    coachingFocus: ["Body Transformation"],
    startDate: "2025-11-01",
    renewalDate: "2026-08-01",
    monthlyRate: 250,
    primaryGoal: "Recomp — hold weight, drop body fat 4%.",
    riskLevel: "Yellow",
    source: "Website",
    currentPhase: "Deload",
    compliance: 63,
    lastCheckIn: "2026-06-28",
    lifetimeRevenue: 2000,
  },
];

export function getClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

export function getCurrentClient(): Client {
  return getClient(CURRENT_CLIENT_ID)!;
}

/* ------------------------------------------------------------------ */
/* Leads (sales pipeline)                                              */
/* ------------------------------------------------------------------ */

export const leads: Lead[] = [
  {
    id: "ld_1",
    name: "Chris Donovan",
    stage: "New",
    email: "chris@example.com",
    source: "Instagram",
    interest: ["Strength"],
    estValue: 1800,
    nextFollowUp: "2026-07-27",
    nextAction: "Reply to DM, qualify goals.",
    notes: "Came from the deadlift reel.",
  },
  {
    id: "ld_2",
    name: "Bianca Rossi",
    stage: "Contacted",
    email: "bianca@example.com",
    source: "Referral",
    interest: ["Nutrition"],
    estValue: 1500,
    nextFollowUp: "2026-07-26",
    nextAction: "Send intake form.",
    notes: "Referred by Priya.",
  },
  {
    id: "ld_3",
    name: "Tyler Reed",
    stage: "Qualified",
    email: "tyler@example.com",
    source: "Instagram",
    interest: ["Body Transformation", "Strength"],
    estValue: 2400,
    nextFollowUp: "2026-07-25",
    nextAction: "Book discovery call.",
    notes: "Serious, has home gym.",
  },
  {
    id: "ld_4",
    name: "Alex Rivera",
    stage: "Call Scheduled",
    email: "alex@example.com",
    source: "Referral",
    interest: ["Nutrition"],
    estValue: 1800,
    nextFollowUp: "2026-07-29",
    nextAction: "Prep nutrition audit before call.",
    notes: "Call Tue 4pm.",
  },
  {
    id: "ld_5",
    name: "Morgan Lee",
    stage: "Offer Presented",
    email: "morgan@example.com",
    source: "Website",
    interest: ["Hybrid"],
    estValue: 3600,
    nextFollowUp: "2026-07-24",
    nextAction: "Follow up on proposal.",
    notes: "Comparing to one other coach.",
  },
  {
    id: "ld_6",
    name: "Jamie Fox",
    stage: "Nurture",
    email: "jamie@example.com",
    source: "Instagram",
    interest: ["Strength"],
    estValue: 1800,
    nextFollowUp: "2026-08-10",
    nextAction: "Check in after vacation.",
    notes: "Not ready until August.",
  },
  {
    id: "ld_7",
    name: "Devon Carter",
    stage: "Closed Won",
    email: "devon@example.com",
    source: "Referral",
    interest: ["Strength", "Nutrition"],
    estValue: 1800,
    nextFollowUp: "2026-07-18",
    nextAction: "Onboarded 🎉",
    notes: "Now an active client.",
  },
];

/* ------------------------------------------------------------------ */
/* Sales                                                               */
/* ------------------------------------------------------------------ */

export const sales: Sale[] = [
  { id: "sl_1", title: "Jordan — July", clientId: "cl_jordan", amount: 300, date: "2026-07-01", package: "1:1 Coaching", paymentType: "Monthly", paymentStatus: "Paid" },
  { id: "sl_2", title: "Sara — July", clientId: "cl_sara", amount: 350, date: "2026-07-03", package: "Strength Program", paymentType: "Monthly", paymentStatus: "Paid" },
  { id: "sl_3", title: "Priya — July", clientId: "cl_priya", amount: 400, date: "2026-07-05", package: "Transformation Package", paymentType: "Monthly", paymentStatus: "Paid" },
  { id: "sl_4", title: "Marcus — July", clientId: "cl_marcus", amount: 250, date: "2026-07-06", package: "Nutrition Only", paymentType: "Monthly", paymentStatus: "Pending" },
  { id: "sl_5", title: "Devon — Deposit", clientId: "cl_devon", amount: 300, date: "2026-07-18", package: "1:1 Coaching", paymentType: "Deposit", paymentStatus: "Paid" },
  { id: "sl_6", title: "Alina — June", clientId: "cl_alina", amount: 250, date: "2026-06-25", package: "Transformation Package", paymentType: "Monthly", paymentStatus: "Paid" },
];

/* ------------------------------------------------------------------ */
/* Check-ins                                                           */
/* ------------------------------------------------------------------ */

export const checkIns: CheckIn[] = [
  { id: "ci_1", title: "Jordan — Wk of Jul 21", clientId: "cl_jordan", date: "2026-07-21", bodyweight: 204, compliance: 92, energy: "High", sleep: "Good", stress: "Low", wins: "PR on RDLs, hit all sessions.", adjustments: "Add 20g protein, 10 min zone-2 post-lift.", status: "Reviewed" },
  { id: "ci_2", title: "Jordan — Wk of Jul 14", clientId: "cl_jordan", date: "2026-07-14", bodyweight: 205.5, compliance: 88, energy: "Moderate", sleep: "Good", stress: "Low", wins: "Steps up to 9k/day.", adjustments: "Hold macros, push conditioning.", status: "Reviewed" },
  { id: "ci_3", title: "Jordan — Wk of Jul 7", clientId: "cl_jordan", date: "2026-07-07", bodyweight: 207, compliance: 90, energy: "High", sleep: "Okay", stress: "Moderate", wins: "Squat felt fast.", adjustments: "Prioritize sleep — 7.5h target.", status: "Reviewed" },
  { id: "ci_4", title: "Sara — Wk of Jul 12", clientId: "cl_sara", date: "2026-07-12", bodyweight: 141, compliance: 74, energy: "Moderate", sleep: "Poor", stress: "High", wins: "Negative pull-ups improving.", adjustments: "Deload volume, fix sleep routine.", status: "Reviewed" },
  { id: "ci_5", title: "Marcus — Wk of Jul 2", clientId: "cl_marcus", date: "2026-07-02", bodyweight: 189, compliance: 58, energy: "Low", sleep: "Poor", stress: "High", wins: "Made 3/5 sessions.", adjustments: "Simplify plan, daily check-in text.", status: "Submitted" },
  { id: "ci_6", title: "Priya — Wk of Jul 20", clientId: "cl_priya", date: "2026-07-20", bodyweight: 132, compliance: 88, energy: "High", sleep: "Good", stress: "Low", wins: "5K PR 25:40.", adjustments: "Add one tempo run.", status: "Reviewed" },
];

export function checkInsForClient(clientId: string): CheckIn[] {
  return checkIns
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Programs (with training structure)                                  */
/* ------------------------------------------------------------------ */

export const programs: Program[] = [
  {
    id: "pr_jordan",
    name: "Jordan — Strength Block 1",
    clientId: "cl_jordan",
    type: "Strength",
    phase: "Accumulation",
    startDate: "2026-06-01",
    endDate: "2026-08-10",
    status: "Active",
    link: "https://docs.google.com/spreadsheets/d/example",
    weeks: [
      {
        week: 3,
        label: "Week 3 — Accumulation",
        days: [
          {
            day: "Day 1 — Lower A",
            focus: "Squat / Posterior Chain",
            completed: true,
            exercises: [
              { name: "Back Squat", sets: 4, reps: "5", load: "RPE 8", rest: "3 min", tempo: "3-0-1" },
              { name: "Romanian Deadlift", sets: 3, reps: "8", load: "225 lb", rest: "2-3 min", notes: "New PR last week." },
              { name: "Walking Lunge", sets: 3, reps: "10 / leg", load: "2×40 lb DB", rest: "90 sec" },
              { name: "Standing Calf Raise", sets: 4, reps: "12-15", load: "RPE 9", rest: "60 sec" },
            ],
          },
          {
            day: "Day 2 — Upper A",
            focus: "Horizontal Push / Pull",
            completed: true,
            exercises: [
              { name: "Bench Press", sets: 4, reps: "6", load: "RPE 8", rest: "3 min", tempo: "2-1-1" },
              { name: "Chest-Supported Row", sets: 4, reps: "10", load: "RPE 8", rest: "2 min" },
              { name: "Incline DB Press", sets: 3, reps: "10-12", load: "RPE 9", rest: "90 sec" },
              { name: "Face Pull", sets: 3, reps: "15", load: "light", rest: "60 sec" },
            ],
          },
          {
            day: "Day 3 — Lower B",
            focus: "Deadlift / Quads",
            completed: false,
            exercises: [
              { name: "Deadlift", sets: 4, reps: "3", load: "RPE 8", rest: "3-4 min", notes: "Target 385 top set." },
              { name: "Front Squat", sets: 3, reps: "6", load: "RPE 7", rest: "2-3 min" },
              { name: "Leg Press", sets: 3, reps: "12", load: "RPE 9", rest: "90 sec" },
              { name: "Hanging Leg Raise", sets: 3, reps: "12", load: "BW", rest: "60 sec" },
            ],
          },
          {
            day: "Day 4 — Upper B",
            focus: "Vertical Push / Pull",
            completed: false,
            exercises: [
              { name: "Overhead Press", sets: 4, reps: "6", load: "RPE 8", rest: "3 min" },
              { name: "Weighted Pull-up", sets: 4, reps: "6", load: "+25 lb", rest: "2-3 min" },
              { name: "Lateral Raise", sets: 4, reps: "15", load: "RPE 9", rest: "60 sec" },
              { name: "EZ-Bar Curl", sets: 3, reps: "12", load: "RPE 9", rest: "60 sec" },
            ],
          },
        ],
      },
    ],
  },
];

export function programForClient(clientId: string): Program | undefined {
  return programs.find((p) => p.clientId === clientId && p.status === "Active");
}

/* ------------------------------------------------------------------ */
/* Nutrition                                                           */
/* ------------------------------------------------------------------ */

export const nutritionPlans: NutritionPlan[] = [
  {
    clientId: "cl_jordan",
    strategy: "Moderate deficit — training-day carb cycling.",
    target: { calories: 2450, protein: 210, carbs: 240, fats: 70 },
    todayConsumed: { calories: 1780, protein: 165, carbs: 168, fats: 52 },
    waterTargetLiters: 3.5,
    waterConsumedLiters: 2.2,
    weekAdherence: [95, 88, 92, 100, 84, 90, 76],
  },
];

export function nutritionForClient(clientId: string): NutritionPlan | undefined {
  return nutritionPlans.find((n) => n.clientId === clientId);
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export const progressByClient: Record<string, ProgressPoint[]> = {
  cl_jordan: [
    { date: "2026-02-03", weight: 224, bodyFat: 24.5, leanMass: 169, waist: 38.5 },
    { date: "2026-03-02", weight: 219, bodyFat: 23.1, leanMass: 168, waist: 37.5 },
    { date: "2026-04-06", weight: 214, bodyFat: 21.4, leanMass: 168, waist: 36.5 },
    { date: "2026-05-04", weight: 211, bodyFat: 20.2, leanMass: 168, waist: 35.8 },
    { date: "2026-06-01", weight: 208, bodyFat: 18.9, leanMass: 169, waist: 35.0 },
    { date: "2026-07-07", weight: 207, bodyFat: 18.1, leanMass: 170, waist: 34.6 },
    { date: "2026-07-21", weight: 204, bodyFat: 17.2, leanMass: 169, waist: 34.0 },
  ],
};

export function progressForClient(clientId: string): ProgressPoint[] {
  return progressByClient[clientId] ?? [];
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export const messagesByClient: Record<string, Message[]> = {
  cl_jordan: [
    { id: "m1", from: "coach", author: "Shane", body: "Reviewed your check-in — 92% compliance and a PR. Elite week. Bumping protein 20g.", timestamp: "2026-07-22T14:05:00Z", read: true },
    { id: "m2", from: "client", author: "Jordan", body: "Appreciate it. Deadlift felt heavy Thursday, hips a little tight.", timestamp: "2026-07-22T15:20:00Z", read: true },
    { id: "m3", from: "coach", author: "Shane", body: "Added a 5-min hip flow to your warmup on Day 3. Keep the top set at RPE 8, don't grind.", timestamp: "2026-07-22T15:41:00Z", read: true },
    { id: "m4", from: "client", author: "Jordan", body: "Got it. Also — traveling next week, hotel gym only. Adjust?", timestamp: "2026-07-23T09:12:00Z", read: false },
  ],
};

export function messagesForClient(clientId: string): Message[] {
  return messagesByClient[clientId] ?? [];
}

/* ------------------------------------------------------------------ */
/* Weekly priorities (client dashboard)                                */
/* ------------------------------------------------------------------ */

export const weeklyPrioritiesByClient: Record<string, WeeklyPriority[]> = {
  cl_jordan: [
    { id: "wp1", label: "Hit all 4 training sessions", done: true },
    { id: "wp2", label: "Average 210g protein / day", done: false },
    { id: "wp3", label: "9,000 steps daily", done: true },
    { id: "wp4", label: "Sleep 7.5h+ (5 of 7 nights)", done: false },
    { id: "wp5", label: "Submit Sunday check-in", done: false },
  ],
};

export function prioritiesForClient(clientId: string): WeeklyPriority[] {
  return weeklyPrioritiesByClient[clientId] ?? [];
}

/* ------------------------------------------------------------------ */
/* Content calendar                                                    */
/* ------------------------------------------------------------------ */

export const content: ContentItem[] = [
  { id: "co_1", title: "3 mistakes killing your deadlift", platform: ["Instagram", "TikTok"], format: "Reel", pillar: "Education", status: "Scheduled", publishDate: "2026-07-28", hookNotes: "Hook: your deadlift isn't weak — it's these 3 mistakes." },
  { id: "co_2", title: "Jordan's 6-month transformation", platform: ["Instagram"], format: "Carousel", pillar: "Transformation", status: "Editing", publishDate: "2026-07-30", hookNotes: "Before/after + the system behind it." },
  { id: "co_3", title: "How I program for busy professionals", platform: ["YouTube"], format: "Long-form Video", pillar: "Authority", status: "Filming", publishDate: "2026-08-02", hookNotes: "Walkthrough of the 4-day split." },
  { id: "co_4", title: "Protein targets, simplified", platform: ["Instagram", "Email"], format: "Post", pillar: "Education", status: "Writing", publishDate: "2026-08-04", hookNotes: "1g/lb is a myth for most people." },
  { id: "co_5", title: "Client win — Priya's 5K PR", platform: ["Instagram"], format: "Story", pillar: "Transformation", status: "Idea", publishDate: "2026-08-05", hookNotes: "Social proof for hybrid athletes." },
  { id: "co_6", title: "Summer coaching openings", platform: ["Instagram", "Email"], format: "Reel", pillar: "Promotion", status: "Idea", publishDate: "2026-08-08", hookNotes: "3 spots. CTA to application." },
];

/* ------------------------------------------------------------------ */
/* Business metrics (weekly scoreboard)                                */
/* ------------------------------------------------------------------ */

export const metrics: Metric[] = [
  { id: "mt_1", period: "2026 — Week 30", weekOf: "2026-07-20", activeClients: 5, newLeads: 6, newClients: 1, revenue: 1850, mrr: 1550, churned: 0, contentPublished: 3, calls: 2, closeRate: 50, retention: 96 },
  { id: "mt_2", period: "2026 — Week 29", weekOf: "2026-07-13", activeClients: 4, newLeads: 5, newClients: 0, revenue: 1300, mrr: 1250, churned: 0, contentPublished: 2, calls: 1, closeRate: 0, retention: 100 },
  { id: "mt_3", period: "2026 — Week 28", weekOf: "2026-07-06", activeClients: 4, newLeads: 4, newClients: 1, revenue: 1550, mrr: 1250, churned: 1, contentPublished: 3, calls: 3, closeRate: 33, retention: 80 },
  { id: "mt_4", period: "2026 — Week 27", weekOf: "2026-06-29", activeClients: 4, newLeads: 3, newClients: 0, revenue: 1000, mrr: 1000, churned: 0, contentPublished: 2, calls: 1, closeRate: 0, retention: 100 },
];
