"""Reproducible, bounded public-source capture and factual nutrition adapters.

Run with the bundled Python (lxml and pdfplumber). --refresh retrieves the
published source directories; without it, every input must exist in the capture
manifest. Raw HTML/PDF captures stay outside the repository. Only extracted
composition facts, source references, hashes and uncertainty are exported.
"""
import argparse
import datetime
import hashlib
import io
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

from lxml import html
import pdfplumber

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIRECTORIES = {
    'goodman-fielder-au': 'https://www.gffoodservice.com.au/brand/meadowlea/',
    'mccain-au': 'https://www.mccain.com.au/products/categories/potato/',
    'hungry-jacks-au': 'https://www.hungryjacks.com.au/nutrition-info',
}
NUTRIENTS = {'energy': 'energyKj', 'energy (kjo)': 'energyKj', 'protein': 'protein',
             'carbohydrate': 'carbs', 'carbs': 'carbs', 'sugars': 'sugar', '- sugars': 'sugar',
             'fat, total': 'fat', 'fat (total)': 'fat', '- saturated': 'satFat',
             'fat (sat)': 'satFat', 'fibre': 'fibre', 'sodium': 'sodium'}


def text(node):
    return re.sub(r'\s+', ' ', node.text_content() if hasattr(node, 'text_content') else str(node or '')).strip()


def number(value):
    value = text(value).replace(',', '')
    if re.search(r'[<>≤≥]', value):
        return None
    match = re.fullmatch(r'(-?\d+(?:\.\d+)?)\s*(?:kJ|Cal|g|mg)?', value, re.I)
    return float(match[1]) if match else None


def mass(value):
    match = re.search(r'(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b', text(value), re.I)
    if not match:
        return None
    unit = match[2].lower()
    return {'amount': float(match[1]) * (1000 if unit in ('kg', 'l') else 1),
            'unit': 'mL' if unit in ('ml', 'l') else 'g', 'text': text(value)}


def facts(cells):
    values, evidence = {}, {}
    for label, value in cells:
        key = NUTRIENTS.get(text(label).lower())
        if not key:
            continue
        raw = text(value)
        evidence[key] = raw
        if key == 'energyKj':
            match = re.search(r'(\d+(?:\.\d+)?)\s*kJ', raw, re.I)
            values[key] = float(match[1]) if match else None
        else:
            values[key] = number(raw)
    return values, evidence


