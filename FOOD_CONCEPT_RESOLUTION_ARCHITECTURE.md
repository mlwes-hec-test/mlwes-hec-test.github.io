# Food concept resolution

FOOD CONCEPT FIRST — TEXT MATCHING SECOND.

This contract applies to source Alpha 0.6.33. It does not change installation
identity, deployment state, catalogue snapshots or stored user data.

`search-foundation.js` owns the deterministic concept registry, compound and
head-concept classification, query facets, source policy, compatibility and
product exactness. An ingredient or shared title word is insufficient evidence
of equivalent identity. Specific source heads and specific categories distinguish
fluid milk from confectionery, ordinary bread from banana bread, and eggs from
chocolate eggs or chicken meat. Unknown identities remain unknown.

The query contract separates generic concepts, supplied facets, source/brand
intent, exact products, restaurant families, explicit restaurant counts and
consumed quantity. Restaurant family evidence comes from the existing source
metadata. Its neutral size/count choices remain authoritative until a count is
supplied. Exact normalized product identity precedes variants and lexical scores.
An unrelated same-title catalogue record cannot revoke a verified restaurant
item's source identity or nutrition eligibility. Distinct explicit barcodes
retain separate identity evidence even when consumer titles match; nutrition
completeness is still checked independently.

Typing remains preview-only. Deliberate Search/Return shows a concept-aware
Australian-first shortlist, capped at 20 rows. The base concept is first; only
selecting it opens progressive narrowing. Direct rows retain exact identity and
go to unresolved item questions, natural portion, amount and one final Review.
Bread starts Home Made / Commercial, then supported bread types or commercial
source classes (Bakery, Restaurant / Food Outlet, Name Brand, Supermarket Chain).
Milk starts source/type after its base is selected; Hash Brown starts context.
Query-supplied wholemeal, milk type, brand and quantities remain separate facts.

The shared shortlist assembler filters concept candidates before deduplication,
uses explicit relationships for crumbs/rolls and common prepared bread foods,
and reserves space for Australian brands and declared supermarket brands. It
uses source trust, identity completeness and deterministic diversity/alphabetical
ordering, with no invented popularity score. Relationships never imply equivalent
nutrition. Absent records do not create synthetic products or retailer links.
Generic shortlist quality now orders loggability, direct identity versus containing
dish title/menu-unit evidence, plain versus flavoured milk,
positive concept/facet evidence in the displayed name, source trust and explicit
Australia-only country tags before brand diversity. Within those quality bands,
existing Australian entity-registry recognition and compatible catalogue brand
counts precede concise display names and deterministic Australian-English alphabetic
ties. A category-only name is weaker evidence for the first shortlist, not a language
ban. No product names or brand-specific boosts were added. Exact product searches
continue through the unchanged exact-intent path.

Brand counts are distinct barcode (or record ID) counts of concept-compatible
external records declaring AU market in the current discovered candidate snapshot.
They include incomplete records as evidence of catalogue presence only; addability
still takes priority in selection. Normalized declared brand text combines case and
punctuation variants; missing brands are not counted or inferred. These are catalogue
coverage counts, not sales, real-world popularity or complete-market statistics.
A WeakMap caches counts by candidate-array identity, length and concept. The current
session appends immutable catalogue records; appends and replacement arrays invalidate
the cache. Typing does not run this shortlist calculation. Future in-place catalogue
metadata edits must replace the snapshot array.

Diversity operates within quality bands, so a weaker new brand cannot jump ahead of
stronger variants. Repeated brand/display labels consume one first-list slot while
their barcode identities remain available in broader/exact results. Direct reference
rows retain the existing subtype selection and use a deterministic en-AU alphabetic
display order. Group order and the 20-row maximum remain unchanged.
Explicit missing brand/source/product intent displays a verified-catalogue gap;
a different chain is never a substitute. Catalogue lookup failure is distinct
from verified absence.

`alpha06.js` owns the submitted concept session and actual controls. It retains
the original query, known facets, answer history, candidate snapshot and async
revision. Catalogue discovery reads existing local shards and adds compatible
records and explicitly declared related foods. Discovery expands declared aliases and their plural forms before
filtering; the OFF index can return different products for those spellings.
The source branch lists the compatible identities actually available
across loaded sources. It does not manufacture missing chains or brands. Search
diagnostics expose discovery totals so a bounded loaded pool is not confused with
the full catalogue. Stale responses cannot replace a selected food. Concept
controls share the existing pointer ownership mechanism, and unchanged renders
preserve the actionable DOM. The active card is positioned after layout so a
selected guided step exposes its controls on compact screens.

`guided-product-resolution.js` owns exact identity, addability, measure, amount
and Review handoff. Its generic bread/milk schemas use shared concept evidence;
milk no longer begins by restricting the candidate pool to cow milk. Explicit
product selection cannot restart a different generic identity search.

`serving-foundation.js` uses concept identity before ingredient words when choosing
the applicable measure category. Existing source conversions and approved HEC
practical reference measures supply numerical weights. Natural measure ordering
runs after the final physical-form firewall and cannot introduce a conversion or
restore a rejected unit. Grams remain the fallback when a natural conversion is
unsupported. Early addability continues to separate Loggable Now, Needs Nutrition
Completion and Details Only; unknown nutrients are never numeric zero.

Diary measure presentation omits bulk kg/L when grams/mL exist; the central safe
mass/volume capabilities remain available for other contexts. Big Mac is the
first explicit restaurant/product customisation capability in the guided engine.
Standard continues to burger amount; Changes shows an unsupported state with
Standard and Cancel available. The capability registry has no component nutrition.
No uncertainty percentage or guessed extras are introduced.

Flora's accepted measures are teaspoon 5 g, tablespoon 19 g, manufacturer serve
10 g and grams. Thickness is not an acceptance blocker. Thin/thick spread weights
remain a deferred measure-definition gap. The existing
spread policy and AUSNUT research do not validate those weights. Teaspoon,
tablespoon, manufacturer serve and grams retain their existing evidence.

`HEC_FOOD_CONCEPT_TEST` exposes the production session and candidate explanations;
submitted product rows carry exactness, compatibility, source trust, completeness
and ranking diagnostics. These are test interfaces, not user-facing scoring text.

Verification is layered: concept invariants, source coverage across the committed
73,300-product catalogue, actual Search/controller markup, complete measure/amount/
Review paths in genuine Edge, the established physical-form audits, independent
performance benchmarks and the complete serial canonical suite. A passing lexical
lookup or a correct record buried in a list is not acceptance. Inspect first
questions, excluded foods and natural measure labels, including obvious but
incorrect combinations such as an egg offered as a poultry serve.
