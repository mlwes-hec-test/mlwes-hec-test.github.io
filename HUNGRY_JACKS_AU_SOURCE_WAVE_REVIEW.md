**Hungry Jack's Australia source catalogue wave — 12 September 2026**

Source-only review for Mal/Myron. This wave recovers usable official product identities and serving evidence. It does not establish that every nutrition-document product is currently sold at every store.

| Catalogue measure | Accepted starting source | Final source |
|---|---:|---:|
| Active extracted Hungry Jack's rows | 418 | 415 |
| Canonical consumer identities | 291 | 316 |
| Loggable Now | 187 | 225 |
| Needs Nutrition Completion | 104 | 36 |
| Details Only | 0 | 55 |
| Unresolved material conflict-blocked identities (overlapping eligibility) | 87 | 35 |
| Raw appearances collapsed into canonical identities | 127 | 99 |
| Consumer browse categories | 1 undifferentiated group | 16 |
| Exact current menu-page evidenced identities | Not independently distinguished | 65 |
| Uncertain current availability | Not independently distinguished | 251 |

1. **Starting checkpoint.** The canonical real path was `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`. The supplied `HEC Develpoment` workspace path resolves to it. Branch `alpha-0.6.33`, clean HEAD `d494ad66e5c0a87e6e0cb35d249985abed0d2153`, message `Fix saved My Foods removal and persistence`, parent `588d97d43a0c691ca3fde5c9b35021cc1d38bde6` were checked before production edits. Visible version remains 0.6.33; the source TEST-role service-worker cache remains `healthy-eating-companion-test-alpha-0-6-33-v5`.

2. **Existing architecture.** Reused `scripts/ingest_australian_catalogues.py`, `data/australian-catalogue/supplemental.json`, `scripts/build_australian_catalogue.js`, generated `australian-catalogue-data.js`, the `food-sources.js` registry, `food-catalogue.js` canonicalisation/eligibility, `search-foundation.js`, `guided-product-resolution.js`, and the existing serving/portion foundations. The production controller and My Foods persistence code were not edited.

3. **Before inventory.** The starting source actually contained 418 Hungry Jack's rows, 291 canonical identities, 187 Loggable Now, 104 Needs Nutrition Completion, zero Details Only and 87 material conflict-blocked identities. All carried a generic Restaurant menu category and nutrition-directory-based listed status. Rendered bare-brand browsing showed Other (291) and All Items (291). Inventory and route inspection preceded implementation.