class Capture:
    def __init__(self, directory, refresh=False):
        self.directory = pathlib.Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.manifest_file = self.directory / 'capture-manifest.json'
        self.manifest = json.loads(self.manifest_file.read_text()) if self.manifest_file.exists() else {}
        self.refresh = refresh
        self.used = {}

    def get(self, url):
        if url in self.used:
            meta = self.used[url]
        elif self.refresh:
            request = urllib.request.Request(url, headers={'User-Agent': 'HEC-Australian-Catalogue-Research/1.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                if urllib.parse.urlparse(response.url).hostname != urllib.parse.urlparse(url).hostname:
                    raise ValueError('Unexpected source-host redirect: ' + response.url)
                data = response.read(8_000_001)
                if len(data) > 8_000_000:
                    raise ValueError('Capture exceeds bounded source size')
            digest = hashlib.sha256(data).hexdigest()
            filename = digest + ('.pdf' if url.lower().endswith('.pdf') else '.html')
            (self.directory / filename).write_bytes(data)
            meta = {'url': url, 'sha256': digest, 'file': filename,
                    'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
            self.manifest[url] = meta
            self.manifest_file.write_text(json.dumps(self.manifest, indent=2, sort_keys=True))
            time.sleep(.15)
        else:
            meta = self.manifest[url]
        data = (self.directory / meta['file']).read_bytes()
        if hashlib.sha256(data).hexdigest() != meta['sha256']:
            raise ValueError('Capture hash mismatch: ' + url)
        self.used[url] = meta
        return data, {k: v for k, v in meta.items() if k != 'file'}


def base_record(source, url, evidence, name, category):
    return {'sourceId': source, 'sourceRecordId': urllib.parse.urlparse(url).path.strip('/'),
            'name': name, 'category': category, 'market': 'AU', 'currentState': 'unknown',
            'provenance': evidence, 'flags': [], 'barcode': None, 'pack': None,
            'manufacturerServing': None, 'servingsPerPack': None,
            'nutritionPer100': {}, 'nutritionPerServing': {}, 'nutrientEvidence': {}}


def goodman(data, url, evidence):
    doc = html.fromstring(data)
    title = doc.xpath('//h1')
    if not title:
        raise ValueError('Missing product title')
    row = base_record('goodman-fielder-au', url, evidence, text(title[0]), 'Table Spreads')
    row['brand'] = 'MeadowLea'
    row['currentState'] = 'listed-at-retrieval'
    whole = text(doc)
    serving = re.search(r'Serving Size:\s*(\d+(?:\.\d+)?\s*(?:g|ml))', whole, re.I)
    count = re.search(r'Servings Per Pack:\s*(\d+(?:\.\d+)?)', whole, re.I)
    row['manufacturerServing'] = mass(serving[1]) if serving else None
    row['servingsPerPack'] = float(count[1]) if count else None
    per_serve, per_100 = [], []
    for tr in doc.xpath('//tr[@data-nutri-info]'):
        cells = tr.xpath('./td')
        if len(cells) == 3:
            per_serve.append((text(cells[0]), text(cells[1])))
            per_100.append((text(cells[0]), text(cells[2])))
    row['nutritionPerServing'], row['nutrientEvidence']['perServing'] = facts(per_serve)
    row['nutritionPer100'], row['nutrientEvidence']['per100'] = facts(per_100)
    for tr in doc.xpath('//tr'):
        cells = tr.xpath('./td|./th')
        if len(cells) != 2:
            continue
        label, value = map(text, cells)
        if label == 'Weight':
            row['pack'] = mass(value)
        elif label in ('EAN', 'TUN', 'Product Code'):
            row.setdefault('sourceIdentifiers', {})[label] = value
    identifiers = row.get('sourceIdentifiers', {})
    ean = identifiers.get('EAN', '')
    if ean.isdigit() and len(ean) in (8, 12, 13):
        row['barcode'] = ean
    elif ean:
        row['flags'].append({'code': 'barcode-pack-level-unresolved', 'rawEAN': ean, 'rawTUN': identifiers.get('TUN')})
    if not row['pack']:
        row['pack'] = mass(row['name'])
    if not row['nutritionPer100']:
        raise ValueError('No supported nutrition table: ' + url)
    row['foodForm'] = 'spread' if re.search(r'spread|margarine', row['name'], re.I) else None
    row['measureProfile'] = 'tableSpread' if row['foodForm'] == 'spread' else None
    return [row]


def mccain(data, url, evidence):
    doc = html.fromstring(data)
    title = doc.xpath('//h1')
    if not title:
        raise ValueError('Missing product title')
    row = base_record('mccain-au', url, evidence, text(title[0]), 'Frozen potato products')
    row['brand'] = 'McCain'
    row['currentState'] = 'listed-at-retrieval'
    row['pack'] = mass(row['name'])
    row['family'] = urllib.parse.urlparse(url).path.strip('/').split('/')[-2]
    whole = text(doc)
    serving = re.search(r'Serving size\s*(\d+(?:\.\d+)?\s*(?:g|ml))', whole, re.I)
    count = re.search(r'Serving per package\s*(\d+(?:\.\d+)?)', whole, re.I)
    row['manufacturerServing'] = mass(serving[1]) if serving else None
    row['servingsPerPack'] = float(count[1]) if count else None
    tables = doc.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " serving-table-holder ")]')
    for table in tables:
        heading = text(table.xpath('./div[@class="text"]')[0])
        cells = [(text(c.xpath('./div[@class="title"]')[0]), text(c.xpath('./div[@class="value"]')[0]))
                 for c in table.xpath('.//div[@class="serving-cell"]')]
        values, raw = facts(cells)
        key = 'per100' if '100g' in heading else 'perServing'
        row['nutritionPer100' if key == 'per100' else 'nutritionPerServing'] = values
        row['nutrientEvidence'][key] = raw
    if not row['nutritionPer100']:
        raise ValueError('No supported nutrition table: ' + url)
    return [row]


def restaurant_pdf(data, url, evidence):
    rows = []
    keys = ['energyKj', 'protein', 'fat', 'satFat', 'carbs', 'sugar', 'sodium']
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            printed = re.search(r'Date Printed:\s*(.+)', page.extract_text() or '')
            published = None
            if printed:
                for date_format in ('%d %b %Y', '%d %B %Y'):
                    try:
                        published = datetime.datetime.strptime(printed[1].replace('Sept ', 'Sep '), date_format).date().isoformat()
                        break
                    except ValueError:
                        pass
            for table in page.extract_tables():
                header = [text(value) for value in table[0]]
                if len(header) not in (19, 20) or header[0] != 'Description' or not any('Serving Size' in value for value in header):
                    continue
                shift = 1 if len(header) == 20 else 0
                for cells in table:
                    if len(cells) != len(header) or not cells[2 + shift] or cells[0] == 'Description':
                        continue
                    # Some reports put component rows in the same table cell.
                    # The first line is the menu product; components are not a
                    # licence to reconstruct a missing menu serving.
                    cells = [(value or '').split('\n')[0] for value in cells]
                    name = text(cells[0])
                    if not name:
                        continue
                    row = base_record('hungry-jacks-au', url, {**evidence, 'page': page_number, 'publishedDate': published}, name, 'Restaurant menu')
                    row['brand'] = "Hungry Jack's Australia"
                    row['sourceRecordId'] = name
                    serving = number(cells[4 + shift])
                    row['manufacturerServing'] = {'amount': serving, 'unit': 'g', 'text': text(cells[4 + shift]) + ' g'} if serving else None
                    row['storeStatus'] = text(cells[1 + shift])
                    row['selectStoresOnly'] = text(cells[2 + shift])
                    row['currentState'] = 'listed-at-retrieval'
                    row['family'] = pathlib.PurePosixPath(urllib.parse.urlparse(url).path).stem
                    for offset, key in enumerate(keys):
                        a, b = text(cells[5 + shift + 2 * offset]), text(cells[6 + shift + 2 * offset])
                        row['nutritionPer100'][key] = number(a)
                        row['nutritionPerServing'][key] = number(b)
                        row['nutrientEvidence'].setdefault('per100', {})[key] = a
                        row['nutrientEvidence'].setdefault('perServing', {})[key] = b
                    if '\ufffd' in name:
                        row['flags'].append({'code': 'source-text-encoding-uncertain'})
                    if not serving:
                        row['flags'].append({'code': 'source-menu-serving-unavailable'})
                    rows.append(row)
    if not rows:
        raise ValueError('No supported nutrition-table headers: ' + url)
    return rows


ADAPTERS = {'goodman-fielder-au': goodman, 'mccain-au': mccain, 'hungry-jacks-au': restaurant_pdf}


def discover(source, data, directory):
    doc = html.fromstring(data)
    urls = set()
    for anchor in doc.xpath('//a[@href]'):
        url = urllib.parse.urljoin(directory, anchor.get('href')).split('#')[0]
        if urllib.parse.urlparse(url).hostname != urllib.parse.urlparse(directory).hostname:
            continue
        path = urllib.parse.urlparse(url).path
        if source == 'goodman-fielder-au' and path.startswith('/product/'):
            urls.add(url)
        elif source == 'mccain-au' and len(path.strip('/').split('/')) == 5 and path.startswith('/products/categories/potato/'):
            urls.add(url)
        elif source == 'hungry-jacks-au' and path.lower().endswith('.pdf') and re.search(r'Nutritionals|Nutritional-Values', path, re.I):
            urls.add(url)
    if not urls or len(urls) > 100:
        raise ValueError('Unexpected directory breadth: ' + source)
    return sorted(urls)


def run(args):
    capture = Capture(args.capture_directory, args.refresh)
    result = {'schemaVersion': 1, 'builder': 'scripts/ingest_australian_catalogues.py', 'sources': [], 'records': [], 'gaps': []}
    for source, directory in DIRECTORIES.items():
        data, directory_evidence = capture.get(directory)
        urls = discover(source, data, directory)
        result['sources'].append({'id': source, 'directory': directory, 'sourceType': 'official-au-restaurant' if source == 'hungry-jacks-au' else 'official-au-manufacturer', 'market': 'AU', 'discovery': directory_evidence, 'discoveredPages': len(urls)})
        for url in urls:
            try:
                data, evidence = capture.get(url)
                rows = ADAPTERS[source](data, url, evidence)
                result['records'].extend(rows)
                print(json.dumps({'source': source, 'url': url, 'rows': len(rows)}), flush=True)
            except (ValueError, KeyError, OSError) as error:
                result['gaps'].append({'source': source, 'url': url, 'reason': str(error)})
                print(json.dumps({'gap': url, 'reason': str(error)}), flush=True)
    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'rawRows': len(result['records']), 'gaps': len(result['gaps'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture-directory', required=True)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--output', default=str(ROOT / 'data/australian-catalogue/supplemental.json'))
    run(parser.parse_args())
