"""Pokefolio world artwork, with the immutable user-supplied Sprite Lab Brendan player.
Run: python3 assets-src/world/build.py
"""
from pathlib import Path
import json, hashlib, struct, zlib, math
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'public/assets/world'
P={'ink':'#283D38','grass':'#8EBE78','grassShade':'#73A861','grassLight':'#B2D68B','leaf':'#5D9861','leafDark':'#38684D','leafLight':'#88B878','wood':'#98694E','woodDark':'#614C3F','woodLight':'#C79D6A','sand':'#DEC998','sandShade':'#C3AD7D','sandLight':'#F0DDAE','water':'#5CA5AE','waterDark':'#417D91','waterLight':'#A5D3CB','roof':'#687BA5','roofDark':'#3F4D73','roofLight':'#9BAAD2','wall':'#EEEACA','wallShade':'#B8BEAB','wallLight':'#FFF3D5','stone':'#9CAA95','stoneShade':'#748672','stoneLight':'#C9D1B5','flower':'#D7A0A0','flowerLight':'#F1D5B5'}
def rgba(c):return tuple(bytes.fromhex(c.lstrip('#')))+(255,)
class Art:
 def __init__(self,w,h,bg=None):self.w=w;self.h=h;self.p=[rgba(bg) if bg else (0,0,0,0)]*(w*h)
 def dot(self,x,y,c):
  if 0<=x<self.w and 0<=y<self.h:self.p[y*self.w+x]=rgba(c) if c else (0,0,0,0)
 def rect(self,x,y,w,h,c):
  for yy in range(y,y+h):
   for xx in range(x,x+w):self.dot(xx,yy,c)
 def line(self,x,y,x2,y2,c):
  steps=max(abs(x2-x),abs(y2-y))
  for t in range(steps+1):self.dot(round(x+(x2-x)*t/max(1,steps)),round(y+(y2-y)*t/max(1,steps)),c)
 def blit(self,a,x,y):
  for yy in range(a.h):
   for xx in range(a.w):
    col=a.p[yy*a.w+xx]
    if col[3] and 0<=xx+x<self.w and 0<=yy+y<self.h:self.p[(yy+y)*self.w+xx+x]=col
 def crop(self,x,y,w,h):
  a=Art(w,h)
  for yy in range(h):
   for xx in range(w):a.p[yy*w+xx]=self.p[(yy+y)*self.w+xx+x]
  return a
 def png(self):
  def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
  raw=b''.join(b'\0'+bytes(c for px in self.p[y*self.w:(y+1)*self.w] for c in px) for y in range(self.h))
  return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
tiles=[];names={}; palettes={}
def tile(name,a):
 colors=sorted({'#'+bytes(p[:3]).hex().upper() for p in a.p if p[3]});assert len(colors)<=5,(name,colors)
 names[name]=len(tiles)+1;tiles.append((name,a));palettes[name]=colors
# Turf variants have readable clustered blades, not noise/dither.
for v in range(4):
 a=Art(16,16,P['grass'])
 for x,y in [[(2,3),(11,8),(5,13)],[(10,2),(3,9),(12,13)],[(5,3),(12,7),(2,13)],[(2,6),(10,3),(9,12)]][v]:
  a.dot(x,y,P['grassShade']);a.dot(x+1,y+1,P['grassShade']);a.dot(x+2,y,P['grassLight'])
 tile('grass-'+str(v),a)
