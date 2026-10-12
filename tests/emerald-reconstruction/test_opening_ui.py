"""Independent original PNG/tilemap checks and actual browser pixel evidence."""
import json,os,unittest,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
@unittest.skipUnless(os.environ.get('EMERALD_TEST_SOURCE')=='1','requires private pinned source')
class OpeningUiTests(unittest.TestCase):
 def test_source_birch_and_background_indices(self):
  from PIL import Image
  ui=json.loads((ROOT/'artifacts/emerald-source/ui/ui-bundle.json').read_text());intro=ui['intro']
  for layer,path in [(intro['birch'],'graphics/birch_speech/birch.png'),(intro,'graphics/birch_speech/shadow.png')]:
   im=Image.open(ROOT/'pokeemerald'/path);w,h=im.size;px=list(im.get_flattened_data())
   expected=[px[(ty+y)*w+tx+x] for ty in range(0,h,8) for tx in range(0,w,8) for y in range(8) for x in range(8)]
   self.assertEqual(layer['tiles'],expected)
  self.assertEqual(bytes((v&255 for w in intro['map'] for v in [w,w>>8])),(ROOT/'pokeemerald/graphics/birch_speech/map.bin').read_bytes())
  palette=Image.open(ROOT/'pokeemerald/graphics/birch_speech/birch.png').getpalette()[:48]
  self.assertEqual(intro['birch']['palette'],[palette[i]//8|(palette[i+1]//8)<<5|(palette[i+2]//8)<<10 for i in range(0,48,3)])
 def test_actual_capture_birch_pixels_and_integer_blocks(self):
  from PIL import Image
  out=ROOT/'artifacts/emerald-source/phase-p1-4-ui';proof=[]
  src=Image.open(ROOT/'pokeemerald/graphics/birch_speech/birch.png');indices=list(src.get_flattened_data());pal=src.getpalette()
  for n in [1,3,4]:
   capture=out/f'after/intro-{n}x.png'
   if not capture.exists():self.skipTest('run opening-ui.e2e.ts first to produce actual captures')
   shot=Image.open(capture).convert('RGBA');self.assertEqual(shot.size,(240*n,160*n));mismatch=blocks=opaque=0
   diff=Image.new('RGBA',(64*n,64*n))
   for y in range(64):
    for x in range(64):
     index=indices[y*64+x]
     if not index:continue
     ink=tuple(((v//8)<<3)|((v//8)>>2) for v in pal[index*3:index*3+3])+(255,)
     for dy in range(n):
      for dx in range(n):
       opaque+=1
       if shot.getpixel(((104+x)*n+dx,(28+y)*n+dy))!=ink:mismatch+=1;diff.putpixel((x*n+dx,y*n+dy),(255,0,0,255))
   for y in range(160):
    for x in range(240):
     ink=shot.getpixel((x*n,y*n))
     for dy in range(n):
      for dx in range(n):blocks+=shot.getpixel((x*n+dx,y*n+dy))!=ink
   diff.save(out/f'after/intro-{n}x.birch-diff.png')
   proof.append({'file':capture.name,'dpr':1,'n':n,'source':'graphics/birch_speech/birch.png','sourceSha256':hashlib.sha256((ROOT/'pokeemerald/graphics/birch_speech/birch.png').read_bytes()).hexdigest(),'opaquePixelsCompared':opaque,'spriteMismatches':mismatch,'nonUniformNativeBlocks':blocks})
   self.assertEqual(mismatch,0);self.assertEqual(blocks,0)
  (out/'birch-pixel-proof.json').write_text(json.dumps({'sourceCommit':'731ad5bfd6e6f265508d0efcca0ba42f9dcf5881','oracle':'original source PNG vs actual browser opaque sprite pixels; not full-screen emulator equality','captures':proof},indent=2)+'\n')
