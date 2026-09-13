# Bounded HEC logo integration — source review

## Source and protected checkpoints

Canonical repository: `C:\Users\mlwes\OneDrive\Documents\HEC Development\Healthy_Eating_Companion_Founder_Trial_Alpha_0_6_32`.
Filesystem real-path verification confirms that the `HEC Develpoment` workspace
path resolves to this same canonical repository; there is no separate source copy.

- Starting branch: `alpha-0.6.33`.
- Starting HEAD: `6e1b70fa5c1143475bc3d03d62eeeac5661074e5` — Make PWA updates release-coherent.
- Starting working tree: clean. Visible application version remains 0.6.33.
- Protected TEST v37: `e6afb3204b5007956e52bf2103d07481cd347fda`.
- Protected My Data v6: `6a2361c550c9012224fd1980b1c62c81f71db200`.
- Prior accepted generation: `9117ffe5f2fce9b9df760fb5`.

No push or deployment was performed. Both live checkpoints were left untouched.
No real browser profile, PWA storage or personal data was accessed.

## Approved artwork and provenance

The clean master `assets/app-icons/hec-official-current-1024.png` is byte-identical to
`C:\Users\mlwes\OneDrive\Documents\HEC Development\HEC Branding & Logo Develpoment\HEC_Official_Current_Logo_1024.png`.
Despite its historical filename, the master measures **1254 × 1254**, RGB PNG.
Its SHA-256 is `7236332209a640a78bf055b35f61ee0df35e4428b81e695f4cefb8ff49326135`.

Direct visual inspection confirms the Circle Balance design: pale cream/wheat rounded background,
coloured circular people/balance motif, green Australia silhouette and HEC lettering inside it.
No mockup was cropped, no substitute artwork was drawn, and no image was regenerated.

Read-only retrieval of the public files at the exact accepted TEST v37 commit confirmed that its
manifest, installation configuration and all three TEST icons match source byte-for-byte.
The existing My Data icon at each size also matches its TEST counterpart byte-for-byte:

| Size | Exact reused source paths | SHA-256 (both role files) |
| --- | --- | --- |
| 180 × 180 | `assets/app-icons/hec-my-data-180.png`, `assets/app-icons/hec-test-180.png` | `821ad74175976371f63744c5c6c2949c21e70089b5b4e673385849c9af692cf1` |
| 192 × 192 | `assets/app-icons/hec-my-data-192.png`, `assets/app-icons/hec-test-192.png` | `bd16a47f77112c95b89983e6e5849fcce9c5331dce30dc48d1dd17182e4f737e` |
| 512 × 512 | `assets/app-icons/hec-my-data-512.png`, `assets/app-icons/hec-test-512.png` | `915bb5322764baeaa2967ee987b92d86648a4540227e60693496238d6fd509b0` |

Home reuses the existing My Data-named 512px asset centrally and the 180px asset in the corner.
These filenames contain approved shared artwork and do not change either installation's role.

## Implementation

- `app.js`: existing `renderHome()` consumes `data.companion.enabled`; it switches the two images and hides the old salad fallback only when the companion is disabled.
- `index.html`: adds the central image inside the existing guidance button and the decorative corner image inside the existing Home header.
- `styles.css`: responsive central sizes, a 40px corner image, reserved greeting space and safe-area padding; companion presentation rules and room destinations remain intact.
- `scripts/build_installation_icons.py`: replaces the obsolete procedural logo drawing with verification of the accepted master/sized TEST artwork and exact copies to the existing My Data paths. Supports `--check` and retains 180/192/512px sizes.
- `tests/home-branding.test.js`: approved image hashes/dimensions, mutually exclusive state transitions and Home-only accessible markup.
- `scripts/audit_home_branding_edge.js`: bounded synthetic rendering/navigation evidence at the three requested viewports.
- `release-manifest.json`, generated block in `index.html`, and `service-worker.js`: regenerated only by `node scripts/build_release.js`.

