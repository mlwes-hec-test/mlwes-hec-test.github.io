# Brand catalogue performance acceptance

This is an explicit testing-policy change. It does not retroactively pass the
old measurements or claim that production search became faster. The rejected
first-use optimization must not be included in the application under test.

The established percentile is `sorted[min(n-1, floor(n * .95))]`. With 20
samples, index 19 is the maximum. With 50, index 47 is the third-highest value.
The median remains `sorted[floor(n * .5)]`. No interpolation is introduced.

Generic shortlist requires all three gates:

- Normal-search median **<= 100 ms**, over exactly 50 samples.
- Normal-search p95 **<= 300 ms**, over exactly 50 samples.
- Separate genuine cold-first search **<= 500 ms**, exactly one sample.

Both independent normal runs must pass separately. The cold result is never
inserted into their populations. All other rendered operations retain their
existing **p95 < 250 ms** gate, including its strict equality boundary. The
separate catalogue adapter benchmark retains its **recognition p95 < 20 ms**
and other existing gates. Generic limits are inclusive as explicitly approved.

From the SOURCE root, run once with a new evidence directory:

```text
node scripts/benchmark_brand_rendered.js <evidence-directory> --acceptance
node scripts/benchmark_brand_catalogue.js
node --test tests/brand-performance-policy.test.js
```

The acceptance command runs sequentially: one cold-only browser, one normal
50-sample browser, and one independent normal 50-sample confirmation browser.
Each launches a fresh Edge process and synthetic application context. There is
no warm-up in any browser. The normal distributions retain their own first
samples, even when slow. No test jobs should run alongside these measurements.
There are no automatic retries or third attempts. `--cold` and `--normal`
allow the same stages to be run separately; do not use them to retry a failed
stage. Existing evidence files cannot be overwritten by the harness.

The cold browser opens the blank Food Library, fills Bread, and measures the
first genuine generic submission before any other query. It then settles only
to collect runtime/asset evidence. Normal runs retain the original operation
order, preparation, queries, timer, readiness predicates and settling. Each
iteration measures freshFoodLibrary, blankNewSearch, genericShortlist,
exactBrand, brandProduct, brandBrowse, brandCategory, conceptBrandName,
retailerBrowse and allItems. The viewport remains 390 × 844. All application
requests are served from local SOURCE by the established isolated harness;
real installations and personal browser data are not used.

Each stage writes `brand-performance.json` with raw samples in arrival order,
the policy, Edge version, release generation, statistics, per-gate results,
runtime evidence and overall pass/fail. Partial samples survive runtime
failure. Statistics and new gate decisions use unrounded durations; display
rounding must not remove or modify samples. Other rendered gates retain their
previous three-decimal decision rounding and strict 250 ms boundary.
`brand-acceptance.json` records
the cold result and both independent distributions without averaging them.
A nonzero process exit indicates failure.

This tooling is outside the deterministic runtime/support release inventory.
Tooling-only edits should leave production files and release generation
unchanged; verify using `node scripts/build_release.js --check`.
