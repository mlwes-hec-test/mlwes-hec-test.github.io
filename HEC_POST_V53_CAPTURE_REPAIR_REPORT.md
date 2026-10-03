# Post v53 physical panel capture SOURCE repair

This repair addresses the gap between clean OCR fixtures and the founder's physical iPhone observations. It improves independent field extraction, printed nutrition preservation, serving relationships, preparation guidance and private serving reuse. The verification described here uses synthetic OCR observations and disposable browser contexts. Physical iPhone acceptance remains required.

## SOURCE safety gate

- Canonical repository: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`. Git resolved the existing workspace spelling `HEC Develpoment` to this canonical SOURCE path, as documented by the previous accepted repair. No path or junction was changed.
- Starting branch: `alpha-0.6.33`.
- Starting HEAD: `29ef9abac28777261a0876f7c93ca6839fea25dd`.
- Starting direct parent: `ab68f246213db77c4d38b2c55a45436a2217f4f4`.
- Starting subject: `Improve generic nutrition panel mapping and prepared-food classification`.
- Initial `git status --short`: empty. No applicable repository or ancestor AGENTS.md was found.
- Visible version: `0.6.33`, unchanged.

The work is restricted to SOURCE. No TEST or My Data deployment repository, real browser/PWA storage, personal data or backup was accessed. Browser tests use new synthetic contexts, block service workers, fulfil application requests from local SOURCE, mock the relevant barcode response and abort external requests. Their TEST-labelled origin and banner belong to the synthetic harness; no deployed TEST service is contacted.

## OCR architecture and extraction

The active camera handler in `alpha06.js` already requests Tesseract text and blocks. Blocks contain paragraphs, lines, words, confidence and bounding boxes. The accepted mapper in `capture-foundation.js` already had a spatial adapter; the problem was not wholesale early flattening. Its text fallback missed parenthesised Cal continuations, spatial rows did not join energy continuations, extra percentage columns could invalidate rows, and serving metadata shared overly broad confidence rejection. A baseline merge returned early when no nutrients were read, discarding even an independent pack count.

The repair reuses spatial row reconstruction for both table cells and serving declarations. It joins nearby numeric continuation rows, associates wrapped prepared headings with their own column, and excludes a positioned DI column. Explicit percentages in text are discarded without treating them as nutrients. A weak word becomes an unknown token for declaration parsing, allowing confident fields preceding damaged annotation text to survive. Geometry still requires recognised column headings and confident labels/cells; ambiguous ownership remains blank.

Servings per pack, sodium, calcium, energy and other supported cells can succeed independently. A pack count survives a nutrition-empty reread. An explicit count relationship can augment a compatible saved serving without needing another energy reading. Conflicting serving changes do not inherit the old count conversion. The form reports partial success and names uncertain fields instead of declaring the entire extraction unusable.

No decimal is inserted by nutritional plausibility. Merged unitless tokens such as `850 / 349`, `330 / 130` and `1239 / 499` remain unknown. A cell needs its printed unit or an explicit row unit. Existing checks can reject contradictory values; they never turn them into guessed decimals. Damaged/signed count tokens are also rejected without salvaging a smaller number.

## Printed values and qualifiers

Spatial and text continuations now retain independently printed kJ and Cal. The fixtures preserve `200 kJ / 47 Cal`, `130 kJ / 32 Cal` and `51 mg` sodium through capture. Printed field display no longer rounds every number to two decimal places. Existing precise-value storage remains available for derived display values.

`<` and `≤` remain separate qualifier objects with an unknown exact nutrient value, and retain their limits through natural-unit scaling and Diary snapshots. A low-confidence qualifier cannot silently become an exact number. Unsupported qualifiers and prose such as trace remain in raw OCR for manual review; no new numeric semantics are invented for them.

Energy provenance distinguishes printed values, conversions and manual/catalogue input. The confirmed capture records the energy provenance actually used for Diary. A missing kJ cell stays blank during extraction when only Cal was read; any later Diary conversion is labelled derived in evidence and explained in the form. Serving provenance records printed or user-entered input and becomes user-verified after package confirmation. The original extraction, checked panel, catalogue evidence and selected model remain distinct.

## Serving and preparation behaviour

The shared unit dictionary handles singular/plural slices, pieces, packets, bars, biscuits, crackers, crispbreads, rolls, burgers, items and portions. It also exposes scoop, teaspoon, tablespoon and cup relationships when explicitly printed. `67 g (2 slices)` produces two slices per serving; `ONE SACHET = ONE SERVING` produces one sachet. Household conversions require a verified explicit gram relationship and do not borrow an assumed powder density. Confirmed natural units become the initial amount choice, without pre-filling the amount eaten.

Generic headings including as prepared, prepared product, when prepared and prepared according to directions mark a separate reference. A dry gram serving with usable per-serving energy and a separate per-100 mL prepared reference selects Per Serve and explains that choice above the nutrition table. Missing or incompatible evidence produces a direct instruction to choose the column and supply the missing energy.

Prepared headings alone never establish water preparation. Generic dry-beverage family evidence can expose a prominent preparation confirmation. Clear water-only directions enable water; milk, alternatives, additions or uncertain/negated directions do not. Preparation evidence carries a liquid classification independently of the base serving model. Milk and other additions are logged separately with their own nutrition; this job does not implement a recipe engine. New preparation evidence supersedes an older water choice, and a liquid basis cannot retain a hidden dry-preparation requirement.

Serving details now have their own section near the top of the form. Incomplete count/unit pairs expand it, change its heading to “Serving details need your attention”, block readiness with the actual field names and offer a button that focuses the correction. Optional micronutrients remain separate. Preparation ambiguity likewise exposes a visible confirmation and direct action. Ordinary bread and liquid milk retain their passing water-UI behaviour.

## Private verified serving reuse

A fresh barcode lookup may apply a private serving overlay only when the barcode and product identity match a package-confirmed private record and the metric serving/count evidence does not conflict. Private corrected names can match via the retained original catalogue identity. Unverified records, conflicting product identities, changed serving sizes and contradictory saved conversions do not supply an overlay.

The overlay retains the private record ID and verification time. It keeps original catalogue basis evidence separately and does not mutate either source object. The fresh scan still requires the user to check the current packet. Compatible `1 sachet = 12.5 g` knowledge is offered as `Sachet (12.5 g)`. This is serving reuse; it does not silently substitute private nutrition for the newly selected barcode nutrition.

## Changed files

| File | Purpose |
| --- | --- |
| `capture-foundation.js` | Spatial/text parsing, independent declarations, count relationships, preparation/basis guidance, provenance and private serving overlay. |
| `alpha06.js` | Form guidance, exact printed field display, preparation confirmation and barcode overlay integration. |
| `packaged-foods.js` | Optional preparation and serving provenance in the existing basis model. |
| `serving-foundation.js` | Scoop vocabulary and verified package-specific household gram conversions. |
| `index.html` | Separate serving details, preparation confirmation, visible basis/energy guidance and generated bootstrap metadata. |
| `release-manifest.json` | Deterministic SOURCE core hashes. |
| `service-worker.js` | Deterministic generated release manifest. |
| `tests/fixtures/physical-panel-ocr.js` | Distorted text plus explicit synthetic spatial/confidence observations. |
| `tests/physical-panel-repair.test.js` | Parser, partial fields, printed values, qualifiers, units, preparation, overlay and date regressions. |
| `tests/physical-panel-repair-rendered.test.js` | Phone capture-to-Diary flows and fresh barcode natural-unit reuse. |
| `tests/post-v52-capture-rendered.test.js` | Add initial neutral Today to the existing historical/neutral/reload regression. |
| `tests/saved-nutrition-review.test.js` | Require independent pack-count retention while protecting saved nutrition from a conflicting serving-only read. |
| `HEC_POST_V53_CAPTURE_REPAIR_REPORT.md` | This SOURCE repair and verification record. |

## Verification

Final consolidated verification against the regenerated SOURCE: **323 passed, 0 failed, 0 skipped, 0 cancelled**, exit code 0, duration **250.704 seconds**. This comprises **315 unit/integration checks and 8 rendered browser regressions** across 19 test files, including 37 new pure regressions and three new rendered regressions. No full repository-wide test run is claimed.

```powershell
node --test --test-concurrency=1 tests/physical-panel-repair.test.js tests/post-v52-capture.test.js tests/shared-product-capture.test.js tests/product-capture-pipeline.test.js tests/saved-nutrition-review.test.js tests/barcode-confirmation.test.js tests/stage8b-servings-packaged.test.js tests/stage8c-barcode-panel.test.js tests/legacy-saved-food-compatibility.test.js tests/release-coherence.test.js tests/product-serving-semantics.test.js tests/portion-handoff-integrity.test.js tests/physical-form-measure-compatibility.test.js tests/rc6-food-review-routing.test.js tests/rc4-voice-date-conversation.test.js tests/physical-iphone-follow-up.test.js tests/shared-product-capture-rendered.test.js tests/post-v52-capture-rendered.test.js tests/physical-panel-repair-rendered.test.js
```

Full log: `C:\Users\mlwes\AppData\Local\Temp\hec-post-v53-final-checks.log`. The selected files cover real-world-like parsing, partial fields, printed values, qualifiers, count units, prepared references, serving basis, private reuse, bread/liquid/water behaviour, date provenance, rendered mobile capture and release coherence. Syntax checks pass for all four modified runtime JavaScript files and all three new JavaScript test/fixture files. `git diff --check` passes; modified runtime/test JavaScript is LF-only.

The closest pre-edit suites passed 74/74. Development checks also exercised the new distorted fixtures, existing serving rules, private source isolation and actual rendered capture flows. Early new-test failures identified fixture annotation boundaries and assertions about transient catalogue cache persistence; the fixture/assertions were corrected, with source immutability also checked directly in unit tests. Final review added preparation negation and changed-liquid regressions.

The date implementation was not redesigned or edited. The rendered regression covers neutral capture to Today, explicit historical Diary Add Food, later neutral capture to Today and reload with stale persisted historical UI state. A pure regression also uses 3 October 2026 and 2 October 2026 explicitly.

The requested 390×844 and 320×568 viewports exercise photo-to-Read action visibility, required serving guidance, natural-unit amount and Review screens, hit testing and horizontal overflow. A 330-pixel-height viewport while editing checks reduced-space reachability. This is not a simulation of the native iPhone keyboard. The 320-pixel serving screenshot was visually inspected. Water remains independent: one sachet retains 200 kJ / 47 Cal and 51 mg sodium, while 250 mL preparation water contributes only to Fluids and survives Diary editing. Existing regression flows also cover unknown/separately logged water and remembered private amounts.

Final-run screenshot directories: `C:\Users\mlwes\AppData\Local\Temp\hec-v53-mobile-390-8YX8pv` and `C:\Users\mlwes\AppData\Local\Temp\hec-v53-mobile-320-cTlk6W`. No material horizontal overflow was detected. The correction focus and reduced-height Review action passed hit testing. The existing photo regression also passed 375×667, 768×1024 and 1280×800.

## Release and commit

`PWA_RELEASE_COHERENCE.md` requires SOURCE regeneration after core changes. The normal `node scripts/build_release.js` process was used, without manual edits to generated blocks or any deployment. No generation conflict or workaround occurred. The accepted generation was `b6a77c86637654bcabea84b7`.

New SOURCE generation: **`776ca1826177abf430c258a0`**. `node scripts/build_release.js --check` and all selected release-coherence tests pass. Both installation role hash maps exactly match the accepted HEAD. Installation configuration, both role manifests/overlays, catalogue data, storage keys and date implementation are unchanged. No visible version bump was required.

Pre-commit status contains exactly the 13 intended files listed above: nine tracked modifications and four new files. Branch and HEAD still match the safety gate. All requested automated checks and this report were completed before committing. The single local commit subject is `Improve physical panel parsing and serving guidance`, with `29ef9abac28777261a0876f7c93ca6839fea25dd` as its direct parent. The final response records the resulting SHA and final Git status; a commit cannot embed its own SHA in this report.

## Remaining limitations

Physical iPhone camera OCR, installed iOS WebKit and the native keyboard still require acceptance after a separately authorised TEST deployment. These fixtures model transcribed distortions and synthetic geometry; they do not establish measured OCR accuracy on the physical packages.

Without reliable headings, units, confidence or cell ownership, values intentionally remain blank. A high-confidence OCR integer whose decimal has vanished cannot always be distinguished from a legitimately printed integer; package verification remains essential. Two distinct per-100 columns still cannot both occupy the existing two-basis model. No inferred powder density, preparation-water quantity, trace calculation, catalogue expansion or nutrition-bearing additions engine is included.

## Catalogue-expansion readiness / next workstream

Australian food catalogue expansion remains the next workstream after capture repair acceptance. This job imports or scrapes nothing and changes no catalogue data or licences. Existing source IDs, canonical identity, catalogue evidence, source ranking and deduplication boundaries remain intact. Private serving evidence is attached as an explicit overlay, with the original source basis preserved.

Future ingestion should keep source-qualified item IDs and evidence/version timestamps, distinguish identity matching from nutrition equivalence, and check serving/preparation compatibility before merging records. A barcode alone should not override conflicting package evidence. Extending preparation to milk, other liquids and optional additions should use separate components with their own nutrition and fluid contributions; the existing zero-calorie water component is not suitable for those additions.

Nothing has been pushed or deployed. TEST and My Data are untouched. No personal data or backups have been accessed. Stop after the single SOURCE commit and final report.