No companion identity, artwork, voice, behavior, preference model, room destination, food/search code,
persistent schema or migration was changed. No other in-app logo placement was implemented.

The central logo has meaningful alternative text. Its existing button retains written guidance and
its established accessible name. The corner image has empty alt text, `aria-hidden="true"`, no
click action, no focus target and `pointer-events:none`.

## Home results

The audit starts with a fresh synthetic returning profile and uses the normal application bootstrap.
It switches companion state using Settings' existing toggle, navigates through Diary and Settings,
and verifies the return to no-companion state. Every request is locally fulfilled or blocked;
there is no live network fallthrough and no real profile reuse.

| Viewport | No companion | Companion selected |
| --- | --- | --- |
| 390 × 844 | Central logo about 168px; no corner duplicate; pass | Existing Percy visual with 40px top-right logo; no central duplicate; pass |
| 320 × 568 | Central logo about 106px; no clipping or room overlap; pass | Companion remains central; corner logo clear of controls; pass |
| 768 × 1024 | Central logo about 268px; balanced within hub; pass | Companion remains dominant; corner logo unobtrusive; pass |

All six states passed image loading, mutual exclusion, horizontal centering, viewport bounds,
logo/room intersection checks, eight room hit targets, readiness and navigation checks.
Screenshots were inspected visually after transient toasts disappeared.
Safe-area behavior is implemented in CSS; desktop Edge emulation is not physical iPhone acceptance.

An existing Quick Log text-clipping issue is visible at 320px. A separate screenshot rendered from
accepted source HEAD confirms the same clipping before this change. Its touch target remains
available, and it was left outside this bounded branding job.

## Installation identity and icons

Both source roles already had the approved icon pixels. Therefore no binary icon or manifest edit
was necessary. The obsolete builder was the source maintenance defect corrected here.

- Root My Data remains role `my-data`, name `HEC — My Data`, manifest ID `/Lifestyle-Companion/index.html`, start URL `./index.html` and scope `./`.
- TEST overlay remains role `test`, name `HEC — TEST`, manifest ID `/hec-test`, start URL `./index.html` and scope `./`, with its existing origin guard and permanent TEST banner.
- Both manifest 192/512px declarations and role-specific 180px Apple touch icons remain intact.
- The root Apple touch icon still points at My Data; the established installation runtime applies TEST's touch icon for TEST.
- No separate favicon declaration exists in the current shell; no new favicon mechanism was added.
- Installation configs, both manifests, installation foundation, application config, migrations and every icon asset have no diff from the accepted starting source.
- Storage namespaces, IndexedDB names, cache role prefixes, origin/path contracts and personal-data schemas remain unchanged and separate.

These source checks cannot prove an already-installed iPhone Home Screen icon will refresh in place.
No installed app was uninstalled, reinstalled, reset or otherwise altered. Physical icon acceptance
remains for the separately authorized deployment/promotion process.

## Verification and release contract

- Approved icon builder `--check`: pass; exact master and all six sized role assets verified.
- Initial focused run: **71 passed, 0 failed**.
- Final affected Home/release focused run: **18 passed, 0 failed**.
- Rendered checks: **6 states at 3 viewports passed**, including UI state transitions and eight Home touch targets.
- `node scripts/build_release.js --check`: pass.
- New deterministic release generation: **`d5c59b9e8a1e3f707fd5412b`**.
- Generated shell/core hashes and both role variants are coherent; required-core inventory and service-worker template were not manually changed.
- Exactly one complete source suite ran across all 75 test files: **1,491 tests; 1,488 passed, 1 failed, 2 cancelled by timeout; 0 skipped**. Exit code 1; duration 514.3 seconds. No second complete suite was run.
- `tests/food-concept-rendered.test.js:3`: cancelled after its 300,000ms timeout.
- `tests/hungry-jacks-australia-expansion.test.js:21`: cancelled after its 240,000ms timeout.
- `tests/progressive-food-resolution.test.js:82`: failed its `report.p95Ms < 250` timing assertion.
- These three tests and their food/catalogue implementation files were unchanged. The original complete-suite result remains recorded above; the three unresolved outcomes were subsequently reconciled under the explicitly authorized isolated-check procedure below. No unrelated repair or test-threshold relaxation was made.
- `git diff --check`: pass.

