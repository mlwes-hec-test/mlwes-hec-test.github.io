# Australian Catalogue Foundation Review

Latest continuation status: **ALL REQUIRED GATES PASS; ready for the one authorized local source commit.** Five interleaved candidate/parent comparisons proved a real character-recognition regression. A narrow source-metadata lookup removed unnecessary full-catalogue copying. The unchanged benchmark now passes at **p95 1.9 ms, required <20 ms**, with all other thresholds passing; **117/117 focused tests** and one fresh **1,262/1,262 full suite** pass. Exactly two production files changed intentionally; the other **38/40** recorded production/data files remain byte-identical. Existing protected-state and accumulated diff reviews pass. No responsive matrix or standalone broad audit was repeated. Section 32 records the complete performance closure; every earlier historical stop is preserved.

## 1. Preflight

Read-only preflight passed before editing on 2026-09-08.

- Repository resolves to `C:/Users/mlwes/OneDrive/Documents/HEC Development/Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32` through the workspace junction.
- Branch: `alpha-0.6.33`; HEAD: `63be3825efb277cda8633f964839825f24d08c63`.
- Parent: `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`; message: `Improve Australian-first shortlist ranking`.
- `git status --short` and `git diff --check`: empty; version 0.6.33; source cache v5.
- Public GitHub HEAD metadata verified TEST `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c` and My Data `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`. Neither deployed application nor My Data browser storage was opened.

## 2. Legacy patch audit

Read-only classification recorded before architectural edits. A = curated source data; B = shared architecture/data metadata; C = temporary compatibility; D = obsolete patch; E = test fixture; F = required investigation. The dispositions below have been implemented. Original line references identify the starting source, before removals shifted those lines.

