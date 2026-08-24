# Healthy Eating Companion — Alpha 0.6.32 Build & Test Report

## Build purpose

Alpha 0.6.32 is a consolidation release based directly on Alpha 0.6.31 and the latest founder iPhone comparison with Easy Diet Diary. It targets four connected areas: Australian catalogue discovery, fewer steps when repeating/moving meals, coherent package-serving nutrition, and more reliable/rapid PWA startup.

## Implemented changes

- Local full-search settle reduced to 70 ms and automatic online lookup to 180 ms.
- Expanded grouped Australian menu snapshots: KFC (11 groups / 126 unique item names), McDonald’s/Maccas (10 / 86), Hungry Jack’s (7 / 63).
- Missing chain nutrition cannot become a false 0-Cal Diary entry.
- Recent Meal destination now prioritises the meal explicitly selected in Recent over a stale pending add context.
- Whole-meal Copy and Move actions added.
- Multi-date copy includes Next 7 Days and Same Weekday x4 shortcuts.
- Single diary entries can be moved between dates/meals.
- Open Food Facts package-serving fields are cross-checked against per-100 values scaled by explicit serving mass/volume; materially inconsistent serving fields are corrected from the coherent basis and flagged internally.
- Dark/coloured nutrition-panel OCR preprocessing improved with upscaling, grayscale conversion, automatic thresholding and inversion where useful.
- Barcode/OCR libraries moved out of normal page startup and remain available through the existing on-demand loaders.
- Service worker changed to quicker cached-core startup behaviour, short navigation network timeout, parallel install caching and corrected app-shell fallback.
- Existing Alpha 0.6.31 brand identity, guided search, natural serving and iPhone viewport protections retained.

## Data continuity

Storage keys remain unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

No intentional reset or migration of profile, diary, weight history, saved foods/recipes, meals, shopping data or settings is introduced.

## Static validation completed

- JavaScript syntax check passed for all active local JS/service-worker files.
- HTML check found 459 IDs, all unique.
- All local `src`/`href` file references in `index.html` resolve to files in the build.
- Targeted Alpha 0.6.32 regression suite passed 7/7 checks.
- Morning Sun serving-basis mock resolved a 45 g serve to approximately 155.35 Cal, 4.59 g protein, 29.43 g carbohydrate, 0.855 g fat, 5.445 g fibre, 4.995 g sugars and 11.7 mg sodium instead of mixing the 45 g energy with 100 g macros.
- Targeted chain catalogue count checks passed for KFC, McDonald’s and Hungry Jack’s.

## Browser/runtime limitation

A local Chromium runtime smoke test was attempted but the headless Chromium process could not establish a usable session in this container and timed out. Therefore no browser-runtime pass is claimed from the build environment. The installed iPhone/GitHub Pages test remains the authoritative runtime validation.

## Important scope note

The catalogue framework is substantially broader, but a static founder build cannot truthfully guarantee a permanently complete live catalogue for every Australian fast-food chain or supermarket because ranges and menus change. HEC therefore separates item discovery from nutrition verification and safely blocks unverified nutrition. Additional chains/retailers can be expanded on the same architecture without redesigning food search.
