# Woolworths Australia first food catalogue

This source-only wave starts at `703f230f07109941506b0b1b8b79ba306b303370` on `alpha-0.6.33`. It registers 43 publicly evidenced Woolworths food products across 17 retailer categories. Actual consumer brands remain separate from retailer membership: 32 products have verified Woolworths/private-label relationships and 11 retain national brands. The visible version stays 0.6.33 and the source TEST-role cache stays v5. This document does not authorise deployment.

## Evidence and reproduction

`data/woolworths-au/public-products.json` contains factual extracts from 47 product pages retrieved on 12 September 2026 UTC. A further discovered product URL redirected to the home page. `capture-manifest.json` retains exact/final URLs, response status, UTC retrieval time, content type, bytes and SHA-256 for every capture, including brand/category context. Whole public responses remain in the source-wave evidence directory outside the production repository. No login, account, store, private API, CAPTCHA or access-control bypass was used.

The exact displayed brand, original title, GTIN, pack, raw serving/nutrition strings, original department/category/subcategory labels and no-location availability flags remain in the committed facts. Search snippets and OFF name matches did not establish membership. `source-policy.json` records the bounded selection, exclusions, reviewed physical forms, category mapping and product-level application of official private-label evidence.

The official Our Brands directory and individual family pages support Woolworths, Woolworths Essentials, Macro, Thomas Dux and Free From Gluten. Woolworths Group own-brand information supports The Odd Bunch. Only products whose freshly captured displayed brand matches that relationship receive commercial-identity membership. Historical Select, Homebrand and Gold names are not promoted to current private-label products.

Rebuild the runtime index, six evidence shards and audit report without network access:

```text
node scripts/build_woolworths_catalogue.js
node --test tests/woolworths-source.test.js
node scripts/benchmark_woolworths_catalogue.js
node scripts/benchmark_retailer_architecture.js
```

The builder verifies every copied exact-GTIN OFF row against its original protected shard bytes and row index. `off-corroboration.json` pins 34 rows and their source hashes. The protected OFF snapshot remains 73,300 records and 588 product shards, with source SHA-256 `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`.

For a separately authorised future refresh, `scripts/capture_woolworths_public.js OUTPUT_DIRECTORY URL ...` retrieves only explicitly supplied public HTML pages. `scripts/extract_woolworths_public.js CAPTURE_DIRECTORY OUTPUT_JSON` verifies the capture hashes before extracting facts. A redirect away from product details is not product evidence. Re-capture changes evidence dates and requires a new reviewed selection; it is not part of the offline build.

## Runtime and safety

The generated `woolworths-au-catalogue.js` registers through reusable `retailer-source.js` and the existing shared retailer contract. The lightweight index contains verified membership and search postings. Bare retailer recognition/directory browsing hydrates no products. Pages select at most 20 canonical groups, with at most two factual evidence rows per group in this wave; each shard contains no more than 16 raw rows. Queries carry ownership checks, registration changes invalidate pending results, and page and shard caches are bounded.

Root Woolworths browsing can show national brands. Bread → Commercial → Supermarket / Brand Name → Woolworths shows only verified private bread identities. Submitted search and barcode consumers retain the canonical official/OFF result itself. Hydrated retailer evidence also participates in cached online result selection.

Three concrete issues encountered with real evidence required narrow shared fixes: an official row with a serving discrepancy must retain its official display identity over weaker OFF evidence; “sandwich slice bread” is a loaf title, not a filled-sandwich family; existing equivalent solid-form enum labels must compare as the same physical form. Material brand, pack, variant and genuinely different physical-form conflicts remain blocked.

The generated report currently classifies 23 products as Loggable Now, 20 as Needs Nutrition Completion and zero as Details Only. Seventeen canonical products have unresolved material evidence restrictions, including 11 same-GTIN identity conflicts. The remaining three restricted products lack usable nutrition. Labels such as Product Identity Conflict are retained under the shared completion status and offer Details rather than ordinary logging. No source nutrition is averaged. All 43 production GTINs pass checksum/format validation; no invalid value is corrected or promoted. Seventy-seven raw rows resolve to 43 canonical identities, retaining all 34 corroborating OFF rows.

All 43 products are listed-page-evidenced at retrieval; all 43 retain uncertain current/local availability. Even a positive no-location stock flag does not establish universal availability. A negative flag does not establish nationwide discontinuation.

Pack size remains separate from consumption. Published metric servings and per-100-g/mL nutrition establish logging amounts; pack count alone creates no piece, slice, bar or biscuit conversion. Qualified nutrient values such as `< 0.1 g` remain null as exact values, with the original qualifier retained. Spreads use source evidence and already accepted published measure standards, with no borrowed Flora conversion or invented teaspoon. Dry rice/pasta/oats and uncooked chicken retain their as-sold nutrition state. The Odd Bunch pack identities do not replace generic Carrot or Apple, and missing produce nutrition is not filled from AFCD.

## Known gaps and review boundary

This is a bounded first wave. It does not reproduce the entire ecommerce inventory. Two captured pages lacked a usable product identity. Bell Farms ownership remained unverified in the captured brand sources. An additional bread variant had a published pack/serving-count discrepancy and one snack URL redirected away. Those five candidates are deferred. Rounded or inconsistent retailer serving counts remain restricted under the accepted evidence rules; no discrepancy is silently repaired. Older OFF brands and imprecise broad physical-form metadata can conservatively restrict an otherwise well-evidenced current product.

The final external source-wave report records actual mobile results, focused/full-suite totals, performance, source integrity, protected-environment checks and the one local commit if all gates pass. No TEST/My Data deployment, source push, Coles work or queued polish is part of this wave.

Observed supermarket polish for later review: duplicate display titles across distinct juice GTINs could use clearer pack/source context; restricted source count discrepancies would benefit from more specific user-facing wording; food-page completeness and remaining coverage could be shown without implying stock availability. These observations are not implemented here.
