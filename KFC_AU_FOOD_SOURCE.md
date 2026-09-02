# KFC Australia Food Source — Founder-Trial Notice

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
