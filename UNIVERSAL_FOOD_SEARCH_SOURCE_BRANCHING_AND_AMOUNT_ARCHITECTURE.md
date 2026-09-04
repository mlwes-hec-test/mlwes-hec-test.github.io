# Universal Food Search, Source Branching and Amount Architecture

## Purpose and non-patch rule

Alpha 0.6.33 uses one metadata-driven route from food-search text to a selected
nutrition identity, compatible measure, consumed amount, Review and Diary.
Acceptance foods may appear in catalogue metadata, aliases, tests and audit
fixtures. Their names must not control production branches.

## Pre-implementation production trace

The active input route starts at `#food-search`. `alpha0630HandleFoodSearchInput`
stores the text, advances catalogue/online tokens, renders the lightweight live
surface, and schedules `renderLibrary` plus online lookup. Later Alpha 0.6.33
wrappers add `searchSession633`, restaurant recognition, exact-product decisions,
Guided Product Resolution and large-catalogue lookup.

Before this repair, Search/Return called `ss633CommitCurrent`, but that function
only committed a recognised restaurant source or an existing guided brand/generic
family. Other completed queries had no universal submit route. `renderLibrary`,
the RC4/RC5 exact/source wrappers, the Guided Product renderer and the large
catalogue renderer could each own `#food-results`; `ps33EnforceResultSurfaceOwnership`
hid competing markup, but did not provide one immutable submitted-result model.

Preview and submitted async work shared catalogue revision helpers, while the UI
session retained only raw/normalised text, focus, caret, mode, intent and one
error owner. It did not explicitly retain a submitted revision, submission mode,
parsed source/preparation/quantity language, selected snapshot, destination, or
separate preview/submission async ownership.

Generic concept recognition lived in `search-foundation.js`; a small set of AFCD
families lived in `guided-product-resolution.js`; older generic branching lived
in `alpha06.js`. Source labels were partly special-cased and the chips schema
combined purchased-frozen and home-cooked evidence. Exact restaurant resolution
used another source context. This allowed the selected restaurant context to be
lost when a generic wizard restarted.

Quantity parsing existed in both `search-foundation.js` and
`guided-product-resolution.js`. Both parsers treated the first number primarily
as consumed amount. Neither represented product-variant count, pack/name count
and consumed quantity as separate fields, and compound written fractions were
not shared across typed, voice and guided entry.

`serving-foundation.js` centralised many safe measures, but `physicalForm`
classified any record with an mL unit as liquid before considering stronger solid
identity evidence. Raw source units therefore had too much authority. Measure
selection advanced the state and rerendered, but the production click path did
not deliberately focus the newly rendered amount input. Answer history used a
single horizontal row with clipped/ellipsised labels.

## Root-cause map

| Concern | Previous owner(s) | Root cause | Universal owner |
| --- | --- | --- | --- |
| Preview state | `searchSession633`, live wrappers | Incomplete state and several render owners | Explicit search-session snapshot |
| Submission | `ss633CommitCurrent` | Only source/family queries committed | One submitted-result builder for every query |
| Result ordering | base library, RC4/RC5, OFF renderer | Ranking and grouping were surface-specific | Immutable grouped submitted result |
| Source context | search concepts, old wizard, guided schemas | Labels and state were inconsistent | Canonical source-context policy |
| Quantity | two independent parsers | Variant count and consumption were conflated | Shared quantity-language result |
| Physical form | source units plus inferred category | mL could define identity instead of being validated | Central form compatibility and quarantine |
| Amount transition | guided click renderer | Rerender occurred without deliberate focus | Atomic render-then-focus transition |
| Back/Edit | separate wizard and search state | Prior committed results were not a stable snapshot | Submitted snapshot retained with destination |

## Target state model

The search session retains raw and normalised text, stable input identity, focus,
caret, preview revision, submitted revision, submission mode, detected intent,
quantity/source/preparation language, preview/submission async owners, owned
errors, selected result, immutable submitted groups, and destination meal/date.

Typing is preview-only. Submission by form Search/Return, the visible Search
button, or an exact preview tap freezes a new submitted revision. Primary groups
remain stable; later online results are append-only in a labelled broader group.
The append path inserts or updates only that online group, so it does not replace
primary result nodes during an in-progress tap. Pointer intent is retained from
pointer-down to pointer-up with a movement threshold, which also avoids treating
a touch-scroll gesture as a selection if a legacy focus render occurs between
those events. Keyboard-generated clicks use the same control action.

## Safe downstream model

Generic composite concepts offer separate Home-Prepared, Ready-to-Eat,
Purchased Packaged/Frozen and Not Sure paths. Simple whole foods can skip that
question and route directly to their safe generic resolution. Exact products
retain their source and skip generic questions already answered by identity.
Submitted result rows state whether nutrition is usable or whether the identity
is incomplete and must be reviewed before Diary. Where no trusted nutrition
identity exists, the result is an explicit incomplete state or the established
recipe/manual-food handoff.

Every selected food receives a physical-form profile, allowed/rejected measure
families, measure provenance and confidence. Nutrition basis, product/package
identity counts and consumed amount remain separate. Measure selection renders
the blank decimal amount field and focuses it only because the user deliberately
selected a measure. Generic concept form metadata is considered before a raw
source volume field, so a malformed mL unit cannot redefine a known solid form.
Amount typing and quick fractions update one live nutrition preview; Continue or
Done remains the commitment boundary, and valid decimals retain up to three
visible decimal places through Review.

## Data gaps and safe incompleteness

The foundation does not manufacture densities, household conversions, recipe
ingredient quantities, package serving counts or nutrition for identity-only
catalogue rows. A packaged record with an incompatible basis can retain its
identity and source facts while the bad consumed measure is quarantined. If no
compatible measure and usable nutrition remain, Diary stays blocked and the
barcode, Nutrition Panel, existing recipe builder or manual-food route is shown.

## Physical-device gate

Automated Edge can verify form submission, focus ownership, input attributes,
state transitions and responsive layout. The exact iOS keyboard artwork and its
Search/Done labels still require a physical founder iPhone check.
