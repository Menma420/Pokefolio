"""Original Pokefolio B3 artwork: integer-pixel masks, no external visual inputs."""
from pathlib import Path
import json,struct,zlib,hashlib,math
ROOT=Path(__file__).resolve().parents[2]
class Art:
 def __init__(self,w,h,bg=None):self.w=w;self.h=h;self.p=[bg]*(w*h)
 def dot(self,x,y,c):
  if 0<=x<self.w and 0<=y<self.h:self.p[y*self.w+x]=c
 def rect(self,x,y,w,h,c):
  for yy in range(y,y+h):
   for xx in range(x,x+w):self.dot(xx,yy,c)
 def poly(self,points,c):
  for y in range(min(p[1] for p in points),max(p[1] for p in points)+1):
   xs=[]
   for i,(x1,y1) in enumerate(points):
    x2,y2=points[(i+1)%len(points)]
    if min(y1,y2)<=y<max(y1,y2):xs.append(x1+(y-y1)*(x2-x1)/(y2-y1))
   xs.sort()
   for i in range(0,len(xs)-1,2):
    for x in range(round(xs[i]),round(xs[i+1])+1):self.dot(x,y,c)
 def png(self):
  def chunk(k,d):return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
  raw=b''.join(b'\0'+b''.join(bytes.fromhex(c[1:])+b'\xff' if c else b'\0\0\0\0' for c in self.p[y*self.w:(y+1)*self.w]) for y in range(self.h))
  return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
 def data(self):
  palette=[None]+sorted(set(c for c in self.p if c));idx={c:i for i,c in enumerate(palette)};runs=[]
  for c in self.p:
   i=idx[c]
   if runs and runs[-2]==i:runs[-1]+=1
   else:runs.extend([i,1])
  return {'width':self.w,'height':self.h,'palette':palette,'runs':runs}
O='#283D38';D='#496A57';G='#779C70';L='#A9BC82';C='#EFE0AC';S='#BEA579';E='#8A7558';W='#91B6AE';B='#527D88'
bg=Art(240,160,'#88A780')
# Quiet distant sky, tree silhouettes, pond sliver, foreground turf.
for y,h,c in [(0,20,'#B8C9B1'),(20,17,'#A9C2AC'),(37,15,'#91AE94'),(52,16,G),(68,44,'#A7B782'),(112,48,'#849B74')]:bg.rect(0,y,240,h,c)
for x,top,w in [(-8,29,30),(25,32,25),(57,35,23),(90,33,26),(121,35,22),(155,30,35),(191,34,25),(220,28,32)]:
 bg.poly([(x,52),(x,top+9),(x+5,top+9),(x+5,top+3),(x+12,top+3),(x+12,top),(x+20,top),(x+20,top+5),(x+w-3,top+5),(x+w-3,top+12),(x+w,top+12),(x+w,53)],D)
 bg.rect(x+7,top+9,11,2,G);bg.rect(x+12,top+14,7,1,G)
