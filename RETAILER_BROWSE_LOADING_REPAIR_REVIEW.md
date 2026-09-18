# Retailer browse loading: bounded SOURCE hardening review

Myron has accepted the bounded-loading repair as defensive SOURCE hardening and authorized exactly one local commit. The exact historical trigger of Mal’s physical TEST v47 stalls remains **unconfirmed**. All 112 category/house-brand routes also passed against unchanged starting SOURCE in the initial fresh-state browser audit; the physical observation remains authoritative. The earlier requirement for proof of that historical trigger is superseded for this bounded repair only. Deployment and push remain unauthorized.

## Diagnosis and scope

The confirmed code defect is an unbounded asynchronous wait. `retailer-source.js` originally cached a promise around `fetch()` and `response.json()` with no deadline. `retailer-catalogue.js` awaited all evidence shards, then hydrated and validated canonical groups; its session `finally` cleared loading only after that awaited work settled. A request/body that never settles therefore leaves `session.loading=true`, and the renderer continues showing “Loading foods”. Rejection already had an error path, but a forever-pending promise never reached it. A synthetic stalled loader reproduces this mechanism against the starting commit. This demonstrates a defect, **not the unobserved initiating cause of the founder's iPhone stalls**.

The source pipeline was traced through final builder category projections, verified house-family relationships, canonical membership, exact normalized brand keys, category/brand postings, ID-to-shard mapping, complete-group hydration validation, async ownership, rendering and empty handling. Neither the source data nor the visible lists contain a demonstrated zero-result or broken-resolution group. All eight reported examples contain real eligible products and resolve in the synthetic checks. TEST v47's committed tree differs from starting SOURCE only in the expected two TEST identity files. Its Aldi shards are present; one public shard was also read successfully. No physical request log, installed-cache inspection, or real browser/PWA data was accessed. Network, service-worker or iOS-specific initiating causes remain unconfirmed.

The candidate adds 15-second deadlines to shard reads and retailer sessions. Timed-out reads abort and evict only their own cached promise, allowing Retry. Expired request ownership prevents late results from populating the page cache or replacing a newer view. Catalogue replacement during an active request becomes an explicit error. The renderer gives stale/empty category or brand requests a clear “No matching foods…” state with Back and Cancel. It retains the existing error message and Try Again button. No data admission, matching, taxonomy, nutrition, identity, deployment overlay or worker-template policy was changed.

## Systematic audit

| Retailer | Food categories | House brands | All Items | Routes | Visible | Loggable | Restricted |
|---|---:|---:|---:|---:|---:|---:|---:|
| Aldi | 16 | 32 | 1 | 49 | 222 | 222 | 0 |
| Woolworths | 20 | 11 | 1 | 32 | 362 | 347 | 15 |
| Coles | 18 | 15 | 1 | 34 | 417 | 417 | 0 |
| Total | 54 | 58 | 3 | 115 | 1,001 | 986 | 15 |

The audit derives expected identities from source records independently of runtime postings and compares exact canonical sets across every page. Each row records retailer, visible label, key, expected count, actual count, settled status and result classification. All 115 final rows are PASS. Every visible house family contains ordinary loggable products. Woolworths Frozen Vegetables and Frozen Potato Products each retain one existing restricted product; these are valid visible completion/details results, not zero-result groups or newly loggable foods.

| Founder route/control | Key | Expected and resolved products | Final synthetic result |
|---|---|---:|---|
| Other Packaged Food | other-food | 51 | PASS, all pages |
| Yoghurt (founder: Yogurt) | yoghurt | 10 | PASS |
| Cheese | cheese | 24 | PASS, all pages |
| Spreads & Margarine | spreads | 9 | PASS |
| Bakers Life | bakerslife | 13 | PASS |
| Damora | damora | 10 | PASS |
| Hillcrest | hillcrest | 16 | PASS |
| Ocean Royale | oceanroyale | 10 | PASS |
| Seasons Pride | seasonspride | 2 | Potato Jewels and Potato Gratin |
| Elmsbury | elmsbury | 1 | Party Pies; no expansion |

Zero-result visible choices removed: **0**. Demonstrated normal data/index resolution failures repaired: **0**. Shared indefinite-wait mechanism hardened: **1**, at two asynchronous boundaries, plus explicit empty-state handling. Aldi Desserts & Ice Cream remains absent correctly.

## Verification and limitations

