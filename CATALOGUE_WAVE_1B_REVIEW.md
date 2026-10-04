# HEC catalogue expansion Wave 1B — SOURCE review

Bounded foundation work: **46 identities reviewed, 2 admitted, 24 recategorised, 15 remain restricted, 5 deferred**. There is **one new canonical identity**; the other admission enriches an existing frozen OFF identity. This is a private-testing SOURCE change. Public-release licensing review remains required.

## Authorised starting checkpoint

Canonical repository: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`. Preflight verified branch `alpha-0.6.33`, HEAD `73b6ec8186c56054244afb62c9c974c3c6d92fe6`, direct parent `a3dff29da32f27601f28385badb6c072a73963f1`, subject “Improve Product Capture manual fallback”, and a completely clean tree before editing. Starting generation was `ff6fa0c2de9cbfa6b09cace9`; visible version remains 0.6.33.

No reset, clean, stash, checkout, pull or merge was used to manufacture the checkpoint. Only the correctly spelled canonical repository path was used for source operations.

## Manifest and accounting

The deterministic [candidate manifest](data/catalogue-wave-1b/candidate-manifest.json) was fixed before acquisition/admission; SHA-256 `f11e63ea5fb5063d699657038a0e655f51d06625c6d8a0a940d77e0d36d5ed01`. The four groups are disjoint and total 46, below the maximum 60. The manifest retains the original pending-review state; the separate reproducible [decision report](data/catalogue-wave-1b/review-report.json) owns final dispositions.

| Group | Reviewed | Newly admitted | Previously admitted, improved | Recategorised subset | Remain restricted | Deferred | Existing canonical overlaps |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 15 | 0 | 0 | 0 | 15 | 0 | 15 |
| B | 24 | 0 | 24 | 24 | 0 | 0 | 24 |
| C | 4 | 1 | 0 | 0 | 0 | 3 | 2 |
| D | 3 | 1 | 0 | 0 | 0 | 2 | 3 |
| Total | 46 | 2 | 24 | 24 | 15 | 5 | 44 |

Recategorisation is a subset of improvement, not a second disposition. 2 + 24 + 15 + 5 = 46. Of two candidates without a prior canonical identity, only Mixed Vegetables passed admission; Skim Milk was deferred.

## All 15 existing visible restrictions

All 15 were recaptured from public Australian Woolworths pages. None passed completion. Before and after: **8 identity conflicts, 4 other source conflicts, 3 missing-energy identities**. Fresh evidence is retained without silently replacing accepted panels or dismissing conflicts.

| GTIN | Product | After review — remains restricted because |
|---|---|---|
| 9300633209339 | Woolworths Cracker Selection 250g | 20 g × 12 serves does not reconcile with 250 g pack. |
| 9300633350079 | Woolworths Essentials Long Grain Rice 1kg | Consumer-brand assertions remain incompatible (Essentials / Woolworths Essentials). |
| 9300633415266 | Woolworths Peas 500g | 75 g × 6 serves does not reconcile with 500 g pack; fresh fat wording is also qualified. |
| 9300633417895 | Woolworths Lightly Sparkling Spring Water 1.25L | Energy and required macros are absent; dashes cannot become zero. |
| 9300633744182 | Woolworths Vanilla Ice Cream Sandwich 4 pack | Same-GTIN title/product-family assertions remain incompatible. |
| 9300633777401 | Woolworths Plain Water Crackers 125g | 12 g × 10 serves does not reconcile with 125 g pack; saturated-fat basis discrepancy remains. |
| 9300633906603 | Woolworths Tasty Cheese Slices 500g | 16 g × 30 serves does not reconcile with 500 g pack. |
| 9300633935306 | Woolworths Essentials Table Spread Soft And Spreadable 500g | Consumer-brand conflict remains; fresh protein/carbohydrate wording is qualified. |
| 9300633988098 | Woolworths Tasty Cheese Block 500g | Woolworth / Woolworths brand discrepancy remains unadjudicated. |
| 9339687253517 | Woolworths Full Cream Milk 2L | Same-GTIN liquid versus weight physical-form conflict remains. |
| 9339687336258 | Woolworths White Sandwich Bread Loaf 700g | Woolworths / Woolworths Bakery brand conflict remains. |
| 9339687341580 | The Odd Bunch Carrots 1.5kg | Energy and required macros are absent. |
| 9339687357994 | Woolworths Sea Salt Deli Style Potato Chips 175g | Energy and required macros are absent. |
| 9339687391479 | Woolworths Australian Hash Browns 750g | Woolworths / Australian Potatoes brand conflict remains. |
| 9339687428700 | Woolworths Orange Juice 2L | Woolworths / WW brand identity conflict remains; qualified serving wording also needs review. |

## Category cleanup

All 24 selected Other Packaged Food identities were safely recategorised using the shared, opt-in food-family classifier: 4 plain loaves, 3 bread rolls/muffins, 5 wraps/flatbreads, 3 pasta meals, 2 buckwheat grains, 1 plain breakfast oat product, 4 marinades/salsa, and 2 slaw kits. Only the frozen manifest identities receive the new category projection. Raw source category assertions, names, nutrition, units and provenance remain intact.

Woolworths Other Packaged Food falls **69 → 45**. Those 45 unselected/ambiguous products deliberately retain the fallback. Shared rules contain no brand, GTIN or individual-product exceptions. Positive and misleading-name controls cover Woolworths, Coles, Aldi and independent brands.

## Genuine private-label additions

| Family | Reviewed | Admitted | Deferred |
|---|---:|---:|---:|
| Milk | 1 | 0 | 1 |
| Yoghurt | 1 | 0 | 1 |
| Frozen vegetables | 2 | 1 | 1 |

- **Admitted:** Woolworths Mixed Vegetables 1 kg, GTIN 9300633450410. Official Australian retailer identity, complete required nutrients, as-sold frozen basis, 100 g manufacturer serve and grams.
- **Deferred:** Skim Milk 1 L (9300633556204): exact 1 g fat/100 mL versus strict less-than 2.5 g/250 mL needs review. High Protein Plain Yoghurt 900 g (9339687165339): required fat is qualified, not an exact value. Essentials Frozen Mixed Vegetables 1 kg (9300633939151): unresolved consumer-brand conflict.

Woolworths visible house-brand browse is **362 → 363**, loggable **347 → 348**, restricted **15 → 15**. Coles remains 417 and Aldi 222.

## Controlled third-party discovery

| Actual consumer brand | Reviewed | Admitted | Deferred |
|---|---:|---:|---:|
| Nescafé | 1 | 0 | 1 |
| Kellogg’s | 1 | 0 | 1 |
| Campbell’s | 1 | 1 | 0 |

Nescafé Blend 43 Instant Coffee Jar 150 g (9300605114173) lacks independent exact-product nutrition. Kellogg’s Corn Flakes 380 g (9310055537224) retains its 35 g × 10 versus 380 g serving-count conflict and lacks a settled independent current panel. Neither borrows nutrition from another pack. Existing distinct, eligible Corn Flakes GTINs remain searchable.

Campbell’s Real Stock Chicken 1 L (9300644043601) is admitted globally under **Campbell’s**. The [Australian manufacturer page](https://www.campbellsanz.com/products/stock/chicken-1litre) explicitly links the exact [Woolworths product](https://www.woolworths.com.au/shop/productdetails/77750); pack and ingredients match. Manufacturer nutrition is independent of retailer discovery. Retailer presence is stored in `retailerMemberships`; there is no Woolworths commercial/private-label ownership assertion. Tests prove global retrieval and absence from Woolworths house-brand browse. Community retailer declarations remain unverified community declarations. Availability remains unknown beyond a page being listed when retrieved.

## Canonical, serving and nutrition safety

The global brand index grows **7,489 → 7,491** products and retains **2,736** brand keys. Campbell’s existing OFF identity is enriched through the existing canonicaliser: manufacturer + official retailer + frozen OFF evidence become one canonical product, collapsing two duplicate evidence representations. Mixed Vegetables is the sole new canonical identity. All 44 candidate overlaps are recorded; no different GTINs merge. The 12 material conflict blocks in Group A remain, plus the existing Group C brand and Group D serving-count blocks; three additional Group A identities lack energy.

For vegetables, the source basis is 217 kJ per 100 g as sold frozen. For stock, the independent panel is **87 kJ per 250 mL manufacturer serve**. The manufacturer's ambiguous CMS `Per100g` columns are retained as raw evidence and never relabelled per-100-mL; no density is invented. Independent serving metadata is rebuilt without inheriting the retailer's differently scaled derived metadata.

Both admitted products retain **unknown fibre**, despite a retailer stock row publishing zero. No panel averaging or null-to-zero filling occurs. Vegetables expose grams/serve without liquid, pack or piece conversions. Stock supports mL/serve and the existing defensible 250 mL cup conversion; litre scaling is retained only as a secondary existing volume option. No slice, sachet or piece measure is inferred from pack size. Deferred products receive no newly authorised natural units.

## Provenance and future completion interface

Committed inputs preserve source/canonical IDs, validated GTINs, authentic consumer brands, known relationship evidence, pack identity, original nutrition and serving wording, preparation basis, physical form, source URLs, retrieval timestamps, response hashes, field-specific provenance, decisions and unresolved reasons. There were 22 successful bounded public retailer captures plus one manufacturer capture; an initial failed network attempt is recorded. No accounts or personal storage were used. Manufacturer CMS content and panel modification dates are explicitly labelled; they are not asserted publication/formulation dates. Failed or ambiguous freshness signals do not create discontinued status.

Future completion/freshness tooling should consume a stable canonical key plus source record ID, separate capture/check/review dates, evidence hash, disposition/reason codes, unresolved conflicts, field provenance and a structured consumed nutrient denominator. A source CMS modification date must remain distinct from publication or formulation date. Rechecking evidence must never auto-clear a material conflict. No queue or scheduler is implemented here.

## Search and verification

Shared repairs address chicken stock/broth/flavour versus meat; scoped retailer concept retrieval (including ordinary cereal names without the word cereal); dry powder versus prepared beverage physical form; structured AFCD savoury-biscuit headings for generic Crackers; and preventing a generic-only prefilter before an existing restaurant source-context choice. The new category rules retain compound-food safeguards. The exactness and same-GTIN safety gates are unchanged.

The [acceptance plan](data/catalogue-wave-1b/acceptance-plan.json) selects the complete catalogue/search/serving/release SOURCE suite for changed modules. Unrelated OCR, artwork, onboarding and weight feature work is outside this wave. Browser audits use fresh disposable contexts and intercept the application origin entirely to local SOURCE files; they do not contact or deploy the hosted TEST app.

The final rendered audit passed **27 concept first screens, 25 guided flows and 6 additional Review flows**, at 390 × 844 and 320 × 568. All 868 application requests were fulfilled locally, with zero live fallthrough, required-asset misses, page errors or external requests. The six additional flows reached exactly one Review with the expected quantity and energy, without horizontal overflow.

| Required probe | Observed result |
|---|---|
| Bread | Ordinary Bread is first; bread variants retain the base concept and guided amount flow. |
| Milk | Milk is first; cow/oat/skim/lactose-free variants preserve type and safe liquid units. |
| Hash Brown | Base concept, packaged/frozen and restaurant source choices remain usable. |
| Coffee / Flat White | Prepared AFCD beverages reach Review at 250 mL; explicit dry powder remains a weight-based food. |
| Sausage | Sausage is first; sausage rolls and sausage-in-bread retain different semantic identities. |
| Cereal | Breakfast cereal is first; cereal bars remain a separate form. |
| Crackers | Crackers is first; structured savoury-biscuit evidence supplies a working generic flow. |
| Yoghurt | Yoghurt is first and its guided flow remains usable. |
| Chicken | Chicken is first; stock, broth and flavour/component cues do not acquire meat identity. |
| Kellogg’s Corn Flakes | Best exact eligible choice is Kellogg’s Corn Flakes, GTIN 8801083672700; the deferred 380 g GTIN is suppressed. |
| Woolworths | House-brand browse contains 363 identities, including the new vegetables and excluding Campbell’s stock. |
| Woolworths cereal | Genuine Woolworths cereal/oat identities are retrieved, including titles without the word cereal; no third-party ownership leakage. |

The broader Flat White list still includes an existing flatbread lexical match below the prepared coffee choice. This wave verifies the prepared beverage and measure path; it does not claim to have eliminated all legacy lexical noise or redesigned that shortlist.

The final complete SOURCE run passed **1,051/1,051 tests in 50 files**, with zero failures, cancellations or skips, in 538.3 seconds. Green focused receipts include 99/99, 64/64, 35/35 and 7/7 checks; these overlap and are not an additional distinct-test total. Release generation is **1b0f0697e7c18b04f732ded9**, version **0.6.33**. Deterministic/hash receipts and protected-data checks are recorded in [verification.json](data/catalogue-wave-1b/verification.json).

Earlier focused failures included test expectations for historical counts/category projections, JSON serialization, numeric tolerance and session fields. Browser-driven failures led to shared fixes rather than product exceptions. The first complete run had 1,040/1,048 passing tests: six failures came from a query-ownership harness missing the current concept-membership dependency; one legacy prefix audit expected unaudited seeds/incomplete brand products; one restaurant audit exposed the incompatible source-choice sequence. Those harnesses now exercise the current admission contract without restoring rejected choices. A separate full browser run exposed the generic Crackers dead end. The standalone builder check also caught and fixed export initialization in its new adapter dependency cycle. Focused repairs preceded the final clean complete run; failures are retained in the external receipts.

## Reproduction

From the canonical source repository:

`node scripts/catalogue-wave-1b.js --check`
`node scripts/build_woolworths_catalogue.js --check`
`node scripts/build_brand_catalogue.js --check`
`node scripts/build_release.js --check`

Omit `--check` to regenerate from the committed factual inputs. No network refresh is part of regeneration. The Woolworths builder now has the same pure outputs/check pattern as the brand builder. All indexed shard hashes, directory counts, canonical uniqueness, relationship projections and release files are checked. The manufacturer HTML extractor is optional acquisition tooling; generation depends on its committed, hash-pinned factual output.

## Protected scope and local commit

Protected OFF remains the 2026-08-30 snapshot with source SHA-256 `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`. All **2,533 protected tracked files**, including all **2,436 OFF files**, remain unchanged. The full OFF directory, AFCD/AUSNUT, Coles/Aldi generated payloads, restaurant payloads and deployment files remain unchanged. Accepted source identity/nutrition/measure facts are checked against prior baseline hashes, apart from the explicitly new records.

Exactly one local commit is authorised after all gates pass, subject **Complete Woolworths catalogue foundation**, with direct parent `73b6ec8186c56054244afb62c9c974c3c6d92fe6`. Its SHA and final clean-tree status are supplied in the final chat report, avoiding an impossible self-referential commit hash inside this file.

No push or deployment is authorised/performed. TEST v58 (`aee6f71aafe6f7133f86f0ab39990443f516307e`) and MY DATA v15 (`d6658886df5b8a3335cafbd4aaaa42904fedbeb0`) remain untouched; their stated identities were not re-inspected. No personal browser storage, backups or Mal's real data were accessed.

All recorded gates are green: ready for Myron/Mal SOURCE review and consideration of a subsequent, separately authorised guarded TEST deployment. The retained restrictions, deferrals and legacy Flat White lexical noise are explicit review limitations. This job stops after its local commit and report.
