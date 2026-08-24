# Healthy Eating Companion — Alpha 0.6.27 Build & Test Report

## Purpose
Alpha 0.6.27 turns the recent founder testing into a shared **Food Intelligence** architecture. The work is not a list of patches for Apple, Banana, Egg, Sausage, Bread and Cheese; those foods are regression cases for reusable concept prediction, attribute extraction, source routing, conditional refinement, match validation and serving resolution.

## Architecture changes
- `search-foundation.js` version 0.6.27: predictive concept completion, query parsing, source policy, reusable facets and query-derived attribute seeds.
- `guided-branching.js` version 0.6.27: strict candidate compatibility, supplemental identification choices, soft physical-size attributes and final query/path validation.
- `serving-foundation.js` version 0.6.27: contextual measures for egg sizes, sausage forms, bread slices, cheese and package-derived serving counts while retaining grams/mL fallbacks.
- `alpha06.js`: one canonical live-search controller, stable product ordering, Australian chain-item routing, selective source-first UI and Quick Food Log method routing.

## Static / pure-logic regression checks completed
- JavaScript syntax validation across every local `.js` runtime file.
- 26 focused pure-logic regression assertions completed with 0 failures.
- Search parsing: `2 bananas` => Banana with quantity 2.
- Compound concepts: `banana bread` => Bread rather than Banana; `sausage roll` => Sausage Roll rather than generic Sausage.
- Partial prediction: `ap/app/appl` => Apple; `ba/ban/bana` => Banana; `che/chee` => Cheese.
- Query intent: `cheddar cheese`, `beef sausage`, `herb and garlic sausage` resolve to the correct reusable concept with supplied attributes available to pre-fill later facets.
- Selective source policy: Sausage offers early source routing; Apple does not.
- Egg facet order verified as species -> size -> part -> preparation -> added fat/oil.
- Egg match validation verified: Poached accepts a poached record and rejects a contradictory boiled record.
- Serving resolver verified for egg-size units, sausage forms, bread slices, hard cheese and grams fallback.
- All 1,588 AFCD Release 3 records remain bundled and existing storage keys remain unchanged.

## Important limitations / honesty checks
- Alpha 0.6.27 is a stronger universal architecture, not a claim that every food sold anywhere already has a perfect nutrition record. The engine still depends on trustworthy source coverage.
- Duck/Quail and other identification branches may stop if the current local data does not contain a safe nutrition reference. HEC must not fabricate one.
- "Added fat/oil" can require an additional oil/fat amount or a matching prepared-food reference; 0.6.27 remains conservative rather than silently inventing calories.
- Australian chain menus are still a founder-trial snapshot, not a complete live menu-ingestion service. Recognised but unsupported items are blocked from false diary entries.
- Quick Food Log now has the correct four-method architecture. Full multi-food conversational meal parsing is intentionally deferred until the canonical search engine is proven stable.

## Deployment
Service-worker cache is refreshed to `healthy-eating-companion-alpha-0-6-27-v1`. Runtime scripts and manifest use the 0.6.27 cache-busting query string.
