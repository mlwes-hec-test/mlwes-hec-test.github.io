# Healthy Eating Companion — Alpha 0.6.19 Build & Test Report

## Build objective

Alpha 0.6.19 is a focused correction to the search architecture after founder testing showed Alpha 0.6.18 could still display the older raw AFCD Top Matches workflow. The correction makes the guided path the first live search surface and changes the deployed asset/cache version so an older `alpha06.js` cannot masquerade as the current build.

## Structural correction

The legacy live-search renderer previously contained the exact user-facing instruction `Tap a result without hiding the keyboard.` and directly rendered the top three ranked database foods. Alpha 0.6.19 replaces that code path with guide-first rendering. The later universal-search override has also been updated to the same behaviour, so both the original function and the final runtime override agree on the search contract instead of depending on one patch winning over another.

For the founder test case `Pie`, the first two live choices are deliberately `Pie, Curry` and `Pie`. The first route records Curry as already known and skips that question; the second opens the complete pie refinement workflow.

## Cache/version correction

The visible build, script query strings and service-worker cache are now Alpha 0.6.19. This is important because the prior revision kept the public asset version at 0.6.18 while changing the contents of the same JavaScript filename. The new version creates a clean browser/cache boundary for founder testing.

## Weight history

The Progress History range set contains 7 Days, 14 Days, 30 Days, 3 Months, 6 Months, 1 Year and All.

## Static validation completed

- `node --check alpha06.js` passed.
- The old live-search wording `Tap a result without hiding the keyboard.` is no longer present in `alpha06.js`.
- Alpha 0.6.19 guide-first marker text is present in both live-search renderer locations.
- The broad Pie guide contains `Pie, Curry` followed by `Pie`.
- The service-worker cache and asset version are Alpha 0.6.19.
- Existing Alpha 0.6 storage keys were not intentionally changed.

## Real-device verification still required

The most important test is a clean deployment to the existing GitHub Pages address followed by the PIE search. The Top Matches panel must visibly identify `Guided Food Entry · Alpha 0.6.19`; this gives the founder an immediate way to distinguish a genuine new search engine from a stale cached Alpha 0.6.18 file.
