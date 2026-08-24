# Healthy Eating Companion — Alpha 0.6.7 Build & Test Report

## Build objective

Alpha 0.6.7 rebuilds the Diary/Meal Planner interaction so the Diary is the primary place to build and confirm a day. Single-meal companion planning now occurs inside each Diary meal. The standalone Meal Planner remains for bulk planning.

## Data-preservation check

The release retains the established main storage keys:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

The version field migrates to 0.6.7 without intentionally clearing existing records.

## Automated/static checks completed

- `node --check` passed for `app.js`, `alpha06.js`, `alpha064.js` and `companions.js`.
- Browser DOM harness loaded `config.js`, `companions.js`, `app.js`, `alpha06.js` and `alpha064.js` without runtime exceptions.
- Seeded Alpha 0.6.6 data with a stale 2,000 Cal Normal target migrated to the profile recommendation of 1,745 Cal.
- Normal -> Fasting preview changed immediately to 500 Cal; Fasting -> Normal restored 1,745 Cal.
- Missing profile recommendation test showed `Recommendation Unavailable` / `Target Needs Attention` and did not use the stale 2,000 Cal value.
- New Add Food action opened with a blank search.
- `Cappucino` resolved to the local `Cappuccino With Light Milk` result.
- An intentionally seeded irrelevant online `Gelato Truffle` result was suppressed for the cappuccino query.
- Returning to All Resources restored the local cappuccino results.
- Settings summary displayed `Location — Queensland 4357, Australia` and did not display an unrequested Mobile field.
- Weight history displayed friendly Australian dates.
- Editing the older 5 Aug weight did not replace the newer 7 Aug current weight or recalculate the 1,745 Cal current recommendation.
- Meal-level Suggest opened optional quick questions without leaving the Diary.
- `Just Suggest Something` opened a review step and added nothing until confirmation.
- Bulk Meal Planner opened with all meal-selection checkboxes clear.
- Fasting bulk-planning regression: with a 500 Cal day and Breakfast/Lunch/Dinner selected, generated suggestions totalled 429 Cal and stayed under the whole-day cap.
- Fasting regression with 90 Cal already Planned by the user: the planner showed only 410 Cal available, explicitly noted the existing Breakfast food, and generated additional suggestions within the remaining allowance.
- AFCD Release 3 local dataset remains bundled with 1,588 food records.

## Important real-device checks still required

The browser harness cannot replace testing of device-controlled services. Founder/family testing should continue for:

- Safari/iOS speech recognition;
- camera permissions;
- barcode scanning;
- nutrition-panel OCR;
- share/print handoff;
- long-session navigation and browser-storage persistence on actual devices.

## Known architecture limitation

This remains a static GitHub Pages founder trial. Cross-device account synchronisation, secure central invitations, central analytics and central feedback collection require a protected backend in a later phase.
