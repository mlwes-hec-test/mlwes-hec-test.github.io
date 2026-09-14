# Coles private-testing collection

This bounded source wave reuses the existing Australian Open Food Facts (OFF) database layer. It is a community-sourced Coles-brand collection for private HEC testing, not an official current Coles catalogue. No Coles website content is captured, imported or reused. No deployment or push is authorised by this document.

## Permitted source and reproducibility

The unchanged `data/open-food-facts-au/manifest.json` identifies the 30 August 2026 OFF bulk CSV snapshot, 73,300 Australian records and 588 product shards, source SHA-256 `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`. The source URL is `https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz`. No refresh is performed. `data/coles-au/source-policy.json` pins the manifest and each reused product shard, along with exact row references and original `off:<GTIN>` IDs.

The existing [OFF data notice](OPEN_FOOD_FACTS_AU_DATA_NOTICE.md) records Open Database License (ODbL), Database Contents License and attribution to Open Food Facts contributors. Those notices are retained in the generated collection index, shards, policy and coverage manifest. This remains an identifiable derivative of the OFF layer; it does not blend generic reference composition or personal Diary data into that source database. No images are included. [ODbL §4.5(c)](https://opendatacommons.org/licenses/odbl/1-0/) excludes internal organisational use from its public-use share-alike requirement. This private, local job needs no source publication step; existing attribution and licence obligations remain. Any later public use is a separate decision.

Offline commands:

```text
node scripts/build_coles_catalogue.js
node scripts/build_coles_catalogue.js --check
node scripts/build_release.js
node scripts/build_release.js --check
node --test tests/coles-source.test.js tests/retailer-architecture.test.js tests/woolworths-source.test.js
node scripts/audit_coles_edge.js OUTPUT_DIRECTORY
node scripts/benchmark_woolworths_catalogue.js
node scripts/benchmark_retailer_architecture.js
```

The normal complete suite uses Node's test runner over `tests/*.test.js`. The bounded acceptance run uses `--test-concurrency=1` to prevent its browser and benchmark jobs competing. These commands document reproduction, not a request to run duplicate audits.

## Scope and counts

The finite source policy reviews 34 exact Coles-brand OFF identities across 16 category groups. It admits 23 products across 12 categories to ordinary browse: bread, milk alternatives, yoghurt, cheese, cereal, spreads, crackers/biscuits, snacks, sauces, protein snacks, cakes/desserts and non-alcoholic drinks. All Items uses the shared 20-product paging limit. Five evidence shards contain at most eight records each.

The unchanged shared eligibility rules classify 29 as Loggable Now and five as Needs Nutrition Completion. Those five comprise three identity-only rows and two suspect nutrition panels with energy/macro disagreements. Six otherwise loggable candidates remain deferred from the collection for unresolved mass/volume, preparation-state, drained-basis, category or fractional-piece evidence. Thus 23 are ordinary browse choices and 11 are retained internally. Deferral is recorded in the source selection policy, not a Coles-specific runtime nutrient or exclusion rule. Existing exact OFF search/details behaviour is preserved.

All 34 are source-declared Coles brands; none is independently package/manufacturer verified by this job. All 34 source GTIN strings pass checksum validation, but a checksum is not independent identity verification. There are zero verified Coles retailer memberships, zero current-listing claims, zero national-brand products added and zero other private-label families inferred. All identities already exist in the protected OFF layer; zero new food identities are created. The 23 browser choices carry added collection provenance, while the remaining selected records and gaps are retained outside browse. There are no evidenced cross-retailer matches in this wave; synthetic safety fixtures exercise compatible and incompatible joins without asserting factual memberships.

`data/coles-au/coverage-gap-manifest.json` provides all per-record classifications, identifiers, source references, source modification dates, pack/serving strings, measures, raw-basis labels and missing-data reasons. Dates describe the OFF snapshot or contributor edits; they are not retrieval dates of current Coles listings. The previous source-access investigation remains preserved outside the repository and is not an ingestion input.

## Shared implementation

- `food-catalogue.js` adds an explicit `privateLabelCollections` evidence path. It requires reviewed OFF provenance and an exact retailer-name consumer brand. It never makes `retailerMemberships` verified and never changes OFF nutrition trust. Canonicalisation retains this separate evidence alongside existing conflict restrictions.
- `retailer-catalogue.js` allows a registered `source-declared-brand` collection through the existing directory, postings, hydration, paging, bounded caches and request ownership. The opt-in `selectableOnly` mode uses build-time shared eligibility postings and rechecks eligibility after hydration. Existing verified retailer catalogues keep their existing behaviour.
- `retailer-source.js` is reused unchanged. Generated `coles-au-catalogue.js` registers the index and lazy evidence shards through it.
- `alpha06.js` makes the smallest presentation change: collection-specific provenance wording in live retailer guidance and submitted/guided browsing. Search ordering, food/brand routing, consumer brand text, measure/Review controllers and persistence are reused.
- `scripts/release-contract.js` includes the new runtime adapter. Existing required versus optional asset policies are unchanged. Generation, shell and worker are generated solely by `scripts/build_release.js`.

Raw OFF rows alone and weak stores/name matches do not enter this collection or claim retailer membership. Other Coles private-label families need independently permitted relationship evidence. A compatible canonical object keeps its source IDs and collection evidence in Search, barcode and cached consumers; the exact-GTIN conflict checks remain in force. No historical Diary, saved-food ID or personal storage schema is changed.

## Measures and evidence limits

Nutrition is exactly the existing `OFF.toFood` conversion of each pinned record. Optional missing nutrients remain unknown. No source values are averaged, borrowed from similar products, or completed using AFCD/AUSNUT. The pinned import does not retain raw panel qualifiers, original serving panels, stores or separate preparation-state fields; these cannot be reconstructed. The coverage report states this limitation instead of presenting the records as verified package panels.

The shared measure layer provides grams and defensible source portions. Brioche's recorded `1 slice (42 g)` supports slices; two slices yield 84 g, approximately 242 kcal, 8.484 g protein and 1,011.528 kJ. Unsweetened almond milk's recorded 250 mL serving supports 250 mL, 49 kcal, 1.4 g protein and 204.1 kJ. These are calculations from community-source data, not newly verified label claims. The rendered audit checks both through one final Review into synthetic Lunch entries and checks persistence after reopen. Missing retail pack sizes stay unknown and do not imply a whole-pack serving.

Bread variants with separate GTINs remain separate even where names match. Unknown physical form retains the shared safe gram measure; unsupported serving controls remain omitted. Frozen/canned/rice/pasta gaps remain visible in the completion manifest. No national stock coverage or freshness guarantee is made.

## Acceptance evidence and release boundary

Final logs, candidate hashes, screenshots and the complete-suite result are recorded in the external task evidence directory:
`C:\Users\mlwes\.codex\visualizations\2026\09\13\01a099c2-f92c-76c1-bf7e-779887b959fe\hec-coles-evidence`.

The 390×844 audit uses the real application controller with disposable synthetic data. It covers honest directory wording, 20/3 paging, Back, guided bread, excluded incomplete bread, Coles → Woolworths → generic Bread, canonical exact search/barcode, two Review/Diary flows and reopen persistence. The 320×568 context checks controls and width only. All browser application requests are fulfilled from this candidate or blocked, with no live TEST/My Data fallthrough. Existing national-brand, Woolworths, restaurant, generic-food, logo and saved-data regression audits remain in the complete source suite.

Starting source is `3caa0c2ffd54d00d84c4018f6bd6b2a4cdeb9880`, branch `alpha-0.6.33`, parent `6e1b70fa5c1143475bc3d03d62eeeac5661074e5`; the initial tree was clean. Protected TEST v38 is `5e965b9956aa79370afd97a1c58306ca5e1058ad`, My Data v7 is `566fa5900ef881f087cff6f3a7e763c59fa7b04e`. Those tips were verified in the accepted source-access stage; this continuation does not repeat that preflight. No real personal browser/PWA data, storage or backup is accessed.

Before any later separately authorised TEST deployment, review this community-source scope and remaining gaps. A small physical-iPhone set should cover Coles directory/paging/back, private-label guided bread, bread/drink amounts through one Review, generic scope restoration and synthetic Diary persistence after reopen/offline. This job does not run that physical-device acceptance or deploy either live release.
