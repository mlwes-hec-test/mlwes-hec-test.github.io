# Progressive Food Resolution and Portion Policy

Version: HEC Alpha 0.6.33

## Identity before quantity

HEC uses one Progressive Food Resolution state machine for typed, voice, barcode, Recent, generic-reference, branded-product and menu-item entry. It keeps the original query, intent, generic concept or brand, candidate snapshot, known and unresolved attributes, answers, exact nutritional identity, portion profile, measure, amount, Diary destination, provenance and nutrition confidence in one session.

A generic food identity is an authoritative reference record, such as an AFCD margarine, milk or bread record. A branded identity is one specific consumer product. A broad brand, product line, barcode placeholder or family shell is navigation context, not an exact food. Generic intent remains generic unless the person explicitly chooses **Browse Branded Products**.

The order is fixed:

1. resolve one nutritional identity;
2. choose a valid serving measure;
3. enter the consumed amount;
4. calculate nutrition and review the Diary destination.

Questions come from declarative attribute schemas and candidate metadata. HEC pre-fills attributes stated in the query or shared by every remaining candidate, asks only a useful unresolved distinction, and recomputes downstream state after Back or Change. Product metadata can therefore skip generic questions without creating a separate branded workflow.

## Selected-identity lock

Once one nutritional identity is selected, its candidate snapshot is frozen. Outstanding catalogue/online work is invalidated and later responses cannot change the selected identity or insert results into the portion workflow. Search results, online status/actions and the floating add control are suspended; a single exact-identity card owns the active measure/amount flow. Back restores the prior query context.

## Portion presets and conversions

A portion preset is a named household or natural unit with a numerical conversion and recorded provenance. It is separate from both product identity and the nutrition reference basis.

A preset is allowed only when its conversion comes from one of:

- explicit manufacturer/package serving metadata;
- an authoritative Australian standard-serve guideline;
- a reviewed HEC form-level conversion already present in the repository;
- an exact metric conversion.

Every offered measure records its conversion provenance, source type and confidence. Grams or millilitres remain the conservative fallback when the nutrition basis supports them. Package size and “per 100 g/mL” are identity/reference metadata and never become the consumed amount automatically.

Current reviewed examples:

- spreads: arbitrary grams and the existing reviewed `1 teaspoon = 5 g`; explicit manufacturer serve where supplied;
- liquid milk: arbitrary mL, 250 mL metric cup, litres, and explicit manufacturer serve where supplied;
- AFCD bread: grams and the Australian 40 g regular-slice standard serve; product slice/count only when backed by product or guideline metadata.

The repository contains no validated source for generic thin, regular and thick spread weights. The proposed 2.5 g / 5 g / 7 g thickness presets therefore remain unavailable. Their evidence gap is represented explicitly in the central portion-preset policy so values can be added later only with documented provenance.

Approximate practical measures may remain visible where older HEC serving policy already identifies them as approximate, but they are not classified as trusted Portion Presets.

## Nutrition safety

Identity and nutrition completeness are separate. HEC may identify a product and offer valid measures while still blocking nutrition calculation or Diary addition when nutrition is incomplete. Missing nutrient values are not zero, kcal/kJ integrity and conflict classifications are preserved, and no calories are invented.

## Audit scope

`scripts/audit_progressive_food_resolution.js` audits 50 AFCD reference concepts, 100 real Australian catalogue products, portion provenance across physical forms, the existing 500-query search benchmark and a 500-step resolution benchmark. The progressive resolver operates on the bounded candidate snapshot for the current concept/product family; it does not scan all 73,300 full product records on every question.
