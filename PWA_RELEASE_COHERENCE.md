# PWA release coherence

Visible HEC version remains 0.6.33. Application generations are independent of
personal data, schema versions and the TEST/My Data identities.

`scripts/release-contract.js` is the ordered core inventory. It includes all
startup JavaScript, CSS, the role manifest, AFCD and the small OFF manifest.
Product shards, source evidence shards, icons, artwork and audio stay lazy.

After changing any core file, shell markup, bootstrap or worker template, run:

```powershell
node scripts/build_release.js
node scripts/build_release.js --check
node --test tests/release-coherence.test.js
```

The builder derives a deterministic 96-bit generation identifier from SHA-256
over the core content hashes, both role variants, inventory, shell markup and
bootstrap/worker source. Each asset still has a full SHA-256 verification hash.
It generates `release-manifest.json`, the marked inline block in `index.html`
and `service-worker.js`. Edit `release-bootstrap.js` and
`scripts/service-worker.template.js`, not their generated copies. Edit ordinary
shell markup outside the generated markers. Generation checks fail on stale
generated output. No timestamp, Git commit ID or user-data field is involved.

The same generated index, worker and generation ship to both roles. Build once
in canonical source. Apply the existing two TEST identity overlays only in the
deployment copy; do not rebuild a different generation after overlaying them.
The manifest carries the expected hashes for both variants. Each role's worker
verifies its own installation config and manifest. Existing origins, scopes,
manifest IDs, storage keys and IndexedDB contracts remain unchanged.

The new inline bootstrap is present before any application dependency executes,
including when a legacy worker serves the new shell. It hides and makes the app
inert until startup succeeds. The worker stages generation-addressed core URLs,
checks every response hash and writes a readiness marker only after every core
write completes. A failed required download rejects installation and removes
only that incomplete staging cache. Activation and skipWaiting happen only for
a complete generation.

Navigation serves the verified cached shell. Required scripts and CSS use exact
generation cache keys; they never revalidate in the background or fall back by
pathname to older bytes or HTML. Browser subresource integrity independently
checks script/style execution. Runtime exceptions keep the gate closed. A
browser without usable service-worker registration must verify the complete
online core set before loading it with integrity checks. It does not acquire
the installed offline guarantee until a worker is ready.

Core data requested by existing AFCD/OFF consumers comes from the verified core
cache. Non-core data and optional assets remain cache-first and lazy, with
cache writes awaited. Optional artwork failures do not invalidate the core.

A complete older generation remains available during subsequent downloads.
Controller changes briefly gate interaction, query worker readiness, and reload
once only when the page generation differs from the ready controller. The new
page reads its matching cached shell. Failed updates have a non-destructive
Retry path; script execution failures require an explicit retry reload rather
than replaying modules into a partially initialised global scope. A delayed
readiness reply can be retried on foregrounding. Startup, pageshow, visible
foregrounding and online events share an in-flight check and a 60-second
network throttle. Offline starts skip the network check.

Old caches are retained while any live controlled client has not reported the
current generation ready. After all have reported, only obsolete caches owned
by the same role (plus My Data's historical common prefix) are removed. Personal
storage is never part of this protocol.

`HECRelease.snapshot()` reports only page/core/worker/cache generation, role,
readiness, executed hashes and update counters. It exposes no personal data.
`HECRelease.check()` invokes the same guarded update check; ordinary users see
status and Retry rather than these diagnostics.

Legacy workers cannot be retroactively changed. Exact deployed v5/v36 clients
are protected when they receive the new inline shell. A legacy offline client
that has not received it remains on its cached old release. If a legacy worker
has already replaced its old shell but a required new download fails, the new
gate must stay paused until a connection permits a complete release; reverting
to an unverifiable mix is unsafe. Once this protocol is installed, subsequent
updates retain the older coherent shell during failures and offline use.

The persistent browser regression accepts a JSON configuration with `output`,
`oldMyData`, `oldTest` and `certificate` (a loopback-only HTTPS PFX using the
synthetic-local-only passphrase). Run:

```powershell
node scripts/audit_release_coherence_edge.js path/to/disposable-config.json
```

It uses separate persistent Edge profiles, exact prior deployments for the
initial migration, and an explicitly synthetic preceding coherent generation
for subsequent-protocol offline/foreground cases. It never uses a real profile,
publishes files, clears storage or warms candidate caches before the immediate
upgrade observation. Edge mobile viewports are not proof of physical iOS
WebKit behaviour; guarded TEST and physical acceptance remain necessary.
