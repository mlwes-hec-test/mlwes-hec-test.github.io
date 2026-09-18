# Shared retailer browse and GTIN identity safety

## Current supermarket browse policy (Round Three source repair)

Aldi, Woolworths and Coles roots mean the retailer's verified own/private-label
families. They do not mean every product sold by that supermarket. The accepted
Round Three family audit supplies an exact consumer-brand-key map in each built
retailer index. Only verified current or uncertain-currentness relationships are
eligible; explicit legacy and unverified spellings are excluded. Currentness of
a family never asserts live product availability. This policy supersedes the
historical listing-only browse admission described below for these three adapters.

Listing, store-association and private-label evidence remains unchanged. Search
postings retain accepted independent and legacy products, whereas retailer browse
and commercial concept postings apply the family gate. Exclusion from a root does
not remove a product or change its consumer brand, canonical identity or nutrition.

The retailer root retains food categories and offers a House brands list. Brand
selection pages the same canonical groups, supports category intersection, and
uses the existing query ownership, cancellation and Back behaviour.

`scripts/food-category-semantics.js` applies high-confidence compound-food rules
before historical token/tag categories. All four established builders apply the
same final projection through `scripts/catalogue-semantics-repair.js`; future
Round Two classification also uses the shared rules before broad fallback rules.
`browseCategoryId` records the derived display category without rewriting category
assertions inside original relationship evidence. Ambiguous forms remain unchanged.
The repair does not re-run admission or mint new identities.

Potato Jewel/Jewels/Gem/Gems are controlled search aliases. They are attached only
to an actual potato-jewel/gem product name, and never rename that product. Search
deduplicates canonical groups before pagination.

Architecture repair based on source checkpoint `33aa1ac482424b85173f641736644c244de20325`, branch `alpha-0.6.33`. This change contains no production retailer listings or product ingestion. Source version 0.6.33 and TEST-role cache v5 are unchanged. Live environments are outside this change.

## Identity and evidence

`food.brand` remains the actual consumer-facing brand. `retailerMemberships` is a separate array of listing evidence:

```js
{
  retailerId: 'example-grocer', market: 'AU', scope: 'food', verified: true,
  categoryIds: ['bread'], listingState: 'listed-at-retrieval',
  evidence: {
    trustClass: 'official-au-retailer', sourceId: 'example-au',
    recordId: 'source-record-id', url: 'https://retailer.example/product',
    retrievedAt: '2026-09-12T00:00:00Z'
  }
}
```

Accepted membership evidence classes are Australian official retailer, official manufacturer, or verified package evidence. A source ID, record ID, HTTPS source reference and retrieval date are required. These are adapter assertions that ingestion must substantiate; schema validation cannot independently verify a web page. Names, brand text, OFF URLs and private-label family guesses never create membership. OFF nutrition keeps its community trust even when a separate official listing is attached. Current stock at a particular store is not asserted.

`commercialIdentities` requires additional evidence with `entityId`, `market: 'AU'`, `verified: true`, `relationship: 'own-label' | 'private-label'`, the actual `consumerBrand`, and the same provenance shape. The brand must match the product's consumer brand. Retailer membership alone cannot establish a commercial identity.

## Browse adapter

`HECRetailerCatalogue.registerCatalogue` accepts a retailer identity, food category descriptors, lightweight evidence/index rows, and `loadRecords(ids, {isCurrent})`. No production adapter is registered in this repair. Unknown registered retailer catalogues show an explicit empty state.

Each index row carries a stable record ID, canonical identity/GTIN, market and retailer evidence; commercial rows also carry consumer brand, commercial evidence and concept IDs. Categories use stable IDs, display labels and an explicit food scope. Non-food categories cannot admit products. Adapters must classify food scope from evidence, rather than a name guess.

Registration builds category and commercial-concept postings once. A canonical group enters browse only when at least one of its records has verified food listing evidence for a declared food category. Other indexed evidence for that same canonical identity is retained for compatibility analysis, even if it does not independently assert a retailer listing. Unlisted standalone identities remain absent.

Adapters must supply all known evidence rows for each canonical group. Pagination never splits a GTIN group. Each page contains at most 20 canonical identities and each group at most 32 evidence rows. Oversized groups fail registration and require adapter quarantine or review. At most 64 food categories and 16 hydrated page-cache entries are retained per retailer. Product hydration is skipped for typing and directory navigation.

The loader must return every requested ID exactly once, with the indexed canonical identity and matching listing evidence. Missing, changed or partial groups fail closed. Registering a replacement catalogue invalidates old page caches and pending source results. Retailer aliases cannot take over generic foods, registered brands, restaurants or other retailers.

## User intent and navigation

An exact root retailer query opens retailer food categories, All Items, bounded products, More/Previous and Back. National and private-label products retain their actual brands.

