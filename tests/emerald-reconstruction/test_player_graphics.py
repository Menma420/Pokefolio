"""Independent source PNG/palette comparison, not a full-screen emulator oracle."""
import hashlib,json,os,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
@unittest.skipUnless(os.environ.get('EMERALD_TEST_SOURCE')=='1','requires private pinned source assets')
class PlayerGraphicsTests(unittest.TestCase):
 def test_every_front_back_index_and_palette_matches_pinned_source(self):
  from PIL import Image
  bundle=json.loads((ROOT/'artifacts/emerald-source/ui/ui-bundle.json').read_text())
  proof=[];out=ROOT/'artifacts/emerald-source/phase-p1-3-avatar/asset-proof';out.mkdir(parents=True,exist_ok=True)
  world=json.loads((ROOT/'artifacts/emerald-source/bundle.json').read_text())
  sprites={**bundle['player'],'overworld':world['actors']['OBJ_EVENT_GFX_BRENDAN_NORMAL']}
  for kind in ['front','back','overworld']:
   sprite=sprites[kind];source=Image.open(ROOT/'pokeemerald'/sprite['graphicsPath'])
   width,height=sprite['width'],sprite['height']
   colors=[tuple(map(int,line.split())) for line in (ROOT/'pokeemerald'/sprite['palettePath']).read_text().splitlines()[3:]]
   palette=[r//8|(g//8)<<5|(b//8)<<10 for r,g,b in colors]
   self.assertEqual(sprite['palette'],palette)
   frames=sprite['frames'][:9] if kind=='overworld' else sprite['frames']
   for i,frame in enumerate(frames):
    crop=(i*width,0,(i+1)*width,height) if kind=='overworld' else (0,i*height,width,(i+1)*height)
    expected=list(source.crop(crop).get_flattened_data())
    count=sum(a!=b for a,b in zip(expected,frame));self.assertEqual(len(frame),width*height);self.assertEqual(count,0)
    diff=Image.new('RGB',(width,height));diff.putdata([(255,0,0) if a!=b else (0,0,0) for a,b in zip(expected,frame)]);name=f'brendan-{kind}-{i}-diff.png';diff.save(out/name)
    proof.append({'context':kind,'frame':i,'source':sprite['graphicsPath'],'sourceFileSha256':hashlib.sha256((ROOT/'pokeemerald'/sprite['graphicsPath']).read_bytes()).hexdigest(),'indexedSha256':hashlib.sha256(bytes(frame)).hexdigest(),'paletteSha256':hashlib.sha256((ROOT/'pokeemerald'/sprite['palettePath']).read_bytes()).hexdigest(),'mismatchedPixels':count,'diff':name})
  (out/'comparisons.json').write_text(json.dumps({'sourceCommit':bundle['sourceCommit'],'oracle':'independent original PNG indices and JASC RGB555 palette; not full-screen emulator','frames':proof},indent=2)+'\n')
