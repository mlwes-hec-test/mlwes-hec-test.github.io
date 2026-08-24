# Healthy Eating Companion — Alpha 0.6.28 Build & Test Report

## Build basis

Alpha 0.6.28 was built directly from Founder Trial Alpha 0.6.27. The main browser-storage identifiers were deliberately retained unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

The service-worker cache was advanced to `healthy-eating-companion-alpha-0-6-28-v1` and the runtime/manifest cache-busting version is `0.6.28`.

## Main implementation

### 1. Conditional egg branching

The egg path now treats Whole, Yolk and White as different serving/decision branches rather than forcing them through one fixed sequence.

- **Whole**: relevant preparation, size and conditional added-fat logic.
- **Yolk**: cooking questions are removed; quantity resolves to yolk count or grams.
- **White**: cooking questions are removed; quantity supports egg-white count, tablespoon, mL or grams.
- Generic whole-Egg units are sanitised away from Yolk/White records.
- The egg review name is made more human-readable.

### 2. Source-aware bread routing

Commercial bread no longer immediately exposes a mixed raw result list. `Bread -> Commercial / Bought` now branches into Bakery/Café/Restaurant, Supermarket/Store Brand, Bread Brand, or Not Sure/Typical. Store/brand text is fed back into the same search engine.

### 3. Corn-chip intelligence

Corn Chip is now a first-class concept with source routing and Plain/Salted vs Flavoured identification. Commercial corn chips enter guided flavour identification before product browsing. Flavoured corn chips require more identifying information rather than borrowing the plain salted nutrition reference.

### 4. Food-aware serving layer

The shared serving resolver was expanded rather than adding one-off UI-only units. It now covers the founder-test cases exposed during the HEC / Diet Diary comparison:

- cheese slice;
- bread slice;
- individual crispbread;
- practical sausage forms;
- separated egg measures;
- package-derived count units;
- divisible food fractions for supported units;
- metric teaspoon/tablespoon/cup choices when an mL basis makes the conversion defensible;
- a clearly approximate small-drizzle option for applicable pourable foods with an mL basis.

A sanitisation bug discovered during the Alpha 0.6.28 test pass was also corrected: the duplicate-label cleanup could remove a preferred base `g` unit when it appeared twice in the internal ordering list. Keys are now de-duplicated before label de-duplication.

### 5. Human-readable quantity display

A common quantity formatter is used across the main Diary, Daily Progress, Recent Foods and meal overview. It supports fraction symbols and natural plural forms, removes common database/package wording from the visible label, and shows a calculated gram/mL equivalent when the selected unit has a defensible conversion. New Alpha 0.6.28 diary entries snapshot that metric equivalent so the visible historical amount does not need to be recalculated mentally.

### 6. Compound benchmark

`Two eggs on toast` is explicitly protected as the first compound-food benchmark: quantity 2 is retained for Egg, and Toasted Bread is queued as the next food after the egg entry is saved. This deliberately proves the continuation architecture without claiming universal sentence parsing yet.

### 7. Quick Food Log sequencing

The method card now comes first. The destination card starts hidden and appears after a method is selected when the meal/date still needs confirmation. No entry method may silently create a Breakfast destination.

### 8. Diary space

The duplicate calculation-status strip is hidden whenever there is no missing-energy warning.

## Validation completed

### JavaScript syntax

`node --check` passed for:

- `config.js`
- `companions.js`
- `app.js`
- `search-foundation.js`
- `guided-branching.js`
- `serving-foundation.js`
- `alpha06.js`
- `alpha064.js`

### Pure Food Intelligence / serving regression checks

Passed checks included:

- word quantity `two eggs -> 2`;
- fractions `1/2 -> 0.5` and `1/4 -> 0.25`;
- singular quantity `2 banana` preserved;
- Corn Chip resolves to its own concept;
- Banana Bread does not resolve as Banana;
- `Two eggs on toast` splits into two components;
- Egg White infers White and the ordinary Chicken default;
- Bread offers Commercial / Bought;
- Corn Chip offers Commercial / Packaged;
- Egg White defaults to tablespoon and retains Egg White / mL / grams while removing whole Egg;
- Egg Yolk defaults to Yolk and removes whole Egg;
- Whole Egg retains size measures;
- Cheddar Cheese receives a slice measure;
- Bread defaults to a slice measure;
- Corn Chips receives a practical small-handful measure;
- generic/source-supported crispbread receives an individual crispbread measure; branded package records do not receive an invented count when the package source does not provide enough information;
- an explicit 80 g package bar resolves a Bar unit and supports fraction entry.

### Static application checks

Passed:

- 454 HTML IDs parsed with no duplicates;
- all local script/style/manifest references resolved to existing files;
- Quick Food Log method card precedes the hidden destination card;
- fraction-selector element exists;
- manifest and service-worker version are 0.6.28;
- service-worker uses the new Alpha 0.6.28 cache;
- local AFCD dataset still contains 1,588 foods;
- storage-key strings remain unchanged.

## Runtime/device validation limitation

A Chromium headless `--dump-dom` run could not complete in this container because the available Chromium process stalled in the environment before returning a DOM. No browser-runtime pass is therefore claimed from that attempt. The JavaScript/static/pure-logic checks above passed, but camera scanning, OCR, speech recognition, PWA service-worker replacement and mobile layout must still be verified on the actual HTTPS founder-test site and iPhone/iPad.

## Scope deliberately not changed

The Recommended/Faster daily energy calculation was not altered in Alpha 0.6.28. The build concentrates on food identification, branching, serving measures, quantity entry and diary language.
