# Healthy Eating Companion — Alpha 0.6.30 Build & Test Report

## Build purpose

Alpha 0.6.30 is a **stability and responsiveness build** based directly on Alpha 0.6.29. It deliberately does not add another large food-feature layer. Founder testing of 0.6.29 reported two regressions serious enough to interfere with further search evaluation: Food Search typing could lag and produce accidental doubled/missing characters, and Home/navigation controls could become intermittently unresponsive after search/navigation activity until HEC was closed and reopened.

The Alpha 0.6.29 Australian Food Entity Registry, search routing, serving identity protection and corrected egg sequence are retained.

## Root causes addressed

### Synchronous work on every search keystroke

The previous input handler synchronously updated state, called `saveExt()` and fully rerendered the Food Library on every input event. `saveExt()` serialises the complete functional record to localStorage, which can be several megabytes on a founder device with diary and cached online-product history. Alpha 0.6.30 removes that storage write from the keystroke path and defers food ranking until a 140 ms pause.

### Repeated entity work during ranking

Alpha 0.6.29 correctly added entity-aware ranking, but the same registry parsing could be repeated while each AFCD/local/online food was scored and then repeated again across the live and full result surfaces. Alpha 0.6.30 memoises registry identification and caches one query context, brand index, product intent and product matches per food-data revision.

### Search work surviving navigation

Automatic online lookup and delayed renders could outlive the visible Food Library. Alpha 0.6.30 adds a pre-screen cleanup hook to the central `show()` function so **all** screen switches—including `data-go="home"` buttons that bypass `openAlpha05Feature`—cancel search timers when leaving Food Library, abort in-flight fetches, invalidate stale UI tokens, and refuse to rerender Food Library when it is no longer active.

### Online cache growth

Unsaved online products are temporary search cache, not founder-created records. Alpha 0.6.30 keeps all saved online foods but caps unsaved cached products at 220 and does not synchronously write the whole functional record merely because an online search completed.

## Data continuity

Storage identifiers are unchanged:

- `healthyEatingCompanionAlpha06`
- `healthyEatingCompanionAlpha06Functional`

The runtime prunes only **unsaved online search cache**. Saved online foods are retained, and diary entries continue to use their stored snapshots. No intentional deletion of profile, diary, weight, recipes, saved meals, shopping data or settings is introduced.

## Preserved Alpha 0.6.29 behaviour

- Australian entity registry and aliases including Woolies, Kellogg/Kelloggs/Kellogg's, Doritos and Maccas.
- Brand/source inference so recognised commercial brands do not ask redundant homemade/commercial questions.
- Corn-chip serving identity protection so Cheese Supreme does not turn into a cheese Slice measure.
- Whole Egg ordering `Species -> Part -> Size -> Preparation`.
- Selected Large/Medium/etc. egg size flows into Review rather than reverting to generic Egg.
- Yolk/White practical branching from 0.6.28/0.6.29 remains.

## Validation performed

### Syntax/static

- `node --check` passed for every runtime JavaScript file.
- `index.html`: 454 IDs, all unique.
- All local scripts/styles/manifest references resolve.
- AFCD Release 3 still contains 1,588 records.
- Service worker cache is `healthy-eating-companion-alpha-0-6-30-v1`.

### Registry checks

Runtime Node checks passed for entity counts, Kellogg aliases/prediction, Doritos food-family inference, Woolies residual parsing, Maccas mapping and registry memoisation.

### Stability source assertions

Checks passed for the new debounced input controller, removal of per-keystroke full-state persistence, stale-search token, AbortController use, inactive-screen online guards, online-cache cap, query/product caches, preserved egg ordering and unchanged storage keys. See `STABILITY_REGRESSION_RESULTS_ALPHA_0_6_30.txt`.

## Browser/device limitation

A Chromium headless attempt in this container timed out during browser startup and produced only container/DBus errors, so this report **does not claim a browser-runtime pass**. Real iPhone installed-PWA testing is required and is especially important for the exact freeze/keyboard regression that motivated this build.

## Recommended first founder test

Do not start by judging individual foods. First spend several minutes repeatedly navigating Home -> feature -> Home, then type/edit searches rapidly and leave Food Library while an online lookup is pending. If Home remains responsive and every character appears immediately, resume the existing Kellogg, Doritos, Bread and Egg regression tests.
