# Post-v26 Chiko Search identity regression

Scope: targeted source repair, 2026-09-10. Branch `alpha-0.6.33`; required starting and commit-parent SHA `5b96d5550badade6947d9a34e5692e06812a599e`. The source working tree was clean at entry. Source version remains `0.6.33`, source TEST cache remains `healthy-eating-companion-test-alpha-0-6-33-v5`.

## Reproduction and exact cause

Reproduced the reported physical-iPhone behaviour in genuine local Microsoft Edge at 390 x 844, using the existing strict local TEST-origin routing helper, a disposable browser context, blocked service workers and local production assets. This is a local reproduction of the physical report, not a claim of running on a physical iPhone or inspecting live TEST.

Before the repair, fresh typing of `Chiko roll`, after the OFF source was hydrated, rendered:

> Chiko Roll — Chiko — 1 roll (162 g) — 313 Cal — 1,310 kJ — Review

Deliberate Search rendered two Details-only rows. Selecting the first produced exactly `This record needs a specific product identity.`, with View Details / Cancel. The guided session was `product-identity` / `identity-incomplete`.

| Trace stage | Evidence |
| --- | --- |
| Local source | `alpha06.js` contains `aussie-chiko-roll`, a named Australian retail package reference, with roll = 162 g, 313 Cal, and `verified:false`. |
| Indexed OFF source | `brands/ch.json` maps Chiko to `ch-01:400`; `products/ch-01.json` supplies `off:9310081760092`, barcode `9310081760092`, source serving `1 roll (162 g)`, with per-100-g source nutrition. |
| Canonical identity | The inferred packaged local row resolves to `packaged:record:aussie-chiko-roll`; OFF resolves to `barcode:9310081760092`. Both identities survive loading and hydration. |
| Canonicalisation / dedupe | Both rows remain. The local row has no GTIN or pack-size proof linking it to the OFF GTIN. `strongDuplicateEvidence` correctly reports insufficient exact identity evidence; display dedupe also retains distinct source/nutrition evidence. |
| Source evidence | The local row remains unverified / unknown trust; OFF remains catalogued community / `open-food-facts-au`. Neither is newly manufacturer-verified. |
| Standalone eligibility | Each record independently passed the existing specific-name, nutrition and measure checks. |
| Contextual eligibility | `exactProductQuality(..., {candidates})` treated the same name and brand, plus both empty `foodSourceId` fields, as an ambiguous duplicate label. The rule conflated distinct packaged and OFF source identities. It set `identity-ambiguous-duplicate-label` on both records. |
| Preview construction | `rc5ExactCandidates` kept both records and ranked the existing local package reference first. The final `rc4ExactProduct` wrapper attempted a submitted model; when that model had no loggable best match, it fell back to checking the old exact record without the peer context. This restored the preview's loggable promise. |
| Submitted construction / ranking | `submittedResultModel` used contextual eligibility over the canonical ranked candidates. Both records went into Details Only; ranking still placed the local row first. No weaker row replaced or erased it. |
| Hydration / selection | Hydration preserved identity and portion fields. Submitted `eligibilitySnapshot` correctly retained the contextual restriction on the selected food; `us633ActivateControl` passed that snapshot to the guided resolver, which honoured it. Selection propagation was working; the restriction being propagated was wrong. |

Thus same-label source rows were involved, but unsafe deduplication, dropped identity fields, brand-directory bypass and ranking replacement were not the cause. The defect was the cross-source label ambiguity rule, combined with a preview fallback that discarded its contextual decision.

## Shared repair

Production changes are limited to:

- `food-catalogue.js`: qualify duplicate-label ambiguity by record type and declared catalogue/source namespace. Copies of the same canonical identity are not competing identities. Different records with an ambiguous label within one source still fail the existing identity check. Cross-source merging remains exclusively subject to the unchanged canonical evidence rules.
- `alpha06.js`: exact preview uses the canonical matching records and the submitted model's selected food snapshot, then checks identity with that same candidate context. It no longer falls back to a context-free record when the contextual model rejects the identity.

The common eligibility function already serves submitted Search, brand results and guided selection, so the correction applies there without separate product-specific paths. Exact preview now retains that contextual decision too.

No literal Chiko condition, catalogue lookup, hard-coded portion/nutrition override, source refresh, source-data correction or layout change was added. Existing ranking preserves the local record as Best match. The separate OFF record remains available under its own source identity.

