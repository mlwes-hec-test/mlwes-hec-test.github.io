# Healthy Eating Companion — Founder Trial Alpha 0.6.21

## Build objective

Alpha 0.6.21 is a stabilisation build centred on the food-search architecture and the iPhone screen-freeze reported during ordinary Diary food entry. It also incorporates the agreed Home, companion, Daily Progress and graph-range changes.

## Critical search repair

The previous protected guided-search layer used a MutationObserver on the Food Library results container. The observer could be triggered by its own DOM rewrite, causing repeated result reconstruction. Alpha 0.6.21 removes that observer and keeps search rendering explicit and one-pass.

The guided result ordering has also been corrected to follow the user's typed intent progressively:

- `Pie` → **Pie** first, then Curry Pie.
- `Curry` → **Curry**.
- `Curry Pie` → **Curry Pie** first, with already-entered words carried into the guided workflow.
- Specialist families such as sausage, egg, bread, potato, rice, pasta, meat, fish, dairy, cereal, coffee, burger and sandwich/wrap continue through structured refinement.
- An unfamiliar food no longer falls immediately into an unstructured database list; it receives the generic guided source/refinement path before quantity and unit review.
- Raw AFCD and online records remain secondary data sources rather than the normal first-choice UI.

## Home and navigation

- Normal completed-user startup now opens Home.
- Weight, goal weight and daily energy target are removed from the Home header.
- Home now has eight circle shortcuts: Daily Progress, Diary, Food Library, Quick Food Log, Shopping List, Nutrition/Balance/Weight, Quick Weight Log and Settings.
- Meal Planner is removed from Home but remains available through `Plan Multiple Meals` in Diary.
- Diary-level Quick Log is removed.
- Companion personality tagline is not repeated in the centre.
- A short current companion thought/joke/quote appears in the centre below `Tap for guidance`; the former separate large inspiration card is removed.

## Daily Progress

A tappable **Nutrition Balance** indicator now gives a 1–10 score with a horizontal yellow-to-green line. The prototype score combines five-food-group coverage, protein/fibre progress, energy position and sodium. Tapping the indicator explains what is going well and what may need attention, with an optional suggestions action.

## Weight graph

The agreed ranges remain present: 7 Days, 14 Days, 30 Days, 3 Months, 6 Months, 1 Year and All.

## Data continuity

The established Alpha 0.6 local-storage identifiers are unchanged. Existing tester data is not intentionally cleared. Publishing the complete replacement folder at the same GitHub Pages path/browser origin remains necessary for continuity.

## Validation performed

- `node --check` passed for `app.js`, `alpha06.js`, `alpha064.js`, `config.js` and `service-worker.js`.
- Core version references were updated to Alpha 0.6.21.
- Static source inspection confirmed the self-triggering Food Library MutationObserver is removed.
- Static source inspection confirmed Pie/Curry/Curry Pie guided ordering and generic guided fallback.
- Static source inspection confirmed the Home circle and Daily Progress balance controls are present.

## Real-device test priority

The first founder test should deliberately reproduce the former failure: Diary → Dinner → Add Food → type `Pie` slowly. If the keyboard remains responsive and the guided sequence opens correctly, repeat with `Curry`, `Curry Pie`, sausage, banana, an uncommon food and Refresh Online Results.
