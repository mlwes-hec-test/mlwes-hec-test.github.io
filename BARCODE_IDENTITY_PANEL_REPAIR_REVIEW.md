# Barcode identity and panel confirmation repair

SOURCE-only work, using synthetic records and disposable browser contexts. No founder records, photographs, browser profiles, TEST storage or MY DATA storage were accessed. No deployment, push, catalogue admission, family contribution or Guided Food Concept development is included.

## Preflight

Canonical path: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.

Clean branch `alpha-0.6.33`; starting SHA `227e326eee476a495e6c6bbc599b08286bf404c7`; direct parent `d3cfa0d8fe9b1d164c9a310058a459baa45562ac`; subject `Repair product capture nutrition pipeline`; version 0.6.33; generation `8e84152076aacc39ae4ffa24`. The misspelled repository path remains a junction to this canonical path. The initial release check passed. Read-only GitHub checks matched TEST `575c80b93ca5de21669c1d1a4aeb250e5409e803` and MY DATA `2c39809706039b93ad613d07bd6b15229ccf2612`.

## Exact failure contracts

The barcode screen uses `HECPackagedFoods.completeness` through `barcodeStatus`: usable energy/nutrition and positive units can enable its actions. The displayed `name`, `brand` and `barcode` are not the whole Diary admission contract. `openCapturedFoodForDiary` additionally calls `HECFoodCatalogue.canLog`, whose `productEligibility` requires `exactProductQuality` for online/catalogue products.

The final Open Food Facts adapter creates an `online-candidate`, with international market when Australian metadata is absent. `sourceTier` then returns `FOREIGN_FALLBACK`; `productIdentityQuality` classifies it as foreign, and `exactProductQuality` deliberately excludes online candidates from the foreign-product exception. Thus a named, GTIN-backed, nutritionally complete product can fail with `identity-low-local-relevance` and the former generic “specific product identity” message. This does not mean a canonical catalogue ID is absent: its canonical key can already be `barcode:<GTIN>`.

Previously both barcode actions passed that online wrapper directly. Save-only put it into `onlineFoods` and `savedFoodIds`, retaining the later Diary rejection. Save-and-add reached the stricter gate immediately. Neither route created the explicitly checked private food that panel construction could create. The synthetic international-market fixture reproduces this exact chain. This establishes a shared source defect; it does not claim to know the inaccessible founder record's precise metadata.

The comparison selector previously changed only `productCapture.choice`. It did not populate the editable fields or clear the OCR annotations. Validation and final construction used a different, hidden catalogue model when selected. The adapter's legacy `nutritionBasis` can have an empty `selectedBasis`; after moving source values into the editor this also needed a deterministic choice of an available energy column. A completely empty stored basis could additionally mask valid `nutrients` plus unit conversions during legacy review.

## Repair

- A barcode package-confirmation checkbox finalises through the shared private builder. It validates a specific name and usable barcode, retains brand/pack/nutrition/serving/source evidence, and builds normal `recordType: private` data. The Diary gate still runs. Central verification is not fabricated.
- The capture draft's stable ID is reused for the same saved private GTIN. New capture records have a `privateProductIdentity` and private canonical key, preventing their reviewed nutrition from sharing the central GTIN canonical namespace. Existing saved online wrappers are repaired on explicit review, replacing only the saved reference and retaining online evidence. No bulk migration or deletion is performed.
- Whole-source selection now replaces the actual editable model, including serving and both printed nutrition columns. Missing OCR cells cannot erase the selected barcode cells. Raw OCR, corrected panel, selected model and catalogue evidence remain separate. Later individual corrections are saved from the visible model. Blank remains unknown.
- The ordinary confirmation screen shows product, brand, serving size, pack size and servings per pack, followed by an aligned Australian-style Per Serve / Per 100 table. Optional nutrients/count conversions and exceptional column choices are in expandable sections. Display values are rounded for readability; unchanged underlying precision is retained.
- Both new and reopened captured foods ask for a blank consumption amount before one final Review. Neither saving a food nor choosing its amount saves a Diary entry. Pack size does not prefill consumption.
- Start New clears and visibly positions a new panel capture. Try Again clears extraction and visibly requests a new image while retaining intended identity and any known barcode baseline. Capture epochs reject late results after Cancel, Start New and Try Again.
- Named foreign online records now receive a packet-review instruction; genuinely incomplete identities receive a specific product-name/brand/barcode instruction. The safety decision itself remains unchanged.

## OCR changes and limits

The production preprocessing now explicitly honours EXIF orientation, retains the full image, converts to grayscale and stretches contrast without hard thresholding. It preserves native resolution up to a 3000-pixel cap instead of enlarging every input. The old threshold's strict inequality could discard pixels equal to its threshold; enlargement also changed small strokes in the fixtures. No automatic crop, arbitrary rotation, perspective correction or product-specific substitution was added.

