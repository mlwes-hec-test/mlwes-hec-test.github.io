# Catalogue Expansion Round Two — source review

READY FOR MYRON REVIEW. This private founder/family build expands the approved supermarket and brand directories while retaining nutrition, identity and serving gates. Visible application version remains **0.6.33**. It is not a public-release clearance or a deployment.

## Authorised source and protected state

Only `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32` was edited. Two separate repository directories were discovered. Mal/Myron authorised only the correctly spelled **HEC Development** path. The separate **HEC Develpoment** copy was not modified, merged, deleted, copied to/from, repaired or reconfigured.

Canonical preflight passed: branch `alpha-0.6.33`, clean working tree, HEAD `705cc4536eedc52db6d81564b9d51fedb42876fa`, subject `Fix admitted brand catalogue browsing`. The same starting HEAD/branch were checked again before the one local commit. Receipts: `preflight.json` and `protected-deployments-final.json` in `data/catalogue-round-two`.

Independent read-only GitHub REST checks passed before development and again before commit: TEST v44 `574c307297261213ac9500afa2a50a67cc95d575`; My Data v11 `37b9f02ee029eb7fdec3ad6a0547dda58a86e5d7`. Neither deployment was changed.

## Coverage and counting

| Catalogue | Previous directory | Final directory | Added | Final ordinary loggable |
| --- | --- | --- | --- | --- |
| Woolworths | 43 | 923 | 880 | 903 |
| Coles | 23 | 860 | 837 | 860 |
| Aldi | 20 | 87 | 67 | 87 |

Woolworths previously had 43 visible entries but only 23 ordinary loggable foods. Its 880 additions bring ordinary loggable coverage to 903. The original 20 restricted/detail entries remain restricted; they are not new admissions. Coles and Aldi final directory totals are entirely ordinary loggable products.

| Priority brand / existing key | Previous | Final | Added |
| --- | --- | --- | --- |
| McCain | 6 | 108 | 102 |
| Kellogg's | 30 | 43 | 13 |
| Nescafe | 3 | 6 | 3 |
| Campbell’s | 3 | 10 | 7 |
| Arnotts | 48 | 66 | 18 |
| Cadbury | 44 | 95 | 51 |
| UNCLE TOBYS | 25 | 34 | 9 |
| Sanitarium | 20 | 23 | 3 |
| Bega | 22 | 29 | 7 |
| Birds Eye | 13 | 30 | 17 |
| John West | 14 | 26 | 12 |
| Barilla | 15 | 15 | 0 |
| Carman's | 30 | 54 | 24 |
| Chobani | 47 | 57 | 10 |
| Farmers Union | 23 | 28 | 5 |
| Dairy Farmers | 13 | 20 | 7 |
| Lindt | 23 | 35 | 12 |
| Mayver's | 18 | 22 | 4 |
| Sunrice | 17 | 26 | 9 |
| Jalna | 17 | 20 | 3 |
| Nestle | 12 | 31 | 19 |
| Nestlé | 22 | 40 | 18 |

These are existing canonical brand keys. Nestle/Nestlé remain separate source spellings under existing normalization; their counts must not be summed as a deduplicated brand total. Existing Kellogs remains separate from Kellogg’s. No new fuzzy spelling aliases were added. Barilla had no additional records that passed this audit; its accepted products remain available. Sanitarium increased from 20 to 23.

| Measure | Count |
| --- | --- |
| Brand-browse canonical products | 1922 → 7489 (+5567) |
| Brand directory identities | 342 → 2736 |
| Deduplicated ordinary approved browse set | 1957 → 7511 |
| Newly approved browsable/loggable canonical identities | 5554 |
| Existing canonical overlaps reused | 7440 |
| Genuinely new canonical identities | 48 |
| Final packaged canonical universe | 73393 |

The packaged universe includes the unchanged incomplete OFF records and excludes AFCD generic foods and restaurant chains. Most expansion products already existed in the frozen raw OFF universe; admission makes them available in approved brand/retailer browse. The 5,554 newly approved browse identities are not 5,554 new nutrition records. Retailer totals overlap and must not be summed. `summary.json` contains all 2,736 brand counts, source audit counts and retailer product inventories.

## Sources, admission and exclusions

Mal’s private-testing rule was applied: reliable Australian identity plus reliable nutrition permits inclusion. Public-release licensing clearance was **not** an admission gate. Newly admitted evidence retains `privateTestingApproved: true` and `publicReleaseReviewRequired: true`, source identity/URL, dates, hashes, brand, known GTIN, pack, serving and nutrition evidence. Missing values remain unknown/null/absent; they are never filled with zero. Source precedence and material-conflict blocking remain in force, with no averaging.

