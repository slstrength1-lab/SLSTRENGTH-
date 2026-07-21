# nutrition-engine

Core calculation logic: macros, calorie targets, and recommendation rules. This is the single source of truth for nutrition math — `meal-plans/`, `recipes/`, `supplements/`, and `api/` should all call into this rather than reimplementing calculations.