The two sources' full nutrient panels are not identical; they are not merged, averaged or presented as corroborating measurements of a proved single GTIN. The existing local record's `verify current package` qualification remains. Inspection did not prove that this accepted local product/portion identity is malformed or indefensible, and the repair makes no stronger verification claim. Its energy remains 313 Cal with approximately 1,310 kJ from the existing energy conversion.

## Focused executable coverage

New file: `tests/canonical-search-identity-consistency.test.js`, six tests, including an actual production browser flow.

- Fresh Chiko preview after real OFF index hydration preserves the accepted local identity, 162 g roll, 313 Cal and 1,310 kJ.
- Deliberate Search exposes that same canonical identity as its first loggable result. Both source identities remain intact through canonicalisation and deduplication.
- Selecting the submitted result reaches the normal measure/amount flow; choosing one roll reaches Review with the expected nutrition and Add to Diary available. The browser test does not add a diary entry.
- The existing preview Review action independently reaches the amount editor with the same named product, roll and nutrition.
- A non-Chiko synthetic package/community/candidate fixture verifies stronger result retention in either arrival order, exact-preview consistency, brand-result eligibility, guided selection and source immutability.
- Additional synthetic checks preserve same-source ambiguity, generic/brand/barcode-shell restrictions and unresolved same-GTIN source conflicts. An ambiguous same-source model cannot regain exact preview through the former standalone fallback. Same-canonical copies cannot manufacture ambiguity; an online candidate cannot win the canonical merge over manufacturer evidence.

Final focused command:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/canonical-search-identity-consistency.test.js tests/australian-catalogue-foundation.test.js tests/catalogue-search-regression-recovery.test.js tests/physical-iphone-search-serving-corrections.test.js
```

Result: **74/74 passed**, zero failures, cancellations, skips or TODOs, **18,750.0732 ms**, exit 0. During test authoring, the driver was corrected to choose the main preview Review button and to assert its existing direct-editor path; the same-source ambiguity fixture was corrected to contain genuinely distinct records rather than equivalent display copies. No production checks were relaxed to accommodate those test corrections.

## Proportionate verification

The unchanged established benchmark was run once because eligibility and exact-preview canonicalisation are on search paths:

```text
node scripts/benchmark_search_session_repair.js
```

| Existing category | p95 ms | Existing limit ms |
| --- | ---: | ---: |
| Generic search | 133.139 | 250 |
| Large catalogue search | 33.3 | 250 |
| KFC ranking | 27.611 | 250 |
| Progressive resolution | 209.21 | 250 |
| Portion profile | 3.039 | 100 |
| Character recognition, 5,900 calls | 2.8 | 20 |

Result: **PASS**, exit 0, zero failures. Character-recognition maximum 11.8 ms. All 53/53 benchmark browser requests were served locally, zero live fallthrough or failed assets. No threshold or benchmark workload changed.

One fresh full suite was run after the focused checks passed:

```text
node --test --test-reporter=tap --test-concurrency=1 tests/*.test.js
```

Full-suite result: **1,268/1,268 passed**, zero failures, cancellations, skips or TODOs, **378,847.3541 ms**, exit 0. This is the accepted 1,262-test baseline plus the six focused regression tests. No full-suite rerun was needed.

The focused canonical conflict/identity checks and actual browser trace provide the directly relevant safety audit. No standalone broad catalogue audit, new acceptance area or seven-viewport matrix was run. Rendered layout and responsive behaviour are unchanged.

Evidence files are outside the source tree under `C:\Users\mlwes\AppData\Local\Temp`: `hec-chiko-before.json`, `hec-chiko-focused.tap`, `hec-chiko-focused.stderr`, `hec-chiko-benchmark.json`, `hec-chiko-benchmark.stderr`, `hec-chiko-full-suite.tap`, and `hec-chiko-full-suite.stderr`. Each browser test prints its own `hec-chiko-regression-*` evidence directory containing the canonical trace and local request hashes.

## Protected state and commit boundary

No push, deployment, live TEST repository access, My Data access or source refresh was performed. The provided TEST v26 SHA `a481e84eb4aa0e401c05ca7b9d6d0fd9c84d0c08` and My Data SHA `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709` are accepted reference values, not newly queried remote-state claims.

Protected OFF raw material, KFC, McDonald's, AFCD and AUSNUT material are unmodified. Source deployment overlays, version and service-worker cache are unmodified. The source diff is limited to the two production files, the focused test file and this report.

All required verification passed, and `git diff --check` passed. The authorized source commit is the sole child commit in this job, with the required starting SHA as parent and message `Fix canonical search identity consistency`. Its SHA and final working-tree state are supplied in the accompanying final response, since a commit cannot include its own SHA.