Sources were the protected Open Food Facts Australian snapshot, previously accepted official Australian retailer/manufacturer evidence, all 99 product pages found in the McCain Australia sitemap, and two official Aldi Australia pages used only to corroborate market/product identity. Ordinary Woolworths public browse access did not expose a usable nutrition catalogue; the attempted Coles browse page returned 404. No account, paywall, anti-bot bypass, logos, product artwork or marketing descriptions were imported. Public page requests were bounded and sequential.

Frozen OFF snapshot date: 2026-08-30. Raw input SHA-256: `f72687ee8bc6522054fe69dbfda6b91902c16af1ec2e043cde27bc6c29ad8176`. Audit/check date: 2026-09-18 (Australia/Brisbane); captures retain their individual UTC retrieval timestamps. The protected raw snapshot and runtime OFF shards were unchanged.

| Source candidate set | Found | GTIN present/valid | Reported serve | Missing nutrition hold | Conflict hold | Product-quality rejected |
| --- | --- | --- | --- | --- | --- | --- |
| Woolworths-associated OFF | 11256 | 11213 | 6176 | 8374 | 1627 | 9289 |
| Coles-associated OFF | 8887 | 8863 | 5246 | 6702 | 1223 | 7348 |
| Aldi-associated OFF | 1190 | 1161 | 692 | 1021 | 81 | 1077 |
| All AU-tagged OFF | 73300 | 72671 | 42423 | 62987 | 6300 | 65897 |
| McCain official pages | 99 | 20 | 99 | 3 | 6 | 11 |

“Found” means source candidates, not verified identities. Hold reason counts overlap. Product-quality rejection counts do not include every removed retailer association: a product can pass brand admission while its multi-market retailer claim lacks Australian corroboration. Final admitted retailer totals appear above. Of 73,300 OFF candidates, 7,403 passed the final product-quality audit; approved evidence has 7,488 unique canonical records after manufacturer replacement/overlap handling. Each brand’s separate found/GTIN/serve/quality-hold counts are in `summary.json`; every decision is retained in `audit.json`.

For retailer association, a multi-country store token alone is insufficient. Existing verified Australian evidence or an exact official Australian name/brand/pack match can establish market identity. This permits supported multi-market products rather than imposing Australia-only tagging as an absolute rule. Two such Aldi cases are Bramwells Crunchy Peanut Butter 500g and Hillcrest Almond Hazelnut & Vanilla Premium Nut Bars 175g. Official pages corroborate the Australian product; their GTINs and nutrition remain OFF-reported. Links, match basis and HTML hashes are in `market-corroboration.json`. House brands retain their true source brands.

A final audit detected 2,296 records held only by narrow category coverage. That unintended cap was removed: reliable ordinary foods can enter Other Packaged Food without invented generic concepts. Explicit unsupported-domain, identity, nutrition and serving gates remain. This added 2,174 safe brand products, with zero category-only holds remaining. The 122 remaining cases failed domain or Australian identity checks. The updated projections were rechecked before commit.

The final review held 26 new records with unresolved Australian product identity and two non-specific yoghurt identities. Ingredient/flavour mentions do not create unrelated food categories: cereal bars remain snacks; chicken dishes with yoghurt sauce remain meals; Cadbury milk chocolate is not milk. All 1,922 previously accepted brand identities remain admitted.

McCain: 99 official pages audited, 88 admitted pages, 11 held pages, including two duplicate pages. Six pages had an incompatible/conflicting evidence hold; three lacked sufficient nutrition (reasons overlap). Sixteen approved manufacturer records have a known GTIN linked through existing exact name/pack evidence. Missing GTINs are not invented: stable source-specific canonical identities are used and ordinary browse omits absent barcode text.

The protected McCain Hash Browns GTIN `9310174025084` remains one identity, alias `woolworths-au:98299`, with **75 g → 130 Cal / 543 kJ**. The conflicting new Hashbrowns 750g panel was held. The newly fetched page’s 722 kJ/100 g and 469 kJ/75 g values do not reconcile, so they did not overwrite the accepted record.

## Identity, search and serving checks

Canonical same-GTIN parity, complete brand directory membership, renderer admission, retailer evidence, unknown nutrients and natural measures passed focused checks. Exact brand browse uses the entire admitted canonical set, including manufacturer records without GTIN, and rejects unrelated raw fallback records. No catalogue-size admission cap was used. UI pages remain bounded at 20 products; all pages collectively contain the complete admitted set.

