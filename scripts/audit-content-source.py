"""Read-only check against the supplied master. Uses only Python's standard library."""
import argparse
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/design/Pokefolio_All_Personality_Answered_Question_Trees_Final.docx'
PROJECTS = {
    'Acko Clinic': 'ACKO_CLINIC', 'Karsh': 'KARSH', 'NomNom Planner': 'NOMNOM',
    'Pokefolio': 'POKEFOLIO', 'PDF-QA': 'PDF_QA', 'WeatherPi': 'WEATHER_PI',
    'PortScanner': 'PORT_SCANNER', 'Parallel-Distributed Computing': 'PARALLEL_DISTRIBUTED_COMPUTING',
    'Arise': 'ARISE', 'Pokemon Elo Rating': 'POKEMON_ELO_RATING', 'Vanix': 'VANIX', 'ChatRoomApp': 'CHATROOM_APP',
}
# Technical status updates verified against frozen P7/P8/P9, documented in P10-source-review.md.
CURRENT_STATUS = {
    'pokefolio-recruiter-d1-0', 'pokefolio-recruiter-d3-104',
    'pokefolio-friend-d1-1', 'pokefolio-friend-d2-10', 'pokefolio-friend-d3-101',
    'pokefolio-friend-d2-12', 'pokefolio-friend-d2-23',
}

def flatten(nodes):
    for node in nodes:
        yield node
        yield from flatten(node.get('children', []))

parser = argparse.ArgumentParser()
parser.add_argument('--content', type=Path, default=ROOT / 'src/content/question-trees.json')
args = parser.parse_args()
namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(SOURCE) as document:
    root = ET.fromstring(document.read('word/document.xml'))
lines = [''.join(t.text or '' for t in p.findall('.//w:t', namespace)) for p in root.findall('.//w:p', namespace)]
entries = {}
project = audience = question = None
for line in lines:
    if line in ['Recruiter', 'Engineer', 'Friend']:
        audience = line.upper()
    elif line in PROJECTS:
        project = PROJECTS[line]
    elif line.startswith('Q: '):
        question = line[3:]
    elif line.startswith('A: ') and question:
        entries[(project, audience, question)] = line[3:]
        question = None
errors, unchanged, updated, seen = [], 0, [], set()
for tree in json.loads(args.content.read_text()):
    for node in flatten(tree['topics']):
        key = (tree['projectId'], tree['audienceId'], node['label'])
        seen.add(key)
        original = entries.get(key)
        text = ' '.join(node['answer']['pages'])
        if original is None:
            errors.append(f"No supplied question: {node['id']}")
        elif node['id'] in CURRENT_STATUS and node['answer'].get('sourceRef') == 'current-pokefolio':
            updated.append(node['id'])
        elif text != original or node['answer'].get('sourceRef') != 'answered-trees-final':
            errors.append(f"Answer/source differs from supplied master: {node['id']}")
        else:
            unchanged += 1
if seen != set(entries):
    errors.append('Missing or extra supplied question coverage')
if len(entries) != 394:
    errors.append(f'Unexpected master coverage: {len(entries)}')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'Source audit PASS: {len(seen)} supplied questions; {unchanged} verbatim answers; {len(updated)} repository-backed Pokefolio status updates.')
