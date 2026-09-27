# Shared Product Capture SOURCE repair

## Status

The Product Capture implementation and deterministic SOURCE regeneration are complete. Release coherence passes and all 134 focused repair checks pass against the generated files on disk. The one fresh canonical suite authorised after regeneration finished with **1,650 passed and 25 failed**. All 25 failures reproduced against accepted HEAD in narrow comparisons. The user explicitly accepted **no new failures relative to accepted HEAD** as this job's final canonical gate and authorised one local SOURCE commit. This supersedes the earlier absolute all-green requirement for this job only. No push or deployment is authorised or performed.

## Source-derived release generation

The user explicitly superseded the earlier prohibition on creating a new release generation, while retaining all deployment and identity restrictions.

- Previous accepted generation: `6d04c06412e8010bd712ada5`.
- New deterministic SOURCE generation: `a92e4364affdb49724b79f5d`.
- Visible application version: **0.6.33**, unchanged.
- Established process inspected: `PWA_RELEASE_COHERENCE.md`, `scripts/build_release.js` and `scripts/release-contract.js`.

Exact regeneration and verification commands:

```powershell
node scripts/build_release.js
node scripts/build_release.js --check
node --test tests/release-coherence.test.js
```

The builder produced the generation from SHA-256 over the core content hashes, role variants, ordered inventory, shell markup and bootstrap/worker source. It uses no timestamp, Git SHA or manual generation number. The established check reports **Release generation is current** and the release-coherence tests passed **15/15**.

Generated SOURCE files changed: `index.html` (the marked inline bootstrap), `release-manifest.json`, and `service-worker.js`. Their generation values were written solely by the established builder. The ordinary Product Capture markup changes in index.html are also part of this repair.

Both role-variant hash maps remain identical to accepted HEAD. Config, installation-config, manifest.webmanifest and the TEST identity overlays are unchanged. No deployment labels were incremented. Deployment repositories were untouched; a later guarded deployment must inherit the accepted SOURCE generation without rebuilding a separate deployment generation.

The temporary in-memory release overrides were removed from the new rendered tests. They now load the regenerated SOURCE files through the unchanged shared local-routing harness, still using disposable synthetic browser contexts and no live deployment.

## Repository and preservation gate

- Canonical repository: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.
- Branch: `alpha-0.6.33`.
- Starting HEAD: `e574d981887c6237984faf8129797ef40e9c1018` — `Add saved food nutrition review and improve panel OCR`.
- After the authorised PNG cleanup and before implementation, `git status --short` produced no output; branch and HEAD matched the required values.
- The misspelled junction was not altered. Normal work used the canonical path.
- All six PNGs were preserved outside the repository, SHA-256 checked and compared byte-for-byte before cleanup. Only the three authorised tracked PNGs were restored and their three authorised machine-suffixed untracked copies removed.
- Preservation directory, retained: `C:\Users\mlwes\AppData\Local\HEC-PNG-preservation-745a788842a643179935c742a49b19d9`.

Preserved files (sizes in bytes):

| File | Size | SHA-256 |
|---|---:|---|
| `02-bad-ocr-comparison.png` | 300221 | `65ea971fbca696173656cd3e3ceca0726a63032e1e03458a19cae0385822319b` |
| `02-bad-ocr-comparison-LAPTOP-FL371N0F.png` | 299376 | `e01ef42d1addd22e28a4815489875cea042ea797b20b6729382fc07deccdeb8c` |
| `03-barcode-selected.png` | 276181 | `5b352a2c07f7d231b9601310de1e56731ecdfd62c7990df480bee0ccfa31737b` |
| `03-barcode-selected-LAPTOP-FL371N0F.png` | 275578 | `b15d8a6b07f7f9e049e0e29ebd449bc154e42ee73edae709453f48416c1bc427` |
| `04-new-capture.png` | 127931 | `e702ec068e1be82d7a41b560593ba66e6a2c760766e52b5af08ddbed492e25ff` |
| `04-new-capture-LAPTOP-FL371N0F.png` | 127266 | `e8a3c0f9dfbfade7424b07c9729374b35134fe5045aea157eb608715bfd58c0d` |

