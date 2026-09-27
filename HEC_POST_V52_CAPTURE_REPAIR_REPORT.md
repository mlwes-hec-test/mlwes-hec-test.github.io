# Post-v52 Product Capture SOURCE repair

## Repository gate and scope

- Canonical SOURCE: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`. The workspace spelling `HEC Develpoment` resolves through an existing junction to this directory; the junction was not changed.
- Branch: `alpha-0.6.33`.
- Accepted starting HEAD: `ab68f246213db77c4d38b2c55a45436a2217f4f4`, `Repair product capture serving and review state`.
- Initial `git status --short`: empty. No repository AGENTS.md or applicable ancestor AGENTS.md was present.
- No TEST/My Data deployment repository, real browser/PWA storage, personal data or backup was used. No push or deployment. The intended outcome is one local SOURCE commit, with the accepted HEAD as its direct parent.

## Findings and changes

**OCR mapping.** The existing parser understood clean transcriptions, but wrapped headings could prevent any column recognition. Geometry required exactly two single-line headings. Low overall OCR confidence rejected every numeric text line even when individual words were confident. Number scanning could also salvage a substring from corrupted tokens. The mapper now joins bounded heading/declaration continuations, uses word positions for wrapped single/two-column headings, and preserves individually confident rows despite low page confidence. Geometry retains cell-level ownership and confidence gates. Exact/less-than values stay distinct, attached units such as `200kJ` are accepted, and corrupted decimals, signed energy and mismatched units stay unknown. The current two-basis model cannot represent two different per-100 references simultaneously: it preserves unambiguous serving cells and leaves those reference cells blank instead of conflating dry and prepared columns. It does not infer missing cells from neighbouring values.

Serving metadata supports split `Servings per package`, `Serving size`, metric amounts, countable units from the existing registry, and `one/1 sachet = one/1 serving`. Numeric declarations must be intact. Existing compatible saved nutrition remains protected on weak rereads. Raw OCR remains collapsed and secondary. No brand, product-name or barcode conditions were added.

**Preparation.** The water-only help paragraph previously sat outside the conditional checkbox, so ordinary bread and milk showed it. The checkbox is now under collapsed `Preparation (optional)`; opening this provides an explicit opt-in. Water help appears only after selection, and ordinary mL products do not expose that option. Existing confirmed water preparations reopen expanded. The model accepts explicit water preparation for gram-based mixes and fixed manufacturer servings, independent of sachet format.

The existing composition boundary is retained: food selection supplies base nutrition; `preparationWater` supplies the entry's independent water amount; the existing preparation type supplies an optional remembered amount. Already-logged water contributes zero, and remembered water remains private. No water amount is inferred from as-prepared nutrition. No recipe/additions engine or migration was added. Future scoop/spoon conversions can use explicit evidence through the shared measure registry; future concentrates and milk/sugar/syrup additions need explicit classification and separate components with their own nutrition/fluid contributions. They must not reuse the current zero-calorie water component. This repair tests non-sachet grams and fixed serves, not new spoon/scoop/concentrate controls.

**Photo positioning.** Scrolling previously preceded image decode and insertion of the photo-ready status, both of which change layout. Capture now waits for decode and two layout frames, focuses the Read Nutrition Panel button, and checks its position against the actual visual viewport, TEST banner and header. Capture epoch/screen checks prevent a late callback from moving focus after navigation. No input is focused by photo acceptance.

**Date provenance.** `openCapturedFoodForDiary` previously fell back to persisted `mealEntrySession.date` and `diaryDate` even for neutral capture. This is a concrete stale-context path, not evidence of a startup clock bug. New drafts snapshot an in-memory destination established by explicit Diary Add Food/meal-overview Add actions. Unrelated navigation and ending the meal session clear that intent. Neutral drafts use Today and a blank meal; retries/resume preserve the draft destination. Persisted UI dates alone cannot establish capture intent. General Diary/startup/date utilities were not changed.

**Catalogue naming.** The embedded Open Food Facts AU row in `data/open-food-facts-au/products/no-00.json`, GTIN `9310272361565`, contains `Trim Low Fat Milk`, source modification time `2025-10-05T19:54:31Z`, identity-only nutrition and a 250 mL serving. This establishes that the stale name is in the imported catalogue record, rather than a new capture rename. The live upstream record was not queried; its current state is not claimed. Existing package-name editing already builds a private identity and retains the original catalogue identity in capture evidence. The UI now states that corrections apply only to private My Food. A generic regression verifies that the shared catalogue object is unchanged. No catalogue data was edited.

## Exact changed files

| File | Reason |
|---|---|
| `capture-foundation.js` | Conservative partial OCR, wrapped headings/declarations, unit/token validation, explicit preparation eligibility and pure capture-destination helper. |
| `alpha06.js` | Capture destination lifecycle, decode/layout-aware next-action focus, conditional preparation UI and draft initialization. |
| `index.html` | Collapsed preparation opt-in, conditional help, private naming guidance, and generated bootstrap hash metadata. |
| `release-manifest.json` | Deterministic generated core hashes. |
| `service-worker.js` | Deterministic generated manifest. |
| `tests/post-v52-capture.test.js` | Synthetic OCR, metadata, qualifiers, count/Diary snapshot, liquid, sachet/non-sachet water, private naming and date-provenance regressions. |
| `tests/post-v52-capture-rendered.test.js` | Viewport geometry/hit tests, actual controller water/edit flow, historical/neutral/reopened date paths. |
| `tests/stage8c-barcode-panel.test.js` | Replace assertion of the obsolete date-fallback implementation with the neutral-destination contract; preserve blank-meal/no-default checks. |
| `HEC_POST_V52_CAPTURE_REPAIR_REPORT.md` | This repair and verification record. |

## Release impact

The existing `PWA_RELEASE_COHERENCE.md` requires deterministic SOURCE regeneration after core changes. The current brief prohibits deployment, not SOURCE regeneration; no conflicting generation constraint was found.

Commands: `node scripts/build_release.js`, then `node scripts/build_release.js --check` and release-coherence tests. Generated files were written only by the builder.

- Previous generation: `a92e4364affdb49724b79f5d`.
- New generation: `b6a77c86637654bcabea84b7`.
- Visible version: **0.6.33**, unchanged.
- Both installation role hash maps are byte-for-byte equivalent to their accepted-HEAD values. Installation configuration, role overlays, manifest IDs, storage contracts and deployment labels are unchanged.

## Verification

Before implementation: **132/132** closest existing unit checks passed.

Final consolidated verification: **283 passed, 0 failed, 0 skipped**, exit code 0, duration 204.566 seconds. All checks ran against the final regenerated SOURCE on disk. The selected suites cover capture, OCR, provenance, serving semantics, legacy saved foods, physical-form compatibility, Review handoff, related date behaviour and release coherence. Browser tests route SOURCE assets into disposable synthetic contexts, block service workers, abort external requests and assert no live fallthrough. They do not use the real TEST site or a personal browser profile.

```powershell
node --test --test-concurrency=1 tests/post-v52-capture.test.js tests/shared-product-capture.test.js tests/product-capture-pipeline.test.js tests/saved-nutrition-review.test.js tests/barcode-confirmation.test.js tests/stage8b-servings-packaged.test.js tests/stage8c-barcode-panel.test.js tests/legacy-saved-food-compatibility.test.js tests/release-coherence.test.js tests/product-serving-semantics.test.js tests/portion-handoff-integrity.test.js tests/physical-form-measure-compatibility.test.js tests/rc6-food-review-routing.test.js tests/rc4-voice-date-conversation.test.js tests/physical-iphone-follow-up.test.js tests/shared-product-capture-rendered.test.js tests/post-v52-capture-rendered.test.js
```

Full log: `C:\Users\mlwes\AppData\Local\Temp\hec-post-v52-final-checks.log`.

The 283 checks include 22 new pure regressions, three new rendered regressions and both accepted shared-capture rendered flows. Four viewport sizes pass full-button visibility, banner/header clearance and centre-point hit testing: 375×667, 390×844, 768×1024 and 1280×800. The 375×667 screenshot was also visually inspected. The historical-date test exercises an actual Diary Add Food click, a later neutral Home → Library capture, and reload with explicitly stale persisted meal/date state. Water checks cover grams, manufacturer serve and sachet, stored Diary/edit state, remembered amounts and fluid-only attribution.

Syntax checks passed for `alpha06.js` and `capture-foundation.js`; new test files execute in the consolidated run. `node scripts/build_release.js --check` and `git diff --check` pass. Modified runtime/test JavaScript remains LF-only. There are no outstanding failures in the selected suites.

Development checks found a source-text test tied to the old date fallback and setup mistakes in the new browser fixtures (initial scan mode, date helper, Diary edit selector and reconfirmation after changing preparation). These were corrected without weakening package confirmation. The existing shared rendered capture tests passed, including slice/sachet selection through stored Diary, water attribution and manual-entry/provenance behaviour.

No full repository-wide run is claimed. The accepted HEAD's existing report records 25 unrelated canonical failures; those historical findings were not revalidated or repaired by this scoped job.

## Remaining acceptance

Real iPhone camera/OCR and installed-PWA viewport behaviour still need physical acceptance after a separately authorised TEST deployment. The browser checks use synthetic OCR/text and Edge viewport emulation, not physical iOS WebKit. Uncertain panel fields deliberately remain blank. No real physical photo OCR accuracy claim is made. Nutrition-bearing preparation liquids and optional additions remain future work.

Stop after the one local SOURCE commit. The final response records its SHA, direct parent, subject and post-commit status; this avoids a self-referential report commit.

Pre-commit `git status --short` contains exactly the nine intended files listed above: six tracked modifications and three new files. Branch and HEAD still match the repository gate. The commit subject is `Improve generic nutrition panel mapping and prepared-food classification`.
