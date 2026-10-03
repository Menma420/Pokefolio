"""Original Pokefolio pixel artwork. Coordinates and masks are authored here; no external images.
Run: python3 assets-src/world/build.py
"""
from pathlib import Path
import json, hashlib, struct, zlib, math
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'public/assets/world'
P={'ink':'#283D38','grass':'#88B875','grassShade':'#66965E','grassLight':'#A4CE89','leaf':'#4B805C','leafDark':'#365C48','leafLight':'#80AA6A','wood':'#98694E','woodDark':'#614C3F','woodLight':'#C79D6A','sand':'#DEC998','sandShade':'#C3AD7D','sandLight':'#F0DDAE','water':'#5CA5AE','waterDark':'#417D91','waterLight':'#A5D3CB','roof':'#A76755','roofDark':'#794D49','roofLight':'#CE9772','wall':'#E3D5AF','wallShade':'#BEAF8A','wallLight':'#F3E7C6','stone':'#9CAA95','stoneShade':'#748672','stoneLight':'#C9D1B5','flower':'#D7A0A0','flowerLight':'#F1D5B5'}
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
 for x,y in [(2,3),(10,11),(6,8)] if v==0 else [(12,4),(3,12)] if v==1 else [(5,3),(11,12)] if v==2 else [(3,7),(12,2)]:
  a.dot(x,y,P['grassShade']);a.dot(x+1,y+1,P['grassShade']);a.dot(x+2,y,P['grassLight'])
 tile('grass-'+str(v),a)
# Path masks N/E/S/W; banks connect exactly across neighbouring tiles.
for mask in range(16):
 a=Art(16,16,P['sand'])
 for x,y in [(3,4),(12,10),(6,13)]:a.rect(x,y,2,1,P['sandShade'])
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
    x,y=(i,d) if side=='n' else (15-d,i) if side=='e' else (i,15-d) if side=='s' else (d,i)
    a.dot(x,y,c)
 tile('water-'+str(mask),a)
# Connected perimeter stone embankment with dark silhouette and grassy top.
a=Art(16,16,P['grass']);a.rect(0,4,16,12,P['ink']);a.rect(0,4,16,2,P['stoneLight']);a.rect(1,7,14,8,P['stone']);a.line(0,11,15,11,P['stoneShade']);a.line(7,7,7,10,P['ink']);a.line(3,12,3,15,P['ink']);tile('boundary',a)
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
# Tree silhouette is authored scanlines, independent of collisions (canopy overhang).
tree=Art(32,48)
for y,left,right in [(0,13,18),(1,10,21),(2,8,23),(3,7,24),(4,5,26),(5,4,27),(6,3,28),(7,2,29),(8,2,29),(9,1,30),(10,1,30),(11,1,30),(12,0,31),(13,0,31),(14,0,31),(15,0,31),(16,1,30),(17,1,30),(18,2,29),(19,2,29),(20,3,28),(21,4,27),(22,4,27),(23,6,25),(24,8,23),(25,11,20)]:
 tree.rect(left,y,right-left+1,1,P['ink']);tree.rect(left+1,y,right-left-1,1,P['leafDark'] if y>18 else P['leaf'])
# Hand-authored leaf clusters with scalloped rims and cut-in veins.
for x,y,w in [(10,3,6),(19,5,5),(5,8,7),(15,10,6),(23,12,5),(7,15,5),(15,18,7)]:
 tree.rect(x+1,y,w-2,1,P['leafLight']);tree.rect(x,y+1,w,2,P['leafLight']);tree.rect(x+1,y+3,w-1,1,P['leaf']);tree.dot(x,y+3,P['leafDark']);tree.dot(x+w-1,y,P['leafDark'])
for x,y in [(7,5),(15,7),(4,14),(12,12),(20,15),(11,20),(24,19)]:
 tree.dot(x,y,P['leafDark']);tree.dot(x+1,y+1,P['leafDark']);tree.dot(x+2,y,P['leafLight'])
