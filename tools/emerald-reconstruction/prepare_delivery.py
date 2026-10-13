#!/usr/bin/env python3
"""Prepare an ignored release directory. Never upload or copy into public/."""
import hashlib,json
from pathlib import Path
from import_audio import PIN,TRACKS

ROOT=Path(__file__).resolve().parents[2]
PRIVATE=ROOT/'artifacts/emerald-source'
OUT=PRIVATE/'delivery'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def prepare():
 world=(PRIVATE/'bundle.json').read_bytes();ui=(PRIVATE/'ui/ui-bundle.json').read_bytes()
 music=json.loads((PRIVATE/'audio/manifest.json').read_text())
 music['distribution']='Prepared release; distribution requires separate owner authorization'
 for data in [json.loads(world),json.loads(ui),music]:
  if data['sourceCommit']!=PIN:raise ValueError('Source revision mismatch')
 for key in ['title','intro','player','opponent','portfolio','fonts','frame','bag','battle']:
  if not json.loads(ui).get(key):raise ValueError('Incomplete UI: '+key)
 files={};OUT.mkdir(parents=True,exist_ok=True)
 def write(key,path,raw,content_type):
  target=OUT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
  files[key]={'path':path,'sha256':sha(raw),'bytes':len(raw),'contentType':content_type}
 write('world','world.json',world,'application/json');write('ui','ui.json',ui,'application/json')
 valid={key for key,_,_ in TRACKS}
 for key,track in music['tracks'].items():
  if key not in valid:raise ValueError('Unknown source track: '+key)
  track['src']=None
  if not(track['present'] and track['validated']):continue
  filename=track['filename']
  if Path(filename).name!=filename:raise ValueError('Invalid recording path')
  raw=(PRIVATE/'audio/imports'/filename).read_bytes()
  if sha(raw)!=track['sha256']:raise ValueError('Recording hash mismatch: '+key)
  ext=Path(filename).suffix.lower();mime={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.flac':'audio/flac'}[ext]
  write(key,'audio/'+key+ext,raw,mime);track['src']='/api/game-assets/'+key
 write('music','music.json',(json.dumps(music,indent=2,ensure_ascii=False)+'\n').encode(),'application/json')
 # Remove only stale files in this tool-owned ignored directory, never source inputs.
 expected={entry['path'] for entry in files.values()}|{'release.json'}
 for path in OUT.rglob('*'):
  if path.is_file() and path.relative_to(OUT).as_posix() not in expected:path.unlink()
 release={'schemaVersion':1,'sourceCommit':PIN,'files':files}
 (OUT/'release.json').write_text(json.dumps(release,indent=2)+'\n')
 print(json.dumps({'output':str(OUT),'assets':len(files),'sourceCommit':PIN,'uploaded':False,'distributionAuthorization':'not granted by preparation; required separately'},indent=2))
 return release
if __name__=='__main__':prepare()
