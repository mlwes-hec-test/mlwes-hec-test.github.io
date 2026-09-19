# Product capture pipeline audit and repair

## Pre-change audit

Preflight: clean `alpha-0.6.33`, HEAD `d3cfa0d8fe9b1d164c9a310058a459baa45562ac`, parent `f337d214a7d8c71bbd0026bc9d46f1db35f94899`, subject `Harden retailer browse loading`, version 0.6.33, generation `b73351bbca5371e5cfcccfd5`. Read-only GitHub checks match TEST `03a30148c2e3eb9cfaa11e9283999e6f039720e5` and MY DATA `2c39809706039b93ad613d07bd6b15229ccf2612`. The misspelled repository path is an unchanged junction to the correctly spelled SOURCE path. All work uses the correctly spelled path.

The cameras are reported working by the founder; this repair concerns post-acquisition state and mapping. No real camera, personal storage or founder record is inspected.

### Existing fixed-nutrition contract

Diary uses `food.nutrients`, multiplied by `food.units[selectedUnit] * amount`. Its catalogue gate delegates to the serving foundation: finite energy, at least one safe positive measure, and no unresolved recognised-only/unavailable/basis-conflict flags. Missing protein and other nutrient values can remain null under the existing partial-nutrition contract. Food groups, water, ingredients and central verification are not direct requirements. The gate must not invent these values or require both printed columns.

`packaged-foods.js` owns the shared nutrient set, per-serving/per-100 `nutritionBasis`, scaling and Diary snapshots. `capture-foundation.js` builds panel foods using that model. Per-serving nutrients use `serve:1` and, with a known metric serving, `g` or `mL:1/servingAmount`. Per-100 nutrients use `g` or `mL:.01`; a known manufacturer serve adds a conversion. Pack size is not an amount conversion.

Barcode lookup produces catalogue or Open Food Facts records, saved as online references. They can contain stale `loggable`, `nutritionStatus`, recognised-only and serving metadata. Panel review reads DOM inputs into a basis model and builds a new `panel-*` private record. Manual panel corrections use those same inputs, but the comparison handler mutates a retrieved barcode record and upserts it online without rebuilding all dependent flags/basis data. The later Save action independently builds another panel record. The ordinary custom-food editor is another explicitly private entry path; it is not attached to the captured barcode draft.

### Demonstrable faults and limits of diagnosis

- Barcode comparison does not converge on the final private panel record; it can leave stale blocking flags and disconnected records. It also risks mutating the cached catalogue object.
- The parser supports only eight nutrients, discards printed kJ, cannot persist calcium/ingredients/servings-per-pack, guesses the first column for a single surviving value in a two-column row, and defaults a mass-less liquid per-100 panel to g.
- Review unnecessarily requires metric serving mass when per-serving energy exists, even when a fixed serve or independent per-100 basis is usable.
- There is no completed/cancelled capture reset; DOM inputs and comparison identity can survive navigation.
- Missing optional enrichment is displayed alongside the generic Diary error, making the actual blocker unclear. Panel construction also wrongly records unknown water as zero.

These faults reproduce the *style* of the founder failure; the exact contents of his record and the cause of OCR failure on his photograph remain unknown and are intentionally not inspected.

Implementation and validation results follow after the bounded synthetic checks.


## Implemented contract and workflow

