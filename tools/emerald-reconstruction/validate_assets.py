#!/usr/bin/env python3
from pathlib import Path
import argparse,json,struct,hashlib,subprocess
from extract import ROOT,PIN
from render_map import entries,planes,definitions

def extract_function(text,signature):
 start=text.index(signature+'\n{');end=text.index('{',start);depth=1;end+=1
 while depth:
  depth += (text[end]=='{')-(text[end]=='}');end+=1
 return text[start:end]

def validate(repo,out):
 bundle=json.loads((out/'bundle.json').read_text());assert bundle['sourceCommit']==PIN['commit'];checks=[]
 assert subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()==PIN['commit']
 assert not subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip()
 for source in json.loads((out/'manifest.json').read_text())['inputs']:assert hashlib.sha256((repo/source['sourcePath']).read_bytes()).hexdigest()==source['sha256']
 for name,m in bundle['maps'].items():
  raw=(repo/next(i['sourcePath'] for i in json.loads((out/'manifest.json').read_text())['inputs'] if i['sourcePath'].startswith('data/layouts/') and i['sourcePath'].endswith('/map.bin') and json.loads((out/name/'source-grid.json').read_text())['layout']['blockdata_filepath']==i['sourcePath'])).read_bytes()
  assert raw==struct.pack('<'+'H'*len(m['words']),*m['words']);assert len(raw)==m['width']*m['height']*2
  p,s,indices,pal=definitions(bundle,m);assert len(indices)==1024*64 and len(pal)==208
  for word in m['words']+m['border']:
   e,a=entries(bundle,m,word&1023);assert a>>12 in [0,1,2]
   for t in e:
    # Source door-overlay entries address transparent, not-yet-loaded VRAM slots.
    if t>>12>=13:assert not any(indices[(t&1023)*64:((t&1023)+1)*64])
  for warp in m['events']['warp_events']:
   assert 0<=warp['x']<m['width'] and 0<=warp['y']<m['height']
   dest=next((v for v in bundle['maps'].values() if v['id']==warp['dest_map']),None)
   if dest:assert 0<=int(warp['dest_warp_id'])<len(dest['events']['warp_events'])
  checks.append({'map':name,'dimensions':[m['width'],m['height']],'words':len(m['words']),'roundtripMismatches':0})
 # Compile the actual source DrawMetatile function with only hardware-copy stubs.
 text=(repo/'src/field_camera.c').read_text();fn=extract_function(text,'static void DrawMetatile(s32 metatileLayerType, const u16 *tiles, u16 offset)')
 harness='''#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef int32_t s32;typedef uint16_t u16;
enum {METATILE_LAYER_TYPE_NORMAL,METATILE_LAYER_TYPE_COVERED,METATILE_LAYER_TYPE_SPLIT};
u16 gOverworldTilemapBuffer_Bg1[1024],gOverworldTilemapBuffer_Bg2[1024],gOverworldTilemapBuffer_Bg3[1024];
void ScheduleBgCopyTilemapToVram(int bg){}
'''+fn+'''
int main(){u16 v[9];int slots[]={0,1,32,33};while(fread(v,2,9,stdin)==9){DrawMetatile(v[0],v+1,0);u16 *bg[]={gOverworldTilemapBuffer_Bg1,gOverworldTilemapBuffer_Bg2,gOverworldTilemapBuffer_Bg3};for(int b=0;b<3;b++)for(int i=0;i<4;i++)fwrite(&bg[b][slots[i]],2,1,stdout);}return 0;}
'''
 folder=out/'host-tools';(folder/'draw.c').write_text(harness);subprocess.run(['gcc','-O2',str(folder/'draw.c'),'-o',str(folder/'draw')],check=True)
 data=[];expected=[]
 for t in bundle['tilesets'].values():
  for e,a in zip(t['metatiles'],t['attributes']):data.extend([a>>12]+e);expected.extend(n for layer in planes(e,a) for n in layer)
 result=subprocess.run([str(folder/'draw')],input=struct.pack('<'+'H'*len(data),*data),capture_output=True,check=True).stdout
 assert result==struct.pack('<'+'H'*len(expected),*expected)
 # Compile unedited camera arithmetic; stub only unrelated object-event side effects.
 camera='''#include <stdint.h>
#include <stdio.h>
#include <stddef.h>
typedef uint8_t u8;typedef uint32_t u32;typedef int bool8;
struct FieldCameraOffset {u8 xPixelOffset,yPixelOffset,xTileOffset,yTileOffset;bool8 copyBGToVRAM;};
struct CameraObject {int x,y,movementSpeedX,movementSpeedY;void (*callback)(struct CameraObject *);};
struct CameraObject gFieldCamera={0};struct FieldCameraOffset sFieldCameraOffset={0};
uint16_t gTotalCameraPixelOffsetX=0,gTotalCameraPixelOffsetY=0;int originX=10,originY=10;
void CameraMove(int x,int y){originX+=x;originY+=y;}
void UpdateObjectEventsForCameraUpdate(int x,int y){} void RotatingGatePuzzleCameraUpdate(int x,int y){} void SetBerryTreesSeen(){}
void RedrawMapSlicesForCameraUpdate(struct FieldCameraOffset *c,int x,int y){}
'''
 for signature in ['static void AddCameraTileOffset(struct FieldCameraOffset *cameraOffset, u32 xOffset, u32 yOffset)','static void AddCameraPixelOffset(struct FieldCameraOffset *cameraOffset, u32 xOffset, u32 yOffset)','void CameraUpdate(void)']:camera+='\n'+extract_function(text,signature)
 camera+='''
int main(){int x,y;while(scanf("%d %d",&x,&y)==2){gFieldCamera.movementSpeedX=x;gFieldCamera.movementSpeedY=y;CameraUpdate();printf("%d %d %d %d %d %d %d %d %d %d\\n",originX,originY,gFieldCamera.x,gFieldCamera.y,sFieldCameraOffset.xTileOffset,sFieldCameraOffset.yTileOffset,sFieldCameraOffset.xPixelOffset,sFieldCameraOffset.yPixelOffset,gTotalCameraPixelOffsetX,gTotalCameraPixelOffsetY);}return 0;}
'''
 (folder/'camera.c').write_text(camera);subprocess.run(['gcc','-O2',str(folder/'camera.c'),'-o',str(folder/'camera')],check=True)
 speeds=[(1,0)]*48+[(-1,0)]*48+[(0,1)]*48+[(0,-1)]*48+[(0,1)]*3+[(0,-1)]*3+[(1,0)]*3+[(-1,0)]*3
 states=subprocess.run([str(folder/'camera')],input=''.join(f'{x} {y}\n' for x,y in speeds),text=True,capture_output=True,check=True).stdout.splitlines()
 (out/'camera-oracle.json').write_text(json.dumps({'sourceCommit':PIN['commit'],'source':'src/field_camera.c:CameraUpdate/AddCameraTileOffset/AddCameraPixelOffset','cases':[{'speed':list(speed),'state':list(map(int,state.split()))} for speed,state in zip(speeds,states)]})+'\n')
 report={'status':'PASS','maps':checks,'upstreamDrawMetatileCases':len(data)//9,'tilemapEntryMismatches':0,'upstreamCameraFrames':len(speeds),'gbagfx':json.loads((out/'gbagfx-checks.json').read_text()),'emulatorFrameParity':'BLOCKED: ARM assembler/linker, agbcc, libpng headers and source-built Emerald ROM/capture absent'}
 (out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='gbagfx'},indent=2))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,default=ROOT/'pokeemerald');ap.add_argument('--out-dir',type=Path,default=ROOT/'artifacts/emerald-source');a=ap.parse_args();validate(a.repo,a.out_dir)
