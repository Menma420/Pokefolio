#!/usr/bin/env python3
"""Choose an existing Pillow runtime; never install dependencies implicitly."""
import os,sys,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
candidates=[os.environ.get('EMERALD_PYTHON'),str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'),sys.executable]
python=next((p for p in candidates if p and subprocess.run([p,'-c','import PIL'],capture_output=True).returncode==0),None)
if not python:raise SystemExit('Pillow is required. Set EMERALD_PYTHON to an existing Python with Pillow.')
mode=sys.argv[1] if len(sys.argv)>1 else 'extract'
if mode=='extract':
 for name in ['extract.py','render_map.py','validate_assets.py','finalize_manifest.py']:subprocess.run([python,str(Path(__file__).parent/name),*sys.argv[2:]],cwd=root,check=True)
elif mode=='ui':subprocess.run([python,str(Path(__file__).parent/'extract_ui.py'),*sys.argv[2:]],cwd=root,check=True)
elif mode=='test':subprocess.run([python,'-m','unittest','discover','-s','tests/emerald-reconstruction','-p','test_*.py','-v'],cwd=root,check=True)
else:raise SystemExit('Expected extract, ui or test')
