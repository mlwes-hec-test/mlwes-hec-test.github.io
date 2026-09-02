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

The interface shows exactly one active question. A choice advances immediately; one-value and already-answered distinctions are skipped. Earlier answers remain in a compact, horizontally bounded summary. Back edits the preceding decision, the review screen offers separate food/measure/amount edits, and Cancel discards the active session. Card positioning happens only after a real stage transition so focus, caret and the visual viewport are not continuously disturbed.

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

## Controlled Portion Vocabulary

The central vocabulary defines stable measure IDs, display and singular/plural labels, aliases, physical family, display priority and whether ordinary fractions make sense. Current IDs cover `g`, `kg`, `mL`, `L`, `tsp`, `tbsp`, `cup`, manufacturer `serve`, `portion`, `item`, `piece`, `biscuit`, `cracker`, `bar`, `sachet`, `packet`, `roll`, `burger`, `slice`, `regularSlice` and `thickSlice`. Source records may contribute another named measure, but it is normalized into the same measure object and must carry a positive conversion and provenance.

The vocabulary is shared by typed, voice, barcode, generic and branded paths. Aliases such as grams/gram/g, millilitres/ml/mL, servings/serve and slices/slice resolve to the same stable IDs. Parsing therefore does not create a second voice-only portion engine.

## Physical-form profiles

Each selected identity maps centrally to one of these profiles:

- `spread`: household, manufacturer/countable and weight measures; safe fallback `g`;
- `liquid`: household, manufacturer/countable and volume measures; safe fallback `mL`;
- `sliced`: slice, manufacturer/countable and weight measures; safe fallback `g`;
- `countable`: natural count, manufacturer and weight measures; safe fallback `item`;
- `packaged-item`: natural count, manufacturer, weight or volume measures; safe fallback `serve`;
- `weight`: manufacturer/countable and weight measures; safe fallback `g`.

Natural kinds include biscuit, cracker, bar, sachet, packet, roll, burger, bread slice, generic slice, item/piece and packaged single serving. Product-specific servings are additive inputs to these profiles, not separate product engines. Incompatible families are removed centrally: liquids do not acquire spread measures, and spreads do not acquire volume/cup measures merely because a label contains a suggestive word.

Every runtime measure object includes its stable ID and labels, physical family, multiplier, conversion-to-base quantity and basis, applicability, source, source type, provenance class, confidence and display priority. The measure is chosen before amount. Amount starts blank, must be positive, accepts decimals and meaningful fractions, and is rendered with correct singular/plural wording plus a clean base equivalent where available.

## Source and fallback hierarchy

Measure evidence is accepted in this order:

1. explicit manufacturer/package serving or count metadata;
2. an existing source-specific conversion;
3. an authoritative Australian reference or standard serve;
4. a reviewed HEC physical-form conversion;
5. an exact metric conversion and conservative `g`/`mL` fallback.

Household measures are withheld when none of those sources supplies a defensible conversion. A plausible name, competitor UI convention or package-size phrase is not enough. Unknown forms safely retain only source-backed measures or a metric fallback supported by the nutrition basis.

Current reviewed examples:

- spreads: arbitrary grams and the existing reviewed `1 teaspoon = 5 g`; explicit manufacturer serve where supplied;
- liquid milk: arbitrary mL, 250 mL metric cup, litres, and explicit manufacturer serve where supplied;
- AFCD bread: grams and the Australian 40 g regular-slice standard serve; product slice/count only when backed by product or guideline metadata.

The repository contains no validated source for generic thin, regular and thick spread weights. **NOT YET VALIDATED:** the proposed 2.5 g / 5 g / 7 g thickness presets therefore remain unavailable. Their evidence gap is represented explicitly in the central portion-preset policy so values can be added later once, for the spread form, only with documented provenance.

Approximate practical measures may remain visible where older HEC serving policy already identifies them as approximate, but they are not classified as trusted Portion Presets.

## Nutrition safety

Identity and nutrition completeness are separate. HEC may identify a product and offer valid measures while still blocking nutrition calculation or Diary addition when nutrition is incomplete. Missing nutrient values are not zero, kcal/kJ integrity and conflict classifications are preserved, and no calories are invented.

## Audit scope

`scripts/audit_progressive_food_resolution.js` audits 50 AFCD reference concepts, 100 real Australian branded products, a 200-product portion mix (including 25 spreads, 25 liquids and 25 sliced/countable products), 20 deliberately unmentioned foods, and 100 deterministic products drawn from distinct catalogue shards. It also prints the controlled vocabulary and runs the existing 500-query search benchmark, a 500-step resolution benchmark and a 500-profile portion benchmark. The progressive resolver operates on the bounded candidate snapshot for the current concept/product family; it does not scan all 73,300 full product records on every question.
