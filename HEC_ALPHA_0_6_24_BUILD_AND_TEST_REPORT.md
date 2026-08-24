# Healthy Eating Companion — Alpha 0.6.24 Serving & Measure Foundation

## Objective
Complete the quantity/measure layer underneath the Alpha 0.6.23 universal search foundation so a resolved food proceeds through one common serving system rather than food-by-food code.

## Architecture
- `search-foundation.js`: query identity, food taxonomy and progressive refinement.
- `serving-foundation.js`: new pure serving/measure resolver.
- `alpha06.js`: integrates search, product sources, guided review and Diary entry.

The serving resolver uses the following precedence:
1. Explicit package serving/count metadata.
2. Existing source-specific units with a known conversion.
3. Australian Dietary Guidelines standard serves where the published conversion is exact enough to calculate.
4. Grams or mL where no defensible household conversion is available.

## Australian serve basis
Australian Government Eat for Health serve-size guidance was used for standard-serve measures. Examples implemented include 75 g vegetables, 1 cup raw leafy/salad vegetables, 150 g fruit, 40 g bread slice, 250 mL milk, 40 g/2 slices hard cheese, 200 g yoghurt, 65 g cooked red meat, 80 g cooked poultry, 100 g cooked fish, and 120 g/2 large eggs.

When the guidance itself gives a range rather than one exact conversion (notably 1/2 cup cooked grains at 75–120 g), the app displays a range hint and retains grams for exact calculation instead of inventing a midpoint.

Source: https://www.eatforhealth.gov.au/food-essentials/how-much-do-we-need-each-day/serve-sizes

## Product-serving correction
Open Food Facts mapping was hardened so a missing serving size does not become a fictional `Serve (100 g)`. An explicit 27 g serving remains a 27 g package serve; a product with only per-100-g nutrition remains a 100 g reference and defaults to grams. Explicit count text such as `2 slices (40 g)` yields a 20 g-per-slice unit.

## Automated validation
- JavaScript syntax passed for all active JS files.
- Complete 1,588-record AFCD serving pass: 0 invalid unit multipliers/default units.
- 761 AFCD records received at least one additional defensible measure in the pure resolver; 129 received a range hint rather than a fabricated exact conversion.
- AFCD variety extraction check:
  - Lettuce: Cos, Iceberg, Mignonette.
  - Apple: Bonza, Fuji, Golden Delicious, Granny Smith, Jonathan, Pink Lady, Red Delicious, Royal Gala and other generic skin records.
  - Orange: Navel, Valencia.
- Lettuce/Iceberg serving diagnostic: 1 cup raw leafy/salad vegetable = 75 g standard serve; grams retained.
- Granny Smith apple: medium item = 150 g Australian standard fruit serve; grams retained.
- Navel orange: medium item = 150 g Australian standard fruit serve; grams retained.
- San Remo-style 27 g mock package record: Package Serve (27 g), grams scale correctly, 99 Cal remains 99 Cal for 1 serve.
- No-serving Seasons Pride-style mock record: stays `Reference per 100 g`, defaults to grams; no fictional package serve.
- Counted Cheer-style mock record: `2 slices (40 g)` derives `Slice (20 g each)` while preserving package serve and grams.

## Environment limitation
The managed Chromium environment blocks local application navigation by administrator policy, so this build could not receive a full interactive browser DOM run here. Syntax, pure-engine, dataset-wide and exact product-basis tests were completed instead. Real iPhone/iPad interaction remains the founder-device validation step.
