"""Extract exact metro rows from saved Census files. No network or API key required."""
import csv
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/census'
STAMP = '2026-11-06T01:19:40Z'
TABLE_URL = 'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/'
DEFINITION_URL = 'https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx'
GEO_URL = 'https://www.census.gov/programs-surveys/acs/geography-acs/geography-boundaries-by-year/2024.html'
ANNOTATION_URL = 'https://www.census.gov/data/developers/data-sets/acs-1year/notes-on-acs-estimate-and-annotation-values.html'

def extract():
    manifest = []
    for file in sorted(SOURCE.iterdir()):
        if file.suffix not in ('.dat', '.xlsx'): continue
        manifest.append(dict(file=file.name, url=DEFINITION_URL if file.suffix == '.xlsx' else TABLE_URL + file.name,
                             sha256=hashlib.sha256(file.read_bytes()).hexdigest(), retrievedAt=STAMP))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(SOURCE / 'list1_2023.xlsx') as z:
        strings = [''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns)]
        rows = []
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:row', ns):
            rows.append([strings[int(c.find('m:v', ns).text)] if c.attrib.get('t') == 's' else c.findtext('m:v', '', ns) for c in row])
    markets = {}
    for code in ['12420', '41700']:
        geo = [r for r in rows if r[0] == code]
        assert geo and all(r[8] == 'Texas' and r[4] == 'Metropolitan Statistical Area' for r in geo)
        metrics = {}
        for name, table in [('population', 'B01003'), ('under18', 'B09001'), ('housing', 'B25001')]:
            filename = f'acsdt1y2024-{table.lower()}.dat'
            with (SOURCE / filename).open() as f:
                selected = [r for r in csv.DictReader(f, delimiter='|') if r['GEO_ID'] == '310M700US' + code]
            assert len(selected) == 1, f'Expected one full metro row for {code}'
            row = selected[0]
            estimate, moe = int(row[table + '_E001']), int(row[table + '_M001'])
            assert estimate >= 0 and (moe >= 0 or moe == -555555555), 'Unexpected Census annotation; review before import'
            metrics[name] = dict(estimate=estimate, marginOfError=moe if moe >= 0 else None,
                                 moeStatus='published' if moe >= 0 else 'controlled',
                                 variable=table + '_001E', moeVariable=table + '_001M',
                                 sourceUrl=TABLE_URL + filename, rawMarginOfError=moe)
        markets[code] = dict(metroName=geo[0][3], counties=[r[7].removesuffix(' County') for r in geo],
                             countyFips=[r[9] + r[10] for r in geo], definitionUrl=DEFINITION_URL,
                             definitionVintage='2023-07-21', definitionVerifiedAt=STAMP,
                             demographics=dict(year=2024, status='available', sourceUrl=TABLE_URL,
                             collectedAt=STAMP, geoId='310M700US' + code, confidenceLevel=90,
                             annotationUrl=ANNOTATION_URL, **metrics))
    return dict(retrievedAt=STAMP, geographyVintageSource=GEO_URL, files=manifest, markets=markets)

if __name__ == '__main__':
    (ROOT / 'data/market-context.json').write_text(json.dumps(extract(), indent=2) + '\n')
    print('Verified two metros, 13 counties, six ACS estimates and their MOE statuses.')
