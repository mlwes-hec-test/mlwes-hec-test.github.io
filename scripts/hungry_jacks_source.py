"""Hungry Jack's publication metadata, using the existing capture/PDF adapter.

This module never supplies nutrition constants or runtime search decisions.
Product pages complete only an exact, unique menu identity. Unmatched pages
remain coverage evidence, not a second consumer catalogue.
"""
import copy
import re
import unicodedata
import urllib.parse
from lxml import html

BASE = 'https://www.hungryjacks.com.au'
KEYS = {'ENERGY': 'energyKj', 'PROTEIN': 'protein', 'FAT': 'fat',
        'SAT FAT': 'satFat', 'CARBS': 'carbs', 'SUGARS': 'sugar', 'SODIUM': 'sodium'}


def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def identity_key(name):
    # Reordering the same complete words is allowed; no food/size/count/flavour
    # tokens are removed. Names alone do not resolve conflicting nutrition.
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return ' '.join(sorted(re.findall(r'[a-z0-9]+', name.lower().replace("'", ''))))


def menu_snapshot(capture):
    data, root_evidence = capture.get(BASE + '/menu/what-s-new')
    doc = html.fromstring(data.decode('utf-8'))
    categories = {}
    for anchor in doc.xpath('//a[@href]'):
        url = urllib.parse.urljoin(BASE, anchor.get('href')).split('#')[0]
        parts = urllib.parse.urlparse(url).path.strip('/').split('/')
        if url.startswith(BASE + '/menu/') and len(parts) == 2:
            categories.setdefault(url, clean(anchor.text_content()))
    if not 1 <= len(categories) <= 25:
        raise ValueError('Unexpected official menu category breadth')
    listings, category_rows = {}, []
    for url, name in categories.items():
        data, evidence = capture.get(url)
        doc = html.fromstring(data.decode('utf-8'))
        category_rows.append({'name': name, 'provenance': evidence})
        for anchor in doc.xpath('//a[@href]'):
            link = urllib.parse.urljoin(BASE, anchor.get('href')).split('#')[0]
            parts = urllib.parse.urlparse(link).path.strip('/').split('/')
            if link.startswith(BASE + '/menu/') and len(parts) == 3:
                link = urllib.parse.quote(link, safe=':/%?=&')
                listings.setdefault(link, []).append({'name': clean(anchor.text_content()),
                                                     'category': name, 'url': url})
    if not 1 <= len(listings) <= 220:
        raise ValueError('Unexpected official product page breadth')
    pages = []
    for url, appearances in sorted(listings.items()):
        data, evidence = capture.get(url)
        doc = html.fromstring(data.decode('utf-8'))
        titles = doc.xpath('//h2[contains(@class,"priority-2")]')
        if not titles:
            raise ValueError('Ambiguous official product title: ' + url)
        title = clean(titles[0].text_content()).replace('\u00ae', '').replace('\u2122', '')
        nutrients, raw = {}, {}
        for item in doc.xpath('//div[@class="nutrition-list-item-inner"]'):
            label = item.xpath('./div[@class="nutrition-list-label"]')
            if not label or clean(label[0].text_content()) not in KEYS:
                continue
            key = KEYS[clean(label[0].text_content())]
            value = clean(label[0].tail)
            raw[key] = value
            match = re.fullmatch(r'((?:\d+(?:\.\d+)?|\.\d+))\s*(?:kj|g|mg)', value, re.I)
            nutrients[key] = float(match[1]) if match else None
        body = clean(' '.join(x.text_content() for x in doc.xpath('//div[@class="nutrition-list"]')))
        basis = re.search(r'Per (small|medium|large) serve', body, re.I)
        pages.append({'name': title, 'servingSize': basis[1].title() if basis else None,
                      'nutritionPerServing': nutrients, 'nutrientEvidence': raw,
                      'appearances': appearances, 'provenance': evidence})
    return {'root': root_evidence, 'categories': category_rows, 'pages': pages}


