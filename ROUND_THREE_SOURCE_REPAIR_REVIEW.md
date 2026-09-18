# Round Three targeted SOURCE repair review

Preflight passed. Work used only C:/Users/mlwes/OneDrive/Documents/HEC Development/Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32. Starting branch alpha-0.6.33 was clean at 2f9f69613d99b45580bf81da9e6ae08ec96a7ae9, parent 3435b42ee57b43cc24084d63c852ced916a21236, subject “Expand supermarket house-brand catalogues”. Visible version remains 0.6.33. Starting generation was 174a5378e0f75a49c175f6b5.

TEST v46 is not founder-accepted and was not promoted. The founder's temporary update-paused/Potato Jewel observation is recorded as resolved after reopening; no update UX or service-worker template changes were made. The service-worker diff is generated release metadata only.

## Retailer meaning and identity preservation

The three supermarket roots now contain only accepted consumer brands whose exact existing normalized brand key has a verified current or uncertain-currentness private-label relationship in the accepted Round Three audit. Explicit legacy families are excluded. No new research, ownership inference, alias-family merger or stock claim was introduced.

The leak came from the shared private-testing browse code combining official listings, community store associations and private-label collections into the same postings. That allowed Pepsi Max into Aldi because of store evidence. Browse and commercial-concept postings now apply the verified family gate; global search retains the original accepted evidence groups. Evidence, names, nutrition, measures, GTINs and source identities are unchanged. Canonical search groups are deduplicated before pagination.

| Retailer | Before visible | After visible | After ordinary | After restricted | Memberships excluded | House families shown |
|---|---:|---:|---:|---:|---:|---:|
| aldi | 297 | 222 | 222 | 0 | 75 | 32 |
| woolworths | 960 | 362 | 347 | 15 | 598 | 11 |
| coles | 904 | 417 | 417 | 0 | 487 | 15 |

Woolworths previously had 940 ordinary and 20 restricted products; it now has 347 ordinary and 15 restricted. Aldi and Coles retained products are all ordinary loggable products.

Exactly 1,160 retailer/canonical memberships are excluded, not 1,160 deleted products: 1,159 have no verified house relationship and one is explicitly legacy (Woolworths Home Brand Dark Chocolate Chips, barcode 9339687430208). This is a relationship-based exclusion total; the evidence does not prove all 1,159 are independent brands. It includes unverified house-brand spellings. Every excluded brand/product is recorded in the audit. Pepsi/Pepsi Max, Kellogg’s, McCain, Birds Eye and John West remain searchable, and accepted Woolworths Select/Home Brand products remain searchable through their direct brand route.

The standalone Aldi and Coles Bakery keys are unverified in the accepted audit and were not silently approved. In particular, the Irish Cream Flavoured Ice Cream record with consumer brand Aldi is retained globally as dessert, but is excluded from Aldi root under this exact policy.

Overall counts are unchanged: brand-browse 7,489; brand directory 2,736; ordinary approved identities 7,511; packaged canonical universe 73,393. There are zero new identities, zero deleted source products and no filler products. All accepted source identity, nutrition, measure and relationship fields compare against the starting SOURCE hashes. Missing nutrition stays missing, incomplete records cannot become ordinary choices, and existing restricted rows remain restricted. Existing broader-search completion/details candidates retain their normal logging block.

## Food semantics and audit

The original classifier's broad category-tag suffix rule matched puffed-rice-cakes as dessert cakes. The later classifier retained that earlier category, or used loose ingredient/name tokens before identifying the whole food. Shared compound-food rules now run as the final projection in all four established builders and before the future Round Two fallback classifier. Original evidence category assertions remain intact; an explicit derived browse category controls navigation.

| Founder example | Final category |
|---|---|
| Original Thin Brown Rice Cakes | Crackers & Biscuits |
| Sea Salt & Balsamic Vinegar Flavoured Rice Cakes | Crackers & Biscuits |
| Carrot Cake Hot Cross Buns | Bread & Bakery |
| Irish Cream Flavoured Ice Cream | Desserts & Ice Cream (global control; standalone Aldi relationship is unverified) |

There are 48 category corrections in the retained retailer roots. The same shared rules correct equivalent accepted products in global brand browse. Further corrections include other hot cross buns and puffed rice cakes, cheesecake/cupcake/ice-cream compounds previously classified by chocolate or biscuit modifiers, cream cheese, potato gratin/bake, savoury meat pies, cottage pie, salad kits/pasta salads, stuffed peppers and a chicken/potato meal previously classified as sauce. Potato Jewels uses the existing Frozen Potato Products category.

The audit records all 1001 retained retailer rows, original structured categories, final categories, concepts, rules and corrections. It separates screened controls from 209 deferred candidates: 206 neutral Other Packaged Food rows, plus Cookies And Cream Pillows, Choc Chunk Cookie Pie and Butter Cake Mix. Their categories were deliberately retained. Standalone rice cakes without form evidence and pancake/mix/syrup variants are separately listed; no potato-cake or fish-cake production example was assumed. Unit fixtures confirm those phrases are not automatically dessert. Recipe bases, mixes, flavour-only confectionery and Korean/chewy rice-cake language are guarded against inappropriate overrides. No large dictionary or top-level taxonomy redesign was introduced.

## Discovery, search and rendered Review

A lightweight Browse house brands control sits above the existing food categories. It opens an alphabetical, counted family list using the existing retailer session and product-page loader. Categories remain available; Back restores the family list and then the root. API filtering also supports category/brand intersection.

