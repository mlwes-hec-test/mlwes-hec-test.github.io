# Aldi Australia private-testing catalogue — first wave

Source-only build from branch alpha-0.6.33, accepted HEAD fac77ef8ac28ebf2c016de8e87b706005c78e0bc (Remove redundant weight graph detail panel), parent a9c07d551791119206086f86415fe3ae1fb8afd5. The starting working tree was clean. The workspace spelling HEC Develpoment is a junction resolving to the canonical HEC Development source path. Visible version stays 0.6.33.

## Evidence and admission

Frozen evidence: C:/Users/mlwes/OneDrive/Documents/HEC Development/HEC Catalogue Evidence/ALDI/OFF Explicit Retailer Evidence 2026-09-16

The raw, canonical and acquisition metadata hashes were independently reverified before ingestion and again before acceptance:

| File | SHA-256 |
| --- | --- |
| raw/off-products-2026-09-15.csv.gz | f72687ee8bc6522054fe69dbfda6b91902c16af1ec2e043cde27bc6c29ad8176 |
| canonical-audit-snapshot.json | bf949f544f60ed79e83af6531d32a02d734d310a9cfcd44012d5be49796f238e |
| acquisition-metadata.json | 41162018ea71ca0c9bd9bf197bbd3a486244207e59a70fb424a5884cb69b1059 |

Only Open Food Facts export evidence is used. No Aldi website, catalogue, descriptions, prices, nutrition panels, images, caches or third-party scrapes were accessed. Attribution is Open Food Facts contributors, with ODbL 1.0 and DbCL 1.0 references in the source policy, generated adapter and product shards. Raw bytes match HEC's existing 30 Aug 2026 snapshot; the September object/evidence dates are not evidence of product freshness.

The pool was recalculated from explicit store evidence, conservative review status and sole country tag en:australia: **28 products**. Individual production review approves **20** and excludes **8**. Every approved product has valid source GTIN structure, source brand, coherent nutrition, a safe consumed measure, an existing food category and no unresolved identity/nutrition/serving/barcode conflict. The retained per-record reviews document unknowns and unused source portions. Checksum validity is not independent label verification.

## Categories and approved products

All Items: **20**; categories: **10**. Product order follows taxonomy order, then English name and GTIN. Category counts exclude all non-approved records; there are no empty category controls.

| Category | Count |
| --- | ---: |
| Bread & Bakery | 1 |
| Yoghurt | 5 |
| Cheese | 1 |
| Breakfast Cereal | 2 |
| Crackers & Biscuits | 1 |
| Snack Foods | 4 |
| Sauces & Condiments | 1 |
| Non-alcoholic Drinks | 2 |
| Packaged Fruit & Vegetables | 2 |
| Meat & Protein | 1 |

| Source product name | Source brand | GTIN | Category |
| --- | --- | --- | --- |
| Lyttos Greek Style Natural Yogurt | Lyttos | 26049328 | Yoghurt |
| Dairy dream greek style yogurt | Aldi | 26283517 | Yoghurt |
| White Bakehouse Gluten Free | Bakers Life | 4061462249464 | Bread & Bakery |
| CHICKEN TIKKA MASALA WITH PILAU RICE | INSPIRED CUISINE | 4088600187341 | Meat & Protein |
| Kids Strawberry Yogurt | Brooklea | 4088700009185 | Yoghurt |
| Gourmet Pasta Sauce Romana | Specially Selected | 4088700011638 | Sauces & Condiments |
| Natural Australian Spring Water | Northbrook | 4088700038505 | Non-alcoholic Drinks |
| Choceur  milk mini | Aldi | 4088700063576 | Snack Foods |
| Snack Stack Sour Cream & Onion Flavour Stackable Chips | Sprinters | 4088700070772 | Snack Foods |
| Finest Dark Caramel Sea Salt | MOSER ROTH | 4088700091173 | Snack Foods |
| Dried Turkish Apricots | Sweet Vine | 4088700109267 | Packaged Fruit & Vegetables |
| Light Tasty Cheese Shredded | Westacre Dairy | 4088700157008 | Cheese |
| Coconut Rolls | Oh So Natural Foods | 4088700160466 | Snack Foods |
| Greek yoghurt | Lyttos | 4088700164204 | Yoghurt |
| Signature Cookies 40% Chocolate Chip | BELMONT | 4088700194393 | Crackers & Biscuits |
| Original Muesli | Oh So Natural | 4088700219737 | Breakfast Cereal |
| Pecan & Maple Muesli Clusters | GoldenVale | 4088700238455 | Breakfast Cereal |
| Fine Shredded Slaw | The Fresh Salad Co | 4088700354186 | Packaged Fruit & Vegetables |
| Pepsi Max | Pepsi | 9313820016108 | Non-alcoholic Drinks |
| Ultimate Greek Black Cherry | Danone | 9344962000274 | Yoghurt |