def publication_categories(data, directory):
    doc = html.fromstring(data.decode('utf-8'))
    result = {}
    for anchor in doc.xpath('//a[@href]'):
        url = urllib.parse.urljoin(directory, anchor.get('href')).split('#')[0]
        if not url.endswith('.pdf') or not re.search(r'Nutritionals|Nutritional-Values', url, re.I):
            continue
        heading = anchor.xpath('preceding::h4[normalize-space()][1]')
        if not heading:
            raise ValueError('Nutrition publication lacks category: ' + url)
        category = re.sub(r"'([A-Z])", lambda m: "'" + m[1].lower(), clean(heading[0].text_content()).title())
        # The directory also links an older Cold Drinks revision beneath the
        # Jack'd Up heading; the named document still covers Cold Drinks.
        if 'Cold-Drinks-' in url:
            category = 'Cold Drinks'
        result[url] = category
    return result


def enrich(rows, snapshot, categories, history=()):
    rows = copy.deepcopy(rows)
    # A corrected display name must not churn a known canonical identity.
    # Match the old extraction at the same document/page and original first
    # description line, then preserve its ID only for a one-to-one correction.
    old_refs = {(r['provenance']['url'], r['provenance']['page'], r['name']): r['name'] for r in history}
    corrections, previous_names = {}, {}
    for row in rows:
        first_line = clean((row.get('sourceTable', {}).get('cells', [''])[0] or '').split('\n')[0])
        previous = old_refs.get((row['provenance']['url'], row['provenance']['page'], first_line))
        if previous:
            corrections.setdefault(previous, set()).add(row['name'])
            previous_names.setdefault(row['name'], set()).add(previous)
    for row in rows:
        previous = previous_names.get(row['name'], set())
        if len(previous) == 1:
            old_name = next(iter(previous))
            if len(corrections[old_name]) == 1 and old_name != row['name']:
                row['canonicalSourceRecordId'] = old_name
                row['identityContinuity'] = {'previousName': old_name, 'reason': 'same-publication-row-one-to-one-description-repair'}
    by_name = {r['name']: r for r in rows}
    for row in rows:
        # The two simultaneously linked publications use Drink/Soda for the
        # same fully specified Jack'd Up flavour. Require identical portion and
        # every supplied nutrient before assigning their shared source identity.
        counterpart = re.sub(r"^Jack[\u2019']d Up Drink ", 'Jack\u2019d Up Soda ', row['name'])
        other = by_name.get(counterpart)
        compatible = other and row['manufacturerServing'] == other['manufacturerServing'] and all(
            sum(row[basis].get(k) is not None and other[basis].get(k) is not None for k in KEYS.values()) >= 6
            and all(row[basis].get(k) is None or other[basis].get(k) is None or row[basis][k] == other[basis][k] for k in KEYS.values())
            for basis in ('nutritionPer100', 'nutritionPerServing'))
        if counterpart != row['name'] and compatible:
            row['canonicalSourceRecordId'] = other.get('canonicalSourceRecordId', counterpart)
            row['identityResolution'] = {'reason': 'publication-category-noun-with-identical-flavour-portion-and-nutrition',
                                         'other': other['provenance'], 'otherName': counterpart}
            row.setdefault('aliases', []).append(counterpart)
            other.setdefault('aliases', []).append(row['name'])
    names = {}
    for row in rows:
        names.setdefault(identity_key(row['name']), set()).add(row['name'])
    pages = {}
    for page in snapshot['pages']:
        key = identity_key(page['name'] + (' ' + page['servingSize'] if page['servingSize'] else ''))
        pages.setdefault(key, []).append(page)
    matched_pages = set()
    for row in rows:
        category = categories[row['provenance']['url']]
        row['category'] = category
        row['browseCategory'] = category
        row['publicationFamily'] = category
        row['family'] = re.sub(r'\s+(?:Small|Medium|Large)$', '', row['name'])
        row['currentState'] = 'uncertain'
        row['availabilityEvidence'] = {'nutritionDirectoryListed': True,
                                       'storeStatus': row['storeStatus'],
                                       'selectStoresOnly': row['selectStoresOnly'],
                                       'note': 'Nutrition publication listing does not prove current availability at every store.'}
        key = identity_key(row['name'])
        matching = pages.get(key, []) if len(names.get(key, [])) == 1 else []
        # Multiple official URL appearances can support one product only when
        # they publish the same complete nutrition and serving-size evidence.
        signatures = {repr((p['servingSize'], sorted(p['nutritionPerServing'].items()))) for p in matching}
        if matching:
            row['currentState'] = 'listed-at-retrieval'
            row['menuEvidence'] = matching
            row['aliases'] = sorted({p['name'] for p in matching} | {row['name']} | set(row.get('aliases', [])))
            matched_pages.update(p['provenance']['url'] for p in matching)
        if len(signatures) > 1:
            row.setdefault('evidenceConflicts', []).append({'code': 'official-product-page-conflict',
                'severity': 'material', 'resolution': 'unresolved', 'evidence': matching})
        elif matching and matching[0]['nutritionPerServing'].get('energyKj') is not None:
            page = matching[0]
            # Fill an absent whole-product serve, never component-derived sums.
            # Keep the original extracted row and both evidence references.
            if row['nutritionPerServing'].get('energyKj') is None and row['manufacturerServing'] is None:
                row['extractedNutritionPerServing'] = row['nutritionPerServing']
                row['nutritionPerServing'] = dict(page['nutritionPerServing'])
                row['nutritionPerServingProvenance'] = page['provenance']
                row['officialNaturalServing'] = True
                row['flags'] = [f for f in row['flags'] if f['code'] != 'source-menu-serving-unavailable']
            elif row['nutritionPerServing'].get('energyKj') is not None:
                differing = [k for k, v in page['nutritionPerServing'].items()
                             if v is not None and row['nutritionPerServing'].get(k) is not None
                             and abs(v-row['nutritionPerServing'][k]) > max(10 if k == 'energyKj' else 5 if k == 'sodium' else .3,
                                                                            max(v, row['nutritionPerServing'][k])*.03)]
                if differing:
                    row.setdefault('evidenceConflicts', []).append({'code': 'official-page-publication-conflict',
                        'severity': 'material', 'resolution': 'unresolved', 'fields': differing,
                        'evidence': {'page': page, 'pdf': row['provenance']}})
        sized = re.search(r'\b(Small|Medium|Large)$', row['name'])
        count = re.search(r'\b(\d+)\s*(?:x\s*)?(?:pack|pieces?)\b', row['name'], re.I)
        composite = category == 'Bundle Meals' or re.search(r'\b(?:Hunger Tamers?|Meal|Bundle|Make It)\b', row['name'], re.I)
        beverage = any(word in category for word in ('Drinks', 'Cafe')) and not re.search(r'Krispy|Cookie|Cake|Add On', row['name'], re.I)
        component = category == 'Extra Condiments' or 'Add On' in row['name']
        burger = not composite and not component and category in ('Whopper & Beef Burgers', 'Chicken Burgers', 'Grill Masters', 'Plant Based & Veggie')
        if burger:
            row['sourceConceptId'] = 'burger'
        if composite:
            # Configurable meals have no fixed default drink/side contract here.
            row['productSemantics'] = {'type': 'configurable-bundle'}
        elif count:
            row['productSemantics'] = {'type': 'counted-item', 'count': int(count[1]),
                                      'individualScaling': False, 'standardOrderLabel': row['name']}
            row.setdefault('aliases', []).append(re.sub(r'\bNugget\b', 'Nuggets', row['name']))
            row['choiceFamily'] = re.sub(r'\s*\b\d+\s*(?:x\s*)?(?:pack|pieces?)\b', '', row['name'], flags=re.I).strip()
            row['choiceOrder'] = int(count[1])
        else:
            row['productSemantics'] = {'type': 'component' if component else 'sized-variant' if sized else 'single-item'}
            if sized:
                row['productSemantics']['size'] = sized[1]
        row['foodForm'] = 'liquid' if beverage else 'solid-countable' if not component else 'weight'
        row['naturalUnit'] = 'drink' if beverage else 'burger' if burger else 'serve' if component else 'portion' if sized else 'item'
        row['naturalLabel'] = ('Drink' if beverage else 'Burger' if burger else 'Serve' if component or sized else 'Item') + (f" ({sized[1].lower()})" if sized else '')
    snapshot['matchedProductPages'] = len(matched_pages)
    snapshot['unmatchedProductPages'] = [p['provenance']['url'] for p in snapshot['pages'] if p['provenance']['url'] not in matched_pages]
    return rows
