# Program Templates

Data-only strength program templates for SL Strength OS. These are **plain JSON
fixtures** — deliberately *not* hardcoded into any component. A future Program
Builder / loader reads a file here and writes it to Notion (Programs page +
Workouts rows); nothing in the app imports these at build time.

## Files

- `hardwood-force-block.json` — SL Strength — Hardwood Force Block. A 4-week
  Division I basketball offseason accumulation block (4 days/week, 112 exercise
  rows). Used to stress-test the training data architecture end-to-end.

## Shape

```jsonc
{
  "program": {
    "name": "...", "type": "...", "phase": "...",
    "goal": "...", "durationWeeks": 4, "daysPerWeek": 4,
    "fieldMap": { /* json key -> Notion property name */ },
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "focus": "...",
            "exercises": [
              {
                "order": 1, "supersetGroup": "A", "exercise": "...",
                "setType": "Power|Working|Accessory|Durability|Conditioning|Warm-up",
                "sets": 4, "reps": "5", "load": "...",
                "percent1RM": 75, "rpe": 7, "tempo": "31X1", "rest": "2-3 min",
                "notes": "..."
              }
            ]
          }
        ]
      }
    ]
  }
}
```

`percent1RM` and `rpe` are `null` when not prescribed. Every exercise key maps
1:1 onto a Notion **Workouts** property (see `program.fieldMap`); the top-level
program fields map onto the **Programs** database. `Client` and `Date` are set at
assignment time, not in the template. `Volume (lb)` is a computed Notion formula.