Aldi → Browse house brands → Seasons Pride shows the two existing Potato Jewels and Potato Gratin products. Elmsbury shows its existing Party Pies. Equivalent family directories are generated for Woolworths and Coles. The source consumer brands remain Seasons Pride and Elmsbury.

Potato Jewel, Potato Jewels, Potato Gem and Potato Gems all find the accepted Seasons Pride Potato Jewels canonical identity barcode:4061463000316. The related Birds Eye Potato Gems identity remains available. Seasons Pride Potato Jewels remains an exact branded result. Direct brand search and retailer navigation reuse the same identity. Actual product names were not renamed. Aliases are explicitly tied to potato-jewel/gem phrases; there is no broad fuzzy spelling or loose bare-gem/jewel rewrite.

Fresh disposable Edge contexts at 320 × 568 used local SOURCE routing, blocked service workers and zero live-deployment fallthrough. Final rendered checks passed for all retailer roots, Aldi's Seasons Pride/Elmsbury navigation and Back flow, the corrected rice-cake and hot-cross-bun placement, the four aliases, exact branded search and independent-brand discovery. Geometry checks found no horizontal overflow or clipped controls. Representative screenshots were visually inspected.

Potato Jewels Review retained GTIN 4061463000316, a source-supported 10 g piece, and 3 pieces = 30 g → 54 Cal / 227 kJ. Five representative product Reviews passed. Amounts began blank, consumed amount remained independent of pack size, only one final Review was active, and zero Diary saves occurred.

Bread, Milk and Cereal retain base concept first; Milk excludes milk-chocolate pollution. Big Mac ranks first exactly. Hash Brown retains generic/source behaviour and ready-to-eat/packaged-frozen choices. New Search opens blank. Protected McCain GTIN 9310174025084 still resolves woolworths-au:98299 and renders 75 g → 130 Cal / 543 kJ.

## Verification and performance

The final bounded suite passed 101/101 tests. Earlier focused receipts retain two corrected test-fixture assumptions: Homebrand has no accepted exact-key directory (the actual accepted legacy key is Woolworths Home Brand), and retailer-prefixed product intent uses the identity filter rather than raw text-ranking score. The broad all-brand directory-controller sweep was interrupted in conservation mode; it is not claimed as completed. Source identity hash coverage and the focused brand/retailer, concept, admission, canonical and release regressions passed. Earlier data-rule review caught mix/recipe-base overreach and tightened it before final generated bytes and performance.

All four builders passed exact generated-byte checks. All 496 listed catalogue shards passed SHA-256 verification. Release/core/service-worker coherence tests passed, and the stale-output list is empty. Final generation is 345556f9ab7aef73efdc9a39; visible version remains 0.6.33.

Exactly one cold-first observation and one normal campaign were run after final runtime/data bytes stabilized. No warm-up, discarded samples or repeat campaign was used. Cold-first was 323.3 ms (limit ≤500 ms). The generic campaign has exactly 50 samples, median 53.6 ms (≤100 ms) and p95 103.1 ms (≤300 ms). The first normal generic sample, 313.2 ms, remains in the distribution. All ten established operations passed their existing gates.

| Operation | Samples | Median ms | p95 ms |
|---|---:|---:|---:|
| freshFoodLibrary | 50 | 69.2 | 141.6 |
| blankNewSearch | 50 | 68.8 | 139.6 |
| genericShortlist | 50 | 53.6 | 103.1 |
| exactBrand | 50 | 35.3 | 70.4 |
| brandProduct | 50 | 85.1 | 169.5 |
| brandBrowse | 50 | 35.0 | 56.9 |
| brandCategory | 50 | 4.1 | 7.5 |
| conceptBrandName | 50 | 9.9 | 15.3 |
| retailerBrowse | 50 | 3.8 | 6.3 |
| allItems | 50 | 3.7 | 7.1 |

## Commit and protected state

Exactly one local SOURCE commit is authorized by the completed gates, with subject “Repair retailer catalogue semantics” and direct parent 2f9f69613d99b45580bf81da9e6ae08ec96a7ae9. Its resulting SHA and post-commit clean-state check are supplied in the final handoff, since a committed report cannot contain its own commit hash. The branch remains alpha-0.6.33.

The read-only GitHub recheck confirms TEST remains 8a4fc6fe2ee132876c4079586269cd471b9ef74b and MY DATA remains 7c3e9e5805bb1bf1d1c8ad0667132b69e7f0b650. No push or deployment occurred. No personal browser/PWA data was accessed. No restaurant expansion, family-contribution development, new house-brand research or catalogue expansion occurred.

The misspelled project path remains a read-only Junction to the canonical path. Its target, creation time and last-write time are unchanged (2026-09-03T15:51:20.6882527+10:00). No operation edited through it or changed filesystem topology.

The next catalogue step, after review and replacement TEST acceptance, can target documented thin verified house-brand families such as Seasons Pride and Elmsbury. It has not begun.

Evidence: [full audit](data/catalogue-semantics-repair/audit.json), [final focused tests](data/catalogue-semantics-repair/final-focused-tests.txt), [final rendered receipt](data/catalogue-semantics-repair/rendered-final/house-brand-rendered.json), [performance](data/catalogue-semantics-repair/performance/house-brand-performance.json), [coherence](data/catalogue-semantics-repair/coherence.json), [protected SHAs](data/catalogue-semantics-repair/protected-final.json), [junction](data/catalogue-semantics-repair/junction.json).

SOURCE REPAIR PASS — READY FOR MYRON REVIEW BEFORE REPLACEMENT TEST DEPLOYMENT
