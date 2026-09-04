# Physical form and consumed measures — Alpha 0.6.33

The committed McCain Hash Browns record (`off:9310174025084`) exposed a shared defect: broad “Plant-based foods and beverages” ancestry was treated as liquid evidence. The adapter then supplied an mL nutrition denominator, and downstream consumers could restore rejected units. This product is a regression probe only. Production compatibility rules contain no McCain or Hash Brown exceptions.

## Authority and evidence

`serving-foundation.js` owns physical-form inference. Reviewed physical-form metadata, existing food-concept metadata, specific food categories and explicit food identities establish form. Broad category ancestry, package quantity, an arbitrary source unit and the nutrient denominator do not establish a liquid identity. Specific powder and solid categories protect products with misleading beverage ancestry. Category normalization includes short plural heads such as “bars”.

Older OFF records without a physical-form provenance marker are reclassified from their identity metadata. If their old normalization left only a volume nutrient basis for a solid, they require completion instead of silently acquiring a gram conversion. String nutrition-basis labels are preserved intact in structured provenance before semantic normalization.

`off-catalogue.js` uses that same inference and preserves `sourceNutritionBasis`, `rawSourceNutrients`, manufacturer serving text and source references. The committed OFF CSV snapshot uses a common `per-100g-off-csv` field marker for its normalized nutrient columns. Its existing liquid interpretation is retained only for an identified liquid. An explicitly supplied per-100-mL solid basis remains mL; it is never relabelled grams.

## One final boundary

`servingMeasureProfile` first collects source and semantic measures, manufacturer count conversions, applicable existing Australian reference conversions and metric candidates. Reviewed candidates may replace an unvalidated candidate with the same key; the original remains quarantined. `finalCompatibilityFirewall` runs after this merge. It evaluates the user-facing measure family, physical form, conversion target, source and confidence.

The result supplies both `measures` and `resolvedFood.units`. `allowedUnits`, `servingPolicy.allowedUnits`, labels, defaults and fraction choices are restricted to that same set. `applyToFood` applies the complete profile, so legacy dropdowns also cross the final boundary. There is no semantic or raw-unit merge after the firewall.

| Physical form | Accepted with appropriate conversion evidence |
| --- | --- |
| Solid/countable | Source item, piece, biscuit, bar, roll, manufacturer serve, grams |
| Sliced | Source slice variants, manufacturer serve, grams |
| Weight solid | Grams, appropriate kilograms, source serving; existing reviewed Australian generic food-group measures retain their documented gram conversions |
| Liquid | mL, litres, validated household volume, source manufacturer serving and compatible container units |
| Spread | Grams, validated household-to-gram measures, source serving or product-specific packet |
| Restaurant | Official natural item, count, size or portion and supported additional measures |
| Unknown | A supported gram fallback; otherwise completion is required |

A tablespoon converting to grams remains a household measure. A burger converting to grams remains an item. Conversion implementation does not redefine physical identity. Countable solid foods never acquire cups, mL or litres.

## Quarantine and conflicts

`sourceMeasureMetadata` retains the original units, labels, origins, manufacturer serving and nutrition basis. `quarantinedMeasures` / `rejectedMeasures` retain each rejected candidate and its reason. Original source datasets and nutrient values are not edited.

If a solid’s actual nutrition denominator is mL and there is no explicitly trusted density/weight conversion, the profile is empty, `nutritionBasisConflict` is true, logging is blocked and the existing Nutrition Panel, barcode and manual completion actions remain available with the exact product name. Valid gram nutrition remains usable when only a manufacturer volume serving is unsuitable.

Package size remains identity metadata. A nutrition reference remains a scaling basis. Neither supplies a consumed amount: the user chooses a measure, then enters an amount.

## Consumers

The production Portion Choice renderer reads only `session.servingProfile.measures`. A deliberately empty central profile cannot trigger a raw-unit or inferred-metric fallback. `reviewFood` reconstructs units from that profile. Review merges carried candidates before obtaining its final profile; measure lookup and edits use that profile, and an unsupported selection cannot save.

A deliberate consumed portion also prevents the legacy Review unit lock from overriding or hiding the selected measure. Explicit manufacturer slice counts remain available for countable products when they have a trusted gram conversion; their per-item labels use the actual serving multiplier.

Typed and voice requests resolve units through `resolveMeasureRequest`. An incompatible request asks for a supported measure rather than silently keeping the default. `consumedPortionState` can validate against the food’s profile; guided handoff and Review use that validation. The resulting consumed amount and conversion remain authoritative for nutrition and Diary snapshots. Unsupported legacy multipliers return missing nutrition rather than assuming a factor of one.

## Verification

`tests/physical-form-measure-compatibility.test.js` includes the actual committed McCain record and its rendered Edge selection, quarantine, aliases, malformed serving, basis conflict, unknown identity and liquid/spread/slice/restaurant controls. Existing serving, search, voice and handoff assertions remain in place.

`scripts/audit_physical_form_measures.js` audits all 73,300 committed records, independently checks specific category classifications, and selects deterministic samples of 200 solids, 100 liquids, 50 spreads, 50 sliced/countable foods and 50 unknown/incomplete records. It checks idempotent Review profiles, deliberate amount entry, provenance and source immutability. This is build/test-time work; runtime validation operates on an individual candidate profile.

The Edge audit scripts route every application request to local files under an isolated virtual TEST origin, using the existing TEST role overlay. They do not create a deployment candidate, contact live TEST for assets, or open My Data storage. The responsive audit covers all five requested sizes and the required food, source, Review and voice routes.

Wall-clock benchmarks are run in fresh processes and the complete canonical suite uses test-file concurrency 1. Their implementations, sample counts, warm-up behavior and 250 ms thresholds remain unchanged. A separate future infrastructure change should isolate wall-clock benchmarks from the parallel runner.