Bread → Commercial → Supermarket Chain → retailer uses `scope: 'commercial-identity'` plus the selected food concept. Only verified own/private-label products enter that scope. The separate Name Brand and direct consumer-brand paths remain available. No real house-brand range is populated by this repair.

Sessions own the raw query, query revision, retailer, scope, category and request revision. Changed input and leaving Search cancel the retailer session. Late category or product results cannot replace a newer request. Back returns to the retailer categories or originating commercial identity choice; Cancel clears retailer intent. Selection uses the existing transient canonical lookup, guided measure/amount flow, final Review and Diary snapshot logic. Persistence functions and migrations are unchanged.

## Same-GTIN conflicts

Exact GTIN remains the grouping key, with compatibility checked before a clean canonical result is returned. Known brand, metric pack, physical form and explicit flavour/variant/fat/salt/size/format/diet/count/family fields must be compatible. Missing fields are not invented. Existing nutrition tolerances and source-authority rules remain in force.

Display-title inequality alone is not a conflict. Structured identity is compared first, with recognized material title attributes providing additional evidence (including title-only pack/count and explicit formulation). Punctuation, casing, word order, harmless descriptors and repeated compatible pack wording may differ. This uses the shared concept vocabulary and explicit material attributes, not string distance or a special case for a fixture word. Compatible alternate titles remain in source evidence and search aliases. Existing source trust, publication currentness and quality ordering choose the preferred title and nutrition; no title is fabricated.

Compatible records retain source references and the preferred source's nutrition; values are never averaged. Different GTINs remain distinct. Incompatible same-GTIN records produce unresolved material `same-gtin-identity-conflict` evidence, preserving both source identities and differing attributes. A deterministic display representative does not resolve the conflict. Normal logging is blocked even when one identity source has higher authority. Re-canonicalisation and shared dedupe/federation retain that block.

The result shows Product Identity Conflict. View Details compares the conflicting records and provides their source references. This is an auditable quarantine state; this repair does not implement automatic conflict resolution or a human adjudication editor. A later source wave must audit these conflicts before accepting any real products. Material attributes outside the supported vocabulary must be supplied structurally by the source adapter.

## Canonical result consumers

The presentation contract is the retained canonical semantic result, including eligibility, provenance and conflicts. It is not JavaScript reference equality with a raw input. Cached online matching, legacy matching and the online library renderer canonicalise the full local/cache evidence set before ranking canonical records. Online scope uses stable constituent IDs, and existing score/Australia/name order remains intact. Product-match caching preserves scored key order while retaining the complete canonical policy record, including evidence from competing inputs that did not score. Both paths remember the canonical result for subsequent lookup and Details/selection.

The consumer audit found four affected paths in `alpha06.js`: `cachedOnlineMatches`, `cachedLegacyMatches`, `renderOnlineLibrary`, and `s23CacheProductMatches`. Other reference checks in guided candidate partitioning and catalogue tiering operate within the same canonical array; the voice Diary lookup has a stable-ID fallback. They do not map enriched policy results back to raw records.

## Verification entry points

- `tests/retailer-architecture.test.js`: membership, context, generic second retailer, bounded loading, food scope, source conversion and async ownership.
- `tests/same-gtin-identity-safety.test.js`: compatible evidence, 420/840 g conflict, variant/brand/form/count/size conflicts, nutrition authority, distinct GTINs and all dedupe paths.
- `tests/canonical-result-consumers.test.js` and strengthened O01 in `tests/post-deployment-iphone-integration.test.js`: actual production cached consumer functions, ranking, legacy results, retained provenance/conflicts and stable-ID lookup. Test 14 in `tests/stage8a-food-catalogue.test.js` checks compatible preferred-title evolution and retained older evidence.
- `tests/retailer-rendered.test.js` / `scripts/audit_retailer_architecture_edge.js`: disposable local Edge contexts at 390×844 and 375×812, actual cached renderer and Details lookup, query switching, generic/restaurant regression, pagination, both identity scopes, final Review, synthetic Diary saves and inspectable conflict block. Cached fixtures are seeded before startup; a diagnostic handle invokes the unchanged production renderer, with no renderer or lookup replacement.
- `scripts/benchmark_retailer_architecture.js`: synthetic 10,000-product index; recognition, directory startup, indexed page hydration, query switch and canonical subset bounds. Uses the existing 20 ms recognition and 250 ms query p95 limits.
- `scripts/benchmark_search_session_repair.js`: existing shared performance gates.

Synthetic fixtures use reserved example domains and are never loaded by HTML or the service worker. Real Woolworths captures, the 73,300-record OFF snapshot and existing source data are unchanged. Resume product ingestion only after this architecture change is reviewed and accepted in a separate authorised source wave.
