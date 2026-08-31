#!/usr/bin/env python3
"""Stream the official Open Food Facts CSV dump into deterministic AU PWA shards."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import re
import shutil
from collections import defaultdict
from datetime import date
from pathlib import Path

SCHEMA_VERSION = 1
MAX_PRODUCTS_PER_SHARD = 900
TOKEN_RE = re.compile(r"[a-z0-9]+")
NUTRIENTS = {
    "energyKj": "energy-kj_100g", "calories": "energy-kcal_100g",
    "protein": "proteins_100g", "carbs": "carbohydrates_100g",
    "sugars": "sugars_100g", "fat": "fat_100g",
    "saturatedFat": "saturated-fat_100g", "fibre": "fiber_100g",
    "sodium": "sodium_100g", "salt": "salt_100g",
}
STOP_TOKENS = {"a", "an", "and", "au", "en", "for", "in", "of", "or", "the", "to", "with"}


def normalise(value: str) -> str:
    return " ".join(TOKEN_RE.findall((value or "").lower().replace("&", " and ")))


def brand_key(value: str) -> str:
    return normalise(value).replace(" ", "")


def number(value: str):
    try:
        parsed = float(str(value).strip())
        return int(parsed) if parsed.is_integer() else round(parsed, 6)
    except (TypeError, ValueError):
        return None


def valid_gtin(code: str) -> bool:
    if not code.isdigit() or len(code) not in (8, 12, 13, 14):
        return False
    digits = [int(x) for x in code]
    total = sum(x * (3 if (len(digits) - i) % 2 == 0 else 1) for i, x in enumerate(digits[:-1]))
    return (10 - total % 10) % 10 == digits[-1]


def tokens_for(record: dict) -> set[str]:
    values = [record["name"], record["brand"], record["genericName"], *record["categories"]]
    tokens = {token for token in TOKEN_RE.findall(normalise(" ".join(values))) if len(token) > 1 and token not in STOP_TOKENS}
    if record["brandKey"]:
        tokens.add(record["brandKey"])
    return tokens


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode("utf-8")


def write_json(path: Path, value) -> int:
    data = json_bytes(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return len(data)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def product_from(row: dict) -> dict:
    code = row["code"].strip()
    name = (row.get("product_name") or row.get("generic_name") or "").strip()
    brand = (row.get("brands") or "").split(",")[0].strip()
    nutrients = {key: number(row.get(column, "")) for key, column in NUTRIENTS.items()}
    nutrients = {key: value for key, value in nutrients.items() if value is not None}
    completeness = "complete" if "calories" in nutrients or "energyKj" in nutrients else ("partial" if nutrients else "identity-only")
    categories = [x.strip() for x in (row.get("categories_en") or row.get("categories") or "").split(",") if x.strip()][:12]
    countries = [x.strip() for x in (row.get("countries_tags") or "").split(",") if x.strip()]
    return {
        "id": f"off:{code}", "sourceId": f"off:{code}", "barcode": code,
        "name": name, "brand": brand, "brandKey": brand_key(brand),
        "genericName": (row.get("generic_name") or "").strip(),
        "quantity": (row.get("quantity") or "").strip(),
        "countries": countries, "categories": categories,
        "servingSize": (row.get("serving_size") or "").strip(),
        "servingQuantity": number(row.get("serving_quantity", "")),
        "nutritionBasis": "per-100g-off-csv", "nutrients": nutrients,
        "nutritionCompleteness": completeness,
        "lastModified": (row.get("last_modified_datetime") or row.get("last_modified_t") or "").strip(),
        "source": "Open Food Facts", "sourceScope": "Australia",
        "sourceUrl": (row.get("url") or "").strip(),
        "provenanceClass": "australian-external-catalogue",
        "recordType": "external-catalogue", "market": "AU",
    }


def product_sort(record: dict):
    return (record["brandKey"], normalise(record["name"]), record["quantity"], record["barcode"])


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", default=Path("data/open-food-facts-au"), type=Path)
    parser.add_argument("--snapshot-date", default=str(date.today()))
    parser.add_argument("--source-url", default="https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz")
    parser.add_argument("--source-sha256", default="")
    parser.add_argument("--min-records", type=int, default=40000)
    return parser.parse_args()


def main():
    args = parse_args()
    source_hash = args.source_sha256.upper() or file_sha256(args.input)
    csv.field_size_limit(16 * 1024 * 1024)
    total = australian = duplicate_rows = 0
    products_by_code = {}
    with gzip.open(args.input, "rt", encoding="utf-8", errors="replace", newline="") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            total += 1
            tags = {x.strip().lower() for x in (row.get("countries_tags") or "").split(",")}
            if "en:australia" not in tags:
                continue
            australian += 1
            record = product_from(row)
            previous = products_by_code.get(record["barcode"])
            if previous:
                duplicate_rows += 1
                if (record["nutritionCompleteness"], record["lastModified"]) <= (previous["nutritionCompleteness"], previous["lastModified"]):
                    continue
            products_by_code[record["barcode"]] = record
    if australian < args.min_records:
        raise SystemExit(f"Australian source count {australian} is below required {args.min_records}")

    products = sorted(products_by_code.values(), key=product_sort)
    output = args.output.resolve()
    if output.name != "open-food-facts-au" or output == Path(output.anchor):
        raise SystemExit(f"Refusing to replace unsafe output path: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    groups = defaultdict(list)
    for product in products:
        key = (product["brandKey"] or normalise(product["name"]).replace(" ", "") or "unknown")[:2].ljust(2, "_")
        groups[key].append(product)

    refs = {}
    product_files = []
    for group_key in sorted(groups):
        members = groups[group_key]
        for part, start in enumerate(range(0, len(members), MAX_PRODUCTS_PER_SHARD)):
            shard = members[start:start + MAX_PRODUCTS_PER_SHARD]
            shard_key = f"{group_key}-{part:02d}"
            relative = f"products/{shard_key}.json"
            size = write_json(output / relative, {"schema": SCHEMA_VERSION, "products": shard})
            product_files.append({"path": relative, "products": len(shard), "bytes": size})
            for index, product in enumerate(shard):
                refs[product["barcode"]] = f"{shard_key}:{index}"

    postings = defaultdict(lambda: defaultdict(list))
    brands = defaultdict(lambda: {"name": "", "refs": []})
    barcode_files = defaultdict(dict)
    for product in products:
        ref = refs[product["barcode"]]
        quality = 2 if product["nutritionCompleteness"] == "complete" else (1 if product["nutritionCompleteness"] == "partial" else 0)
        name_tokens = set(TOKEN_RE.findall(normalise(product["name"])))
        brand_tokens = set(TOKEN_RE.findall(normalise(product["brand"])))
        for token in tokens_for(product):
            mask = (4 if token in brand_tokens or token == product["brandKey"] else 0) | (2 if token in name_tokens else 0) | 1
            postings[token[:2].ljust(2, "_")][token].append([ref, mask, quality])
        if product["brandKey"]:
            brands[product["brandKey"]]["name"] = product["brand"]
            brands[product["brandKey"]]["refs"].append(ref)
        barcode_files[product["barcode"][:2].ljust(2, "_")][product["barcode"]] = ref

    index_files = []
    for prefix in sorted(postings):
        values = postings[prefix]
        for token in values:
            values[token].sort(key=lambda item: (-item[1], -item[2], item[0]))
        relative = f"search/{prefix}.json"
        index_files.append({"path": relative, "tokens": len(values), "bytes": write_json(output / relative, {"schema": SCHEMA_VERSION, "tokens": values})})
    brand_files = []
    brand_groups = defaultdict(dict)
    for key, value in sorted(brands.items()):
        value["refs"].sort()
        brand_groups[key[:2].ljust(2, "_")][key] = value
    for prefix, values in sorted(brand_groups.items()):
        relative = f"brands/{prefix}.json"
        brand_files.append({"path": relative, "brands": len(values), "bytes": write_json(output / relative, {"schema": SCHEMA_VERSION, "brands": values})})
    barcode_manifest = []
    for prefix, values in sorted(barcode_files.items()):
        relative = f"barcodes/{prefix}.json"
        barcode_manifest.append({"path": relative, "barcodes": len(values), "bytes": write_json(output / relative, {"schema": SCHEMA_VERSION, "barcodes": values})})

    complete = sum(x["nutritionCompleteness"] == "complete" for x in products)
    partial = sum(x["nutritionCompleteness"] == "partial" for x in products)
    searchable = sum(bool(x["name"]) for x in products)
    generated = product_files + index_files + brand_files + barcode_manifest
    query_counts = {}
    for query in ("flora", "meadowlea", "vegemite", "kelloggs", "arnotts", "milk", "cereal", "peanut butter", "dim sim", "mini dim sim"):
        query_tokens = TOKEN_RE.findall(normalise(query))
        candidate_sets = []
        for token in query_tokens:
            candidate_sets.append({item[0] for item in postings[token[:2].ljust(2, "_")].get(token, [])})
        query_counts[query] = len(set.intersection(*candidate_sets)) if candidate_sets else 0
    manifest = {
        "schemaVersion": SCHEMA_VERSION, "source": "Open Food Facts", "scope": "Australia",
        "sourceUrl": args.source_url, "sourceSnapshotDate": args.snapshot_date,
        "sourceSha256": source_hash, "generationTimestamp": f"{args.snapshot_date}T00:00:00Z",
        "globalRecordsScanned": total, "australianSourceRecords": australian,
        "importedProducts": len(products), "searchableProducts": searchable,
        "completeNutrition": complete, "partialNutrition": partial,
        "identityOnly": len(products) - complete - partial,
        "uniqueBrands": len(brands), "validGtins": sum(valid_gtin(x["barcode"]) for x in products),
        "numericBarcodes": len(products), "duplicateSourceRows": duplicate_rows,
        "productShards": product_files, "searchShards": index_files,
        "brandShards": brand_files, "barcodeShards": barcode_manifest,
        "generatedShardCount": len(generated), "generatedBytes": sum(x["bytes"] for x in generated),
        "largestShardBytes": max(x["bytes"] for x in generated),
        "averageShardBytes": round(sum(x["bytes"] for x in generated) / len(generated)),
        "queryCounts": query_counts,
        "licence": {"database": "Open Database License (ODbL)", "contents": "Database Contents License", "attribution": "Open Food Facts contributors"},
        "imagesIncluded": False, "rawDumpIncluded": False,
    }
    write_json(output / "manifest.json", manifest)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
