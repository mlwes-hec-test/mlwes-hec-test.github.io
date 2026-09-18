# Round Three house-brand audit and source review

## Decision: source verification passed; junction protection resolved

Myron accepted the filesystem finding and superseded the earlier separate-copy assumption. The misspelled project path is a read-only Windows junction alias to the canonical SOURCE repository. Changes made through the canonical path being visible through that alias are expected and are not a protection violation. The single local SOURCE commit is authorized after the completed verification gates. No push or deployment is authorized or performed.

The only authoritative working path is C:/Users/mlwes/OneDrive/Documents/HEC Development/Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32. The alias is C:/Users/mlwes/OneDrive/Documents/HEC Develpoment/Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32. Read-only checks confirm it remains a Junction, its target is exactly the canonical path, and both resolve to the same Git worktree and .git directory. Creation and last-write timestamps remain 2026-09-03 15:51:20 +10:00. All intended Round Three writes used the correctly spelled canonical path. No operation created, removed, retargeted, repaired, converted or reconfigured the junction, or copied files between the path names. See the updated [protection evidence](data/catalogue-round-three/path-protection-final.json), which preserves the original stopped finding as history.

## Preflight and source state

- Branch: alpha-0.6.33; initial source tree was clean.
- Starting SOURCE HEAD and direct parent of the authorized new commit: 3435b42ee57b43cc24084d63c852ced916a21236.
- Starting HEAD parent: 705cc4536eedc52db6d81564b9d51fedb42876fa; starting subject: Expand private-testing supermarket and brand catalogues.
- Exact authorized new commit subject: Expand supermarket house-brand catalogues. The resulting SHA and post-commit clean-state verification are reported in the task handoff; this report is included in that single commit.
- Starting generation: e27083db31dbcd7031159618. Accepted final generation: 174a5378e0f75a49c175f6b5. Visible version remains 0.6.33.
- Every requested starting count matched, including 5,554 Round Two newly approved identities.
- Bounded current-tree verification passed: all four builders exact, release stale-output list empty, intended diff only, whitespace sanity, all final counts and protected McCain unchanged.
- Hash verification confirms 425 files referenced by accepted browser/performance evidence remain byte-identical. Existing focused regressions and performance are reused; no broad test or performance campaign was repeated.
- The earlier stop was resolved by the user’s explicit junction interpretation. No filesystem topology change was needed.

## Discovery and admission

Existing retailer memberships, accepted brands, retained Australian Open Food Facts records, canonical identities and provenance were mined first. Bounded research then used official Australian product/category pages, brand directories, awards material and historical reports. Twelve direct public requests were sequential; additional public web-reader facts are recorded separately with fact hashes. A Coles challenge response was not bypassed or treated as relationship evidence; the readable official public brand directory supplied the reviewed facts. No accounts, outreach, security bypass, logos or marketing artwork were used.

There are 221 exact source-key audit rows: 58 current, 4 legacy and 159 uncertain; 82 have verified retailer relationships. 116 rows have accepted products represented. These are spelling-key views, not 221 independently verified house brands. Currentness and relationship proof are independent. Current family presence does not establish current stock or formulation of every retained product.

Private-testing admission remains reliable Australian identity plus reliable nutrition. Public-release licensing clearance was not used as an admission gate. Provenance, source/date/hash data and public-release-review-required metadata remain attached. No nutrition, natural measure or panel was guessed; unknown nutrients remain unknown.

The expansion adds 291 retailer collection memberships to existing accepted canonical products: Aldi 210, Woolworths 37, Coles 44. It creates zero new ordinary canonical identities and zero new packaged-universe identities. These products already existed in brand browse; supermarket discovery now reaches the same identities. All 291 panels, brands, GTINs, packs and measures are retained. Tests compare all 7,489 accepted brand records against starting SOURCE identity/panel/measure facts.

The existing private-label collection mechanism now accepts independently evidenced house-brand relationships tied to exact consumer brand and pinned AU-only product evidence. It does not claim a verified current retail listing. Same-GTIN canonicalisation and source precedence remain unchanged. A narrow explicit-retailer product filter includes house-brand tokens, fixing Coles Finest product selection. Six category/concept corrections prevent ingredient/use words from assigning an unrelated food concept. There was no broad schema redesign.