## Exclusions and retention

| Excluded product | GTIN | Reason |
| --- | --- | --- |
| Farm wood Chicken Breast Tenders (sweet Chilli) | 4061459718805 | Chicken tenders lack an explicit as-sold versus cooked nutrition state; do not infer preparation. |
| Salt & Pepper Squid | 4061462288319 | Seasoned squid lacks explicit raw/cooked or preparation basis and source serving; defer. |
| Grass fed angus beef gourmet sausage | 4088700024621 | Beef sausage has no raw/cooked qualifier. An 84g portion does not establish sausage count or preparation basis. |
| tuna tomato & basil | 4088700065648 | Tuna in tomato/basil sauce: source does not establish drained versus packed nutrition basis; defer without guessing. |
| Dark Chocolate 85% Cocoa | 4088700091197 | Source kcal and kJ differ by 5.18%; individual first-wave energy review excludes it despite the broader shared plausibility gate. |
| HONEY SWEET & RICH | 4088700200278 | Source kcal and kJ differ by 5.97%; no source explanation establishes a coherent energy pair. |
| Coconut Yogurt Vanilla | 4088700233696 | Coconut yoghurt name and low protein could describe a plant-based product, but source asserts dairy/fermented-milk/fruit yoghurt; identity basis needs confirmation. |
| Sour Bears | 9324956000916 | Source energy pair differs by 14.47%; fibre/polyol explanation cannot be reconstructed safely from this export. |

Reason counts: unresolved preparation/drained basis **4**; coconut/dairy identity-category basis **1**; source energy pair requiring review **3**. The first-wave energy pair review uses a 5% maximum relative difference, stricter than the existing broad shared plausibility check, without altering that shared gate. No doubtful values are repaired or estimated.

The frozen 725-record population is retained, with **705 non-browsable records** indexed only in the internal retained-state manifest: 621 Needs Nutrition Completion, 6 Details-only, 38 wider potentially-loggable, 32 conservative multi-country, and 8 first-wave exclusions. Material conflict flags (34 audit records), serving-basis flags and identity holds remain separately inspectable and may overlap these states. The 647 lexical records rejected for lack of explicit Australian Aldi evidence remain in the frozen comparison/archive; they are not another disjoint set to add to 725. Production loads only the 20 approved foods; it does not embed the full evidence archive.

## Shared architecture

- Uses the existing retailer registry, ordered release inventory, index, bounded shard loader, sessions, paging, concept postings and canonical GTIN safeguards. Runtime registration order remains Woolworths, Coles, Aldi.
- A shared source-declared-store membership basis stores verified:false community evidence separately from verified listing evidence. The validator requires the matching OFF product URL/GTIN, both source pins, a literal store token and sole Australian country tag. It does not establish private-label ownership or verified/current stock.
- The source-reported brand remains independent of retailer membership, including Bakers Life, Lyttos, Westacre Dairy, Pepsi and the two literal Aldi brand records. No commercial ownership relationships are created.
- Concept-scoped registration supports Bread (1), Yoghurt (5), Cheese (1) and Cereal (2). Bread uses the existing Commercial → Supermarket route. Other covered concepts now use the shared Generic/Commercial → Supermarket / Brand Name selector, retaining product-brand and generic alternatives. Each Aldi branch returns only its concept, and Back restores source choices.
- Retailer-aware text such as Aldi bread uses validated retailer membership plus registered food-concept evidence before source-title matching. It does not require rewriting the consumer brand or product title. Generic Bread clears prior Aldi scope. Registered concept aliases include toast/yogurt/breakfast cereal.
- All 20 GTINs also exist in the protected OFF catalogue. Both merge orders retain one compatible canonical identity and community membership. The older import rounds some decimals; canonical nutrition equals one complete source record and is never averaged. No protected OFF files changed.
- Same-GTIN brand, pack and form contradictions remain blocked after repeated canonicalisation. Unknown optional nutrition remains undefined/null and reaches Review as Unknown; explicit source water zeroes remain zero.

