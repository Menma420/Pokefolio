#!/usr/bin/env python3
"""Repeat extraction and compare every generated data/preview byte, not logs."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/emerald-source'


def hashes():
    bundle = json.loads((OUT / 'bundle.json').read_text())
    files = [OUT / 'bundle.json', OUT / 'on-load-edits.json', OUT / 'warp-destination-validation.json']
    for directory in [OUT / 'raw', *(OUT / name for name in bundle['maps'])]:
        files.extend(p for p in directory.rglob('*') if p.is_file())
    return {str(p.relative_to(OUT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


if __name__ == '__main__':
    before = hashes()
    with (OUT / 'extraction.log').open('w') as log:
        subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')), 'extract'], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)
    after = hashes()
    changed = sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k))
    result = {'artifacts': len(before), 'changedHashes': changed}
    (OUT / 'determinism.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if changed:
        raise SystemExit(1)