## Complete per-brand reconciliation

[Before-admission table](HOUSE_BRAND_AUDIT_BEFORE.md) and [final per-brand table](HOUSE_BRAND_AUDIT_FINAL.md) give starting/ending accepted and retailer counts, additions, holds and principal reasons for every source key. The [full JSON audit](data/catalogue-round-three/family-audit-after.json) also supplies source spellings, evidence IDs, candidate counts, alias notes and individual decisions. Every global accepted brand count remains unchanged. “Added retailer” means newly discoverable through that retailer.

Westacre and Westacre Dairy remain separate, as do Hillcrest and Hillcrest (Aldi), Macro and Macro Wholefoods Market, and other variants unsupported by established normalization. Woolworths Select and Homebrand are legacy. Standalone Select remains a separate unverified relationship key with legacy status; no current Select range is asserted. Historical relationship evidence may support retained Australian products while currentness stays uncertain. Unverified spellings gain no retailer membership.

## Count reconciliation

| Measure | Before | After local changes |
|---|---:|---:|
| Woolworths visible | 923 | 960 |
| Woolworths ordinary loggable | 903 | 940 |
| Woolworths restricted visible | 20 | 20 |
| Coles visible/loggable | 860 | 904 |
| Aldi visible/loggable | 87 | 297 |
| Brand-browse canonical products | 7,489 | 7,489 |
| Brand directory identities | 2,736 | 2,736 |
| Deduplicated ordinary approved browse | 7,511 | 7,511 |
| Packaged canonical universe | 73,393 | 73,393 |

New ordinary canonical identities: **0**. Canonical overlaps reused: **291**. Genuinely new canonical identities: **0**. New retailer memberships: **291**.

Held candidates span 8,895 distinct retailer/canonical pairs and 8,892 distinct canonical identities. Reasons overlap; source-key rows must not be summed. An unresolved secondary spelling can be held while the same identity is accepted under a proved primary brand. Three existing Coles internal records remain held: `9300601000562`, `9300601340828`, `9310645091334`.

## Representative rendered Reviews

Fresh synthetic 320 × 568 Edge contexts used only locally routed SOURCE, with service workers blocked and no live deployment fallthrough. No personal browser/PWA data or backup was accessed. Every example reached one final Review and zero Diary saves. Amount inputs began blank; consumed amounts remained independent from pack size.

| Retailer / actual source brand | Product and GTIN | Route / consumed amount | Review |
|---|---|---|---|
| Aldi / Seasons Pride | Potato Jewels; 4061463000316 | Retailer browse; 3 pieces = 30 g | 54 Cal / 227 kJ |
| Aldi / Elmsbury | Party Pies; 4088700087008 | Direct brand; 75 g | 199 Cal / 832 kJ |
| Woolworths / macro wholefoods market | Raw Buckwheat; 9300633203061 | Direct brand; 37 g | 133 Cal / 560 kJ |
| Coles / coles Finest | Garlic & Parsley Sausages; 9300601401826 | Direct product; 75 g | 213 Cal / 892 kJ |
| Woolworths / Woolworths | Unsweetened Almond Milk; 9300633473686 | Retained liquid control; 250 mL | 35 Cal / 146 kJ |

Canonical identities are `barcode:<GTIN>` and retained source IDs are `off:<GTIN>`. Potato Jewels have a source-supported 10 g piece. Elmsbury, Macro and Coles cover weight-based selection. No newly added liquid membership passed this round’s strict AU product corroboration gate; almond milk is explicitly a retained control. Full nutrient panels, measures, raw energy calculations and IDs are in the [rendered receipt](data/catalogue-round-three/verification/rendered-accepted/house-brand-rendered.json).

## Focused regressions and coherence

