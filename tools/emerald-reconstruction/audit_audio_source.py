#!/usr/bin/env python3
"""Compile original MIDI/sample data with upstream tools, outside the upstream tree.
This is not a substitute MIDI synthesizer or a claim of m4a PCM equivalence.
"""
from pathlib import Path
import hashlib,json,re,shutil,struct,subprocess
from import_audio import ROOT,PIN,TRACKS
OUT=ROOT/'artifacts/emerald-source/audio/source'
SOURCE=ROOT/'pokeemerald'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def vlq(data,pos):
 value=0
 while True:
  byte=data[pos];pos+=1;value=(value<<7)|(byte&127)
  if byte<128:return value,pos

def midi_metadata(raw):
 if raw[:4]!=b'MThd':raise ValueError('MIDI header missing')
 size=struct.unpack('>I',raw[4:8])[0];fmt,tracks,division=struct.unpack('>HHH',raw[8:14]);pos=8+size;result=[];all_tempos=[]
 for n in range(tracks):
  if raw[pos:pos+4]!=b'MTrk':raise ValueError('Track header missing')
  length=struct.unpack('>I',raw[pos+4:pos+8])[0];data=raw[pos+8:pos+8+length];pos+=8+length;p=tick=0;running=None;markers=[];programs=set()
  while p<len(data):
   delta,p=vlq(data,p);tick+=delta;status=data[p]
   if status<128:
    if running is None:raise ValueError('Invalid running status')
    status=running
   else:p+=1
   if status==255:
    kind=data[p];p+=1;count,p=vlq(data,p);payload=data[p:p+count];p+=count
    if kind in range(1,8) and payload in [b'[',b']',b'][',b':']:markers.append({'tick':tick,'kind':payload.decode()})
    if kind==81:all_tempos.append({'tick':tick,'microsecondsPerBeat':int.from_bytes(payload,'big')})
   elif status in [240,247]:count,p=vlq(data,p);p+=count;running=None
   else:
    running=status;count=1 if status&240 in [192,208] else 2
    if status&240==192:programs.add(data[p])
    p+=count
  result.append({'track':n,'endTick':tick,'loopMarkers':markers,'programs':sorted(programs)})
 return {'format':fmt,'ticksPerBeat':division,'tracks':result,'tempoChanges':sorted({(x['tick'],x['microsecondsPerBeat']) for x in all_tempos})}

