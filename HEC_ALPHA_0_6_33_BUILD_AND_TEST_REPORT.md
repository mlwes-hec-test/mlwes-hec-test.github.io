# Healthy Eating Companion — Alpha 0.6.33 Build & Test Report

## RC3 food-search correction addendum

RC3 retains runtime version 0.6.33 and adds the 26 August 2026 McDonald’s Australia catalogue reconciliation, stale-search cleanup, intent-aware Australian aliases, generic-food clarification, shared typed/voice resolution, serving-aware quantity confirmation, separate Diary/My Foods actions, neutral individual-food nutrition presentation and product-first Diary labels.

The current 17 official McDonald’s category surfaces reconcile exactly to 167 catalogue families and 209 runtime records. There were no confirmed additions, removals, renames, category differences or nutrition changes. The current checkpoint remains 142 complete families, 17 nutrition-unavailable families and 8 configurable bundles; 184 runtime records are loggable. The detailed audit and bounded automation limitation are recorded in `MCDONALDS_AU_FOOD_SOURCE_PILOT.md`.

### RC3 final validation

- Final full regression suite: **344/344 passed**, with no failures, skips, cancellations or TODOs.
- JavaScript syntax: **44/44 files passed** `node --check`.
- Focused RC3 coverage proves the 167-family audit checkpoint, exact-product rank, Australian aliases and controlled spelling variants, generic clarification, typed/voice resolver parity, stale-state invalidation, natural-serving quantity protection, official provenance preservation, separate Diary/My Foods actions and removal of individual numeric food scoring.
- In-app Chromium QA covered 375 × 667, 390 × 844, 430 × 932 and 768 × 1024, plus a 390 × 520 reduced-height keyboard view. No page-level horizontal overflow was present and live search remained visible and scrollable.
- Browser journeys verified neutral fresh/cleared search, exact Big Mac rank, generic burger/chips clarification, `Mega breakie wrap`, Date/Meal review, 250-burger confirmation, half-Big-Mac logging, official My Foods provenance, product-first Diary wording and Quick Voice success/failure gates.
- A 250 mL Quick Drink context was deliberately replaced with a Big Mac search; the stale drink context was removed and review opened at Big Mac’s natural **1 Burger** default.

## Release-candidate basis

- Branch: `alpha-0.6.33`
- Final pre-release Alpha 0.6.32 development checkpoint: `cbdd79b09690bbe7acd753159b6f77f67bdb4a5c`
- Release-candidate checkpoint: this report is included in the commit named `Alpha 0.6.33 release candidate`; its resulting hash is reported after creation.
- Active displayed/runtime version: `0.6.33`
- Existing storage keys remain unchanged: `healthyEatingCompanionAlpha06` and `healthyEatingCompanionAlpha06Functional`.

## Release integration

- `HEC_APP.version` remains the canonical active release authority.
- Visible version text, title, manifest, runtime diagnostics, export/backup metadata, service-worker cache name and cache-busting values are synchronised to 0.6.33.
- Runtime modules are loaded only after the shell release marker matches the canonical version. A mismatch presents an update notice, activates the current service worker and reloads instead of starting a mixed shell.
- The service worker covers the migration, companion, voice, onboarding, activity, progress, food, search, serving, packaged-food and capture foundations, plus AFCD data and the core application assets.
- All 16 picker WebPs are precached. The larger companion hero files remain lazy-cached; external authoring sources are not present in the deployable repository.
- Exact versioned runtime requests do not fall back to an older same-path cached file while online. Activation removes the old cache and claims clients.
- Blank USDA configuration now skips the optional request. Online failure cannot remove valid local results, trap the interface in a loading state, or expose a technical stack trace to ordinary users.

## McDonald's Australia Food Source pilot

- A source-neutral catalogue registry now supports stable source and item IDs, Australian market metadata, aliases, current/retired status, source checks, version history and exact provenance.
- A non-deployed McDonald's Australia pilot registers 167 current product families across all 17 official Australian category surfaces. Identity/category membership was rechecked on 26 August 2026; the reviewed product nutrition checkpoint was created from official product pages on 25 August 2026 and no unconfirmed change was introduced by RC3.
- These records enter the existing central food catalogue and Diary flows. McDonald's, McDonalds, Macca's/Macca’s, Maccas, product aliases and punctuation variations are handled without a McDonald's-specific search engine.
- Products retain their natural serving defaults and do not fall back to an arbitrary 1 g serving. Official per-serving and per-100 g values are kept separately, and nutrients absent from the source remain absent.
- Diary snapshots now retain source identity, catalogue/version dates and provenance as well as nutrition. Reconciliation versions nutrition changes and retires removed items without deleting their historical records.
- The source/access boundary and proposed human-reviewed weekly refresh process are documented in `MCDONALDS_AU_FOOD_SOURCE_PILOT.md`. Production use remains subject to a legal/licensing and source-access review.

