# Healthy Eating Companion — Alpha 0.6.9 Build & Test Report

## Build Objective

Alpha 0.6.9 stabilises the food-entry, Diary, profile, weight and hydration workflows identified during real-device Alpha 0.6.7 founder testing. It also makes the existing bundled Australian Food Composition Database substantially more visible so the next test round is less constrained by the small starter list.

## Data Preservation And Fresh-Start Behaviour

The release retains the established main storage keys:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

The version migrates to 0.6.9 without intentionally clearing current tester data. `Reset App for Testing` removes the profile and functional trial data on the current browser/device and reloads the onboarding flow. This is the intended way for the founder to perform the requested clean-start test after deploying the build. A backup remains recommended first when existing test data may be useful later.

## Main Implementation Changes

### Diary

- Ordinary Diary entries now use one user-facing recorded state.
- No separate Planned/Eaten confirmation is required.
- Individual foods can be edited, copied and deleted.
- Whole meals can be cleared with confirmation and Undo.
- Meal-level companion suggestions remain embedded in the Diary.
- Multi-meal planning remains available as a separate power tool.

### Food Library

- New Add Food flows start blank.
- The app still bundles 1,588 AFCD Release 3 food records.
- Blank All Resources now surfaces curated familiar AFCD records rather than hiding the entire AFCD dataset until a query is entered.
- Common-food aliases and ranking were expanded, including cappuccino, carrot cake, bacon, English muffin, sausages, steak, yoghurt, cheese, potatoes, pumpkin, bread, juice and soft drink.
- Mobile live-search behaviour attempts to keep the first result above the visual keyboard.
- General food/recipe entry does not silently default to a meal.

### Voice/Text Logging

- Full recognised phrases are retained for food matching.
- General logging starts with `Choose A Meal` and requires a meal before saving.
- Contextual logging launched from a Diary meal may preselect that known meal.

### Profile / Onboarding

- Australian State Or Territory is now a selector with all eight states/territories.
- Australian postcode/state plausibility checking is present.
- Australian state selection proposes the appropriate IANA time zone and daylight-saving behaviour is left to the time-zone rules.
- `Sex Used For Energy Calculation` includes a clearer explanation.
- Companion selection opens an immediate preview/modal before the final Choose action.
- Headings have been strengthened and normalised toward consistent Title Case.

### Recommendations

- Daily Fluids remains a visible core recommendation.
- Detailed Nutrition Goals uses a collapsed-by-default expandable section.

### Weight / Progress

- Duplicate unchanged check-ins are blocked.
- Save state becomes `Saved ✓` until an input changes.
- Same-date changed weights prompt before replacement.
- Spoken confirmation is shortened to `Weight and date saved.` for routine saves.
- Progress History plots the same Weight Check-In records in an SVG trend chart with a tight local weight scale and readable Australian dates.
- History summary wording separates Food Diary Days, Weight Check-Ins and Activities.

### Hydration

- Replaced the anonymous additional-drink volume field with an `Add A Drink` flow.
- Water/zero-energy drinks can be quick-added.
- Nutrient-containing drinks route through the Food Library so food nutrients and hydration can be captured together.

## Static / Automated Checks Completed

- JavaScript syntax checking passed for `app.js`, `alpha06.js`, `alpha064.js`, `companions.js`, `config.js` and `service-worker.js`.
- Bundled AFCD JSON parsed successfully with 1,588 foods.
- Source checks confirmed the eight Australian state/territory selector values.
- Source checks confirmed the companion preview modal, collapsed Detailed Nutrition Goals, separate Daily Fluids card, blank general meal selection and Add A Drink controls.
- Search-ranking spot checks against AFCD data confirmed `carrot cake` maps to carrot-cake records and a partial `cappu` query reaches the AFCD cappuccino/flat-white/latte record.
- Existing Alpha 0.6 storage keys remain unchanged for migration compatibility.

## Real-Device Checks Still Required

The build still requires iPhone/iPad founder testing for:

- Safari visual-keyboard positioning during live Food Library search;
- speech-recognition accuracy and voice review;
- long-session navigation and local storage persistence;
- native share/print handoff;
- camera permissions, barcode scanning and nutrition-panel OCR.

## Barcode / Nutrition Panel Direction

Alpha 0.6.9 intentionally prioritises the food-entry foundation first. Barcode and nutrition-panel workflows remain present as prototypes, but the next development round is intended to make packaged-food capture a primary test workflow: identify → review → confirm → save/add to Diary.