tree.rect(13,24,7,16,P['ink']);tree.rect(14,26,5,13,P['leafDark']);tree.rect(15,27,2,11,P['leaf']);tree.rect(10,39,13,2,P['ink']);tree.rect(11,39,11,1,P['leafDark'])
for ty in range(3):
 for tx in range(2):tile(f'tree-{tx}-{ty}',tree.crop(tx*16,ty*16,16,16))
# Landmark grand tree, larger crown assembled from the same restrained leaf ramp.
grand=Art(64,64)
for ox,oy in [(0,4),(30,4),(15,0),(8,17),(24,17)]:grand.blit(tree.crop(0,0,32,26),ox,oy)
grand.rect(27,36,10,25,P['ink']);grand.rect(28,39,8,20,P['leafDark']);grand.rect(30,40,3,19,P['leaf']);grand.rect(23,59,19,2,P['ink'])
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
# Sprites: four original designs, four directions, stand + two opposite footfalls.
CHARACTERS={
 'player':{'outline':'#283D38','skin':'#D7AA79','skinShade':'#B77E58','cloth':'#427F8D','light':'#8ABBA9','pants':'#555971','accent':'#E8D5A7'},
 'npc-guide':{'outline':'#333A43','skin':'#D5A77F','skinShade':'#AE775B','cloth':'#9C694E','light':'#D4AC79','pants':'#687A75','accent':'#E7D7AA'},
 'npc-neighbor':{'outline':'#403846','skin':'#D6A780','skinShade':'#B17B65','cloth':'#967D9D','light':'#C7A8B5','pants':'#637783','accent':'#E7DCC0'},
 'challenger':{'outline':'#343C43','skin':'#CCA075','skinShade':'#AB765B','cloth':'#8A555C','light':'#BD8490','pants':'#535E70','accent':'#E0CEAA'},
}
def character(kind,direction,step):
 c=CHARACTERS[kind];a=Art(16,32);o=c['outline'];skin=c['skin'];shade=c['skinShade'];shirt=c['cloth'];light=c['light'];pants=c['pants'];accent=c['accent'];bob=1 if step else 0;y=2+bob
 # Original large-headed silhouette, side-part haircut; no borrowed hats or costume.
 for yy,left,right in [(0,5,10),(1,3,11),(2,2,12),(3,1,13),(4,1,13),(5,1,13),(6,2,13),(7,2,13),(8,3,12),(9,3,12),(10,4,11),(11,5,10)]:a.rect(left,y+yy,right-left+1,1,o)
 a.rect(4,y+1,6,1,pants);a.rect(3,y+2,3,1,pants)
 if direction=='up':
  a.rect(5,y+9,6,2,shade);a.rect(4,y+5,8,3,o);a.rect(3,y+3,2,2,pants)
 elif direction=='down':
  a.rect(3,y+4,9,5,skin);a.rect(4,y+9,7,1,shade);a.rect(3,y+4,3,1,o);a.dot(4,y+6,o);a.dot(10,y+6,o);a.rect(6,y+9,3,1,shade);a.dot(7,y+7,shade)
 else:
  right=direction=='right';a.rect(7 if right else 2,y+4,6,5,skin);a.rect(9 if right else 2,y+9,3,1,shade);a.dot(11 if right else 3,y+6,o);a.dot(13 if right else 1,y+7,skin);a.rect(4 if right else 8,y+4,3,4,o);a.dot(6 if right else 8,y+8,shade)
 if kind=='npc-guide':
  a.rect(3,y,9,3,shirt);a.rect(4,y,7,1,light);a.rect(1 if direction=='left' else 9,y+3,5,1,accent)
 if kind=='npc-neighbor':a.rect(4,y,8,2,shirt);a.dot(3,y+2,light);a.dot(4,y+1,accent);a.rect(12,y+5,2,5,o)
 if kind=='challenger':a.rect(4,y+1,7,1,pants);a.dot(10,y,accent);a.rect(9 if direction=='right' else 4,y+9,3,1,shade)
 a.rect(6,14+bob,4,3,o);a.rect(7,14+bob,2,2,skin)
 a.rect(4,16+bob,8,9,o);a.rect(5,17+bob,6,7,shirt);a.rect(5,17+bob,2,3,light);a.rect(7,16+bob,2,2,accent)
 if direction=='up':a.rect(6,17+bob,5,6,accent);a.rect(7,18+bob,3,4,shirt);a.line(10,18+bob,10,22+bob,o)
 if kind=='challenger':a.rect(3,17+bob,1,7,o);a.rect(12,17+bob,1,7,o);a.line(8,18+bob,8,24+bob,o)
 shift=1 if step==1 else -1 if step==2 else 0
 for x,d in [(3,shift),(11,-shift)]:
  a.rect(x,17+bob+d,2,7,o);a.rect(x+1 if x==3 else x,18+bob+d,1,3,shirt);a.rect(x+1 if x==3 else x,21+bob+d,1,2,skin)
 for x,active in [(5,step==1),(9,step==2)]:
  top=25;bottom=30 if not active else 28
  a.rect(x,top,3,bottom-top+1,o);a.rect(x+1,top,1,bottom-top-1,pants);a.rect(x-1,bottom,4,2,o);a.rect(x,bottom,2,1,accent if active else pants)
 if direction in ['left','right']:a.line(9 if direction=='right' else 5,18+bob,9 if direction=='right' else 5,23+bob,o)
 return a