# Path masks N/E/S/W; banks connect exactly across neighbouring tiles.
for mask in range(16):
 a=Art(16,16,P['sand'])
 for x,y in [(12,10)]:a.rect(x,y,2,1,P['sandShade'])
 for bit,side in [(1,'n'),(2,'e'),(4,'s'),(8,'w')]:
  if mask&bit:continue
  for i in range(16):
   depth=2+(i//4)%2
   for d in range(depth):
    x,y=(i,d) if side=='n' else (15-d,i) if side=='e' else (i,15-d) if side=='s' else (d,i)
    a.dot(x,y,P['grass']);x,y=(i,depth) if side=='n' else (15-depth,i) if side=='e' else (i,15-depth) if side=='s' else (depth,i);a.dot(x,y,P['grassShade'])
 tile('path-'+str(mask),a)
# Quiet pond ripples, outlined bank corners, all sixteen neighbour masks.
for mask in range(16):
 a=Art(16,16,P['water']);a.rect(4,5,4,1,P['waterLight']);a.rect(10,11,3,1,P['waterDark'])
 for bit,side in [(1,'n'),(2,'e'),(4,'s'),(8,'w')]:
  if mask&bit:continue
  for i in range(16):
   for d,c in enumerate([P['grass'],P['ink'],P['waterLight']]):
    depth=d+(1 if i<2 or i>13 else 0)
    x,y=(i,depth) if side=='n' else (15-depth,i) if side=='e' else (i,15-depth) if side=='s' else (depth,i)
    a.dot(x,y,c)
 tile('water-'+str(mask),a)
# Dense clipped hedgerow at the same solid world boundary tiles.
a=Art(16,16,P['grass']);a.rect(0,3,16,11,P['ink']);a.rect(0,4,16,8,P['leafDark']);a.rect(1,3,14,8,P['leaf']);a.rect(3,2,10,2,P['leaf']);a.rect(5,1,6,1,P['leafDark'])
for x,y in [(2,5),(8,3),(11,7),(5,9)]:a.rect(x,y,3,1,P['leafLight']);a.dot(x+1,y+1,P['leafLight'])
a.rect(0,12,16,2,P['leafDark']);a.rect(2,14,12,1,P['grass']);tile('boundary',a)
# Layered flower tussocks / low tufts / pebble, all traversable embellishments.
for name,kind in [('flowers',0),('tuft',1),('pebbles',2)]:
 a=Art(16,16)
 if kind<2:
  for x,y in [(3,9),(9,6),(11,11)]:
   a.line(x,y+3,x,y,P['leafDark']);a.dot(x-1,y+1,P['leaf']);a.dot(x+1,y+2,P['grassLight'])
   if kind==0:
    a.rect(x-1,y-2,3,3,P['flower']);a.dot(x,y-1,P['flowerLight'])
 else:
  a.rect(3,10,5,3,P['ink']);a.rect(4,9,3,3,P['stone']);a.rect(4,9,2,1,P['stoneLight']);a.rect(11,5,3,2,P['stoneShade'])
 tile(name,a)
# Tall grass is decorative only, preserves compiled collision flags.
a=Art(16,16)
for x,y in [(1,10),(6,7),(11,11),(13,5)]:
 a.line(x,y,x+2,y+5,P['leafDark']);a.line(x+4,y,x+2,y+5,P['leaf']);a.line(x+2,y-2,x+2,y+5,P['grassLight'])
tile('tall-grass',a)
# Fence, garden post and original chevron sign, without changing world interactions.
a=Art(16,16);a.rect(0,6,16,7,P['woodDark']);a.rect(0,7,16,2,P['woodLight']);a.rect(2,3,3,12,P['ink']);a.rect(3,3,1,11,P['wood']);a.rect(11,3,3,12,P['ink']);a.rect(12,3,1,11,P['wood']);tile('fence',a)
a=Art(16,16);a.rect(7,9,2,7,P['woodDark']);a.rect(2,2,12,9,P['ink']);a.rect(3,3,10,7,P['woodLight']);a.rect(4,4,8,1,P['wood']);a.line(6,6,9,6,P['woodDark']);a.dot(9,5,P['woodDark']);a.dot(9,7,P['woodDark']);tile('sign',a)
# Broad, scalloped tree crowns. The lower tile remains the existing collision anchor.
tree=Art(32,48)
for y,left,right in [(2,12,19),(3,9,22),(4,6,25),(5,4,27),(6,3,28),(7,3,28),(8,2,29),(9,2,29),(10,1,30),(11,1,30),(12,1,30),(13,0,31),(14,0,31),(15,0,31),(16,0,31),(17,1,30),(18,1,30),(19,1,30),(20,2,29),(21,2,29),(22,3,28),(23,3,28),(24,4,27),(25,5,26),(26,6,25),(27,7,24),(28,9,22),(29,11,20),(30,13,18)]:
 tree.rect(left,y,right-left+1,1,P['ink']);tree.rect(left+1,y,right-left-1,1,P['leafDark'] if y>23 else P['leaf'])
for x,y,w,h in [(10,5,10,4),(5,10,8,5),(16,10,11,5),(8,17,9,5),(20,18,7,4),(12,24,8,3)]:
 tree.rect(x+2,y,w-4,1,P['leafLight']);tree.rect(x+1,y+1,w-2,h-2,P['leafLight']);tree.rect(x,y+h-1,w,1,P['leaf']);tree.dot(x,y+h,P['leafDark']);tree.dot(x+w-1,y+1,P['leafDark'])
for x,y in [(9,9),(20,8),(4,17),(15,16),(24,24),(8,24)]:
 tree.dot(x,y,P['leafDark']);tree.dot(x+1,y+1,P['leafDark']);tree.dot(x+2,y,P['leafLight'])
tree.rect(13,31,6,12,P['ink']);tree.rect(14,32,4,10,P['wood']);tree.rect(14,32,1,9,P['woodLight']);tree.rect(17,33,1,9,P['woodDark']);tree.rect(10,42,12,2,P['ink']);tree.rect(12,42,8,1,P['woodDark'])
for ty in range(3):
 for tx in range(2):tile(f'tree-{tx}-{ty}',tree.crop(tx*16,ty*16,16,16))
# The grand tree keeps the same 4×4 tile assembly and all P9 coordinates.
grand=Art(64,64)
for ox,oy in [(0,6),(30,6),(15,0),(7,18),(24,18)]:grand.blit(tree.crop(0,0,32,26),ox,oy)
grand.rect(27,43,10,18,P['ink']);grand.rect(28,44,8,4,P['leafDark']);grand.rect(28,48,8,12,P['wood']);grand.rect(29,48,2,11,P['woodLight']);grand.rect(34,49,2,11,P['woodDark']);grand.rect(23,60,19,2,P['ink']);grand.rect(25,60,15,1,P['woodDark'])
for ty in range(4):
 for tx in range(4):tile(f'grand-{tx}-{ty}',grand.crop(tx*16,ty*16,16,16))
# Timber house: hand-pixelled stepped hip roof, roof courses, mullioned windows and porch.
# Palette caps apply per 16px tile, so roof/wall/frame blocks are authored separately.
for side in ['left','middle','right']:
 for course in [0,1]:
  a=Art(16,16)
  for y in range(16):
   inset=max(0,8-y) if course==0 else 0
   lo=inset if side=='left' else 0; hi=15-inset if side=='right' else 15
   a.rect(lo,y,hi-lo+1,1,P['roofDark']);a.rect(lo+1,y,hi-lo-1,1,P['roof'])
   if y%5==1:a.line(lo+1,y,hi-1,y,P['roofLight'])
   if y%5==4:a.line(lo,y,hi,y,P['ink'])
   if y%5<4:
    for x in range((0 if (y//5)%2 else 8),16,8):
     if lo<x<hi:a.dot(x,y,P['roofDark'])
  tile(f'roof-{side}-{course}',a)
for name in ['wall','window','door','door-upper','door-lower','wall-left','wall-right','porch']:
 a=Art(16,16,P['wall']);a.line(0,0,15,0,P['wallLight']);a.line(0,7,15,7,P['wallShade']);a.line(0,15,15,15,P['ink'])
 if name=='window':
  a.rect(2,2,12,12,P['ink']);a.rect(3,3,10,9,P['wallShade']);a.rect(4,3,8,7,P['water']);a.rect(4,3,3,2,P['wallLight']);a.dot(10,8,P['wallLight']);a.rect(7,3,2,9,P['ink']);a.rect(3,7,10,1,P['ink']);a.rect(1,13,14,2,P['wallShade'])
 if name=='door':
  a.rect(2,0,12,16,P['ink']);a.rect(3,1,10,14,P['wallShade']);a.rect(4,3,8,4,P['ink']);a.rect(5,4,6,2,P['wallLight']);a.rect(5,9,6,4,P['wall']);a.dot(11,9,P['ink']);a.rect(2,15,12,1,P['wallLight'])
 if name=='door-upper':
  a.rect(2,0,12,16,P['ink']);a.rect(3,1,10,15,P['wallShade']);a.rect(4,3,8,9,P['ink']);a.rect(5,4,6,7,P['wallLight']);a.rect(7,4,1,7,P['wallShade'])
 if name=='door-lower':
  a.rect(2,0,12,16,P['ink']);a.rect(3,0,10,15,P['wallShade']);a.rect(5,3,6,9,P['wall']);a.rect(5,8,6,1,P['wallLight']);a.dot(11,4,P['ink']);a.rect(2,15,12,1,P['wallLight'])
 if name=='wall-left':a.rect(0,0,2,16,P['ink']);a.rect(2,0,2,16,P['wallShade'])
 if name=='wall-right':a.rect(14,0,2,16,P['ink']);a.rect(12,0,2,16,P['wallShade'])
 if name=='porch':
  a=Art(16,16,P['wood']);a.line(0,0,15,0,P['woodLight']);a.line(0,5,15,5,P['woodDark']);a.line(0,11,15,11,P['woodDark']);a.line(0,15,15,15,P['ink']);a.dot(6,8,P['woodDark'])
 tile(name,a)
# Interior polish is limited to replacing the old flat floor/boundary/door tile.
a=Art(16,16,P['wall']);a.line(0,0,15,0,P['wallLight']);a.line(0,7,15,7,P['wallShade']);a.line(7,1,7,6,P['wallShade']);tile('floor',a)
a=Art(16,16,P['woodDark']);a.rect(0,0,16,8,P['wallShade']);a.line(0,7,15,7,P['ink']);a.line(0,9,15,9,P['woodLight']);tile('interior-wall',a)
# P11 room-specific fixtures. Solid art is placed only over existing solid tiles.
for name in ['home-shelf','cottage-cabinet','workshop-console','wall-clock','wall-print','rug']:
 a=Art(16,16)
 if name=='rug':
  a.rect(1,1,14,14,P['woodDark']);a.rect(2,2,12,12,P['woodLight']);a.rect(3,3,10,10,P['wall']);a.rect(5,5,6,6,P['wood']);a.rect(6,6,4,4,P['wall'])
 elif name=='wall-clock':
  a.rect(4,2,8,11,P['ink']);a.rect(5,3,6,8,P['wallLight']);a.rect(7,4,1,4,P['woodDark']);a.rect(7,7,3,1,P['woodDark']);a.rect(7,11,2,2,P['woodLight'])
 elif name=='wall-print':
  a.rect(2,2,12,12,P['ink']);a.rect(3,3,10,10,P['woodLight']);a.rect(4,4,8,8,P['wallLight']);a.rect(5,7,6,4,P['leafDark']);a.rect(7,5,2,2,P['leaf'])
 elif name=='home-shelf':
  a.rect(0,1,16,14,P['ink']);a.rect(1,2,14,12,P['wood']);a.rect(2,4,12,1,P['woodLight']);a.rect(2,10,12,1,P['woodLight'])
  for x,h in [(2,3),(5,4),(8,3),(11,4)]:a.rect(x,9-h,2,h,P['wallLight'])
  a.rect(3,12,4,1,P['woodDark']);a.rect(10,12,3,1,P['woodDark'])
 elif name=='cottage-cabinet':
  a.rect(0,2,16,14,P['ink']);a.rect(1,3,14,12,P['wood']);a.rect(2,4,5,10,P['woodLight']);a.rect(9,4,5,10,P['woodLight']);a.rect(6,8,1,2,P['ink']);a.rect(10,8,1,2,P['ink']);a.rect(3,5,3,2,P['wallLight']);a.rect(10,5,3,2,P['wallLight'])
 else:
  a.rect(0,2,16,14,P['ink']);a.rect(1,3,14,11,P['woodDark']);a.rect(3,4,10,6,P['wallLight']);a.rect(4,5,8,4,P['leafDark']);a.rect(6,6,5,1,P['leaf']);a.rect(2,12,5,1,P['wallLight']);a.rect(10,12,3,1,P['leaf'])
 tile(name,a)
# Preserve all supplied actors exactly, including the four-direction Trainer neighbor.
BRENDAN_DIR=ROOT/'assets-src/world/brendan'
NPC_DIR=ROOT/'assets-src/world/npcs'
BRENDAN=json.loads((BRENDAN_DIR/'golden.json').read_text())
assert hashlib.sha256((BRENDAN_DIR/'walking.png').read_bytes()).hexdigest()==BRENDAN['sha256'], 'Brendan golden source changed'
SOURCES={'player':BRENDAN}
for kind,name in [('npc-guide','may'),('npc-neighbor','trainer'),('challenger','steven')]:
 source=json.loads((NPC_DIR/(name+'.json')).read_text())
 source_png=NPC_DIR/('Trainer-4dir.png' if name=='trainer' else name+'.png')
 assert hashlib.sha256(source_png.read_bytes()).hexdigest()==source['sha256'], name+' source changed'
 SOURCES[kind]=source
CHARACTERS={kind:{str(i):color for i,color in enumerate(source['palette']) if i and any(i in frame for frame in source['frames'])} for kind,source in SOURCES.items()}
def character(kind,direction,step):
 source=SOURCES[kind];frame=source['directions'][direction][source['poseMapping'][str(step)]]
 indices=source['frames'][frame];a=Art(16,32)
 for y in range(32):
  for x in range(16):
   index=indices[y*16+(15-x if direction in source['mirrorDirections'] else x)]
   if index:a.dot(x,y,source['palette'][index])
 return a
sprites=[];frames={};tags={}
for kind in CHARACTERS:
 for direction in ['down','left','right','up']:
  for column,step in enumerate([0,1,2,'idle']):
   name=f'{kind}-{direction}-{step}';a=character(kind,direction,step);frames[name]={'frame':{'x':column*16,'y':len(sprites)//4*32,'w':16,'h':32},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':16,'h':32},'sourceSize':{'w':16,'h':32},'pivot':{'x':0.5,'y':1}};sprites.append(a)
  tags[f'{kind}-{direction}']={'frames':[f'{kind}-{direction}-{s}' for s in [0,1,0,2]],'idle':f'{kind}-{direction}-idle'}
spriteSheet=Art(64,len(sprites)//4*32)
for i,a in enumerate(sprites):spriteSheet.blit(a,(i%4)*16,(i//4)*32)
tileSheet=Art(16*16,math.ceil(len(tiles)/16)*16);tileFrames={}
for i,(name,a) in enumerate(tiles):
 x=i%16*16;y=i//16*16;tileSheet.blit(a,x,y);tileFrames[str(i+1)]={'frame':{'x':x,'y':y,'w':16,'h':16},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':16,'h':16},'sourceSize':{'w':16,'h':16}}
def save(name,art,frames,tags=None):
 png=art.png();image=f'{name}.{hashlib.sha256(png).hexdigest()[:12]}.png';OUT.mkdir(parents=True,exist_ok=True);(OUT/image).write_bytes(png)
 atlas={'frames':frames,'meta':{'app':'Pokefolio original pixel authoring','image':image,'size':{'w':art.w,'h':art.h},'scale':'1','frameTags':tags or {}}};data=(json.dumps(atlas,indent=2)+'\n').encode();filename=f'{name}.{hashlib.sha256(data).hexdigest()[:12]}.json';(OUT/filename).write_bytes(data);return {'image':'/assets/world/'+image,'atlas':'/assets/world/'+filename}
manifest={'tiles':save('town-tiles',tileSheet,tileFrames),'characters':save('town-characters',spriteSheet,frames,tags),'tileSize':16,'artBox':{'width':16,'height':32},'footprint':{'width':16,'height':16},'tileIds':names,'palettes':{'tiles':palettes,'characters':CHARACTERS},'originality':'Terrain authored in assets-src/world/build.py. Owner-supplied Sprite Lab Brendan, Steven and May character sheets, plus the supplied Sprite Lab Trainer neighbor; see assets-src/world/brendan/README.md and assets-src/world/npcs/README.md.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'assets-src/world/palette-sheet.json').write_text(json.dumps(manifest['palettes'],indent=2)+'\n')
print('Authored',len(tiles),'tiles and',len(sprites),'character frames; lossless PNG + JSON-hash atlases.')
# Repaint visual layers of authored Tiled sources ONLY. Retain all collisions, objects/routes/rooms.
def paint_map(name):
 p=ROOT/'assets-src/maps'/f'{name}.tmj';m=json.loads(p.read_text());w=m['width'];h=m['height'];layers={l['name']:l for l in m['layers'] if l['type']=='tilelayer'};
 if any(prop['name']=='p9AuthoredMap' and prop['value'] for prop in m.get('properties',[])):return
 for key in ['decor','above']:
  if key not in layers:
   layer={'type':'tilelayer','name':key,'width':w,'height':h,'data':[0]*(w*h),'opacity':1,'visible':True,'x':0,'y':0};m['layers'].append(layer);layers[key]=layer
 collision=layers['collision']['data'];ground=[];decor=[0]*(w*h);above=[0]*(w*h);interior='interior' in name
 def put(layer,x,y,key):
  if 0<=x<w and 0<=y<h:layer[y*w+x]=names[key]
 pathcells={(x,y) for y in range(1,h-1) for x in range(1,w-1) if (y in [5,6] or x==7 or x==21 and y>=4) and not collision[y*w+x]&2}
 for y in range(h):
  for x in range(w):
   flags=collision[y*w+x]
   if interior:key='interior-wall' if flags&1 else 'floor'
   elif flags&2:
    mask=sum(bit for dx,dy,bit in [(0,-1,1),(1,0,2),(0,1,4),(-1,0,8)] if 0<=x+dx<w and 0<=y+dy<h and collision[(y+dy)*w+x+dx]&2);key='water-'+str(mask)
   elif x==0 or y==0 or x==w-1 or y==h-1:key='boundary'
   elif (x,y) in pathcells:
    mask=sum(bit for dx,dy,bit in [(0,-1,1),(1,0,2),(0,1,4),(-1,0,8)] if (x+dx,y+dy) in pathcells);key='path-'+str(mask)
   else:key='grass-'+str((x*7+y*3)%4)
   ground.append(names[key])
 if not interior:
  for y in range(1,h-1):
   for x in range(1,w-1):
    if not collision[y*w+x]&3 and (x,y) not in pathcells:
     if (x*3+y*7)%13==0:put(decor,x,y,'flowers')
     elif (x+y*3)%11==0:put(decor,x,y,'tuft')
     elif (x*5+y)%19==0:put(decor,x,y,'pebbles')
  # Canopy/trunk detail hugs the already blocked perimeter. No new blockers.
  for x,y in [(0,0),(12,0),(16,0),(28,0),(0,6),(28,6)]:
   for ty in range(3):
    for tx in range(2):put(above if ty<2 else decor,x+tx,y+ty,f'tree-{tx}-{ty}')
  for ty in range(4):
   for tx in range(4):put(above if ty<3 else decor,tx,6+ty,f'grand-{tx}-{ty}')
  for x in [1,2,6,9,10,11,15,16,17,24,25,26,27]:put(decor,x,8,'fence')
  for x,y in [(8,3),(20,6)]:put(decor,x,y,'sign')
  for x in [8,9,10,11]:
   for y in [1,2]:put(decor,x,y,'tall-grass')
  # Existing home: upper roof/wall art is a canopy overlay, never a collision source.
  for y in range(2):
   for x in range(5):put(above,20+x,1+y,f'roof-{"left" if x==0 else "right" if x==4 else "middle"}-{y}')
  for x in range(5):put(decor,20+x,3,'wall-left' if x==0 else 'wall-right' if x==4 else 'window' if x in [1,3] else 'wall')
  for x in range(5):put(decor,20+x,4,'wall-left' if x==0 else 'wall-right' if x==4 else 'window' if x in [1,3] else 'door-upper')
  for x in [20,21,23,24]:put(decor,x,5,'porch')
  put(decor,22,5,'door-lower')
 else:
  put(decor,7,8,'door')
 for key,data in [('ground',ground),('decor',decor),('above',above)]:layers[key]['data']=data
 # Associate original authored tilesheet without exposing it to collision compiler.
 m['tilesets']=[{'firstgid':1,'name':'pokefolio-town','tilewidth':16,'tileheight':16,'tilecount':len(tiles),'columns':16,'image':'../../public'+manifest['tiles']['image'],'imagewidth':tileSheet.w,'imageheight':tileSheet.h}]
 p.write_text(json.dumps(m,indent=2)+'\n')
for name in ['m1-town','test-town','m1-interior-test','interior-test']:paint_map(name)

# Distinct but sparse interiors: flat rugs do not imply new collision.
for filename,fixture in [('m1-interior-test','home-shelf'),('m1-cottage','cottage-cabinet'),('m1-workshop','workshop-console')]:
 p=ROOT/'assets-src/maps'/f'{filename}.tmj';m=json.loads(p.read_text());layers={l['name']:l for l in m['layers'] if l['type']=='tilelayer'}
 w=m['width'];collision=layers['collision']['data'];decor=layers['decor']['data']
 # Reuse the approved interactive fixture and blocked rear counter row.
 for x,y in [(10,5)]+([(x,3) for x in range(3,12)] if filename!='m1-interior-test' else []):
  assert collision[y*w+x]&1
  decor[y*w+x]=names[fixture]
 for x,name in [(4,'wall-print'),(11,'wall-clock')]:
  assert collision[x]&1;decor[x]=names[name]
 for x,y in [(6,6),(7,6),(8,6)]:
  assert not collision[y*w+x]&3;decor[y*w+x]=names['rug']
 p.write_text(json.dumps(m,indent=2)+'\n')

# P11 visual clustering on the frozen P9 map. Only decorative tile paint changes.
p=ROOT/'assets-src/maps/m1-town.tmj';m=json.loads(p.read_text());w=m['width'];layers={l['name']:l for l in m['layers'] if l['type']=='tilelayer'}
decor=layers['decor']['data'];ground=layers['ground']['data'];collision=layers['collision']['data']
for at,tile in enumerate(decor):
 if tile in [names['flowers'],names['tuft'],names['pebbles']]:decor[at]=0
# Flower beds cluster beside homes and the route; quiet grass between landmarks.
for ox,oy,points in [(17,2,[(0,0),(1,0),(1,1)]),(3,6,[(0,1),(1,1),(0,2)]),(12,8,[(0,0),(1,0),(1,1)]),(3,14,[(0,0),(1,0),(0,1)]),(23,9,[(0,0),(1,0),(0,1)]),(23,17,[(0,0),(1,0),(0,1)]),(32,16,[(0,0),(1,0),(0,1)])]:
 for dx,dy in points:
  at=(oy+dy)*w+ox+dx
  if not collision[at]&3 and not decor[at] and ground[at] in [names['grass-'+str(i)] for i in range(4)]:decor[at]=names['flowers']
for x,y in [(2,4),(11,3),(13,7),(4,9),(18,9),(23,11),(30,10),(28,18),(25,20),(10,19)]:
 at=y*w+x
 if not collision[at]&3 and not decor[at] and ground[at] in [names['grass-'+str(i)] for i in range(4)]:decor[at]=names['tuft']
m['tilesets']=[{'firstgid':1,'name':'pokefolio-town','tilewidth':16,'tileheight':16,'tilecount':len(tiles),'columns':16,'image':'../../public'+manifest['tiles']['image'],'imagewidth':tileSheet.w,'imageheight':tileSheet.h}]
p.write_text(json.dumps(m,indent=2)+'\n')
