"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { WeeklyPriority } from "@/lib/types";

export function WeeklyPriorities({ initial }: { initial: WeeklyPriority[] }) {
  const [items, setItems] = useState(initial);
  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {done} of {items.length} complete
        </span>
        <span className="text-xs font-semibold text-blood-500">
          {Math.round((done / items.length) * 100)}%
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() =>
                setItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
                )
              }
              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                  item.done
                    ? "border-blood-500 bg-blood-500 text-white"
                    : "border-white/20 text-transparent group-hover:border-white/40"
                }`}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span
                className={`text-sm ${
                  item.done ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