## Legacy migration correction and preservation

The recurring Alpha 0.6.16 `profileStart is not defined` warning was a genuine `ReferenceError` in the legacy weight-history compatibility path. The intended profile-start date was already established immediately above the failing reference, so the small repair was isolated in the migration foundation without redesigning historical migration behaviour.

Regression coverage proves:

- the repaired migration is warning-free and idempotent;
- earlier Alpha 0.6-family data and current Alpha 0.6.32 data survive;
- pre-profile weight history is not discarded;
- Koko → Bushy, Rowdy → Ruby, Barnaby → Bonnie and Clancy → Cassie compatibility remains intact;
- Salty remains active and unknown companion IDs are preserved;
- missing stable IDs and malformed-but-recoverable records are handled without payload loss;
- profile, Diary, weight, activities, My Foods, My Recipes, Shopping, preferences and companion settings survive;
- exact historical voice preference remains separate from portable `voiceStyleId`;
- Diary nutrition snapshots and historical exercise-credit meaning remain unchanged;
- one effective weight identity per local date is retained.

Reset and restore tests execute the active paths and prove that Reset & Keep My Library preserves exactly the protected library fields, Full Reset clears the intended key sets, repeated clicks are single-shot, backup metadata derives from the canonical version, and restored Alpha 0.6.32 records migrate safely.

## Automated validation

- Full regression suite: **309/309 passed**, with no failures, skips or cancellations.
- JavaScript syntax: **39/39 files passed** `node --check` (the complete workspace JavaScript set, including tests, runtime files and the service worker).
- HTML duplicate-ID check: passed.
- Local script, stylesheet, manifest, data and dynamic-entry reference checks: passed.
- Service-worker asset and version-consistency assertions: passed.
- Migration, reset/restore, companion, onboarding, activity, weight/progress, Shopping/Recent, search, serving, packaged-food, barcode and Nutrition Panel suites: passed.
- Companion runtime-art verification: exactly 48 WebPs present and no committed authoring-source directory.
- Manifest JSON and inline release-loader syntax: passed.
- `git diff --check`: passed at the final pre-commit gate.

## Browser and responsive QA

The release candidate was exercised in the in-app Chromium browser at:

- 375 × 667 and 430 × 932 phone viewports;
- 768 × 1024 and 820 × 1180 iPad portrait viewports;
- 1024 × 768 and 1180 × 820 iPad landscape viewports;
- additional 375 × 450 and 820 × 550 reduced-height keyboard simulations.

Representative QA covered fresh onboarding and validation, the companion picker, all nine Home rooms, Diary, Add Food search, mocked/manual barcode review, Nutrition Panel review, Recent, Shopping, Exercise & Activity, Weight Check-In, the Weight graph, Settings, modal states and no-companion presentation.

No page-level horizontal scrolling, clipped primary actions or blocking reduced-height form layout was observed. Companion images remained uncropped, all Home rooms remained reachable, search results remained tappable, long Shopping names remained usable, and graphs remained readable. Key form validation moved focus to the first invalid field with `aria-invalid` and `aria-describedby` associations. Static icon-only controls had accessible names and representative primary touch targets met the intended 44-pixel minimum.

A same-origin update simulation first activated the exact 0.6.32 checkpoint, then served the 0.6.33 working shell. The page reached 0.6.33 without console errors and reopened offline from the updated cache, with no mixed-version runtime observed.

## Browser-only and mocked limitations

- Barcode one-shot behaviour, manual fallback, review gating and not-found behaviour were tested; a real camera was not claimed.
- Nutrition Panel review, editable values, printed-basis handling and confirmation gates were tested; physical-label OCR accuracy was not claimed.
- Male/female voice resolution was covered by deterministic tests, but actual installed device voice inventories and playback still require physical testing.
- Native Share/Print integration and installed-PWA lifecycle behaviour remain device-dependent.

## Physical-device release gate still outstanding

Before Alpha 0.6.33 can be declared finally released, the founder must test the release candidate on real iPhone and iPad hardware. Required checks include camera permission and representative Australian barcodes, Nutrition Panel photographs/OCR and value review, male and female voice samples, native DOB/keyboard behaviour, touch targets, graph point selection, Share/Print, PWA update, and offline reopening. iPad coverage must include both portrait and landscape.

No production deployment, merge, tag or final-release declaration is part of this checkpoint.
