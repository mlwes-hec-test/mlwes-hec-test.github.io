# Saved My Food nutrition review and table OCR repair

Source-only repair; synthetic/disposable records and generated images only. No TEST or MY DATA deployment, push, catalogue expansion, Guided Food Concept restoration, restaurant expansion or family-contribution work. No personal browser profile, founder record or photograph was accessed.

## Preflight and routing diagnosis (requested items 1–6)

Canonical SOURCE: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`. Initial branch `alpha-0.6.33`, clean tree, HEAD `37321a14cc6c521efd40563593c083210eed0a70`, parent `227e326eee476a495e6c6bbc599b08286bf404c7`, subject `Repair barcode identity and panel confirmation`, visible version `0.6.33`, generation `7ddf61b27bf1d1c0e42aca89`. Initial release check passed. The misspelled repository path is an unchanged Windows junction to the canonical repository; all source commands and edits used the canonical path.

The defect was controller reachability, not a nutrition admission failure. `resourceFoodRow` is wrapped by the RC6 controller: when `rc6FullReviewEligibility` is ready, the main row changes from `data-food-details` to `data-food-review`, reaching `prepareEntry`. Its `View Nutrition Details` disclosure is read-only. The separate `showFoodDetails` modal already had Review Nutrition for barcode/private/saved records, including loggable ones, but required the small information action. Incomplete records retained the main Details path; guided incomplete-product recovery also exposed panel/manual actions. Thus Review Nutrition was not globally gated to broken foods, but the ordinary loggable Review controller did not expose it.

Captured foods can additionally enter `chooseCapturedAmount`; neither that amount modal nor the normal entry Review offered package review. These are different entry routes, not separate private databases. Previous rendered tests clicked `data-food-details` on a broken legacy online wrapper; the loggable saved-food test only reopened and logged. They did not establish nutrition-update discoverability on the normal loggable path.

`Review / Update Nutrition` is now near the top of normal saved private food Review, and in the captured amount modal. The existing Details route has the same wording and also covers old custom shapes without a private marker. All actions use the same capture handler. The normal controller action was visually verified within the initial 390 × 844 viewport.

## Saved product behavior (items 7–21)

The draft keeps the existing private ID, GTIN, name/brand, pack information, serving model, current selected nutrition and previous capture evidence. Opening or cancelling does not write nutrition. The baseline is labelled Saved Nutrition Baseline until an extraction occurs. The photograph action explicitly says Photograph Current Nutrition Panel.

A zero-nutrient read retains the whole baseline, including when the OCR serving size is wrong. Ingredients can survive independently. Partial reads overlay only recognised cells; absent cells retain compatible saved values. A changed serving/unit cannot borrow incompatible numbers. The user can always select the complete saved baseline. Partial per-100 reads select that column so the chosen new values actually affect future nutrition calculations.

The comparison uses raw extracted cells, rather than falsely labelling inherited saved cells as successful OCR. It shows Saved Value and Panel Read Value and highlights a 5.3 → 5.1 change. Keep Existing Saved Values / Use Barcode Values populates the actual editor. Use Checked Package Values populates the merged panel draft, which can be corrected before explicit package confirmation. Product, serving/pack, two nutrition columns, comparison and confirmation remain in the existing capture design; exceptional basis controls remain expandable.

The rendered test updates the same private ID from 5.3 to 5.1, retains its GTIN/name/brand, notes, creation timestamp and optional enrichment, and verifies the custom-food count remains two (one target plus one unrelated fixture). The old Diary entry and snapshot remain 5.3. After reload a new Diary entry and snapshot use 5.1. Central catalogue data and online evidence are not rewritten.

Cancel after edits leaves the saved record and Diary unchanged and returns to My Foods. Try Again clears the current image/extraction, restores the saved identity/baseline, and rejects a deliberately delayed old OCR result. Start New Product Capture clears the saved-food context and visibly starts a new product. A standalone unknown-barcode fixed-serve food with ingredients is then saved under a different private ID. The ordinary non-captured private Review controller was also exercised.

Photo acquisition/preprocessing and OCR-result routing were exercised with a generated PNG and a deterministic mocked worker in a fresh browser. Actual OCR accuracy was measured separately with the real Tesseract worker on the six generated images below. Neither test is a physical camera/iPhone acceptance claim.

## OCR audit and measurement (items 22–32)

The starting parser depends on complete OCR text lines, recognised heading text and exact token counts. Tesseract may split physical rows into column blocks; one missing numeric token then invalidates both cells. Numeric confidence was applied to the entire row. Damaged units such as `(g)` read as `(9)` remain another observed source of rejected rows. Ingredient prose does not require the same row/column association.

The added geometry path groups recognised word boxes by their vertical positions across blocks, recognises two explicit column headings and their horizontal positions, associates nutrient labels with cells, and gates confidence per cell. Ambiguous positions, split decimal punctuation, unreadable units and uncertain numeric cells remain unaccepted. It stops the table at an ingredients heading. Unsupported geometry falls back to the conservative text parser. Unit/inequality fragments are never silently discarded to manufacture an exact value. No product-name, GTIN or numeric substitution rule was added.

Existing EXIF orientation, full-frame native-resolution processing (maximum 3000 pixels), grayscale/contrast stretch, PSM 6 and preserved spacing remain. No image crop, guessed deskew, perspective warp, hard threshold or resize enlargement was introduced. Table-region reasoning is applied to recognised words, not destructive image cropping. The existing stack has no validated safe perspective/rotation correction, so no such correction or accuracy claim is made.

The bounded real-engine set contains clean flat, moderate contrast, shifted decimal-rich columns, a ruled mass table, a liquid table and a table with one absent cell; ingredients are below every table. Compared with the starting commit on the same images:

| Measure | Before | After |
|---|---:|---:|
| Correct accepted candidate cells | 84 | 85 |
| Incorrect accepted candidate cells | 0 | 0 |
| Unknown cells, including one deliberately absent cell | 12 | 11 |
| Rows with at least one accepted cell | 42 | 43 |

There are 96 total target positions, 95 readable. Both columns and their units are correct in all six fixtures, and serving/pack and ingredients extraction succeed in all six. Ten readable cells remain rejected because their row unit is damaged; one cell is deliberately absent. These are candidate extraction values, never automatically saved nutrition. The improvement is modest, principally recovery of a readable neighbour beside a missing cell. The initial explicit-question-mark variant was already handled by the old parser and produced no gain; changing that uncertainty fixture to a genuinely absent token exposes the missing-cell failure. The same final fixture is used for both before and after measurements.

Text and word-box regressions also cover decimals 5.3, 3.3, 0.8, 12.5, 1.7, 0.3 and legitimate 33; split punctuation and a low-confidence 33 are flagged, never repaired to an invented decimal. Tests cover reversed columns, fragmented column blocks, insufficient geometry, 170 g/1 pack serve, 125 g/6 serves, 250 mL/4 serves, and 1 piece/2 serves. Serving amount/unit and servings-per-pack remain distinct.

Real packet testing is still required. Glossy, curved and crinkled labels remain difficult. High-confidence OCR can still be wrong; every value must remain user-confirmed. This repair does not prove perfect physical iPhone OCR.

## Regression and release evidence (items 33–44)

The final bounded Node suite passes **338 tests, zero failures**. Rendered audits pass the recognised barcode → package confirmation → Save & Add → amount → one Review → Diary route; save-only → reopen → later Diary; both source choices; legacy online/private repair; g/mL/fixed serve; optional food groups/water/ingredients; blank new Search; Bread and Milk concept-first; exact Big Mac; Hash Brown; and protected McCain `9310174025084` / `woolworths-au:98299`, 75 g = 130 Cal / 543 kJ.

An obsolete source-expression assertion was updated to the raw-panel comparison input; rendered behavior is tested independently. The per-100 regression initially asserted stored basis nutrients as though they were serving nutrients; it now checks actual one-serve nutrition. Initial harness issues (assuming every saved record opens the amount modal and seeding about:blank) were corrected. No unresolved product/test failures remain.

Search logic, catalogue, indexes and shards are unchanged. Edits are confined to capture/OCR, saved-food review presentation and its shell placeholder. The permitted accepted performance evidence is reused: cold-first 333.3 ms; 50 samples median 52.4 ms, p95 107.0 ms. No new performance campaign ran. Derived shell, manifest and worker were regenerated; all 46 file hashes and role variants match and the stale-output list is empty. The exact final generation is in `data/saved-nutrition-repair/release-integrity.json` and the final handoff.

- [New visible route, update, snapshots, fallbacks and lifecycle](data/saved-nutrition-repair/flows/flows.json)
- [390-pixel normal saved-food Review](data/saved-nutrition-repair/flows/01-saved-normal-action.png)
- [Partial saved/panel comparison](data/saved-nutrition-repair/flows/04-partial-comparison.png)
- [Barcode and legacy-wrapper regression](data/saved-nutrition-repair/barcode/flows.json)
- [Core cases including protected McCain](data/saved-nutrition-repair/core/cases.json)
- [Capture lifecycle, manual fallback and late cancellation](data/saved-nutrition-repair/lifecycle/capture-flow.json)
- [Real OCR before/after results](data/saved-nutrition-repair/ocr/ocr-results.json)
- [Final test log](data/saved-nutrition-repair/regressions-final.txt)
- [Release integrity](data/saved-nutrition-repair/release-integrity.json)
- [Protected deployment checks](data/saved-nutrition-repair/protected-precommit.json)
- [Unchanged junction](data/saved-nutrition-repair/junction-guard.json)

All rendered application assets are fulfilled from local SOURCE in newly created disposable contexts, service workers blocked, external requests blocked except explicit synthetic fixtures, zero live application fallthrough and no personal profiles attached.

## Commit and physical handoff (items 45–54)

Exactly one local source commit is authorised only after these gates pass, subject `Add saved food nutrition review and improve panel OCR`, direct parent `37321a14cc6c521efd40563593c083210eed0a70`. Its SHA and final clean-branch checks must be reported after committing; a committed report cannot embed its own hash. TEST remains `5d885ca0e602c2360cf29ad5d995a21dc0912d58`; MY DATA remains `2c39809706039b93ad613d07bd6b15229ccf2612`. No push or deployment is part of this work.

Smallest physical sequence, only after separate TEST-deployment authorisation:

1. Open an already-loggable private My Food. Confirm Review / Update Nutrition is obvious and opens its existing name, barcode, serving and nutrition.
2. Photograph its current panel. Compare readings; try a partial/poor reading, Keep Existing, one corrected panel field, Try Again and Cancel. Confirm no changes after Cancel.
3. Save the corrected value. Check one My Foods entry, reopen it, and log a new Diary amount through one Review. Verify old Diary nutrition is unchanged and the new entry uses the update.
4. Check Start New Product Capture clearly starts a different item; complete one standalone panel with optional ingredients. Repeat the already-passed barcode-only Save & Add route once, plus one mL and one fixed-serve amount.

No deployment is authorised by this report. Final decision and immutable commit/guard values appear in the final handoff.
