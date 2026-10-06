"""Original Pokefolio P11 battle artwork: integer-pixel masks, no external visual inputs."""
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
# Open field battle stage: pale sky, layered tree line, distant bank and near turf.
bg=Art(240,160,'#A9BC82')
bg.rect(0,0,240,28,'#B8C9B1');bg.rect(0,28,240,13,'#A9C2AC')
for x,top,w in [(-8,23,35),(27,28,30),(60,26,28),(92,31,28),(126,24,34),(163,27,26),(193,23,31),(226,27,26)]:
 bg.poly([(x,52),(x,top+9),(x+4,top+9),(x+4,top+3),(x+12,top+3),(x+12,top),(x+21,top),(x+21,top+4),(x+w-3,top+4),(x+w-3,top+11),(x+w,top+11),(x+w,52)],'#91AE94')
 bg.rect(x+9,top+6,9,2,'#A9C2AC')
bg.poly([(0,49),(25,48),(44,51),(65,49),(94,52),(123,49),(150,52),(180,48),(207,51),(240,48),(240,70),(0,70)],G)
bg.rect(0,65,240,47,L)
# Sparse midground detail, a shoreline on the far left; never a tiled web backdrop.
bg.poly([(0,51),(15,52),(23,56),(21,60),(9,62),(0,61)],D);bg.poly([(0,54),(14,55),(18,57),(11,59),(0,58)],B);bg.rect(1,56,9,1,W)
for x,y in [(10,69),(100,60),(118,84),(230,80),(120,106),(214,108)]:
 bg.rect(x,y,1,3,G);bg.rect(x+3,y+1,1,2,G);bg.dot(x+1,y+3,D)
