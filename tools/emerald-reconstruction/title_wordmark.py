"""Original PokéFolio title lettering, authored directly on the native grid.

Capital P/F, x-height lowercase o/é, ascender k/l and dotted i are separate
drawings. No font, rotation, resize, resampling or uppercase conversion.
"""
from PIL import Image, ImageDraw, ImageFilter
from extract import rgb

BRAND = 'PokéFolio'
GLYPHS = {
 'P': {'width':19,'outer':[(0,3),(13,3),(18,8),(18,17),(13,21),(5,21),(5,30),(0,30)],'holes':[[(5,8),(11,8),(13,10),(13,14),(11,16),(5,16)]]},
 'o': {'width':17,'outer':[(4,11),(12,11),(16,15),(16,26),(12,30),(4,30),(0,26),(0,15)],'holes':[[(5,16),(11,16),(11,25),(5,25)]]},
 'k': {'width':18,'outer':[(0,3),(4,3),(4,19),(11,11),(17,11),(9,21),(17,30),(11,30),(4,23),(4,30),(0,30)]},
 'é': {'width':17,'outer':[(4,11),(12,11),(16,15),(16,23),(5,23),(5,26),(13,26),(13,30),(4,30),(0,26),(0,15)],'holes':[[(5,15),(11,15),(12,19),(5,19)]],'accent':[(7,7),(11,3),(15,3),(11,7)]},
 'F': {'width':18,'outer':[(0,3),(17,3),(17,8),(5,8),(5,15),(14,15),(14,20),(5,20),(5,30),(0,30)]},
 'l': {'width':8,'outer':[(1,3),(5,3),(5,26),(7,26),(7,30),(1,30)]},
 'i': {'width':7,'outer':[(1,13),(5,13),(5,30),(1,30)],'dot':[(1,5),(5,5),(5,9),(1,9)]},
}

def pokefolio_logo(palette):
 width=sum(GLYPHS[c]['width'] for c in BRAND)+5*(len(BRAND)-1)+2
 height=34
 mask=Image.new('L',(width,height));draw=ImageDraw.Draw(mask)
 cursor=1;glyphs=[]
 for char in BRAND:
  glyph=GLYPHS[char]
  def points(name):return [(x+cursor,y) for x,y in glyph[name]]
  draw.polygon(points('outer'),fill=255)
  for hole in glyph.get('holes',[]):draw.polygon([(x+cursor,y) for x,y in hole],fill=0)
  for name in ['accent','dot']:
   if name in glyph:draw.polygon(points(name),fill=255)
  glyphs.append({'char':char,'x':cursor,'width':glyph['width'],'baseline':30,
    'bodyTop':min(y for _,y in glyph['outer']),
    'accent':points('accent') if 'accent' in glyph else None,
    'dot':points('dot') if 'dot' in glyph else None})
  cursor+=glyph['width']+5
 def index(color):return min(range(1,224),key=lambda i:sum((a-b)**2 for a,b in zip(rgb(palette[i]),color)))
 outline=index((16,32,82));fill=index((246,222,41));highlight=index((255,246,198))
 edge=mask.filter(ImageFilter.MaxFilter(3))
 pixels=[0]*(width*height)
 for y in range(height):
  for x in range(width):
   if edge.getpixel((x,y)):pixels[y*width+x]=outline
   if mask.getpixel((x,y)):
    # A one-pixel upper edge accent, not a gradient or a second outline.
    pixels[y*width+x]=highlight if not mask.getpixel((x,max(0,y-1))) else fill
 bbox=edge.getbbox()
 assert BRAND=='PokéFolio' and [g['char'] for g in glyphs]==list(BRAND)
 assert 176<=width<=200 and 28<=bbox[3]-bbox[1]<=36
 assert bbox[1]>0 and bbox[3]<height
 assert all((x,y)==(int(x),int(y)) for g in glyphs for x,y in (g['accent'] or []))
 return {'width':width,'height':height,'x':(240-width)//2,'y':18,
   'pixels':pixels,'text':BRAND,'glyphs':glyphs,'bounds':list(bbox),
   'paletteIndices':[outline,fill,highlight],
   'adaptation':'Original mixed-case PokéFolio native-pixel lettering; one-pixel outline, fixed baseline and true lowercase glyphs in the existing title palette.'}