def main():
 if subprocess.check_output(['git','-C',str(SOURCE),'rev-parse','HEAD'],text=True).strip()!=PIN:raise SystemExit('Wrong source commit')
 OUT.mkdir(parents=True,exist_ok=True);tools=OUT/'host-tools';tools.mkdir(exist_ok=True)
 commands=[];artifacts=[];inputs={}
 def read(path):
  raw=(SOURCE/path).read_bytes();inputs[path]={'path':path,'sha256':sha(raw),'bytes':len(raw)};return raw
 def run(args):commands.append([str(a) for a in args]);subprocess.run(args,check=True,capture_output=True)
 def save(path,raw,transformation):
  target=OUT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw);artifacts.append({'path':str(target.relative_to(ROOT)),'sha256':sha(raw),'bytes':len(raw),'transformation':transformation})
 for name in ['mid2agb','wav2agb']:
  folder=SOURCE/'tools'/name;cpp=sorted(folder.glob('*.cpp'))
  for p in list(cpp)+list(folder.glob('*.h'))+[folder/'LICENSE']:read(str(p.relative_to(SOURCE)))
  run(['g++','-std=c++17','-O2',*[str(p) for p in cpp],'-o',str(tools/name)])
 cfg=read('sound/songs/midi/midi.cfg').decode();songs={};groups=set()
 for key,_,_ in TRACKS:
  stem=key.lower();path=f'sound/songs/midi/{stem}.mid';raw=read(path);opts=re.search(r'^'+stem+r'\.mid:\s*(.+)$',cfg,re.M).group(1).split();groups.add(next(o[2:] for o in opts if o.startswith('-G')).lstrip('_'))
  target=OUT/'songs'/f'{stem}.s';target.parent.mkdir(exist_ok=True)
  run([str(tools/'mid2agb'),str(SOURCE/path),str(target),*opts,'-L'+stem])
  save('songs/'+stem+'.s',target.read_bytes(),'pinned mid2agb + original midi.cfg arguments')
  songs[key]={**midi_metadata(raw),'source':path,'options':opts,'assemblySha256':sha(target.read_bytes()),'gotoCount':target.read_text().count('GOTO')}
 # Traverse actual voice-group references, retaining envelopes/PSG definitions.
 group_paths={}
 for p in (SOURCE/'sound/voicegroups').rglob('*.inc'):
  match=re.search(r'voice_group\s+(\w+)',p.read_text())
  if match:group_paths[match.group(1)]=str(p.relative_to(SOURCE))
 pending=list(groups);seen=set();direct=set();programmable=set()
 while pending:
  name=pending.pop()
  if name in seen:continue
  seen.add(name);path=group_paths[name];text=read(path).decode();save(path,text.encode(),'unchanged voice group definition')
  pending.extend(re.findall(r'voicegroup_(\w+)',text));direct.update(re.findall(r'DirectSoundWaveData_\w+',text));programmable.update(re.findall(r'ProgrammableWaveData_\w+',text))
 direct_table=re.sub(r'@[^\n]*','',read('sound/direct_sound_data.inc').decode());wave_table=read('sound/programmable_wave_data.inc').decode()
 for symbol in sorted(direct):
  binary=re.search(r'\b'+symbol+r'::\s*\.incbin "([^"]+)"',direct_table).group(1);wav=binary[:-4]+'.wav';raw=read(wav);target=OUT/binary;target.parent.mkdir(parents=True,exist_ok=True)
  run([str(tools/'wav2agb'),'-b',str(SOURCE/wav),str(target)])
  save(binary,target.read_bytes(),'pinned wav2agb -b; preserves original agbp/agbl/smpl tuning and loop metadata')
 for symbol in sorted(programmable):
  path=re.search(r'\b'+symbol+r'::\s*\.incbin "([^"]+)"',wave_table).group(1);save(path,read(path),'unchanged original PSG programmable wave')
 for path in ['src/m4a.c','src/m4a_1.s','include/gba/m4a_internal.h','constants/m4a_constants.inc','sound/music_player_table.inc','sound/song_table.inc','sound/keysplit_tables.inc','asm/macros/music_voice.inc']:
  read(path)
 tools_available={name:shutil.which(name) for name in ['g++','arm-none-eabi-as','arm-none-eabi-ld','arm-none-eabi-gcc','mgba','agbplay','fluidsynth','timidity']}
 report={'sourceCommit':PIN,'songs':songs,'voiceGroups':sorted(seen),'directSoundSamples':len(direct),'programmableWaves':len(programmable),'sourceInputs':sorted(inputs.values(),key=lambda x:x['path']),'artifacts':artifacts,'commands':commands,'tools':tools_available,'nativeMixer':{'source':['src/m4a.c','src/m4a_1.s'],'mode':'SOUND_MODE_DA_BIT_8 | SOUND_MODE_FREQ_13379 | (12 << MASVOL) | (5 << MAXCHN)','status':'Not rendered: ARM assembler/linker and agbcc absent; no source-built ROM. mGBA alone cannot render an unbuilt source tree. Host MIDI conversion does not execute the GBA mixer, PSG channels or reverb. Generic SoundFont rendering would not reproduce the original instrumentation.'},'loopTiming':'Original MIDI bracket markers compile to M4A GOTO; source ticks are preserved here. They are not timestamps in separately supplied MP3 recordings. No guessed album loop points.'}
 (OUT/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'songs':len(songs),'voiceGroups':len(seen),'samples':len(direct),'waves':len(programmable),'nativePcm':'blocked by absent ARM build prerequisites'},indent=2))
if __name__=='__main__':main()
