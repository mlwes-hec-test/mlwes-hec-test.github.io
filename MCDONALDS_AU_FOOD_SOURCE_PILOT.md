# McDonald’s Australia Founder-Trial catalogue

Checked 26 August 2026 against the current official McDonald’s Australia category surfaces, the reviewed product-page nutrition checkpoint, the current nutrition publication surface and representative live product nutrition. This is development/founder-trial source data. It is not represented as carrying an affirmative production catalogue-reuse licence, and `productionApproved` is false at the source, item, variant and runtime-record levels.

Official-source verification describes factual provenance only. It must not be interpreted as a licence or production approval.

## Current inventory

- 167 unique official product families after category-overlap de-duplication, with all category memberships retained.
- 142 families with a complete published fixed nutrition table.
- 17 families with incomplete or unavailable nutrition.
- 8 configurable meal/bundle families that cannot safely use one fixed value.
- 42 McCafé beverage families, including 63 complete published size-specific child records.
- 20 promotional families: the 19 products on the Featured surface plus Macca’s Mega Meal.
- 5 products explicitly described as limited-time. No expiry date has been invented.

The runtime has 209 searchable records: complete McCafé families with size tables are represented by child records rather than a generic fixed-value parent. This produces 184 loggable fixed records and 25 details-only records. Incomplete products and configurable bundles can be found, viewed and saved as favourites, but cannot be added to Diary.

## RC3 audit result — 26 August 2026

The audit enumerated every product link on all 17 current Australian category surfaces and reconciled the official product path/name/category memberships against the compact catalogue. The category counts were Featured 19, Breakfast 20, Burgers 25, Beef 16, Chicken & Fish 18, Wraps 6, Sides 20, Happy Meal 10, Desserts 13, McCafé Drinks 42, McCafé Food 11, Cold & Frozen Drinks 32, Shakes & Frappes 7, Condiments 15, All Day 14, Bundle Meals 8 and Loose Change Menu 8.

- Official unique product families: 167.
- Catalogue unique product families: 167.
- Added identities: 0.
- Removed/retired identities: 0.
- Renamed identities: 0.
- Category-membership differences: 0.
- Confirmed nutrition changes: 0.
- Confirmed serving-description changes: 0.
- Confirmed promotion/availability changes: 0.

The complete nutrition checkpoint had been reviewed page-by-page on 25 August 2026. On 26 August, the current nutrition publication surface and a live Big Mac product table were rechecked; the Big Mac serving and per-100 g facts matched the checkpoint exactly. Automated bulk re-fetching of all product nutrition tables was stopped after the McDonald’s site’s media/analytics shell repeatedly exceeded bounded browser timeouts. No value was inferred from a timeout, and no nutrition value was changed without a confirmed current official source.

## Architecture

`mcdonalds-au-catalogue-data.js` is the reviewed compact factual checkpoint. `mcdonalds-au-catalogue.js` transforms it into source-neutral schema-version-2 items and registers them through `food-sources.js`. The central catalogue resolver, natural-serving foundation and Diary flow remain shared with AFCD, My Foods, Recent and Recipes.

Stable identities are:

- family: `food-source:{source-id}:{item-id}`
- size child: `food-source:{source-id}:{item-id}:{variant-id}`

Category membership, nutrition status, variant/family identity, promotional status, provenance, published-source notes and inherited licensing fields are copied into immutable Diary snapshots. Later refreshes do not recalculate old entries.

## Nutrition and serving rules

The source stores the official per-serving and per-100 g or 100 mL values for energy in kJ and Cal, protein, total fat, saturated fat, carbohydrate, sugars and sodium. Fibre is absent because it is not in the published table. Missing nutrients remain missing; no values are estimated or zero-filled.

Natural product units are used for Diary defaults, such as burger, McMuffin, wrap, reviewed nugget portion, fries portion, drink, sundae, McFlurry or menu item. Fractions of those natural units are supported. No record defaults to 1 g. A serving weight or volume is stored only where the official product name supplies it; it is never back-calculated from the two nutrition bases.

Published source anomalies are recorded and retained without correction. This checkpoint includes the inconsistent kJ/Cal pairs on three double-McMuffin pages, Ranch Sauce’s published 0 Cal values, the Frozen Fanta Raspberry carbohydrate/sugars relationship, and the defective Iced Chai size links. In particular, Iced Chai Small/Large values are not borrowed from the Iced Latte pages to which the defective links resolve.

## Configurable bundles

The eight bundle records have a future assembly model with product, side-size and drink-size slots. Its intended nutrition rule is the sum of selected components. There is no fixed bundle nutrition and no catalogue-specific configurator in this release.

## Refresh and audit process

No scheduler is included. The proposed weekly process is deliberately review-gated:

1. Re-check McDonald’s Australia terms/access conditions and category surfaces.
2. Retrieve official pages conservatively into a staging checkpoint, recording retrieval time and exact URLs.
3. Map to stable family/variant IDs and report category, identity, nutrition, promotion, provenance and source-anomaly changes.
4. Preserve unavailable fields as unavailable and record newly published anomalies instead of silently correcting them.
5. Obtain human approval for the staged diff and effective/check dates.
6. Reconcile atomically: add approved items, snapshot changed prior versions and mark missing current items retired rather than deleting them.
7. Run the focused catalogue tests, integrity report and complete HEC regression suite.

Repeated retrieval failures retain the last reviewed catalogue and raise an audit error; they never empty the current catalogue. The audit artefact should include retrieval time, source URLs, diff, validation result and human approval.
