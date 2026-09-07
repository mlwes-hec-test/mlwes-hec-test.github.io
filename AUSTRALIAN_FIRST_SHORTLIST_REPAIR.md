# Australian-first shortlist source repair

Preflight passed on `alpha-0.6.33`: HEAD `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff`, parent `80df55263db384d06a8fe502fb2466645798d975`, message “Complete concept-aware food shortlist flow”; clean working tree and parent diff check. Repository root resolved to the authoritative HEC Development path.

The old assembler ranked complete products of the same source tier alphabetically, then gave unseen brands precedence over further variants. Its diagnostic lexical score did not control that ordering. This let weak early-alphabet names and brand diversity take scarce slots.

The shared generic-only quality ordering now considers addability, containing-dish evidence, plain versus flavoured milk, displayed concept/facet identity, source trust and explicit Australia-only country tags. Existing AU entity recognition and compatible catalogue brand counts break ties before concise names and deterministic alphabetic order. Diversity stays within quality bands. Duplicate brand/display labels consume one first-list slot; barcode records remain intact. Base, semantic groups, reference subtype selection, exact intent and the 20-row cap are preserved.

Counts are distinct barcode (fallback record ID) counts of concept-compatible external AU-market records in the discovered snapshot, using normalized declared brands. Missing brands are ignored. Incomplete records count only as catalogue-presence evidence; they do not become loggable. Counts are cached by candidate-array identity, length and concept; new arrays/appends invalidate the cache. No catalogue regeneration, popularity field, manual brand boost or network ranking dependency was introduced.

## Exact Bread first shortlist

Titles and source/brand subtitles below are copied from production-rendered Edge rows.

| # | Before | After |
|---|---|---|
| 1 | Bread | Bread |
| 2 | Bread roll, from white flour | Bread, from rye flour, sour dough |
| 3 | Bread, from rye flour, sour dough | Bread, from white flour |
| 4 | Bread, from white flour | Bread, from wholemeal flour |
| 5 | Bread, from wholemeal flour | Bread, gluten free |
| 6 | Bread, gluten free | Bread, mixed grain |
| 7 | Bread, mixed grain | Bread roll, from white flour |
| 8 | Breadcrumbs, white | Breadcrumbs, white |
| 9 | Bread & Butter Pudding | Bread & Butter Pudding |
| 10 | Wholemeal Bread — Generic Australian | Wholemeal Bread — Generic Australian |
| 11 | 5 Star Soft White — Wonder White | The One whole meal bread — Tip Top |
| 12 | Abbott's Village Bakery Grainy Wholemeal — Abbott's | Souvlaki Bread Plain — Mission |
| 13 | Ancient Grains + Activated Super Seeds Sourdough — BILL'S HEALTH BAKERY | Sourdough Bread — Helga's |
| 14 | Biscottes Au froment — MANNAPAIN | Complete Protein Bread — Herman Brot |
| 15 | 35hr Sourdough Loaf Wholemeal — Woolworths | Soft White Toast Loaf — Coles |
| 16 | Coles Hflgi 7 Seeds & Grain Toast Loaf — Coles Bakery | 35hr Sourdough Loaf Wholemeal — Woolworths |
| 17 | Crafted Sourdough Rustic Dark Rye Loaf — Woolworths Bakery | Crafted Sourdough Rustic Dark Rye Loaf — Woolworths Bakery |
| 18 | English Muffins — Coles | High Fibre Low Gi White Toast Loaf — Coles BAKERY |

## Exact Milk first shortlist

Titles and source/brand subtitles below are copied from production-rendered Edge rows.

| # | Before | After |
|---|---|---|
| 1 | Milk | Milk |
| 2 | Almond beverage, added sugar & Ca | Almond beverage, added sugar & Ca |
| 3 | Coconut beverage, added Ca | Coconut beverage, added Ca |
| 4 | Coconut beverage, unfortified | Coconut beverage, unfortified |
| 5 | Milk, cow, fluid, reduced fat (~1%) | Milk, cow, fluid, reduced fat (~1%) |
| 6 | Oat beverage, fluid, added Ca | Oat beverage, fluid, added Ca |
| 7 | Rice beverage, unfortified | Rice beverage, unfortified |
| 8 | Soy beverage, regular fat (~3%), added Ca | Soy beverage, regular fat (~3%), added Ca |
| 9 | Australian Light Milk — Generic Australian Dairy | Australian Light Milk — Generic Australian Dairy |
| 10 | CalciYum Chocolate Flavoured Milk — McDonald's Australia | Light Milk — Farmdale |
| 11 | A2 Milk — Brand not listed | Skim Milk — Dairy Farmers |
| 12 | Adelaide Hills Dairies 100% South Australian Fresh Milk Fat Reduced — Adelaide Hills Dairies | Fresh Milk — Norco |
| 13 | Almond coconut quench milk — pure harvest | Full Cream Milk — Liddells |
| 14 | Australian Full Cream Milk — Woolworths | Full Cream Milk — coles |
| 15 | Australian Lite Fresh Milk — Woolworths | Milk Full Cream — Coles |
| 16 | Fresh full cream milk — Coles | Organic Coconut Milk — coles |
| 17 | Lait Entier — Aldi | Skim Milk — Woolworths |

## Generalisation and coverage