PSM 6, preserved interword spaces and 300 DPI remain. A PSM 4 variant and an enlarged grayscale variant did not improve the bounded set and were rejected. Tesseract word/block output now allows numeric words below 80 confidence to blank and flag their row; overall confidence below 70 likewise flags numeric rows. Split decimal punctuation and unrecognised parenthesised units are flagged, never changed into guessed values. Existing heading-driven column mapping, mismatched-token rejection, kJ retention and 4.184 energy conversion remain.

The final six synthetic images cover clean flat, reduced contrast, shifted decimal-rich columns, a ruled mass table, liquid columns, and one intentionally unreadable field. With identical parser/confidence checks for the before/after images, correctly mapped nutrient cells improved **62 → 85** out of 95 readable targets; **zero incorrect accepted values**. Serving size 170 and servings-per-pack 1 were retained in every image, with correct g/mL columns. Some sugars rows still misread `(g)` as `(9)` and therefore remain blank/flagged. The deliberately uncertain fat cell stays unknown. Text fixtures separately verify 5.3, 3.3, 0.8, 12.5, 158, 670 and 170, reversed columns, isolated columns and split decimals.

OCR remains fallible. High-confidence wrong recognition cannot always be detected, and these flat synthetic fixtures do not establish accuracy on curved, glossy, skewed or real iPhone photos. Every value still requires packet confirmation; correction and barcode-source fallback remain available. No claim is made about the founder's actual photographs.

## Evidence

- [271 tests, 271 passed, zero failures](data/barcode-panel-repair/regressions-final.txt).
- [Barcode confirmation, source choices, save/reopen/Diary, legacy wrapper repair](data/barcode-panel-repair/flows/flows.json).
- [g, mL, fixed serve, unknown barcode, optional unknowns, Bread, Milk, Big Mac, Hash Brown and McCain](data/barcode-panel-repair/core-final/cases.json).
- [Rendered Cancel/Try Again/Start New, save/reopen and late cancellation](data/barcode-panel-repair/lifecycle-final/capture-flow.json).
- [Late Start New/Try Again and central McCain barcode save/amount/Review/Diary](data/barcode-panel-repair/late-central/results.json).
- [Final OCR comparison and generated image fixtures](data/barcode-panel-repair/ocr-final-distinct/ocr-results.json); [rejected preprocessing/segmentation variants](data/barcode-panel-repair/rejected-ocr-variants.json).
- [390 × 844 source-choice screen](data/barcode-panel-repair/flows/03-barcode-selected.png) and [blank consumption amount](data/barcode-panel-repair/late-central/central-amount.png).

All rendered application assets were supplied from local SOURCE in fresh contexts, with service workers blocked and zero live application fallthrough. Synthetic API responses are explicit mocks. No personal browser was attached. The required controls remain within the mobile viewport width; the screen scrolls vertically.

Initial failures were resolved: legacy empty-basis shadowing; strict equality for a floating-point energy conversion; obsolete source-shape tests for the replaced form; a harness comparison that included normal online-cache timestamps; and temporary stale-release startup rejections while edits were in progress. The final released-byte test runs and rendered evidence pass. Rejected OCR variants were not promoted.

Runtime and canonical-key bytes changed, so the established performance acceptance ran once in isolation. PASS: cold-first 333.3 ms; official 50-sample median 52.4 ms / p95 107.0 ms; independent confirmation median 54.6 ms / p95 129.6 ms. All other rendered gates and the catalogue adapter benchmark passed. No campaign was repeated. Final generation: 7ddf61b27bf1d1c0e42aca89; all 46 file hashes and role variants match; stale-output list empty. Its raw evidence and the final release/protected guards are under `data/barcode-panel-repair/`. The final chat handoff records the local commit SHA and full requested outcome report; this document cannot contain its own commit SHA.

## Small physical acceptance sequence after separate deployment authorisation

1. Scan a specific packaged food whose barcode nutrition matches its current packet; confirm the match, Save & Add, enter an amount, complete exactly one Review, then check Diary.
2. Scan/save-only, leave, reopen My Foods and add through amount and one Review. Confirm only one private food exists. Open one affected older saved reference, review/confirm/save, reopen and log it.
3. Compare a panel photo. If OCR differs, select Barcode Values and check that all known fields populate immediately. Repeat with corrected Checked Package Values. Confirm the saved private values match the chosen source.
4. One liquid amount in mL and one fixed serving; then Cancel, Start New and Try Again, verifying fresh state and retained identity only where intended.

No TEST or MY DATA deployment is authorised by this repair report.
