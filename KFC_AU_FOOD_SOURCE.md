# KFC Australia Food Source — Founder-Trial Notice

Current reviewed wave: `kfc-au-2026-09-11-founder-trial.2`. The September 2
foundation below remains an immutable historical snapshot. Its counts are
the before-state, not the current expanded catalogue. See the September 11
supplement section for current coverage and qualifications.

Snapshot: `kfc-au-2026-09-02-founder-trial.1`
Reviewed: `2026-09-02T15:30:00+10:00` (Australia/Brisbane)
Scope: development/founder-trial only; no production catalogue-reuse approval is claimed.

## Official sources and authority

- Current product existence, names and category memberships: [KFC Australia live menu](https://www.kfc.com.au/menu).
- Current identity, options and displayed component energy where reviewed: official pages under `https://www.kfc.com.au/menu/...`, including the [Zinger Burger](https://www.kfc.com.au/menu/burgers/zinger-burger), [Zinger Burger Combo](https://www.kfc.com.au/menu/burgers/zinger-burger-combo), and [3 Piece Box](https://www.kfc.com.au/menu/boxed-meals/3-piece-box).
- Older exact-name energy corroboration: [KFC Australia Nutrition & Allergen](https://www.kfc.com.au/nutrition-allergen). That page labels its information “Information correct as at September 2023”, so it never establishes current product existence by itself.

Only public KFC Australia pages were used. No account, cart, private API, user-specific pricing, US data, third-party calorie site, marketing description, promotional prose, image, or artwork is stored.

## Snapshot and coverage

The reviewed live surface contains 12 categories and 144 menu rows. Repeated menu appearances are normalised to 126 canonical current products while retaining every category membership. The normalised factual snapshot SHA-256 is `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2`.

Raw HTML hashes could not be captured through the available reviewed browsing surface. This limitation is recorded explicitly in `sourceCaptures`; the normalized facts, retrieval timestamp, URLs, row counts, and derived snapshot hash remain reproducible.

Current catalogue quality:

- 57 current products with official fixed energy only.
- 61 current configurable products, all details-only until a component configurator exists.
- 8 current identity-only products with no usable fixed energy.
- 0 products with current reliable full macros; missing macros remain absent, never zero.
- 4 products marked limited/current offer because they appear in Featured Offers.
- 2 resolved source conflicts: Regular Gravy (current product-page component 241 kJ versus older guide 215 kJ) and 3 Pieces of Chicken (current three-piece Original Recipe component 3093 kJ versus older guide 2951 kJ). Current component values are retained and both older values remain disclosed.

## Nutrition and configuration policy

Official kJ is the stored source value. Display Calories are derived as `kJ ÷ 4.184`, rounded to one decimal, and labelled as derived. Protein, fat, carbohydrate, sodium and other nutrients are included only if an official reliable source supplies them; this snapshot supplies none.

A fixed standard item such as a Zinger Burger remains a valid exact identity even though optional extras exist. Reviewed Zinger extras preserve official current component kJ where shown; extras with no displayed energy remain unknown. The base item is never silently changed.

Combos, boxes, Go Buckets, kids meals, shared feasts and other required-choice bundles use the existing `configurable-bundle` semantic model. They are searchable and browseable but cannot be added as one guessed total. Counted products retain their count as identity and serving semantics; sized products retain their size.

## Shared restaurant architecture

KFC registers through `food-sources.js`, is converted by the same `toFoodRecord` path as McDonald’s Australia, and uses the same central catalogue ranker, restaurant alias detection, source hub, category rendering, review editor, serving policy and voice resolver. There is no KFC-specific search engine, voice parser or portion engine.

A future reviewed restaurant source can plug in by providing the same source metadata, canonical items, browse categories, semantics, nutrition states and provenance, then registering once. No second search framework is needed. This document does not implement another chain.

## Refresh and audit

Run:

```text
node scripts/audit_kfc_au.js
node scripts/audit_kfc_au.js --fetch
node scripts/audit_kfc_au.js --compare path/to/reviewed-candidate.json
```

The first command verifies the approved snapshot hash and integrity. `--fetch` re-reads the public official menu, records its response hash, and reports missing known categories/products for review without changing local data. The optional comparison reports added, removed, nutrition-changed, detail/configuration-changed and unchanged identities through the shared catalogue diff. It is read-only: a failed fetch/parse or candidate validation leaves the last approved catalogue untouched. Renames intentionally appear as one removal plus one addition for human review.

Proposed cadence is weekly manual review and additionally after an identified featured-offer change. Any candidate requires human approval before source data changes. Missing current items are retired in history rather than deleted.

## September 11 supplemental review

Reviewed at `2026-09-11T19:21:53+10:00`, using public first-party Australian
pages. `kfc-au-supplement-data.js` stores the reviewed numerical facts and
URLs; `kfc-au-catalogue.js` merges them into the same registered identities.
The protected `kfc-au-catalogue-data.js` payload and its normalized hash are
unchanged. No additional restaurant database or ranking bypass is used.

Current coverage is 148 canonical products: 126 retained foundation
identities plus 22 added identities. The 144 protected category appearances
still contain 18 duplicates. The supplement adds seven menu foods, six large
drinks, five individually defined dips and four plain chicken components.
Those 22 identities have 29 category appearances; seven are additional
category memberships, not additional products.

- Loggable Now: 78 (19 with all seven requested nutrients, 4 partial and 55
  energy-only).
- Needs Nutrition Completion: 9 (8 identity-only and the unresolved 6 Nuggets
  order composition).
- Details Only: 61 configurable identities.

The [live nutrition guide](https://www.kfc.com.au/nutrition-allergen) exposed
19 reviewed per-serve/per-100-g tables through its More Info dialogs. Its
September 2023 publication label is preserved even though the page contains
newer promotions; retrieval date does not prove a new publication date.
Protein, fat, saturated fat, carbohydrate, sugars and sodium are now retained
where actually published. Missing fibre remains absent. Four plain chicken
components come from the [individual and promotional item table](https://www.kfc.com.au/nutrition-allergen-item),
labelled 24 March 2025. That table's sodium headers say grams while its cells
look like milligrams. Raw cells and headers remain evidence; runtime sodium
is unknown until the unit conflict is resolved.

The [Original Crispy Burger Box](https://www.kfc.com.au/menu/boxed-meals/original-crispy-burger-box)
component selector supplies six separately identified large drinks.
The [3 Original Tenders](https://www.kfc.com.au/menu/chicken/3-original-tenders)
page supplies five named dip alternatives. Only their official fixed energy
is added; no weights, liquid volume or missing macros are inferred.

The [3-tender order](https://www.kfc.com.au/menu/chicken/3-original-tenders),
[5-tender order](https://www.kfc.com.au/menu/chicken/5-original-tenders) and
[10-nugget order](https://www.kfc.com.au/menu/chicken/10-nuggets) retain their
published totals with qualified whole-order measures: respectively one Aioli
Dip, two Aioli Dips and two Sweet & Sour Dips. Shared serving metadata
`individualScaling: false` prevents those dip-inclusive totals from becoming
plain-piece values. Plain tender/nugget records support piece logging instead.
The [6 Nuggets page](https://www.kfc.com.au/menu/chicken/6-nuggets) selects Aioli
while the guide total corresponds to Sweet & Sour. This unresolved conflict
blocks ordinary logging before measure selection. Existing gravy and
three-piece chicken energy conflicts retain their previously reviewed current
component values and older evidence.

The [Protein Picks menu](https://www.kfc.com.au/menu/protein-picks), root menu,
product pages and nutrition tables disagree about Liquid Gold, Pickle and
Hot Rod offers. Seven fixed Pickle foods are listed-at-retrieval, with store
availability unconfirmed. Five older offer/value identities are marked
uncertain and retained for history. Eleven additionally observed offer/box
names remain outside this bounded ingestion because their configuration or
freshness was not resolved. Three older promotional nutrition rows are
historical/unconfirmed findings, not newly asserted current products. No
discontinuation was proved and no historical record was deleted.

Rendered nutritional facts were transcribed from the reviewed official UI;
they were not obtained from a private API. HTTP downloads returned the SPA
shell, which is not a capture of the rendered tables. No rendered-page hash
is claimed. The supplemental numerical source is versioned and reproducible
alongside the unchanged protected foundation.

KFC remains in the shared source hub, canonical search, family resolution,
eligibility and serving flows. Bare Wicked Wings retains neutral 3/6/10
choices. Declared family aliases support Original Recipe; declared drink
families preserve regular/large identities. Explicit restaurant searches
retain their source and cannot silently become another restaurant or a
generic fallback. Shared optional extras retain supported combined energy
while clearing unsupported combined macros and weights.