The machine-suffixed copies equal the HEAD PNG bytes. The alternate tracked variants contain unique pixels and remain preserved. A subsequent read-only byte comparison confirmed all three restored repository PNGs equal HEAD.

## Shared diagnosis and repairs

1. **Amount selection was lost in late Review wrappers.** The capture handoff passed only amount/unit, while a later `prepareEntry` wrapper preferred `lockedServingUnit` and cleared the selected amount. The capture modal now uses the existing serving-measure profile and carries the consumed-portion conversion and measures through Review. The late wrappers respect an explicit supported selection. Diary stores the same natural amount, unit and decimal base quantity; deliberate Review unit changes recalculate.
2. **Count vocabulary was duplicated.** Capture used a short hardcoded list despite an existing shared registry. Capture now reads that registry; crispbread joins it and sachet is exposed through it. Explicit packet count relationships produce per-item mass. Existing physical-form filtering remains authoritative: solids and dry sachets use g/count, liquids use mL, and incompatible solid/volume measures are blocked.
3. **Structured OCR required complete, rigid lines.** Numeric continuations, independently legible cells, serving/count phrases and split energy lines are now mapped conservatively. Existing OCR word positions and confidence support cell ownership, including separate kJ/Cal values within one physical cell. Damaged decimal rows stay unknown; there is no guessed division by ten. Weak rereads preserve compatible saved nutrition.
4. **Prepared reference and dry product basis were conflated.** An optional `per100Context` marks an as-prepared reference separately. It cannot be used as dry-product nutrition, to infer sachet mass, or to infer water quantity. Sparse rereads retain that distinction.
5. **Preparation water belongs to the entry.** A user-confirmed water-only dry mix exposes an editable total water amount for that Diary entry. The existing `waterMl`/`hydrationType` aggregation counts it as a drink. The explicit separately-logged checkbox suppresses contribution. A private product may remember the usual amount; blank remains unknown and can override that remembered amount. Negative water is rejected. No duplicate water entry is created, and changing water does not scale nutrition.
6. **Printed energy was normalised destructively.** Capture preserves printed kJ and Cal independently. Derived Cal is marked internally and excluded from packet-read comparisons. Material contradictions require review. Comparisons use an existing same-size printed serving before considering a derived per-100 conversion, avoiding false differences when rereading the same packet.
7. **Threshold nutrients were lost.** Optional qualifier metadata carries `<`/`≤` and its numeric limit. Exact nutrient values remain null rather than treating the limit as equality; Review and stored snapshots scale and retain the qualifier.
8. **Baseline values were presented as OCR evidence.** Comparisons now require an actual extracted model. Barcode/saved baselines are labelled truthfully; typed diagnostic text is distinguished from OCR. A barcode record with no energy gets identity-only confirmation wording.
9. **The workflow hid its next action.** New capture starts at the panel photograph. After acquisition, focus and scroll move to Read Nutrition Panel. Manual entry reveals and focuses its fields; raw recognised text stays collapsed. Structured results mark uncertain fields.
10. **Front identity extraction admitted marketing text.** Shared extraction de-prioritises health-star/origin/claim/pack-count text, considers OCR confidence/layout, and preserves existing identity. Low-confidence output can remain blank for manual correction.

Private GTIN identity, explicit packet confirmation and central-catalogue boundaries remain in place. New persistence fields are optional/default-safe; no storage migration or reset was added. The four physical product families are deterministic regression probes, with no product-name or barcode branches in the implementation.

## Changed files