- Cheese: 17 rows. Product rows: Cheddar Cheese — Generic Australian; Cottage Cheese — Westacre Dairy; Natural Cheese Slices — Bega; Mozzarella Grated Cheese — Perfect Italiano; Mozzarella cheese — Mainland; Creamed Cottage Cheese — Woolworths; Spreadable Cream Cheese — Woolworths; Spreadable Cream Cheese — coles; Parmesan Cheese — Coles Smart Buy.
- Yoghurt: 17 rows. Product rows: Greek-Style Yoghurt, Plain — Generic Australian; Chobani Yogurt — Chobani; Blueberry Yogurt — FARMERS UNION; Mango Yoghurt — Danone; Natural Yoghurt — Jalna; Vanilla yoghurt — Coles; Greek style Yoghurt — Woolworths; Premiére Greek Style Yogurt — Aldi; High Protein Greek Yoghurt — coles PERFORM.
- Cereal: 17 rows. Product rows: Sanitarium Weet-Bix Original — Sanitarium; Weet-Bix Kids — Sanitarium; Low Sugar Granola Raspberry & Coconut — Carman's; Muesli clusters — GoldenVale; paleo Granola — Brookfarm; Muesli Toasted Original — Coles; Granola Honey Roasted Nut — coles Finest; Summer fruit muesli — Woolworths; Classic Fruit & Nut Muesli — Woolworths.
- Hash Brown: 6 rows. Product rows: Hash Brown — McDonald's Australia; Hash Browns — Your Spud Co; Hash Browns — McCain; Hash Browns — Seasons Pride; Hash Browns — Birds eye.

Helga’s Sourdough Bread is row 13 of bare Bread. The discovered snapshot contains 18 compatible declared Helga’s records; Traditional Wholemeal Bread (`off:9310128002499`) is loggable, concept-compatible and second in its brand-only shortlist. It beats Biscottes in the regression pair but is outside the bounded first list because Sourdough is the brand representative. “Helga's wholemeal” still returns Traditional Wholemeal Bread first through exact product discovery (a distinct committed barcode, `off:9310023145024`). No Helga’s pin was added.

Tip Top’s The One whole meal bread is row 11; the discovered snapshot has 10 compatible declared Tip Top records. Sunblest exists: six committed records contain that name in their title/brand, all identity-only in source nutrition metadata. It does not qualify as a complete first-list product. Other incomplete Tip Top/Helga’s records remain available with their original completion requirements.

Remaining limits: snapshot prevalence is bounded by existing discovery (for example, the “breads” lookup reports 524 records while each discovery request remains capped at 500); it is not a census of all compatible products. Country tags and English-facing title evidence are imperfect locality proxies, not origin certification. The concise Milk list still includes a legitimate coconut milk product. Related Bread & Butter Pudding remains nutrition-incomplete. No coverage or nutrition values were invented to fill these gaps.

## Verification

- Focused tests: 46 passed, 0 failed. Includes shared AU quality across six concepts, alphabetical direct references, cached distinct-record counts, containing dishes, exact foreign reachability and existing Big Mac/Hash Brown/Flora contracts.
- Complete canonical command: `node --test --test-concurrency=1 tests/*.test.js` — 1,155 passed, 0 failed, 0 skipped (361,797 ms).
- Food-concept catalogue audit: 73,300 products, zero violations; 16,495 ms.
- Targeted genuine Microsoft Edge 152.0.4191.66: all six families at 320×568, 390×844 and 430×932; identical lists across sizes; 18 direct selections; base first, preserved groups, no horizontal overflow. All 278 requests per viewport were fulfilled from local source; zero live TEST fallthrough or page errors. Exact Big Mac, Flora ProActiv Light, McCain hash browns, Biscottes Au froment and Lait Entier remain reachable.

Search-session benchmark was run once with unchanged thresholds:

| Operation | p95 ms | Existing limit ms |
|---|---:|---:|
| genericSearch | 48.689 | 250 |
| largeCatalogueSearch | 13.987 | 250 |
| kfcRanking | 24.502 | 250 |
| progressiveResolution | 83.133 | 250 |
| portionProfile | 1.685 | 100 |
| characterRecognition | 7.4 | 20 |

No benchmark failures. No separate full physical-form/450-measure audit was rerun: serving and physical-form source files were not changed. Required canonical tests were retained in full.

Final independent Edge audit also passed all three viewports; its exact lists and direct-selection results match the targeted acceptance run. Raw screenshots/routing evidence remain outside the repository in temporary directories.

## Protected state and local commit scope

Protected payload, serving/physical-form and deployment paths match the starting HEAD. OFF remains snapshot 2026-08-30: 73,300 imported, 70,832 searchable, 12,239 brands and 72,671 valid GTINs; source SHA `F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176`. The recalculated KFC snapshot hash is `e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2`.

Version remains 0.6.33 and source TEST cache remains `healthy-eating-companion-test-alpha-0-6-33-v5`. Live TEST and HEC — My Data were not accessed or modified; Edge used disposable contexts and local-source virtual TEST routing exclusively. No push, deployment, catalogue import or refresh was performed.

The intended single local source commit has parent `73efe18f9a1ab89bb5b088549b7e9d7eff00d9ff` and message `Improve Australian-first shortlist ranking`. Its scope is the shared catalogue shortlist ranking, focused tests, targeted Edge audit and two documentation files. The final response records the resulting SHA and clean status.
