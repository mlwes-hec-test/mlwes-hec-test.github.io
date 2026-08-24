# Healthy Eating Companion — Founder Trial Alpha 0.6.6

## Build Scope
Alpha 0.6.6 was built from Alpha 0.6.5 after the latest founder/family testing round. The build keeps the existing browser-storage keys so current tester records migrate forward at the same site address.

## Major Implementation Areas

### Energy and Day-Type State
- Normal Day derives its default target from the current profile recommendation.
- Fasting target is stored separately.
- Date-specific custom targets require an explicit opt-in flag.
- Migration repairs stale inherited Normal-Day values without deleting diary/profile data.

### Food Data
- Added `afcd-release-3.json`, containing 1,588 compact Australian Food Composition Database Release 3 records.
- Imported nutrient fields include energy, protein, carbohydrate, fat, saturated fat, fibre, total sugar, added sugar, free sugar, sodium and moisture where present in the source data.
- Local Australian search ranking is ahead of international online results.
- Blank All Resources intentionally remains a smaller curated view for mobile performance; the full AFCD dataset is searched as the user types.

### Meal Planner
- New sessions clear previous checkbox state.
- Normal-Day unticked meals retain a reserve; Fasting-Day unticked meals do not.
- Existing Eaten/Planned entries are deducted before calculating companion planning capacity.
- Added lower-energy suggestions for fasting scenarios.
- Added a no-additional-food state where the remaining allowance is too small for a sensible suggestion.
- Planner scoring incorporates pending suggestions already chosen for other meals in the same session.

### Nutrition Presentation
- Macro targets were rebalanced from the earlier high-protein calculation.
- Fibre behaves as a minimum.
- Total sugars are informational.
- Free sugars are separate when data supports them.

### Shopping List
- Sticky Add/Speak controls.
- Expanded Australian grocery vocabulary and category inference.
- Added common spoken quantity/unit parsing and local learning from confirmed voice corrections.
- Select/Deselect All and Clear Entire List.
- Category-grouped Share and Print formatting.

## Automated / Harness Verification
The code was checked with Node syntax validation and an inline Chromium DOM harness that runs the production HTML/CSS/JavaScript with seeded Alpha 0.6.5 storage and the local AFCD dataset.

Verified in the harness:
- Alpha 0.6.5 stale Normal target of 2,000 Cal migrated to a profile recommendation of 1,506 Cal.
- Normal → Fasting → Normal changed 1,506 → 500 → 1,506 Cal.
- Date custom-target control remains off/hidden until explicitly enabled.
- New add-to-Breakfast flow started with a blank search field.
- Contextual `Suggest Breakfast` control appeared.
- `bacon` returned the guided Australian Shortcut Bacon first, followed by relevant AFCD bacon records.
- `lasagne` returned Australian AFCD commercial and homemade lasagne records.
- New Meal Planner session contained zero selected meal checkboxes.
- Fresh 500 Cal Fasting Day with Lunch + Dinner allocated approximately 240 / 260 Cal and generated approximately 198 / 229 Cal suggestions.
- Fresh 500 Cal Fasting Day with all six meal occasions generated six small suggestions totalling approximately 441 Cal in the test scenario.
- After accepted meals left very little fasting allowance, a subsequent plan could return `No Additional Food Suggested` rather than force an over-budget meal.
- After all selected suggestions were accepted, original plan/retry controls were hidden and Plan More Meals was available.
- A seeded old Shopping List reclassified Granny Smith Apples, Chicken Drumsticks and Toilet Paper into sensible categories.
- Select All changed to Deselect All.
- Mock voice transcript `two packets of say yo biscuits` was interpreted as `SAO Biscuits` with quantity `2 packets`.
- No JavaScript console or page errors occurred in the tested harness flows.
- With a 1,506 Cal profile, displayed macro guides were approximately Protein 94 g, Carbohydrate 170 g and Fat 50 g rather than the previous 168 g protein target.

## Static Checks
- `node --check app.js` — pass
- `node --check alpha06.js` — pass
- `node --check alpha064.js` — pass
- `node --check config.js` — pass
- Local AFCD JSON food count — 1,588 records

## Important Remaining Real-Device Tests
Camera scanning, barcode recognition, OCR, speech recognition, GitHub Pages service-worker update behaviour and iPhone/iPad layout should still be tested on the actual HTTPS trial site.

## Data Source Note
The AFCD-derived local dataset is attributed to Food Standards Australia New Zealand. See `AFCD_DATA_NOTICE_ALPHA_0_6_6.txt` for licence and data-limitations information.
