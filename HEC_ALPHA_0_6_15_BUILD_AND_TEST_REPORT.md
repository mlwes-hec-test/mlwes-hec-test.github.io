# HEC Alpha 0.6.15 Build and Test Report

## Build base
Built forward from Founder Trial Alpha 0.6.14. Existing Alpha 0.6 browser-storage keys are deliberately retained so tester profiles, Diary records, My Foods, My Meals & Recipes, weight history and other trial data remain compatible when the website files are replaced at the same address.

## Main changes in Alpha 0.6.15
- Expanded Australian everyday-language recognition with founder records/aliases for **Bunnings-style sausage in bread / Bunnings snag / sausage sizzle**, **Chiko Roll**, **potato scallop / potato cake / potato fritter**, **dim sim**, and **lamington**.
- Strengthened exact-alias search ranking so Australian colloquial names beat loosely related long database records.
- Voice/text logging uses the same improved matching, so phrases such as “add a Chiko Roll for lunch” or “Bunnings sausage for lunch” can resolve to the Australian entry for review.
- Added more context-aware serving choices. Depending on the food, the editor can now expose natural options such as serving, g, mL, slice, biscuit/cracker, egg, sausage, pie/piece and other package-specific units where a sensible conversion is available.
- Reworked Daily Progress status bands to the agreed **Grey → Yellow → Green → Orange → Red** progression. Green deliberately includes a practical margin around the target (approximately 85–115% for ordinary target nutrients), so a small protein overage remains green.
- Daily Progress cards now state the amount **under or over target** rather than requiring the user to calculate the difference.
- Added **Suggest Food** shortcuts on nutrients that are materially below target. Suggested foods are still reviewed before anything is entered.
- Daily Progress resets to **Today** on a fresh app load/relaunch rather than reopening the previously inspected date.
- Recent foods/meals now use the last 14 days and default to the meal context being planned (for example Breakfast). Buttons let the tester switch to Lunch, Dinner, Snacks, Other or All.
- Diary meal headings can now open a whole-meal overview. Individual foods can be tapped to edit; on touch devices a left swipe reveals Delete, with the existing Undo toast retained.
- **Plan Multiple Meals** now inherits the date currently selected in the Diary instead of silently jumping back to Today.
- Quick Log now inherits the selected Diary date, has an explicit **Cancel** button, and hides **Stop Listening** until listening has started.
- Weight Trend styling is widened and changed to a block layout so the graph uses the available card width rather than being squeezed beside its summary.
- Source badges are made more consistently visible for saved/user foods (Barcode, Nutrition Panel or Manual) wherever those records are displayed.

## Australian food-data notes
- Chiko Roll is treated as a packaged Australian product reference and remains reviewable because package sizes/formulations can change.
- Bunnings-style sausage in bread and fish-and-chip-shop potato scallop are intentionally labelled as estimates because serving size, sausage brand, bread, onion, sauce, batter and oil absorption vary.
- The built-in Australian Food Composition Database Release 3 remains available alongside local trial foods and online packaged-food lookup.

## Static validation performed
- `node --check` passed for `alpha06.js`, `app.js`, `alpha064.js`, and `companions.js`.
- HTML inspection found no duplicate IDs.
- All local script/style references in `index.html` were found.
- Version strings, manifest and service-worker cache were bumped to Alpha 0.6.15 while storage keys remain unchanged.
- The three requested Australian search phrases are present as direct aliases in the local food catalogue.

## Browser-test limitation
A Chromium smoke test was attempted in the build environment, but local HTTP navigation is blocked by the environment administrator. Real-device testing therefore remains required for Safari/Home Screen behaviour, voice permission, camera/barcode behaviour, swipe gestures and layout on the iPhone.