Evidence directory:
`C:\Users\mlwes\.codex\visualizations\2026\09\13\01a098a7-2faf-7951-ada4-02a386b78f1f\hec-branding-evidence`.
It contains six final PNGs, `branding-rendered.json`, `baseline-320x568.png`, and the focused/final-focused/complete-suite logs.

## Future candidates — recommendations only

1. Welcome/sign-in screen: a single logo could establish the app's identity before onboarding.
2. First-Home welcome dialog: the logo could replace its existing seedling decoration without adding another persistent Home mark.
3. About/help introduction: a small logo beside the app name could make support and version information easier to recognise.

None of these placements was implemented.

## Bounded validation reconciliation

The founder's continuation explicitly authorized acceptance under Case A if the three unresolved
tests passed in isolation under their existing limits, without another complete suite.

Before testing, HEAD, status, generation and SHA-256 hashes of all 2,826 tracked/untracked source
files were recorded. After testing, all 2,826 hashes and the working-tree status matched exactly:
zero changed or missing files. The candidate generation remains `d5c59b9e8a1e3f707fd5412b`.
Only this review document was updated after that verification to record the reconciliation.

Each selected test ran once, sequentially, in a separate Node process with test concurrency 1.
The original test assertions, fixtures, timeouts and performance threshold were retained.

| Isolated unresolved test | Result | Test duration | Existing limit |
| --- | --- | --- | --- |
| `tests/food-concept-rendered.test.js` — actual Search rendered test | PASS | 111,595.021ms | 300,000ms timeout |
| `tests/hungry-jacks-australia-expansion.test.js` — rendered mobile matrix only | PASS | 132,853.545ms | 240,000ms timeout |
| `tests/progressive-food-resolution.test.js` — test 54 only | PASS | 3,025.206ms | p95 <250ms |

The existing 50-iteration resolution benchmark measured median **59.638ms**, p95 **84.259ms**,
and maximum **95.276ms**. An external logging hook captured the return value of that same benchmark
invocation; it did not alter its result, assertions or limit, and no second benchmark was run.
Total process wall times were 112,019.781ms, 133,542.513ms and 3,388.953ms respectively.

**Classification: non-reproduced suite-load/contention effects**, under the authorized Case A rule.
No clean-baseline comparison was needed. No second complete suite, branding viewport campaign,
unrelated audit, PWA campaign or speculative test was run during reconciliation.
No production bytes or test limits changed, and all previously green branding evidence remains valid.

Reconciliation evidence (freeze hashes, exact selections, logs, timings and final comparison):
`C:\Users\mlwes\.codex\visualizations\2026\09\13\01a098a7-2faf-7951-ada4-02a386b78f1f\hec-branding-reconciliation`.

## Finish line

The reconciled candidate is authorized for exactly one local commit, `Integrate HEC logo branding`,
after the final read-only diff/status review and `git diff --check`. The final response records the
resulting commit SHA and clean working-tree status; the commit cannot embed its own SHA.

TEST v37 `e6afb3204b5007956e52bf2103d07481cd347fda` and My Data v6
`6a2361c550c9012224fd1980b1c62c81f71db200` remain untouched. No push or deployment occurred.

Final decision: **SOURCE LOGO INTEGRATION ACCEPTED — READY FOR SEPARATE GUARDED TEST DEPLOYMENT.**
No push, TEST deployment, My Data deployment or subsequent roadmap work is authorized by this report.
