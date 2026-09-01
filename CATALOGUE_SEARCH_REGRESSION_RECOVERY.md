# Catalogue-search regression recovery

This Alpha 0.6.33 recovery keeps the committed 73,300-product Australian catalogue and restores a product-list-first selection flow. It does not add a brand-specific resolver.

## Facet decision

Sets of 50 or fewer selectable products show concrete product names directly. Larger sets may show a facet only when every quality gate passes:

- two to eight distinct values;
- at least 80% value coverage;
- no more than 15% missing, `Other`, or weak taxonomy members;
- no branch containing more than 75% of the set;
- no broad labels such as `Other products`, `Fats`, `Dairies`, or `Spreads`;
- a computed score of at least 70 after coverage, imbalance, weak-label, and cardinality penalties.

If no facet passes, the interface presents the first 50 real products in paginated-product mode. Facets are therefore optional aids, not mandatory catalogue hierarchy.

## Exact-product decision

Serving is exposed only after the contextual exact-product quality gate accepts a meaningful consumer-facing identity. Brand references, barcode placeholders, generic labels, duplicate weak names, and one-word family/line placeholders remain in the product universe but cannot become exact consumable identities while better context exists.

## Async state

Each normalized query change receives a monotonic revision. Local results are committed as a frozen snapshot. Online results use a separate append-only snapshot and surface. Writes carrying a stale revision or query are rejected, so network timing cannot reorder local results or replace the active exact match.

## Trusted spread conversion

The repository already contained one generic Australian margarine conversion: one teaspoon equals 5 g. The central spread profile reuses only that conversion. No validated generic tablespoon or thin/regular/thick spread weights were found, so those measures remain unavailable unless explicit product metadata supplies them. Grams always remain available when a defensible gram basis exists.
