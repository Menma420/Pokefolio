"""Original P11 opening integer-pixel artwork; no external images, fonts or traced shapes."""
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
# Wide evening sky, distant ridge, town roofline and a grounded near bank.
sky=Art(240,160,'#536B83')
for y,h,c in [(0,26,'#344E68'),(26,28,'#536B83'),(54,26,'#7B8B9B'),(80,30,'#AFADA0')]:sky.rect(0,y,240,h,c)
for x,y in [(11,20),(163,30),(79,6)]:
 sky.rect(x+8,y,22,2,'#AEBBC1');sky.rect(x+4,y+2,32,3,'#AEBBC1');sky.rect(x,y+5,43,2,'#7E95A5')
sky.poly([(0,106),(12,102),(30,105),(42,98),(60,101),(74,94),(89,100),(109,96),(126,102),(148,96),(174,102),(192,94),(214,99),(240,95),(240,130),(0,130)],'#536B70')
sky.rect(0,112,240,48,'#304E46')
for x,y,w in [(22,114,36),(78,113,29),(130,108,43),(191,117,29)]:
 sky.poly([(x-4,y),(x+w//2,y-12),(x+w+4,y),(x+w,y+3),(x,y+3)],'#172F34');sky.rect(x,y+3,w,18,'#243E3A');sky.rect(x+4,y+6,5,5,'#AFADA0');sky.rect(x+w-10,y+6,5,5,'#7B8B9B');sky.rect(x+w//2-3,y+10,6,11,'#172F34')
for x,y in [(4,115),(66,119),(184,118),(237,111)]:
 sky.poly([(x-12,y+6),(x-11,y),(x-6,y),(x-6,y-5),(x+4,y-5),(x+4,y-2),(x+10,y-2),(x+10,y+4),(x+13,y+4),(x+11,y+13),(x-9,y+13)],'#172F34');sky.rect(x-2,y+13,4,15,'#172F34')
sky.poly([(0,144),(38,138),(69,141),(105,135),(141,138),(173,134),(206,140),(240,135),(240,160),(0,160)],'#172F34')
for x in range(3,240,17):sky.rect(x,141+(x//17)%3,4,1,'#304E46')
# Dedicated uppercase display lettering, including an authored accent on É.
letters={
'P':['111110','110011','110011','111110','110000','110000','110000'],
'O':['011110','110011','110011','110011','110011','110011','011110'],
'K':['110011','110110','111100','111000','111100','110110','110011'],
'É':['111111','110000','110000','111110','110000','110000','111111'],
'F':['111111','110000','110000','111110','110000','110000','110000'],
'L':['110000','110000','110000','110000','110000','110000','111111'],
'I':['111111','001100','001100','001100','001100','001100','111111']}
logo=Art(192,48);mask=[]
for i,ch in enumerate('POKÉFOLIO'):
 for gy,row in enumerate(letters[ch]):
  for gx,bit in enumerate(row):
   if bit=='1':
    for yy in range(4):
     for xx in range(3):mask.append((i*21+gx*3+xx+(6-gy)//2+1,12+gy*4+yy))
# Acute belongs to the logo mask; never a generic web glyph.
for y in range(3):
 for x in range(6):mask.append((3*21+9+x+y,5-y))
for x,y in mask:
 for dx,dy in [(0,0),(-1,0),(1,0),(0,-1),(0,1),(-2,0),(2,0),(0,2),(2,3),(3,3)]:logo.dot(x+dx,y+dy,'#183B34')
for x,y in mask:logo.dot(x,y,'#FFF0C5' if y<22 else '#EEC786')
# Intro is a distinct daylight field stage, not the title sky.
intro=Art(240,160,'#B8C9B1')
intro.rect(0,40,240,30,'#A9C2AC');intro.rect(0,70,240,90,'#88A780')
for x in range(0,240,19):
 intro.poly([(x-8,75),(x-8,60),(x-2,60),(x-2,53),(x+8,53),(x+8,57),(x+15,57),(x+15,75)],'#496A57')
intro.poly([(57,91),(78,81),(159,81),(182,91),(174,106),(69,106)],'#779C70');intro.poly([(64,91),(82,85),(155,85),(176,92),(167,101),(74,101)],'#A9BC82')
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
 a=Art(64,64);o='#283D38';skin='#D7AA79';shade='#B77E58';cloth='#427F8D';light='#8ABBA9';pants='#555971';cream='#E8D5A7'
 if kind=='visitor':cloth='#9C694E';light='#D4AC79';pants='#687A75'
 # Stable compact trainer silhouette: field cap, shoulders, jacket and pose.
 a.poly([(14,63),(13,44),(20,37),(27,34),(26,29),(20,25),(19,15),(23,9),(39,7),(46,13),(47,25),(41,32),(37,34),(44,39),(52,42),(58,54),(56,63)],o)
 a.poly([(23,16),(41,15),(43,22),(40,29),(34,33),(27,30),(23,25)],skin);a.rect(40,19,5,6,shade);a.rect(28,22,3,2,o);a.rect(37,21,3,2,o);a.rect(32,28,5,1,shade)
 a.poly([(20,16),(23,10),(30,7),(40,8),(45,12),(45,16)],cloth);a.rect(26,8,12,2,light);a.rect(18,16,29,3,o);a.rect(21,17,24,2,cream)
 a.rect(28,31,9,7,skin);a.rect(30,33,7,2,shade)
 a.poly([(21,40),(28,36),(33,42),(39,36),(47,42),(51,59),(47,63),(17,63),(16,49)],cloth)
 a.poly([(20,42),(26,39),(30,46),(25,51),(17,48)],light);a.poly([(35,42),(39,38),(42,40),(39,49)],cream);a.rect(33,43,2,20,o);a.rect(38,57,9,1,o)
 a.poly([(14,50),(19,48),(24,55),(40,52),(46,55),(44,61),(26,63),(17,58)],o);a.poly([(18,51),(25,58),(39,55),(42,57),(40,60),(26,61),(20,57)],skin)
 if kind=='engineer':
  a.rect(25,20,10,6,o);a.rect(36,20,8,6,o);a.rect(27,21,6,3,skin);a.rect(38,21,4,3,skin)
 if kind=='recruiter':a.poly([(30,38),(34,42),(37,39),(35,53),(32,54)],pants);a.dot(44,46,cream)
 if kind=='friend':a.rect(20,41,5,2,cream)
 return a
# Full standing opening trainer, explicitly separate from the 64px busts.
figure=Art(64,80);o='#283D38';skin='#D7AA79';shade='#B77E58';cloth='#427F8D';light='#8ABBA9';cream='#E8D5A7';pants='#555971'
figure.poly([(23,6),(39,6),(45,13),(45,24),(41,30),(35,34),(27,32),(21,26),(20,15)],o)
figure.poly([(24,15),(40,14),(42,20),(40,27),(35,31),(28,29),(24,24)],skin);figure.rect(39,20,4,5,shade);figure.rect(27,22,3,2,o);figure.rect(36,21,3,2,o);figure.rect(31,28,6,1,shade)
figure.poly([(21,14),(25,7),(31,5),(39,7),(44,11),(44,15)],cloth);figure.rect(27,7,11,2,light);figure.rect(18,15,29,3,o);figure.rect(21,16,23,1,cream)
figure.rect(29,32,8,6,o);figure.rect(30,33,6,4,skin)
figure.poly([(21,36),(28,34),(33,40),(39,35),(46,38),(50,48),(47,59),(43,62),(21,61),(17,55),(17,43)],o)
figure.poly([(22,39),(28,37),(33,43),(39,38),(44,41),(45,55),(41,60),(23,59),(21,52)],cloth);figure.poly([(23,40),(28,38),(31,44),(27,49),(21,46)],light);figure.poly([(35,43),(39,39),(41,41),(38,49)],cream);figure.rect(32,44,2,15,o);figure.rect(23,54,7,1,o);figure.rect(36,54,6,1,o)
figure.poly([(18,44),(22,44),(23,52),(21,57),(17,58),(15,54)],light);figure.poly([(17,53),(21,53),(22,57),(20,60),(16,58)],skin)
figure.poly([(44,42),(48,44),(51,51),(49,57),(45,59),(43,55)],light);figure.poly([(45,54),(49,54),(50,58),(47,61),(43,59)],skin)
figure.poly([(23,61),(42,61),(44,73),(41,77),(34,77),(33,65),(31,65),(30,77),(22,77)],o);figure.rect(24,62,7,11,pants);figure.rect(35,62,7,11,pants);figure.rect(20,75,12,4,o);figure.rect(34,75,12,4,o);figure.rect(23,75,7,1,cream);figure.rect(36,75,7,1,cream)
bar=Art(128,16,'#183B34');bar.rect(0,0,128,1,'#6FD3B5');bar.rect(0,15,128,1,'#6FD3B5');bar.rect(0,0,1,16,'#6FD3B5');bar.rect(127,0,1,16,'#6FD3B5')
assets={'vs-title-bar':bar,'title-background':sky,'intro-background':intro,'intro-uttkarsh':figure,'wordmark':logo,'vs-lettering':vs,'portrait-visitor':portrait('visitor'),'portrait-recruiter':portrait('recruiter'),'portrait-engineer':portrait('engineer'),'portrait-friend':portrait('friend')}
output={}
for name,a in assets.items():
 output[name]=a.data();png=a.png();filename=name+'.'+hashlib.sha256(png).hexdigest()[:12]+'.png';(ROOT/'public/assets/opening'/filename).write_bytes(png)
outputpath=ROOT/'assets-src/opening/art.json';outputpath.write_text(json.dumps(output,separators=(',',':'))+'\n')
(ROOT/'assets-src/opening/palette-sheet.json').write_text(json.dumps({name:art['palette'][1:] for name,art in output.items()},indent=2)+'\n')
print('Authored original B2 wordmark, night town, VS lettering and four portraits.')
