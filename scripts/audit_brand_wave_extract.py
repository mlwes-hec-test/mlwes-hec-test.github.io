"""Read-only frozen OFF replay and full AU extraction; output stays outside SOURCE.

No network calls. Never rewrites the source catalogue or the frozen archive.
"""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
from import_open_food_facts_au import product_from

PIN = 'f72687ee8bc6522054fe69dbfda6b91902c16af1ec2e043cde27bc6c29ad8176'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    out = args.output.resolve()
    if out == root or root in out.parents:
        raise ValueError('Audit output must be outside source')
    out.mkdir(parents=True, exist_ok=True)
    with args.input.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    assert digest == PIN, 'Frozen raw hash mismatch'
    manifest = json.loads((root / 'data/open-food-facts-au/manifest.json').read_text('utf-8'))
    assert manifest['sourceSha256'].lower() == digest
    existing = {}
    for shard in manifest['productShards']:
        for record in json.loads((root / 'data/open-food-facts-au' / shard['path']).read_text('utf-8'))['products']:
            existing[record['barcode']] = record
    print(json.dumps({'verifiedRawSha256': digest, 'existingProducts': len(existing)}), flush=True)
    csv.field_size_limit(16 * 1024 * 1024)
    total = au = identical = 0
    malformed = []
    mismatches = []
    codes = set()
    fields = {'code', 'url', 'product_name', 'generic_name', 'brands', 'brands_tags',
              'stores', 'countries_tags', 'quantity', 'product_quantity', 'serving_size',
              'serving_quantity', 'categories', 'categories_tags', 'categories_en',
              'last_modified_datetime', 'last_modified_t', 'obsolete', 'nutrition_data_per',
              'nutrition_data_prepared_per', 'no_nutrition_data', 'states_tags', 'food_groups_tags',
              'pnns_groups_1', 'pnns_groups_2', 'main_category'}
    with gzip.open(args.input, 'rt', encoding='utf-8', errors='strict', newline='') as stream, (out / 'au-records.jsonl').open('w', encoding='utf-8', newline='\n') as dest:
        reader = csv.reader(stream, delimiter='\t')
        header = next(reader)
        for cells in reader:
            total += 1
            if len(cells) != len(header):
                malformed.append({'rawRecordNumber': total, 'fieldCount': len(cells), 'containsAustralia': any('en:australia' in c for c in cells)})
                continue
            row = dict(zip(header, cells))
            if 'en:australia' not in [t.strip() for t in row['countries_tags'].split(',')]:
                continue
            au += 1
            product = product_from(row)
            codes.add(product['barcode'])
            if product == existing.get(product['barcode']):
                identical += 1
            else:
                mismatches.append(product['barcode'])
            retained = {k: v for k, v in row.items() if k in fields or k.startswith('data_quality_') or k.endswith(('_100g', '_serving'))}
            dest.write(json.dumps({'rawRecordNumber': total, 'fields': retained}, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n')
    with (out / 'au-records.jsonl').open('rb') as stream:
        extraction_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    report = {'rawSha256': digest, 'rawBytes': args.input.stat().st_size,
              'sourceSnapshotDate': manifest['sourceSnapshotDate'], 'globalRecords': total,
              'australianRecords': au, 'distinctBarcodes': len(codes), 'replayedIdenticalProducts': identical,
              'projectionMismatches': mismatches, 'missingExistingCodes': sorted(set(existing) - codes),
              'malformedGlobalRows': malformed, 'gzipEofCrcVerified': True,
              'extractionSha256': extraction_hash, 'fields': sorted(retained)}
    (out / 'extraction-summary.json').write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps(report), flush=True)
    assert not mismatches and not report['missingExistingCodes']
    assert au == manifest['australianSourceRecords'] and total == manifest['globalRecordsScanned']


if __name__ == '__main__':
    main()
