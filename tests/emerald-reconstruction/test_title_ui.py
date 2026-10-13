"""Source asset identity and independent source-pixel checks, not emulator equality."""
import json, os, unittest, struct, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
@unittest.skipUnless(os.environ.get('EMERALD_TEST_SOURCE')=='1','private source required')
class TitleUiTests(unittest.TestCase):
 def load(self):return json.loads((ROOT/'artifacts/emerald-source/ui/ui-bundle.json').read_text())['title']
 def test_original_source_layers_and_palette(self):
  from PIL import Image
  t=self.load();root=ROOT/'pokeemerald/graphics/title_screen'
  for name in ['rayquaza','clouds']:
   im=Image.open(root/(name+'.png'));px=list(im.get_flattened_data());w,h=im.size
   expected=[px[(ty+y)*w+tx+x] for ty in range(0,h,8) for tx in range(0,w,8) for y in range(8) for x in range(8)]
   self.assertEqual(t[name]['tiles'],expected)
   self.assertEqual(t[name]['map'],list(struct.unpack('<1024H',(root/(name+'.bin')).read_bytes())))
  self.assertEqual(t['sourceLogo']['map'],list((root/'pokemon_logo.bin').read_bytes()))
  im=Image.open(root/'pokemon_logo.png');px=list(im.get_flattened_data())
  self.assertEqual(t['sourceLogo']['tiles'],[px[(ty+y)*256+tx+x] for ty in range(0,64,8) for tx in range(0,256,8) for y in range(8) for x in range(8)])
  def pal(name):return [int(r)//8|(int(g)//8)<<5|(int(b)//8)<<10 for r,g,b in [line.split() for line in (root/name).read_text().splitlines()[3:]]]
  self.assertEqual(t['palette'],pal('pokemon_logo.pal')[:224]+pal('rayquaza_and_clouds.pal'))
 def test_actual_title_source_background_and_crispness(self):
  from PIL import Image
  t=self.load();out=ROOT/'artifacts/emerald-source/phase-title';proof=[]
  root=ROOT/'pokeemerald/graphics/title_screen'
  def palette(name):return [tuple(int(v)//8 for v in line.split()) for line in (root/name).read_text().splitlines()[3:]]
  palettes=palette('pokemon_logo.pal')[:224]+palette('rayquaza_and_clouds.pal')
  layers={}
  for name in ['rayquaza','clouds']:
   im=Image.open(root/(name+'.png'));layers[name]=(im,list(im.get_flattened_data()),struct.unpack('<1024H',(root/(name+'.bin')).read_bytes()))
  def sample(name,x,y):
   im,pixels,tilemap=layers[name];x%=256;y%=256;word=tilemap[(y//8)*32+x//8];tile=word&1023
   tx=7-x%8 if word&1024 else x%8;ty=7-y%8 if word&2048 else y%8
   offset=(tile//(im.width//8)*8+ty)*im.width+(tile%(im.width//8)*8+tx)
   idx=pixels[offset] if offset<len(pixels) else 0
   return (word>>12)*16+idx if idx else 0
  for n in [1,3,4,5]:
   path=out/f'p1-6-after/title-{n}x.png'
   if not path.exists():self.skipTest('run title.e2e.ts first')
   state=json.loads(path.with_suffix('.state.json').read_text());frame=int(state['presentationFrame']);im=Image.open(path).convert('RGB')
   ox=(im.width-240*n)//2;oy=(im.height-160*n)//2
   shot=im.crop((ox,oy,ox+240*n,oy+160*n));diff=Image.new('RGB',(240,160))
   pal=list(palettes);tick=frame//4*4;intensity=(t['sine'][(tick+64)%256]*128//256)+128
   pal[239]=(31-intensity*31//256,31-intensity*22//256,12)
   mismatch=blocks=compared=0
   for y in range(160):
    for x in range(240):
     block=shot.crop((x*n,y*n,(x+1)*n,(y+1)*n));actual=block.getpixel((0,0));blocks+=len(set(block.get_flattened_data()))!=1
     # Compare original source layers independently, outside adapted wordmark
     # and prompt object region. Original source state is reconstructed, not ROM.
     logo=t['logo'];left,top,right,bottom=logo['bounds']
     if (logo['x']+left<=x<logo['x']+right and logo['y']+top<=y<logo['y']+bottom) or (88<=x<151 and 118<=y<136):continue
     base=pal[sample('rayquaza',x,y)];cloud=sample('clouds',x+t['wave'][(y+frame)%64],y+(frame+1)//4)
     expected=tuple(min(31,(a*6+b*15)//16) for a,b in zip(pal[cloud],base)) if cloud else base
     expected=tuple(v*8+v//4 for v in expected);compared+=1
     if actual!=expected:mismatch+=1;diff.putpixel((x,y),(255,0,0))
   diff.save(out/f'p1-6-after/title-{n}x.source-layer-diff.png')
   proof.append({'file':path.name,'frame':frame,'dpr':state['dpr'],'scale':n,'originalSourcePixelsCompared':compared,'sourceLayerMismatches':mismatch,'nonuniformNativeBlocks':blocks,'oracle':'independent source PNG/tilemap/palette composition; not authentic emulator full-screen equality'})
   self.assertEqual(mismatch,0);self.assertEqual(blocks,0)
  (out/'p1-6-pixel-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
 def test_wordmark_is_reproducible_true_mixed_case_and_unclipped(self):
  sys.path.insert(0,str(ROOT/'tools/emerald-reconstruction'))
  from title_wordmark import pokefolio_logo,GLYPHS,BRAND
  t=self.load();logo=t['logo'];self.assertEqual(json.loads(json.dumps(pokefolio_logo(t['palette']))),logo)
  self.assertEqual(BRAND,'PokéFolio');self.assertEqual([g['char'] for g in logo['glyphs']],list(BRAND))
  w,h=logo['width'],logo['height'];self.assertEqual((w,h),(180,34))
  xs=[];ys=[]
  for y in range(h):
   for x in range(w):
    if logo['pixels'][y*w+x]:xs.append(x);ys.append(y)
  self.assertEqual([min(xs),min(ys),max(xs)+1,max(ys)+1],logo['bounds'])
  self.assertEqual((logo['x']+w//2,logo['y']),(120,18))
  self.assertGreater(min(ys),0);self.assertLess(max(ys),h-1)
  self.assertTrue(set(logo['pixels'])<={0,*logo['paletteIndices']});self.assertEqual(len(logo['paletteIndices']),3)
  for g in logo['glyphs']:
   self.assertEqual(g['baseline'],30)
   for x,y in GLYPHS[g['char']]['outer']:
    self.assertGreaterEqual(x+g['x'],1);self.assertLess(x+g['x'],w-1);self.assertGreater(y,0);self.assertLess(y,h-1)
   if g['char']=='o':
    # The actual raster above the x-height is blank; these are not uppercase O's.
    self.assertFalse(any(logo['pixels'][y*w+x] for y in range(2,10) for x in range(g['x'],g['x']+g['width'])))
   if g['char']=='é':
    self.assertEqual(g['bodyTop'],11)
    self.assertFalse(any(logo['pixels'][9*w+x] for x in range(g['x'],g['x']+g['width'])))
    for x,y in g['accent']:self.assertNotEqual(logo['pixels'][y*w+x],0)
   if g['char']=='i':
    self.assertIsNotNone(g['dot'])
    self.assertFalse(any(logo['pixels'][11*w+x] for x in range(g['x'],g['x']+g['width'])))
