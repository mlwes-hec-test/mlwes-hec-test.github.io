# Open Food Facts Australian catalogue data notice

HEC Alpha 0.6.33 includes a source-specific generated catalogue containing the complete eligible Australian subset of the Open Food Facts bulk CSV snapshot identified in `data/open-food-facts-au/manifest.json`.

Open Food Facts database data is made available under the Open Database License (ODbL); individual database contents are covered by the Database Contents License. Attribution: Open Food Facts contributors. See https://world.openfoodfacts.org/data for the source and current licence information.

The generated files remain an identifiable Open Food Facts database layer. HEC federates results at runtime and retains provenance; it does not blend the generated source files into AFCD, curated HEC, restaurant, saved-user or Diary data. Diary snapshots remain independent of catalogue refreshes.

No product images are included. The raw global dump is not committed. No retailer website data was scraped. Community-supplied identity and nutrition data may be incomplete or outdated and must not be presented as manufacturer verification.

Rebuild command (PowerShell, from the repository root):

```powershell
python scripts/import_open_food_facts_au.py --input C:\path\to\en.openfoodfacts.org.products.csv.gz --output data\open-food-facts-au --snapshot-date YYYY-MM-DD --source-sha256 SHA256
node scripts/audit_open_food_facts_au.js
```

The importer streams the compressed global dump, filters on explicit `en:australia` country metadata, generates stable `off:<barcode>` identities, and writes deterministic product, token-search, brand and barcode shards. Package quantity, nutrition basis, serving measure and consumption amount remain separate concepts.
