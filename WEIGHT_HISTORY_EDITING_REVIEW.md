# Compact Weight History editing — source review

## Preflight

- The workspace junction under `HEC Develpoment` resolves to canonical SOURCE:
  `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.
- Branch: `alpha-0.6.33`. Working tree was clean before edits. No configured Git remotes.
- Starting HEAD: `2c75097fce9de904bf741cf5df1066c0524b8da6`, **Polish weight and progress experience**.
- Direct parent: `2849343035e607a20f721e5a07e7522744522dfc`.
- No TEST or My Data deployment checkout or real browser profile was accessed.

## Change

The old history wrapper contained a separate Edit button. At phone widths its
CSS moved the button onto a full-width second line. The six-entry fixture had
123 px rows at 390 and 320 px, making the list unnecessarily bulky.

Each entry is now one native `button type="button"`, carrying the same
`data-edit-weight-date` as the former Edit button. Its left column shows the
existing Australian date and optional saved note; its right columns show the
recorded weight and a 16 px outlined pencil. The pencil is decorative and does
not receive focus or pointer events. The whole row, including its inset, is
the edit target. There are no nested interactive controls.

Rows have restrained dividers, hover/pressed feedback, a 48 px minimum height,
and a 3 px visible keyboard focus outline. Native Tab, Enter and Space operation
is preserved. Accessible names include the edit action, saved date and weight
in kilograms. A visible instruction says “Select a row to edit its saved weight.”
Long dates and notes wrap without truncation; the weight and pencil stay visible.
Normal synthetic rows measure 58.61 px high at all three requested widths.

The existing `app.js` edit listener and save transaction are unchanged. There
is no persistence, date, baseline, goal, current-weight, graph, mirror, namespace,
profile, navigation or delete change. No delete functionality was added. The
separate check-in editor's history and the existing heading/selected-point
actions are retained.

## Focused verification

Final results:

| Check | Passed | Failed |
| --- | ---: | ---: |
| `tests/stage6-weight-progress.test.js` | 38 | 0 |
| `tests/weight-progress-polish.test.js` | 7 | 0 |
| `tests/release-coherence.test.js` | 15 | 0 |
| Final rendered history audit | 24 | 0 |
| Before-capture audit | 4 | 0 |

The rendered audit uses fresh headless Edge contexts, synthetic records only,
Australia/Brisbane time fixed to 15 September 2026, blocked service workers,
and a loopback origin. Every request is fulfilled from SOURCE or rejected;
there is no network fallthrough. Final runtime errors: **0**. Console errors:
**0**. External requests: **0**. The release tests use mocked worker contexts.

- Lists of 1, 2, 6 and 400 saved entries render at 390 × 844, 320 × 568 and
  768 × 1024. All dates, weights, record targets and accessible labels match.
- At each size: no horizontal overflow, clipped row content or missing cue;
  comfortable full-row targets; graph labels remain bounded and non-overlapping.
- Graph SVG for the identical six-entry fixture is byte-identical to the before
  capture at all three sizes. Every saved point remains plotted.
- Oldest, middle and latest entries (where distinct) open their actual saved
  date, weight and note. Clicking the row inset works; touch activation works
  at each viewport. Tab focus, Enter and Space work at 390 px.
- Back without saving preserves history. Cancel in the existing replacement
  confirmation preserves history. This editor has no standalone Cancel button.
- Saves of the oldest and latest entries preserve record identity/count and
  unrelated records. An older edit leaves Current Weight unchanged; editing
  the latest record updates Current Weight. History, summary and graph reflect
  the intended saved value.
- Future dates and dates before the profile start are rejected without saving.
- The existing greater-than-2 kg discrepancy warning appears before saving;
  cancellation preserves records and confirmation saves the intended record.
- Weight / Progress → Home → Weight / Progress navigation works.
- Long localised date text and an unusually long unbroken synthetic note were
  inspected at all three sizes. Content wraps and the weight/pencil remain visible.

These are rendered Edge viewport checks, not physical iPhone/Safari acceptance.
No full historical, retailer/catalogue, logo or broad browser suite was run.

## Files and release coherence

- `alpha06.js`: replace the separate history Edit control with the semantic row.
- `styles.css`: row layout, interaction/focus styles and wrapping; remove the
  obsolete mobile rule that placed the former button on its own line.
- `index.html`: the short row-edit instruction and deterministic release block.
- `release-manifest.json`, `service-worker.js`: regenerated content hashes only.
- `scripts/audit_weight_progress_polish.js`: export existing fixture/audit helpers.
- `scripts/audit_weight_history_editing.js`: narrowly scoped rendered regression.
- `WEIGHT_HISTORY_EDITING_REVIEW.md`: this review.

The established `scripts/build_release.js` process regenerated the required
release files. Its `--check` passes. Visible version remains **0.6.33**;
installation identity and bootstrap/worker logic are unchanged.

## Disposable evidence and reproduction

Evidence directory (outside Git):

`C:\Users\mlwes\.codex\visualizations\2026\09\15\01a0a3fc-145d-75b2-9d3a-07770566e858`

Primary 390 × 844 comparison:

- `before-390-several-history-screen.png`
- `after-390-several-history-screen.png`

The directory also contains 320/768 captures, focused card captures, keyboard
focus and long-date stress images, and `before-report.json` / `after-report.json`.
Screenshots were visually inspected and are not committed.

For a paired source-change audit, run the following before editing, then repeat
with `after` once the deterministic release build is current. The after audit
uses the before JSON from that same output directory to compare graph markup.
The fixtures include the existing starting-weight note/marker so app memory
and the startup migration's persisted fixture agree before editing.

```powershell
node scripts/audit_weight_history_editing.js <disposable-output-directory> before
node scripts/build_release.js
node scripts/build_release.js --check
node --test tests/weight-progress-polish.test.js tests/stage6-weight-progress.test.js tests/release-coherence.test.js
node scripts/audit_weight_history_editing.js <disposable-output-directory> after
```

One local source commit is authorised after successful verification; its exact
SHA and the final clean-tree check are recorded in the completion report.
No push, TEST deployment, My Data deployment or real personal-data access occurred.