4. **Official freshness check.** Refetched the [nutrition directory](https://www.hungryjacks.com.au/nutrition-info), all 18 linked nutrition PDFs, 17 categories discovered from the [official menu](https://www.hungryjacks.com.au/menu/what-s-new), and 183 linked product-page URLs. All 18 PDFs were hash-identical to the 8 September evidence. No new publication was invented. Only official Australian Hungry Jack's material supplied authority.

5. **Capture and reproducibility.** The committed capture manifest records 219 public inputs, exact URLs, SHA-256 checksums and retrieval times from `2026-09-12T02:08:28.637853+00:00` to `2026-09-12T02:15:07.426167+00:00`. Raw rows retain document URL, publication/retrieval dates, PDF page, table, row, original cells and vertically aligned product cells. Menu evidence retains page title, serving basis, original nutrient text, links and hashes. Raw HTML/PDF captures remain outside the repository in the task evidence directory; factual extracts and provenance are committed.

   Cached full PDF/menu replay produced byte-identical `supplemental.json` (SHA-256 `dd82eb8db6f8c28271a647c320ec7f9123e663d64757a4f0d67cb59c720de8b5`) and `hungry-jacks-menu-evidence.json` (`4f134879bf2bf3206e1f798fda59b71e30cba3c7d7655bfe2610d3b412a7c856`). Rebuilding the generated catalogue and build report was also byte-identical. Commands:

   ```text
   python scripts/ingest_australian_catalogues.py --source hungry-jacks-au --capture-directory <captured-input-directory>
   node scripts/build_australian_catalogue.js
   node scripts/audit_hungry_jacks.js <audit-output.json>
   node scripts/audit_hungry_jacks_edge.js <disposable-output-directory>
   ```

   The capture directory must contain the recorded manifest and hash-named input files. Omit `--refresh` for historical replay; `--refresh` deliberately retrieves a new source snapshot. Generated runtime data can be rebuilt directly from the committed factual input without network access.

6. **Gaps found.** Wrapped PDF descriptions had lost flavours, counts, sizes and milk variants. In composition tables, the first nonblank numeric cell could belong to a component below the parent product. Some genuine burgers had no usable parent serving but an exact official page did. The catalogue lacked consumer categories, reliable current-menu status distinctions, short restaurant aliases for exact ranking, and source-category evidence for proprietary burger names containing ingredient words.

7. **Revision issues.** Multiple simultaneous PDF appearances are evidence for canonical identities, not separate consumer products. Seven fully specified Jack'd Up Drink/Soda pairs collapse only with the same complete flavour/portion identity, at least six shared nutrients in each basis and agreement on every jointly supplied value. Missing values are not filled by that comparison. Three ingredient continuation rows (Salt Seasoned, Lettuce and Bun Sesame Glazed 5") leave the active menu extraction; their original evidence remains archived.

8. **Identity changes.** There are 52 added canonical IDs, all traceable to earlier official rows; 46 are loggable. These recover distinct products from truncated/merged descriptions, rather than representing 52 newly launched foods. Examples include separate 3/5-pack saucy tenders, Korean BBQ/Peppercorn burgers, frozen-drink sizes and café milk variants. Forty one-to-one description repairs preserve existing canonical IDs across 53 raw appearances. Twenty-seven old IDs leave the active catalogue: seven duplicate aliases, three ingredient continuations and 17 ambiguous truncated identities. Ambiguous old IDs are not arbitrarily redirected to one of several variants. All 418 original rows remain in `hungry-jacks-20260908-history.json`.

9. **Source/data/code changes.** Added `scripts/hungry_jacks_source.py` as a helper to the established adapter; corrected wrapped/compound PDF extraction; added bounded official-menu capture and exact complete-word identity matching; retained original extracted nutrition and supporting page evidence; attached availability, category and portion semantics; extended the shared builder for declared restaurant metadata and natural per-serving nutrition without invented mass. Added an all-record audit, rendered mobile matrix and 26 regression tests. Refreshed the factual input, generated runtime data and build report; added history, manifest and menu evidence files.

10. **Shared behaviour.** The two small runtime changes are source-independent: declared official restaurant product categories can identify a whole burger despite ingredient words in its proprietary name; exact product names and declared source aliases preserve embedded package counts as identity, rather than consumed orders. A regression uses an unrelated example restaurant/package to prove the rules generalise. No Hungry Jack's preview universe, separate resolver, Hash Brown routing patch or controller nutrition override was added.

11. **Final counts.** 415 active rows yield 316 canonical identities: 225 Loggable Now, 36 Needs Nutrition Completion, 55 Details Only, with 35 unresolved material conflict-blocked identities. Builder and runtime eligibility totals agree. These are product identities, not a count of current store offerings.

12. **Useful improvement.** Net Loggable Now increases by 38, from 187 to 225 (20.3%). Twenty-one retained IDs become loggable, including Whopper, Double Whopper, Cheeseburger variants and several other burgers. Twenty-six retained formerly loggable IDs are now restricted where corrected identity, component alignment, conflicting pages or configurable meal evidence requires it. Three formerly loggable duplicate Drink IDs collapse into retained Soda identities. The arithmetic is `187 + 46 + 21 - 26 - 3 = 225`.

13. **Representative families.** The matrix covers Hash Brown and Ham/Cheese Toastie; Whopper and Double Whopper; Chicken Royale; Smoky Chipotle saucy tender 3/5 orders; Nugget 3/6/12 orders; Chips Small/Medium/Large; Biscoff Storm; and Biscoff Shake Small. For each full flow it checks typed discovery, exact submitted identity, category browsing, eligibility, measure, empty amount step, amount 2, one final Review and an actual synthetic Diary save. Reference per-order energy includes Hash Brown 685 kJ, Whopper 2437 kJ, Double Whopper 3543 kJ, tender orders 2098/3497 kJ, nugget orders 546/1092/2183 kJ, chips 1063/1289/1843 kJ, Storm 2606 kJ and small shake 1732 kJ.

14. **Bare-brand browsing.** Both `Hungry Jack's` and `Hungry Jacks` own the Australian restaurant query and open 16 nonempty category choices plus All Items (316), preserving the query through category navigation. Categories/counts are Breakfast 12; Bundle Meals 41; Chicken Burgers 11; Chicken 4; Cold Drinks 47; Jack'd Up Drinks 9; Desserts 20; Extra Condiments 7; Frozen Drinks & Bursties 24; Grill Masters 12; Jack's Cafe 50; Kids 10; Plant Based & Veggie 6; Sides & Snacks 30; What's New 17; Whopper & Beef Burgers 16. These group products using explicit publication/category evidence; the 18 PDFs are not treated as 18 consumer categories.

15. **Exact Search.** Canonical exact Whopper ranks ahead of longer Whopper variants. Full names retain sauce, size, construction and count meaning. The source alias correction feeds existing ranking and quantity parsing, with submitted Search ordering unchanged globally.

16. **Generic discovery.** Rendered Hash Brown and Burger use the shared Restaurant / Ready-to-Eat chooser. Chicken burger, Chips and Nuggets expose verified Hungry Jack's identities in the existing submitted outlet/restaurant groups. Each check requires the exact canonical row to be rendered and visible, rather than merely present in an internal candidate array. Hash Brown is one of several tested families.

17. **Measures/counts.** Burgers use Burger; ordinary countables use Item; chips use the official sized portion; drinks use the official Drink; supported components use Serve. Grams are available only with actual source mass. No solid exposes mL, litre or cup. A 6-pack is one official order; amount 2 means two orders. A bare Nugget or Chips family retains neutral 3/6/12 or Small/Medium/Large choices. Individual nugget scaling is not invented. Embedded `3 x Pack` is no longer mistaken for three consumed orders, and the user still chooses the amount.

18. **Combos/customisation.** Configurable meals and bundles remain separate identities with no assumed drink/side configuration. Parent blanks are preserved instead of borrowing a component's grams or nutrition. No composition totals, extra-cheese/bacon/sauce deltas or arbitrary customisation nutrition are fabricated.

19. **Conflict/incomplete handling.** Equal-trust material conflicts remain blocked instead of averaged. BBQ Cheeseburger, Coke No Sugar POM Large and Whopper Triple cannot enter the measure/amount/Review flow. Family Bundle Large is Details Only. Uncertain PDF glyphs are Details Only. The full 35-conflict population is covered by the eligibility audit, not just examples.

20. **Unknown safety.** Unknown nutrient values stay null through scaling and Review. The all-record audit checks 254 unknown fields in loggable identities; none become zero. Published numeric zero remains zero. Page supplementation requires a unique complete identity and consistent page evidence; it never copies a similar product's nutrition.

21. **Dedupe audit.** All 316 IDs are unique and recanonicalisation leaves exactly 316. Every identity maps to retained raw evidence. The 99 collapsed appearances must be read alongside the earlier 127: recovering previously merged variants intentionally reduces that number. All 52 newly exposed IDs have historical source-row references. Same complete words may reorder for page matching, but flavour/count/size words are never stripped.

22. **Rendered mobile results.** The standalone matrix passed all 35 scenarios: 26 at 390×844 and 9 at 375×812. Microsoft Edge 152.0.4191.66 ran in fresh synthetic contexts. All 293 application-origin requests were fulfilled from local source bytes, with zero live fallthrough, missing required assets or page errors; service workers were blocked. These were local source previews, not live PWA profiles. The 390px matrix covers all 15 full flows; the 375px matrix repeats Whopper, 6-pack nuggets and the small shake, plus brand and blocked-product checks. Screenshots were visually checked; Review overflow assertions passed. Screenshots and request/hash routing evidence are retained outside the repository. The full-suite outcome and subsequent harness wait correction are distinguished in item 33.

23. **KFC regression.** Passed the focused KFC catalogue/source and shared restaurant tests, including Wicked Wings neutral count choices, order semantics and exact/category routes. The existing 148 canonical KFC records remain unchanged.

24. **McDonald's regression.** Passed source/category handoff, exact Big Mac and shared restaurant tests. Its 211 canonical records and source file remain unchanged.

25. **Weet-Bix regression.** Passed the existing post-KFC and canonical search regression coverage; Sanitarium Weet-Bix Original retains its verified primary identity and submitted ranking contract.

26. **Nescafé regression.** Passed recognised-brand, cappuccino exactness and restricted Strong evidence tests. No unsupported nutrition was added to that catalogue.

27. **Live-prefix regression.** Passed deterministic prefix/A–Z-before-seven tests for Ba/Ban/Bac and the existing ownership checks. Submitted Search and restaurant ranking were not globally alphabetised.

28. **My Foods regression.** Existing stable-ID removal, independent same-name removal, persistence, no protected-library resurrection and Undo tests passed. No persistence source code was edited or reopened.

29. **Legacy compatibility.** Existing saved-food tests passed, including `0.5 kg = 500 g = 615 Cal`, without promoting kg as an ordinary Diary choice. Physical-form safeguards and portion handoff tests also passed.

30. **Focused totals.** Hungry Jack's non-browser tests: 25/25. A broader affected search/resolver/serving run: 124/124. The separate shared regression run: 208/208 in 268405 ms, covering Australian catalogue foundation, KFC, McDonald's, post-KFC regressions, live prefixes, query ownership, My Foods, legacy compatibility, physical forms, restaurant families, canonical search identity and portion handoff. After the full run exposed a harness timing failure, the corrected rendered test passed 1/1 in 97427.0834 ms, exercising all 35 mobile scenarios. These runs overlap; their counts are not added as unique tests.

31. **Audit totals.** All 316 Hungry Jack's identities audited; all 225 loggable products reach confirmation with amount 2; 254 unknown nutrient checks; zero issues. The existing quick shared catalogue audit covered 1,212 canonical inputs (500 OFF samples plus all restaurant/supplemental/curated records), 20 brand checks and 40 selection consistency samples: zero critical violations, zero stale-preview identities, zero foreign-facing records and zero solid/liquid-measure exposures. All 73,300 protected OFF raw records retain their source hash; non-Hungry-Jack's supplemental raw records are identical.

32. **Existing performance check.** Passed all six existing limits. p95: generic Search 12.909 ms; large-catalogue Search 41.074 ms; KFC ranking 56.013 ms; progressive resolution 82.397 ms; portion profile 1.951 ms; character recognition 2.3 ms. Limits respectively: 250/250/250/250/100/20 ms. Used only `scripts/benchmark_search_session_repair.js`, with its existing workloads. These are measured local-machine results, not a guarantee for every device.

33. **Authorised additional full suite.** The user explicitly authorised exactly one additional complete run after the harness correction. It passed all 1,346 tests, with zero failures, cancellations, skips or todos, in 759021.6099 ms (12 min 39.022 sec). Command: `node --test --test-concurrency=1 tests/*.test.js`; started `2026-09-12T03:30:55.675Z`, ended `2026-09-12T03:43:34.857Z`. The previously failing Hungry Jack's rendered matrix passed in 96299.2327 ms, exercising all 35 scenarios across both phone sizes. The zero-failure gate is satisfied.

   The first full run remains recorded as 1,345 passed / 1 failed in 750733.8713 ms; it was not treated as sufficient. Its only failure was the new harness checking the Chicken burger row before asynchronous rendering completed. Only `scripts/audit_hungry_jacks_edge.js` changed executable logic afterward: it now waits for the exact row to be visible before the same identity/count/visibility assertions. This review document was also updated with results. SHA-256 comparison against the first run's 17-file snapshot proved no production/source-data drift before the additional run. All tested files remained unchanged during the additional run. Exactly one additional complete suite was executed; the original failure evidence and both run logs are retained.

34. **Local commit.** The release gate is satisfied for the single authorised local source commit on `alpha-0.6.33`, with message `Expand Hungry Jack's Australia catalogue`, directly after `d494ad66e5c0a87e6e0cb35d249985abed0d2153`. The external final recheck/commit receipt records the exact resulting SHA, avoiding a document attempting to contain its own commit hash. No amendment or cleanup commit is authorised.

35. **Working tree.** The commit contains the seven modified tracked files and eight new source/evidence/test/report files from this wave. Temporary capture/browser/log files stay outside the source tree. `git diff --check` passes. The external final receipt records the post-commit clean-tree verification and the single-commit parent/count check.

36. **No publishing.** No source push, TEST deployment, My Data push/deployment or other remote write was performed. No Woolworths or Coles wave began. Existing records for those sources are merely exercised by shared regressions.

37. **Protected TEST.** Initial and final read-only public HEAD/service-worker checks passed. SHA: `7115d9b5a81cc8ec55b798fa559143a844c312ad`; cache `healthy-eating-companion-test-alpha-0-6-33-v34`. No real TEST browser/PWA storage was opened or changed. The exact check time and deployed worker hash are recorded in the task's `protected-final.json` receipt.

38. **Protected My Data.** Initial and final read-only public HEAD/service-worker checks passed. SHA: `1ae32ecc210a6cbd7d7663a244eb0f2d132d3ba8`; cache `healthy-eating-companion-my-data-alpha-0-6-33-v3`. No real personal data or My Data browser/PWA storage was used. The exact check time and deployed worker hash are recorded in the task's `protected-final.json` receipt.

39. **Evidence backlog.** Seventy-seven matched product-page URLs support 65 current-menu identities; 106 other URLs remain documented unmatched coverage evidence, not an invented second catalogue. Future work can resolve exact naming/serving matches and café/frozen/promotional choices from stronger evidence. There are 35 material conflict-blocked identities, 36 Needs Nutrition Completion and 55 Details Only overall. PDF encoding/word-wrap presentation can improve, but uncertain glyph identities are already blocked. The remaining 251 identities have uncertain current availability; no retirement date is inferred merely from absence on a page. All old extraction evidence remains accessible. Standalone meals/customisations require an explicit supported configuration contract before logging.

40. **Next release step.** Stop after the single local commit for Mal/Myron source review. A guarded TEST deployment requires separate authorisation after acceptance, followed by physical founder checks. Keep My Data protected. Woolworths then Coles remain later catalogue priorities; neither begins in this task.

Task evidence directory: `C:\Users\mlwes\.codex\visualizations\2026\09\12\01a0935c-48a8-76a0-bcc2-fce9a01cf4c1\hj-wave`. It contains before/after inventory, identity mappings, captures, byte-replay results, focused/shared/full logs, audits, screenshots and the final commit receipt.
