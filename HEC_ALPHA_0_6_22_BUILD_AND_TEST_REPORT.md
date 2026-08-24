# HEC Alpha 0.6.22 — Build & Test Report

## Build focus
This build consolidates the Alpha 0.6.21 founder testing around search, guided entry, barcode serving metadata, diary destination context, repeated entries, nutrition-panel interpretation, Nutrition Balance states, dual Cal/kJ display and Home navigation.

## Implemented structural changes
- Canonical final search surface distinguishes generic guided food intent from branded/product intent.
- Product queries progressively narrow actual product records rather than replacing typed brand/product words with generic categories.
- Guided wizard now has a visible Back control and short sequential steps.
- Guided foods are explicitly reviewable estimates backed by an identified source rather than being marked as exact verified foods.
- Independent Food Library diary additions default to Today; meal-session additions retain their explicit date/meal.
- Fresh product selections clear stale replacement state; ordinary diary writes continue to use new entry IDs.
- Food energy presentation uses Cal + kJ.
- Nutrition Balance has empty/planning/building/incomplete/scored states.
- Companion message card restored below the Home circle; room order updated; duplicate hub Weight Check-In removed.

## Nutrition-panel regression test
A code-level parser test was run using the founder-supplied Simplee Creamy Carbonara panel values. The parser correctly separated:
- 31 g dry-mix serving: 110 Cal / 462 kJ, protein 3.7 g, fat 0.5 g, saturated fat 0.1 g, carbohydrate 22.0 g, sugars 2.3 g, sodium 319 mg.
- per 100 g dry mix: 356 Cal / 1490 kJ, protein 12.0 g, fat 1.6 g, saturated fat 0.4 g, carbohydrate 70.9 g, sugars 7.5 g, sodium 1030 mg.
- prepared serving (~144 g): 132 Cal / 553 kJ, protein 5.0 g, fat 1.3 g, saturated fat 0.3 g, carbohydrate 24.0 g, sugars 4.2 g, sodium 314 mg.

## Automated/static checks run
- `node --check` passed for `app.js`, `alpha06.js` and `alpha064.js`.
- Version/cache references checked for 0.6.22.
- Home room order checked in the built HTML.
- Required local application files and companion assets checked before packaging.
- ZIP integrity is checked after creation.

## Browser-run limitation in the build environment
A Chromium interaction smoke test was attempted. The managed browser in this build environment blocks local, file and data URLs with `ERR_BLOCKED_BY_ADMINISTRATOR`, so it cannot be used here as evidence of live UI interaction. For that reason this report does **not** claim that the iPhone runtime path has already been proven. The focused founder checklist deliberately starts with the exact search/date/repeat cases that exposed the previous faults.
