import { Beef, Wheat, Droplet, GlassWater, Info } from "lucide-react";
import { getCurrentClient, nutritionForClient } from "@/lib/data";
import { Card, PageHeader, SectionTitle, Ring, ProgressBar, EmptyState } from "@/components/primitives";

export default function NutritionPage() {
  const client = getCurrentClient();
  const plan = nutritionForClient(client.id);

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Nutrition" title="Nutrition" />
        <Card className="p-6">
          <EmptyState title="No nutrition plan yet" hint="Your coach will set your targets after onboarding." />
        </Card>
      </div>
    );
  }

  const { target, todayConsumed } = plan;
  const calPct = Math.round((todayConsumed.calories / target.calories) * 100);
  const remaining = target.calories - todayConsumed.calories;

  const macros = [
    { key: "Protein", icon: Beef, color: "bg-blood-500", consumed: todayConsumed.protein, target: target.protein, unit: "g" },
    { key: "Carbs", icon: Wheat, color: "bg-amber-500", consumed: todayConsumed.carbs, target: target.carbs, unit: "g" },
    { key: "Fats", icon: Droplet, color: "bg-sky-500", consumed: todayConsumed.fats, target: target.fats, unit: "g" },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nutrition"
        title="Today's targets"
        subtitle={plan.strategy}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calories ring */}
        <Card className="flex flex-col items-center justify-center p-6">
          <Ring
            value={calPct}
            size={160}
            stroke={12}
            label={`${todayConsumed.calories}`}
            sublabel={`of ${target.calories} kcal`}
          />
          <div className="mt-4 text-center">
            <div className="text-sm font-semibold text-white">
              {remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`}
            </div>
            <div className="text-xs text-zinc-500">Daily calorie budget</div>
          </div>
        </Card>

        {/* Macro bars */}
        <Card className="p-6 lg:col-span-2">
          <SectionTitle>Macronutrients</SectionTitle>
          <div className="space-y-5">
            {macros.map((m) => {
              const pct = Math.min(100, Math.round((m.consumed / m.target) * 100));
              const Icon = m.icon;
              return (
                <div key={m.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <Icon className="h-4 w-4 text-zinc-400" />
                      {m.key}
                    </span>
                    <span className="text-sm text-zinc-400">
                      <span className="font-semibold text-white">{m.consumed}</span>
                      {" / "}
                      {m.target}
                      {m.unit} · <span className="text-zinc-500">{pct}%</span>
                    </span>
                  </div>
                  <ProgressBar value={pct} color={m.color} height="h-2.5" />
                </div>
              );
            })}
          </div>

          {/* Water */}
          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <GlassWater className="h-4 w-4 text-zinc-400" />
                Water
              </span>
              <span className="text-sm text-zinc-400">
                <span className="font-semibold text-white">{plan.waterConsumedLiters}</span>
                {" / "}
                {plan.waterTargetLiters} L
              </span>
            </div>
            <ProgressBar
              value={Math.round((plan.waterConsumedLiters / plan.waterTargetLiters) * 100)}
              color="bg-cyan-500"
              height="h-2.5"
            />
          </div>
        </Card>
      </div>

      {/* Weekly adherence */}
      <Card className="p-6">
        <SectionTitle right={<span className="text-xs text-zinc-500">Last 7 days</span>}>
          Nutrition adherence
        </SectionTitle>
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          {plan.weekAdherence.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[42px] rounded-t-lg ${
                    v >= 85 ? "bg-emerald-500" : v >= 70 ? "bg-amber-500" : "bg-blood-500"
                  }`}
                  style={{ height: `${v}%` }}
                  title={`${v}%`}
                />
              </div>
              <span className="text-xs font-medium text-zinc-400">{v}%</span>
              <span className="text-[11px] text-zinc-600">{days[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-ink-850/60 px-4 py-3 text-xs text-zinc-400">
          <Info className="h-4 w-4 shrink-0 text-blood-500" />
          Weekend dips are normal — aim to keep adherence above 85% across the week for steady fat loss.
        </div>
      </Card>
    </div>
  );
}