bg.poly([(0,58),(18,56),(36,57),(58,61),(69,65),(61,71),(35,73),(0,70)],D)
bg.poly([(0,61),(19,59),(36,61),(55,64),(60,66),(36,70),(0,67)],B)
for x,y,w in [(2,62,11),(23,64,15),(7,67,9)]:bg.rect(x,y,w,1,W)
for x in range(0,240,8):
 y=53+(x//8%3);bg.rect(x,y,5,1,L);bg.rect(x+2,y+2,4,1,D)
for x,y in [(8,78),(30,83),(112,73),(125,92),(223,89),(211,104),(13,106),(109,106),(88,63)]:
 bg.rect(x,y,1,3,D);bg.rect(x+2,y+1,1,2,D);bg.dot(x-1,y,L);bg.dot(x+4,y+2,L)
for x,y in [(10,54),(78,58),(114,62),(226,57)]:bg.rect(x,y,2,2,C);bg.dot(x+1,y+2,S)
def platform(w,h):
 a=Art(w,h);a.poly([(8,5),(22,1),(w-23,1),(w-9,5),(w-2,10),(w-1,16),(w-10,h-2),(w-27,h-1),(23,h-1),(6,h-4),(0,15),(1,10)],O)
 a.poly([(9,6),(23,2),(w-24,2),(w-10,6),(w-3,11),(w-2,15),(w-12,h-4),(24,h-3),(7,h-6),(2,14),(3,10)],D)
 a.poly([(11,6),(24,4),(w-25,4),(w-12,7),(w-6,11),(w-9,15),(w-25,19),(25,19),(8,15),(5,11)],L)
 a.poly([(22,7),(w-25,6),(w-12,10),(w-14,14),(w-29,17),(25,17),(12,13)],C)
 a.rect(29,8,w-59,1,'#F9EBC4');a.rect(20,15,11,1,S);a.rect(w-34,13,12,1,S)
 for x in range(14,w-13,12):a.rect(x,h-6,2,1,G);a.dot(x+2,h-5,L)
 return a
visitor=Art(64,64);cloth='#946E55';highlight='#C6A476';hair='#353D41';skin='#D4A97C'
visitor.poly([(18,60),(15,45),(18,34),(25,28),(27,22),(20,17),(19,9),(25,3),(39,2),(48,8),(50,17),(45,24),(43,31),(52,36),(57,47),(58,63)],O)
visitor.poly([(21,13),(23,7),(40,5),(46,10),(46,21),(41,28),(26,24)],hair)
visitor.poly([(21,8),(27,3),(40,4),(47,9),(47,12),(22,12)],cloth);visitor.rect(24,8,20,2,highlight);visitor.rect(19,12,29,3,C)
visitor.poly([(42,19),(47,18),(46,24),(42,27),(39,24)],skin)
visitor.poly([(25,28),(39,28),(43,33),(50,38),(54,51),(54,63),(19,63),(18,46),(22,36)],cloth)
visitor.poly([(25,32),(39,31),(43,35),(39,38),(26,37),(21,41)],highlight)
visitor.poly([(22,40),(27,38),(31,44),(30,61),(20,61),(19,48)],'#775B4F')
visitor.poly([(39,39),(46,39),(51,48),(48,57),(39,58)],highlight);visitor.rect(38,40,2,21,O);visitor.rect(29,57,9,2,O)
visitor.poly([(44,55),(51,52),(54,55),(52,61),(46,63),(41,61)],skin);visitor.rect(23,61,20,3,hair)
front=Art(64,64);skin='#D7AA79';shade='#B77E58';blue='#427F8D';light='#8ABBA9'
front.poly([(24,31),(23,27),(19,22),(18,13),(22,6),(30,2),(40,4),(46,11),(47,20),(43,29),(38,32),(41,37),(50,39),(57,47),(59,60),(48,63),(15,63),(10,53),(10,45),(17,38),(25,36)],O)
front.poly([(24,12),(39,10),(43,15),(43,24),(38,29),(31,31),(24,27),(22,19)],skin);front.rect(39,17,6,6,shade)
front.poly([(20,14),(24,7),(31,5),(39,7),(43,12),(30,11),(25,17),(23,24),(20,22)],'#333A43');front.rect(27,5,7,2,'#555971');front.rect(27,18,3,2,O);front.rect(38,18,3,2,O);front.rect(32,25,6,1,shade)
front.rect(28,29,10,8,skin);front.rect(31,31,7,2,shade)
front.poly([(19,39),(26,35),(32,42),(40,36),(48,41),(51,55),(47,63),(18,63),(13,51)],blue)
front.poly([(19,40),(25,38),(29,46),(23,52),(15,49)],light);front.poly([(34,41),(39,37),(42,40),(38,49)],C);front.rect(32,43,2,18,O)
front.poly([(44,45),(49,43),(56,47),(60,42),(63,43),(63,51),(56,56),(47,54)],O);front.poly([(48,46),(55,50),(60,45),(62,46),(60,51),(55,53),(48,51)],skin)
front.poly([(14,51),(19,50),(23,57),(27,59),(25,62),(18,61)],skin);front.rect(29,60,17,3,'#555971')
assets={'background':bg,'opponent-platform':platform(96,24),'visitor-platform':platform(104,24),'visitor-back':visitor,'uttkarsh-front':front}
# Every project gets a distinct original emblem, drawn as a tangible RPG insignia.
slugs=['acko-clinic','karsh','nomnom-planner','pokefolio','pdf-qa','weatherpi','portscanner','parallel-distributed-computing','arise','pokemon-elo-rating','vanix','chatroomapp']
inks=[('#527D88','#A4D2BE'),('#795D8E','#BC9FCD'),('#9A704E','#DFC493'),('#49775F','#ABD39A'),('#656C9D','#ADBAD7'),('#476F89','#A3CDDB'),('#596B7C','#ABC3D1'),('#61788B','#B7CBD6'),('#7A648F','#B5A2CF'),('#947347','#DFC184'),('#75648B','#BCA5C8'),('#567F7C','#ABCEC1')]
for i,slug in enumerate(slugs):
 a=Art(64,64);dark,bright=inks[i]
 def r(x,y,w,h,c):a.rect(x,y,w,h,c)
 def p(points,c):a.poly(points,c)
 if i==0:
  p([(19,15),(44,15),(49,20),(49,46),(44,51),(19,51),(14,46),(14,20)],O);r(18,18,28,28,dark);r(20,20,24,23,bright);r(28,23,8,19,O);r(22,29,20,7,O);r(30,24,4,16,C);r(24,31,16,3,C);r(21,48,23,2,S)
 elif i==1:
  p([(31,9),(49,24),(48,41),(32,54),(15,41),(15,24)],O);p([(31,12),(45,25),(45,40),(32,50),(18,39),(18,26)],dark);p([(32,18),(39,31),(33,44),(26,32)],bright);p([(31,19),(32,30),(20,36),(29,33)],C);r(31,29,3,5,O)
 elif i==2:
  p([(12,24),(50,24),(46,45),(39,50),(22,50),(16,44)],O);p([(16,27),(46,27),(42,42),(37,46),(24,46),(20,40)],dark);p([(13,24),(18,18),(28,20),(33,15),(44,18),(49,24)],bright);r(16,24,32,3,C);r(24,31,15,2,C);r(36,7,3,13,O);r(40,10,2,9,S)
 elif i==3:
  p([(31,9),(49,19),(49,42),(32,54),(14,42),(14,20)],O);p([(31,13),(45,22),(45,39),(32,50),(18,39),(18,23)],dark);p([(24,22),(32,19),(39,22),(39,39),(31,42),(24,39)],C);r(29,23,3,15,O);r(34,26,3,4,bright);r(26,26,2,3,dark);r(34,33,3,4,dark)
 elif i==4:
  p([(18,10),(38,10),(46,18),(46,43),(36,52),(17,52)],O);p([(21,13),(35,13),(43,21),(43,43),(33,48),(20,48)],C);p([(35,13),(35,21),(43,21)],S);r(24,24,13,2,dark);r(24,30,10,2,dark);p([(33,31),(44,32),(49,37),(48,46),(43,50),(34,48),(30,42)],O);p([(35,35),(43,35),(46,40),(43,46),(36,45),(33,40)],bright);r(37,38,6,2,dark);r(40,42,2,2,dark)
 elif i==5:
  p([(18,23),(18,19),(24,14),(36,14),(43,19),(43,23),(49,23),(52,28),(50,36),(15,36),(12,29)],O);p([(17,25),(22,25),(22,20),(26,17),(35,17),(40,21),(40,26),(47,26),(48,32),(17,32)],bright);r(22,39,3,8,B);r(31,40,3,10,B);r(41,38,3,8,B);r(28,53,10,3,O)
 elif i==6:
  p([(31,10),(47,21),(49,39),(33,53),(15,42),(14,23)],O);p([(31,14),(43,23),(45,37),(33,48),(19,40),(18,25)],dark);r(30,20,3,22,bright);r(24,29,16,3,bright);p([(31,18),(39,30),(33,35)],C);r(22,40,4,3,S)
 elif i==7:
  for x,y in [(15,15),(38,15),(26,37)]:r(x-2,y-2,17,16,O);r(x,y,13,10,dark);r(x+2,y+2,9,6,bright);r(x+3,y+12,7,2,S)
  r(29,21,7,2,C);r(21,31,2,8,C);r(43,31,2,8,C);r(21,36,22,2,C)
 elif i==8:
  p([(18,48),(18,30),(26,30),(26,19),(34,19),(34,9),(42,9),(42,48)],O);r(21,33,6,13,dark);r(29,22,5,24,bright);r(37,12,3,34,C);p([(13,48),(49,48),(45,53),(17,53)],dark);r(40,8,7,2,C)
 elif i==9:
  p([(17,15),(47,15),(47,35),(41,43),(36,44),(36,50),(46,50),(46,54),(18,54),(18,50),(27,50),(27,44),(22,42),(17,35)],O);p([(21,18),(43,18),(43,34),(37,40),(27,40),(21,33)],bright);r(30,41,3,10,S);r(21,51,22,1,C);p([(31,22),(34,27),(40,28),(35,32),(36,38),(31,35),(26,38),(27,32),(23,28),(29,27)],dark)
 elif i==10:
  p([(19,17),(25,11),(39,11),(46,17),(49,31),(46,42),(39,44),(39,31),(43,29),(41,19),(37,16),(27,16),(23,20),(21,29),(25,31),(25,44),(18,42),(15,30)],O);p([(20,20),(24,15),(39,15),(43,20),(45,30),(42,30),(39,21),(35,19),(27,19),(24,23)],bright);r(19,31,5,9,dark);r(41,32,5,8,dark);r(34,44,10,2,S);r(30,43,6,5,C)
 else:
  p([(12,17),(39,17),(44,22),(44,36),(29,36),(23,44),(23,36),(12,36)],O);r(15,20,26,13,bright);p([(29,29),(50,29),(53,32),(53,46),(45,46),(45,51),(37,46),(29,46)],O);r(32,32,18,11,dark);r(20,25,3,3,dark);r(27,25,3,3,dark);r(34,25,3,3,dark);r(35,37,12,2,C)
 assets['project-'+slug]=a
 # Palette-preserving cell reduction yields the matching 16px Party thumbnail.
 t=Art(16,16)
 for y in range(16):
  for x in range(16):
   colors=[a.p[(y*4+dy)*64+x*4+dx] for dy in range(4) for dx in range(4)]
   nonempty=[c for c in colors if c]
   if len(nonempty)>=4:t.dot(x,y,max(set(nonempty),key=lambda c:(nonempty.count(c),c)))
 assets['thumb-'+slug]=t
# Tiny original type pictograms, not borrowed logos or type lettering fonts.
for kind in ['BACKEND','FULL_STACK','AI','IOT','NETWORKING','BLOCKCHAIN']:
 a=Art(16,8,O);a.rect(1,1,14,6,D)
 if kind=='BACKEND':a.rect(3,2,10,1,C);a.rect(3,5,10,1,C);a.dot(12,3,L)
 elif kind=='FULL_STACK':a.rect(3,2,10,2,L);a.rect(5,5,6,1,C)
 elif kind=='AI':a.rect(6,2,4,4,C);a.rect(3,3,2,2,L);a.rect(11,3,2,2,L)
 elif kind=='IOT':a.dot(8,5,C);a.rect(6,3,5,1,L);a.rect(4,1,9,1,L)
 elif kind=='NETWORKING':a.rect(7,2,2,4,C);a.rect(3,3,10,1,L);a.rect(2,2,2,3,C);a.rect(12,2,2,3,C)
 else:a.rect(3,2,4,4,C);a.rect(9,2,4,4,L);a.rect(6,3,4,2,C)
 assets['type-'+kind]=a
out=ROOT/'public/assets/battle';out.mkdir(parents=True,exist_ok=True);records={};rle={}
for key,a in assets.items():
 blob=a.png();filename=key+'.'+hashlib.sha256(blob).hexdigest()[:12]+'.png';(out/filename).write_bytes(blob);records[key]={'src':'/assets/battle/'+filename,'width':a.w,'height':a.h};rle[key]=a.data()
(out/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
(ROOT/'assets-src/battle/manifest.json').write_text(json.dumps(records,indent=2)+'\n')
(ROOT/'assets-src/battle/art.json').write_text(json.dumps(rle,separators=(',',':'))+'\n')
(ROOT/'assets-src/battle/palette-sheet.json').write_text(json.dumps({k:sorted(set(c for c in a.p if c)) for k,a in assets.items()},indent=2)+'\n')
print('Authored',len(assets),'battle assets')
