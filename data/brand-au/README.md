**Australian brand catalogue — private-testing source evidence**

Source verification status: **READY FOR MYRON REVIEW**. After one warm-up,
the final independent 20-iteration rendered runs measured generic-shortlist
p95 at 232.0 ms and 234.1 ms against the unchanged 250 ms gate (medians 48.9 ms
and 65.3 ms). All other rendered and adapter gates pass. Representative Reviews,
three responsive viewports and the broader 567-test FOOD/SEARCH run also pass.
This is a local SOURCE release candidate; no push or deployment is authorized.

This deterministic wave contains 1,922 existing OFF GTIN identities with 342
admitted source brand tokens (107 Tier A and 235 Tier B), across 17 existing HEC
categories. It creates no new canonical identities. Thirty-four products reuse
existing retailer catalogue evidence; no retailer membership is inferred.

The complete frozen export is dated by its source snapshot, 2026-08-30, even
though its retained filename is `off-products-2026-09-15.csv.gz`. Its SHA-256 is
`f72687ee8bc6522054fe69dbfda6b91902c16af1ec2e043cde27bc6c29ad8176`.
The 73,300 explicitly Australian records reproduce the existing OFF import
exactly. Historical country tags do not establish current stock or availability.

`population-audit.json` records the full audit before production projection;
its `productionApproved: false` distinguishes candidate evidence from admission.
`build-report.json` is authoritative for the final wave after three projection
holds and recalculated tiers. The 2,410 clean pre-tier inputs become 1,922
admitted products, with 485 ordinary singleton products deferred and three held.
Brand counts are source frequency, not popularity or corporate ownership.

The recovered full source brand field and tags remain alongside the established
primary display brand. Multiple explicit brand tokens are memberships of that
source record. They do not establish parent/sub-brand hierarchies. Source-literal
retailer brand tokens remain independent of retailer listing evidence; retailer
root navigation retains its existing meaning.

All ordinary wave choices pass HEC eligibility plus stricter source identity,
category, GTIN, serving, physical-form, required-macro, quality-error and energy
checks. Missing nutrient values remain absent/null. An energy-pair disagreement
over 5% excludes a product. Rejected source records are preserved in the existing
OFF evidence and external audit, without admission to the new brand views.

Open Food Facts contributors: database ODbL 1.0, contents DbCL 1.0. Attribution,
licence URLs, source record URL, snapshot/input hashes and original record number
are retained in generated records. No product images, marketing copy, brand
logos, endorsement, prices or live availability are included.

Reproduction uses the retained frozen export, never a network refresh. Choose an
audit output directory outside SOURCE and run from the repository root:

```text
python scripts/audit_brand_wave_extract.py --input <frozen.csv.gz> --output <audit-directory>
node scripts/audit_brand_wave.js <audit-directory>
node scripts/build_brand_catalogue.js --prepare <audit-directory> --check
node scripts/build_brand_catalogue.js --check
node --test tests/brand-generation.test.js tests/brand-wave-audit.test.js tests/brand-catalogue.test.js
node scripts/build_release.js --check
```

The extraction rehashes the archive, reads through gzip EOF/CRC, selects exact
`en:australia` country tags, and replays the existing importer. The full audit
writes per-record exclusions and all 12,609 normalized brand frequencies outside
SOURCE. The prepared source input contains only the clean, normalized candidate
pool. Hashes in `source-policy.json` pin that pool, extraction, audit rows and
audit rules. Running the generator twice is checked for byte-identical output.

The runtime adapter provides indexed brand/concept membership, lazy 20-record
shards, 20-item display pages and revision-owned cancellation. It uses the
existing query intent, canonical product, guided measure and final Review
controllers. There is no global brand directory redesign. Existing accepted
non-OFF manufacturer/curated products remain available alongside wave products.