- Exact Woolworths, Coles and Aldi roots open/page the expected catalogues, preserving actual brands and one canonical identity.
- Rendered brand browse passed for Seasons Pride, Elmsbury, Westacre Dairy, Hillcrest, Macro, Coles Finest and Coles Kitchen. Unit checks also cover Westacre, Macro Wholefoods Market and Nature’s Kitchen.
- Bread, Milk, Cereal and Hash Brown retain base concept first. Milk concept tests exclude milk-chocolate compounds. Big Mac exact result ranks first.
- Bread → Commercial/Supermarket → retailer choices → Aldi products passed. Unrelated cucumber/ingredient mentions are excluded. Hash Brown retains home-prepared, ready-to-eat, packaged-frozen and typical source choices.
- New Search opens blank. Narrow mobile checks show no horizontal overflow or clipped controls. Three representative screenshots were visually inspected.
- Protected McCain GTIN `9310174025084`, alias `woolworths-au:98299`, remains **75 g → 130 Cal / 543 kJ** in rendered Review.
- Missing required nutrition never gains ordinary admission; unknown optional nutrients remain absent. Incompatible same-GTIN identities remain blocked. Aliases do not create duplicate consumer products.
- Natural measures retain accepted solid/liquid constraints. Retailer, brand, pack and consumed amount remain independent. Restricted/internal decisions remain intact.
- Other Packaged Food remains browsable and the Round Two category-cap repair remains intact.
- Focused coverage spans 95 distinct checks: house-brand admission, retailer browse, concept semantics, canonical conflicts, Round Two admission, performance policy, brand generation and release coherence. Earlier failures and corrections are retained in logs.
- Initial run: 87/92 passing. Source-baseline fixtures, derived retailer overlap count, protected Coles internal records and test API assumptions were corrected. Correction run: 27/27 passing. After the explicit house-brand filter fix: 77/78 passing; the sole failure was an inappropriate negative fixture letting existing brand-intent precedence replace retailer intent. It now supplies explicit retailer intent. Final house-brand run: 12/12 passing. No test failure remains unresolved.
- Accepted rendered checks pass. Earlier browser receipts preserve the Coles filter failure and unsuitable proposed liquid fixture, resolved in the final receipt.
- All four builders pass exact generated-byte checks. Index/shard hashes, required core, release shell, service-worker references and generation/cache behavior pass established checks. Stale-output list is empty.

Final release generation: **174a5378e0f75a49c175f6b5**; version **0.6.33**. Generation was calculated through the existing workflow. See [coherence receipt](data/catalogue-round-three/coherence-final.json).

## Performance

This follow-up reuses the accepted evidence after verifying unchanged runtime/catalogue bytes; no new measurement campaign was run.

One genuine cold-first observation: **350.5 ms**, within ≤500 ms. One normal campaign, no warm-up or discarded observations: **50 generic samples**, median **70.9 ms**, p95 **115.0 ms**, within ≤100 / ≤300 ms. All ten established operations have 50 samples each and pass their existing gates. No repeat campaign was run. The first generic normal observation, 300.1 ms, remains in the distribution; normal acceptance uses the locked median/p95 gates.

[Raw performance evidence](data/catalogue-round-three/verification/performance/house-brand-performance.json) retains policy, every sample and unrounded values.

## Protected state and later work

- TEST remains `e3b5719c8c6d46cc671898be6eb5f4061ae951b5`, parent `574c307297261213ac9500afa2a50a67cc95d575`, subject `Deploy HEC TEST v45 — catalogue expansion round two`.
- MY DATA remains `7c3e9e5805bb1bf1d1c8ad0667132b69e7f0b650`, parent `37b9f02ee029eb7fdec3ad6a0547dda58a86e5d7`, subject `Deploy HEC My Data v12 — catalogue expansion round two`.
- No protected deployment repository was modified. No push, deployment, restaurant expansion or family-contribution work occurred.
- One local commit is authorized with the exact subject above, without amendment or a second commit. Post-commit SHA, parent, branch, clean state, unchanged generation, junction and protected deployment checks are reported in the task handoff.

The junction protection boundary is resolved: the correctly spelled path is the only authorized working path; the misspelled path remains a read-only alias. It was not altered. Later data work can target missing macro panels, liquid/serving corroboration, AU formulation evidence for multi-market records and official relationships for unresolved spellings. Thin families remain documented. This audit does not claim complete Australian supermarket inventory coverage.

