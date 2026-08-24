# Healthy Eating Companion — Alpha 0.6.18 Build & Test Report

Alpha 0.6.18 was built from Alpha 0.6.17 without changing the established browser-storage keys. The build focuses on the founder-testing findings around search workflow, Recent reuse, copy destination, natural units and progress-history controls.

## Australian menu architecture
The food-entry workflow now separates **menu discovery** from **nutrition authority**. KFC Australia, McDonald’s Australia/Macca’s and Hungry Jack’s have guided Australian menu discovery. Missing current nutrition is never represented as zero. A small number of items for which current official Australian data was available during this build are included as verified snapshots; other items remain discoverable but require current verification before Diary entry.

This is intentionally a static founder-build bridge toward a future protected shared-data updater, where menu and nutrition data can be refreshed independently of the app code.

## Core usability changes
- DD-like guided sausage path.
- Search state restoration on Back.
- Recent filter/context retention and editable re-use.
- Copy to any date and meal.
- Natural fish-finger unit.
- 2-week and 6-month graph periods.
- Removed developer-style history summary box.
- Australian chain localisation including Burger King → Hungry Jack’s handling.

## Validation
JavaScript syntax checks, JSON/manifest parsing and archive integrity are performed before release packaging. Real-device iPhone/iPad testing remains required for keyboard, camera, microphone and long-session navigation behaviour.
