"""Original logo reproducibility; no private source assets required."""
import importlib.util,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
class WordmarkTests(unittest.TestCase):
 def test_authored_pixels_are_reproducible_and_indexed_without_antialiasing(self):
  path=ROOT/'assets-src/opening/wordmark.py'
  spec=importlib.util.spec_from_file_location('brand_wordmark',path)
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  data,image=module.build()
  self.assertEqual(json.loads(json.dumps(data)),json.loads((path.parent/'pokefolio-wordmark.json').read_text()))
  self.assertEqual(list(image.get_flattened_data()),list(Image.open(path.parent/'pokefolio-wordmark.png').get_flattened_data()))
  self.assertEqual({rgba[3] for rgba in image.get_flattened_data()},{0,255})
  self.assertEqual(len(set(image.get_flattened_data())),7)
  self.assertTrue(all(0<=index<len(data['palette']) for index in data['pixels']))
  self.assertEqual(data['text'],'PokéFolio')
 def test_gold_letters_accent_and_dot_remain_separate(self):
  from collections import deque
  data=json.loads((ROOT/'assets-src/opening/pokefolio-wordmark.json').read_text())
  width=data['width'];gold={i for i,value in enumerate(data['pixels']) if value in [4,5,6]};components=[]
  while gold:
   start=gold.pop();queue=deque([start]);size=1
   while queue:
    at=queue.popleft()
    for delta in [-width,width,-1,1]:
     other=at+delta
     if other in gold and (abs(delta)!=1 or other//width==at//width):
      gold.remove(other);queue.append(other);size+=1
   components.append(size)
  self.assertEqual(len(components),11) # Nine letters, acute, i dot.
  self.assertGreater(min(components),50) # No accidental single-pixel fragments.