Bread, Milk, Cereal, Soup, Potato and Hash Brown keep concept-first behaviour. Big Mac exact ranking, Milk anti-pollution, new search opening blank, retailer/brand independence and cancellation of stale results remain covered by focused/broader checks. Guided Woolworths/Coles paths retain private-label scope. Aldi uses evidenced store membership without renaming house brands.

Source-supported grams, mL, manufacturer serves and natural count measures retain their conversion meaning. Pack size is not a consumption amount. Known solids cannot acquire liquid measures. A product goes through one amount selection and one final Review.

## Representative Reviews and responsive evidence

| Role | Canonical identifier / GTIN | Product | Amount | Calculated Cal / kJ |
| --- | --- | --- | --- | --- |
| Woolworths private label | 0220539730548 | Australian Beef Rump Roast Herb & Salt | 37 g | 70.746 / 296.000 |
| Coles private label | 0220539130935 | Australian Beef Rump Roast | 37 g | 70.855 / 298.960 |
| Aldi house brand | 26329253 | Prenium Nut Bars Almond Hazelnut & Vanilla | 37 g | 197.210 / 825.100 |
| McCain official frozen meal | 9310174003112 | Fettuccine Carbonara 375g | 1 serve | 596.021 / 2493.750 |
| Kelloggs cereal | 9310055106789 | Nutri-Grain | 37 g | 143.702 / 603.840 |
| Biscuit or cracker | 0026163001159 | Digestive original wheat biscuits | 37 g | 176.275 / 738.027 |
| Drink / liquid | 0074410741860 | Japanese Green Tea | 250 mL | 0.000 / 0.000 |
| Dairy yoghurt | 7374954103609 | Greek yogurt | 37 g | 31.912 / 132.992 |
| Canned soup | 0049319110857 | Udon Soup | 37 g | 73.104 / 305.867 |
| Countable food | 0059290576214 | Table Water Crackers Cracked Pepper | 2 piece | 26.667 / 111.573 |
| New neutral-category food | 0224203717477 | Ham Hock | 37 g | 86.210 / 360.703 |

The McCain example also covers frozen food. Gram, liquid and countable foods are represented. UI values are rounded to whole Cal/kJ and checked against the source-derived conversions above. Identity, brand, known GTIN, measure, blank amount entry, entered amount, energy and exactly one Review were asserted. Hillcrest is newly admitted to Aldi retailer browse; it already had brand admission.

All requested viewport checks passed: 390×844, 320×568 and 768×1024. Each covered retailer root, category list, All Items, exact brand, concept Brand Name, product selection and Review. There were 12 requested matrix Reviews plus one final-category Review, all with **zero Diary saves**. No horizontal overflow, page errors, console errors, required asset failures or live-network fallthrough were reported. Representative screenshots and complete route/console receipts are retained in `verification/`. The 320px Review and 390px retailer root were visually inspected; the 768px brand screenshot was inspected again after correcting absent-barcode display.

The three-viewport matrix preceded the absent-barcode label correction and the final data-only removal of category holds. The label received a targeted rendered check. Final generation then passed the smallest 320×568 viewport with all three updated retailer roots/totals, Other Packaged Food categories, All Items, McCain exact brand, concept Brand Name and a newly admitted Ham Hock Review. The layout code did not change, and the full matrix was not repeated. Earlier screenshots retain the earlier counts; final-prefixed screenshots show the completed catalogues.

## Tests and performance

The final expanded-data suite ran **204 tests: 203 passed and one stale Chiko loader wait failed**. Chiko preview, first-result identity and Review were inspected and correct; the test was updated to observe admitted-brand hydration after committed Search. All six tests in that file then passed, preserving every identity, ranking, conversion and Review assertion. All **204 final focused tests are covered by passing results**. Earlier checkpoints passed 183/183 and 23/23; these overlapping checkpoints are retained, not added to the final unique total. The two older retailer/Woolworths browser regressions also passed targeted reruns before the data-only category addition. Final category and directory parity checks cover the added data.

One broader FOOD/SEARCH campaign ran because shared runtime changed: **374/376 initially passed**. Two historical browser tests contained obsolete assumptions about old totals, collection types and restricted products appearing in admitted brand search. These fixtures were corrected without weakening identity or blocking checks; both final targeted tests passed. The full campaign was not repeated. Intermediate failed attempts are retained in the logs rather than counted as passes. No Weight/Progress or dedicated restaurant expansion/suite campaign ran.

