/* Narrow FSANZ fruit-measure excerpt; see scripts/extract_generic_food_measures.py. */
(function(global){
const data={
  "source": {
    "title": "AUSNUT 2023 Food measures",
    "publisher": "Food Standards Australia New Zealand",
    "url": "https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/food-measures",
    "workbookUrl": "https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20Food%20measures.xlsx?v=20250829",
    "retrievedDate": "2026-10-08",
    "sha256": "58bee1204610efb72bb831dc7fb65acc23db540b51d056f83c6ac0ce84590475",
    "licence": "CC BY 4.0 Australia; attribute FSANZ; third-party exclusions apply",
    "methodology": "Use the published gram amount for the same public food key and final edible form; no density, refuse or cooking factor inferred. Source workbook has no populated row-level derivation column; no claim that each row was directly weighed."
  },
  "references": {
    "F000098": [
      {
        "key": "largeFruit",
        "label": "Large apple",
        "grams": 239,
        "measureId": "44110",
        "sourceFoodName": "Apple, green skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000098; measure 44110"
      },
      {
        "key": "mediumFruit",
        "label": "Medium apple",
        "grams": 165.6,
        "measureId": "44111",
        "sourceFoodName": "Apple, green skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000098; measure 44111"
      },
      {
        "key": "smallFruit",
        "label": "Small apple",
        "grams": 156.4,
        "measureId": "44112",
        "sourceFoodName": "Apple, green skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000098; measure 44112"
      }
    ],
    "F000108": [
      {
        "key": "largeFruit",
        "label": "Large apple",
        "grams": 208,
        "measureId": "44129",
        "sourceFoodName": "Apple, red skin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000108; measure 44129"
      },
      {
        "key": "mediumFruit",
        "label": "Medium apple",
        "grams": 144,
        "measureId": "44130",
        "sourceFoodName": "Apple, red skin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000108; measure 44130"
      },
      {
        "key": "smallFruit",
        "label": "Small apple",
        "grams": 136,
        "measureId": "44131",
        "sourceFoodName": "Apple, red skin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000108; measure 44131"
      }
    ],
    "F000110": [
      {
        "key": "largeFruit",
        "label": "Large apple",
        "grams": 239,
        "measureId": "44122",
        "sourceFoodName": "Apple, red skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000110; measure 44122"
      },
      {
        "key": "mediumFruit",
        "label": "Medium apple",
        "grams": 165.6,
        "measureId": "44123",
        "sourceFoodName": "Apple, red skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000110; measure 44123"
      },
      {
        "key": "smallFruit",
        "label": "Small apple",
        "grams": 156.4,
        "measureId": "44124",
        "sourceFoodName": "Apple, red skin, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000110; measure 44124"
      }
    ],
    "F000262": [
      {
        "key": "largeFruit",
        "label": "Large banana",
        "grams": 145.6,
        "measureId": "44187",
        "sourceFoodName": "Banana, cavendish, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000262; measure 44187"
      },
      {
        "key": "mediumFruit",
        "label": "Medium banana",
        "grams": 127.4,
        "measureId": "44188",
        "sourceFoodName": "Banana, cavendish, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000262; measure 44188"
      },
      {
        "key": "smallFruit",
        "label": "Small banana",
        "grams": 71.5,
        "measureId": "44189",
        "sourceFoodName": "Banana, cavendish, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000262; measure 44189"
      }
    ],
    "F000267": [
      {
        "key": "item",
        "label": "banana",
        "grams": 67.6,
        "measureId": "44194",
        "sourceFoodName": "Banana, lady finger or sugar, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F000267; measure 44194"
      }
    ],
    "F005293": [
      {
        "key": "smallFruit",
        "label": "Small mandarin",
        "grams": 36.48,
        "measureId": "44331",
        "sourceFoodName": "Mandarin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F005293; measure 44331"
      },
      {
        "key": "mediumFruit",
        "label": "Medium mandarin",
        "grams": 53.96,
        "measureId": "44332",
        "sourceFoodName": "Mandarin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F005293; measure 44332"
      },
      {
        "key": "largeFruit",
        "label": "Large mandarin",
        "grams": 72.2,
        "measureId": "44333",
        "sourceFoodName": "Mandarin, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F005293; measure 44333"
      }
    ],
    "F006277": [
      {
        "key": "smallMediumFruit",
        "label": "Small/medium orange",
        "grams": 123.2,
        "measureId": "44390",
        "sourceFoodName": "Orange, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit",
          "mediumFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F006277; measure 44390"
      },
      {
        "key": "largeExtraLargeFruit",
        "label": "Large/extra large orange",
        "grams": 163.24,
        "measureId": "44391",
        "sourceFoodName": "Orange, peeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F006277; measure 44391"
      }
    ],
    "F006604": [
      {
        "key": "mediumLargeFruit",
        "label": "Medium/large pear",
        "grams": 190,
        "measureId": "44442",
        "sourceFoodName": "Pear, nashi, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "mediumFruit",
          "largeFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F006604; measure 44442"
      },
      {
        "key": "smallFruit",
        "label": "Small pear",
        "grams": 126,
        "measureId": "44443",
        "sourceFoodName": "Pear, nashi, unpeeled, raw",
        "massBasis": "edible portion",
        "physicalForm": "whole raw edible fruit",
        "approximate": true,
        "sizeAliases": [
          "smallFruit"
        ],
        "uncertainty": "Survey portion estimate; individual size and edible weight vary. No weight is transferred between varieties or peel states.",
        "sourceReference": "AUSNUT 2023 F006604; measure 44443"
      }
    ]
  }
};
global.HECGenericFoodMeasures=data;if(typeof module!=="undefined"&&module.exports)module.exports=data;
})(typeof window!=="undefined"?window:globalThis);