Fresh disposable Edge at 375 × 812 checks every visible route and every product page, rendered count, loading completion, Back, horizontal overflow and control widths. All pass. Screenshots cover Yoghurt, Bakers Life, Seasons Pride, Aldi root and defensive empty state. These are mobile-layout browser checks, not physical iOS acceptance. An injected never-returning shard exits to Try Again after 15,350 ms including interaction/render overhead; retry returns all 10 Yoghurt products. An injected rejected request also settles and retries successfully. Stale category and stale house-brand keys render the empty message. Unit coverage also checks empty intersections, stale source replacement, cancellation, newer-request ownership and late responses.

The focused suite records **171/177 passing**. All six failures belong to existing `query-ownership.test.js` synthetic brand fixtures (`current.records[0].id` is absent). Running those tests against `HEAD:alpha06.js` reproduces the same six failures: 16/22 pass on the baseline. These failures were not hidden, waived or repaired outside this task. An earlier broad brand-directory test sweep was interrupted in conservation mode and is not claimed as complete.

Rendered regressions pass: blank new Search; Bread, Milk and Cereal concept first; no milk-chocolate contamination; exact Big Mac first; Hash Brown generic and source choices; one final Review; no Diary saves. Original Thin Brown Rice Cakes and Sea Salt & Balsamic Vinegar Rice Cakes remain in Crackers & Biscuits; Carrot Cake Hot Cross Buns remain in Bread & Bakery. Irish Cream Flavoured Ice Cream remains Desserts & Ice Cream and is rendered through Ice Cream — Generic → Purchased Packaged / Frozen. Potato Jewel/Jewels/Gem/Gems retain useful concept results and authentic Seasons Pride Potato Jewels, canonical barcode:4061463000316. Its Review remains 3 pieces = 30 g = 54 Cal / 227 kJ. McCain GTIN 9310174025084 remains woolworths-au:98299, 75 g = 130 Cal / 543 kJ.

All four catalogue builders pass generated-byte checks. All 496 inventory shards match SHA-256 hashes. Catalogue/index data are unchanged. Release/core/service-worker coherence tests pass; stale-output list is empty. The release builder produced **b73351bbca5371e5cfcccfd5**, with visible version 0.6.33. Overall counts remain brand-browse 7,489; brand directory 2,736; ordinary approved identities 7,511; packaged universe 73,393. The ordinary count follows the established canonical-evidence-before-eligibility methodology; raw evidence-row or retailer-root-only counts are not equivalent populations.

The completed isolated performance campaign passes: one cold-first sample **281.4 ms** (limit ≤500 ms), and exactly **50 generic samples**, median **53.0 ms** (≤100 ms), p95 **148.9 ms** (≤300 ms). The first generic normal sample, 267.6 ms, remains in the distribution. No warm-up or samples were discarded from this completed campaign. All ten established operation gates pass.

| Operation | Samples | Median ms | p95 ms | Result |
|---|---:|---:|---:|---|
| freshFoodLibrary | 50 | 68.3 | 108.2 | PASS |
| blankNewSearch | 50 | 68.4 | 145.3 | PASS |
| genericShortlist | 50 | 53.0 | 148.9 | PASS |
| exactBrand | 50 | 34.7 | 66.8 | PASS |
| brandProduct | 50 | 86.2 | 140.4 | PASS |
| brandBrowse | 50 | 35.0 | 61.5 | PASS |
| brandCategory | 50 | 3.1 | 6.4 | PASS |
| conceptBrandName | 50 | 9.7 | 14.1 | PASS |
| retailerBrowse | 50 | 3.4 | 6.7 | PASS |
| allItems | 50 | 3.2 | 6.5 | PASS |

The first attempt overlapped an unfinished canonical-count job and was interrupted for violating isolation before its values were inspected. Its cold sample **710.9 ms**, a failed ≤500 ms observation, remains in the retained receipt. No completed normal campaign was produced by that attempt. The repeat was for that documented methodology/gate failure; there was no intervening runtime change. There were two cold observations in total, one invalid-isolation attempt and one completed isolated campaign, not an undisclosed single attempt.

## Initial investigation snapshot (before Myron authorisation)

Preflight passed on the correctly spelled authorized path. Branch alpha-0.6.33 was clean at **f337d214a7d8c71bbd0026bc9d46f1db35f94899**, direct parent **2f9f69613d99b45580bf81da9e6ae08ec96a7ae9**, subject “Repair retailer catalogue semantics”, version 0.6.33, generation 345556f9ab7aef73efdc9a39.

No new SOURCE commit was created. Current SOURCE HEAD remains **f337d214a7d8c71bbd0026bc9d46f1db35f94899** and its direct parent remains **2f9f69613d99b45580bf81da9e6ae08ec96a7ae9**. There is no new commit SHA or commit subject to report. The working tree is deliberately **not clean**: the reviewed runtime hardening, generated release files, focused tests, audit tooling and evidence remain uncommitted. No tracked catalogue/index/shard changes exist. A future approved repair commit would require parent f337d214a7d8c71bbd0026bc9d46f1db35f94899, but this report does not authorize it.

