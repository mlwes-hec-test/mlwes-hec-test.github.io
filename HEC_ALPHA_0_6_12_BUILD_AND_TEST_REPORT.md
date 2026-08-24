# Healthy Eating Companion — Founder Trial Alpha 0.6.12

## Build base
Built forward from Alpha 0.6.11. Existing Alpha 0.6 browser-storage identifiers were retained so normal same-site upgrades can migrate existing founder data.

## Principal changes
Alpha 0.6.12 incorporates the founder-testing round covering weight presentation, search ranking, context-aware servings, voice quantities, profile-aware suggestions, barcode/package comparison, periodic saved-food review, sharing, duplicate-entry navigation protection and local persistence safeguards.

The Weight Trend is now a responsive line graph with dots. Weight-history migration repairs the earliest valid weight as Starting Weight and removes accidental later Starting Weight labels. Daily Progress no longer shows redundant Recorded/Open Meal badges.

Food search now normalises common cappuccino misspellings, favours direct food identity, Australian matches and the user’s own saved/verified foods, and penalises flavour-only dessert matches when a direct match exists.

Voice/Text review has editable Amount and Unit fields. Food units are enriched with natural food/package measures where supported, including bar/sachet and selected whole-food measures.

Meal suggestion safety/ranking now incorporates the stored allergy/intolerance/never-eat fields, eating pattern and love/like/dislike preferences more directly.

Barcode review can hand off to Nutrition Panel reading and compare per-serving values before the user chooses which values to retain. Saved packaged foods can retain package-verification metadata and later receive a non-blocking re-check prompt.

Portable share files allow foods, meals and recipes to be copied to another Companion user without sharing private Diary/weight/profile data. A full device-copy file is also available for manual transfer.

## Persistence finding
Founder screenshots showed Safari in Private Browsing. Safari Private Browsing intentionally removes site storage when private tabs are closed, and a static website cannot override that browser privacy behaviour. Alpha 0.6.12 adds a prominent warning, keeps the existing localStorage records, and adds an IndexedDB mirror when supported. Reliable persistence testing must be done in normal Safari or the installed Home Screen app.

## Cross-device synchronisation limitation
Live automatic iPhone/iPad synchronisation requires a secure authenticated cloud data service. GitHub Pages is a static host and cannot provide that service by itself. Alpha 0.6.12 therefore does not pretend to provide live sync. It adds manual full-device transfer plus data structures that can later connect to a secure backend.

## Static validation
- JavaScript syntax validation performed with Node for app.js, alpha06.js, alpha064.js, config.js and service-worker.js.
- Service-worker version/cache updated to Alpha 0.6.12.
- All current Alpha 0.6 storage keys retained.
- New release notes and founder testing checklist included.

## Real-device testing still required
Camera barcode scanning, OCR, Web Share/AirDrop, Safari persistence, iPhone/iPad rendering and permission flows require real-device HTTPS testing after GitHub Pages deployment.

## Browser harness checks
A Chromium in-memory-storage harness was run with the production scripts inlined (external camera/OCR libraries omitted because real-device testing is required). It verified:
- a seeded completed profile opens Daily Progress;
- no Recorded/Open Meal badges remain;
- seeded weight history migrates the earliest record to Starting Weight and produces the expected Change Since Start;
- Progress History renders the responsive line graph and no legacy bar chart;
- the simplified 7 Days / 30 Days / 3 Months / 1 Year / All controls appear;
- searching the common misspelling “Cappucino” ranks Cappuccino With Light Milk first in the local test set;
- Voice/Text “two bananas” produces editable Amount 2 with the natural banana item unit;
- no JavaScript page errors were produced in those tested flows.
