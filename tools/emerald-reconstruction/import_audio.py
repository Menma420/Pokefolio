#!/usr/bin/env python3
"""Explicit private imports only. Never download, infer filenames or export public media."""
import argparse, hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PIN='731ad5bfd6e6f265508d0efcca0ba42f9dcf5881'
OUT=ROOT/'artifacts/emerald-source/audio'
TRACKS=[
 ('MUS_TITLE','Title Theme',3),
 ('MUS_ROUTE122','Welcome To The World of Pokemon! ~ Route 123',4),
 ('MUS_LITTLEROOT','Littleroot Town',5),
 ('MUS_BIRCH_LAB',"Professor Birch's Laboratory",10),
 ('MUS_ROUTE101','Route 101 - 103',11),
 ('MUS_ENCOUNTER_MALE','Youngster ~ Camper~ Bug Catcher',15),
 ('MUS_ENCOUNTER_CHAMPION','Champion Encountered!',100),
 ('MUS_VS_CHAMPION','Champion Battle!',101),
 ('MUS_VICTORY_LEAGUE','Champion Defeated!',102),
 ('MUS_VS_TRAINER','Trainer Battle!',16),
 ('MUS_VICTORY_TRAINER','Trainer Defeated!',17),
 ('MUS_VS_RIVAL','Rival Battle!',66),
]
AUDIT=['include/constants/songs.h','src/title_screen.c','src/main_menu.c','src/overworld.c','src/sound.c','src/battle_setup.c','src/pokemon.c','src/battle_main.c','src/data/trainers.h','data/maps/MeteorFalls_StevensCave/scripts.inc','data/maps/EverGrandeCity_ChampionsRoom/scripts.inc','tools/mid2agb/agb.cpp']
def digest(raw):return hashlib.sha256(raw).hexdigest()
def id3_text(raw):
 """Read ID3v2.3/2.4 text frames; v2.4 lengths are synchsafe, not BE32."""
 if raw[:3]!=b'ID3' or raw[3] not in (3,4):return {}
 def sync(value):return sum((b&127)<<(7*(len(value)-i-1)) for i,b in enumerate(value))
 end=min(len(raw),10+sync(raw[6:10]));pos=10;tags={}
 if raw[5]&64:raise ValueError('Extended ID3 header needs explicit parser support')
 while pos+10<=end:
  key=raw[pos:pos+4];size=sync(raw[pos+4:pos+8]) if raw[3]==4 else int.from_bytes(raw[pos+4:pos+8],'big')
  if key==b'\0'*4:break
  if size<=0 or pos+10+size>end:raise ValueError('Invalid ID3 frame size')
  value=raw[pos+10:pos+10+size]
  if key[:1]==b'T' and value and value[0]<4:
   tags[key.decode('ascii')]=value[1:].decode(('latin1','utf-16','utf-16-be','utf-8')[value[0]],errors='strict').rstrip('\0')
  pos+=10+size
 return tags
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=ROOT/'pokeemerald');args=parser.parse_args();source=args.source.resolve()
 if subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()!=PIN:raise SystemExit('Source revision mismatch')
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'imports').mkdir(exist_ok=True)
 imports_path=OUT/'imports.json'
 if not imports_path.exists():imports_path.write_text(json.dumps({'tracks':{key:{'title':title,'filename':None,'provenance':None,'loop':None} for key,title,_ in TRACKS}},indent=2)+'\n')
 imports=json.loads(imports_path.read_text())['tracks'];constants={}
 import re
 for key,value in re.findall(r'^#define\s+(MUS_\w+)\s+(\d+)',(source/'include/constants/songs.h').read_text(),re.M):constants[key]=int(value)
 bundle=json.loads((ROOT/'artifacts/emerald-source/bundle.json').read_text())
 if bundle['sourceCommit']!=PIN:raise SystemExit('World bundle revision mismatch')
 maps={};inputs=[]
 for name in sorted(bundle['maps']):
  path=f'data/maps/{name}/map.json';meta=json.loads((source/path).read_text());maps[name]=meta['music'];AUDIT.append(path)
 for path in sorted(set(AUDIT)):
  raw=(source/path).read_bytes();inputs.append({'path':path,'sha256':digest(raw),'bytes':len(raw),'commit':PIN})
 tracks={}
 for key,title,number in TRACKS:
  item=imports.get(key,{})
  if item.get('title',title)!=title:raise SystemExit(f'Title mismatch for {key}: explicitly confirm the supplied title')
  filename=item.get('filename');raw=None
  if filename:
   path=(OUT/'imports'/filename).resolve()
   if path.parent!=(OUT/'imports').resolve():raise SystemExit('Imports must be direct children of audio/imports')
   if path.exists():
    raw=path.read_bytes()
    if len(raw)<32 or not(raw[:3]==b'ID3' or raw[:2] in [b'\xff\xfb',b'\xff\xf3',b'\xff\xf2'] or raw[:4] in [b'fLaC',b'OggS',b'RIFF']):raise SystemExit(f'Unrecognized audio container: {filename}')
  loop=item.get('loop')
  if loop and not(loop.get('evidence') and isinstance(loop.get('start'),(int,float)) and loop['start']>=0 and loop['end']>loop['start']):raise SystemExit(f'Invalid/undocumented loop for {key}')
  midi='sound/songs/midi/'+key.lower()+'.mid'
  if (source/midi).exists():inputs.append({'path':midi,'sha256':digest((source/midi).read_bytes()),'commit':PIN})
  tags=id3_text(raw) if raw else {}
  aliases={'MUS_ROUTE101':['Route 101','Route 101 - 103'],'MUS_VS_TRAINER':['Trainer Battle!','Battle! (Trainer Battle)'],'MUS_VICTORY_TRAINER':['Trainer Defeated!','Victory! (Trainer Battle)']}
  if tags.get('TIT2') and tags['TIT2'] not in aliases.get(key,[title]):raise SystemExit(f'Embedded title mismatch for {key}: {tags["TIT2"]}')
  tracks[key]={'notRequired':bool(item.get('notRequired',False)),'scopeReason':item.get('scopeReason'),'embeddedMetadata':tags,'constant':key,'numericId':constants[key],'title':title,'disc':1,'albumTrack':number,'filename':filename,'provenance':item.get('provenance'),'sha256':digest(raw) if raw else None,'bytes':len(raw) if raw else 0,'present':raw is not None,'validated':raw is not None and bool(item.get('provenance')),'validation':'container+sha256+explicit title mapping; browser decode required' if raw else ('not required in current scope' if item.get('notRequired') else 'missing supplied recording'),'src':'/dev/emerald/audio?track='+key if raw else None,'loop':not key.startswith('MUS_VICTORY'),'loopStart':loop['start'] if loop else None,'loopEnd':loop['end'] if loop else None,'loopEvidence':loop.get('evidence') if loop else None,'loopStatus':'verified supplied interval' if loop else 'whole recording; seam unverified, not an exact GBA loop','gain':item.get('gain',0.22),'maps':[name for name,music in maps.items() if music==key],'sourceSong':midi}
 manifest={'schemaVersion':1,'sourceCommit':PIN,'distribution':'local/private; never deploy','album':'https://downloads.khinsider.com/game-soundtracks/album/pokemon-emerald-enhanced-soundtrack','maps':maps,'tracks':tracks,'sourceInputs':inputs,'adaptations':{'youngster':'Route101 object 1 is not an Emerald trainer; Pokefolio recognition uses MUS_ENCOUNTER_MALE through VS','steven':'TRAINER_STEVEN is TRAINER_CLASS_RIVAL: MUS_VS_RIVAL, not MUS_VS_CHAMPION','championEncounter':'MUS_ENCOUNTER_CHAMPION is explicitly scripted for Wallace, not Steven; not selected in this flow','victory':'No explicit interview success state; no victory on EXIT'}}
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'present':[k for k,v in tracks.items() if v['present']],'missingRequired':[k for k,v in tracks.items() if not v['present'] and not v['notRequired']],'notRequired':[k for k,v in tracks.items() if v['notRequired']]},indent=2))
if __name__=='__main__':main()
