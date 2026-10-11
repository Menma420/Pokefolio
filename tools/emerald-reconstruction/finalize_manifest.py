#!/usr/bin/env python3
from pathlib import Path
import argparse,json,hashlib
from extract import ROOT,PIN
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,default=ROOT/'pokeemerald');ap.add_argument('--out-dir',type=Path,default=ROOT/'artifacts/emerald-source');a=ap.parse_args();out=a.out_dir
 manifest=json.loads((out/'manifest.json').read_text())
 old_outputs=manifest['outputs'];manifest['outputs']={}
 for p in sorted(out.rglob('*')):
  if not p.is_file() or p.name=='manifest.json':continue
  relative=str(p.relative_to(out));raw=p.read_bytes()
  existing=old_outputs.get(relative,{})
  manifest['outputs'][relative]={**existing,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'sourceCommit':PIN['commit'],'transformation':existing.get('transformation','diagnostic rendering/validation; see toolchain and state sidecar'),'inputs':existing.get('inputs',sorted(v['sourcePath'] for v in manifest['inputs']))}
 code=list(Path(__file__).parent.glob('*.py'))+list(Path(__file__).parent.glob('*.mjs'))+list(Path(__file__).parent.glob('*.ts'))
 for directory in ['src/core/emerald','src/game/emerald','src/app/dev/emerald']:
  code.extend(p for p in (ROOT/directory).rglob('*') if p.suffix in ['.ts','.tsx'])
 for name in ['src/app/GameShell.tsx','src/app/page.tsx','src/runtime/Orchestrator.ts','src/runtime/world/EmeraldWorldSession.ts','src/runtime/world/WorldSessionContract.ts','src/runtime/world/sourceChallenger.ts']:
  code.append(ROOT/name)
 manifest['toolchain']=[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(code)]
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Provenance:',len(manifest['inputs']),'source inputs;',len(manifest['outputs']),'private outputs')
