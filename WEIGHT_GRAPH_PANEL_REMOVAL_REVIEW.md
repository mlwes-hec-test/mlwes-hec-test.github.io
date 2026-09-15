# Remove redundant weight graph detail panel — source review

## Preflight

- Canonical SOURCE: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.
- The workspace path under `HEC Develpoment` is a junction to that source directory.
- Branch: `alpha-0.6.33`; initial working tree clean; no configured Git remotes.
- Starting HEAD: `a9c07d551791119206086f86415fe3ae1fb8afd5`, **Polish weight history editing**.
- Direct parent: `2c75097fce9de904bf741cf5df1066c0524b8da6`.
- This work used SOURCE only. No protected TEST or My Data checkout or personal browser profile was accessed.

## Removal and retained behaviour

The entire `#weight-point-summary` element beneath the graph is removed,
including its live region. Its renderer, call, and exclusive `weightChangeText`
formatter are removed. This removes **Selected Point**, the selected weight/date,
**Change In This Range**, its value/from-date, and **Edit This Weight**. The empty
panel's “No point selected” fallback is also gone. Nothing replaces or relocates
the panel. No hidden graph edit action or blank container remains.

Weight-specific panel CSS overrides are removed. The generic
`.weight-point-summary` styles remain because Nutrition Trends uses that class.
Existing card spacing closes the gap without adding spacing rules. The graph
and caption are the chart card's final content, followed by the existing Weight
History card with comfortable spacing.

`ext.ui.selectedWeightPointId` remains useful: it drives the selected point's
visible highlight, prioritises that reading's plotted weight label, and supports
keyboard navigation. The existing click/tap, Enter, Space, Left/Right, Home and
End handlers remain. Keyboard selection restores focus after rendering. Points
retain their full saved date/weight accessible labels, pressed state, focus
outline and existing SVG titles. The graph group description now describes
highlighting and labelled readings without implying a separate review panel.
No tooltip, popup or new edit affordance was added. Graph activation does not
open the editor. `HECSelectWeightPoint` remains for the existing Save & View path.

The shared pure model's `rangeChange` and journey summary contract remain intact;
their calculation tests remain, with obsolete visible-panel assertions updated.
The graph layout, saved readings, line, axis scale, weight/date labels, range
controls, empty/one-point states and dense-history behaviour are preserved.
Top-summary rendering and values are preserved; only an unused parameter and
return value were removed from its rendering helper.

## Focused verification

Final results:

| Check | Passed | Failed |
| --- | ---: | ---: |
| `tests/stage6-weight-progress.test.js` | 38 | 0 |
| `tests/weight-progress-polish.test.js` | 7 | 0 |
| `tests/release-coherence.test.js` | 15 | 0 |
| Expanded rendered Weight History audit | 30 | 0 |
| Focused Progress audit: normal fixture viewport cases | 3 | 0 |
| Focused Progress audit: interaction groups | 8 | 0 |
| Before-capture audit | 4 | 0 |

The initial expanded audit stopped at 3 passed / 1 failed because a preceding
keyboard fixture retained an older point selection in synthetic UI storage.
The fixture opener now explicitly selects the latest point before each case.
The final 30/0 run compares the same data and selection; no product change was
needed for this harness issue. Its diagnostic JSON is retained outside Git.

The audits launch fresh headless Edge contexts with synthetic records, blocked
service workers, a loopback origin, fixed 15 September 2026 time and the
Australia/Brisbane timezone. Every request is fulfilled from source or rejected,
with no network fallthrough. Runtime errors: **0**; console errors: **0**;
external requests: **0**. Release-coherence unit tests use mocked worker contexts.

- Empty, one-, two-, six- and 400-reading cases passed at all three viewports.
- Each plotted point and history row matches its exact saved record and weight.
  Current, goal, start and change summaries match the fixture values.
- No panel appears on opening, click/tap, keyboard selection or range changes.
  No graph-level edit action remains, and no chart ARIA relationship is broken.
- All seven ranges preserve the expected saved record IDs and pressed state
  without weight-history writes. Live resizing preserves data and graph labels.
