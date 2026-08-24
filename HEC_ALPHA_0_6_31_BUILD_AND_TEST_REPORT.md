# Healthy Eating Companion — Alpha 0.6.31 Build & Test Report

## Build purpose

Alpha 0.6.31 is a focused search, serving and review-polish release based directly on Alpha 0.6.30. Founder testing showed the core meal-entry flow is now close to Easy Diet Diary, so this build targets the remaining friction rather than adding another broad feature layer.

## Implemented changes

- Faster local predictive response (95 ms full local settle, immediate live prediction).
- Earlier automatic online lookup (360 ms pause).
- Incremental online rendering: Open Food Facts is no longer blocked by USDA completion.
- Entity-first external query normalisation for Australian retailer/brand phrases.
- Steak-family AFCD candidate recovery for database names such as `Lamb, steak...`.
- Steak no longer defaults to Beef merely because the word steak was typed.
- Compatible cooked-reference fallback for ordinary cooking methods, while contradictory records remain invalid.
- Physical shape words (strips/pieces/chunks etc.) do not invalidate an otherwise compatible base food.
- Conditional Air Fried preparation choice for applicable foods.
- Locked selected whole-egg size through Review, removing the redundant second size dropdown.
- Useful brand + product identity in Diary rows and meal overview.
- Suspicious package records that expose missing nutrition as zero energy are filtered.
- Product matching now requires every meaningful residual query token to match (using the existing exact/prefix/fuzzy token tolerance), preventing an unavailable typed brand from being dropped in favour of another brand.
- Nutrition Panel serving amount dynamically rescales recognised nutrition from the chosen source basis.
- More tolerant Serving Size OCR patterns.
- Optional front-of-pack OCR assists with brand/product naming while remaining user-editable.
- iPhone viewport/input hardening for the intermittent narrow/squeezed rendering report.
- Guided choice transitions hardened to avoid invisible state advancement.

## Data continuity

Storage keys remain unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

No intentional deletion of profile, diary, weight, saved foods/recipes, meals, shopping data or settings is introduced.

## Validation

The build passed JavaScript syntax checks, HTML ID checks and pure-module search/branch/serving regression tests. A local Chromium smoke test could not be completed in this environment: Playwright navigation is administrator-blocked and direct headless Chromium could not establish a usable session. No browser-runtime pass is claimed; the founder iPhone HTTPS test remains the final runtime validation. See `SEARCH_SERVING_REGRESSION_RESULTS_ALPHA_0_6_31.txt` for the recorded results.

## Device test priority

The most important founder checks are: lamb-steak word-order searches, chicken-strips non-dead-end, selected Large Egg staying locked at Review, 135 g Nutrition Panel rescaling, front-pack name assistance, and repeated iPhone keyboard/review navigation without the narrow-screen state.