Execution note: the initial broader legacy retailer harness exercised a synthetic Diary save inside its disposable context before hitting a stale fixture. It did not access personal records. The requested Round Two smoke and all subsequent targeted browser checks used no-save paths. This distinction is retained explicitly rather than claiming that every legacy test avoided synthetic saves.

Performance policy unchanged. Final-data cold generic observation: **224.8 ms ≤ 500 ms**. The first candidate passed one cold observation, one official 50-sample run and one independent 50-sample confirmation. The subsequent correctness audit removed the category-only admission cap. Those earlier results are retained as superseded evidence. The completed data was then measured once: one cold observation and 50 samples per operation, using the same already-confirmed runtime. No latency-driven retries, threshold changes or benchmark fishing occurred; zero warm-ups were used. Generic median ≤100 ms and p95 ≤300 ms; other p95 limits remain strictly <250 ms.

| Operation (50 samples) | Final median / p95 ms |
| --- | --- |
| freshFoodLibrary | 62.0 / 109.7 |
| blankNewSearch | 60.8 / 90.8 |
| genericShortlist | 48.2 / 84.5 |
| exactBrand | 31.0 / 43.8 |
| brandProduct | 76.6 / 118.1 |
| brandBrowse | 31.6 / 68.2 |
| brandCategory | 2.8 / 6.2 |
| conceptBrandName | 8.8 / 14.0 |
| retailerBrowse | 3.0 / 5.2 |
| allItems | 3.0 / 6.2 |

All final-data performance gates passed. The earlier independent same-runtime confirmation also passed, before the category-only data addition. Full individual samples, thresholds, extra concept flows, console records and the acceptance result are retained in `verification/performance-*.json`.

## Release, files and local commit

Deterministic release tooling generated **`e27083db31dbcd7031159618`**, version **0.6.33**. Final release coherence passed. Installation/storage identity, protected OFF data and restaurant catalogues were not modified. No source push, TEST deployment, My Data deployment or personal-data access occurred.

Runtime changes are confined to canonical brand admission for no-GTIN manufacturer products, evidenced retailer collections, concept membership and absent-barcode display. Data changes include four generated directories/shards and their complete admission/provenance audit. Builders, focused tests and historical browser fixture assumptions were updated. `changed-files.txt` is the exact inventory; generated evidence is under `data/catalogue-round-two`, and retailer-specific round-two reports sit alongside existing first-wave reports. Unreferenced intermediate Round Two shards were removed after checking their resolved canonical paths.

Rebuild the accepted outputs with `node scripts/build_woolworths_catalogue.js`, `node scripts/build_coles_catalogue.js`, `node scripts/build_aldi_catalogue.js`, `node scripts/build_brand_catalogue.js`, then `node scripts/build_release.js`. Admission inputs are hash-pinned by `policy.json`; `prepare_catalogue_round_two.js` and `finalize_catalogue_round_two.js` describe the full extraction/admission procedure. The existing large protected extraction is required only to redo the audit, not to regenerate the committed accepted catalogues. Run `node scripts/report_catalogue_round_two.js` for current coverage statistics.

Exactly one local source commit is authorised after all gates pass, with subject **Expand private-testing supermarket and brand catalogues**. The final handoff supplies its SHA and verifies a clean tree. This report is included in that commit, so its own commit hash is recorded externally in the handoff rather than self-referentially inside the commit.

## Remaining gaps and next source work

62,987 OFF records have a missing-nutrition hold; 61,282 specifically lack required macros. They remain outside normal approved browse. Other holds include incoherent energy, unsafe serving basis, unresolved product identity, conflicting same-GTIN evidence and uncorroborated Australian retailer association. The original restricted Woolworths records remain blocked. McCain Chicken Parmigiana 320g, Supreme Pizza Slices 600g and Peas and Carrots 2kg still need complete, coherent nutrition. Peas 500g needs an unambiguous GTIN link; other McCain conflicts are itemised in `audit.json`.

Recommended next catalogue work: retrieve current official Australian panels for Nescafé, Campbell’s, Kellogg’s and Barilla, and corroborate remaining multi-market Aldi identities using official Australian product evidence. Prioritise the held records with complete identity but missing macros, then reconcile conflicts against package panels. These are evidence gaps, not licensing exclusions. This round exhaustively audited the retained OFF Australian input and discovered McCain product sitemap; it does not claim exhaustive coverage of every Australian product page on the web. Restaurant expansion and deployment remain separate jobs.

**READY FOR MYRON REVIEW**
