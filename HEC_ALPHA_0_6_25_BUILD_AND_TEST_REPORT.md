# Healthy Eating Companion — Alpha 0.6.25 Conditional Branching + Match Validation

## Objective
Correct the structural fault found during Alpha 0.6.24 founder testing: a guided answer was being stored as a label without reliably constraining later questions or the final nutrition reference. The demonstrated failure was `Pie -> Sweet -> Meat -> Beef` finishing on the AFCD reference `Pie, sweet, apple, commercial`.

## Architecture change
Alpha 0.6.25 adds `guided-branching.js`, a pure compatibility/validation layer between the universal query/taxonomy engine and the UI.

The active search stack is now:
1. `search-foundation.js` — query parsing, concepts, descriptors and food-facet extraction.
2. `guided-branching.js` — strict candidate filtering, conditional branching, choice generation and final match validation.
3. `serving-foundation.js` — serving/measure selection and package-basis handling.
4. `alpha06.js` — one canonical UI/controller integration.

## Conditional branching
Every selected facet now filters the candidate nutrition records immediately. Later choices are derived from the remaining compatible records only. The earlier behaviour of retaining the old candidate pool when zero records matched has been removed.

For AFCD Pie records this now produces:
- Initial: Savoury / Sweet.
- Sweet: Apple (current supported sweet-pie reference); savoury fillings are absent.
- Savoury: Chicken & Vegetable / Meat / Steak & Kidney; Apple is absent.
- Savoury -> Meat: Commercial / Ready To Eat or Purchased Frozen.

The same candidate-derived rule applies to other food families rather than being implemented as a one-off Pie UI wizard.

## Match validation
Before Review/Add, the proposed source must validate against:
- every meaningful selected facet; and
- meaningful residual words typed by the user that were not already covered by the concept or selected facets.

This prevents specific typed intent from disappearing during guided refinement. For example, `Curry Pie` cannot silently use a plain meat-pie record unless the proposed source supports curry. `Homemade` cannot silently use a source explicitly classified as commercial.

## Pie descriptor correction
Pie semantics were improved at the taxonomy layer so the AFCD records expose coherent Kind/Filling values:
- Savoury + Chicken & Vegetable
- Savoury + Meat
- Savoury + Steak & Kidney
- Sweet + Apple

This means Sweet/Savoury branching is a consequence of the nutrition data and category semantics, not separate duplicated screens.

## Long choice lists
Guided questions now paginate at six choices per page with More Choices / Earlier Choices controls. This keeps individual screens compact while ensuring supported values beyond the first six remain reachable.

## Automated validation completed
- JavaScript syntax check passed for all active JavaScript files.
- Pure branching regression tests passed for:
  - Pie first branch Savoury/Sweet.
  - Sweet branch -> Apple only.
  - Savoury branch excludes Apple and exposes supported savoury fillings.
  - Meat branch narrows to supported source choices.
  - Sweet Apple record is rejected for a Sweet -> Meat -> Beef contradiction.
  - Commercial meat-pie record is rejected for Homemade.
  - Curry modifier cannot silently fall back to plain meat pie.
  - Beef Pie can use the generic AFCD meat reference because the AFCD description explicitly supports beef and/or mutton.
  - Lettuce varieties remain data-driven.
  - Apple varieties remain data-driven.
  - Sausage protein branching remains data-driven; Chicken narrows to Plain/Flavoured where supported.
- Full built-in-concept branch audit: **45 concepts, 559 offered branches, 418 terminal paths, 0 impossible offered branches and 0 terminal validation failures** using the 1,588-record AFCD dataset.
- Serving foundation regression over all **1,588 AFCD records**: **0 invalid serving/default-unit results** in the pure resolver.
- Search and branching foundation versions are both 0.6.25; service-worker cache version is refreshed for deployment.

## Environment limitation
A full physical iPhone/iPad interaction cannot be reproduced in this build environment. The founder-device pass remains the final validation for touch/modal flow and GitHub Pages caching. The code-level, dataset-level, branching and serving checks above were completed before packaging.