- Graph SVG for the same six-reading fixture is byte-identical before and after
  at each viewport. Graph heights remain approximately 354, 280 and 390 px.
- History rows remain native compact edit buttons with decorative pencil cues,
  accessible saved-date/weight names and normal heights of about 58–59 px.
- Clicking row insets, touch, Tab, Enter and Space opens the correct record.
  Oldest, middle and latest entries were checked where distinct.
- Save and Save & View work. Editing oldest/latest entries preserves record IDs,
  dates, notes, counts and unrelated records. Older edits preserve Current Weight;
  latest edits update it. New check-in creation also passed.
- Back without saving and cancellation of replacement/discrepancy confirmation
  preserve records. The existing editor has no standalone Cancel button.
- Future dates and dates before `profileStartedDate` are rejected without writes.
  Existing fallback lower-bound logic is unchanged.
- The strictly greater-than-2 kg discrepancy warning still appears before save;
  cancellation preserves records and explicit confirmation saves correctly.
- Weight / Progress opens and navigation through Home back to Progress works.

| Viewport | Result |
| --- | --- |
| 390 × 844 | PASS; primary before/after visually inspected |
| 320 × 568 | PASS; graph, controls, summary and history visually inspected |
| 768 × 1024 | PASS; tablet layout visually inspected |

No horizontal overflow, clipped graph labels/history content or material text
overlap was found. Long date/note wrapping was also checked. These are rendered
Edge viewport checks, not physical iPhone/Safari acceptance. No historical,
retailer/catalogue, logo campaign or broad browser matrix was run.

## Files and release coherence

- `alpha06.js`: panel/formatter removal, unused helper wiring cleanup, updated
  accessible graph description and selection-purpose comment.
- `styles.css`: remove only weight-screen panel overrides.
- `index.html`: remove panel element; deterministic generated release block.
- `release-manifest.json`, `service-worker.js`: deterministic generated hashes.
- `tests/stage6-weight-progress.test.js`: preserve model assertions and reverse
  obsolete expectations for visible panel text.
- `scripts/audit_weight_history_editing.js`: focused panel-removal, selection,
  range, summary, empty-state and before/after evidence checks; isolate selection.
- `scripts/audit_weight_progress_polish.js`: verify selected graph point labels
  instead of the removed panel.
- `WEIGHT_GRAPH_PANEL_REMOVAL_REVIEW.md`: this review.

The established `scripts/build_release.js` workflow regenerated the release
files, and `--check` passed. JavaScript syntax and `git diff --check` passed.
Visible version remains **0.6.33** and installation identity is unchanged.

## Disposable evidence and reproduction

Evidence is outside Git:

`C:\Users\mlwes\.codex\visualizations\2026\09\15\01a0a42e-fc5b-79d3-a8ce-9aed158678b5`

- `before-390-several-graph-history-screen.png`: graph, redundant panel and History.
- `after-390-several-graph-history-screen.png`: same graph followed by History.
- `before-*-several-progress.png` / `after-*-several-progress.png`: complete
  synthetic progress sections, including range controls, at each viewport.
- `before-report.json` / `after-report.json`: graph SVG, geometry and audit results.
- `progress-interactions/after-report.json`: focused Progress interaction results.

The redundant panel's removal brings History upward without changing the plot
or adding another box. Screenshots are disposable and are not committed.

```powershell
# Capture before source edits; the after audit consumes this comparison JSON.
node scripts/audit_weight_history_editing.js <disposable-output-directory> before
node scripts/build_release.js
node scripts/build_release.js --check
node --test tests/stage6-weight-progress.test.js tests/weight-progress-polish.test.js tests/release-coherence.test.js
node scripts/audit_weight_history_editing.js <disposable-output-directory> after
$env:HEC_WEIGHT_CASES='normal'
node scripts/audit_weight_progress_polish.js <separate-disposable-output-directory> after
```

Exactly one local source commit is authorised following these checks. The final
completion report records its SHA and final clean-tree result. No source push,
TEST deployment, My Data deployment or real personal-data access occurred.
