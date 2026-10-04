"""Original B4 inventory/encyclopedia art, composed at whole native pixels."""
from pathlib import Path
import json,hashlib,struct,zlib
ROOT=Path(__file__).resolve().parents[2]
helper=(ROOT/'assets-src/opening/build.py').read_text().split('class Art:')[1].split('sky=Art')[0]
exec('class Art:'+helper)
O='#183B34';I='#6FD3B5';C='#FDF5C4';G='#F2D98B';B='#3C5CA8';H='#1D7F6E'
def icon(kind):
 a=Art(16,16)
 if kind in ['documents','resume','certificate','language']:
  a.poly([(3,1),(10,1),(13,4),(13,14),(3,14)],O);a.poly([(4,2),(9,2),(12,5),(12,13),(4,13)],C);a.rect(9,2,1,4,O);a.rect(9,5,4,1,O)
  for y,w in [(7,6),(9,5),(11,4)]:a.rect(5,y,w,1,H)
  if kind=='certificate':a.rect(9,9,4,4,O);a.rect(10,10,2,2,G);a.rect(10,13,1,2,B);a.rect(12,13,1,2,B)
  if kind=='language':a.rect(4,7,1,4,B);a.rect(5,6,2,1,B);a.rect(5,11,2,1,B);a.rect(10,7,1,4,B);a.rect(8,6,2,1,B);a.rect(8,11,2,1,B)
 elif kind in ['profiles','profile','github']:
  a.rect(1,2,14,12,O);a.rect(2,3,12,10,C);a.rect(3,4,4,4,H);a.rect(4,5,2,2,I);a.rect(3,9,4,3,H)
  for y,w in [(5,5),(8,4),(11,5)]:a.rect(8,y,w,1,B)
  if kind=='github':a.rect(8,4,1,8,O);a.rect(9,6,4,1,O);a.rect(11,6,1,5,O);a.rect(7,3,3,2,H);a.rect(10,10,3,2,H)
 elif kind in ['contact','email']:
  a.rect(1,4,14,9,O);a.rect(2,5,12,7,C)
  for x in range(2,8):a.dot(x,4+x//2,O);a.dot(15-x,4+x//2,O)
  a.rect(3,11,3,1,G);a.rect(10,11,3,1,G)
 elif kind in ['backend','frontend']:
  a.rect(1,2,14,10,O);a.rect(2,3,12,8,I);a.rect(3,4,10,2,H);a.rect(4,7,2,2,C);a.rect(7,7,5,1,O);a.rect(7,9,3,1,O);a.rect(7,12,2,2,O);a.rect(4,14,8,1,O)
 elif kind=='database':
  for y in [2,6,10]:
   a.rect(2,y+1,12,4,O);a.rect(3,y+2,10,2,I);a.rect(4,y,8,1,O);a.rect(4,y+1,8,1,C);a.dot(11,y+3,B)
 elif kind=='distributed':
  a.rect(3,7,10,2,O);a.rect(7,3,2,10,O)
  for x,y in [(1,1),(10,1),(1,10),(10,10)]:a.rect(x,y,5,5,O);a.rect(x+1,y+1,3,3,I);a.dot(x+2,y+2,B)
 elif kind=='cloud':
  a.poly([(1,8),(3,6),(4,3),(8,2),(11,4),(13,5),(15,8),(14,11),(2,11)],O);a.poly([(2,8),(5,6),(5,4),(8,3),(10,5),(13,6),(14,8),(13,10),(3,10)],C);a.rect(7,8,2,6,H);a.rect(5,11,6,1,H)
 elif kind=='devops':
  a.rect(2,2,12,12,O);a.rect(3,3,10,10,C);a.rect(4,4,8,2,H);a.rect(5,9,2,2,B);a.rect(7,8,2,2,B);a.rect(9,7,2,2,B);a.rect(4,12,8,1,G)
 elif kind=='observability':
  a.poly([(1,7),(4,3),(11,3),(15,7),(11,11),(4,11)],O);a.poly([(2,7),(5,4),(10,4),(13,7),(10,10),(5,10)],C);a.rect(6,5,4,4,H);a.rect(7,6,2,2,I);a.rect(7,12,2,3,O)
 elif kind=='concept':
  a.poly([(5,1),(10,1),(13,4),(13,8),(10,11),(10,14),(5,14),(5,11),(2,8),(2,4)],O);a.poly([(5,2),(10,2),(12,5),(11,8),(9,10),(6,10),(3,8),(3,5)],G);a.rect(6,5,1,5,H);a.rect(9,5,1,5,H);a.rect(6,12,4,1,C)
 elif kind=='extras':
  a.poly([(7,1),(10,5),(14,6),(11,10),(11,14),(7,12),(3,14),(3,10),(1,6),(5,5)],O);a.poly([(7,3),(9,6),(12,7),(9,9),(9,12),(7,10),(5,12),(5,9),(3,7),(6,6)],G)
 return a
assets={k:icon(k) for k in ['documents','profiles','contact','extras','resume','certificate','github','profile','email','language','backend','distributed','database','cloud','devops','observability','frontend','concept']}
# Each skill uses an authored category emblem at 16 and 32 native pixels; no brand-logo borrowing.
for k in list(assets):
 a=assets[k];large=Art(32,32)
 for y in range(32):
  for x in range(32):large.dot(x,y,a.p[(y//2)*16+x//2])
 assets[k+'-large']=large
# Original trainer-card portrait: tailored teal jacket, profile details, authored at 48×64.
a=Art(48,64);skin='#D7AA79';shade='#B77E58';hair='#283D38';coat='#427F8D';light='#8ABBA9';cream='#E8D5A7'
a.poly([(17,30),(31,30),(31,37),(41,41),(47,52),(47,63),(0,63),(1,52),(8,42),(17,37)],O)
a.poly([(19,29),(29,29),(29,39),(24,44),(19,39)],skin);a.rect(21,33,8,3,shade)
a.poly([(16,38),(23,44),(31,38),(39,43),(44,54),(44,63),(3,63),(5,53),(10,44)],coat)
a.poly([(16,38),(23,44),(19,49),(13,42)],light);a.poly([(31,38),(24,44),(28,49),(35,42)],light)
a.rect(22,46,2,18,O);a.rect(8,53,10,1,O);a.rect(9,54,8,5,light);a.rect(31,53,8,1,O);a.rect(31,54,7,5,light)
for y in [49,55,61]:a.dot(25,y,cream)
a.poly([(12,10),(17,5),(30,5),(36,11),(36,24),(32,31),(25,35),(17,31),(12,23)],hair)
a.poly([(15,12),(18,8),(29,8),(33,12),(33,24),(29,30),(24,32),(18,29),(15,23)],skin)
a.rect(14,18,2,7,shade);a.rect(30,19,3,7,shade);a.rect(19,22,2,2,hair);a.rect(28,22,2,2,hair);a.rect(23,25,2,1,shade);a.rect(22,28,5,1,hair)
a.poly([(11,12),(14,6),(20,3),(29,3),(35,7),(36,15),(31,13),(28,8),(23,12),(18,10),(15,16)],hair)
a.rect(17,6,7,1,'#555971');a.rect(25,5,6,1,'#555971');a.rect(33,15,2,3,hair)
assets['trainer-portrait']=a
# Faithful whole-pixel 48px project treatments derive from our own approved 64px emblems.
battle=json.load(open(ROOT/'assets-src/battle/art.json'))
for name,src in battle.items():
 if not name.startswith('project-'):continue
 p=[]
 for i in range(0,len(src['runs']),2):p += [src['palette'][src['runs'][i]]]*src['runs'][i+1]
 a=Art(48,48)
 for y in range(48):
  for x in range(48):a.dot(x,y,p[(y*64//48)*64+x*64//48])
 assets[name+'-48']=a
# Dedicated eight-pixel type badges: category symbols, never scaled brand logos.
badges={
'language':['00000000','00100100','01000010','10000001','01000010','00100100','00000000','00000000'],
'backend':['01111110','01000010','01111110','01000010','01111110','01000010','01111110','00000000'],
'distributed':['01100110','01100110','00111100','00011000','00111100','01100110','01100110','00000000'],
'database':['00111100','01000010','01111110','01000010','01111110','01000010','00111100','00000000'],
'cloud':['00011000','00100100','01100010','10000001','01111110','00011000','00111100','00000000'],
'devops':['01111110','01000010','01000110','01011010','01110010','01000010','01111110','00000000'],
'observability':['00000000','00111100','01011010','10011001','01011010','00111100','00011000','00000000'],
'frontend':['01111110','01000010','01011010','01000010','01111110','00011000','00111100','00000000'],
'concept':['00111100','01000010','01011010','01011010','00100100','00100100','00111100','00000000'],
}
for name,rows in badges.items():
 a=Art(8,8)
 for y,row in enumerate(rows):
  for x,bit in enumerate(row):
   if bit=='1':a.dot(x,y,H)
 assets[name+'-badge']=a
out=ROOT/'public/assets/portfolio';out.mkdir(parents=True,exist_ok=True)
manifest={}
for name,a in assets.items():
 png=a.png();fn=name+'-'+hashlib.sha256(png).hexdigest()[:12]+'.png';(out/fn).write_bytes(png)
 manifest[name]={'src':'/assets/portfolio/'+fn,'width':a.w,'height':a.h}
(ROOT/'assets-src/portfolio/art.json').write_text(json.dumps({k:a.data() for k,a in assets.items()},separators=(',',':')))
(ROOT/'assets-src/portfolio/manifest.json').write_text(json.dumps(manifest,indent=2))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(len(assets),'original portfolio assets')
