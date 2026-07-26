"use client";

import { useState } from "react";
import { Check, Circle, Dumbbell, Clock, Repeat } from "lucide-react";
import type { Program } from "@/lib/types";
import { Card } from "./primitives";

export function TrainingProgram({ program }: { program: Program }) {
  const week = program.weeks[0];
  const [activeDay, setActiveDay] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const day = week.days[activeDay];
  const dayKey = (exName: string) => `${activeDay}:${exName}`;
  const completedCount = day.exercises.filter((e) => done[dayKey(e.name)]).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Day rail */}
      <Card className="h-fit p-2">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          {week.label}
        </div>
        <div className="space-y-1">
          {week.days.map((d, i) => {
            const active = i === activeDay;
            return (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-blood-500/10 ring-1 ring-inset ring-blood-500/30" : "hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    d.completed
                      ? "bg-emerald-500/15 text-emerald-400"
                      : active
                        ? "bg-blood-500 text-white"
                        : "bg-ink-800 text-zinc-400"
                  }`}
                >
                  {d.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>
                    {d.day.split("—")[1]?.trim() ?? d.day}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">{d.focus}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day detail */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-blood-500/10 text-blood-500 ring-1 ring-inset ring-blood-500/25">
              <Dumbbell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{day.day}</h2>
              <p className="text-xs text-zinc-500">{day.focus}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-white/10">
            {completedCount}/{day.exercises.length} logged
          </span>
        </div>

        {/* Column header */}
        <div className="hidden grid-cols-[1.6fr_repeat(4,0.7fr)_auto] gap-3 border-b border-white/[0.06] pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 sm:grid">
          <span>Exercise</span>
          <span>Sets</span>
          <span>Reps</span>
          <span>Load</span>
          <span>Rest</span>
          <span className="text-right">Done</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {day.exercises.map((ex) => {
            const isDone = !!done[dayKey(ex.name)];
            return (
              <li
                key={ex.name}
                className="grid grid-cols-2 items-center gap-2 py-3 sm:grid-cols-[1.6fr_repeat(4,0.7fr)_auto] sm:gap-3"
              >
                <div className="col-span-2 sm:col-span-1">
                  <div className={`font-medium ${isDone ? "text-zinc-500 line-through" : "text-white"}`}>
                    {ex.name}
                  </div>
                  {(ex.notes || ex.tempo) && (
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                      {ex.tempo && (
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="h-3 w-3" /> Tempo {ex.tempo}
                        </span>
                      )}
                      {ex.notes && <span className="text-blood-400">{ex.notes}</span>}
                    </div>
                  )}
                </div>
                <Cell label="Sets" value={String(ex.sets)} />
                <Cell label="Reps" value={ex.reps} />
                <Cell label="Load" value={ex.load} />
                <Cell label="Rest" value={ex.rest} icon />
                <div className="col-span-2 flex justify-end sm:col-span-1">
                  <button
                    onClick={() =>
                      setDone((prev) => ({ ...prev, [dayKey(ex.name)]: !prev[dayKey(ex.name)] }))
                    }
                    className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : "border-white/15 text-zinc-500 hover:border-white/30"
                    }`}
                    aria-label={`Mark ${ex.name} done`}
                  >
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <Circle className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Cell({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="text-sm">
      <span className="mr-1 text-[11px] text-zinc-600 sm:hidden">{label}:</span>
      <span className="inline-flex items-center gap-1 text-zinc-300">
        {icon && <Clock className="h-3 w-3 text-zinc-600" />}
        {value}
      </span>
    </div>
  );
}