- `alpha06.js`: production capture, Review, Diary, preparation-water controls, truthful comparison, progressive workflow, front identity integration and decimal amount display.
- `capture-foundation.js`: shared panel/serving extraction, confidence and geometry handling, qualifiers, provenance, comparison, private product construction and water selection semantics.
- `packaged-foods.js`: backward-compatible basis metadata, printed-pair preservation for capture and snapshot/qualifier support.
- `serving-foundation.js`: crispbread vocabulary and prepared-reference handling within the existing physical-form checks.
- `index.html`: preparation controls, reference-basis selector, count labels and threshold-capable nutrition inputs, plus the deterministic generated bootstrap.
- `release-manifest.json` and `service-worker.js`: regenerated by the existing SOURCE builder.
- `tests/fixtures/shared-product-capture.js`: deterministic crispbread, bread, milk and sachet transcriptions/noisy OCR fixtures.
- `tests/shared-product-capture.test.js`: count/conversion, partial OCR, geometry, qualifier, energy, prepared-reference, identity and backward-compatibility checks.
- `tests/shared-product-capture-rendered.test.js`: real controller/DOM transitions through persisted Diary, preparation fluids, reload, unknown barcode, photo/manual workflow and weak saved-food rereads.
- `tests/saved-nutrition-review.test.js`: now expects conflicting printed energy to survive for review instead of being overwritten.
- `tests/stage8c-barcode-panel.test.js`: comparison must use extracted evidence, never a copied baseline.
- This report.

## Verification

All commands ran from the canonical SOURCE repository.

After regeneration:

```powershell
node --test --test-concurrency=1 tests/shared-product-capture.test.js tests/product-capture-pipeline.test.js tests/saved-nutrition-review.test.js tests/barcode-confirmation.test.js tests/stage8b-servings-packaged.test.js tests/stage8c-barcode-panel.test.js tests/legacy-saved-food-compatibility.test.js tests/shared-product-capture-rendered.test.js
```

**134 passed, 0 failed**, including 12 new shared-capture unit regressions, both new rendered tests, and existing pipeline/serving/legacy regressions. The rendered tests now exercise generated SOURCE files on disk. The production Fluids screen showed 750 mL from the 200/250/300 mL preparation entries. Explicit separate logging contributed zero; blank water stayed unknown. Tests use mocked OCR, synthetic private data, isolated headless Edge contexts, blocked service workers and intercepted local assets. No personal profile or deployed app was exercised.

Before regeneration, the same focused checks passed as 120 unit/pipeline cases and 14 rendered/legacy cases. The additional existing formatter regression also passed:

```powershell
node --test --test-concurrency=1 --test-name-pattern="Diary count wording" tests/physical-iphone-follow-up.test.js
```

Syntax checks passed for alpha06.js, capture-foundation.js, packaged-foods.js and serving-foundation.js. git diff --check passed; modified production text remains LF-only.

### Fresh canonical gate after regeneration

```powershell
node --test --test-concurrency=1 tests/*.test.js
```

Result: **1,675 tests; 1,650 passed; 25 failed; 0 cancelled; 0 skipped; 0 todo**, exit code 1, duration 995.987 seconds. This was the one newly authorised canonical run on coherent SOURCE. The release-generation failures are resolved. No production source, runtime or data edits were made after this run.

Full output and extracted failure details: C:/Users/mlwes/AppData/Local/Temp/hec-product-capture-coherent-51f30a4298234c99a7f8726fbce718ef/ (canonical-full-suite.log and canonical-full-suite-failures.json).

| Failing unchanged test file | Cases | Exact blocker |
|---|---:|---|
| aldi-source.test.js | 3 | Directory totals 222 vs 87; a visible item lacks expected approved membership; retained Coles total 417 vs 860. |
| coles-source.test.js | 2 | Stale coverage-gap-manifest.json; directory total 417 vs 860. |
| hungry-jacks-australia-expansion.test.js | 1 | Times out finding the ready-to-eat source-context answer. |
| keyboard-lag-repair.test.js | 1 | Times out waiting for the delayed catalogue-search fixture at line 94. |
| live-prefix-alphabetical.test.js | 1 | Weet-Bix brand preview lacks the expected Weet-Bix Original item. |
| navigation-startup-regression.test.js | 2 | Both mobile widths time out at audit_navigation_startup_edge.js line 45. |
| query-ownership.test.js | 6 | Accent/query ownership fixtures encounter an undefined id. |
| rc2-usability.test.js | 1 | Weight-chart source assertion expects an older expression. |
| retailer-rendered.test.js | 1 | Aldi private-label evidence assertion fails after UI hydration. |
| woolworths-rendered.test.js | 1 | Catalogue count 362 vs 923. |
| woolworths-source.test.js | 6 | Two official-product metadata assertions; counts 114 vs 77 and 362 vs 923; breadth 15 vs 9; membership assertion. |