## Discovered family status detail

### aldi

Current, relationship proved: Bakers Life; Berg; Brooklea; Choceur; Dairy Fine; Damora; Deli Originals; Elmsbury; EMPORIUM SELECTION; Expressi; GoldenVale; hillcrest; International Cuisine; Lazzio; Mamia; MOSER ROTH; Oh So Natural; Orchard & Vine; Seasons Pride; SNACKERS MARKET; Sprinters; Urban Eats; Westacre; Westacre Dairy.

Relationship proved, currentness uncertain: Belmont Biscuit Co; Bon Appetit; Colway; Eltora; Farmwood; Grandessa; Jindarra Station; Ocean Rise; Ocean royale; Regal; Specially Selected; Sweet Haven; The Fresh Salad Co; Westcliffe; White Mill; World Kitchen; Yoguri.

### woolworths

Current, relationship proved: Farmers Own; macro; macro WHOLEFOODS MARKET; Plantitude; The Odd Bunch; Thomas dux; Woolworths; Woolworths Bakery; Woolworths Plantitude.

Relationship proved, currentness uncertain: Essentials; Macro Wholefoods; Woolworths Essentials; Woolworths Gold; Woolworths Macro.

### coles

Current, relationship proved: coles; Coles Asia; Coles BOM; Coles Finest; Coles Free Range; Coles Grower’s Selection; coles Imfree from; Coles I’m Perfect; coles Kitchen; coles made easy; Coles Mum’s; Coles Organic; Cole’s Perform; coles Simply; Coles- Wellness Road; Cucina Matese; DALEY ST; Drovers Choice; El-Amin’s; Graze; Natures kitchen; The Sweetporium Co; Urban Coffee Culture; Wild Tides.

## Hold counts by reason

Counts are distinct retailer/canonical pairs. Reasons overlap.

| Reason | Count |
|---|---:|
| production-projection-ineligible | 8365 |
| needs-nutrition-completion | 8317 |
| missing-required-macros | 8075 |
| house-brand-relationship-unverified | 1961 |
| identity-incomplete | 471 |
| energy-disagreement-over-five-percent | 440 |
| liquid-basis-not-corroborated | 369 |
| off-quality-errors | 343 |
| serving-basis-conflict | 285 |
| nutrition-conflict | 260 |
| AU-only-product-corroboration-required | 97 |
| invalid-gtin | 91 |
| physical-form-pack-conflict | 69 |
| details-only | 48 |
| food-domain-not-established | 46 |
| contradictory-serving-text | 22 |
| pack-serving-unit-conflict | 21 |
| unsupported-domain | 19 |
| material-source-conflict | 16 |
| australian-product-identity-unresolved | 14 |
| source-brand-token-is-not-consumer-brand | 13 |
| composite-product-category-unresolved | 11 |
| prior-individual-review-hold | 6 |
| existing-canonical-conflict | 5 |
| protected-retailer-internal-record | 3 |
| incompatible-retailer-gtin-overlap | 3 |
| name-category-contradiction | 2 |
| incoherent-nutrient-mass | 2 |

## Established performance operations

| Operation | Samples | Median ms | p95 ms |
|---|---:|---:|---:|
| freshFoodLibrary | 50 | 90.4 | 135.9 |
| blankNewSearch | 50 | 92.9 | 130.4 |
| genericShortlist | 50 | 70.9 | 115.0 |
| exactBrand | 50 | 44.6 | 66.4 |
| brandProduct | 50 | 112.2 | 161.9 |
| brandBrowse | 50 | 46.4 | 76.7 |
| brandCategory | 50 | 5.1 | 8.2 |
| conceptBrandName | 50 | 13.0 | 18.7 |
| retailerBrowse | 50 | 3.1 | 7.0 |
| allItems | 50 | 4.7 | 8.4 |

SOURCE EXPANSION PASS — READY FOR MYRON REVIEW BEFORE TEST DEPLOYMENT