# Near grass bank remains largely behind the lower-third message area.
bg.poly([(0,107),(23,105),(43,109),(68,106),(99,109),(128,105),(161,109),(191,106),(218,109),(240,104),(240,160),(0,160)],G)
for x in range(0,240,21):bg.rect(x,109+x//21%3,6,1,L)
def platform(w,h):
 a=Art(w,h);a.poly([(8,5),(22,1),(w-23,1),(w-9,5),(w-2,10),(w-1,16),(w-10,h-2),(w-27,h-1),(23,h-1),(6,h-4),(0,15),(1,10)],O)
 a.poly([(9,6),(23,2),(w-24,2),(w-10,6),(w-3,11),(w-2,15),(w-12,h-4),(24,h-3),(7,h-6),(2,14),(3,10)],D)
 a.poly([(11,6),(24,4),(w-25,4),(w-12,7),(w-6,11),(w-9,15),(w-25,19),(25,19),(8,15),(5,11)],L)
 a.poly([(22,7),(w-25,6),(w-12,10),(w-14,14),(w-29,17),(25,17),(12,13)],C)
 a.rect(29,8,w-59,1,'#F9EBC4');a.rect(20,15,11,1,S);a.rect(w-34,13,12,1,S)
 for x in range(14,w-13,12):a.rect(x,h-6,2,1,G);a.dot(x+2,h-5,L)
 return a
# Trainer back pose is an actual cropped foreground silhouette, not a bust token.
visitor=Art(64,64);cloth='#946E55';highlight='#C6A476';hair='#353D41';skin='#D4A97C'
visitor.poly([(8,63),(9,42),(17,32),(24,27),(22,21),(17,16),(18,7),(24,2),(40,1),(48,7),(49,17),(45,25),(42,30),(53,38),(58,50),(61,63)],O)
visitor.poly([(19,9),(24,4),(40,3),(46,8),(47,14),(21,14)],cloth);visitor.rect(27,4,11,2,highlight);visitor.rect(16,14,34,4,O);visitor.rect(19,15,30,2,C)
visitor.poly([(21,19),(28,22),(40,21),(45,18),(44,26),(38,30),(28,27)],hair);visitor.poly([(43,20),(48,20),(46,26),(42,28)],skin)
visitor.poly([(18,36),(26,29),(37,29),(48,36),(55,49),(57,63),(11,63),(12,46)],cloth);visitor.poly([(19,36),(26,32),(38,32),(45,36),(43,39),(24,39)],highlight)
# Backpack has a stepped outline, shoulder straps and a dimensional flap.
visitor.poly([(22,39),(38,39),(42,44),(42,63),(18,63),(18,45)],O);visitor.rect(21,43,17,19,'#775B4F');visitor.rect(22,43,15,5,highlight);visitor.rect(24,50,11,1,O);visitor.rect(24,53,11,8,cloth);visitor.rect(28,52,3,4,C)
visitor.poly([(45,39),(51,42),(57,53),(56,61),(51,63),(47,57)],highlight);visitor.poly([(49,57),(55,55),(58,58),(57,63),(50,63)],skin)
# Consistent original field-cap trainer with a confident send-out arm.
front=Art(64,64);skin='#D7AA79';shade='#B77E58';blue='#427F8D';light='#8ABBA9'
front.poly([(15,63),(16,38),(23,33),(25,28),(20,23),(19,12),(23,5),(38,3),(46,9),(47,22),(41,29),(37,32),(42,35),(48,39),(54,34),(60,33),(63,38),(61,45),(52,49),(47,47),(49,63)],O)
front.poly([(23,13),(40,12),(43,17),(42,24),(36,29),(29,29),(24,25)],skin);front.rect(40,18,5,6,shade);front.rect(27,20,3,2,O);front.rect(37,20,3,2,O);front.rect(31,26,6,1,shade)
front.poly([(20,13),(24,6),(32,4),(40,6),(45,10),(45,14)],blue);front.rect(27,5,11,2,light);front.rect(18,14,30,3,O);front.rect(21,15,24,1,C)
front.rect(28,29,9,7,skin);front.rect(30,31,7,2,shade)
front.poly([(22,37),(28,34),(33,41),(39,34),(45,40),(46,57),(43,63),(19,63),(18,47)],blue);front.poly([(21,39),(26,37),(29,44),(24,48),(18,45)],light);front.poly([(35,40),(39,36),(41,39),(38,47)],C);front.rect(32,42,2,18,O)
front.poly([(45,40),(50,44),(55,40),(59,36),(61,38),(58,43),(52,47),(46,45)],skin);front.rect(58,34,3,2,shade)
front.poly([(17,49),(21,49),(23,55),(27,57),(25,61),(19,59)],skin);front.rect(25,60,18,4,'#555971')
assets={'background':bg,'opponent-platform':platform(96,24),'visitor-platform':platform(104,24),'visitor-back':visitor,'uttkarsh-front':front}
# Every project gets a distinct original emblem, drawn as a tangible RPG insignia.
slugs=['acko-clinic','karsh','nomnom-planner','pokefolio','pdf-qa','weatherpi','portscanner','parallel-distributed-computing','arise','pokemon-elo-rating','vanix','chatroomapp']
inks=[('#527D88','#A4D2BE'),('#795D8E','#BC9FCD'),('#9A704E','#DFC493'),('#49775F','#ABD39A'),('#656C9D','#ADBAD7'),('#476F89','#A3CDDB'),('#596B7C','#ABC3D1'),('#61788B','#B7CBD6'),('#7A648F','#B5A2CF'),('#947347','#DFC184'),('#75648B','#BCA5C8'),('#567F7C','#ABCEC1')]
for i,slug in enumerate(slugs):
 a=Art(64,64);dark,bright=inks[i]
 def r(x,y,w,h,c):a.rect(x,y,w,h,c)
 def p(points,c):a.poly(points,c)
 if i==0:
  # Clinic: portable care case with a clasp, handle and inset cross.
  p([(23,9),(38,9),(41,12),(41,20),(37,20),(37,14),(26,14),(26,20),(22,20),(22,12)],O)
  p([(16,19),(44,19),(50,25),(50,46),(44,52),(15,52),(11,47),(11,25)],O);p([(16,22),(43,22),(46,26),(46,44),(41,48),(15,48),(14,43),(14,27)],dark)
  r(17,25,26,19,bright);r(28,26,6,17,O);r(23,31,16,6,O);r(29,27,4,14,C);r(24,32,13,4,C);r(17,46,25,2,S);r(46,28,2,17,S);r(27,19,8,5,C);r(29,20,4,2,O)
 elif i==1:
  # Karsh: a small crystal-powered repository terminal, turned toward the visitor.
  p([(18,12),(43,12),(49,19),(47,40),(41,47),(16,47),(12,40),(14,18)],O);p([(18,15),(41,15),(44,19),(42,36),(19,36),(17,32)],dark)
  p([(20,18),(39,18),(41,22),(39,32),(20,32)],bright);r(23,21,7,2,C);r(23,26,13,2,O);r(20,38,22,4,S);r(24,39,15,1,C);p([(23,47),(39,47),(42,54),(18,54)],O);r(22,50,16,2,dark);r(46,21,2,17,S)
 elif i==2:
  # NomNom: a lidded meal vessel, steam and a serving spoon.
  p([(15,26),(47,26),(48,43),(42,51),(21,51),(14,43)],O);p([(18,29),(44,29),(44,41),(39,46),(23,46),(18,41)],dark);r(20,30,21,2,bright);r(19,42,21,2,S)
  p([(12,25),(17,20),(28,17),(29,13),(35,13),(36,17),(45,20),(50,25)],O);p([(17,24),(22,21),(40,21),(45,24)],bright);r(29,14,5,3,C);r(12,25,38,3,C);r(8,30,7,5,O);r(47,30,7,5,O)
  r(18,8,2,7,S);r(20,5,2,4,C);r(44,8,2,10,O)
 elif i==3:
  # Pokéfolio: original handheld portfolio device with a page-shaped display.
  p([(21,9),(42,9),(47,14),(47,47),(42,53),(20,53),(16,48),(16,15)],O);p([(21,12),(40,12),(44,16),(44,46),(39,49),(20,49),(19,45),(19,16)],dark)
  r(22,16,19,21,O);r(24,18,15,17,C);r(27,21,3,11,O);r(32,22,4,2,bright);r(32,28,4,2,dark);r(23,42,9,2,O);r(26,39,3,8,O);r(36,40,3,3,C);r(40,43,2,2,bright);r(21,48,20,1,S);r(44,17,1,28,S)
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
 # A restrained dark underside grounds each object without a web-card surround.
 original=a.p[:]
 for y in range(62,-1,-1):
  for x in range(64):
   if original[y*64+x] and not a.p[(y+1)*64+x]:a.dot(x,y+1,O)
 assets['project-'+slug]=a
 # Dedicated native thumbnails preserve the metaphor, with readable one-pixel rims.
 t=Art(16,16)
 def tr(x,y,w,h,c):t.rect(x,y,w,h,c)
 def tp(points,c):t.poly(points,c)
 if i==0:
  tr(2,2,12,12,O);tr(3,3,10,10,bright);tr(7,4,2,8,O);tr(4,7,8,2,O);tr(7,5,1,6,C);tr(5,7,6,1,C)
 elif i==1:
  tp([(7,1),(14,6),(13,11),(8,15),(2,11),(1,6)],O);tp([(7,3),(12,6),(11,10),(8,12),(4,10),(3,6)],dark);tp([(8,4),(10,8),(8,11),(6,8)],bright);tr(7,7,1,2,C)
 elif i==2:
  tp([(1,6),(14,6),(12,13),(4,13)],O);tp([(3,7),(12,7),(10,11),(5,11)],dark);tp([(2,5),(4,3),(7,4),(9,2),(12,3),(14,5)],bright);tr(2,5,12,1,C);tr(11,1,1,3,O)
 elif i==3:
  tp([(8,1),(14,5),(14,12),(8,15),(1,11),(1,5)],O);tp([(8,3),(12,6),(12,11),(8,13),(3,10),(3,6)],dark);tr(5,5,6,6,C);tr(7,6,1,4,O);tr(9,6,1,1,bright);tr(9,9,1,1,dark)
 elif i==4:
  tp([(3,1),(10,1),(13,4),(13,13),(3,13)],O);tp([(4,2),(9,2),(12,5),(12,12),(4,12)],C);tr(9,2,1,4,dark);tr(5,6,5,1,dark);tr(5,8,3,1,dark);tp([(10,8),(14,10),(14,13),(11,15),(8,12)],O);tr(10,10,3,2,bright)
 elif i==5:
  tp([(1,6),(3,4),(5,2),(10,2),(12,5),(15,6),(14,9),(2,9)],O);tp([(3,6),(5,4),(10,4),(12,6),(13,8),(3,8)],bright)
  for x,y in [(4,11),(8,12),(12,10)]:tr(x,y,1,3,B)
 elif i==6:
  tp([(7,1),(14,6),(13,11),(8,15),(1,11),(1,5)],O);tp([(7,3),(12,6),(11,10),(8,12),(3,10),(3,6)],dark);tr(7,4,1,7,bright);tr(4,7,7,1,bright);tp([(7,3),(10,7),(8,9)],C)
 elif i==7:
  for x,y in [(1,2),(10,2),(5,10)]:tr(x,y,5,4,O);tr(x+1,y+1,3,2,bright)
  tr(5,3,5,1,C);tr(3,6,1,5,C);tr(12,6,1,5,C);tr(3,10,10,1,C)
 elif i==8:
  tr(3,9,3,5,O);tr(6,6,3,8,O);tr(9,2,3,12,O);tr(4,10,1,3,dark);tr(7,7,1,6,bright);tr(10,3,1,10,C);tr(2,14,12,1,dark)
 elif i==9:
  tp([(3,2),(13,2),(12,9),(9,11),(9,13),(13,13),(13,15),(3,15),(3,13),(7,13),(7,11),(4,9)],O);tp([(5,3),(11,3),(10,8),(8,10),(6,8)],bright);tr(7,5,2,3,dark);tr(5,6,6,1,dark);tr(4,13,8,1,C)
 elif i==10:
  tp([(2,7),(3,3),(6,1),(10,1),(13,4),(14,8),(13,13),(10,13),(10,8),(12,6),(10,3),(6,3),(4,6),(6,8),(6,13),(2,12)],O);tr(3,8,2,4,dark);tr(11,8,2,4,dark);tr(6,2,4,1,bright);tr(8,13,5,1,C)
 else:
  tp([(1,2),(12,2),(12,9),(7,9),(4,12),(4,9),(1,9)],O);tr(2,3,9,5,bright);tp([(6,7),(15,7),(15,13),(12,13),(12,15),(10,13),(6,13)],O);tr(7,8,7,4,dark);tr(8,9,5,1,C)
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