All **25 failures reproduced against accepted HEAD**. The 18 non-rendered failures had already reproduced in the earlier narrow comparison described below. After this canonical run, a second narrow comparison selected only the seven rendered failures: **7 selected, 0 passed, 7 failed**, exit code 1, duration 313.017 seconds. Each reproduced the same assertion or timeout at the same application/test location. Node test-runner housekeeping stack frames differed in one case; the assertion and actual/expected values were unchanged.

The rendered comparison substituted eight accepted-HEAD assets in memory: alpha06.js, capture-foundation.js, packaged-foods.js, serving-foundation.js, index.html, release-manifest.json, service-worker.js and the local-routing audit helper. Every substituted asset was verified byte-for-byte against Git objects at e574d981887c6237984faf8129797ef40e9c1018. The matching accepted manifest/bootstrap/worker let the old source boot coherently. All other production files, catalogue data and these seven tests were unchanged. The adapter did not write accepted bytes into the working tree, and no checkout or reset was used.

The exact argument vector is recorded in accepted-head-rendered-command.json in the same external evidence directory as the fresh canonical log. It invokes node with --require accepted-head-loader.cjs, --test, --test-concurrency=1, an exact-name pattern for the seven failed cases, and their six test files. Supporting files are accepted-head-rendered.log, accepted-head-rendered-failures.json, accepted-head-rendered-comparison.json, accepted-head-source-verification.json and accepted-head-source.json. This was a focused baseline comparison, not another full suite.

The retained baseline failures concern existing catalogue evidence/counts, guided restaurant/search/navigation fixtures and the weight-chart assertion. Changing those unrelated areas or weakening their assertions would exceed this repair's scope. The user's subsequent explicit baseline-relative acceptance permits this repair's local commit while retaining all 25 failures unchanged. Neither the full canonical suite nor the known baseline failures was rerun for commit acceptance. No further production source/runtime/data edits were made.

### Earlier gate and accepted-HEAD comparison

The earlier single full run, before generation authorisation, returned **1,623 passed / 52 failed / 1,675 total**. It included one stale-generated-file check, 14 required-core verification failures, 19 startup/readiness failures and 18 other failures. The first three groups reflected the then-prohibited regeneration: an isolated startup diagnostic reported Core generation mismatch. That constraint has now been superseded and release coherence passes.

A narrow comparison loaded the six then-changed production/harness files directly from accepted HEAD e574d981887c6237984faf8129797ef40e9c1018 into an external temporary module/read adapter. It selected only the 18 failing non-release cases in unchanged tests: aldi-source.test.js (3), coles-source.test.js (2), woolworths-source.test.js (6), query-ownership.test.js (6), rc2-usability.test.js (1). **All 18 failures reproduced at accepted HEAD.** There was no checkout, reset, catalogue correction or broad-suite rerun for that comparison.

Those baseline issues include Aldi 222 versus expected 87; Coles 417 versus expected 860; stale Coles coverage-gap-manifest.json; Woolworths 362 versus expected 923, wave count 114 versus 77, and frozen-dessert classification differences. Six query-ownership fixtures encounter an undefined id, and the weight-chart assertion expects an older source expression. These unrelated source/test discrepancies have not been changed by this job.

Historical output and exact baseline argument vector: C:/Users/mlwes/AppData/Local/Temp/hec-product-capture-final-aa82d44277384b11810edcdc500f1446/ (canonical-full-suite.log, canonical-full-suite-failures.json, accepted-head-command.json, accepted-head-loader.cjs and accepted-head-focused.log).

There was one canonical run under the original constraints and one newly authorised fresh run after deterministic regeneration. Neither run was repeatedly retried, and no thresholds were weakened.

## Catalogue observations, without correction

The committed Open Food Facts row in `data/open-food-facts-au/products/ar-00.json` for GTIN `9310072013602` contains approximately 310.707 Cal and 1606.140 kJ per 100 g, and sodium 3.385965 in its source g units (the adapter multiplies sodium by 1000 for mg). This conflicts with the supplied current packet's 382 Cal / 1600 kJ / 391 mg sodium per 100 g. It was left unchanged.

