# Search Session, Restaurant Source and Chips Architecture

This Alpha 0.6.33 note records the ownership boundaries repaired after the 3 September 2026 physical iPhone findings. It does not change the visible version, source snapshots, or deployment state.

## A. Typing versus committed intent

The focused `#food-search` input owns a single search session. Its state records the raw and normalised query, focus, caret, preview/commit mode, intent kind, and query revision. Every character changes preview state and retires work owned by an older revision. Result rendering updates only the surface below the input; it must not replace, blur, focus, scroll, or navigate the input.

Recognition is not commitment. A recognised source, restaurant product family, consumer brand, barcode, generic concept, or product may produce a preview while typing. A source hub or resolver begins only after a user taps an action or deliberately submits Search/Return. Existing deliberate outside-tap and capture flows remain valid commit boundaries. Auto-advance remains valid after an explicit resolver answer, not after recognition.

## B. Restaurant source versus consumer brand

Intent precedence is: authoritative restaurant source; that source plus product terms; barcode; canonical product; consumer brand/family; generic food concept; broader packaged/online candidates. The restaurant-source registry therefore owns `KFC` and `McDonald's` before Open Food Facts brand-family matching can run.

`KFC` alone previews the KFC Australia hub and opens it only on explicit action. KFC plus product terms searches the committed KFC source pool. It cannot merge an unrelated packaged product into the authoritative menu. The former `Corn Chips — KFC` result was Open Food Facts barcode `9317224405216`, not a standalone product in the committed KFC Australia snapshot. The snapshot mentions Corn Chips only as an optional Zinger extra without standalone nutrition, so no official menu item was deleted.

## C. Generic chips question order

Plain `chips` is an AFCD-backed generic concept, never a KFC or packaged-brand shortcut. Resolution keeps these dimensions separate:

1. Food family: Hot Chips; Thin Fries; Packet Potato Chips/Crisps; Corn Chips; Vegetable Chips/Crisps.
2. Source/context: Fast-Food Outlet; Independent Takeaway Outlet; Frozen/Home-Cooked; Packaged Snack.
3. Preparation: Deep-Fried; Oven-Baked/Roasted; Packaged/Not Stated.
4. Oil type where the AFCD candidates actually differ.
5. Flavour where the packaged candidates actually differ.
6. Exact AFCD nutritional identity.
7. Deliberately selected measure.
8. Deliberately entered amount, followed by Review.

Questions whose answers are already present in the query or are shared by every remaining candidate are skipped. Packet, corn, and vegetable chip families imply the data-backed packaged-snack context. Unsupported methods such as air frying are not silently mapped. Until exact identity exists, no portion profile is exposed; until both measure and amount are selected, no `100 g` consumption is created.

## D. Chip portion evidence

Source inspected: Food Standards Australia New Zealand, **AUSNUT 2023 – Food measures**, downloaded 3 September 2026 from the official [AUSNUT data files page](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/data-files). Workbook URL: `https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20Food%20measures.xlsx?v=20250829`. Verified workbook SHA-256: `58BEE1204610EFB72BB831DC7FB65ACC23DB540B51D056F83C6AC0CE84590475`.

Only exact food-key matches whose description remains applicable to the AFCD Release 3 identity receive measures:

| AFCD food key | Applicability | AUSNUT measure ID, label and weight |
| --- | --- | --- |
| F007236 | Regular takeaway/fast-food potato chips, deep-fried in monounsaturated oil | 47750 small serve 100 g; 47751 chip 3.9 g; 47752 jumbo serve 450 g; 47753 large serve 185 g; 47754 medium serve 142 g |
| F007238 | Regular independent-takeaway potato chips, deep-fried in blended oil | 47762 small serve 100 g; 47763 bucket 320 g; 47764 chip 3.9 g; 47765 large serve 545 g; 47766 medium serve 200 g |
| F007242 | Purchased-frozen potato chips, baked/roasted without added fat | 47770 chip 10 g; 47771 box 120 g |
| F003198 | Plain salted corn chips | 48254 single multipack 19 g; 48255 single packet 60 g; 48256 family packet 170 g; 48257 chip 2.4 g; 48258 handful 12 g |
| F007193 | Plain salted packet potato chips/crisps | 48346 handful 12 g; 48347 single multipack 19 g; 48348 single packet 60 g; 48349 family packet 175 g; 48352 chip 1.4 g |
| F007201 | Salt-and-vinegar packet potato chips/crisps | 48354 handful 12 g; 48355 single multipack 19 g; 48356 single packet 60 g; 48357 family packet 175 g; 48360 chip 1.4 g |
| F007189 | Other-flavoured packet potato chips/crisps | 48362 single multipack 19 g; 48363 single packet 60 g; 48364 family packet 175 g; 48367 chip 1.4 g; 48368 handful 12 g |
| F007198 | Reformed/stacked potato chips/crisps | 48380 small tube 53 g; 48381 chip 1.9 g; 48382 family tube 134 g |

Derivation is direct and reproducible: each stated gram weight is multiplied by the exact AFCD record's existing per-gram nutrition-basis multiplier. The measure metadata carries the FSANZ title, URL, workbook hash, measure ID, food key, retrieval date, direct-weight derivation, applicability statement, and authoritative-source confidence into `consumedPortion` and Review.

Evidence gaps remain explicit. AFCD keys F007235, F007269, and F007279 have no matching row in the verified AUSNUT 2023 measures workbook, so those identities remain grams-only. Although F009836 occurs in both datasets, AUSNUT 2023 describes a plain-salted vegetable-crisp identity while AFCD Release 3 describes flavoured sweet-potato/taro crisps; no natural measure is transferred across that material identity mismatch. Air-fried chips likewise remain unsupported rather than being treated as baked.

## E. Natural restaurant portions

An exact restaurant menu record retains its official product identity and source-native unit into the shared `consumedPortion` contract. A Regular or Maxi Popcorn Chicken is one named portion; Regular or Large Chips is one named portion; a Big Mac is one burger. `6 Wicked Wings` is one official six-piece portion whose canonical base is six pieces. Choosing one portion or six individual pieces reaches the same nutrition exactly once, never six six-piece products. Grams are not inferred from a restaurant record unless the source supplies and the user selects them.

## F. Physical iPhone acceptance

Automated DOM and headless-browser checks can prove that application code does not blur or replace the focused input, that the caret/query survive delayed results, and that the result layout is bounded at mobile viewports. They cannot prove that iOS keeps its software keyboard open. After a later TEST deployment, physical iPhone acceptance must slowly type and pause at `KFC`, continue to `KFC 6 Wicked Wings`, explicitly open the KFC hub, exercise Popcorn Chicken sizes and natural portions, complete the generic-chips questions and portion Review, and recheck Big Mac. Any keyboard dismissal, stale modal, duplicate surface, clipped action, source bleed, or unexplained `100 g` remains a failure.
