"""Export owner-supplied MP3 music unchanged and render original UI cue scores."""
from pathlib import Path
import wave,array,json,hashlib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/assets/audio';RATE=22050
manifest={}
def write(name,data,meta):
 pcm=array.array('h',(round(max(-1,min(1,v))*26000) for v in data));raw=pcm.tobytes()
 filename=name+'-'+hashlib.sha256(raw).hexdigest()[:12]+'.wav'
 with wave.open(str(OUT/filename),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(raw)
 manifest[name]={'src':'/assets/audio/'+filename,'sampleRate':RATE,**meta}
OUT.mkdir(parents=True,exist_ok=True)
for name in ['town','battle','victory']:
 source=ROOT/'assets-src/audio/music'/f'{name}.mp3';raw=source.read_bytes()
 digest=hashlib.sha256(raw).hexdigest();filename=f'{name}-{digest[:12]}.mp3'
 (OUT/filename).write_bytes(raw)
 manifest[name]={'src':'/assets/audio/'+filename,'sha256':digest,'loop':name!='victory'}
# Short authored cue contours; the same score is used by the live oscillator fallback.
CUES={'cursor.move':([960],0.035),'ui.confirm':([960,1280],0.09),'ui.cancel':([800,640],0.08),'ui.buzz':([160,120],0.09),'text.tick':([1600],0.018),'world.door':([320,480,320],0.14),'world.bump':([120],0.04),'encounter.alert':([1200,1440,1200],0.18),'vs.cue':([720,1080,1440,1080],0.4),'vs.impact':([180,720,360,1440],0.12),'battle.sendout':([560,840,1120],0.18),'battle.withdraw':([1120,840,560],0.16),'link.open':([1020,1360],0.09),'page':([800,1000],0.025),'menu.open':([780,1040],0.05),'title.start':([440,660,880,1100,880],1.2)}
for name,(notes,duration) in CUES.items():
 data=[]
 for i in range(round(duration*RATE)):
  t=i/RATE;freq=notes[min(len(notes)-1,int(t/duration*len(notes)))];phase=(t*freq)%1;env=min(1,t/0.003)*min(1,(duration-t)/0.02)
  data.append((1 if phase<0.25 else -1/3)*env*(0.08 if name=='text.tick' else 0.16))
 write(name,data,{'duration':duration,'loop':False,'frequencies':notes})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'assets-src/audio/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Supplied town, battle and victory MP3s (unchanged), plus',len(CUES),'original cues')