| Path / mechanism | Purpose / finding | Class | Disposition / shared replacement |
|---|---|---|---|
| alpha06.js:2976-3007,3187,3413-3419 | Hungry Jack's legacy menu names, four nutrition overrides and preview + buttons | D | Remove production menu registry and name/nutrition bypass; existing source catalogue plus shared eligibility |
| alpha06.js:fc633StartExplicit; scripts/audit_food_concepts.js:coverage | Submitted restaurant source filters and broad audit enumerate actual records, excluding legacy menu strings | B | Retain reachability rule, route preview through it |
| alpha06.js:allFoods/ps33BrandFamily/s23ProductMatches; off-catalogue.js:search | Hydration cache exposed as incomplete preview universe; OFF already recognises 136 McCain and 6 MeadowLea rows | F | Replace brand-only preview universe with indexed whole-brand discovery |
| entity-registry.js:brand/restaurant aliases | Curated Australian names, punctuation aliases, bread-brand food-family metadata | B | Retain vocabulary; indexed brands supply generic brand-only identity |
| alpha06.js:Flora official records | Two sourced Australian manufacturer products with separate identities and 10 g serving | A | Retain facts, migrate into shared curated/supplemental metadata |
| food-catalogue.js:conservativeProductVariant | Chiko/Flora named fuzzy matching branches | D | Replace using reusable explicit alias/typo evidence |
| search-foundation.js:compoundPlan | Bread with Flora recognised via exact brand id | D | Use brand food-form metadata instead |
| alpha06.js:aussie-bunnings-snag and +500 ranking | Labelled generic sausage-in-bread estimate plus named ranking boost | A/D | Retain estimate provenance; remove name-specific ranking in favour of exact identity |
| guided-product-resolution.js:CUSTOMISATION_PROFILES | Big Mac capability map with no supported extra-component nutrition | B | Retain explicit capability metadata; unsupported extras remain blocked |
| serving-foundation.js:SPREAD_MEASURE_STANDARDS/addTrustedSpreadMeasures | AUSNUT 19 g tablespoon and inherited 5 g teaspoon; overly broad generalSpread fallback | B/F | Retain AUSNUT facts; tighten applicability/evidence and preserve accepted Flora path |
| product-serving-semantics.js; serving-foundation.js | Shared count, mass, liquid, spread/sliced profiles and physical-form firewall | B | Extend shared natural source-serving wording; preserve firewall |
| food-catalogue.js:canonicalKey/dedupe/partitionSearchRecords | Identity/signature dedupe, ignores supplied canonicalId; same-name source substitution loses provenance | F/D | Conservative canonical evidence model; retain variants and conflicts |
| food-catalogue.js:canLog | Historical nutrition-only API fallback for bare records without measures | C | Document compatibility; UI/addability use one explicit eligibility contract |
| search-foundation.js/ guided-product-resolution.js / alpha06.js:fc633 | Bread/Milk concept/source hierarchy and guided questions | B | Retain locked design, no guided flow redesign |
| kfc-au-/mcdonalds-au-catalogue*.js | Official source records, count/variant semantics; Wicked Wings family neutrality | A/B | Protected raw retained; integrate derived provenance |
| data/open-food-facts-au; afcd-release-3.json; AUSNUT standards | Raw named products and generated token/brand/category indexes; not product-flow patches | A/B | Protected payloads unchanged; add separate derived data |
| tests/*.test.js; tests/fixtures; scripts/audit_* | Named probes and synthetic records used in tests/audits only | E | Retain acceptance probes, add systematic samples |
| alpha06.js:ss633*, psSearch*, fc633*; food-catalogue.js query revisions | Several cache/session owners; query revisions already reject async writes, loadedFoods persists | B/F | Consolidate reset of transient intent, use indexed identity; cache data may persist without intent |
| alpha06.js:searchRank Chiko/potato scallop boosts | Additional named +500 ranking increments found during consolidation | D | Removed; retained sourced/labelled food records, aliases and shared exact ranking |
| alpha06.js:rc5ExactDecision/rc5SearchContext; food-catalogue.js:friesIntent | McDonald's fries and Quarter Pounder compatibility routing | C/B | Retained existing source/family compatibility while shared canonical selection governs identity; further compatibility cleanup is backlog, not a new named-food fix |
| alpha06.js:legacy Burger King redirect and sausage wizard | Australian brand substitution and older generic preparation UI | C/B | Retained existing vocabulary/compatibility; no new food-specific route |

## 3. Hungry Jack's root cause

Local Microsoft Edge 152.0.4191.66 reproduced the physical observation at 390×844. `s23RenderLive` reads `ALPHA0618_CHAIN_MENUS.hj.groups.Breakfast`, renders `Hash Brown` with a plus button and bypasses catalogue eligibility. `alpha0618ChainItem` has nutrition for only four other named items; Hash Brown returns null. The legacy menu does not create a stable source record. Submitted `fc633StartExplicit` filters `allFoods()` and performs no OFF lookup for recognized restaurants. The guided restaurant branch requires `foodSourceId` and verified status. The previous broad concept audit enumerates AFCD, OFF and registered food sources, so correctly found only McDonald's Hash Brown within that universe. It missed the separate preview-only menu universe.

The old menu-name table, four nutrition overrides, preview suggestions and click bypass are removed. The official public nutrition directory proved reproducibly usable, so the adapter captured all 18 linked nutrition PDFs. Those records enter the existing `HECFoodSources` registry. Preview, Search and the restaurant branch now see the same canonical record and eligibility decision. This is source-wide ingestion, not a Hash Brown insertion. Baseline Edge evidence used 81 locally fulfilled application requests and zero live fallthrough.

## 4. Canonical product model

`food-catalogue.js` extends the existing foundation with `canonicalProduct`, `sourceEvidence`, `sourceConflicts`, `canonicaliseRecords` and `productEligibility`. It carries stable source/GTIN identity, normalized brand and product names, family/category/form, AU relevance, current-state evidence, serving and household-measure evidence, nutrition completeness, pack size, source references and conflicts. Missing fields remain null/unknown. AFCD is composition evidence, not manufacturer proof.

Trust classes distinguish official AU manufacturer/restaurant, official AU retailer, verified AU package, OFF community, generic composition, user record, candidate and unknown. OFF and online records cannot promote themselves to manufacturer verification. Verification identifies source authority; it does not bypass an incomplete or conflicting record's logging restriction.

Exact GTIN/source identity is strong evidence. Without it, merging requires the same normalized brand/product/variant, exact pack and at least three compatible per-100 nutrient fields. Different GTINs and pack variants remain distinct. Similar names alone remain unresolved clusters. A chosen record retains merged source references and contradictory evidence. Internally consistent evidence precedes authority; higher authority or a defensible newer publication can resolve cross-source differences. Equal-trust unresolved material conflicts block logging. Values are never averaged.

One eligibility contract supplies preview, Search, guided selection and audits with loggable-now, needs-nutrition-completion or details-only status. An immutable result snapshot preserves contextual identity restrictions when selecting one row. The historical `canLog` nutrition-only compatibility fallback remains for old callers; current result affordances use the explicit contract.

## 5. Brand search

The generated directory indexes 12,239 existing AU catalogue brands. Exact brand identity triggers indexed brand discovery, six preview products and 20 submitted products per page, with More/First controls. Additional index batches are fetched only when needed. Products use normalized explicit brand membership and Australian-first completeness, source trust, naming and current-source evidence. A brand query has no inherited food residual.

Query revisions clear concept, source/preparation context, quantity, selected identity, submitted model and async ownership. Records may stay cached; intent cannot. Late old-query responses are rejected. Recognized generic concepts/facets and declared restaurant families take precedence over noisy community brand entries such as “White Bread” or “Wicked”. This priority is shared, including plural/count forms.

Canonical brand results are cached by record set; brand discovery uses the existing sharded index. Exact-preview canonicalisation runs only after matching the candidate subset. The full catalogue is not canonicalised on each character.

## 6. Australian catalogue expansion

Public sources were captured on **2026-09-08 UTC**. Each fact row retains URL, retrieved timestamp, capture SHA-256, source record reference, raw nutrient text and flags. PDF rows also retain page and published print date when available. Listed-at-retrieval means the source published the row then; it is not a guarantee of availability at every store.

| Source family | Type | Captured product pages / PDFs | New raw rows | Derived products | Builder loggable |
|---|---|---:|---:|---:|---:|
| [Goodman Fielder MeadowLea](https://www.gffoodservice.com.au/brand/meadowlea/) | Official AU manufacturer | 8 pages | 8 | 8 | 7 |
| [McCain potato range](https://www.mccain.com.au/products/categories/potato/) | Official AU manufacturer | 28 pages | 28 | 27 | 25 |
| [Hungry Jack's nutrition directory](https://www.hungryjacks.com.au/nutrition-info) | Official AU restaurant | 18 PDFs | 418 | 291 | 187 |
| Total | 3 source families / 3 consumer brands | 54 documents | 454 | 326 | 219 |

The 128 collapsed raw appearances are repeated official records, not 128 fabricated products. Of 326 derived products, 35 are manufacturer and 291 restaurant sourced; no retailer/candidate expansion is claimed. Two existing Flora products moved to curated data and are excluded from the new-product count. There are 98 supplemental canonical products with retained conflicts. “Builder loggable” is preliminary record readiness; runtime canonical eligibility also checks identity/context and conflicts. The inputs have 24 source-category/document buckets: one table-spread category, five McCain potato families and 18 restaurant PDF groups. PDF revision groups are not claimed as 18 distinct consumer food families. A further same-GTIN merge into the protected OFF universe makes the net new identities over that existing universe 325.

`scripts/ingest_australian_catalogues.py` provides bounded same-host directory discovery and source adapters. `--refresh` captures public pages; without it, replay requires the exact hash-checked capture manifest. Captures stay outside the repository. `scripts/build_australian_catalogue.js` deterministically builds the runtime file from committed extracted facts and existing indexes. Ordinary searching is fully local. Retrieval/parser gaps within the discovered pilot documents: zero. Coverage is limited to these directories; it is not all Australian products.

## 7. MeadowLea

Before: six indexed OFF rows; space-sensitive submitted matching exposed “Meadowlea Original Canola Butter” (`off:93236713`, 100 g source serve), “Meadow Lea” needing completion and “Beurre” details. Preview did not represent the full index.

After: **13 canonical loaded identities** (six OFF plus eight official, with one same-GTIN cross-source merge). The first six are Original Spread 2 x 3.5kg, Original Spread 500g, Original Table Spread 250g, Salt Reduced Spread 500g, Spread 12 x 1kg and Canola Portion Pack 10 g x 250. Their official records precede weak/foreign rows. The 250 g product's official 10 g serving supersedes the same-GTIN OFF 100 g serving; the disagreement remains recorded.

Consistent official table spreads expose manufacturer serve (typically 10 g), grams and the applicable AUSNUT 19 g tablespoon. New supplemental records do **not** receive the inherited 5 g teaspoon. Source conflicts remain blocked. Buttery 500 g and Salt Reduced 1 kg listed in the broader brand/retail range are coverage gaps outside this captured foodservice directory; retailer facts were investigated but not ingested.

## 8. McCain

Before: the full OFF index already held **136** records across potatoes, vegetables, pizzas, meals and snacks. Immediately after a Hash Brown search, preview showed only hydrated Hash Brown/Hash Browns rows. That was an incomplete preview universe, not genuine brand coverage.

After: **163 canonical loaded identities**, with six preview/20 submitted rows and pagination. The first six are Air Fryer Hash Browns 525g, Air Fryer Rustic Skin On 750g, Air Fryer Steak Cut 750g, Air Fryer Straight Cut 750g, Gluten Free Chips 750g and Pub Style Beer Batter Chunky Cut 750g. This includes 27 official potato-family identities; other ranges retain OFF evidence and are not relabelled official.

Exact “McCain hash brown” keeps `off:9310174025084` first, manufacturer serve 75 g and grams, **122 Cal / 510 kJ** for one serve, one final Review and Diary persistence. The separate official Hashbrowns 750g page publishes a 75 g serving but 469 kJ per serve against 722 kJ per 100 g; that inconsistency is quarantined, not used to overwrite the accepted result. Different GTINs, 75/80 g source records and pack variants are not merged just by name.

## 9. Flora

The two official Flora rows were legitimate curated facts embedded in runtime code; they now live in `data/australian-catalogue/curated-products.json` with the same IDs, nutrient values and checked date (2026-08-29). No new Flora-family retrieval is claimed. Brand-only Search has **32** loaded identities, with Flora Light and Flora ProActiv Light first.

Exact Flora ProActiv Light remains first and consistent in preview/Search. The existing shared table-spread profile supplies teaspoon 5 g, AUSNUT tablespoon 19 g, manufacturer serve 10 g and grams. Two teaspoons still equal **10 g, 37 Cal / 154 kJ**, followed by one final Review and Diary entry. The named fuzzy-match branch was replaced by constrained declared-alias matching; compound-food recognition now uses brand food-form metadata. Thin/thick conversions remain absent.

## 10. Hungry Jack's Hash Brown

The official source supports **`food-source:hungry-jacks-au:hash-brown`**, a **58 g** menu serving with **685 kJ / 164 Cal** displayed. Preview and submitted Search reach this same verified/loggable identity. Hash Brown → Restaurant / Ready-to-Eat now reaches both eligible McDonald's and Hungry Jack's records. No online lookup or menu-name-only promise is needed.

## 11. Duplication / source quality

- McCain: strong exact 75 g record preserved; differing GTIN/pack/nutrition variants stay distinct. Conflicting official serving data remains visible as completion evidence.
- Birds eye / Birds Eye: normalized brand headings combine case/spacing variants, while products retain their own identities.
- Flora: official exact product precedes community/candidate copies. Unproven name-only copies remain distinct and weak contextual identity remains restricted after selection.
- Meadow Lea: spacing normalizes; the proven GTIN merge keeps both source references, chooses consistent official 10 g evidence and demotes Beurre below useful AU products.
- Broader duplicate clusters are selected deterministically by hash, not handpicked food names. Final counts are recorded in section 14. The tool checks every merged cluster for different-GTIN violations and samples up to 50 merged plus 50 unresolved name clusters for review. This run had two retained merged-evidence clusters and sampled both, plus 50 of 4,525 unresolved name clusters. Unresolved name clusters can contain legitimate variants and are not claimed as proven duplicates.

## 12. Serving profile

The existing central physical-form/serving foundation remains authoritative for liquids, sliced foods, frozen/countable products, restaurant items, spreads and mass references. New source records declare food form/profile only where source/category evidence supports it. Impossible source servings are quarantined; raw evidence remains available. Missing nutrients and qualified values such as “<0.1 g” remain null with raw text retained.

The **19 g tablespoon** comes from the already protected [FSANZ AUSNUT 2023 Food measures](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/food-measures) table-spread/margarine entries (15 applicable food keys; source references and measure IDs remain in `SPREAD_MEASURE_STANDARDS`). This is a documented generic table-spread measure, not a Flora density copied by name. No AUSNUT payload or constants changed.

The **5 g teaspoon** was an existing reviewed HEC margarine/table-spread convention, not newly established manufacturer evidence. It is preserved for the accepted Flora path, removed from otherwise-unclassified spreads and withheld from new supplemental spreads through `source-and-published-standard-only`. MeadowLea's new official records therefore have no teaspoon until better evidence exists. No thin/thick spread or mass-to-volume density was invented.

Search rows label source serving as “Source reference” so it is not mistaken for consumed quantity. Official and calculated kJ use whole-number display rounding; stored/source precision is retained.

## 13. Targeted tests

Targeted verification preceded the expensive final gates. Counts below are separate runs with overlap, not additive totals:

- 631 affected unit/integration tests passed after shared contract/harness updates.
- Latest contract set: 88 passed (20 new foundation, 18 catalogue recovery, 50 guided resolution).
- Restaurant family suite: 13 passed, including 20 genuine Edge cases for unsized/count/Diary behavior.
- Established rendered food-concept test passed its 27 scenarios after noisy indexed-brand precedence was corrected.
- New targeted Edge audit passed 320×568, 390×844 and 430×932: eight brands, ten identity consistency probes and three Review/Diary flows per viewport; 265 local requests per viewport, zero live fallthrough. The latest 390×844 repeat also passed after contextual selection restrictions were tightened.

Tests cover conservative identity, provenance, conflicts, verification/addability, candidate restrictions, unknown fields, brand normalization, query/async reset, Australian-first ordering, shared menu-family precedence and measure evidence. Changed old fixtures now provide explicit canonical links or reviewed measure evidence; they no longer assert unsafe name-only merges or invented spoon defaults. Benchmark thresholds were not weakened.

## 14. First final-gate attempt (historical)

**Historical outcome: NOT READY.** The first complete suite was run once after targeted checks stabilized:

`node --test --test-concurrency=1 tests/*.test.js`

Result: **1,175 tests; 1,166 passed; 9 failed; 0 skipped/cancelled/todo; 447,603.2639 ms**. This activated the user's stop condition. No success commit or second full-suite attempt was made in that run. The user subsequently authorized the continuation recorded in section 18.

| Failing tests | Observed cause | Required follow-up |
|---|---|---|
| `tests/post-deployment-iphone-integration.test.js:211`, U05 | Static regex requires the previous literal `getFood(control.dataset.universalResult)` spelling. Selection now prefers the canonical result snapshot and uses a `recordId` local for the preserved fallback. | Replace the brittle call-spelling assertion with meaningful snapshot/loaded-record selection coverage. |
| `tests/progressive-portion-choice-polish.test.js`, P08, P20, P21, P22, P27, P29, P30 | The `Untested Seed Spread` fixture supplies no validated teaspoon or table-spread evidence. The tightened profile correctly withholds a borrowed teaspoon; seven old measure/label/amount assertions still assume it. | Keep an unproven-spread negative fixture; use a separately evidenced measure fixture for label/amount tests. Do not restore an invented conversion to satisfy these assertions. |
| `tests/stage9-release-integration.test.js:53`, test 5 | Fixed loader count expects 30 runtime files; the separate catalogue asset makes 31. | Validate inclusion, dependency order and versioned asset loading with the new asset. |

These diagnoses explained the first-run failures; they did not waive the zero-failure gate. No assertions were edited after that first suite in that run. The implementation was left uncommitted for the separately authorized continuation in section 18.

| Required final gate | Result at stop |
|---|---|
| A. Complete canonical suite | **FAIL: 1,166/1,175**, as above |
| B. Full catalogue foundation audit | **PASS**, 73,965 inputs / 73,964 canonical identities; zero defined critical violations; details below |
| C. Standalone full concept audit | Not started after stop; the established rendered 27-scenario concept test passed within the complete suite |
| D. Standalone 73,300-row physical audit + 450 samples | Not started after stop; no full-physical acceptance claim |
| Existing generalisation tests | Within the complete suite: 200-product mixed-form audit safe 200/200; 20 unmentioned foods safe 20/20; 100-shard deterministic sample safe 100/100; 50 AFCD concept and 100 brand-inheritance checks passed |
| E. Protected KFC/source integrity | **PASS**: 144 rows, 126 unique/runtime products, 18 duplicate appearances, 12 categories; exact normalized SHA in section 15 |
| F/G. Final rendered consistency / brand audits | Not started as final gates after stop; targeted three-viewport evidence is described in section 13 |
| H. Full deduplication/source-quality audit | **PASS** within B, zero defined critical violations; unresolved evidence remains restricted |
| I. Seven-viewport Edge matrix | Not started after stop; targeted 320/390/430 checks do not substitute for this gate |
| J. Final search benchmarks | Not started after stop; the existing 500-profile portion benchmark assertion passed under its unchanged p95 <100 ms threshold in the complete suite |

The full foundation audit was already running when the complete suite failed and was allowed to finish. It covers all 73,300 OFF inputs, 211 existing McDonald's identities, 126 KFC identities, 326 supplemental products and two migrated Flora products. It reports:

- 73,964 canonical identities; 12,190 normalized non-empty brands; 66,388 derived family/name keys. These broad keys include product-name fallbacks and are not a curated category count. AFCD generic composition and private/recipe data are outside this branded/restaurant universe; AFCD payload integrity is separately checked.
- 665 official identities (37 manufacturer, 628 restaurant), zero retailer additions, zero live online candidates in this offline input; 73,299 remaining OFF community identities. This does not claim that ordinary online discovery was removed.
- 10,410 loggable-now, 62,987 needs-nutrition-completion and 567 details-only under the shared contract. Source verification is separate from nutrition completeness.
- 245 canonical products with source conflicts; 236 with unresolved material conflicts; zero unresolved-conflict records permitted to log. All conflicts remain in evidence metadata.
- One cross-source identity collapse at this final union stage, in addition to the builder's 128 collapsed raw appearances; two retained merged-evidence clusters; 4,525 unresolved name clusters; zero different-GTIN merge violations.
- 73,303 records with a barcode field. This is field-presence coverage, not checksum-validated GTIN coverage; the separately protected raw OFF valid-GTIN count remains 72,671.
- 49 foreign-facing rows identified for Australian-first demotion, retained for exact intent; zero known solid/countable records exposing mL/L/cup; no legacy preview-menu identities; zero defined critical violations.
- 40 deterministically sampled identities agree across model/selection eligibility. Twenty brand audits pass: McCain 163, Meadow Lea 13, Flora 32, Tip Top 44, Norco 55, plus 15 automatically selected brands (In A Biskit, SlimBiome, Hamper, Family Farm, Vital Proteins, Monetta, Laurent, Amoy, The Gourmet Sausage Company, Mamia, J-Basket, M&S, Lakanto, Searoy and Auvitis Count). Model audits do not replace the unrun final rendered matrix.

Evidence files are outside the repository: `%TEMP%/hec-au-foundation-final-suite.tap`, `%TEMP%/hec-au-foundation-final-catalogue.json`, `%TEMP%/hec-au-foundation-final-kfc.json`, `%TEMP%/hec-au-stable-edge/report.json`, `%TEMP%/hec-au-targeted-three/report.json`. No browser/capture evidence is tracked.

## 15. Protected state

Final read-only public repository verification at 2026-09-08 09:00 UTC matches preflight: TEST `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, My Data `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`. All browser checks use disposable local virtual TEST-origin routing with service workers blocked. No live application storage was opened or written.

Protected OFF: 2026-08-30 snapshot, 73,300 imported, 70,832 searchable, 12,239 brands, 72,671 valid GTINs; source SHA-256 `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`. No protected OFF files changed.

Final file hashes match preflight: AFCD `d729c6ea5bf1014724bde5d4038e995cd79059824cebab9f32b52ed4671560dd`; KFC raw JS `473e071cf68b18fd75481ea4def01166ee7b1237eecc0e56fa5a408e79305201`; McDonald's raw JS `8390eac90e11a94ecf436412dbe6cea328ab4e40844a43d9e2c0c1beebf70c50`. AUSNUT-derived source constants and payloads are unchanged. KFC normalized SHA-256 is exactly `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2`, matching the required protected value.

Source version remains **0.6.33**, source cache **v5**. The service-worker diff only adds the new local source asset to `CORE_FILES`; cache identity and installation/deployment configuration are unchanged. No TEST/My Data deployment files, screenshots, HTML/PDF captures, temporary cache or browser evidence are included in the source change.

## 16. Commit

**All required gates pass for the one authorized local source commit**, message `Build Australian catalogue foundation`, parent `63be3825efb277cda8633f964839825f24d08c63`, branch `alpha-0.6.33`. Section 32 records the proven regression, narrow correction, passing unchanged benchmark and fresh full suite. This report describes the reviewed commit input; the resulting commit SHA and clean-tree verification are reported after commit creation. No push, deployment, source refresh or My Data application/storage access is part of this closure.

Accumulated tree: **29 modified tracked files (576 insertions / 213 deletions) and 21 new files: 50 files total** before staging. Tracked-only statistics exclude all new-file contents; complete commit totals are reported from Git after creation. This performance continuation changes only two production files, one existing test file and this report. Disposable comparison copies, drivers and evidence remain under TEMP. The preceding Stage 8A checkpoint and semantic audit corrections remain intact.

## 17. Remaining catalogue backlog

- No remaining foundation acceptance blocker. Section 32 resolves the demonstrated performance regression with a narrow shared metadata lookup; the unchanged strict threshold now passes at **p95 1.9 ms**. General performance tuning remains optional bounded backlog, with no threshold waiver or new acceptance category.
- Architecture: remaining legacy McDonald's/source compatibility wrappers can be consolidated later; they are documented and covered by regression checks. Broad brand lists use products/pagination; richer category navigation is optional future work. Bread/Milk downstream design remains outside this task.
- Source/data coverage: MeadowLea retail variants beyond the foodservice directory; McCain non-potato official ranges; fresh Flora-family capture; other Australian manufacturers and retailers. The current expansion proves three adapters and does not claim full national coverage.
- Evidence: unresolved official serving/nutrition discrepancies; some PDF text encoding or missing menu-serving fields; pack-level EAN/TUN distinctions; store availability; qualified/missing nutrients; defensible teaspoons for newly ingested spreads. Conflicted records remain restricted.
- Future adapters: retailer-labelled Woolworths/Coles/house-brand sources where reproducible and permitted, broader manufacturer directories, and refreshed restaurant sources with explicit revision/date evidence. These must remain separate from protected snapshots and retain the same eligibility/conflict contract.

## 18. Continuation and final acceptance

### Continuation preflight

The repository junction still resolves to the authoritative `HEC Development` source directory. Branch `alpha-0.6.33`, committed HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, message `Improve Australian-first shortlist ranking`, version 0.6.33 and source cache v5 all match. The expected dirty foundation tree contains the same 21 modified files and ten new files; `git diff --check` passed. All required preflight commands were recorded. Nothing was reset, discarded, stashed or reconstructed. No external source was refreshed or re-ingested.

### Verified diagnoses and reconciliation

The saved first-suite log and current source confirmed all nine diagnoses before editing. No production regression was found in these three assertion areas. Only tests and this report change during reconciliation; hashes captured at continuation preflight cover the existing production modules and generated/factual catalogue assets.

| Area | Exact reconciliation |
|---|---|
| U05 | Executes the actual production selection handler with boundary doubles, then passes its selected record through the real guided engine. A frozen canonical snapshot beats a same-ID stale loaded record; ID, canonical ID and nutrition reach the ordinary guide. |
| U06-U08, new coverage | Current preview snapshot beats stale submitted/loaded copies; missing matching snapshots use either loaded-record fallback; stale preview and unrelated IDs cannot displace the requested current identity; an absent ID starts no logging flow. |
| P08 | Keeps `Untested Seed Spread` unchanged as a negative fixture: grams/manufacturer serve remain, no invented teaspoon or tablespoon. |
| P08b, new coverage | A separate generic synthetic fixture supplies an explicit 5 g teaspoon through `unitOrigins` reviewed-measure evidence, scoped to that fixture; no general table-spread profile or borrowed tablespoon. |
| P20/P21/P22 | Existing singular/plural/fractional labels retain the exact expected wording, now tested with the separately evidenced fixture. |
| P27/P29/P30 | The evidenced fixture exercises measure-before-amount, confirmation, identity/measure preservation, 2.5 g consumed mass and 2.5 Cal scaling. P31 also uses it so edit-measure genuinely starts from a selected measure. |
| Stage 9 test 5 | Removes the magic runtime count. Checks every required existing asset plus the Australian catalogue asset, uniqueness, file existence, versioned worker coverage and dependency order. Existing cache-busting, ordering and release checks remain. |

### Focused verification and production safety

All focused tests passed with zero skipped/failed: post-deployment iPhone integration **29/29** (484.4347 ms); progressive portion choice **47/47** (129,632.4578 ms); Stage 9 release integration **23/23** (253.8381 ms); related foundation/guided/serving/selection set **135/135** (2,768.916 ms). Total **234/234**, across non-overlapping files in this focused cycle.

The focused files are `post-deployment-iphone-integration`, `progressive-portion-choice-polish`, `stage9-release-integration`, `australian-catalogue-foundation`, `guided-product-resolution-repair`, `universal-food-search-source-branching` and `physical-iphone-search-serving-corrections` under `tests/`.

Pre-suite safety checks passed: the old Hungry Jack's menu/preview bypass and named ranking boosts remain absent; unvalidated spreads receive no borrowed teaspoon; Flora retains tsp 5 g / tbsp 19 g / serve 10 g / grams; all eight MeadowLea supplemental records retain the evidence policy and no teaspoon; brand-only intent resets source/concept context; the actual snapshot/fallback selection handler passes; all required versioned loader/worker assets remain present in dependency order. Production and factual/generated catalogue hashes match continuation preflight. No production serving/search change or external refresh was needed.

### Newly authorized complete suite

`node --test --test-concurrency=1 tests/*.test.js` ran once in this continuation and **passed: 1,179 total / 1,179 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, duration **430,873.7717 ms**. The four additional tests are the three selection cases and the positive evidenced-spoon case. Evidence: `%TEMP%/hec-au-continuation-full-suite.tap`.

Only after that zero-failure result, the full concept, physical-form and catalogue audits were started.

### Final full data/model gates

| Gate | Continuation result |
|---|---|
| Full food-concept audit | **PASS**: 73,300 products, 17 concept coverage keys, 201 exact-versus-variant probes, zero violations; 37,450.7802 ms. |
| Full physical-form audit | **PASS**: 73,300 products and all 450 distinct established samples (200 solid/countable, 100 liquid, 50 spread, 50 sliced/countable, 50 unknown/incomplete); zero classification or measure issues; 158,639.9626 ms. |
| Physical-form firewall | 16,748 solid/countable records; zero inappropriate mL, L or cup exposure. 160 volume measures quarantined; 1,672 records safely downgraded; zero basis conflicts or records with no valid measure. 5,691 liquids retain volume and 934 spreads retain supported household measures. |
| Full catalogue foundation | **PASS**, full mode: 73,965 inputs / 73,964 canonical identities; zero defined critical violations and zero stale preview identities. All detailed counts in section 14 were reproduced unchanged. |
| Canonical consistency and brand generalisation | 40 automatically sampled identities agree across model/selection eligibility. All 20 brand queries pass, including McCain 163, Meadow Lea 13, Flora 32, Tip Top 44, Norco 55 and the 15 automatic brands listed in section 14. Rendered gates are recorded separately below. |
| Deduplication and source quality | Zero different-GTIN unsafe merges; one union-stage duplicate collapse, two retained merged-evidence clusters and 4,525 unresolved name clusters, with both merged clusters and 50 unresolved clusters sampled. All 236 unresolved material-conflict records remain restricted. The 49 foreign-facing records remain available for exact intent and demoted under Australian-first ranking. |
| Protected KFC and raw sources | **PASS**: KFC 144 rows / 126 unique and runtime identities / 18 duplicate appearances / 12 categories; normalized SHA matches section 15. OFF 73,300 imported / 70,832 searchable / 12,239 brands / 72,671 valid GTINs and protected SHA unchanged. Production, generated/factual, AFCD, KFC and McDonald's file hashes match continuation preflight. |

Read-only public repository HEAD verification at **2026-09-08 09:58 UTC** again matches protected TEST `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c` and My Data `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`. Source version/cache remain 0.6.33/v5; TEST remains v25. No external catalogue source was refreshed.

Evidence is outside the repository under `%TEMP%/hec-au-continuation-final-`: `concepts.json`, `physical.json`, `catalogue.json`, `kfc.json` and `protected-remotes.json`.

### Seven-viewport Edge stop and remaining gates

The unchanged established command was run without `--quick`, custom viewports, timeout changes or threshold changes:

`node scripts/audit_physical_form_responsive.js "%TEMP%/hec-au-continuation-final-physical.json" "%TEMP%/hec-au-continuation-final-responsive"`

The established matrix remains 320x568, 375x667, 390x844, 430x932, 834x1194, 390x520 and 1194x834. Genuine Microsoft Edge **152.0.4191.66** returned **exit 1 / pass false** at the first viewport, **320x568**, on scenario 4, **Unrelated frozen solid**:

`locator.waitFor: Timeout 30000ms exceeded; waiting for [data-universal-result="off:9339423004229"] to be visible.`

The stack points to `selectCatalogueProduct` in `scripts/audit_physical_form_measures_edge.js:17`, called by `product` in `scripts/audit_physical_form_responsive.js:10` and the existing matrix runner at line 18. The control selected by the full physical audit is Abbott's Bakery **HARVEST SEEDS & GRAINS**, source serving **2 slices (84 g)**, sliced form, complete nutrition, valid `slice` / `serve` / `g` measures. The helper's preceding wait for `HECOpenFoodFactsAU.getLoaded(id)` had completed, but the subsequent submitted result was absent. The failure screenshot shows the message that the item is not currently in HEC's verified catalogue. This is a submitted-product reachability blocker; the saved evidence does not establish whether the underlying cause is production matching, timing or an audit assumption. No source or audit patch, retry or substitute control was made after the failure.

Before the failure, all five search-accessibility interactions and three matrix scenarios passed: Real McCain Hash Browns; Generic Hash Brown packaged route (including all four source branches and packaged exact-product selection); Incomplete product completion actions. The Restaurant / Ready-to-Eat branch visibly includes Hungry Jack's Hash Brown with its 58 g source serving and loggable status. **No viewport completed all 16 scenarios.** The remaining six viewports were not started.

Routing evidence at the failure: **164 same-origin requests / 164 local fulfillments / 0 live TEST fallthrough**, zero page errors and zero failed local assets. The two attempted external OFF queries were aborted by the established route; the corresponding blocked-request console entries are expected isolation evidence. No external source data was fetched or refreshed.

| Remaining gate | Final status |
|---|---|
| Existing seven-viewport genuine Edge matrix | **FAIL**, exact failure above; not retried or altered. |
| Final rendered preview/submitted/source/exact consistency | **Not run after stop**. Model consistency and earlier targeted evidence remain valid within their stated scope; they do not satisfy this final rendered gate. |
| Final rendered brand search and fresh-query generalisation | **Not run after stop**. The full model audit's 20 brands passed; the final dedicated rendered audit remains outstanding. |
| Established search/selection/portion benchmarks | **Not run after stop**. No threshold was weakened and no final performance pass is claimed. |
| Local source commit | **Not authorized by the gate results; not created.** All work retained uncommitted. |

Saved failure evidence: `%TEMP%/hec-au-continuation-final-responsive.log`, `%TEMP%/hec-au-continuation-final-responsive/responsive.json` and `%TEMP%/hec-au-continuation-final-responsive/failure.png`.

### Key product outcomes and evidence limits

The generated facts, focused checks and full model/suite results retain Hungry Jack's canonical `food-source:hungry-jacks-au:hash-brown` at **58 g / 685 kJ / 164 Cal**, McCain's accepted `off:9310174025084` at **75 g / 122 Cal / 510 kJ**, and Flora ProActiv Light's **5 g teaspoon / 19 g tablespoon / 10 g manufacturer serve / grams**, with **2 teaspoons = 10 g / 37 Cal / 154 kJ** and no thin/thick. Brand totals remain **McCain 163 / Meadow Lea 13 / Flora 32**. MeadowLea uses the broader Australian-first family and its eight supplemental records receive no invented teaspoon. Big Mac Standard/Extras and one-Review behavior, KFC neutral 3/6/10 family behavior, and Bread/Milk base hierarchy passed their applicable suite coverage. The final comprehensive rendered confirmations remain incomplete because of the matrix failure; no readiness claim is made from these retained outcomes alone.

Final repository checks confirm the unchanged HEAD/parent/branch, version **0.6.33**, source cache **v5**, protected file hashes, an empty staging area and a clean whitespace check. The dirty 34-file foundation job is preserved for follow-up. No reset, discard, source refresh, push, deployment or My Data modification occurred.

## 19. Abbott's reachability continuation and targeted-probe stop

### Preflight and reproduction before production edits

The latest continuation verified the authoritative repository junction, branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, version 0.6.33 and source cache v5. The existing 24 tracked modifications and ten new foundation files were present; whitespace was clean and all 13 previously recorded production/data hashes matched. Nothing was reset or staged. No external catalogue source was refreshed.

A temporary diagnostic driver ran the existing 320x568 matrix through its first three scenarios and intercepted the failing fourth probe without editing production or established audit code. It reproduced the original 30-second missing-result timeout. Exact input: **HARVEST SEEDS & GRAINS**, deliberately submitted by **Enter**. This was product-specific intent, not a brand-only query. The record was absent before typing and appeared through asynchronous OFF hydration before Enter; cache presence did not determine eligibility.

| Query / state | Intent / canonical brand and product | ID / eligibility / trust | Rank / page / rendered | Inclusion or exclusion reason |
|---|---|---|---|---|
| HARVEST SEEDS & GRAINS, before repair | Runtime exact-product intent; catalogue prefix inference incorrectly chooses brand Harvest. Actual product: Abbott's Bakery / Harvest Seeds & Grains. | `off:9339423004229`; canonical `barcode:9339423004229`; loggable-now, preview/search eligible, no conflicts; OFF community, AU, trust rank 4, not officially verified. | Exact-name score 1,635; no submitted position/page; zero rows and no More control. | `explicitIdentityMatch` rejects brand membership before considering that the whole query equals the complete product name. |
| Abbott's Bakery HARVEST SEEDS & GRAINS, before repair | Correct brand on raw query, but `fc633StartExplicit` reinterprets singularized `abbott bakery harvest seed and grain` as brand Abbott. | Same loaded, eligible record. | Raw query exact-name score 1,635; zero rendered rows. | Concept normalization changes the brand identity before catalogue matching; actual Abbott's Bakery record fails Abbott membership. |
| Abbott's Bakery, before repair | Whole-brand intent; 18 canonical identities. | Same target, same eligibility. | **Page 1, position 4**; rendered and selectable; all 18 fit the 20-result bound. | Correct normalized brand membership and existing Australian-first ordering. No More control needed. |
| Abbott's, before repair | Separate indexed brand; two canonical identities. | Target is not a member of this distinct brand key. | One page with two rows; target absent. | Separate raw brand evidence is preserved; no unproven alias/brand merge is introduced. |

Preview for the failed product-only query showed “Product Matches”, “Brand/source recognised” and further-search guidance, with no actionable target. Submitted Search showed the unavailable-catalogue message. The previous query was Hash Brown, revision 9; submission advanced to revision 10 with raw product query, exact-product intent, empty universal source/context, no source commitment and no guided commitment. There was no stale Hash Brown intent. Filtering occurred before submitted-model page slicing; pagination, physical measures, source quality and nutrition eligibility were not the cause.

### Exact first brand page before repair

Abbott's Bakery, in order (all 18, one page):

| Position | Product | Record ID |
|---|---|---|
| 1 | Country Grains | off:9339423007978 |
| 2 | Dark Rye | off:9339423008579 |
| 3 | Farmhouse Wholemeal | off:9339423003482 |
| 4 | Harvest Seeds & Grains | off:9339423004229 |
| 5 | Sourdough White English Muffin | off:9339423010046 |
| 6 | White Sourdough | off:9339423009668 |
| 7 | Abbott's Bakery Loaf | off:9339423009903 |
| 8 | Farmhouse Wholemeal | off:5339403442731 |
| 9 | Gluten free bread mixed seeds | off:9339423007046 |
| 10 | Gluten free bread whole meal | off:9339423008807 |
| 11 | Gluten Free Rustic White Bread | off:9339423007039 |
| 12 | Gluten Free Sourdough - Grain & Seeds | off:9339423009064 |
| 13 | Gluten free soy & linseed | off:9339423007053 |
| 14 | High Protein Soy, Chickpea & Quinoa | off:9339423009910 |
| 15 | Light Rye | off:9339423003499 |
| 16 | Rustic White | off:9339423007961 |
| 17 | Sourdough English Muffins Rye | off:9339423010053 |
| 18 | Sourdough grains and seeds | off:9339423008852 |

The separate Abbott's first page is: (1) Abbott's Village Bakery Grainy Wholemeal, `off:9339423004212`; (2) Bread Lght RYE, `off:2108091602504`. Combined diagnostic coverage is 20 distinct records across those two brand keys, without merging them.

### Verdict and shared correction

**Case B: genuine production reachability defects.** The existing audit's product-specific query was valid; the target was eligible, and was not waiting on another page.

- `food-catalogue.js`: a complete normalized product name can survive a mismatching *inferred indexed-brand prefix*. Partial names, aliases, brand-only searches and explicit qualifiers remain brand-scoped. Retired/legacy filters and eligibility checks remain. No ranking score or source ordering changes.
- `alpha06.js`: explicit catalogue lookup now uses the quantity parser's identity text before the singularized concept identity, preserving possessive/plural brand spelling while removing consumed quantity.
- `tests/product-name-reachability.test.js`: four tests use synthetic Cedar/Morning/Miller's brands to cover full-name collisions, negative partial/alias/qualifier cases, retained eligibility restrictions, and the actual runtime explicit handler receiving asynchronously loaded records with the correct quantity-stripped brand spelling.

No Abbott's/Harvest-specific production branch, artificial rank, cache-based eligibility promotion, timeout increase, retry or pagination change was added. The established seven-viewport audit and helper were not edited. Generated catalogue and factual source bytes remain unchanged.

### Targeted verification and latest stop

The **first verification after the correction** reran only the original failed query/record at **320x568**, using the existing `selectCatalogueProduct` helper and unchanged timeout. **PASS**: the formerly absent row is now visible and selects Harvest Seeds & Grains into serving-measure choice, exposing only `slice`, `serve`, `g`, without horizontal overflow. Exact submitted order beyond the selected target was not retained by that helper; no complete after-order claim is made.

Focused automated tests: **109 total / 109 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **2,611.8431 ms** across `product-name-reachability`, `australian-catalogue-foundation`, `guided-product-resolution-repair` and `universal-food-search-source-branching`.

A new dedicated reachability probe, `scripts/audit_product_name_reachability_edge.js`, was then run at **390x844**. It successfully waited for the target submitted row and passed `selected.food.id === 'off:9339423004229'`. It then **FAILED** at line 15 because the new audit asserted `selected.food.canonicalId === 'barcode:9339423004229'`; the raw property was **undefined**. This was an incorrect assumption introduced by this continuation's probe. The guided contract derives identity through `canonicalProductKey(food)` / `HECFoodCatalogue.canonicalKey(food)` and records it in `exactNutritionalIdentity`; it does not require every raw `exactProduct` to carry an explicit `canonicalId` property. This failure is distinct from the original missing-row defect. The assertion was not removed, patched or rerun after the targeted-Edge stop condition activated.

Both targeted browser runs used genuine Edge **152.0.4191.66**, with **58/58 same-origin requests fulfilled locally**, **zero live TEST fallthrough**, zero page errors and zero failed local assets. The failed probe stopped before its remaining brand-qualified/pagination checks. **430x932 was not run.** Full after-repair brand ordering and complete phone coverage remain unverified.

| Required next gate | Status at latest stop |
|---|---|
| Conditional complete canonical suite | **Required because production changed; not run after targeted-Edge stop.** The earlier 1,179/1,179 result does not cover these changes. |
| Full seven-viewport matrix | Not rerun after this stop. Historical failure remains in section 18. |
| Final rendered consistency and brand audits | Not run. |
| Performance benchmarks | Not run; no threshold changed. |
| Catalogue/concept data-model gates | Previous passes preserved as historical evidence. Shared matching changed, so relevant catalogue/consistency and concept reachability audits require revalidation before acceptance. |
| Physical-form/raw data | No serving or physical-form code/data changed in this continuation; previous 73,300/450 physical evidence is retained. Protected local data hashes still match. |
| Commit | Not created; nothing staged. |

Evidence outside the repository: `%TEMP%/hec-abbott-diagnosis/diagnosis.json`, `failed.png`, `responsive.json`; `%TEMP%/hec-abbott-target-320/report.json`; `%TEMP%/hec-abbott-expanded-390/report.json`; `%TEMP%/hec-abbott-focused.tap`. Temporary diagnostic scripts and screenshots are not tracked.

Latest local integrity comparison: only the two intentional production modules differ from the 13 saved hashes; food-sources, guided-product-resolution, serving-foundation, loader/worker, generated catalogue, supplemental/curated facts, AFCD, KFC raw and McDonald's raw remain unchanged. No protected OFF files changed. Public TEST/My Data HEADs were last read-only verified during section 18; no new pre-commit remote verification was performed because no commit gate was reached. The final 36-file dirty tree is preserved, whitespace clean, staging empty, source HEAD/version/cache unchanged. No source refresh, reset, discard, push, deployment or My Data access occurred.

## 20. Corrected identity probe and final acceptance continuation

### Preflight and assertion correction

The required authoritative repository, branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, version 0.6.33 and source cache v5 match. The expected dirty 36-file foundation tree is preserved; whitespace check passed and nothing was staged. The shared production repair from section 19 remains intact.

The wrong assertion was `assert.equal(selected.food.canonicalId, canonicalId)`. The corrected probe calls the existing **`HECGuidedProductResolution.canonicalProductKey(selectedFood)`**, checks agreement with the guided profile's `productKey`, and independently checks the selected source record ID. It then chooses 84 g through the actual guided UI, opens one Review, saves one disposable Diary entry, checks that entry's `foodId`, and resolves it through the existing OFF loaded-record lookup plus `HECFoodCatalogue.canonicalKey`. Expected identities remain `off:9339423004229` and `barcode:9339423004229`. No identity logic was duplicated, raw property manufactured, product substituted or production behavior changed for the assertion.

### Targeted results

| Viewport | Result |
|---|---|
| 390x844 | **PASS**, corrected identity checks and Diary persistence for both `HARVEST SEEDS & GRAINS` and `Abbott's Bakery HARVEST SEEDS & GRAINS`; whole-brand pages also pass. |
| 430x932 | **PASS**, same complete probe. |
| 320x568 | **PASS**, rerun because the corrected probe now includes canonical identity and actual logging checks applicable to this viewport too. |

Both query forms preserve the exact source record and derived canonical identity throughout selection and logging, with 84 g consumed mass. All three runs have zero live TEST fallthrough. Abbott's Bakery remains 18 records with the target fourth on the first page; the separate Abbott's brand remains two records. No pagination, ranking or timeout changed.

Focused automated tests: **187 total / 187 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **4,974.5894 ms**. Files: `product-name-reachability`, `australian-catalogue-foundation`, `guided-product-resolution-repair`, `universal-food-search-source-branching`, `post-deployment-iphone-integration` and `search-session-root-cause-repair` under `tests/`.

### Production checkpoint and remaining acceptance

Before the fresh complete suite, SHA-256 comparison of **40 production/loader/factual files** found **zero changes during this continuation**. New changes are the corrected audit/probe, expanded final rendered audit and this report. The earlier production repair in `alpha06.js` and `food-catalogue.js` still requires one fresh full-suite result; section 18's 1,179/1,179 is historical only.

The final rendered audit now checks the selected identity as well as preview/submitted eligibility. Its new collision coverage chooses three eligible products with inferred-brand/name collisions and three apostrophe-brand products by deterministic ID hashes, with distinct brands and no Abbott's sample. This is offline audit sampling, not a production keystroke scan. The final audit can use the unchanged established seven viewport dimensions to cover named product/brand probes throughout the same matrix. No existing timeout or scenario was reduced.

The previous physical audit is legitimately reusable: `serving-foundation.js`, `product-serving-semantics.js`, generated/factual catalogue and measure/profile inputs have not changed since its 73,300-product / 450-sample pass. Shared matching did change previously, so full concept/search and catalogue/canonical audits will be rerun after the fresh suite.

Evidence prefix outside the repository: `%TEMP%/hec-probe-final-`. Current evidence: `target-390/report.json`, `target-430/report.json`, `target-320/report.json`, `focused.tap`, `preflight-hashes.json`. Fresh full-suite and remaining final gate results are recorded below once completed.

### Fresh complete canonical suite

The single newly authorized `node --test --test-concurrency=1 tests/*.test.js` run **PASSED: 1,183 total / 1,183 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, duration **449,049.5779 ms**. The four tests added since the historical 1,179 result cover the shared product-name/brand-spelling repair. No production bytes changed during or after this run. Evidence: `%TEMP%/hec-probe-final-full-suite.tap`.

The full concept/search and catalogue/canonical audits were started only after this zero-failure result. The protected KFC audit also passed in this final cycle.

### Relevant foundation audits

| Gate | Final-cycle result |
|---|---|
| Full concept/search generalisation | **PASS**: 73,300 products, 17 concept coverage keys, 201 exact-versus-variant probes, zero defined violations; **33,884.9665 ms**. |
| Full catalogue/canonical identity | **PASS**, full mode: 73,965 inputs / 73,964 canonical identities, zero critical violations or stale preview identities. |
| Deduplication/source restrictions | Zero unsafe different-GTIN merge violations; all 236 unresolved material conflicts restricted. Two retained merged-evidence clusters and 4,525 unresolved name clusters remain. Detailed counts from section 18 are unchanged. |
| Model consistency / brands | All 40 deterministic identity samples and 20 brand audits pass. Final rendered checks follow separately. |
| Protected KFC | **PASS**: 144 menu rows, 126 unique/runtime records, 18 duplicate appearances, 12 categories, zero integrity errors. Normalized SHA `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2` matches. |
| Physical-form audit reuse | Serving/semantics/measure data unchanged; reuse the section 18 full 73,300-product / 450-sample pass with zero inappropriate solid/countable mL/L/cup exposure. |

Evidence: `%TEMP%/hec-probe-final-concepts.json`, `hec-probe-final-catalogue.json`, `hec-probe-final-kfc.json`; physical controls/evidence remain `%TEMP%/hec-au-continuation-final-physical.json`. All 40 preflight production/data hashes were rechecked before starting the seven-viewport matrix and still match.

### Unchanged seven-viewport matrix: Nuttvia stop

The complete established command was launched after the fresh suite and relevant audits passed:

`node scripts/audit_physical_form_responsive.js "%TEMP%/hec-au-continuation-final-physical.json" "%TEMP%/hec-probe-final-responsive"`

No `--quick`, viewport override, timeout change, retry or skipped scenario was used. The established set remains **320x568, 375x667, 390x844, 430x932, 834x1194, 390x520, 1194x834**. Genuine Edge **152.0.4191.66** returned **exit 1 / pass false** on scenario 10 at **320x568**:

`assert(rendered.some(k=>['tsp','tbsp'].includes(k)))`

Location: `checkMeasures`, `scripts/audit_physical_form_responsive.js:9`, called for **Unrelated nut spread** by `product` at line 10 and the matrix runner at line 18.

| Failed control | Evidence |
|---|---|
| Query / product | `Hazelnut spread`, Nuttvia |
| Source record | `off:9351008000006` |
| Saved full physical audit | Complete nutrition, spread form, no supplied serving size, per-100g OFF nutrition basis, **keys `["g"]`**, default measure `g`, no raw volume measure. |
| Rendered failure screenshot | Correct Nuttvia Hazelnut spread selected as an exact product; **How much? g**, amount input and Continue; no teaspoon/tablespoon. |
| Matrix expectation | Every probe passed `{spread:true}` must render a teaspoon or tablespoon, regardless of its source/profile evidence. |

The saved physical audit and rendered UI agree. The matrix's unconditional spread-to-spoon assumption conflicts with this control's already established evidence-gated grams-only profile. The failure does not justify inventing a spoon conversion. No serving code/data changed in this continuation; no matrix assertion, control product, timeout or production behavior was changed after the failure.

Nine scenarios passed before the stop: Real McCain Hash Browns; Generic Hash Brown packaged route (all four source branches); Incomplete product completion actions; **Unrelated frozen solid (the original Abbott's failure)**; Biscuit/cracker; Solid bar/item; Ordinary Milk; Juice; Margarine. The five initial search-accessibility interactions also passed. No viewport completed all 16 scenarios; the remaining six viewports were not started.

Routing evidence: **198 same-origin requests / 198 local fulfillments / zero live TEST fallthrough**, zero page errors and zero failed local assets. Six attempted external OFF searches were blocked by the existing isolation route; their matching blocked-request console entries are expected. No remote catalogue bytes were fetched.

| Remaining gate | Status after required stop |
|---|---|
| Complete seven-viewport matrix | **FAIL** at Nuttvia's unconditional spoon assertion; not retried. |
| Final rendered preview/submitted/selection consistency | Not run after stop. Prepared audit enhancements are unexecuted final-gate work. |
| Final rendered brand-only audit | Not run after stop. The model's 20-brand audit and targeted Abbott's brand pages passed within their stated scope. |
| Automatic rendered collision/apostrophe generalisation | Prepared deterministic six-product audit, **not run as a final gate**. Focused synthetic collision tests passed within the 187/1,183 results. |
| Final benchmarks | Not run after stop; no final performance result or threshold waiver. |
| Local source commit | Not created; staging remains empty. |

Failure evidence: `%TEMP%/hec-probe-final-responsive.log`, `%TEMP%/hec-probe-final-responsive/responsive.json`, `%TEMP%/hec-probe-final-responsive/failure.png`.

### Final protected state, product outcomes and diff

All **40 production/data hash checks still match this continuation's preflight and fresh 1,183-test suite**. Protected local OFF/McDonald's/AFCD and AUSNUT-derived data are unchanged. KFC's freshly recalculated normalized SHA and counts match the required protected values. TEST/My Data public HEADs were last read-only verified in section 18; this run did not reach pre-commit remote re-verification. Neither deployment nor My Data was accessed or changed.

The current production facts and passing suite/model checks retain Hungry Jack's Hash Brown **58 g / 164 Cal / 685 kJ**, McCain Hash Brown **75 g / 122 Cal / 510 kJ**, MeadowLea's **13 identities** with no invented supplemental teaspoons, Flora's **5 g tsp / 19 g tbsp / 10 g serve / grams** and **2 tsp = 10 g / 37 Cal / 154 kJ**, plus accepted Big Mac, KFC count-family and Bread/Milk base behavior. Comprehensive final rendered confirmation remains incomplete, as shown above.

Final source branch/HEAD/version/cache remain unchanged. The accumulated diff is **24 modified tracked files, 316 insertions / 152 deletions, plus twelve new files (36 total)**; the tracked-only line statistic excludes new generated/factual files and this report. Full prior review plus the latest audit/probe diff was reviewed; whitespace is clean, nothing staged, no protected raw mutation, deployment overlay, temporary browser artifact, capture cache, broad line-ending rewrite or named product workaround is present. All work remains uncommitted for follow-up. No reset, discard, source refresh, push or deployment occurred.

## 21. Evidence-gated spread acceptance continuation

### Preflight and diagnosis before edits

Branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, version **0.6.33** and source cache **v5** match. The intentionally dirty foundation tree was preserved without reset, discard, stash, rebuild or source refresh. All **40** recorded production/data hashes match the source tested by the latest **1,183/1,183** complete suite.

The prior failing expression was `assert(rendered.some(k=>['tsp','tbsp'].includes(k)))` at scenario 10, 320x568. Before any edit, the actual protected OFF record, converted food, central profile, guided profile and shared eligibility were inspected:

| Field | Actual evidence |
|---|---|
| Record / canonical identity | `off:9351008000006` / `barcode:9351008000006` |
| Brand / product | Nuttvia / Hazelnut spread |
| Physical profile | spread; generalSpread family; canonical guided productKey matches |
| Nutrition basis | per-100g OFF; complete and usable; no basis conflict |
| Source serve | servingSize empty, servingQuantity null, manufacturerServing null, packageServingExplicit false |
| Household evidence | original source units only g, original source origins empty, no teaspoon or tablespoon evidence |
| Canonical measures | g only; positive multiplier 0.01; conversion 1 g; default 100 g is a nutrition reference, not a manufacturer serve |
| Eligibility | catalogued-community, not manufacturer-verified; loggable-now; normalLoggingAllowed true; preview/search eligible |
| Rendered UI | auto-selected g amount input; no teaspoon or tablespoon; one ordinary logging route |

**Verdict: Case A, stale audit assertion.** Production is correct. No serving, search, nutrition, catalogue data or measure architecture was changed. Source/calculated nutrient distinctions already present in the OFF converter were observed without changing them. Full diagnostic evidence is `%TEMP%/hec-nuttvia-evidence.json`.

### Generic assertion correction and targeted verification

`scripts/spread_measure_acceptance.js` requires at least one usable canonical measure, rejects unsupported rendered keys and volume measures, requires grams when mass nutrition permits, and requires evidenced source mass servings. Each canonical teaspoon/tablespoon must have a positive finite gram conversion plus trusted confidence and source metadata; rendered presence must exactly match the canonical evidence. Missing supported spoons fail as do invented/unevidenced spoons. The responsive audit captures the selected profile and calls this shared acceptance helper, including the existing auto-selected single-measure UI. No product/brand/record-ID exception appears in acceptance logic. The existing scenarios, viewport set, waits, timeouts, retry behavior and routing rules remain unchanged.

The separate targeted Edge runner reads the saved physical control by control key. It verifies selected source and canonical identity, profile identity, eligibility, measure choices, actual Review choices, and exactly one 10 g Diary entry. Execution order was 320x568 first, then 390x844, then 430x932; **all PASS**, each with g only and zero unsupported spoons. Each disposable local TEST-origin context passed routing/error checks. Reports and screenshots: `%TEMP%/hec-nuttvia-target-{320,390,430}/report.json` and `result.png`.

Focused command: `node --test --test-concurrency=1 tests/spread-measure-acceptance.test.js tests/australian-catalogue-foundation.test.js`. Result: **26/26 pass, zero failures/skips/cancellations, 954.4981 ms**. The six new tests cover evidenced household presence and corrupted confidence/conversion rejection; grams-only with auto-selection and missing-grams rejection; independent no-inherited-teaspoon and no-inherited-tablespoon cases; Flora 5/19/10/1 g measures and 2 tsp = 37 Cal / 154 kJ; and all eight supplemental MeadowLea profiles retaining applicable official-reference 19 g tablespoons and source serves, without teaspoons. Evidence: `%TEMP%/hec-nuttvia-focused.tap`.

### Complete-suite reuse

Only audit code, audit tests and this report changed. All 40 production/data hashes remain identical to `%TEMP%/hec-probe-final-preflight-hashes.json`. The complete **1,183/1,183, zero failures/skips** suite in section 20, duration **449,049.5779 ms**, is therefore reused exactly as requested, without a ritual rerun. The full concept/search, catalogue and physical-form results remain applicable to identical production bytes. The six new acceptance tests were executed separately as shown above; they are not retroactively counted in the historical 1,183.

### Remaining final gates

The full command was run without quick mode, scenario removal, timeout changes, retries or routing changes: `node scripts/audit_physical_form_responsive.js "%TEMP%/hec-au-continuation-final-physical.json" "%TEMP%/hec-nuttvia-final-responsive"`.

**PASS: all seven viewports** (320x568, 375x667, 390x844, 430x932, 834x1194, 390x520, 1194x834), **112/112 main scenarios**, plus the search-accessibility and universal interactions at every viewport. Genuine Microsoft Edge 152.0.4191.66; exit 0. Every viewport passed both evidenced margarine and unevidenced Nuttvia, Abbott's reachability, McCain exact and all Hash Brown source routes, incomplete-record completion actions, other physical controls, Bread/Milk, Big Mac, KFC, one final Review/Diary edit and incompatible voice-measure rejection. All layout assertions passed. The 320x568 final capture was also visually inspected.

Routing totals: **2,107 same-origin requests / 2,107 local fulfillments / zero live TEST fallthrough**, zero page errors and zero failed local assets. Each viewport passed the unchanged unexpected-console-error filter; external requests were blocked, not fulfilled remotely. Evidence: `%TEMP%/hec-nuttvia-final-responsive/responsive.json`, viewport PNGs and `%TEMP%/hec-nuttvia-final-responsive.log`.

### Final rendered consistency / brand / automatic collision audit: required stop

Command: `node scripts/audit_australian_catalogue_edge.js "%TEMP%/hec-nuttvia-final-brand-edge" --seven`. This runs the prepared final acceptance across the same seven dimensions, without changing timeouts, adding retries or changing isolation. Genuine Edge returned **exit 1 / pass false** at the first viewport, **320x568**. No viewport completed this combined final audit; the other six were not started.

Results completed before the stop:

- **8/8 brand probes at 320x568:** McCain 163 identities, Meadow Lea 13, Flora 32, Tip Top 44, Norco 55, and automatic In A Biskit 4, SlimBiome 3, Hamper 5. Prior Hash Brown source intent was cleared, membership remained correct, lists were bounded to 20, and second-page checks passed for McCain (20), Flora (12), Tip Top (20) and Norco (20). McCain retained non-hash-brown breadth and Meadow Lea's first result was official.
- **10/10 preview → submitted Search → selection queries at 320x568:** five named probes (McCain hash brown, Flora ProActiv Light, Hungry Jack's hash brown, Big Mac, Sanitarium Weet-Bix Original), plus five deterministic automatic official products. All **14 actionable preview identities** remained loggable/reachable after Search. Each query's selected result retained the expected canonical ID and eligibility. Automatic queries covered McCain Pub Style Crispy Broccoli Fries 500g, McCain Quick Cook Crinkle Cut 750g, and MeadowLea 1kg, 250g and canola portion-pack products. The 250g selection retained merged canonical identity `barcode:93236713`.
- **3/3 automatic full-product-name brand-token collisions passed at 320x568:** International Cuisine Supreme Family Pizza (`off:4088700081785`), macro Wholefoods Market Organic Brown Flaxseed Meal (`off:9339687056750`), and Coles Australian Potato Chunky Wedges (`off:9310643250069`). All selected the matching barcode canonical identity. These extend the prior Abbott's evidence with unrelated automatically selected brands/products.

The next automatic sample, the first punctuation probe, failed:

| Field | Exact evidence |
|---|---|
| Query | `Carman's Classic Fruit & Nut Muesli` |
| Product / brand | Classic Fruit & Nut Muesli / Carman's |
| Record / expected canonical identity | `off:9319133334670` / `barcode:9319133334670` |
| Automatic sample class | punctuation; deterministic hash-based selection from eligible protected OFF records |
| Successful prerequisite | `HECOpenFoodFactsAU.getLoaded(id)` completed before Search; submitted ready-state wait also completed |
| Failing operation | `locator('[data-universal-result="off:9319133334670"]').waitFor({state:'visible',timeout:30000})` |
| Error | `locator.waitFor: Timeout 30000ms exceeded` |
| Location | `scripts/audit_australian_catalogue_edge.js:41:152`, called from the automatic collision loop at line 83 |

This establishes a rendered reachability failure; it does **not** establish which shared search path caused it. No failure DOM/screenshot was captured by this prepared runner, so none is claimed. The browser closed normally in its finally block. There was no retry, named fix, production edit or threshold change. The remaining Rafferty's Garden and Moira Mac's punctuation samples were not run. The combined audit's later restaurant/base-search/customisation/logged-flow/KFC checks were not reached in this run; their existing suite and completed physical-matrix evidence retain their stated scope.

Saved routing evidence was checked read-only after the failure using the existing `qa.requireEvidence` contract: **133 same-origin requests / 133 local fulfillments / zero live fallthrough**, zero page errors, zero failed local assets and zero unexpected application console errors. Twenty external search attempts were aborted under the unchanged isolation rules; matching blocked-resource console entries are expected. No external source data was refreshed.

Evidence: `%TEMP%/hec-nuttvia-final-brand-edge/report.json` and `%TEMP%/hec-nuttvia-final-brand-edge.log`.

### Performance, protected state and final disposition

**Final benchmarks were not run after the required stop.** The three established benchmark scripts and unchanged thresholds remain pending. Source inspection confirms indexed/cached query intent, bounded brand loading and canonicalisation of matched/loaded result subsets; no whole protected catalogue is canonicalised on each keystroke. This code inspection is not a substitute for the pending performance results.

Read-only public GitHub verification at **2026-09-08T19:42:25.4834521Z** confirmed TEST `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, My Data `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`, and TEST cache v25. The sandbox initially blocked network sockets; the authorized read-only metadata request then succeeded with network permission. No remote write or deployed application/storage access occurred. Evidence: `%TEMP%/hec-nuttvia-protected-remotes.json`.

Protected OFF source SHA remains `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`, with 73,300 imported / 70,832 searchable / 12,239 brands / 72,671 valid GTINs. The fresh KFC integrity audit passed with zero errors and normalized SHA `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2` (`%TEMP%/hec-nuttvia-final-kfc.json`). AFCD, McDonald's and KFC file hashes match section 15. AUSNUT-derived source/measure data, deployment/configuration and protected OFF payloads are unchanged. All **40 production/data hash comparisons remain identical after the final audit stop**.

Final diff review and commit disposition are recorded in section 16: 25 tracked modifications, fifteen new files, **40 files total**; tracked-only **320 insertions / 155 deletions**; whitespace clean, no staging, no commit. Source version 0.6.33 and cache v5 are preserved. Historical stops are retained. The precise next blocker is the automatic Carman's punctuation/reachability failure; remaining rendered gates and performance must pass before the authorized single commit can exist.

## 22. Carman's exact-product collision continuation

### Preflight and diagnosis recorded before code edits

Required branch alpha-0.6.33, HEAD 63be3825efb277cda8633f964839825f24d08c63, version 0.6.33 and source cache v5 match. The 40-file dirty foundation tree is preserved; whitespace check passes and all 40 production/data hashes match the prior 1,183-test suite. No reset, discard, rebuild, source refresh, staging or commit occurred.

Exact failing query: `Carman's Classic Fruit & Nut Muesli`. Stored/display brand: `Carman's`; product: `Classic Fruit & Nut Muesli`; source record `off:9319133334670`; canonical identity `barcode:9319133334670`. Brand code points, in order: **U+0043 U+0061 U+0072 U+006D U+0061 U+006E U+0027 U+0073**. The audit and stored brand both use ASCII apostrophe U+0027. The diagnostic curly variant uses U+2019; the omission variant has no apostrophe. No other apostrophe character is present. Canonical matching brand key is `carmans`; display spelling remains unchanged.

The exact 320x568 failure was reproduced after replaying all **21 preceding probes** (8 brands, 10 consistency queries, 3 collisions) using the existing helpers and unchanged 30-second target wait. The loaded target is loggable-now, normalLoggingAllowed true, with the expected canonical identity. Submitted Search displays **zero result rows** and the unavailable-catalogue message. The session is explicit-committed with empty universalSource and no guided/source commitment. Exact failure HTML, screenshot and complete snapshots are saved outside the repository under `%TEMP%/hec-carmans-diagnostic/`. The screenshot was inspected.

| Diagnostic query | Searchable OFF index | Deliberate rendered Search |
|---|---|---|
| ASCII brand + exact product | Target rank 1 of 3 | No target/result rows |
| U+2019 brand + exact product | Target rank 1 of 3 | No target/result rows |
| Missing apostrophe + exact product | Target rank 1 of 3 | No target/result rows |
| Exact product-only words | Target rank 2 of 5 | Target rank 1 |
| Exact stored brand only | Target rank 261 of 282 in index retrieval | Bounded list of 20; target rank 11 on page 1, 282 total |

All full-query variants normalize consistently to `carmans classic fruit and nut muesli`. Fresh-context ASCII and original-sequence preview snapshots did not yet contain the target; warm curly/omitted variants and product-only previews did contain it. This timing distinction does not explain submitted failure: all brand-qualified variants retrieve/load the record and then fail the same synchronous filter after Search. A clean disposable context reproduced the failure without prior catalogue-probe state, ruling out dependence on the earlier query sequence. Both diagnostic contexts have zero fallthrough/page errors/failed assets (133/133 and 62/62 locally fulfilled requests).

**Proven root cause: Case C, shared inferred-brand prefix collision.** Longest-prefix inference chooses the separately indexed brand `Carmans - classic Fruit and Nut` (key `carmansclassicfruitandnut`, one record), consuming brand plus product-name words and leaving `muesli`. The target's actual brand is `carmans`; membership in that longer brand is false. In `explicitIdentityMatch`, the previous exact-name exception only compares the product name alone with the whole query, so it is false for an otherwise exact **brand + product** query. The membership guard therefore rejects the target. The OFF lookup is rank 1 and semantic exactness is priority 5, so neither pagination, weak intent nor eligibility explains the failure. Possessive singularization exists in the concept identity, but the previously repaired runtime already uses the quantity-stripped identity preserving `carmans`; the wrong longer brand is still selected there. This is not a straight/curly normalization defect.

Source and variant evidence: `%TEMP%/hec-carmans-source-diagnostic.json`; exact browser reproduction: `%TEMP%/hec-carmans-diagnostic/report.json`, `exact-failure.html`, `exact-failure.png`; ten deterministic non-Carman's punctuation samples were selected before edits in `%TEMP%/hec-carmans-automatic-punctuation-samples.json`.

### Shared correction and targeted results

The existing inferred-prefix exception in `food-catalogue.js:612` now accepts either the previously supported full product name or the **complete stored brand + product name**, using the existing catalogue normalizer for the latter. The exception still applies only to `indexed-brand-plus-product`; partial phrases and aliases do not supply this exact stored-name proof. It does not change brand-directory entries, normalization, displayed names, GTIN/canonical identity, eligibility or ranking. In particular the complete brand-plus-name comparison does not singularize the brand. No Carman's string or record ID appears in the production repair or generic Edge runner.

The new targeted runner reads the first punctuation sample from the prior automatic report and asserts source ID, canonical ID, profile productKey, unchanged display brand/name, normal logging eligibility, fresh search state and zero live fallthrough. **320x568 PASS**, then **390x844 PASS**: at each size all four queries (ASCII apostrophe, U+2019 apostrophe, omission, and product-only) select `barcode:9319133334670` at rendered rank 1. There is no sibling substitution, forced rank, new alias or separate canonical brand. Reports: `%TEMP%/hec-carmans-target-320/report.json` and `%TEMP%/hec-carmans-target-390/report.json`. The 390 run was already running when focused tests finished; it completed successfully. **430x932 was not launched after the stop.**

### Focused automated regression run: required stop

Command: `node --test --test-concurrency=1 tests/product-name-reachability.test.js tests/catalogue-punctuation-reachability.test.js tests/australian-catalogue-foundation.test.js tests/search-session-root-cause-repair.test.js tests/post-deployment-iphone-integration.test.js tests/spread-measure-acceptance.test.js`.

Exact result: **115 tests / 113 pass / 2 fail / 0 skips / 0 cancellations / 0 todo**, **9,041.7465 ms**, exit 1. Evidence: `%TEMP%/hec-carmans-focused.tap`. This activates the user's stop condition; no test was edited or rerun after the failure.

The new automatic tests deterministically select two distinct eligible brands for each of five punctuation classes from the protected catalogue, then check indexed retrieval, matching variants, submitted canonical identity, real guided selection, unchanged display/source values and distinct-GTIN safeguards. Nine of ten product samples completed: Carman's, Rafferty's Garden, Ben & Jerry’s, Kellogg’s, Dogani Seolleongtang, Dimmies & Tinnies, m&m's, Ready- Set... Cook!, and Well & Good. Eight completed samples are non-Carman's. Four punctuation-class tests passed; the hyphen class failed on its second sample. This is partial regression evidence, not an overall punctuation pass.

| Failed check | Evidence and read-only follow-up |
|---|---|
| Automatic hyphen product | Query `Häagen-Dazs STRAWBERRIES & CREAM`, target `off:3415581105360`, canonical `barcode:3415581105360`. Failure is the OFF indexed-retrieval presence assertion at `tests/catalogue-punctuation-reachability.test.js:15:116`, before canonical matching/selection assertions. Read-only diagnostics confirm text retrieval returns **0** results for both raw uppercase and converted title-case names; the shared explicit matcher itself returns **true**. The OFF API/data are unchanged and its retrieval path does not call the edited explicit matcher. The underlying index/retrieval-versus-sample issue is not yet resolved. |
| Synthetic wrong-brand negative | Query `Rowan Kitchen Cedar Seeds & Grains` against stored `Rowan's Kitchen`; expected false, actual true at `tests/product-name-reachability.test.js:19:12`. Only the possessive brand and its longer prefix were registered by the fixture; `Rowan Kitchen` is not registered. Query intent therefore has **entity null**, takes generic product text matching, and accepts the token substring. A read-only VM comparison with the previous exact-name condition returns **true both before and after** the repair. This assertion does not yet prove an unsafe known-brand merge or a regression caused by this edit; its negative contract/fixture needs reconciliation. |

Additional read-only diagnostic evidence: `%TEMP%/hec-carmans-focused-failure-diagnostic.json` and `%TEMP%/hec-carmans-hyphen-failure-diagnostic.json`. These inspect the failed conditions without changing production or rerunning acceptance. Existing focused source/canonical, query-reset, Abbott's, guided selection and spread evidence tests passed within the 113 successes.

### Conditional gates and protected state after stop

- **Production bytes changed:** only food-catalogue.js differs among the 40 recorded production/data files; all other 39 match. Serving, measure, source data and runtime UI bytes did not change in this continuation.
- **Fresh complete suite required but not run** after the failed focused gate. Historical 1,183/1,183 remains evidence for the preceding production state, not acceptance of this edit.
- **Complete seven-viewport rerun required but not run** after the failed focused gate. The historical 112-scenario/seven-viewport pass is preserved in section 21 and is not claimed for the current matching bytes.
- **Final rendered consistency, brand and collision/punctuation audits:** not run after stop; preceding partial results remain historical.
- **Final performance:** not run; all established thresholds remain unchanged. The repair adds only a stored brand/name string comparison inside existing candidate filtering, with no new whole-catalogue scan, normalization pass, directory expansion or per-keystroke index rebuild. This inspection does not replace pending benchmarks.
- **Protected data:** OFF/McDonald's/AFCD/KFC payloads, AUSNUT-derived measures, deployment and configuration files remain unchanged. Protected source hashes retain the values in section 21; KFC's prior normalized audit remains applicable because its data did not change. The required TEST/My Data HEADs and TEST cache were last read-only verified at 2026-09-08T19:42:25.4834521Z (section 21). This continuation did not reach pre-commit remote re-verification and did not access either deployed application or My Data.
- **Final source disposition:** version 0.6.33, source cache v5, required branch/HEAD unchanged, 42 accumulated files, tracked-only +322/-155, whitespace clean, nothing staged, no commit, no push/deployment/source refresh. All historical stops remain intact.

## 23. OFF diacritic retrieval and registered collision fixture continuation

### Preflight and exact retrieval diagnosis

The expected dirty foundation tree and Carman's shared repair were preserved. Branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, version 0.6.33 and source cache v5 matched. Initial whitespace validation passed. No reset, discard, rebuild, source refresh, staging, push, deployment or My Data access occurred.

The automatic sample is **off:3415581105360**, barcode **3415581105360**, canonical **barcode:3415581105360**, stored brand **Häagen-Dazs**, stored name **STRAWBERRIES & CREAM** (consumer display `Strawberries & Cream`). It is complete and eligible, in **products/ha-00.json**, index **202**, ref **ha-00:202**. Exact raw query sent to `off.api.search`: `Häagen-Dazs STRAWBERRIES & CREAM`.

- Brand code points: `U+0048 U+00E4 U+0061 U+0067 U+0065 U+006E U+002D U+0044 U+0061 U+007A U+0073`.
- Query code points: that brand sequence followed by `U+0020 U+0053 U+0054 U+0052 U+0041 U+0057 U+0042 U+0045 U+0052 U+0052 U+0049 U+0045 U+0053 U+0020 U+0026 U+0020 U+0043 U+0052 U+0045 U+0041 U+004D`.
- NFC retains ä U+00E4; NFD uses a U+0061 plus diaeresis U+0308. Stored hyphen is U+002D; en dash U+2013 and nonbreaking hyphen U+2011 were also inspected.
- Runtime decomposition, diacritic folding, lowercase, ampersand expansion and punctuation splitting correctly yield `haagen dazs strawberries and cream`; filtered tokens are `haagen`, `dazs`, `strawberries`, `cream`. Compact brand key is `haagendazs`.
- The protected Python importer uses ASCII token extraction without decomposition. Brand tokens are `h`, `agen`, `dazs`; the one-character h is omitted from postings. Its compact key is **hagendazs**, also indexed as a search token. Product/category postings include `strawberries`, `cream`, `creams`. The expected `haagen` posting does not contain this target.
- The intelligence builder normalized product names but reused historical product brand keys. **intelligence/ha.json** therefore contains `haagendazs` / `Haagen-Dazs` (**10** refs) and `hagendazs` / `Häagen-Dazs` (**19** refs). Only the latter contains the target and exact name `strawberries and cream`.

Before repair, seven spellings (`Häagen-Dazs`, `Haagen-Dazs`, `Häagen Dazs`, `Haagen Dazs`, en dash, nonbreaking hyphen, NFD) normalize identically. Every brand-only query returned 10 records without the target; every qualified query returned zero. Product-only returned **39**, target **sixth**; barcode lookup returned the target. The qualified route intersected product refs with the wrong 10-member brand list; its full-text fallback also lacked the target's haagen posting. The canonical matcher accepted the target both before and after the Carman's repair. Diagnostic evidence: `%TEMP%/hec-haagen-retrieval-diagnostic.json`.

**Verdict: Case A, shared OFF retrieval defect.** The record and reasonable query are valid. No sample was substituted.

### Shared correction

`off-catalogue.js` builds one cached lookup map from the existing Australian brand directory. Folded names map to historical index addresses using the original importer's token rule. Only corresponding intelligence shards are loaded; each entry's display name must fold to the requested brand before its refs, name refs and facets can join the retrieval family. Resolved entries are cached. Leading diacritics can resolve across historical shard prefixes too.

The historical ASCII transformation only addresses existing indexes. Protected data, display names, source IDs, barcodes and canonical identities are unchanged. There is no fuzzy match, named brand/barcode condition, ranking boost, global Unicode identity rewrite or per-keystroke catalogue scan. Different GTINs remain separate products. Search-token normalization and the Carman's shared collision condition remain unchanged.

### Rowan diagnosis and replacement

The original synthetic record is `example-product`, brand `Rowan's Kitchen`, name `Cedar Seeds & Grains`, alias `Rowan's Kitchen Cedar Seeds Breakfast`. Registered brands included `Rowan's Kitchen` (3) and `Rowan's Kitchen Cedar Seeds` (1), alongside Cedar/Morning/Miller fixtures. Query `Rowan Kitchen Cedar Seeds & Grains` had **entity null**, reason **product**, and never entered indexed-brand collision exclusion. Generic substring matching returned **true before and after** the Carman's change. This was an invalid negative witness for that repair.

The replacement retains that rejection assertion and registers **Rowan Kitchen** as a competing brand (3). It explicitly checks `indexed-brand-plus-product`, the competing entity, failed membership and rejection. Partial, alias-only, missing-word, wrong-brand, retired/legacy and different-GTIN negatives remain. Positive complete stored brand/name recovery remains. A separate unregistered synthetic `Willow Kitchen` test documents generic fallback without claiming registered brand identity. Production generic matching is unchanged.

### Focused result

The original six-file 115-test set plus one generic-fallback test and six direct OFF tests passed: **122 total / 122 pass / 0 fail / 0 skip / 0 cancelled / 0 todo**, **7,529.673 ms**. Evidence: `%TEMP%/hec-diacritic-focused.tap`.

Direct tests cover folded spellings, decomposed Unicode, unaccented queries, common hyphens, apostrophes/ampersands, cross-prefix retrieval, historical-key collision rejection, separate source IDs/GTINs, stable pagination, cached metadata and query reset. All ten existing deterministic automatic punctuation samples now pass retrieval, display and canonical selection checks; Häagen-Dazs passes seven variants. Its generator additionally checks NFC, NFD, diacritic-folded and further hyphen equivalents.

One fresh complete suite was started after this pass with exactly `node --test --test-concurrency=1 tests/*.test.js`. Result and subsequent gate disposition follow below.

### Fresh complete suite: required stop

Exactly one run of `node --test --test-concurrency=1 tests/*.test.js` completed: **1,203 total / 1,202 passed / 1 failed / 0 skipped / 0 cancelled / 0 todo**, **562,540.1032 ms**, exit **1**. Evidence: `%TEMP%/hec-diacritic-full-suite.tap`.

Failure: `tests/open-food-facts-au-catalogue.test.js:39:95`, test **26. all audited brand members remain accessible without contamination**, `audit.brands.complete`: actual **99**, expected **100**. No production or test edits, acceptance retries or additional gates were run after this failure; the already-running suite was allowed to finish for exact totals.

Read-only metadata comparison of the same deterministic 100-brand sample found one changed family: **Burgen**, historical key `burgen`, **3 refs**, and **Bürgen**, historical key `brgen`, **5 refs**. Both display names fold to the same search brand identity, with **8 distinct refs**. The old `brandAudit` compares retrieval against a single raw-key bucket and judges membership using raw `food.brandKey`. That expectation must be reconciled with the shared equivalent-spelling retrieval contract while retaining complete family membership, unrelated-brand rejection and separate source/GTIN checks. This is a metadata diagnosis, not a rerun or a passed replacement audit. Evidence: `%TEMP%/hec-diacritic-brand-audit-diagnostic.json`.

| Remaining gate | Latest disposition |
|---|---|
| Broad 73,300-product concept/search audit | Not run after failed full-suite gate. Earlier zero-violation result remains historical. |
| Broad catalogue/canonical audit | Not run after stop. Earlier zero-critical/unsafe-merge result is not fresh acceptance. |
| Final product-name/punctuation model audit | Focused positives, registered competing-brand negatives and all ten automatic samples passed; separate post-suite audit not reached. |
| Complete seven-viewport matrix | Not rerun. Earlier seven-viewport pass predates current production changes. |
| Final preview → Search → selection consistency | Not run from a new final acceptance start. |
| Final rendered brand audit | Not run. |
| Final rendered collision/punctuation audit | Not run; focused model success does not substitute for rendered acceptance. |
| Final performance benchmarks | Not run; all established thresholds remain unchanged. |
| Commit | Not created; staging empty, dirty tree preserved. |

### Protected state and final diff disposition

Read-only comparison of the saved 40-file production/data baseline gives **38 matches**. Only food-catalogue.js (preserved Carman's repair) and off-catalogue.js (this continuation) differ. No serving, runtime UI, generated catalogue or factual data bytes changed in this continuation.

- OFF manifest source SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**; protected OFF paths have no Git diff.
- KFC normalized payload was recalculated read-only: **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**, matches the stored value. No new KFC audit gate was run.
- AFCD raw SHA: **d729c6ea5bf1014724bde5d4038e995cd79059824cebab9f32b52ed4671560dd**.
- KFC raw JS SHA: **473e071cf68b18fd75481ea4def01166ee7b1237eecc0e56fa5a408e79305201**.
- McDonald's raw JS SHA: **8390eac90e11a94ecf436412dbe6cea328ab4e40844a43d9e2c0c1beebf70c50**.
- Protected OFF/McDonald's/AFCD/KFC payloads, AUSNUT-derived source semantics, deployment and configuration paths have no changes. Local hash evidence: `%TEMP%/hec-diacritic-final-hashes.json`.
- Remote pre-commit verification was not reached. The last read-only public metadata check remains **2026-09-08T19:42:25.4834521Z**: TEST **82c82d3a2a9b777abc8ce5b1332651c9c3229d5c**, cache **v25**, My Data **4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709**. These are historical checks, not a fresh remote-state claim. Neither deployed application nor My Data storage was accessed.

`git status --short`, `git diff --check`, `git diff --stat`, `git diff --name-status` and full tracked `git diff` were captured/reviewed alongside the prior accumulated source review and the new retrieval/test changes. The final commit gate remains unapproved by acceptance: **26 modified tracked + 18 new = 44 files**, tracked-only **+358/-156**, whitespace clean, nothing staged. Full tracked diff evidence: `%TEMP%/hec-diacritic-final-accumulated.diff`. All temporary diagnostics and browser evidence are outside the repository. There is no named Häagen-Dazs/Rowan/Carman's production branch, new ranking pin, unsafe Unicode-wide identity merge, timeout increase or retry. Version **0.6.33**, source cache **v5**, branch and source HEAD remain unchanged.


## 24. Burgen/Bürgen completeness diagnosis: local-evidence stop

### Preflight and exact 99-versus-100 meaning

The expected dirty **44-file** foundation tree is preserved on branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`. Version remains **0.6.33**, source cache **v5**. Whitespace check passed. The prior Häagen-Dazs, Carman's and Abbott's repairs remain intact. No source refresh, reset, discard, stash, rebuild, staging or commit occurred.

The exact historical failure is `tests/open-food-facts-au-catalogue.test.js:39:95`, test **26. all audited brand members remain accessible without contamination**, assertion `assert.equal(audit.brands.complete,100)`, actual **99**, expected **100**. The helper is `scripts/audit_open_food_facts_au.js:brandAudit`.

**100** means 100 deterministic samples from the protected **historical brand buckets** with 2–500 refs, sorted by historical key and selected with `sampleEvenly`. The audit searches each bucket's display name and increments `complete` only if returned total and loaded count both equal that bucket's original ref count. These are not 100 independently established canonical brand families. **99** means 99 of those 100 queries met that count equality. The affected sample is **Burgen**, key **burgen**, expected **3**, currently returning **8**. The extra five refs come from the protected **Bürgen / brgen** bucket. A second audit condition also treats raw `food.brandKey` differences as contamination; thus that criterion also depends on the historical bucket contract. The failure occurred at count equality before its contamination assertion could run.

### All eight implicated source records

For every row below, the **barcode/GTIN is the numeric suffix of the source ID**, and the canonical product identity is **barcode:&lt;that GTIN&gt;**. All eight GTIN check digits validate and all eight are distinct. Every record has market **AU**, source scope **Australia**, source **Open Food Facts**, and community provenance. Country tags below identify the three records also listed in France. Categories are exact retained source categories; absence is left explicit.

| Source ID / GTIN | Exact source brand | Exact source product name | Retained categories | Country tags | Historical key / product ref |
|---|---|---|---|---|---|
| off:9310043008941 | Bürgen | Rye | Plant-based foods and beverages; Plant-based foods; Cereals and potatoes; Seeds; Cereals and their products; Cereal grains; Breads; Secale; Rye; Rye breads | en:australia, en:france | brgen / br-00:302 |
| off:9339423009699 | Bürgen | Sliced Whole Grain & Oat Bread | Plant-based foods and beverages; Plant-based foods; Cereals and potatoes; Cereals and their products; Breads | en:australia | brgen / br-00:303 |
| off:9310043008934 | Bürgen | SOY-LIN | Plant-based foods and beverages; Plant-based foods; Cereals and potatoes; Breads; Sliced breads; Multigrain sliced breads; Soy-lin | en:australia, en:france | brgen / br-00:304 |
| off:9339423009200 | Bürgen | Sunflower & Linseed Sliced Seeded Bread | Not supplied | en:australia | brgen / br-00:305 |
| off:9310043008927 | Bürgen | Wholemeal & Seeds | Plant-based foods and beverages; Plant-based foods; Cereals and potatoes; Breads | en:australia | brgen / br-00:306 |
| off:9339423009217 | Burgen | Burgen Prebiotic wholemeal bread | Bread-wholemeal-spelt-prebiotic | en:australia | burgen / bu-00:591 |
| off:9339423009224 | Burgen | Prebiotoc wholegrain and quinoa | Not supplied | en:australia | burgen / bu-00:592 |
| off:9339423004182 | Burgen | Whole grain and oats | Not supplied | en:australia, en:france | burgen / bu-00:593 |

For **all eight rows**:

- Normalized brand string and current query key are **burgen** for both `Burgen` and `Bürgen`; ü U+00FC decomposes to u U+0075 plus combining diaeresis U+0308 and folds to u.
- The five accented records are in `products/br-00.json`, indexed by `brands/br.json` and `intelligence/br.json` under **brgen**. The three unaccented records are in `products/bu-00.json`, indexed by `brands/bu.json` and `intelligence/bu.json` under **burgen**.
- Current `Burgen` and `Bürgen` brand-only retrieval each returns **8**, including the row. Each spelling followed by that row's **exact stored product name** returns **1**, the correct row. Where the product name already starts with Burgen, this diagnostic deliberately retains that exact name, so the concatenated query repeats Burgen. All queries/results are recorded in the evidence JSON.
- `C.canonicalProduct(food).brandId` is **burgen** for all eight. This is the existing normalization result, not independent evidence of common ownership. `C.canonicaliseRecords` retains **8 products**, with unchanged display brands and **8 canonical GTIN identities**.
- No record supplies manufacturer, owner, producer or explicit brand-alias fields. The existing generated directory has only `{name:'Bürgen',count:5}` and `{name:'Burgen',count:3}`; no verified alias relationship is present. No Burgen/Bürgen alias was found in the curated entity registry.

Source URLs are retained per record in `%TEMP%/hec-burgen-source-diagnosis.json`. They use the common unaccented Burgen slug on OFF product URLs. Products have a plausible shared bread/wholegrain relationship, including similar whole-grain/oat names. Several GTINs share leading digits across spellings, but the snapshot has no GS1 owner mapping; those prefixes do not prove a common manufacturer. No GTIN or exact normalized product-name key is shared across the two buckets. Missing categories and nutrition in some records remain missing.

### Evidence verdict and algorithm review

**Case C — insufficient local evidence to approve a common search family.** The records are suggestive of orthographic variants; they do not establish that relationship independently of normalization. This is not a claim that the brands are distinct. The directory and canonical brand IDs were themselves derived by normalization, so using those IDs to validate the new union would be circular. No external sources were refreshed or consulted to fill the missing relationship.

The production lookup introduced in section 23 behaves as follows:

1. On first use it scans the **12,239-entry existing brand directory**, applying NFKD/combining-mark folding, lowercase, ampersand expansion and punctuation normalization to generate the query-family key.
2. It separately recreates historical Python ASCII token extraction on each original name. Whitespace/hyphens/punctuation are removed when those tokens are joined into the historical address. Repeated vowels are **not** collapsed or corrected. Häagen-Dazs retains two a characters in the folded key; its one-a historical address results from dropping ä, not a general vowel-equivalence rule.
3. Each folded key maps to its observed historical addresses, plus the folded key itself. Equivalent input spellings reach the same map in both directions. On this directory, **133 folded names** have more than one candidate address; maximum **3 total candidate keys**. The algorithm has no separate fixed cap; the observed directory determines the bound.
4. Corresponding intelligence entries are loaded and accepted if their display name folds to the requested key. Product refs and exact-name refs are unioned and facets combined. It does **not** check manufacturer, verified alias, shared GTIN, market relationship or independent product-family evidence before unioning.
5. Directory mapping is cached once, loaded files are cached, and resolved brand-entry promises are cached by key. First directory traversal is proportional to directory-name volume; uncached entry resolution is proportional to candidate keys and returned refs/name metadata. Brand-prefix recognition performs lookups for query prefixes. Warm entry access avoids rebuilding that map/union. There is no 73,300-product scan on every keystroke. No fresh timing benchmark was run at this stop.

The exact folded-name check rejects near spellings with different folded keys, but it cannot distinguish two independently unrelated brands whose names fold to the **same** key. Current negative tests cover different folded keys and historical-address collisions; they do not establish the additional same-folded-name, unrelated-family safeguard requested in this continuation.

### Production-versus-test verdict and required stop

It is **not established that production retrieval is correct**, so this continuation does not declare the old audit stale or replace its expected family using the production union itself. It is also not established that Burgen/Bürgen are distinct. The completeness metric is understood, but independent equivalence and safe union limits remain unproven.

The user's section 27 explicitly requires stopping if **Burgen/Bürgen equivalence remains uncertain** or **safe historical-key lookup cannot be established**. Those conditions apply. The instruction to avoid production/test edits before establishing the contract was followed. **No production or test correction was made.** Expected 100 remains 100; no three-to-eight assertion change, sample removal or named patch was introduced. A conservative lookup redesign and its positive/negative tests were not implemented after this explicit stop; the current dirty lookup is preserved for further source work and is not approved for release.

### Acceptance and protected-state disposition

| Gate | This continuation |
|---|---|
| Focused tests, including new same-folded-name negatives | Not run or edited after the pre-edit evidence stop. Historical **122/122** remains the prior result. |
| Fresh complete suite | Not run. Historical **1,203 total / 1,202 pass / 1 fail / 0 skip**, **562,540.1032 ms**, remains the latest suite result. |
| Broad search/concept and catalogue/canonical audits | Not run. |
| Complete seven-viewport matrix | Not run. |
| Final rendered consistency | Not run. |
| Final rendered brand audit | Not run. |
| Final collision/punctuation/diacritic audit | Not run; read-only reachability observations are not acceptance. |
| Performance benchmarks | Not run; no threshold, timeout or retry changed. |
| Local source commit | Not created; staging empty and dirty tree preserved. |

All **40 production/data hashes match the end of the previous continuation**. OFF SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. Read-only KFC normalized calculation remains **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**. Protected OFF, McDonald's, AFCD, AUSNUT-derived semantics, deployment and configuration paths have no Git diff. Remote pre-commit verification was not reached; section 23's TEST/My Data metadata checks remain historical and are not claimed as fresh. Neither deployed application nor My Data storage was accessed.

This continuation changes **only this review report**. The accumulated tree remains **26 modified tracked + 18 new = 44 files**; tracked-only diff remains **358 insertions / 156 deletions**. Whitespace, status, name/status and stat were rechecked; full tracked diff was captured. Earlier accumulated review remains preserved, but no final commit-acceptance review is claimed at this evidence stop. There are no new protected changes, named production patches or temporary browser/capture files in the source tree. Evidence stays outside the repository:

- `%TEMP%/hec-burgen-source-diagnosis.json`: all raw records and exact query outcomes.
- `%TEMP%/hec-burgen-metadata-diagnosis.json`: historical indexes, directory entries, canonical identities and missing evidence fields.
- `%TEMP%/hec-burgen-preserved-hashes.json`: 40/40 unchanged production/data hashes.
- `%TEMP%/hec-burgen-final-accumulated.diff`: accumulated tracked diff at the stop.

## 25. Approved Burgen/Bürgen metadata and evidence-gated lookup continuation

### Preflight and newly authorized evidence

The required branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, version 0.6.33 and source cache v5 were confirmed. The existing dirty foundation and every prior repair were preserved. Initial whitespace check passed; no reset, restore, clean, stash, rebuild or source refresh occurred.

**The previous Case C evidence stop is resolved by Myron's authoritative product decision.** Myron independently reviewed the official Australian brand site (`https://www.burgen.com.au/`) using Burgen naming and Bürgen consumer branding, Australian Woolworths titles/descriptions using both spellings, and Coles brand/category naming. This continuation accepts that supplied decision; it did not browse or refresh those sources. No unprovided Woolworths/Coles listing URLs, retrieval dates or source hashes were invented.

### Centralized search-family evidence

`entity-registry.js` now contains two explicit metadata records, each with authority and basis:

- **verified-brand-alias**: Burgen ↔ Bürgen, backed by Myron's independently reviewed Australian-facing evidence.
- **historical-index-compatibility**: Häagen-Dazs ↔ Haagen-Dazs, backed by the protected importer's known key mismatch and the user's explicit instruction to retain both reasonable spellings.

These metadata records authorize search-family widening only. There are no named branches in ranking, cache handling, selection or serving code. Product IDs, GTINs, source spellings, display names, packs, variants and nutrition are not rewritten by alias resolution.

The shared registry uses NFC, lowercase and punctuation/spacing equivalence while retaining accents for **unapproved** brand spellings. Only spellings in an approved metadata record resolve to that record's shared search-family key. Thus `Cote` and `Côte` have distinct keys; Burgen/Bürgen and the approved historical pair share their respective keys. The directory-to-historical-address map uses this policy rather than unrestricted folded-name equality. Historical ASCII extraction remains an index-address compatibility operation. Address candidates are derived from names already in the shipped directory, then entries are checked against the approved search-family key. The map and resolved entries remain cached; no per-keystroke full-product scan was added.

`food-catalogue.js` uses the same policy for registered brand lookup, prefix matching, membership and brand-sensitive duplicate evidence. The complete brand-plus-product collision exception now preserves unapproved diacritic spelling; Carman's positive behavior remains. `preserveSearchSpelling` restores unambiguous original accented tokens after quantity parsing in submitted-model and runtime explicit lookup paths. It preserves quantity removal and avoids treating the parser's folded text as permission to switch brand families. The production-handler unit fixture was supplied the actual registry dependency used by that handler.

### Completeness audit reconciliation

The failing assertion remains **100**; its sample remains the same 100 deterministic historical brand buckets with 2–500 refs. `scripts/audit_open_food_facts_au.js` now independently derives the allowed family from explicit registry evidence and exact source spelling. It does not use the production lookup's returned union to define expected membership.

For each sample it verifies all expected source IDs, absence of unexpected IDs, stable source brand/name/barcode fields, unchanged GTIN canonical IDs, unique returned source IDs, full paginated totals, and an exact-product query from that historical bucket. Approved aliases may span multiple buckets. The former Burgen three-record bucket therefore expects its explicitly approved family, including the five Bürgen records, while all eight remain distinct. Neither 3 → 8 nor 100 → 99 was substituted mechanically in a test assertion. The unchanged completeness test now passes **100/100**, with **zero unexpected-family contamination**; the helper also performs **100 exact-product checks**.

### Focused verification

Command: `node --test --test-concurrency=1 tests/product-name-reachability.test.js tests/catalogue-punctuation-reachability.test.js tests/australian-catalogue-foundation.test.js tests/search-session-root-cause-repair.test.js tests/post-deployment-iphone-integration.test.js tests/spread-measure-acceptance.test.js tests/off-brand-index-normalization.test.js tests/open-food-facts-au-catalogue.test.js tests/catalogue-search-intelligence.test.js`.

Result: **234 tests / 234 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **37,599.6696 ms**, exit 0. Evidence: `%TEMP%/hec-approved-alias-focused.tap`.

The ten direct OFF/alias tests cover approved metadata types, both Burgen spellings and all eight real GTINs, Häagen-Dazs NFC/NFD/unaccented/hyphen variants, unapproved same-folded Côte/Cote separation, an exact leading-accent historical address without an unapproved unaccented alias, pagination, cache reuse, OFF query resets, brand membership and collision negatives, and the protected Abbott's/Carman's/Häagen-Dazs targets. Existing automatic punctuation samples, Rowan competing-brand rejection and spread controls also pass. This does not prove all runtime UI cache/revision paths use the new identity policy.

Exactly one fresh complete suite was started after the focused pass with `node --test --test-concurrency=1 tests/*.test.js`. No production or test changes have been made since that run began.

### Additional architecture finding: required stop

While the full suite was running, source review found legacy UI query ownership still using `C8.corrected`, which removes diacritics:

- `alpha06.js:ss633BeginTyping` compares that folded query to decide whether to advance the query revision.
- `alpha06.js:au633LoadBrand` reuses a prior brand state when the folded queries and revisions match.
- `alpha06.js:au633BrandQueryCurrent` also accepts currentness by folded query comparison.

A read-only VM diagnostic executed the **actual current `au633LoadBrand` production function** with registered synthetic unapproved brands `Cote` and `Côte`, prior query `Cote`, revision 7 and a plain-brand source record. The registry reports distinct keys (`cote`, `côte`) and distinct intended brand entities. Calling the handler with `Côte` nevertheless returns the previous `Cote` state and renders its previous record, because both `C8.corrected` comparisons are `cote`. No new OFF lookup occurs in that early-return branch.

Evidence: `%TEMP%/hec-approved-alias-cache-diagnostic.json`, including both intents, keys, comparison values, returned-state identity and returned source ID. This is a deterministic execution of the UI cache handler, **not** a completed rendered browser audit. The OFF/registry isolation tests passing does not negate this separate UI defect.

The user's stop condition for architecture still relying on unsafe global folding applies. **The current UI cache ownership is not safe for unapproved same-folded brand names.** No further production/test repair or acceptance gate was attempted after this finding. The already-running full suite was allowed to finish for exact totals. No commit is authorized by the current acceptance state. Further source work must propagate the evidence-aware query identity through UI cache/revision/currentness checks and add the missing same-folded-brand UI transition regression while retaining approved aliases.

### Protected state and source disposition at the architecture stop

Compared with the previous continuation's saved production/data hashes, **36 of 40 match**. The four changed files are exactly alpha06.js, entity-registry.js, food-catalogue.js and off-catalogue.js. Generated Australian catalogue, supplemental/curated facts, serving code and protected data match their saved bytes. Hash evidence: `%TEMP%/hec-approved-alias-final-hashes.json`.

OFF source SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. KFC normalized payload recalculation remains **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**. Protected OFF/McDonald's/AFCD/KFC payloads, AUSNUT-derived semantics, deployment and configuration paths have no Git changes. Remote pre-commit verification was not reached: the last reported TEST **82c82d3a2a9b777abc8ce5b1332651c9c3229d5c**, TEST cache **v25**, and My Data **4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709** checks remain historical, not fresh claims. No deployed application or My Data storage was accessed.

The accumulated tree is **45 files: 27 modified tracked + 18 new**, tracked-only **+400/-161**, source version **0.6.33**, cache **v5**, required branch/HEAD unchanged. Status, whitespace, stat, name/status and full tracked diff were captured; the new evidence/lookup/matching/audit changes were reviewed against the earlier accumulated review. The unresolved UI cache finding is the material review blocker. No timeout, retry, sample reduction, protected data mutation, deployment overlay or temporary browser evidence was added. Full tracked diff evidence: `%TEMP%/hec-approved-alias-final-accumulated.diff`.


### Fresh complete-suite result and remaining gates

Exactly one fresh run of `node --test --test-concurrency=1 tests/*.test.js` completed on the preserved production/test bytes: **1,207 total / 1,207 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **605,195.8108 ms**, exit **0**. Evidence: `%TEMP%/hec-approved-alias-full-suite.tap`. No production/test edit occurred while it ran, and no second full run was started.

This is a valid suite pass, **not complete product acceptance**: the read-only UI cache reproduction exposed a transition missing from the current test coverage. The explicit architecture stop remains active independently of the suite result.

| Remaining gate | Status |
|---|---|
| Broad 73,300-product search/concept audit | Not run after architecture stop. |
| Full catalogue/canonical audit | Not run after stop; no fresh broad zero-merge claim. |
| Separate brand-alias/historical-key broad audit | Not run. Focused 100/100 completeness and direct positive/negative checks passed. |
| Complete seven-viewport matrix | Not rerun; previous pass predates current production changes. |
| Final rendered preview → Search → selection consistency | Not run. |
| Final rendered brand audit | Not run. |
| Final rendered collision/punctuation/diacritic audit | Not run. The cache-handler diagnostic is not represented as a rendered pass/failure. |
| Final performance benchmarks | Not run; thresholds unchanged. |
| Source commit | Not created. Nothing staged; all accumulated work preserved. |

The next source correction must make query revision, brand-cache reuse and async-currentness distinguish unapproved same-folded spellings while preserving approved alias equivalence. The evidence-backed Burgen/Bürgen decision is settled; no further external evidence is needed for that pair. The unresolved issue is UI query ownership.

## 26. Exact UI query ownership repair: rendered missing-shard stop

### A. Preflight and preservation

The 2026-09-09 continuation read Myron's latest instructions from attachment `24906ef1-4e82-41a5-a321-2b02ef5b3d6a/pasted-text.txt`. Branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, version 0.6.33 and source cache v5 remain unchanged. The intentionally dirty foundation tree was preserved. Initial and final whitespace checks passed. No reset, restore, stash, clean, source refresh, push or deployment occurred.

### B. Original reproduction and root cause

The prior section's VM reproduction is now supplemented by a genuine Edge **152.0.4191.66** reproduction at **320×568, 390×844 and 430×932**. The new `scripts/audit_query_ownership_edge.js --baseline` uses the established local TEST-origin router with service workers blocked. Synthetic Cote/Côte records exist only in disposable browser memory; no protected source file is changed. In each viewport, submitting Cote, waiting for its results, and replacing it with Côte retained the old revision and old Cote brand state. All three baseline contexts met the routing checks, including **0 live TEST fallthrough**. Baseline evidence: `%TEMP%/hec-query-owner-baseline/report.json` and the three PNGs beside it.

The shared universal and federated controllers treated generic corrected text as query identity. UI typing, source-context reset, brand-state reuse, older preview caches, concept reuse and async tickets inherited that equivalence. This permitted a new accented query to inherit the previous result owner even though registry/OFF matching kept the brands distinct.

### C–E. Implemented identity, cache and async changes

- `food-catalogue.js`: universal preview revisions compare exact raw input; committed async tickets store raw input. Search transitions and federated revisions use exact input, including case, whitespace and Unicode spelling changes. Matching normalization remains a separate field and matching operation.
- `alpha06.js`: changed raw input advances the central revision and preview revision, clears submitted/selected/source/quantity/error owners and rendered surfaces, retires brand state and stable preview ordering, and advances the federated owner. Clear/reset and programmatic render entry synchronize through the same typing controller.
- Context, intent and product-match caches use exact query text with the existing data revision where applicable. Indexed brand results require the same state object, exact owner query and current revision. OFF result snapshots carry their captured owner query and federated revision. Shared record, shard, canonical, source and brand-index caches remain intact.
- OFF await guards check request token, federated revision, central revision and exact input. Online requests retain exact input through the existing abort/token/revision guards. Delayed previews capture the exact owner. Explicit product hydration and guided concept/source enrichment now check the central owner in addition to their existing local request tokens. Brand discovery/pagination success, error and completion paths reject retired owners. Removed DOM controls are rejected by the main universal activation handler.
- Approved alias and historical compatibility metadata were not changed. No synthetic probe spelling, barcode or product exception was added to production.

The implementation has not completed acceptance. In particular, syntax checks and the partial rendered evidence below are not substitutes for the unrun focused, complete-suite or broad checks.

### F. Targeted rendered result and focused tests

The repaired command `node scripts/audit_query_ownership_edge.js` ran once and exited **1** at the final routing check of **320×568**. Every interaction assertion before that check completed:

| Transition | Previous revision | New revision | Returned family |
|---|---:|---:|---:|
| Cote → Côte | 1 | 2 | 2 synthetic Côte records only |
| Côte → Cote | 2 | 3 | 2 synthetic Cote records only |
| resume → résumé | 4 | 5 | 2 synthetic résumé records only |
| résumé → resume | 5 | 6 | 2 synthetic resume records only |
| Burgen → Bürgen | 7 | 8 | Same 8 distinct real catalogue identities |
| Häagen-Dazs → Haagen-Dazs | 9 | 10 | Same 29 real catalogue identities |

The controlled old Cote response was released after Côte completed at revision 12; it did not change the current rows/revision. The reverse résumé → resume late-response probe likewise preserved revision 14 and current rows. The McCain-specific query → clear → Burgen path, Burgen → Milk generic submission, and character-by-character Côte entry completed. Clear input had revision 16 and no guided/source state. Milk submitted at revision 18 with generic-concept intent. Rapid Côte submission completed at revision 23 with its own two records. Asserted transitions had no overflow.

**Exact failure:** `AssertionError: 162 !== 161` in `requireEvidence` from the unchanged `scripts/audit_physical_form_measures_edge.js`, called by the new audit at its final viewport evidence check. Saved routing evidence:

- 162 same-origin requests; 161 successful local fulfillments.
- Missing asset request: `https://mlwes-hec-test.github.io/data/open-food-facts-au/intelligence/h%C3%A4.json`.
- Local router error: ENOENT for `data/open-food-facts-au/intelligence/hä.json`; it returned **502**.
- Two failed-asset entries describe that one request: the missing-file error and response status 502.
- One 502 console error; zero page errors; `liveFallthrough` counter **1**.

The route handler's error branch returns a local 502 without adding the request to its successful-routing set. The response observer therefore increments its fallthrough counter. This evidence does **not** establish a live TEST network fetch; it does establish failure of the required zero-fallthrough/zero-failed-assets contract. No zero-fallthrough acceptance is claimed for the repaired run.

Read-only source inspection identifies the relevant existing path: `recogniseBrand` tries decreasing accent-preserving brand prefixes, `indexedBrandKeys` falls back to an unknown key, and `intelligence` constructs a two-character shard path and catches load failure. A speculative Häagen prefix can therefore request the absent `hä.json`, even while the complete approved family resolves correctly through historical addresses. This OFF code predates the current ownership repair and was not edited after the failure. A follow-up must establish the correct manifest/directory-aware lookup behavior; adding a fabricated protected shard or ignoring the asset error is not accepted.

Evidence: `%TEMP%/hec-query-owner-edge/report.json` and `320x568.png`. The repaired **390×844 and 430×932** contexts were **not started**. No retry or timeout/routing relaxation occurred.

New regression coverage was authored in `tests/query-ownership.test.js` and added to the production typing-controller fixture. It covers exact raw revisions, snapshots, approved/unapproved spellings, return-to-previous-query tickets, production brand cache/deferred hydration, OFF await guards, delayed previews, explicit-product hydration and guided enrichment. The former regression expecting differently normalized spellings to share a revision was replaced with same-exact-input continuation plus changed-spelling rejection. The existing explicit-product fixture was supplied its new current owner. **These focused tests were not run**, because the rendered gate failed first. Production syntax checks passed before the rendered run. Historical focused 234/234 and full 1,207/1,207 totals remain in section 25 and do not validate these edits.

### G–M. Later acceptance gates

| Gate | Current result |
|---|---|
| Fresh complete suite | **Not run**; total/pass/fail/skip/duration are not available for this tree. |
| Broad 73,300-product concept/search audit | Not run after stop. |
| Catalogue/canonical identity audit | Not run after stop. |
| Broad alias/historical and query-ownership audits | Not run; partial targeted evidence only. |
| Complete established seven-viewport matrix | Not run. Existing scenarios, timeouts, retries and controls unchanged. |
| Final clean preview → submitted → selection consistency | Not run. |
| Final rendered brand-only acceptance | Not run; partial first-phone transitions are not final acceptance. |
| Final punctuation/diacritic/collision acceptance | Not run; no complete Carman/Abbott/hyphen/collision acceptance claimed. |
| Established performance benchmarks | Not run; thresholds unchanged. Exact equality/revision checks are cheap by design, but no measured performance claim is made. |

### N–P. Protected state, diff and commit disposition

Read-only comparison against the previous continuation's saved 40 production/data hashes shows **38 unchanged**. The only changed production modules are **alpha06.js** and **food-catalogue.js**. Registry/OFF approved-alias and compatibility bytes, generated catalogue, serving repairs and protected data match their preceding bytes. Evidence: `%TEMP%/hec-query-owner-final-hashes.json`.

Protected OFF source SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. KFC normalized payload SHA recalculation remains **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**. Git comparison for protected OFF, AFCD, McDonald's/KFC raw data, product-serving semantics, deployment and configuration paths remains empty. Source version/cache remain **0.6.33/v5**.

Fresh public remote pre-commit verification was not reached. Last historical TEST HEAD is `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`; My Data HEAD is `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`. Neither is represented as freshly verified. No deployed application or My Data storage was opened or changed; all Edge contexts were disposable and locally routed.

Status, whitespace, stat, name/status and accumulated tracked diff were captured. The current continuation's production diff was reviewed together with the preceding accumulated foundation review; acceptance remains blocked by the explicit rendered failure and unrun tests. Full tracked diff evidence: `%TEMP%/hec-query-owner-final-accumulated.diff`; focused diff capture: `%TEMP%/hec-query-owner-changes.diff`. The tree has **47 files: 27 modified tracked + 20 new**; tracked-only diff is **+446/-203**, excluding all new-file contents. All captures and diagnostics remain outside Git under TEMP. No protected-data, deployment or catalogue-identity compensation was introduced, and no production/test edits occurred after the rendered failure.

**No local commit was created or staged.** HEAD remains `63be3825efb277cda8633f964839825f24d08c63`; the required parent/message are reserved for a later fully green acceptance. The tree intentionally remains dirty. Every earlier historical stop is retained.

## 27. Intelligence address and routing classification repair: focused-test stop

### A. Preflight

Read the complete latest instruction attachment `7421d7a1-a2fd-4867-b16a-ec92a5070c06/pasted-text.txt`. Before editing, branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, version 0.6.33 and source cache v5 matched. The intentionally dirty foundation tree was preserved. All 40 saved production/data hashes from section 26 matched at entry. Initial whitespace check passed. No reset, restore, checkout, clean, stash, refresh, push, deployment or My Data access occurred.

### B. Exact pre-edit request trace

Before changing production, tests or routing, a disposable genuine Edge **152.0.4191.66** context at **320×568** submitted the exact input **Häagen-Dazs** through the actual UI. A browser-memory fetch wrapper recorded intelligence URLs, current input and JavaScript call stacks without altering request results. Both `ha.json` and the missing `hä.json` were requested while the input remained Häagen-Dazs. The family still returned 29 identities because its complete key resolved before the speculative shorter prefix. The original router recorded **58 same-origin requests / 57 successful local fulfillments / fallthrough counter 1**, with the local missing-file error and local 502 entries. This deliberately requested diagnostic reproduction predates the repair and is not post-repair acceptance.

Exact call chain, confirmed by the recorded fetch stack and source inspection:

`search('Häagen-Dazs') → recogniseBrand → brandEntry → readBrandEntry → indexedBrandKeys → intelligence → prefix → load → fetch`

`recogniseBrand` examines decreasing word prefixes. Its complete prefix `häagen dazs` becomes the approved family key `haagendazs`; the directory resolves protected index keys `haagendazs` and `hagendazs`, both stored in `ha.json`. The next, shorter prefix `häagen` has no approved alias evidence and no matching directory entry. The old `indexedBrandKeys` fallback returned that accent-preserving key unchanged. `intelligence` used `prefix(key)`, defined as `(String(key).slice(0,2)+'__').slice(0,2)`, to construct `intelligence/hä.json`.

| Layer | Actual value / rule |
|---|---|
| Exact UI input | `Häagen-Dazs`; retained as query ownership |
| Generic search normalization | `haagen dazs`; NFKD plus combining-mark removal and ASCII token normalization |
| Brand matching text | `häagen dazs`; NFC normalization, lowercase and punctuation spacing; unapproved accents preserved |
| Complete approved family key | `haagendazs`, backed by explicit historical compatibility metadata |
| Shorter speculative key | `häagen`, without approved alias evidence |
| Broken storage fallback | Unchanged `häagen` rather than an established historical index address |
| Filename prefix | First two UTF-16 code units: `h` U+0068 and `ä` U+00E4 |
| Missing filename | `intelligence/hä.json` |

Raw input code points are **U+0048 U+00E4 U+0061 U+0067 U+0065 U+006E U+002D U+0044 U+0061 U+007A U+0073**. The speculative key code points are **U+0068 U+00E4 U+0061 U+0067 U+0065 U+006E**. The prefix helper itself performs no NFC/NFD conversion or accent folding. Here both prefix characters are BMP characters, so the two code units also represent two code points. The path came from a speculative brand-matching key, not directly from the raw UI input, the generic folded query, or an approved canonical brand address.

Evidence: `%TEMP%/hec-shard-pre-edit-trace.json`, containing raw text, normalization, key/code-point decomposition, full request stacks and routing diagnostics.

### C. Actual intelligence inventory and generation contract

The local intelligence directory contains **509 files, zero non-ASCII filenames**. Relevant `h` files are:

`h_.json, h2.json, ha.json, hb.json, hc.json, hd.json, he.json, hi.json, ho.json, hp.json, hr.json, hs.json, ht.json, hu.json, hw.json, hy.json`.

There is no `h.json`, `hag.json`, `hä.json` or longer `haag...` shard filename. Every shard uses a two-character prefix, padded with underscores for short keys.

The protected Python importer uses ASCII `[a-z0-9]+` tokens after lowercase and ampersand expansion, then joins those tokens for `brandKey`. It does **not** fold accented letters into their base letters. The intelligence builder uses the stored product `brandKey` for brand entries; its concept keys use normalized ASCII text. Both feed the same two-character prefix grouping. Given this committed snapshot and build path, `hä.json` cannot be generated. No builder was run and no generated or protected file was changed.

Inside the actual `ha.json`, `haagendazs` names **Haagen-Dazs** with **10 refs**, while `hagendazs` names **Häagen-Dazs** with **19 refs**. Their approved union remains **29 distinct records**; compatibility is about retrieval, not input ownership.

### D–E. Verdict and separate repairs

**Case D: production address defect plus audit classification defect.** It is not a missing intended Unicode-generated asset. The speculative raw-accent filename violated the actual storage contract. Separately, the router's catch branch fulfilled its own 502 without registering the request as locally handled, so its response observer incremented the live-fallthrough counter. The original evidence therefore did not demonstrate a live TEST network request.

Production changes in `off-catalogue.js`:

- Centralize the existing historical ASCII brand-address calculation in `historicalBrandIndexKey` and use it both for source-directory addresses and unknown-key fallbacks. For example, `häagen` addresses `hagen` in `ha.json`; exact entry membership still compares the original accent-preserving family key. Storage normalization does not authorize new aliases.
- `intelligencePath` accepts only the normalized ASCII address vocabulary. A cached set from `manifest.intelligenceShards` distinguishes an unlisted prefix from a required file.
- An unlisted intelligence prefix returns an empty index lookup without issuing a file request. A manifest-listed file is required; its load or JSON failure propagates instead of being silently turned into no matches.
- Preserve record/shard/brand caches and the exact-input UI ownership architecture. No named production branch, dummy shard, generated data change or live fallback was added.

Shared router changes in `scripts/audit_physical_form_measures_edge.js`:

| Category | Evidence / acceptance |
|---|---|
| Successful local asset | `localFulfilled`; actual local bytes and hash retained |
| Expected optional local miss | `optionalLocalMisses`; local 404 only for an absent, unlisted, two-character ASCII intelligence/search/barcode index prefix with a present manifest inventory |
| Required local asset missing/error | `requiredAssetMisses` and `failedAssets`; local 502, fatal acceptance failure |
| Actual unhandled or service-worker response | `liveFallthrough`; fatal acceptance failure |

`localResponses` counts all completed local responses. Acceptance reconciles total requests against local responses and the three local categories, while requiring zero required failures, zero actual live fallthrough, zero page errors and zero unexpected asset/console errors. Only the exact 404 console signature for a recorded optional miss is allowed. Missing listed indexes, product shards, scripts, unknown assets, Unicode filenames and unsafe paths are not treated as optional. No `route.continue`, `route.fallback`, remote fetch, timeout adjustment or retry change was introduced.

The OFF synthetic fixture now declares its actual intelligence files in a manifest. New generic tests cover ASCII/accented leading inputs, NFC/NFD, approved aliases, unapproved pairs, cache reuse, required-shard errors and all four routing categories. No protection or zero-live-fallthrough assertion was weakened.

### F. Required focused suite: STOP

Exactly one focused command ran:

`node --test --test-concurrency=1 tests/query-ownership.test.js tests/intelligence-shard-routing.test.js tests/product-name-reachability.test.js tests/catalogue-punctuation-reachability.test.js tests/australian-catalogue-foundation.test.js tests/search-session-root-cause-repair.test.js tests/post-deployment-iphone-integration.test.js tests/spread-measure-acceptance.test.js tests/off-brand-index-normalization.test.js tests/open-food-facts-au-catalogue.test.js tests/catalogue-search-intelligence.test.js tests/catalogue-search-regression-recovery.test.js tests/universal-food-search-source-branching.test.js tests/rc3-food-search-corrections.test.js`

Result: **344 total / 339 passed / 5 failed / 0 skipped / 0 cancelled / 0 todo**, duration **49,611.1999 ms**, exit **1**. Evidence: `%TEMP%/hec-shard-routing-focused.tap` (Node's default text reporter despite the filename suffix).

All 22 previously unrun `query-ownership.test.js` cases passed, including raw accented/approved/case/whitespace revisions, old-ticket rejection, production brand-cache hydration, OFF awaits, delayed previews, explicit-product awaits and guided enrichment. The new shard/routing file passed **16 of 17** cases. Approved alias and historical-index tests passed. These partial successes do not override the five suite failures.

| Failed test | Exact failure and read-only diagnosis |
|---|---|
| `intelligence-shard-routing.test.js`: shorter accented prefixes use historical ASCII addresses without authorizing an alias | `TypeError: Cannot read properties of null (reading 'name')`. The synthetic fixture provides one ref per brand. `recogniseBrand('Éclair Market')` has residual text and no exact product-name ref, and the existing recognizer deliberately requires at least two refs for that non-exact prefix. The test expected an entry without meeting that existing contract. |
| `post-deployment-iphone-integration.test.js` U05: an already loaded catalogue snapshot joins Search and remains selectable | Static regex still requires the removed folded `C8.corrected(psLargeState.query) === C8.corrected(raw)` ownership expression. The preserved production repair instead checks `psSearchRevisionCurrent` with the captured owner. The assertion fails before its selection checks. |
| U06: current brand preview snapshot wins over stale submitted and loaded copies | `TypeError: Cannot read properties of undefined (reading 'food')`. The fixture control lacks `isConnected`; the preserved handler now rejects disconnected controls before selection. |
| U07: missing matching snapshot preserves both loaded-record fallback routes | Expected activation `true`, received `false`; the same fixture lacks `isConnected`. |
| U08: stale preview and unrelated records cannot replace the requested current identity | `TypeError: Cannot read properties of undefined (reading 'food')`; the same early disconnected-control rejection leaves no selection call. |

These diagnoses come from the saved errors and source inspection, not a repaired rerun. No failed assertion was removed, no fixture corrected, and no production/test file edited after failure. The next continuation must reconcile the test contracts while retaining real selection/snapshot behavior and disconnected-control rejection; the current tree is not accepted.

### G–N. Gates not reached

| Gate | Current disposition |
|---|---|
| Targeted genuine Edge at 320×568, 390×844, 430×932 | **Not run after repair**, because focused tests failed. The pre-edit trace is not acceptance. |
| One fresh full suite | **Not run**; current total/pass/fail/skip/duration unavailable. Historical 1,207/1,207 predates the preserved UI changes. |
| Broad search/concept, canonical, alias/history, query ownership and shard integrity | Not run after stop. |
| Complete established seven-viewport matrix | Not run; viewports/scenarios/timeouts unchanged. |
| Final clean preview → submitted → selection consistency | Not run. |
| Final rendered brand-only audit | Not run. |
| Final punctuation/diacritic/collision/ownership audit | Not run. |
| Established performance benchmarks | Not run; thresholds unchanged. No final performance pass claimed. |

### O–Q. Protected state, review and source disposition

Read-only post-stop hashes match **39 of 40** saved production/data files; the only changed module in that inventory is **off-catalogue.js**. In particular, alpha06.js and food-catalogue.js retain the newest exact-input ownership bytes. Evidence: `%TEMP%/hec-shard-routing-final-hashes.json`. Router and test changes are separately covered by the Git diff and new-file review.

Protected OFF source SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. KFC normalized payload recalculation remains **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**. Protected OFF/McDonald's/AFCD/KFC data, product-serving semantics, deployment and configuration paths have no Git changes. AUSNUT-derived data and serving code retain their saved bytes. Version **0.6.33**, source cache **v5** and required HEAD are unchanged.

Remote pre-commit verification was not reached. Last historical TEST HEAD remains recorded as `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, TEST cache v25, and My Data HEAD `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`; no fresh remote verification is claimed. No deployed application/My Data storage was accessed, and external sources were not refreshed.

Final status, whitespace, stat, name/status and accumulated diff were captured and the shard/router changes reviewed with the preserved foundation changes. `git diff --check` passes. The accumulated tree contains **49 files: 28 modified tracked + 21 new**, tracked-only **+481/-210**, excluding all new files. Evidence: `%TEMP%/hec-shard-routing-final-accumulated.diff`. No diagnostic captures or dummy shards were added to the repository. This report preserves every earlier stop, including section 26's original routing misclassification as historical evidence.

**No commit or staging occurred.** HEAD remains `63be3825efb277cda8633f964839825f24d08c63`; the required one-commit message remains `Build Australian catalogue foundation` only after all future gates pass. The working tree intentionally remains dirty.

## 28. Five-failure test reconciliation continuation

### Preflight and individual contract decisions

Read the complete latest attachment `976424fa-308d-4947-9174-4245eb7b1db4/pasted-text.txt`. Before editing, branch `alpha-0.6.33`, HEAD `63be3825efb277cda8633f964839825f24d08c63`, version 0.6.33 and source cache v5 matched. All 40 saved production/data hashes from section 27 matched and `git diff --check` passed. The five failures were inspected and individually reported before editing. Only two test files were changed during reconciliation; production, router, catalogue data, generated intelligence and the exact-input ownership repair were not modified.

| Failure | Exact old expectation and actual result | Production function / verdict | Reconciled contract |
|---|---|---|---|
| `intelligence-shard-routing.test.js`: shorter accented prefixes use historical ASCII addresses without authorizing an alias | `assert.equal(entry.name,'Éclair')`; actual entry was null, causing TypeError before assertion | `recogniseBrand`: fixture had one ref, residual `Market`, no matching exact-name refs. The existing non-exact range recognition threshold is two refs. Manifest/address metadata were present and valid. Fixture was undersized for its intended range scenario. | Parameterize fixture product count; use two distinct refs for this range probe, keep directory counts consistent, assert both exact refs and residual text. Retain default one-product fixtures and add a separate exact-one-product success / unsupported non-exact-prefix null test. |
| `post-deployment-iphone-integration.test.js` U05: an already loaded catalogue snapshot joins Search and remains selectable | Regex demanded `C8.corrected(psLargeState.query) === C8.corrected(raw)`; source did not match | Submitted-search snapshot admission: assertion required the retired unsafe ownership rule. Test assertion was obsolete. | Execute the actual admission expression and currentness guard for unapproved and approved query pairs. Assert rejection immediately after input changes, fresh revision, rejection on returning to an old spelling, stable cached record bytes, and successful reuse only under a fresh valid owner. Retain exact selected snapshot/canonical/nutrition assertions. |
| U06: current brand preview snapshot wins over stale submitted and loaded copies | `assert.equal(result.calls[0].food,snapshot)`; no call, TypeError reading food | `us633ActivateControl`: this fixture control had no `isConnected`, so its production guard rejected activation. Fixture failed to represent an attached row. | Supply `isConnected:true` for attached test controls; preserve exact snapshot priority and selected-ID assertions. |
| U07: missing matching snapshot preserves both loaded-record fallback routes | `assert.equal(result.activated,true)`; actual false | `us633ActivateControl`: independently confirmed the same missing DOM property in the fixture used for loaded and OFF-loaded fallbacks. | Attached control fixture; retain both fallback routes, exact record and canonical identity assertions. |
| U08: stale preview and unrelated records cannot replace the requested current identity | `assert.equal(result.calls[0].food,current)`; no call, TypeError reading food | `us633ActivateControl`: independently confirmed the same early disconnected-control rejection, before evaluating the current submitted record. | Attached control fixture; retain stale-preview exclusion and missing-ID no-selection assertions. |

New U09 explicitly sets `isConnected:false` for submitted, current-preview, loaded-record and OFF-loaded cases and requires false activation, zero guided selection calls and no selected result. No production safety guard was removed. No tests were deleted, skipped or reduced to truthy/non-null checks. The actual one-product contract remains covered instead of being silently widened in production.

### Focused result

The same complete 14-file focused set from section 27 ran once. The original five tests remain included; two added negative/minimal-contract tests increase the count from 344 to 346.

**346 total / 346 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **28,931.3187 ms**, exit **0**. Evidence: `%TEMP%/hec-five-reconciliation-focused.tap`. All 22 query-ownership tests and all shard/routing tests passed. Saved production/data hashes still matched afterward.

### Targeted genuine Edge result

`node scripts/audit_query_ownership_edge.js "%TEMP%/hec-five-reconciliation-edge"` ran once after the focused pass. Genuine Edge **152.0.4191.66** passed all three requested viewports.

| Viewport | Local successes | Optional local misses | Required local misses | Live TEST fallthrough | Page errors |
|---|---:|---:|---:|---:|---:|
| 320×568 | 162 | 0 | 0 | 0 | 0 |
| 390×844 | 162 | 0 | 0 | 0 | 0 |
| 430×932 | 162 | 0 | 0 | 0 | 0 |

All failed-asset checks passed. No Unicode `hä.json` route occurred. Each phone tested Cote/Côte and resume/résumé in both directions, approved Burgen → Bürgen retrieval of all eight distinct identities, historical Häagen-Dazs → Haagen-Dazs retrieval of the same 29 identities, fresh query revisions, clear/replace, brand-to-Milk, rapid typing, and controlled old-response release after the new query completed. Old response release did not replace current rows. The synthetic unapproved records existed only in disposable browser memory; real approved-family retrieval used production catalogue data. Evidence: `%TEMP%/hec-five-reconciliation-edge/report.json`, its three PNGs, and `%TEMP%/hec-five-reconciliation-edge.log`.

### Fresh full suite

Exactly one fresh `node --test --test-concurrency=1 tests/*.test.js` ran after both preceding gates passed. No production or test bytes changed while it ran. The completed result and required stop follow.

Fresh complete suite result: **1,253 total / 1,252 passed / 1 failed / 0 skipped / 0 cancelled / 0 todo**, **455,454.8981 ms**, exit **1**. Evidence: `%TEMP%/hec-five-reconciliation-full-suite.tap`. No second full-suite run was started.

The one failure is `tests/stage8a-food-catalogue.test.js:46`, test **30. stale online work is invalidated and only the active query can update results**. Its first three static checks for cancellation, incremented online token and token/abort rejection passed. The final `assert.match` requires this exact obsolete source expression:

`(by("food-search")?.value.trim()||"")!==query`

The production `alpha0631RenderOnlineProgress` guard now reads:

`!psSearchRevisionCurrent(revision,query)||(by("food-search")?.value||"")!==query||!q('#food-library.active')`

Expected: the regex requiring `.value.trim()` matches the source. Actual: it does not match; Node reports `ERR_ASSERTION`, operator `match`. The online search request captures exact raw input and the federated revision/currentness check uses that exact owner. Restoring trimming merely to satisfy this source-pattern assertion would weaken the locked distinction between raw query instances, including whitespace edits. This is a read-only diagnosis of a stale static assertion; it is not treated as a pass. It was not among the five previously failing focused tests or the fixed 14-file focused set.

The existing test was not edited, suppressed or skipped after the failure. Production was not changed and no additional diagnostic execution or acceptance gate was run. The earlier green focused and targeted phone results remain valid within their stated scope; they do not override this full-suite stop.

### Remaining gate disposition after the suite failure

| Gate | Current status |
|---|---|
| Full food-concept/search audit | Not run after stop. |
| Australian catalogue/canonical identity audit | Not run; no fresh broad zero-merge claim. |
| Brand alias/historical compatibility audit | Not run separately; focused and targeted real-family checks passed. |
| Broad query ownership/currentness audit | Not run after stop. |
| Intelligence shard/routing integrity audit | Not run broadly; focused routing and all three phones passed. |
| Complete established seven-viewport Edge matrix | Not run; scenarios, viewports, timeouts and routing strictness unchanged. |
| Final clean preview → submitted Search → selection consistency | Not run after stop. |
| Final rendered brand-only audit | Not run. |
| Final punctuation/diacritic/collision and automatic-sample audit | Not run after stop. |
| Established standalone performance benchmarks | Not run; no thresholds changed. Tests that themselves exercise timing are not represented as completion of this standalone gate. |
| One local source commit | Not created; gate requirements are not satisfied. |

### Protected state and accumulated diff at the stop

All **40 of 40** production/data hashes match the section 27 baseline, including alpha06.js, food-catalogue.js, off-catalogue.js, registry, generated catalogue and serving code. Evidence: `%TEMP%/hec-five-reconciliation-final-hashes.json`. The shared router also received no changes during this continuation. The two intentional test edits are `tests/intelligence-shard-routing.test.js` and `tests/post-deployment-iphone-integration.test.js`; documentation records their old-to-new contract decisions. No production/test edit occurred during the full suite or after its failure.

Read-only OFF manifest source SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. KFC normalized payload recalculation remains **e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2**. Protected OFF/McDonald's/AFCD/KFC raw paths, product-serving semantics, deployment and configuration paths have no Git changes. AUSNUT-derived source facts and serving code retain their saved bytes. Source version remains **0.6.33**, source cache **v5**.

Fresh pre-commit public remote verification was not reached. Historical TEST HEAD `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, TEST cache v25, and My Data HEAD `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709` are retained as historical evidence, not fresh assertions. No deployed application or My Data storage was opened or changed. No external source refresh occurred.

The accumulated tracked diff and new-file set were reviewed with the earlier foundation review and the preserved production/data hashes. The review includes canonical/provenance and alias behavior, source adapters/generated facts, serving evidence, UI ownership, OFF addressing, shared routing, and the focused test reconciliation. The remaining acceptance limitation is the explicit full-suite failure and unrun later gates. Final status, whitespace, stat, name/status and full tracked diff were captured; `git diff --check` passes. Evidence: `%TEMP%/hec-five-reconciliation-final-accumulated.diff`.

Final tree: **49 files: 28 modified tracked + 21 new**, tracked-only **+502/-211**, excluding all new-file contents. Temporary test logs, reports and browser PNGs remain outside Git under TEMP. No dummy Unicode shard, named Cote/Côte production exception, unsafe folded ownership restoration, detached-row guard removal, deployment overlay, timeout/retry manipulation or live routing fallback was introduced.

**No staging or commit occurred.** HEAD remains `63be3825efb277cda8633f964839825f24d08c63`, branch `alpha-0.6.33`. The required parent and `Build Australian catalogue foundation` message remain reserved for a later fully green acceptance. The working tree intentionally remains dirty, and every prior historical stop is preserved.

## 29. Stage 8A behavioral reconciliation and narrow-test stop

### A–C. Preflight, diagnosis and replacement

Read the complete request in `61493704-622b-4997-ba99-fbf5009dfbbd/pasted-text.txt`. Branch `alpha-0.6.33`, committed HEAD `63be3825efb277cda8633f964839825f24d08c63`, version **0.6.33**, cache **v5**, and the intentionally dirty accumulated foundation were preserved. All 40 saved production/data hashes matched section 28 before editing.

The exact old assertion at `tests/stage8a-food-catalogue.test.js:46` required `(by("food-search")?.value.trim()||"")!==query`. Inspection of both HEAD and the working production source conclusively establishes why it is stale:

- HEAD captured online `query` from `.value.trim()` and compared trimmed input in `alpha0631RenderOnlineProgress`. Trimming therefore participated in request ownership and stale-response rejection, as well as providing normalized retrieval text. It did not assign a trimmed value back into the visible search input in these functions.
- The preserved working code captures exact input, records its federated revision, and checks both exact input and revision through `psSearchRevisionCurrent` before OFF/USDA upsert and progress rendering. Cancellation additionally increments the request token and aborts its signal. Candidate snapshot admission checks the captured raw owner and revision.
- Retrieval remains separate: `alpha0631ExternalSearchQuery` derives matching text; `psLargeSearch` may trim its retrieval query while retaining exact `ownerQuery` and both session/federated revisions. Reintroducing trimmed ownership would violate the user-locked whitespace and approved-alias distinctions.

Only `tests/stage8a-food-catalogue.test.js` was edited in code. The source-pattern test was replaced with eight executable tests using extracted, unchanged production cancellation, external-query, online-search, progress/currentness and snapshot-admission functions, together with the real catalogue state functions. Network responses and rendering sinks are controlled fixture boundaries; no network requests occur.

Five transition tests cover `milk` → `milk `, the reverse, `Cote` → `Côte`, `Burgen` → `Bürgen`, and leading-space ` Häagen-Dazs` → `Häagen-Dazs`. They require exact input ownership, same-input revision stability, immediate old-owner rejection before a new request, advancing revisions, no late OFF/USDA upsert or rendering, old local-candidate rejection, reusable cached record identity, successful explicit admission under a fresh owner, and rejection of the original ticket after returning to its spelling. Whitespace cases also assert equal independently derived external matching text and equal positive milk ranking. All five passed. A cancellation test executing the real abort/token path also passed.

Two additional tests attempt to accept OFF while USDA remains pending, change the raw whitespace owner, then require cached OFF retention and late USDA rejection. These two tests failed at their first-render checkpoint, so their subsequent assertions were not reached and their intended coverage is **not established**.

### D. Exact narrow result and stop

Ran once, with test concurrency 1, the exact required files: Stage 8A, query ownership, search-session root-cause repair, intelligence shard routing, and post-deployment iPhone integration.

**162 total / 160 passed / 2 failed / 0 skipped / 0 cancelled / 0 todo**, **2,910.6621 ms**, exit **1**. Evidence: `%TEMP%/hec-stage8a-reconciliation-narrow.tap`.

Both failing tests are declared at Stage 8A line 86 and fail at line 89, `assert.equal(renders.length,1)`:

| Test transition | Expected | Actual |
|---|---:|---:|
| Accepted OFF cache survives `milk` → `milk ` while late USDA cannot render | 1 render | 0 renders |
| Accepted OFF cache survives `milk ` → `milk` while late USDA cannot render | 1 render | 0 renders |

The fixture resolves OFF then awaits two host microtasks before this checkpoint. That is not an explicit completion signal from the VM's render callback; fixture synchronization is a possible cause, but it was not established by additional execution. These failures are not evidence that production must change. No correction, diagnostic rerun or test retry followed. The user's explicit narrow-failure stop applies.

### E–L. Production checkpoint and remaining gates

**No production JS/data/runtime bytes changed in this continuation.** All **40/40** saved production/data hashes still match. Evidence: `%TEMP%/hec-stage8a-reconciliation-final-hashes.json`. Router and audit scripts were not edited. The previous 320×568, 390×844 and 430×932 genuine Edge ownership/routing result remains valid within its recorded scope and was not repeated solely for this test edit.

| Requested gate | Disposition |
|---|---|
| E. Production-byte checkpoint | 40/40 match; test/documentation only. |
| F. One fresh complete suite | Not started because narrow verification failed. Section 28's 1,252/1,253 remains the last historical full run. |
| G. Broad search/concept, canonical and ownership/routing audits | Not run after the stop. |
| H. Complete seven-viewport matrix | Not run; scenarios, routing, timeouts and acceptance checks unchanged. |
| I. Final clean preview → submitted Search → selection | Not run. |
| J. Full rendered brand acceptance | Not run. |
| K. Final punctuation, diacritic, whitespace, collision and automatic samples | Not run; passing narrow behavior is not substituted for final browser evidence. |
| L. Established performance benchmarks | Not run; no threshold changes. |

### M–O. Protected state, diff and commit disposition

Local protected OFF manifest SHA remains **F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176**. Protected OFF, McDonald's, AFCD, KFC raw paths, product-serving semantics, deployment and configuration have no Git changes. All saved source/serving bytes match the previous checkpoint. KFC normalized SHA `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2` is retained as the preceding verified calculation; it was not freshly recalculated after the narrow stop.

The pre-commit public metadata gate was not reached. Historical TEST HEAD `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c` and My Data HEAD `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709` are not claimed as freshly verified. No My Data application/storage access, external source refresh, push or deployment occurred.

Status, whitespace, tracked diff statistics, name/status and accumulated tracked diff were captured. `git diff --check` passes. Current test changes were reviewed against the previously recorded foundation review and unchanged production/data hashes; the final acceptance review of the complete accumulated work remains gated by the failed narrow tests. Evidence: `%TEMP%/hec-stage8a-reconciliation-final-accumulated.diff`.

Tree: **50 files: 29 modified tracked + 21 new**, tracked-only **555 insertions / 212 deletions**; new-file contents are excluded from those line totals. This continuation changed one test file and this report. No trimmed ownership restoration, production Cote/Côte exception, dummy shard, detached-row guard removal, or timeout/retry manipulation was introduced. Historical stops remain intact.

**No staging or commit occurred.** HEAD remains `63be3825efb277cda8633f964839825f24d08c63`, branch `alpha-0.6.33`; the tree remains intentionally dirty. Exactly one `Build Australian catalogue foundation` commit remains conditional on every future acceptance gate passing.

## 30. Closure continuation: deterministic OFF-before-USDA checkpoint

### A–C. Exact diagnosis and reconciliation

Read the complete closure request `4e8d3ddc-0ca7-4bfa-a34d-b5d31acec587/pasted-text.txt`. Required branch/HEAD and all 40 recorded production/data hashes matched before editing. This continuation changes only the two failed tests' shared checkpoint and review documentation.

Both tests (`milk` → `milk ` and `milk ` → `milk`) create the same VM harness: host-controlled OFF and USDA promises, the actual production `runOnlineFoodSearch` and currentness/progress functions, real catalogue revision/snapshot functions, and a synchronous `renderOnlineLibrary` callback that records rendered IDs. The exact release event is `pending.find(request=>request.source==='OFF').resolve([record])`; USDA remains unresolved. The old checkpoint sampled `renders.length` after two `await Promise.resolve()` host continuations.

Before any edit, a disposable trace executed each original fixture. Both recorded this order: OFF and USDA pending → OFF resolve called → host microtask 1 sees zero renders → host microtask 2 sees zero renders → OFF upsert → render callback → actual render boundary sees one render while USDA remains unresolved. Evidence: `%TEMP%/hec-off-usda-boundary-trace.json` and its `.cjs` driver. The VM async function adopts the host promise across realms; two host microtasks do not deterministically signal completion of that adoption and production continuation. Once resumed, production guards, upserts and renders synchronously, before awaiting USDA. There is no timer or first-render aggregator in that path.

**Case A applies to both failures.** Production intentionally renders a current OFF response independently. The new tests were under-synchronised; the trace does not establish a production defect or a USDA priority problem. No source-priority or architecture redesign was undertaken.

The reconciliation saves the existing render callback and wraps it with a promise completion signal. Each test resolves OFF and awaits `offRendered`, which resolves only after the actual callback records the render. The exact one-render, accepted-record identity, cache-retention, fresh raw revision and late-USDA rejection assertions remain unchanged. No arbitrary sleep, timeout, retry, scenario addition or production edit was introduced.

### D–E. Narrow verification and byte checkpoint

Same required five files, run once with concurrency 1: Stage 8A, query ownership, search-session root-cause repair, intelligence shard routing, post-deployment iPhone integration.

**162 total / 162 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **5,357.2202 ms**, exit **0**. Evidence: `%TEMP%/hec-closure-narrow.tap`. Both formerly failing tests reached and passed the late-USDA assertions.

All **40/40** recorded production/data hashes remain unchanged. Evidence: `%TEMP%/hec-closure-production-hashes.json`. The previous three-phone ownership/routing result remains valid within its stated scope and was not repeated solely for this test-only correction.

### F–M. Final acceptance progress

Exactly one fresh complete suite was started after the green narrow result and production-byte checkpoint. Results and remaining existing gates are recorded below when complete. No production/test bytes are being edited during that run. All historical stops above remain preserved.

Fresh complete suite: **1,260 total / 1,260 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**, **642,292.431 ms**, exit **0**. Exactly one full run; no retry. Evidence: `%TEMP%/hec-closure-full-suite.tap`. Production/test bytes remained fixed throughout. The earlier two-test and full-suite stops remain historical; this is the first zero-failure complete result for the current accumulated foundation.

Existing broad gates passed:

- Full search/concept audit: **73,300 protected products**, zero defined violations, **29,066.3578 ms**. Evidence: `%TEMP%/hec-closure-concepts.json`.
- Full catalogue/canonical audit: **73,965 raw inputs / 73,964 canonical records**, zero critical violations and zero unsafe different-GTIN merges; **236 unresolved conflicts remain restricted**. All **20** brand checks and **40** consistency samples passed. Evidence: `%TEMP%/hec-closure-catalogue.json`.
- Existing ownership/currentness/routing audit: all **seven** required viewports passed. Each recorded **162 local successes, 0 optional misses, 0 required misses, 0 live fallthrough, 0 page errors and 0 failed assets**. Real approved aliases retained 8 Burgen/Bürgen and 29 Häagen-Dazs identities; unapproved synthetic pairs stayed independent, and delayed responses did not replace current rows. Evidence: `%TEMP%/hec-closure-ownership/report.json` and seven PNGs. This is the required broad audit after the full suite, not a repetition triggered solely by the test edit.

The complete unchanged responsive matrix is running against `%TEMP%/hec-au-continuation-final-physical.json`; frozen controls have not been regenerated or resampled.

Complete responsive matrix: **PASS, seven viewports × 16 scenarios = 112 scenarios**, plus unchanged accessibility/universal checks. Every viewport recorded **302 local successes, 0 optional misses, 0 required misses, 0 live fallthrough, 0 page errors and 0 failed assets** (2,114 local successes total). Viewports: 320×568, 375×667, 390×844, 430×932, 834×1194, 390×520, 1194×834. Evidence: `%TEMP%/hec-closure-responsive/responsive.json`, log and PNGs. The 390×520 submitted-search screenshot was also visually inspected: controls and rows remain within the page width.

The existing combined final rendered audit is running with `--seven`; its established eight-brand, ten-consistency, six-automatic-sample, source/base-search, customisation and three-logging-flow coverage is unchanged.

### I. Completed final rendered evidence

The combined final audit passed at all seven viewports with no changes to its scenarios: **56 brand checks, 70 preview → submitted Search → selection checks, 42 automatic punctuation/collision checks, and 21 logged flows**, plus the existing restaurant/source, Bread/Milk, rapid replacement, customisation and neutral KFC size checks. Each viewport recorded **277 local successes, 0 optional misses, 0 required misses, 0 live fallthrough, 0 page errors and 0 failed assets** (1,939 local successes total). Evidence: `%TEMP%/hec-closure-final-rendered/report.json` and log/PNGs.

Automatic samples remained catalogue-driven: International Cuisine Supreme Family Pizza; macro Wholefoods Market Organic Brown Flaxseed Meal; Coles Australian Potato Chunky Wedges; Carman's Classic Fruit & Nut Muesli; Rafferty's Garden Summer fruits & quinoa; Moira Mac's Margherita Chicken Breast Bites. No new family was added for this continuation.

All **15** existing detailed phone runs passed: Abbott's exact/product-name and brand reachability, Nuttvia grams-only selection/review/logging, and the three automatic punctuation samples, each at 320×568, 390×844 and 430×932. Punctuation checks include straight/curly/omitted apostrophes and product-only queries through canonical selection and profile identity. Evidence: `%TEMP%/hec-closure-final-details/summary.json` and per-run reports. The disposable driver calls the existing audit scripts sequentially without changing their checks.

### Remaining raw whitespace/hyphen audit: explicit stop

To complete the previously specified final rendered whitespace/hyphen gate, a disposable driver was prepared at `%TEMP%/hec-closure-raw-transitions.cjs`. It uses only existing requested milk whitespace and Häagen-Dazs whitespace/hyphen transitions, the shared strict router, and the existing seven viewport list. It changes no repository runtime/test/audit script.

The run stopped on its first case: **320×568, `milk` → `milk `**. Assertions establishing nonempty previous rows, complete detachment of those rows, an advancing revision, exact new raw input, and final settled exact raw input had passed. It then failed at driver line 15 on:

`assert(after.cachePreserved)`

Here `cachePreserved` was defined as:

`closureCachedRecords.every(food => HECOpenFoodFactsAU.getLoaded(food.id) === food)`

Expected: every cached JavaScript object reference stays identical. Actual: false. This strict allocation-identity condition was an **over-constrained assertion I introduced in the disposable audit**, not the user's requirement that reusable candidate/catalogue data remain cached. The driver recorded zero fully completed transitions because results are appended only after all assertions for a transition pass. Later whitespace/hyphen cases and remaining viewports were not run. The final overflow assertion was also not reached. No screenshot was captured before this stop.

Read-only inspection after the stop establishes that `off-catalogue.js:toFood()` constructs a fresh `food` object and calls `loadedFoods.set(food.id,food)` on every hydration. `hydrate()` invokes `toFood()` on the referenced records. The same object-replacement behavior exists at required committed HEAD. It is therefore invalid to infer data loss or a new production regression solely from this failed reference-equality check. Retention and equality of data contents were not measured by that assertion; no replacement data-content test or diagnostic rerun was executed after the stop.

Evidence: `%TEMP%/hec-closure-raw-transitions/report.json` and `.log`. At failure the disposable context recorded **152 local successes, 0 optional misses, 0 required misses, 0 live fallthrough, 0 page errors and 0 failed assets**. Those captured counters do not constitute a completed routing gate for this partial run, since its final `requireEvidence` call was not reached. Earlier completed routing gates remain valid independently.

The explicit stop was observed: no repair to the driver, retry, production change or subsequent acceptance execution occurred. The outstanding issue is the audit contract; no production defect is established. The requested query-cache distinction should be assessed as retained reusable data, separately from obsolete rendered/query-owned snapshots, without requiring an unsupported JavaScript object allocation invariant.

### J–M. Performance, protection, diff and commit disposition

Established standalone benchmarks were **not run after the stop**. No performance threshold was weakened. The full suite's passing timing tests are not substituted for these pending benchmarks. The standalone OFF 1,000-retrieval/100-brand/500-performance audit is likewise still pending; the full catalogue's 20-brand and 40-consistency checks are reported separately above.

All **40/40** saved production/data hashes match before and after this continuation. Evidence: `%TEMP%/hec-closure-final-hashes.json`. Protected OFF/McDonald's/AFCD/KFC raw paths, product-serving semantics, deployment, installation/configuration and manifest paths have no Git changes. Version **0.6.33** and source cache **v5** remain unchanged. No source refresh, generated-data rebuild, runtime edit, timeout/retry change, dummy shard, folded-ownership restoration or detached-row protection removal occurred in this continuation.

The fresh pre-commit public metadata gate was not reached. Historical TEST HEAD `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, My Data HEAD `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`, OFF source SHA `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`, and KFC normalized SHA `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2` retain their previously recorded status. The full concept/canonical audits rechecked the OFF manifest SHA; no fresh remote HEAD or normalized KFC recalculation is claimed at this stop. My Data application/storage was never accessed.

The accumulated production, serving, registry, source, routing and test changes were reviewed read-only alongside the green broad audits and protected hashes. The final commit acceptance review remains incomplete because of the partial whitespace gate and unrun later gates. Final `git status --short`, `git diff --check`, `git diff --stat`, `git diff --name-status` and accumulated tracked diff are captured in `%TEMP%/hec-closure-final-git-review.txt` and `%TEMP%/hec-closure-final-accumulated.diff`. Whitespace check passes. The intentionally dirty tree contains **50 files: 29 modified tracked + 21 new**, tracked-only **559 insertions / 212 deletions**; new-file contents are excluded from those line totals.

**No staging or commit occurred.** HEAD remains `63be3825efb277cda8633f964839825f24d08c63`, branch `alpha-0.6.33`. There is no new source SHA and the tree is not clean. Exactly one `Build Australian catalogue foundation` commit remains conditional on all acceptance gates passing. No push or deployment occurred. Every earlier historical stop is preserved.

## 31. Final closure: semantic cache preservation

Read the final closure request `7d57c83c-6fbb-4ddf-be62-21a33f5b1628/pasted-text.txt`. Branch `alpha-0.6.33`, required HEAD `63be3825efb277cda8633f964839825f24d08c63` and all **40/40** production/data hashes matched before editing. No production, data, runtime, repository test or established audit script was changed in this continuation. Only the disposable affected audit driver and this report were revised.

The preceding failure required `HECOpenFoodFactsAU.getLoaded(food.id) === food`. Both baseline and current `toFood()` reconstruct food objects and replace their cache entries; allocation identity is not the retention contract.

The corrected driver takes detached semantic snapshots of canonical/source IDs, barcode, names, brand, record type, Australian market/country, nutrition and source nutrition, nutrition basis, manufacturer serving, unit conversions and source references. After hydration, each saved ID must still resolve to the same canonical/source identity and required values, preventing omission or unrelated substitution.

The first semantic attempt compared the entire units map for equality and failed on the first milk whitespace transition. A directly dependent diagnostic of that same case identified **252 differences, all solely added unit entries**, with **zero removed or changed pre-existing values** and no other differing captured field. The retention comparison was narrowed to the requested contract: every existing unit/conversion must remain, while added entries are permitted; all other captured fields retain equality. No assertion for canonical/source identity, nutrition, stale DOM rows, raw revision, brand membership or layout was removed. Evidence: `%TEMP%/hec-final-raw-transitions/report.json` and `%TEMP%/hec-final-cache-diagnostic.log`. These intermediate audit outcomes are preserved rather than described as production failures.

Corrected affected audit: **PASS — 42 transitions, all seven existing viewports**. Cases remain milk trailing-space addition/removal and approved Häagen-Dazs leading/trailing-space and hyphen variations. Every transition advanced raw ownership, detached previous rows, retained required cached data, and settled under the current raw query. Approved family count remained 29 with the same displayed canonical IDs. Evidence: `%TEMP%/hec-final-semantic-transitions/report.json`, `.log`, `.cjs` driver and seven PNGs.

All **40/40** production/data hashes still match after the audit. Evidence baseline: `%TEMP%/hec-final-preflight-hashes.json`. The earlier **1,260/1,260** suite, broad audits, seven-viewport ownership/routing, **112-scenario** responsive matrix, seven combined rendered passes and 15 detailed phone passes remain valid; none were rerun in this continuation. No new acceptance category was added.

### Established performance — FAIL

Ran each of the three existing benchmark scripts once, sequentially, without changing thresholds or adding categories. No benchmark retry or production optimization followed the failure.

`scripts/benchmark_search_session_repair.js` exited **1** with exactly `characterRecognition p95 26.2 ms >= 20 ms`. Its other five thresholded operations passed. All times below are milliseconds; each limit is a strict p95 upper bound.

| Existing operation | Samples | Median | p95 | Required p95 | Result |
|---|---:|---:|---:|---:|---|
| Generic search | 100 | 23.266 | 45.186 | <250 | PASS |
| Large catalogue search | 500 queries | 3.742 | 19.115 | <250 | PASS |
| KFC ranking | 150 | 23.227 | 31.411 | <250 | PASS |
| Progressive resolution | 500 | 54.623 | 74.988 | <250 | PASS |
| Portion profile | 500 | 0.563 | 1.680 | <100 | PASS |
| Character recognition, actual Edge | 5,900 | 20.500 | **26.200** | **<20** | **FAIL** |

Character-recognition maximum was 52.6 ms. Browser routing fulfilled all 53 same-origin requests locally, with zero optional/required misses, live fallthrough, page/console errors or failed assets. The unchanged benchmark measures its established query-prefix recognition cases. This is a measured performance gate failure, not evidence of a source-identity failure. Evidence: `%TEMP%/hec-final-benchmark-search-session.json`.

`scripts/benchmark_universal_food_search.js` completed with exit **0** using its default sample configuration. This script reports timings without pass/fail thresholds; completion does not override the failed threshold above.

| Existing operation | Samples | Median ms | p95 ms |
|---|---:|---:|---:|
| Preview recognition | 300 | 0.116 | 0.347 |
| Submitted generic search | 150 | 71.139 | 86.897 |
| Submitted exact product search | 150 | 76.075 | 88.778 |
| Grouped result creation | 150 | 68.438 | 76.486 |
| Source branching | 300 | 0.019 | 0.065 |
| Progressive candidate resolution | 150 | 6.645 | 10.656 |
| Quantity parsing | 300 | 0.016 | 0.041 |
| Physical form profile | 300 | 0.110 | 0.279 |
| Portion profile creation | 200 | 0.554 | 1.924 |
| Amount to Review | 200 | 0.905 | 2.814 |

Evidence: `%TEMP%/hec-final-benchmark-universal.json`.

`scripts/benchmark_food_concepts.js` completed with exit **0**, default 300 iterations and its existing explicit timing-only/no-new-threshold policy.

| Existing operation | Samples | Median ms | p95 ms | Worst ms |
|---|---:|---:|---:|---:|
| Intent classification | 300 | 17.198 | 22.504 | 47.589 |
| Family/facet resolution | 300 | 0.668 | 2.121 | 142.515 |
| Catalogue concept evidence | 73,300 | 0.056 | 0.311 | 3.994 |

Evidence: `%TEMP%/hec-final-benchmark-concepts.json`. No full suite, broad audit or established responsive matrix was repeated.

### Final protected-state verification — PASS

Public GitHub read-only metadata and pinned TEST service-worker source were checked at **2026-09-09T10:10:34.4862540Z**:

- TEST HEAD: `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`.
- TEST cache: `healthy-eating-companion-test-alpha-0-6-33-v25`; pinned worker blob `8e9b5f1b2856210ffa5bc126650c5f6d961a23ec`.
- My Data HEAD: `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`.
- OFF source SHA: `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`.
- KFC normalized SHA recalculated with the existing manifest routine: `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2`.
- AFCD, McDonald's and KFC raw hashes match the protected values recorded in section 15. AUSNUT-derived constants compare equal to HEAD, with line endings normalized for comparison; no protected payload changed.
- Source version remains **0.6.33**, source cache **v5**. No deployment/configuration overlay changed. No source refresh, remote write, push, deployment or My Data application/storage access occurred.

Evidence: `%TEMP%/hec-final-protected-remotes.json` and `%TEMP%/hec-final-protected-local.json`.

### Final accumulated diff and commit decision

Ran `git status --short`, `git diff --check`, `git diff --stat`, `git diff --name-status` and the complete `git diff`. Reviewed tracked changes and the new-file inventory with the accumulated implementation review. **50 files total: 29 modified tracked files and 21 new files.** Tracked-only changes are **559 insertions / 212 deletions**; these totals exclude untracked contents. `git diff --check` passes; no files are staged. Full tracked diff evidence: `%TEMP%/hec-final-accumulated.diff`.

The accumulated changes retain shared canonical/provenance/eligibility handling, evidence-backed brand aliases, exact raw-query ownership, manifest-backed intelligence routing and evidence-gated measures. No new named-product workaround, dummy shard/asset, timeout/retry manipulation or unsupported object-reference preservation contract was introduced. Protected raw data, TEST deployment overlay and My Data are unchanged. Initial catalogue ingestion remains the previously authorized foundation work; this closure performed no refresh. Disposable drivers, benchmark output and browser captures remain outside the source tree under TEMP. Historical stops in sections 18–30 remain intact.

Final production/data comparison: **40/40 hashes match**, zero mismatches, recorded in `%TEMP%/hec-final-closure-hashes.json`. The previously passed major gates therefore remain applicable.

**No commit created:** performance did not satisfy the user's explicit all-green condition. Branch remains `alpha-0.6.33`; HEAD remains `63be3825efb277cda8633f964839825f24d08c63`. The complete accumulated work remains uncommitted and unstaged; the working tree is intentionally not clean. No reset, discard, stash, intermediate commit, push or deployment occurred.

**NOT READY — AUSTRALIAN CATALOGUE FOUNDATION REQUIRES FURTHER SOURCE WORK**

## 32. Performance-only closure and parent comparison

Read request `08bdafb8-ef7d-4c2d-8c5c-7c49a3f4c064/pasted-text.txt`. Preflight confirmed branch `alpha-0.6.33`, required parent HEAD `63be3825efb277cda8633f964839825f24d08c63`, and **40/40 unchanged production/data hashes**. The intentionally dirty foundation tree was preserved. No reset, stash, clean, source refresh, push, deployment or My Data application/storage access was performed.

### Exact benchmark definition and provenance

- File: `scripts/benchmark_search_session_repair.js`; function/report key: `characterRecognition`.
- The timed operation is `window.HEC_SEARCH_SESSION_TEST.intent(prefix)`, bound to production `ss633Intent()` in `alpha06.js`. This classifies growing text prefixes as restaurant source/product, barcode, generic food, consumer brand or another product intent. It calls `rc5SearchContext()` (including `rc4NamedRestaurantSource()`, packaged-brand and parsed-entity lookup), `HECGuidedProductResolution.genericSchemaForQuery()` and `HECFoodCatalogue.queryIntent()`. It does not measure microphone/voice recognition, OCR, input-event rendering or end-to-end submitted-search latency.
- Workload: prefixes of `KFC`, `KFC 6 Wicked Wings`, `McDonald's Big Mac`, and `Flora ProActiv Light`; 59 calls per cycle, 100 cycles, **5,900 calls per run**. Fresh headless Edge browser/context at 390×844; local food library opened before measurement.
- Timing: browser `performance.now()` around each synchronous intent call. Sort all values ascending; select zero-based `floor(n * fraction)`, capped at `n - 1`, for p50 and p95; report three decimal places. At n=5,900 these are indices 2,950 and 5,605. All initial calls are included; the established script has no separate in-page warm-up or discarded sample subset.
- The unchanged strict threshold is `limits.characterRecognition = 20`; `p95Ms >= 20` fails. It was introduced by commit `6bec5a1` (`Repair search typing, KFC routing and chips resolution`, 2026-09-03 16:53:13 +1000). Commit `73efe18` subsequently adopted strict local browser setup without changing this workload/threshold. The benchmark exists unchanged at required parent HEAD, apart from checkout/archive line endings.
- Parent HEAD's committed `AUSTRALIAN_FIRST_SHORTLIST_REPAIR.md` records one prior character-recognition p95 of **7.4 ms** and no benchmark failures. This historical observation is distinguished from the fresh measurements below.

### Equivalent repeated comparison

Exported the exact committed parent with `git archive` into an isolated TEMP directory, leaving the current source tree intact. The parent copy uses the current strict local browser-routing helper only; its production implementation and data remain the committed parent. Benchmark code is identical after normalizing CRLF/LF. The helper overlay changes setup/evidence handling, not the measured operation. The benchmark's other invoked workload functions are unchanged between parent and candidate.

Both sides use Node **v24.19.0**, Microsoft Edge **152.0.4191.66**, the same machine, and sequential runs with no concurrent tests/benchmarks. One complete warm-up benchmark per side precedes five measured pairs. Each measured run still starts a fresh browser and retains all calls, preserving the benchmark contract. Pair order alternates candidate/parent, parent/candidate, candidate/parent, parent/candidate, candidate/parent. Warm-up results remain recorded separately; no failed measured run is discarded.

Evidence directory: `%TEMP%/hec-performance-closure-a02a4d3433b9489da4a42fdf62d2cc71` (`method.json`, `summary.json`, `candidate-N.json`, `parent-N.json`, stderr files and sequential runner). Final measurements and disposition follow below.

| Run | Candidate p50 ms | Candidate p95 ms | Parent p50 ms | Parent p95 ms | Samples per side |
|---|---:|---:|---:|---:|---:|
| Warm-up (separate) | 20.7 | 26.6 | 4.7 | 7.7 | 5,900 |
| 1 | 20.8 | 27.6 | 4.7 | 7.8 | 5,900 |
| 2 | 20.6 | 25.9 | 4.5 | 7.0 | 5,900 |
| 3 | 20.7 | 25.9 | 4.5 | 7.3 | 5,900 |
| 4 | 20.8 | 26.5 | 4.4 | 7.1 | 5,900 |
| 5 | 20.7 | 25.5 | 4.5 | 7.2 | 5,900 |

Each side contributes **29,500 measured calls**, plus 5,900 warm-up calls. Candidate p95 range **25.5–27.6 ms**, mean **26.28 ms**, population standard deviation **0.733 ms**; parent range **7.0–7.8 ms**, mean **7.28 ms**, population standard deviation **0.279 ms**. The lowest candidate p95 exceeds the highest parent p95 by **17.7 ms**; mean p95 is **19.0 ms higher**, approximately **3.61×** the parent. These are descriptive statistics across five runs, not confidence intervals. All five candidate runs failed only character recognition; all five parent runs passed every established threshold.

**Decision: CASE B — a real foundation performance regression was demonstrated.** The repeated ranges do not overlap, and the difference is far larger than observed run-to-run variation. This is not a Case A waiver of the absolute limit. Production and threshold were unchanged until all comparison runs completed.

### Exact hotspot and smallest shared correction

The existing `rc4NamedRestaurantSource()` called `HECFoodSources.allCatalogues()` and immediately discarded each catalogue's item payload, retaining only `.source` for restaurant alias recognition. `allCatalogues()` deep-copies its complete records. The foundation's additional registered source increased this payload; the measured browser held **3 sources / 584 items**.

A directly dependent trace of five cycles of the same existing prefixes (**295 intent calls**, no new query/category) counted **270 `allCatalogues()` calls**. Complete-catalogue copying consumed **6,854.1 ms of 7,190.4 ms**, or **95.3%** of the traced time. Instrumentation was confined to a disposable browser session and restored afterward. This trace locates the hotspot; it is not used as a pass/fail benchmark. Evidence: `hotspot-before.json` and `profile.cjs` in the evidence directory.

Added `HECFoodSources.allSources()`, which returns fresh deep copies of source metadata in the same registration order without reading/copying product items. The classifier uses that method, retaining the old path as compatibility fallback for older registry interfaces. No query cache, invalidation rule, identity decision, alias, ranking, food data, rendered output, timeout or retry was changed. Copies retain mutation isolation and naturally reflect current registration state. `allCatalogues()` retains its existing full-catalogue contract.

Only **two production files** changed in this continuation: `food-sources.js` and `alpha06.js`. Existing `tests/search-session-root-cause-repair.test.js` gained two focused checks for source metadata equivalence/isolation and identical prefix-recognition results without catalogue-item access, using only the benchmark's existing phrases. This report is the other repository edit. The other **38/40** saved production/data files are byte-identical; the two expected changed hashes are recorded in `optimized-hashes.json`.

### Proportionate verification

Focused command: `node --test --test-concurrency=1 tests/search-session-root-cause-repair.test.js tests/rc4-exact-source-navigation.test.js tests/food-source-mcdonalds-au.test.js tests/food-source-kfc-au.test.js tests/australian-catalogue-foundation.test.js`.

**117/117 PASS**, zero failures, cancellations, skips or TODOs; **10,659.0385 ms**. Evidence: `focused.tap` and `focused.stderr`.

One post-correction run of the **unchanged** established benchmark passed, exit **0**, zero failures:

| Existing operation | p50 ms | p95 ms | Required p95 |
|---|---:|---:|---:|
| Generic search | 22.728 | 52.405 | <250 |
| Large catalogue search | 2.986 | 15.836 | <250 |
| KFC ranking | 22.892 | 34.048 | <250 |
| Progressive resolution | 53.315 | 74.870 | <250 |
| Portion profile | 0.571 | 1.948 | <100 |
| Character recognition, 5,900 calls | **0.700** | **1.900** | **<20** |

Character-recognition maximum **4.3 ms**. Evidence: `optimized-benchmark.json` and `.stderr`. No threshold was weakened or deleted; the 26.2 ms historical failure and every repeated failure remain recorded. No further benchmark repetitions are required after this clear pass and the focused behavior checks.

One fresh full suite, `node --test --test-concurrency=1 tests/*.test.js`, passed **1,262/1,262**, zero failures, cancellations, skips or TODOs; **423,060.0893 ms**, exit **0**. The count is the prior 1,260 plus the two directly affected focused checks. Evidence: `full-suite.tap` and `full-suite.stderr`. No standalone broad catalogue audit, responsive matrix, new brand/food/punctuation scenario or unrelated performance category was introduced or repeated. This optimization changes metadata retrieval cost, not rendered/search behavior, so the established rendered acceptance remains relevant without another seven-viewport cycle.

The optimized benchmark's browser fulfilled **53/53 requests locally**, with zero optional/required misses, live fallthrough, page/console errors or failed assets.

### Protected state and accumulated diff

The existing final protected-state PASS from section 31 remains the recorded public remote verification: TEST `82c82d3a2a9b777abc8ce5b1332651c9c3229d5c`, TEST cache `healthy-eating-companion-test-alpha-0-6-33-v25`, My Data `4f07ebf1e8671ee35a68f94f46dab0a3bf2a4709`. This continuation makes no new remote verification claim and does not access My Data. OFF SHA remains `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`; KFC normalized SHA remains the verified `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2`. Protected OFF/KFC/McDonald's/AFCD files and AUSNUT-derived constants are unchanged. Source version **0.6.33** and source cache **v5** remain intact.

The existing complete foundation diff review was retained and the narrowly changed production/test lines were reviewed again. Final status/name inventory and tracked diff were captured; `git diff --check` passes. Before staging, the accumulated change remains **50 files: 29 modified tracked files and 21 new files**; tracked-only counts are **576 insertions / 213 deletions**, excluding new-file contents. Full accumulated diff evidence: `final-accumulated.diff` in the evidence directory. There are no protected raw-data mutations, TEST deployment overlays, My Data changes, refreshes, dummy assets, named-product workarounds, timeout/retry manipulation or accidental TEMP/browser files. Historical stops in sections 18–31 remain preserved.

### Final disposition

**CASE B resolved narrowly; all required foundation gates pass.** The single commit input contains the complete accumulated Australian Catalogue Foundation work and this performance correction: **50 files, 33,302 insertions / 213 deletions**, including all new-file contents. Required message: `Build Australian catalogue foundation`; required parent: `63be3825efb277cda8633f964839825f24d08c63`. The initial staging attempt was refused because the repository owner was the sandbox account; a command-scoped trust exception for this exact repository resolved that Git ownership check without changing global settings. The first commit invocation then stopped before creating a commit because the execution context lacked an author identity; the retry uses the verified parent author/committer `HEC Development <hec-development@local>` through command-scoped settings. Staged whitespace validation passes. Commit identity and clean working tree are verified and reported after creation rather than embedding a self-referential commit SHA in this report. No intermediate commit, push or deployment is authorized or performed.
