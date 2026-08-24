# Healthy Eating Companion — Alpha 0.6.11 Build And Test Report

## Build Purpose
Alpha 0.6.11 is the repair/stabilisation build authorised after founder testing of Alpha 0.6.10. It addresses the confirmed failures in the Weight Trend, weight-date/outlier workflow, meal-category regression, Food Library clutter and barcode path. It also hardens deployment caching because the real-device screenshots showed signs that older and newer app assets could be appearing together.

## Data Continuity
The Alpha 0.6 storage keys remain unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

Existing data is migrated in place. Legacy Morning Tea and Afternoon Tea Diary entries are reassigned to Snacks. Existing profiles, recipes, favourites, weight history, Shopping List and other Alpha 0.6 records are not intentionally reset.

## Implemented Changes

### Diary Meal Structure
- Enforces the five agreed categories: Breakfast, Lunch, Dinner, Snacks and Other.
- Legacy Morning Tea/Afternoon Tea data migrates to Snacks.
- Active selectors and Diary rendering use the same five categories.

### Weight Check-In And Progress
- Check-In Date now presents Today / Yesterday / Tomorrow plus the full Australian date while retaining the native date picker.
- Weight displays use one decimal place.
- A difference greater than 2.0 kg from the nearest dated record opens a detailed confirmation showing the nearest weight/date, entered weight and exact signed difference.
- `Change Since Start` now follows the actual Starting Weight record instead of treating a later-entered older historical record as the start.
- Weight Trend keeps the mobile-safe bar rendering and now includes a visible date/value fallback beneath the graph.
- Removed use of `Array.at()` from the trend-rendering path for wider browser compatibility.

### Food Library
- Removed the duplicate Suggest Breakfast/Lunch/etc action from the Food Library context.
- Removed the large Cancel Adding control; the context line remains so the destination meal/date is still clear.
- Moved Scan Barcode and Read Nutrition Panel directly below the search field.
- Removed the visible Open Australian AFCD link from the everyday Food Library.
- Simplified the everyday guidance wording so the user does not need database terminology while searching.

### Barcode Flow
- Tapping Scan Barcode opens Barcode mode directly.
- Barcode mode hides the file/photo capture card; no still-photo selection is required for the normal scan path.
- Live scanning first attempts native `BarcodeDetector` with an environment-facing `getUserMedia` stream.
- If native detection is unavailable, ZXing remains the fallback.
- A detected 8–14 digit retail code stops the camera and starts product lookup automatically.
- Manual barcode entry remains available as the fallback.
- Camera streams are stopped when the user leaves Scan Centre.

### Deployment / Cache Integrity
- Local app assets are referenced with an Alpha 0.6.11 version query.
- Service-worker registration uses `updateViaCache: "none"`.
- The service worker uses a new Alpha 0.6.11 cache and network-first handling for app-shell documents/scripts/styles.
- When a newly installed worker takes control, the page refreshes once so the HTML/CSS/JavaScript versions stay coordinated.

## Validation Completed Before Packaging

### Static Validation
- `node --check app.js` — passed.
- `node --check alpha06.js` — passed.
- `node --check alpha064.js` — passed.
- `node --check service-worker.js` — passed.
- HTML parsed with 434 unique IDs and no duplicate IDs.
- Versioned local asset references were checked against Alpha 0.6.11.
- Morning Tea/Afternoon Tea remain in active code only in the migration rule that moves them to Snacks.

### Browser Harness Validation
A Chromium inline-DOM harness was run with seeded Alpha 0.6.10 data, including legacy Morning Tea/Afternoon Tea entries and eight weight records.

Verified:
- Diary rendered Breakfast, Lunch, Dinner, Snacks and Other only.
- Seeded Morning Tea/Afternoon Tea entries migrated to Snacks.
- Food Library showed only the compact meal/date context; duplicate Suggest and Cancel Adding controls were absent.
- Open Australian AFCD was absent.
- Direct Scan Barcode selected Barcode mode, hid the photo/file capture card and displayed Barcode tools.
- Weight Check-In displayed Today plus the full date.
- Back-entered older weights did not redefine the Starting Weight for Change Since Start.
- A 115.0 kg entry against a nearby 105.4 kg record produced the detailed +9.6 kg confirmation and the `No, Let Me Correct It` option.
- Progress History rendered eight weight bars plus eight fallback date/value items.
- No JavaScript page errors were produced in the tested harness flows.

## Real-Device Validation Still Required
Live iPhone camera permission, `BarcodeDetector`/ZXing behaviour, online product lookup and nutrition-panel OCR cannot be fully verified in the container harness. These should be the first real-device checks after Alpha 0.6.11 is deployed.
