"""Original B2 integer-pixel artwork; no external images, fonts or traced shapes."""
from pathlib import Path
import json,struct,zlib,hashlib
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
sky=Art(240,160)
for y,c in [(0,'#20364C'),(24,'#344E68'),(48,'#536B83'),(72,'#7B8B9B'),(96,'#AFADA0')]:sky.rect(0,y,240,24,c)
# Authored stepped clouds and still crescent, not a character or UI ornament.
for x,y in [(30,17),(156,35)]:
 sky.rect(x+5,y,18,2,'#AEBBC1');sky.rect(x+2,y+2,25,3,'#AEBBC1');sky.rect(x,y+5,34,2,'#7E95A5')
sky.rect(205,13,7,8,'#ECE2C0');sky.rect(207,12,4,10,'#ECE2C0');sky.rect(210,12,4,7,'#20364C')
sky.rect(0,112,240,48,'#243E3A')
for x,y,w in [(69,127,34),(106,123,28),(180,119,43)]:
 sky.poly([(x-5,y),(x+w//2,y-13),(x+w+5,y),(x+w,y+4),(x,y+4)],'#172F34');sky.rect(x,y+3,w,25,'#304E46');sky.rect(x+4,y+6,4,5,'#506659');sky.rect(x+w-9,y+6,4,5,'#506659');sky.rect(x+w//2-2,y+12,5,13,'#172F34')
for x,y in [(16,113),(38,122),(230,121)]:
 sky.poly([(x,y-6),(x+7,y-3),(x+11,y+4),(x+9,y+13),(x+4,y+17),(x-6,y+15),(x-13,y+8),(x-11,y),(x-6,y-4)],'#172F34');sky.poly([(x,y-3),(x+6,y),(x+7,y+7),(x+3,y+12),(x-5,y+11),(x-9,y+5),(x-6,y)],'#304E46');sky.rect(x-2,y+13,4,26,'#172F34')
sky.poly([(138,144),(151,138),(173,139),(187,149),(176,159),(135,159),(126,151)],'#536B70');sky.rect(144,146,17,1,'#7B8B9B');sky.rect(162,152,11,1,'#7B8B9B')
for x in range(0,240,8):sky.rect(x,156+(x//8)%2,6,4,'#172F34')
# Wordmark masks are dedicated display lettering; not the UI font or a borrowed logo.
letters={
'P':['111110','110011','110011','110011','111110','110000','110000','110000','110000'],
'O':['011110','110011','110011','110011','110011','110011','110011','110011','011110'],
'K':['110011','110011','110110','111100','111000','111100','110110','110011','110011'],
'E':['111111','110000','110000','110000','111110','110000','110000','110000','111111'],
'F':['111111','110000','110000','110000','111110','110000','110000','110000','110000'],
'L':['110000','110000','110000','110000','110000','110000','110000','110000','111111'],
'I':['111111','001100','001100','001100','001100','001100','001100','001100','111111']}
logo=Art(192,48);mask=[]
for i,ch in enumerate('POKEFOLIO'):
 for gy,row in enumerate(letters[ch]):
  for gx,bit in enumerate(row):
   if bit=='1':
    for yy in range(3):
     for xx in range(3):mask.append((i*21+gx*3+xx+(8-gy)//3+1,9+gy*3+yy))
for x,y in mask:
 for dx,dy in [(0,0),(-1,0),(1,0),(0,-1),(0,1),(1,2),(2,2)]:logo.dot(x+dx,y+dy,'#183B34')
for x,y in mask:logo.dot(x,y,'#FFF0C5' if y<17 else '#EEC786' if y<27 else '#C79057')
logo.rect(8,41,176,1,'#EEC786');logo.rect(13,43,165,1,'#183B34')
vs=Art(56,40);vmask=[]
for y in range(27):
 # Slanted, thick V and S lettering authored as pixel silhouettes.
 for x in range(25):
  if (x<6 and y<19) or (x>17 and y<19) or (abs(x-12)<=max(2,(26-y)//2) and y>=18):vmask.append((x+2+(26-y)//6,y+6))
 for x in range(23):
  if (y<5 or 11<=y<16 or y>=22) or (x<5 and y<14) or (x>=18 and y>=12):vmask.append((x+30+(26-y)//9,y+6))
for x,y in vmask:
 for dx,dy in [(0,0),(-1,0),(1,0),(0,-1),(0,1),(1,2)]:vs.dot(x+dx,y+dy,'#183B34')
for x,y in vmask:vs.dot(x,y,'#FFFFFF' if y<17 else '#F2D98B')
def portrait(kind):
 a=Art(64,64);o='#283D38';skin='#D7AA79';shade='#B77E58';cloth='#427F8D';light='#8ABBA9';trouser='#555971';cream='#E8D5A7'
 if kind=='visitor':o='#333A43';skin='#D5A77F';shade='#AE775B';cloth='#9C694E';light='#D4AC79';trouser='#687A75';cream='#E7D7AA'
 # Neck and outlined coat with shoulders, collar, chest seams and visible hands.
 a.poly([(25,31),(40,31),(40,37),(52,40),(59,49),(62,63),(3,63),(6,49),(14,40),(25,37)],o)
 a.poly([(27,30),(38,30),(38,40),(33,45),(27,39)],skin);a.rect(30,34,8,3,shade)
 a.poly([(14,42),(25,38),(32,47),(40,38),(51,43),(57,59),(56,63),(9,63),(8,56)],cloth)
 a.poly([(16,43),(24,40),(29,49),(22,55),(13,52)],light);a.poly([(34,47),(40,41),(43,44),(39,53)],cream);a.rect(32,48,2,16,o);a.rect(39,57,9,1,o)
 a.poly([(8,54),(13,52),(24,56),(38,54),(43,58),(42,62),(25,63),(11,60)],o);a.poly([(12,54),(24,58),(36,56),(40,58),(39,60),(24,61),(13,58)],skin);a.rect(26,59,9,1,shade)
 # Face shape is stepped and asymmetrical: cheek, ear, nose, side-parted hair.
 a.poly([(22,5),(36,3),(44,7),(48,15),(47,24),(43,31),(36,35),(25,33),(19,26),(17,15)],o)
 a.poly([(23,13),(40,11),(44,15),(44,26),(39,31),(32,33),(25,29),(22,23)],skin);a.poly([(40,17),(47,17),(48,23),(43,26),(40,24)],shade);a.rect(44,19,2,3,skin)
 a.poly([(20,13),(23,7),(35,6),(42,9),(43,13),(30,12),(26,17),(24,24),(20,22)],o);a.rect(25,8,8,2,trouser);a.rect(33,6,6,2,trouser)
 a.rect(28,20,3,2,o);a.rect(38,19,3,2,o);a.rect(28,19,4,1,shade);a.rect(34,24,2,2,shade);a.rect(31,29,7,1,shade);a.rect(26,27,2,1,cream)
 if kind=='engineer':a.rect(26,18,8,6,o);a.rect(36,18,8,6,o);a.rect(28,19,4,3,skin);a.rect(38,19,4,3,skin);a.rect(33,19,3,1,o)
 if kind=='recruiter':a.poly([(27,39),(32,45),(36,40),(34,54),(30,55)],trouser);a.dot(44,47,cream)
 if kind=='friend':a.poly([(15,40),(22,38),(25,43),(22,45),(16,44)],cream)
 if kind=='visitor':
  a.rect(20,6,23,4,cloth);a.rect(23,4,16,2,light);a.rect(17,10,28,2,cream)
 return a
bar=Art(128,16,'#183B34');bar.rect(0,0,128,1,'#6FD3B5');bar.rect(0,15,128,1,'#6FD3B5');bar.rect(0,0,1,16,'#6FD3B5');bar.rect(127,0,1,16,'#6FD3B5')
assets={'vs-title-bar':bar,'title-background':sky,'intro-background':sky,'wordmark':logo,'vs-lettering':vs,'portrait-visitor':portrait('visitor'),'portrait-recruiter':portrait('recruiter'),'portrait-engineer':portrait('engineer'),'portrait-friend':portrait('friend')}
output={}
for name,a in assets.items():
 output[name]=a.data();png=a.png();filename=name+'.'+hashlib.sha256(png).hexdigest()[:12]+'.png';(ROOT/'public/assets/opening'/filename).write_bytes(png)
outputpath=ROOT/'assets-src/opening/art.json';outputpath.write_text(json.dumps(output,separators=(',',':'))+'\n')
(ROOT/'assets-src/opening/palette-sheet.json').write_text(json.dumps({name:art['palette'][1:] for name,art in output.items()},indent=2)+'\n')
print('Authored original B2 wordmark, night town, VS lettering and four portraits.')
