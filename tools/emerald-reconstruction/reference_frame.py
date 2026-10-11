#!/usr/bin/env python3
"""Independent direct-world compositor; not an emulator oracle."""
import json
from pathlib import Path
from PIL import Image
from extract import ROOT,rgb
from render_map import entries,planes,definitions,tile_pixel
out=ROOT/'artifacts/emerald-source';bundle=json.loads((out/'bundle.json').read_text());state=json.loads((out/'screenshots/town-1x.state.json').read_text());m=bundle['maps'][state['map']];_,_,indices,palette=definitions(bundle,m)
assert state['logicalFrame']==0 and state['transition'] is None and state['player']['step']==0 and all(o['step']==0 for o in state['objects']), 'Reference compositor currently supports only the declared initial frame'
c=state['camera'];im=Image.new('RGBA',(240,160),(0,0,0,255));objects=[]
for obj in state['objects']+[dict(state['player'],gfx='OBJ_EVENT_GFX_BRENDAN_NORMAL')]:
 actor=bundle['actors'][obj['gfx']];pose=actor['animations']['ANIM_STD_FACE_'+obj['facing'].upper()][0];objects.append((obj,actor,pose))
priorities=[2,2,2,2,1,2,1,2,1,2,1,2,1,0,0,2]
for y in range(160):
 for x in range(240):
  wx=(c['originX']-7)*16+x+c['panX'];wy=(c['originY']-7)*16+y+c['panY']+8
  tx,ty=wx//16,wy//16
  word=m['words'][ty*m['width']+tx] if 0<=tx<m['width'] and 0<=ty<m['height'] else m['border'][((tx+8)&1)+(((ty+8)&1)<<1)]
  tiles,attr=entries(bundle,m,word&1023);bg=planes(tiles,attr);color=palette[0]
  for priority in range(3,-1,-1):
   if priority>0:
    entry=bg[priority-1][(wy%16//8)*2+wx%16//8];n=tile_pixel(indices,entry,wx%8,wy%8)
    if n:color=palette[(entry>>12)*16+n]
   for obj,actor,pose in sorted(objects,key=lambda o:o[0]['y']):
    if priorities[obj['elevation']]!=priority:continue
    ox=wx-(obj['x']*16+8-actor['width']//2);oy=wy-(obj['y']*16+16-actor['height'])
    if 0<=ox<actor['width'] and 0<=oy<actor['height']:
     if pose['hFlip']:ox=actor['width']-1-ox
     n=actor['frames'][pose['frame']][oy*actor['width']+ox]
     if n:color=actor['palette'][n]
  im.putpixel((x,y),tuple(rgb(color))+(255,))
im.save(out/'screenshots/independent-native.png')
