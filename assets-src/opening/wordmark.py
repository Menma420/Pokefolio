"""Authored PokéFolio display lettering, not a font or extracted game graphic.

All contours/counters are drawn on a native integer grid. Separate hand-shaped
letters establish the rising/falling baseline and irregular proportions. Pillow
only fills polygons and expands hard masks; no resampling or antialiasing.
Run: python3 assets-src/opening/wordmark.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent
BRAND = 'PokéFolio'
WIDTH, HEIGHT = 216, 60
# Transparent, offset navy, royal blue, blue rim, gold, upper bevel, lower bevel.
PALETTE = [0, (2, 4, 10), (5, 10, 23), (7, 14, 28), (31, 25, 1), (31, 29, 12), (29, 19, 0)]
PALETTE = [value[0] | value[1] << 5 | value[2] << 10 if isinstance(value, tuple) else value for value in PALETTE]
GLYPHS = {
 'P': {'width':28, 'outer':[(0,6),(16,1),(24,4),(28,11),(26,20),(19,25),(11,25),(8,39),(0,37),(3,21)],
       'holes':[[(10,9),(17,8),(21,11),(20,16),(16,19),(8,19)]]},
 'o': {'width':24, 'outer':[(5,1),(16,0),(23,5),(25,16),(21,27),(14,31),(4,29),(0,22),(0,10)],
       'holes':[[(8,9),(15,8),(17,13),(16,21),(11,23),(7,20),(6,14)]]},
 'k': {'width':29, 'outer':[(2,1),(10,0),(9,20),(20,10),(28,12),(17,24),(28,35),(20,39),(9,28),(8,38),(0,37)],
       'holes':[]},
 'é': {'width':27, 'outer':[(6,2),(18,0),(25,5),(27,17),(8,20),(11,25),(21,23),(23,30),(11,34),(3,30),(0,21),(1,10)],
       'holes':[[(8,10),(17,8),(19,12),(8,14)]],
       'accent':[(10,-7),(19,-13),(27,-12),(19,-6),(12,-4)]},
 'F': {'width':28, 'outer':[(2,0),(28,3),(27,11),(12,9),(11,17),(24,18),(23,26),(10,24),(8,39),(0,37)],
       'holes':[]},
 'l': {'width':11, 'outer':[(2,1),(9,0),(8,28),(11,29),(10,37),(0,36)], 'holes':[]},
 'i': {'width':9, 'outer':[(1,0),(8,1),(7,21),(9,22),(8,28),(0,27)], 'holes':[],
       'dot':[(1,-13),(9,-12),(8,-5),(0,-6)]},
}
# Deliberate overlap of the blue contours; gold silhouettes remain separate.
LAYOUT = [('P',7,12),('o',34,20),('k',58,9),('é',86,18),('F',113,9),
          ('o',140,20),('l',166,13),('i',181,24),('o',191,21)]
# The final o is a separately proportioned drawing, not a scaled bitmap.
FINAL_O = {'width':18,'outer':[(4,1),(11,0),(17,5),(18,15),(15,25),(9,29),(3,27),(0,21),(0,10)],
           'holes':[[(7,8),(11,8),(12,14),(10,21),(6,21),(5,17),(5,12)]]}


def build():
    mask = Image.new('L', (WIDTH, HEIGHT))
    glyphs=[]; masks=[]
    for ordinal,(char,x,y) in enumerate(LAYOUT):
        glyph = FINAL_O if ordinal == len(LAYOUT)-1 else GLYPHS[char]
        letter=Image.new('L',(WIDTH,HEIGHT)); draw=ImageDraw.Draw(letter)
        points = lambda name: [(x+px,y+py) for px,py in glyph[name]]
        draw.polygon(points('outer'),fill=255)
        for hole in glyph['holes']: draw.polygon([(x+px,y+py) for px,py in hole],fill=0)
        for feature in ['accent','dot']:
            if feature in glyph: draw.polygon(points(feature),fill=255)
        masks.append(letter);mask=ImageChops.lighter(mask,letter)
        glyphs.append({'char':char,'x':x,'width':glyph['width'],
                       'baseline':y+max(py for _,py in glyph['outer']),
                       'bodyTop':y+min(py for _,py in glyph['outer']),
                       'accent':points('accent') if 'accent' in glyph else None,
                       'dot':points('dot') if 'dot' in glyph else None})
    outline=mask.filter(ImageFilter.MaxFilter(7))
    pixels=[0]*(WIDTH*HEIGHT)
    # Hard offset extrusion behind the entire contour, including the acute.
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if x>=2 and y>=3 and outline.getpixel((x-2,y-3)): pixels[y*WIDTH+x]=1
    # Layer each outlined letter separately. Their blue contours may overlap,
    # but the gold faces never merge into an unreadable continuous shape.
    for letter in masks:
        edge=letter.filter(ImageFilter.MaxFilter(7))
        rim=letter.filter(ImageFilter.MaxFilter(5))
        for y in range(HEIGHT):
            for x in range(WIDTH):
                if edge.getpixel((x,y)): pixels[y*WIDTH+x]=2
                if rim.getpixel((x,y)) and not letter.getpixel((x,y)): pixels[y*WIDTH+x]=3
                if letter.getpixel((x,y)):
                    above=letter.getpixel((x,max(0,y-1)))
                    below=letter.getpixel((x,min(HEIGHT-1,y+1)))
                    pixels[y*WIDTH+x]=5 if not above else 6 if not below else 4
    im=Image.new('RGBA',(WIDTH,HEIGHT))
    def rgba(index):
        if index==0:return (0,0,0,0)
        value=PALETTE[index]
        return tuple(((value>>shift)&31)*8+((value>>shift)&31)//4 for shift in [0,5,10])+(255,)
    im.putdata([rgba(i) for i in pixels]);bounds=im.getbbox()
    assert bounds[0]>0 and bounds[1]>0 and bounds[2]<WIDTH and bounds[3]<HEIGHT, bounds
    assert [g['char'] for g in glyphs]==list(BRAND)
    result={'width':WIDTH,'height':HEIGHT,'x':(240-WIDTH)//2,'y':9,'text':BRAND,
            'pixels':pixels,'palette':PALETTE,'paletteIndices':list(range(1,len(PALETTE))),
            'bounds':list(bounds),'glyphs':glyphs,'outlinePixels':3,'shadowOffset':[2,3],
            'adaptation':'Original hand-shaped PokéFolio pixel wordmark: irregular individually placed contours, golden fill, three-pixel blue outline and hard navy extrusion; no font or source-game pixels.'}
    return result,im

if __name__=='__main__':
    data,image=build()
    (ROOT/'pokefolio-wordmark.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
    image.save(ROOT/'pokefolio-wordmark.png')
    print(f'Authored {BRAND}: {WIDTH}x{HEIGHT}; bounds={data["bounds"]}; {len(PALETTE)-1} opaque colors')
