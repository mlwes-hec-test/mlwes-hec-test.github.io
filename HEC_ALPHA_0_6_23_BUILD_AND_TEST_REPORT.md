# Healthy Eating Companion — Alpha 0.6.23 Search Foundation

## Objective
Replace the accumulated food-specific search override layer with one canonical, data-driven search controller before broader founder testing resumes.

## Architecture
- `search-foundation.js`: pure query parsing, singular/plural handling, food concept taxonomy, reusable facet vocabulary and descriptor extraction.
- `alpha06.js`: one final search controller integrates the foundation with HEC food sources, AFCD records, product records, guided refinement, natural serving conversion and Diary entry review.
- Generic concepts not named in the static taxonomy can be generated dynamically from strong database head matches.
- Brand detection is generated from loaded product records and supplemented by an unknown-prefix heuristic, so a new brand does not require a new JavaScript wizard.

## Safety / user experience rules
- More typed words may increase specificity but must not erase previously supplied intent.
- Generic food and branded product searches use different pathways.
- No confident concept/product match produces a safe fallback rather than an unrelated substitute.
- Calories and kJ remain paired in food-level displays.
- Guided flows always have Back navigation.

## Validation
See `TESTING_CHECKLIST_ALPHA_0_6_23.txt`. Real iPhone/iPad keyboard, online-source and camera behaviour still requires founder-device testing.

## Automated regression results completed for this build
- JavaScript syntax validation passed for `search-foundation.js`, `alpha06.js`, `app.js`, `alpha064.js`, `config.js` and `service-worker.js`.
- A browser DOM harness loaded the production HTML and application scripts with the complete 1,588-record AFCD dataset and produced no page-script errors.
- All 385 unique first-level AFCD food heads were exercised through the search diagnostics; all 385 resolved as food concepts rather than being misrouted as brand/product searches.
- A separate random sample of 250 complete AFCD food names produced no query that was left with neither a food concept nor product route.
- Rapidly changing the mobile search input across 20 representative queries produced no recursion/freeze or page-script error in the harness.
- `pie` displayed Pie as the live top concept. The raw database layer was tightened so the visible raw matches were the five actual pie records; `piece` records no longer matched the three-letter word `pie`.
- `orange` displayed Orange and derived Navel and Valencia variety choices from the AFCD records. Choosing Navel reached a Navel Orange review using the Navel AFCD record and a natural medium-orange unit.
- `2 bananas` preserved quantity 2, stayed on the Banana concept, and after choosing a typical peeled banana reached a 2-banana review showing 225 Cal / 942 kJ in the harness.
- `lady finger banana` skipped the already-supplied variety question and reached a Lady Finger Banana review against the AFCD Lady Finger/Sugar banana record.
- `chicken sausage` skipped the already-supplied protein question and moved to the next meaningful distinction (plain/flavoured).
- `curry pie` remained Curry Pie and skipped the implied savoury question; it moved to the next unresolved filling choice.
- `homemade beef pie` preserved Homemade + Beef + Pie and skipped supplied/implied attributes before further refinement.
- Dynamic, non-hard-coded generic concepts were verified with examples including Quinoa, Avocado and Lasagne.
- Compound foods such as Carrot Cake, Banana Bread and Sausage Roll resolve to the compound food rather than being swallowed by the ingredient word.
- Branded-product progression was verified with the loaded Sanitarium Weet-Bix record: `Sanitarium` → `Sanitarium Weet` → `Sanitarium Weet Bix` remained product search and returned the same progressively narrowed product with 110 Cal / 460 kJ.
- Unknown brand prefixes `Cheer` and `Westacre` remained in Product Search through increasingly specific cheese-slice phrases and did not collapse to the generic Cheese pathway. Exact product display still depends on the online/local product record actually being available.

## Deliberate limitation
“Universal search” means every query is handled by the same architecture and every strong Australian food concept can enter the same data-driven refinement system. It does **not** mean the static founder build contains every packaged food sold in Australia. Missing branded products still require online product data, barcode capture, nutrition-panel capture, or a user-created food. HEC now fails safely rather than substituting an unrelated food.
