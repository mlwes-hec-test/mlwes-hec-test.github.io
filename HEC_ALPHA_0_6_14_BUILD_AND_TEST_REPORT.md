# HEC Alpha 0.6.14 Build and Test Report

## Build base
Built forward from Founder Trial Alpha 0.6.13. Existing Alpha 0.6 primary and functional browser-storage keys are retained.

## Implemented in this build
- Simplified Food Library to **All Resources**, **My Foods**, and **My Meals & Recipes**, with **Recent** shown contextually during add/plan flows.
- Merged the user-facing distinction between Saved Foods and Foods I Created while retaining source metadata.
- Added compact **Barcode**, **Nutrition Panel**, and **Manual** source badges in My Foods.
- Combined reusable saved meals and recipes into one user-facing My Meals & Recipes category while preserving their existing underlying records.
- Reworked Nutrition Panel review to prefer manufacturer **Per Serving** figures when a serving size is recognised and retain per-100-g / per-100-mL reference values.
- Missing OCR fields remain blank rather than being converted to false zero values.
- Added basic plausibility checks against serving mass to reject clearly impossible OCR mappings.
- Reworked barcode/package comparison into nutrient-by-nutrient Barcode / Package / Difference presentation, with incomplete recognition labelled explicitly.
- Package values remain the primary/recommended action only after user review; barcode values can still be retained.
- Reuses the active barcode camera stream between scans within the Scan & Review Centre session where the browser allows it.
- Added a protected-library testing reset that can clear onboarding/profile/Diary/progress test data while retaining My Foods and My Meals & Recipes, plus an explicit full-reset option.
- Reworked the Weight Trend mobile card so the summary is above a full-width graph.

## Static validation performed
- `node --check` passed for `alpha06.js`, `app.js`, `alpha064.js`, and `companions.js`.
- HTML inspection found no duplicate IDs.
- Local application script references were checked for presence.
- Service-worker version and cache name were bumped to Alpha 0.6.14.

## Environment limitation
The build environment blocks local browser navigation, so a full Playwright browser harness could not be completed here. Real-device founder testing remains required for iPhone camera permission behaviour, live barcode detection, OCR accuracy, Home Screen PWA storage behaviour and speech permission behaviour.

## Important permission note
Alpha 0.6.14 reduces repeated camera permission requests by reusing an active camera stream inside a scanning session. Permission persistence after leaving the scanner or app is ultimately controlled by iOS/Safari and cannot be forced by application JavaScript.
