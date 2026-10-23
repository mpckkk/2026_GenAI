#!/usr/bin/env python3
"""Extract factual marker associations from the published Methods paragraphs.

Usage: python3 scripts/import-soybean-reference.py path/to/downloaded-paper.html
Does not download, rewrite the paper, repair IDs or infer symbol mappings.
"""
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = {}
        self.current = None
    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.current = dict(attrs).get('id')
            if self.current:
                self.paragraphs[self.current] = ''
    def handle_data(self, value):
        if self.current:
            self.paragraphs[self.current] += value
    def handle_endtag(self, tag):
        if tag == 'p':
            self.current = None

raw = Path(sys.argv[1]).read_bytes()
parser = Paragraphs()
parser.feed(raw.decode())
base = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11369782/'
records = []
excluded = []
groups = {
    'root': ('p0230', '6-day-old roots', ['epidermal', 'cortical', 'endodermal', 'pericycle', 'xylem', 'phloem']),
    'nodule': ('p0235', '28 days after inoculation', ['inner/outer cortical', 'sclereid layer', 'vascular endodermis', 'vascular bundle', 'infected cell', 'uninfected cell']),
}
labels = {
    'epidermal': 'Epidermis', 'cortical': 'Cortex', 'endodermal': 'Endodermis',
    'pericycle': 'Pericycle', 'xylem': 'Xylem', 'phloem': 'Phloem',
    'inner/outer cortical': 'Inner/outer cortex', 'sclereid layer': 'Sclereid layer',
    'vascular endodermis': 'Vascular endodermis', 'vascular bundle': 'Vascular bundle',
    'infected cell': 'Infected cell', 'uninfected cell': 'Uninfected cell',
}
for tissue, (paragraph, stage, expected) in groups.items():
    text = parser.paragraphs[paragraph]
    matches = re.findall(r'the ([a-z/ ]+) marker genes were (.*?)(?=;| \(see)', text)
    if [label for label, _ in matches] != expected:
        raise ValueError('Source paragraph structure changed')
    for label, content in matches:
        for gene in re.findall(r'Glyma\.\d+G\d+', content):
            if not re.fullmatch(r'Glyma\.\d{2}G\d{6}', gene):
                excluded.append({'value': gene, 'paragraph': paragraph, 'reason': 'Malformed identifier in source; not corrected'})
                continue
            records.append({
                'id': f'{paragraph}:{label}:{gene}', 'geneId': gene,
                'cellType': labels[label], 'sourceLabel': label, 'tissue': tissue,
                'stage': stage, 'sourceUrl': base + '#' + paragraph,
                'method': 'Marker used for Molecular Cartography cell-type annotation',
            })
    for symbol in ['CYP93A1', 'G4DT']:
        if symbol in text:
            excluded.append({'value': symbol, 'paragraph': paragraph, 'reason': 'Symbol without explicit gene-ID mapping in this paragraph'})
if len(records) != 62 or len({r['geneId'] for r in records}) != 45:
    raise ValueError(f'Unexpected reference size: {len(records)} records, {len({r["geneId"] for r in records})} genes')
if not any('Glycine_max_v2.1.52' in p for p in parser.paragraphs.values()):
    raise ValueError('Expected transcriptome reference build missing')
result = {
    'version': 1,
    'source': {
        'id': 'soybean-root-nodule-cervantes-perez-2024', 'version': '2024.100984-mc-v1',
        'title': 'Soybean root and mature nodule marker reference',
        'citation': 'Cervantes-Pérez et al., Plant Communications (2024)',
        'doi': '10.1016/j.xplc.2024.100984', 'url': base,
        'section': 'Methods: Cell type annotation using M.C. (p0230, p0235)',
        'speciesId': 'glycine-max', 'genomeVersion': 'Glycine_max_v2.1.52',
        'geneIdNamespace': 'Glyma', 'tissues': ['root', 'nodule'],
        'retrievedAt': '2026-10-23', 'sourceSha256': hashlib.sha256(raw).hexdigest(),
        'articleLicense': 'CC BY-NC-ND 4.0; factual associations extracted, article text not redistributed',
        'coverage': 'Selected markers explicitly listed in two Methods paragraphs; not a complete atlas or validated classifier',
    },
    'records': records,
    'excluded': excluded,
}
out = Path('data/references/soybean-root-nodule-2024.json')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'event': 'reference.extracted', 'records': len(records), 'genes': len({r['geneId'] for r in records}), 'excluded': len(excluded), 'sha256': hashlib.sha256(out.read_bytes()).hexdigest()}))