sprites=[];frames={};tags={}
for kind in CHARACTERS:
 for direction in ['down','left','right','up']:
  for step in range(3):
   name=f'{kind}-{direction}-{step}';a=character(kind,direction,step);frames[name]={'frame':{'x':step*16,'y':len(sprites)//3*32,'w':16,'h':32},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':16,'h':32},'sourceSize':{'w':16,'h':32},'pivot':{'x':0.5,'y':1}};sprites.append(a)
  frames[f'{kind}-{direction}-idle']=frames[f'{kind}-{direction}-0'].copy();tags[f'{kind}-{direction}']={'frames':[f'{kind}-{direction}-{s}' for s in [0,1,0,2]],'idle':f'{kind}-{direction}-idle'}
spriteSheet=Art(48,len(sprites)//3*32)
for i,a in enumerate(sprites):spriteSheet.blit(a,(i%3)*16,(i//3)*32)
tileSheet=Art(16*16,math.ceil(len(tiles)/16)*16);tileFrames={}
for i,(name,a) in enumerate(tiles):
 x=i%16*16;y=i//16*16;tileSheet.blit(a,x,y);tileFrames[str(i+1)]={'frame':{'x':x,'y':y,'w':16,'h':16},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':16,'h':16},'sourceSize':{'w':16,'h':16}}
def save(name,art,frames,tags=None):
 png=art.png();image=f'{name}.{hashlib.sha256(png).hexdigest()[:12]}.png';OUT.mkdir(parents=True,exist_ok=True);(OUT/image).write_bytes(png)
 atlas={'frames':frames,'meta':{'app':'Pokefolio original pixel authoring','image':image,'size':{'w':art.w,'h':art.h},'scale':'1','frameTags':tags or {}}};data=(json.dumps(atlas,indent=2)+'\n').encode();filename=f'{name}.{hashlib.sha256(data).hexdigest()[:12]}.json';(OUT/filename).write_bytes(data);return {'image':'/assets/world/'+image,'atlas':'/assets/world/'+filename}
manifest={'tiles':save('town-tiles',tileSheet,tileFrames),'characters':save('town-characters',spriteSheet,frames,tags),'tileSize':16,'artBox':{'width':16,'height':32},'footprint':{'width':16,'height':16},'tileIds':names,'palettes':{'tiles':palettes,'characters':CHARACTERS},'originality':'Authored from integer pixel shapes in assets-src/world/build.py. No external artwork, tracing, extraction, fonts or logos.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'assets-src/world/palette-sheet.json').write_text(json.dumps(manifest['palettes'],indent=2)+'\n')
print('Authored',len(tiles),'tiles and',len(sprites),'character frames; original lossless PNG + JSON-hash atlases.')
# Repaint visual layers of authored Tiled sources ONLY. Retain all collisions, objects/routes/rooms.
def paint_map(name):
 p=ROOT/'assets-src/maps'/f'{name}.tmj';m=json.loads(p.read_text());w=m['width'];h=m['height'];layers={l['name']:l for l in m['layers'] if l['type']=='tilelayer'};
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
