"""Independent pinned-source PNG and palette oracle for Steven's trainer front."""
import hashlib,json,os,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
@unittest.skipUnless(os.environ.get('EMERALD_TEST_SOURCE')=='1','requires private pinned source assets')
class OpponentGraphicsTests(unittest.TestCase):
 def test_original_front_indices_palette_and_transparency(self):
  from PIL import Image
  ui=json.loads((ROOT/'artifacts/emerald-source/ui/ui-bundle.json').read_text());sprite=ui['opponent']['front']
  path=ROOT/'pokeemerald'/sprite['graphicsPath'];source=Image.open(path)
  self.assertEqual(source.mode,'P');self.assertEqual(source.size,(64,64));self.assertEqual(len(sprite['frames']),1)
  expected=list(source.get_flattened_data());self.assertEqual(sprite['frames'][0],expected)
  p=source.getpalette();palette=[p[i]//8|(p[i+1]//8)<<5|(p[i+2]//8)<<10 for i in range(0,48,3)];self.assertEqual(sprite['palette'],palette)
  out=ROOT/'artifacts/emerald-source/phase-p1-5-opponent/asset-proof';out.mkdir(parents=True,exist_ok=True)
  expectedRgba=[tuple(((c&31)<<3)|((c&31)>>2) for c in [palette[v],palette[v]>>5,palette[v]>>10])+(255,) if v else (0,0,0,0) for v in expected]
  preview=Image.open(ROOT/'artifacts/emerald-source/ui/previews/steven-front-0.png');self.assertEqual(list(preview.get_flattened_data()),expectedRgba)
  diff=Image.new('RGB',(64,64));diff.save(out/'steven-front-diff.png')
  (out/'comparisons.json').write_text(json.dumps({'sourceCommit':ui['sourceCommit'],'source':sprite['graphicsPath'],'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'indexedSha256':hashlib.sha256(bytes(expected)).hexdigest(),'dimensions':[64,64],'paletteEntries':16,'transparentIndex':0,'indexedMismatches':0,'rgbaMismatches':0,'oracle':'independent original indexed PNG and its RGB555 palette; not whole-screen emulator'},indent=2)+'\n')
