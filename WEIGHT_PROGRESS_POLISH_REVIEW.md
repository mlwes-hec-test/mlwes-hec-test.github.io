# Weight / Progress polish — source review

## Preflight

- Canonical source: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.
- Node realpath and filesystem identity confirmed the `HEC Develpoment` workspace alias resolves to this canonical directory.
- Branch: `alpha-0.6.33`; clean working tree before edits; no configured Git remotes.
- Starting HEAD: `2849343035e607a20f721e5a07e7522744522dfc`, **Build Coles private-testing catalogue**.
- Parent: `3caa0c2ffd54d00d84c4018f6bd6b2a4cdeb9880`.
- The documented My Data defaults in source installation configuration were inspected read-only. No protected deployment checkout or personal browser profile was opened.

## Observed problems and changes

The original 820 × 360 SVG shrank to about 147 px high at 390 px viewport width and 118 px at 320 px. Axis/date text and the line shrank with it. The final date was clipped at all three requested sizes. Recorded values were absent from the plot. Range controls consumed three rows on iPhone and two on tablet. The selected-point panel repeated the total change already shown above.

- Current Weight and Goal Weight now lead the existing four-card summary. Starting Weight remains explicit. The latest recorded date is labelled, and the existing loss/change card uses the existing HEC pale background and accent border.
- Graph height follows 42% of viewport height, bounded to 280–390 px, with SVG coordinates based on the available container width. A resize observer reflows only the plot.
- The line is a non-scaling 3.5 px stroke (formerly approximately 2.0 px on the primary phone). Point outlines are non-scaling. Selected readings are distinct. Dense histories use smaller dots; every effective record remains present.
- Recorded values use 13 px labels. A deterministic layout prioritises the selected reading and endpoints, tries positions above/below points, and rejects collisions with other labels, points and line segments. Dense annotations are thinned independently of records.
- Date labels preserve the endpoints with inward alignment. The caption gives the full date extent, including years, and explains the existing evenly spaced check-in positions. Straight connections and record-index spacing are preserved; no smoothed curve, synthetic readings or resampling are introduced.
- Local y-axis padding is at least 0.5 kg or 16% of the range, with a minimum 2 kg span. A 0.1 kg change occupies at most 5% of the plot height. The goal remains in the summary, outside the plot domain, preserving existing distant-goal behaviour.
- Range buttons remain at least 44 px high: two rows at 390 px, three at 320 px and one at 768 px. The selected-point panel retains the selected value/date, range change and Edit action; its duplicated total-change section is removed.
- Keyboard selection supports left/right arrows, Home and End, restoring focus after re-render. Range and point selection expose pressed state.

## Preserved data meaning

Current Weight is the latest effective valid saved record on or before today, not a new fallback to a profile field. Effective history keeps the latest timestamp for duplicate dates, breaking equal-timestamp ties with the later array entry, then sorts by date.

Starting Weight is the earliest effective record on or after `profileStartedDate`. An explicit `startingWeightDate` only identifies that same earliest record; a later marker cannot move the baseline forward. The summary continues to use `health.selectedGoalWeight` for Goal Weight. Dates retain the existing en-AU, local-noon formatter and profile time-zone handling.

Total change is current minus starting weight, rounded to one decimal. Existing goal-aware wording is retained: a negative change with a loss goal shows its positive magnitude as **Weight loss since start**; positive change with a gain goal shows **Weight gain since start**; other cases show signed **Change since start**. An increase with a loss goal is therefore displayed neutrally, never as false loss.

No history shows dashes for current/start/change and the existing Add Check-In invitation. A goal can still be shown. One record is centred with a value/date and no connecting line. Two or more records show exactly their saved points. Close histories retain a calm scale; long histories retain all records while spacing annotations.

## Focused verification

| Verification | Result |
| --- | --- |
| `node --test tests/stage6-weight-progress.test.js` | 38 passed, 0 failed |
| `node --test tests/weight-progress-polish.test.js` | 7 passed, 0 failed |
| `node --test tests/release-coherence.test.js` | 15 passed, 0 failed |
| `node --check alpha06.js` | Passed |
| `node scripts/build_release.js --check` | Passed |
| `git diff --check` | Passed |
| Initial rendered acceptance matrix | 21 passed, 0 failed |
| Final dense/empty refinement checks | 6 passed, 0 failed |
| Focused browser interaction groups | 8 passed, 0 failed |
| Runtime errors / console errors / external requests | 0 / 0 / 0 |

Rendered fixtures: no history, one reading, two readings, normal falling history, 16 closely grouped readings, 400 readings spanning over a year, and rising history; all have a goal. No horizontal overflow, clipped SVG text or overlapping graph text was found.

| Viewport | Before graph height | After graph height | Result |
| --- | ---: | ---: | --- |
| 390 × 844 | 147 px | 354 px | Passed; values readable, final date contained |
| 320 × 568 | 118 px | 280 px | Passed; controls fit; normal vertical scrolling |
| 768 × 1024 | 283 px | 390 px | Passed; one-row range controls |

Browser interactions verified all seven ranges against exact record IDs; value labels against supplied weights; summary/current/start/goal/change values; unchanged history after graph navigation and live resizing; point tapping and keyboard focus; Progress → Home → Weight & Progress; Save & View; historical editing with stable identity and unchanged latest current weight; future-date rejection; pre-profile rejection; discrepancy cancel and explicit confirmation.

The existing date lower bound is `profileStartedDate`, falling back to `health.startingWeightDate`, then today. There is no separate year restriction in the active save path. The existing discrepancy threshold remains strictly greater than 2.0 kg against the nearest other dated record. The active weight UI exposes editing but no ordinary delete control; none was introduced or removed. `app.js`, which owns these paths, is unchanged.

## Scope and evidence

Changed product files: `alpha06.js`, `styles.css`, `weight-progress-foundation.js`. Added focused tests, the repeatable `scripts/audit_weight_progress_polish.js`, and this review. The repository's `PWA_RELEASE_COHERENCE.md` explicitly requires rebuilding after core changes, so `index.html`, `release-manifest.json` and `service-worker.js` contain regenerated content hashes only. No bootstrap/worker algorithm, visible version, manifest, installation identity, storage key, schema, migration, catalogue, nutrition-trend, companion or logo changes were made.

Disposable screenshots and JSON reports are outside Git under:

`C:\Users\mlwes\.codex\visualizations\2026\09\15\01a0a3c6-80c0-7390-838c-ed501d703dbe`

Primary comparison: `before-390-normal-chart.png` and `after-390-normal-chart.png`; whole-screen evidence uses the corresponding `-screen.png` files. Final dense/empty evidence is in the `final` subdirectory. The audit uses new headless Edge contexts, synthetic records only, a loopback origin, blocked service workers, and local source fulfillment for every request. It never connects to TEST or My Data.

These are browser viewport checks, not physical iPhone/Safari acceptance. Founder review on an actual iPhone remains a useful next step. No push, deployment or real personal-data access occurred. The single local commit's SHA is reported in the completion message.
