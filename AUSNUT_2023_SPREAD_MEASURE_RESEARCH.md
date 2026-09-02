# AUSNUT 2023 Spread Measure Research

Version: HEC Alpha 0.6.33
Research date: 2 September 2026

## Source and reproducibility

HEC inspected the official Food Standards Australia New Zealand (FSANZ) [AUSNUT 2023 Food Measures page](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/food-measures), its linked `AUSNUT 2023 - Food measures.xlsx` workbook, and the linked `AUSNUT 2023 - About the food measures` methodology PDF.

- Workbook URL: <https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20Food%20measures.xlsx>
- Retrieved: 2 September 2026
- SHA-256: `58BEE1204610EFB72BB831DC7FB65ACC23DB540B51D056F83C6AC0CE84590475`
- Data sheet: `AUSNUT 2023`, rows 3–9819, 9,816 measure records
- Relevant fields: Public food key, Food name, Measure ID, Quantity, Descriptors 1–4, Gram amount and Volume

The workbook was inspected programmatically as a spreadsheet artifact. Searches covered margarine, table/oil spreads, butter, nut/peanut spreads, yeast/vegetable-extract spreads and other spreadable foods, then searched all matching measure descriptors for thin, light spread, regular, average, thick, teaspoon, tablespoon, sachet, packet, portion and serve variants. Existing HEC source and test files were also searched for those concepts.

FSANZ says its measure file contains 9,816 measures for 3,741 foods and records the derivation for each measure. The methodology explains that margarine-spread measures were estimated from a known volume and relevant density. FSANZ's copyright policy states that, unless otherwise noted, site material is available under CC BY 4.0 Australia except the FSANZ logo and third-party material. HEC copies only the few central conversion facts needed here, attributes FSANZ, retains source references, and does not redistribute the workbook.

## Results

| Physical family | AUSNUT records inspected | Consistent defensible measure | HEC decision |
|---|---:|---|---|
| Margarine / vegetable-oil table spread | 15 foods | 1 tablespoon (20 mL) = 19 g in all 15 | Central `tableSpread` tablespoon preset; retain existing HEC 5 g teaspoon |
| Nut spreads (peanut, almond, cashew, mixed nut/seed) | 13 applicable foods | 1 tablespoon (20 mL) = 24 g in every applicable food | Central `nutSpread` tablespoon preset |
| Yeast / vegetable-and-yeast extract spreads | 7 foods | 1 teaspoon (5 mL) = 6 g and 1 tablespoon (20 mL) = 24 g in every applicable food | Central `yeastSpread` teaspoon and tablespoon presets |
| Thin / regular / thick spread | Relevant spread records plus descriptor-wide search | No applicable thickness measure or reproducible physical relationship | **NOT YET VALIDATED**; presets remain disabled |
| Packet / sachet / single serve | Product-specific records | Margarine packets include 8.4 g; butter and yeast products use other values | Product-specific only; no global packet or sachet preset |

Table-spread source references are public food keys `F005309`, `F005310`, `F005312`, `F005323`, `F005345`, `F005350`, `F005359`, `F005362`, `F005369`, `F005370`, `F005373`, `F005395`, `F005402`, `F005403` and `F005404` (applicable tablespoon measure IDs `43446`–`43488` and `50117`–`50120`).

Nut-spread source references are public food keys `F006577`, `F006578`, `F006579`, `F009990`, `F009992`–`F009997`, `F010001`, `F010002`, `F010006` and `F010042` (applicable tablespoon measure IDs `46884`–`46911`).

Yeast-spread source references are public food keys `F008780`–`F008783`, `F008785`, `F010125` and `F010126` (applicable teaspoon/tablespoon measure IDs `49426`–`49448`).

## Implementation boundary

The conversions are defined once in `serving-foundation.js` and selected through a central physical-family applicability classifier. There are no Flora-, Meadow Lea-, Bega- or other brand-specific branches. Product metadata wins when it already supplies an explicit same-key measure. Manufacturer serving remains the packaged product default; centrally added household measures are additive choices and cannot replace it.

The three thickness labels remain represented as an explicit unavailable evidence gap. Diet Diary screenshots were treated only as UX comparison material and were not scraped or used as data evidence.
