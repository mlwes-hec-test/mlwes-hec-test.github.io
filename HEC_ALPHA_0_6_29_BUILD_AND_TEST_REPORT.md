# Healthy Eating Companion — Alpha 0.6.29 Build & Test Report

## Build basis

Alpha 0.6.29 was built from Founder Trial Alpha 0.6.28 after founder-device testing exposed a common search-intelligence problem: HEC could match foods and products but did not first classify important words such as **Woolies**, **Doritos**, **Kelloggs** or **Maccas** as retailer/brand/restaurant entities. This caused redundant source questions, loss of brand intent as typing continued, and serving-unit contamination from descriptive product words.

The browser-storage identifiers remain unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

Service-worker cache: `healthy-eating-companion-alpha-0-6-29-v1`.

## Main implementation

### 1. Australian Food Entity Registry

A new `entity-registry.js` loads before the search foundation. The starter registry contains **39 entities**: 12 retailers, 17 product/food brands and 10 restaurant/takeaway chains. Each entity may carry aliases, source context, route context and an optional food-family concept.

The registry is deliberately an entity/alias layer, not a hand-maintained product catalogue. Exact nutrition remains the responsibility of AFCD, packaged-product sources, barcode/nutrition-panel capture and user-saved foods.

### 2. Alias and canonical query handling

Aliases normalise common Australian usage and punctuation before product matching. Examples tested include:

- `Woolies` -> Woolworths
- `Kellogg`, `Kelloggs`, `Kellogg's` -> Kellogg's
- `Maccas` -> McDonald's

A recognised entity can be removed from the residual food words for ranking while remaining attached as required context. Canonical search text is available for external product lookup.

### 3. Brand-aware search routing

Recognised brands can supply food-family and source information. `Doritos` maps to commercial Corn Chips; `Kellogg's` maps to Breakfast Cereal; Tip Top/Sunblest/Country Bake map to Bread. Recognised brand/retailer context skips redundant generic source questions.

Partial entity prediction is evaluated before treating unfinished text as a possible food. `Kell` therefore predicts Kellogg's rather than requiring the user to finish an exact punctuation form before HEC understands the intent.

### 4. Serving identity protection

The Alpha 0.6.28 founder test exposed `Doritos Cheese Supreme Corn Chips -> Slice`. Alpha 0.6.29 makes strong food identity outrank descriptive flavour terms, sanitises stale cheese/bread slice units from snack/corn-chip records, and prevents a unit removed during sanitisation from remaining as the review default. An explicit package portion/serve remains preferred when the source provides one.

### 5. Egg sequence / state hand-off

Plain Egg no longer silently seeds Chicken. The Whole Egg path is now structurally ordered **Species -> Part -> Size -> Preparation**, with added fat only when relevant. The size selected during guided entry is carried through to the serving resolver so a selected Large egg becomes the default Large Egg unit at Review rather than falling back to generic Egg.

Yolk and White keep the direct practical-measure behaviour introduced in Alpha 0.6.28. Species choices include Chicken, Duck and Quail, but final match validation remains strict: the bundled AFCD Release 3 check found chicken egg records and no matching duck/quail egg records, so unsupported species must stop rather than borrow incompatible nutrition.

## Validation completed

### JavaScript syntax

`node --check` passed for:

- `entity-registry.js`
- `search-foundation.js`
- `guided-branching.js`
- `serving-foundation.js`
- `alpha06.js`
- `config.js`
- `service-worker.js`
- `app.js`
- `companions.js`
- `alpha064.js`

### Entity/search/serving regression

**31 assertions passed**, including:

- registry type counts: 12 retailers / 17 brands / 10 restaurant-takeaway entities;
- Kellogg/Kelloggs/Kellogg's canonical alias recognition;
- partial `Kell` prediction of Kellogg's;
- Doritos -> Corn Chip concept + commercial source and source-question skip;
- Woolies -> Woolworths + retained `multigrain bread` residual phrase;
- Maccas -> McDonald's restaurant context;
- Whole Egg order Species -> Part -> Size -> Preparation;
- plain Egg does not silently prefill Chicken;
- typed Duck Egg prefills Duck;
- Cheese Supreme Corn Chips remains snack identity and cannot retain a cheese Slice unit;
- an explicit Doritos package portion remains the serving default;
- selected Large whole egg becomes the default Large Egg review unit;
- Egg White removes generic whole-Egg unit and keeps tablespoon as a practical default.

Full results are in `ENTITY_REGISTRY_REGRESSION_RESULTS_ALPHA_0_6_29.txt`.

### Static application checks

Passed:

- 454 HTML IDs with no duplicates;
- all local script/style/manifest references resolve;
- `entity-registry.js` loads before search/guided/serving/runtime search code;
- bundled AFCD dataset still contains 1,588 foods;
- storage-key strings remain present/unchanged;
- service worker uses the Alpha 0.6.29 cache and caches `entity-registry.js`;
- no Alpha 0.6.28 version references remain in current runtime files;
- 69 normalised registry aliases have no cross-entity duplicate alias in the starter registry.

## Runtime/device validation limitation

A previous Chromium attempt in this build environment could not load the app through the available local/file route even though the local HTTP server responded to `curl`. No browser-runtime pass is claimed. Camera scanning, OCR, speech recognition, installed-PWA service-worker replacement and mobile layout remain real-device founder tests on the HTTPS site.

## Deployment safety

Alpha 0.6.28 is currently deployed on the founder device. A **Download Backup should be made from Alpha 0.6.28 before deploying Alpha 0.6.29**. The runtime storage keys are unchanged, but a backup is the safer recovery point.