## Measures and Review

The shared parser now recognises an explicit count in parentheses after mass, such as 75g (2 slices). The source supports 37.5g per slice. Pack text alone never supplies slice/bar/roll counts. The 5, 25g bars pack remains grams-only because there is no explicit source serving. Unknown-form source serves stay quarantined; grams remain available.

This shared parser also exposes the source-supported 33g slice on one already-excluded Coles bread record, GTIN 9310645254142. Normal Coles generation was rerun to keep that internal record and its shard hash coherent. Its exclusion, the 23 browsable Coles products and the 12 categories are unchanged.

| Representative | Measure and consumed amount | Consumed basis | Calories | kJ | Final Review |
| --- | --- | --- | ---: | ---: | --- |
| Bakers Life gluten-free bread | 2 slices | 75g | 191.921606 | 802.5 | One |
| Pepsi Max | 250mL | 250mL | 1 | 4 | One |
| Westacre Dairy shredded cheese | 40g | 40g | 134.4 | 561.44 | One |
| Oh So Natural Original Muesli | 1 source serve | 45g | 208 | 867.4 | One |
| Dairy dream greek style yogurt | 150g | 150g | 207 | 867.45 | One |

Liquids offer supported mL, Metric Cup and source Manufacturer Serve where present. Known solids/countables offer no liquid measures. A sole safe gram measure leads directly to amount entry. All five rendered flows verified identity, brand, GTIN, measure/amount and nutrition preview. No Diary entries were saved.

## Verification and reproduction

Focused unit/integration suite: **157 passed, 0 failed, 0 skipped** across aldi-source, coles-source, retailer-architecture, same-gtin-identity-safety, physical-form-measure-compatibility, release-coherence, food-concept-resolution and canonical-result-consumers. This is a bounded selection, not the historical full suite.

The disposable browser audit exercises actual production controllers at 390×844, 320×568 and 768×1024, including category controls, All Items, every approved brand/name, horizontal width, control clipping/occlusion, Back, four guided concepts and five final Review flows. All application assets are routed from this source tree or blocked; no real profile or live application request is used. Tests report zero runtime/console errors, unhandled rejections, failed assets or live fallthrough.

Acceptance artifacts (JSON, exact test output, timing measurements and screenshots) are in:
C:/Users/mlwes/.codex/visualizations/2026/09/15/01a0a673-4c71-7c42-89e8-8de285fa1b88/aldi-first-wave

Reproduction commands:

~~~powershell
node scripts/build_aldi_catalogue.js --check --evidence '<frozen evidence directory>'
node scripts/build_coles_catalogue.js --check
node scripts/build_release.js --check
node --test tests/aldi-source.test.js tests/coles-source.test.js tests/retailer-architecture.test.js tests/same-gtin-identity-safety.test.js tests/physical-form-measure-compatibility.test.js tests/release-coherence.test.js tests/food-concept-resolution.test.js tests/canonical-result-consumers.test.js
node scripts/audit_aldi_edge.js '<disposable output directory>'
node scripts/benchmark_aldi_catalogue.js
~~~

The benchmark applies the established p95 gates: 20ms recognition; 250ms root/category/All Items/search/guided operations. It registers a fresh index for each of 100 iterations; cold first-iteration measurements are reported separately. The browser separately measures actual root/category/All Items DOM rendering. No thresholds are relaxed.

Release generation uses scripts/build_release.js only. Version, installation/deployment identities, data schemas and storage keys remain unchanged. The shell, release manifest and worker contain one matching content generation. TEST v42 and My Data v9 are not deployed or modified.

## Later evidence work

Highest-value deferred review includes the only canned tuna candidate (packed/drained basis), chicken tenders/squid/sausage preparation state, Inner Goodness coconut/dairy identity, and the three energy-pair discrepancies. Keep the 32 conservative multi-country records separate until country/store association is established. The other 38 potentially-loggable records still need their wider exclusions resolved; the 621 completion and 6 Details-only records remain internal.

For later Brand Catalogue work, reuse source-reported brand and GTIN identity, not retailer ownership guesses. Do not truncate multi-brand strings. Community store evidence and private-label relationships are distinct. Preserve source decimal precision, source-date limitations, optional nutrient unknowns and measure quarantine. No Brand Catalogue or subsequent retailer work has begun.

Source-only boundary: no push, TEST deployment, My Data deployment, real browser/PWA/personal-record access, prior-commit amendment or unrelated retailer campaign.