The committed row in `data/open-food-facts-au/products/no-00.json` for GTIN `9310272361565` says `Trim Low Fat Milk`, has an empty nutrient object and identity-only completeness, and supplies a 250 mL serving. This matches the reported stale naming/missing-nutrition problem. It was left unchanged. There was no catalogue expansion or external lookup campaign.

## Remaining boundaries and limitations

- SOURCE release metadata is coherent at the new deterministic generation. Version 0.6.33, installation identities and deployment overlays remain unchanged. The accepted baseline-relative canonical gate has no new failures; the 25 established baseline failures remain unresolved and unchanged. Deployment remains separately guarded and unauthorised here.
- OCR remains imperfect. Conservative rejection may leave fields blank, requiring packet confirmation/manual entry. No physical iPhone photography acceptance is claimed.
- Preparation covers zero-calorie water added to a dry mix only. The water amount is the total for the entry, not an inferred amount per sachet. Milk or other nutrition-bearing additions remain outside scope.
- Thresholds display as limits; their exact contributions remain unknown in ordinary numeric nutrient totals.
- Nothing was pushed or deployed. TEST and My Data were not modified. No real browser/PWA storage, personal data or personal backup was accessed. The explicitly authorised PNG preservation directory was retained.

## Local commit acceptance and pre-commit repository state

- Branch: alpha-0.6.33.
- Verified direct parent before the authorised commit: e574d981887c6237984faf8129797ef40e9c1018.
- Authorised single local commit subject: **Repair product capture serving and review state**. No amendment or second report commit is authorised.
- Acceptance: 134 focused checks passed; the canonical result is 1,650 passed / 25 failed, with all 25 failures reproduced at the exact accepted parent. The user accepted this as no new failures relative to accepted HEAD.
- Final pre-commit checks passed: unchanged branch/parent, exact 13-file allowlist, generation a92e4364affdb49724b79f5d, version 0.6.33, node scripts/build_release.js --check, all 15 release-coherence tests and git diff --check. The final commit SHA and post-commit clean status are reported in the accompanying completion message, avoiding a self-referential SHA or a second report commit.
- Before staging, the working tree contains only the intentional job files listed below; the preserved PNGs have no repository diff.

```text
 M alpha06.js
 M capture-foundation.js
 M index.html
 M packaged-foods.js
 M release-manifest.json
 M service-worker.js
 M serving-foundation.js
 M tests/saved-nutrition-review.test.js
 M tests/stage8c-barcode-panel.test.js
?? HEC_SHARED_PRODUCT_CAPTURE_SOURCE_REPAIR_REPORT.md
?? tests/fixtures/shared-product-capture.js
?? tests/shared-product-capture-rendered.test.js
?? tests/shared-product-capture.test.js
```

## Physical iPhone retest after a later authorised TEST deployment

1. Cruskits: confirm 11.4 g = 2 crispbreads; choose 1 crispbread. Review and Diary must retain 1 crispbread, 5.7 g, approximately 22 Cal. Check a full manufacturer's serve still displays 11.4 g.
2. Bread: follow unknown barcode → panel/manual review; confirm 67 g = 2 slices. Choose 1 slice; Review and Diary must retain 33.5 g and approximately 83 Cal. Deliberately change the Review unit and check recalculation.
3. Norco: confirm 250 mL/per-100-mL; no solid count units. A partial read should keep safe energy/sodium/calcium while damaged rows remain unknown. Identity-only barcode wording must be truthful.
4. Nescafe: confirm 1 sachet = 12.5 g / 47 Cal / 200 kJ. Keep the as-prepared reference separate. Try 200, 250 and 300 mL water; nutrition must stay constant and Fluids follow water. Test remembered amount, blank override and already-logged suppression.
5. On each capture, check no panel-read claim before OCR, clear focus after photography, working manual-entry focus, collapsed raw text and preservation of both printed energy units and less-than signs.
6. Reopen My Foods/Diary, reread a deliberately weak panel and verify saved nutrition, selected units, entry snapshots and fluid amounts survive.