Final read-only repository checks confirm:

- TEST v47: **1091a7c2d7b0ec9d01efa2e63e5bd4462e8b65f4**; still NOT founder-accepted.
- MY DATA v12: **7c3e9e5805bb1bf1d1c8ad0667132b69e7f0b650**; unchanged.
- Junction: unchanged target to the correctly spelled SOURCE path; creation and last-write UTC timestamps both 2026-09-03T05:51:20.6882527Z, matching the starting recorded state.
- No SOURCE push, TEST deployment, MY DATA work/deployment, real personal browser/PWA data access, new food identities, house-brand expansion, restaurant work or Product Capture Pipeline work occurred.

The original investigation stopped before commit under its then-current gate. Myron’s subsequent decision below supersedes that gate. Passing fresh-state checks and timeout hardening still do not establish the exact trigger of the founder’s physical failure.

[Final performance receipt](data/retailer-loading-repair/performance-isolated/house-brand-performance.json) · [Protected SHA receipt](data/retailer-loading-repair/protected-final.json) · [SOURCE/junction guards](data/retailer-loading-repair/final-guards.json)

## Evidence

- [Every route: independent expected/resolved audit](data/retailer-loading-repair/audit.json)
- [Unchanged-source mobile baseline](data/retailer-loading-repair/before/routes.json)
- [Final rendered routes, empty cases and injected faults](data/retailer-loading-repair/rendered-final/routes.json)
- [Synthetic original-code stall reproduction](data/retailer-loading-repair/stall-reproduction.json)
- [Focused tests](data/retailer-loading-repair/focused-tests.txt) and [baseline query-ownership failures](data/retailer-loading-repair/query-ownership-baseline.txt)
- [Rendered search, category and Review regressions](data/retailer-loading-repair/regressions/house-brand-rendered.json)
- [Irish Cream generic source route](data/retailer-loading-repair/irish-cream.json)
- [Shard coherence and identity counts](data/retailer-loading-repair/coherence.json)
- [Performance isolation error retained](data/retailer-loading-repair/performance-isolation-note.txt)

## Myron bounded-commit review

The reviewed runtime and data bytes are unchanged. Reverification compares 297 files loaded during the accepted isolated performance campaign byte-for-byte with its recorded SHA-256 hashes, validates all 496 catalogue shards, and checks the unchanged derived release generation. All four catalogue builders pass their generated-output verification; Woolworths uses its existing deterministic regeneration workflow with unchanged resulting bytes. The stale-output list is empty.

Five targeted hardening tests and all 15 release-coherence tests pass. The route sweep and broad rendered/performance campaigns were not rerun. The accepted 115-route, injected stall/reject/retry, empty-state, category/search/Review and performance evidence is reused. Counts remain exactly as tabulated above. The earlier 710.9 ms non-isolated observation is retained.

The six query-ownership fixture failures are pre-existing baseline test debt, reproduced against unchanged starting SOURCE, and are not introduced by this hardening. They were not repaired in this job and do not block this bounded commit under Myron’s explicit decision.

The authorized single local commit has exact subject **Harden retailer browse loading**, branch **alpha-0.6.33**, and required direct parent **f337d214a7d8c71bbd0026bc9d46f1db35f94899**. Candidate generation remains **b73351bbca5371e5cfcccfd5**, visible version 0.6.33. The resulting commit SHA and clean-tree check are supplied in the final handoff, since a committed report cannot contain its own hash. Historical pre-commit receipts above remain unchanged as evidence, not claims about the post-commit state.

Read-only protected-state rechecks confirm TEST **1091a7c2d7b0ec9d01efa2e63e5bd4462e8b65f4** and MY DATA **7c3e9e5805bb1bf1d1c8ad0667132b69e7f0b650**. Junction target/timestamps remain unchanged. No push, deployment, personal-data access, catalogue expansion, fixture-debt repair or product-capture work is included.

[Candidate integrity](data/retailer-loading-repair/myron-review-integrity.json) · [Targeted hardening tests](data/retailer-loading-repair/review-specific-tests.txt) · [Release tests](data/retailer-loading-repair/review-release-tests.txt) · [Protected SHAs](data/retailer-loading-repair/myron-protected-precommit.json)

SOURCE HARDENING PASS — READY FOR MYRON REVIEW BEFORE REPLACEMENT TEST DEPLOYMENT