The existing shared representation remains authoritative: nutritionBasis with distinct printed columns, one selected calculation basis, nutrients for that basis and positive units multipliers. No second nutrition engine or migration was added. A confirmed private record needs finite, nonnegative energy (printed kJ or Cal under HEC's existing 4.184 convention), a name and at least one supported amount. Invalid selected values, inconsistent energy pairs and missing basis/unit choices produce specific validation. Other missing nutrients remain null. Printed column differences require explicit confirmation; choosing a basis never fills the other printed column.

Barcode lookup carries identity into a single session. Panel/manual review creates or updates one private ID, including an existing private ID matched by barcode. A previously saved online identity is replaced in My Foods' saved-reference list when its confirmed private replacement is saved. Catalogue records are retained as evidence, never modified by confirmation. Values are compared on equivalent mass/volume/serve bases, including serving-size conversion where supported. Both private choices are tested. Provenance records the catalogue identity/nutrition, extracted panel, corrected panel and explicit choice; Diary snapshots retain it.

“Review Nutrition” on saved-food Details and incomplete-product handoffs offers bounded repair. It adapts stored nutritionBasis, nutritionPer100 / nutritionPerServing, or explicit existing unit conversions into the same editable review. It does not write on open, guess a conversion, scan all user records or migrate them automatically.

One session owns identity, review and async work. Save, Cancel and Start New clear it. Try Again clears extraction while retaining the intended identity. Leaving to Home suspends the in-memory draft behind Resume Previous Draft / Start New Capture. Reload discards an unfinished capture; saved foods persist. Cancelled or superseded OCR/barcode responses cannot restore an old product. Camera acquisition implementations remain in place; camera start is suppressed while a suspended draft awaits the user's choice.

## Validation evidence

- [Bounded suite: 306 passed, 0 failed](data/product-capture-repair/regressions-final.txt).
- [Final affected-path recheck: 149 passed, 0 failed](data/product-capture-repair/final-focused-recheck.txt), including food-group semantics and release/core/worker tests after the last runtime changes.
- [Rendered mobile flow and lifecycle](data/product-capture-repair/rendered/capture-flow.json): 390 × 844 disposable Edge context; local SOURCE assets only, zero live application fallthrough, no application errors. Uses deterministic OCR text to isolate preprocessing, parsing, corrections, persistence and Diary. Tests late responses after Cancel.
- [Rendered barcode/basis/core cases](data/product-capture-repair/cases/cases.json): compatible, conflicting panel preference, conflicting catalogue preference, unknown barcode, existing-record review, per-100 g, per-100 mL, fixed serve, genuinely incomplete record, core Search and McCain.
- [Real OCR result](data/product-capture-repair/rendered/real-ocr.json), [synthetic flat panel](data/product-capture-repair/rendered/synthetic-panel-flat.png): bundled Tesseract.js 7.0.0, same segmentation parameters as the app; confidence 93. Correct energy columns, serving quantity, servings-per-pack, protein and calcium. A misread “g” and saturated-fat decimal are flagged and left unknown. This is a bounded extraction demonstration, not a claim that all clear photographs read perfectly.
- [Release integrity](data/product-capture-repair/release-integrity.json): 48 required-core/role hashes verified, no mismatches, empty stale-output list. Generation **8e84152076aacc39ae4ffa24**; visible version **0.6.33**. Catalogue/index/shard and deployment files have no changes. Existing accepted catalogue/performance evidence is reused; no retailer or broad performance campaign ran.
- [Protected deployment SHAs](data/product-capture-repair/protected-precommit.json) and [junction guard](data/product-capture-repair/junction-precommit.json).

### Failed observations and limitations

The initial browser launch correctly stopped at the release gate because a newly written file had a trailing CRLF while the builder hashes LF-normalised content. The file was normalised; final raw-byte checks pass. The first OCR image produced an ambiguous energy unit, retained in [the first OCR receipt](data/product-capture-repair/rendered/real-ocr-first-uncertain.json). Row-header units were then supported and an explicitly laid-out flat table was tested. Neither result was interpreted as perfect recognition.

Legacy source-shape tests expected the old generic error and the unnecessary fixed-serve weight requirement. Assertions were updated to the required behaviour. One remaining stale generic-error assertion was corrected, then the complete bounded suite passed. The first central-food browser harness omitted Big Mac's existing Standard choice; the harness now follows that step. The added liquid case exposed an actual locked-unit UI problem; the private capture path now exposes supported units, and g/mL/serve save–reload–Diary cases pass. A final persistence audit removed false zero group contributions for unclassified captured foods.

No unresolved automated test failures remain. Local commit is blocked by the Git ownership guard described below. Physical iPhone camera/OCR behaviour, an actual packet and installed-PWA upgrade behaviour are not claimed by these SOURCE-only tests. OCR remains fallible and requires package confirmation. Optional nutrients supported here are calcium, iron and potassium (mg); arbitrary micronutrient units are not guessed. Ingredients can be read from recognised text or typed; no standalone ingredients-camera workflow was added.

## Requested founder report

| # | Requested item | Result |
|---|---|---|
| 1 | Preflight | PASS: expected clean source, version, generation and protected SHAs. |
| 2 | Starting SOURCE | d3cfa0d8fe9b1d164c9a310058a459baa45562ac. |
| 3 | Barcode camera | Founder reports working; acquisition retained, no personal camera accessed. |
| 4 | Panel camera/photo | Founder reports working; acquisition retained, synthetic image inputs used. |
| 5 | Failure causes | Disconnected saves, stale blocking flags, unsafe catalogue mutation, missing fields, restrictive serve validation and persistent capture state; exact founder-record contents intentionally unknown. |
| 6 | Old fixed contract | Energy + safe amount and no blocking flags; optional enrichment was not a direct gate. |
| 7 | Repaired contract | Same shared model, chosen basis and private confirmation; one valid g/mL/serve basis suffices; unknowns stay unknown. |
| 8 | Barcode draft | Identity/evidence enters one session; existing private ID reused. |
| 9 | Panel draft | Both printed columns stay separate and editable in that session. |
| 10 | Manual persistence | PASS through save, reload, reopen and Diary snapshot. |
| 11 | Per serve | PASS, including fixed serve without guessed weight. |
| 12 | Per 100 g | PASS, independent of a printed serve column. |
| 13 | Per 100 mL | PASS, with selectable mL after private unit-lock repair. |
| 14 | Optional nutrients | Calcium, iron and potassium mapped in mg; calcium correction/scaling/snapshot verified. |
| 15 | Ingredients | Recognised or typed text persists; absence is allowed. |
| 16 | Missing food groups | Loggable; empty classification preserved in food and Diary, unavailable attribution retained. |
| 17 | Missing water | Loggable; null remains null. |
| 18 | Unknown barcode | PASS: identity + panel → private save → Diary. |
| 19 | Known compatible panel | PASS: comparison and one private record. |
| 20 | Known conflicting panel | PASS for both explicit private choices, evidence retained. |
| 21 | Central catalogue | Unchanged; fixtures never admitted; compared records unchanged. |
| 22 | Private save | PASS, independently of Diary. |
| 23 | Private reopen | PASS after reload. |
| 24 | My Foods → Diary | PASS for g, mL and serve. |
| 25 | Old broken-style food | PASS through visible Review Nutrition; no bulk/destructive migration. |
| 26 | Genuine incompleteness | Blocked; no energy or conversion invented. |
| 27 | Validation | Identifies missing energy/basis/unit/confirmation or conflicting values. |
| 28 | Save lifecycle | Completed session clears. |
| 29 | Cancel | Clears and returns Home; late work ignored. |
| 30 | Try Again | Fresh extraction attempt for intended identity. |
| 31 | Home/return | Explicit Resume Previous Draft or Start New Capture. |
| 32 | App reopen | No completed capture session survives; saved My Foods remain. |
| 33 | Founder-style synthetic flow | PASS end to end; values explicitly synthetic. |
| 34 | Natural measures | Printed count, fixed serve and safe g/mL supported; no solid mL invention. |
| 35 | Pack versus intake | 750 g pack retained as identity; default manufacturer serve 125 g, not 750 g intake. |
| 36 | Rendered mobile | PASS at 390 × 844; no horizontal overflow or clipped capture controls; screenshots retained. |
| 37 | New Search | Opens blank. |
| 38 | Bread | Concept first. |
| 39 | Milk | Concept first. |
| 40 | Big Mac | Exact first; central-food Diary save passes. |
| 41 | Hash Brown | Concept first. |
| 42 | Review | One final Review; capture never auto-saves Diary. |
| 43 | McCain | GTIN 9310174025084 → woolworths-au:98299; 75 g = 130 Cal / 543 kJ. |
| 44 | Failures/limits | Resolved observations and physical/OCR limits above; final automated checks pass. |
| 45 | Release generation | 8e84152076aacc39ae4ffa24. |
| 46 | New SOURCE SHA | None: Git blocked staging before commit. SOURCE HEAD remains d3cfa0d8fe9b1d164c9a310058a459baa45562ac. |
| 47 | Direct parent | No new commit. Current HEAD parent remains f337d214a7d8c71bbd0026bc9d46f1db35f94899; the required parent of a future authorised repair commit is d3cfa0d8fe9b1d164c9a310058a459baa45562ac. |
| 48 | Exact commit subject | No new commit. Intended subject: Repair product capture nutrition pipeline. Current HEAD subject remains Harden retailer browse loading. |
| 49 | Final SOURCE state | Not clean: tested repair, generated files, tests and evidence remain uncommitted; nothing staged. Branch alpha-0.6.33. |
| 50 | TEST SHA | 03a30148c2e3eb9cfaa11e9283999e6f039720e5. |
| 51 | MY DATA SHA | 2c39809706039b93ad613d07bd6b15229ccf2612. |
| 52 | Junction | Target and creation/last-write timestamps unchanged. |
| 53 | Scope guards | No push, deployment, personal-data access, catalogue expansion, family contribution or meal-photo recognition work. |
| 54 | Small physical acceptance set | After separate review/deployment authorisation: actual Wicked Sister packet, correct one value, save only, reopen and log; one liquid packet for mL; one known product with a corrected differing value for the private-choice prompt, then Cancel/Try Again/Home-return and a clean next capture. |
| 55 | Decision | STOPPED AFTER LOCAL CHANGES — REVIEW REQUIRED BEFORE COMMIT |



## Commit protection stop

The authorised staging command was run with elevated filesystem access because .git is read-only in the workspace sandbox. Git rejected it with “detected dubious ownership”: .git belongs to LAPTOP-FL371N0F/CodexSandboxOffline, while the elevated process runs as LAPTOP-FL371N0F/mlwes. Staging did not occur and no commit command was run.

This was a Git ownership protection failure, not an automatic-approval-review rejection. The user's explicit “Do not work around protection failures” instruction was honoured: no safe.directory exception, ownership change, alternative index, trust bypass or junction change was attempted. All tested source changes remain reviewable. SOURCE HEAD and parent are unchanged. The final handoff reports the final read-only guards.


## Myron review: authorised local SOURCE commit

The preceding stop, table rows 46–49 and 55, and final-source-guards.json are historical evidence from the first staging attempt. Myron/Mal subsequently accepted this repair and authorised one local commit with subject Repair product capture nutrition pipeline, directly after d3cfa0d8fe9b1d164c9a310058a459baa45562ac. Only an exact-canonical-path, command-scoped safe.directory exception is authorised; no global/system trust, ownership, ACL or junction changes are authorised or needed.

Continuation preflight confirmed branch alpha-0.6.33, the expected starting HEAD, unchanged junction and protected deployment SHAs. Release generation remains 8e84152076aacc39ae4ffa24; the release check reports current outputs. All 46 manifest file hashes and 966 recorded rendered asset hashes match current bytes. The accepted 306/306 and 149/149 test results, mobile capture flow, basis cases and bounded OCR evidence are reused without rerunning campaigns. No application changes were made during this continuation.

OCR evidence remains bounded and synthetic. Physical iPhone acceptance with Mal’s real packet is still pending; the actual Wicked Sister record and photograph were never inspected. The post-commit chat handoff records the new SHA, parent, clean-state result and final protected-repository checks; this document cannot contain its own commit SHA.
