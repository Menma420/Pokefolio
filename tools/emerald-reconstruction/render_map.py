#!/usr/bin/env python3
"""Inspectable source layers; runtime consumes indices/entries, never these composites."""
from pathlib import Path
import argparse, json, hashlib
from PIL import Image,ImageDraw
from extract import ROOT,rgb

def definitions(bundle,m):
 p,s=(bundle['tilesets'][m[k]] for k in ['primary','secondary'])
 indices=p['indices']+[0]*(512*64-len(p['indices']))+s['indices']+[0]*(512*64-len(s['indices']))
 colors=[c for bank in p['palettes'][:6]+s['palettes'][6:13] for c in bank];colors[0]=0
 return p,s,indices,colors

def entries(bundle,m,ident):
 tileset=bundle['tilesets'][m['primary' if ident<512 else 'secondary']];local=ident if ident<512 else ident-512
 return tileset['metatiles'][local],tileset['attributes'][local]

def planes(tiles,attr):
 kind=attr>>12
 if kind==0:return [tiles[4:],tiles[:4],[0x3014]*4]
 if kind==1:return [[0]*4,tiles[4:],tiles[:4]]
 if kind==2:return [tiles[4:],[0]*4,tiles[:4]]
 raise ValueError('Invalid layer '+str(kind))

def tile_pixel(indices,entry,x,y):
 x=7-x if entry&0x400 else x;y=7-y if entry&0x800 else y
 return indices[(entry&0x3ff)*64+y*8+x]

def render(bundle,m,width=None,height=None,ids=None):
 p,s,indices,colors=definitions(bundle,m);w=width or m['width'];h=height or m['height'];ids=ids or [v&1023 for v in m['words']]
 layers=[Image.new('RGBA',(w*16,h*16)) for _ in range(3)]
 for cell,ident in enumerate(ids):
  tiles,attr=entries(bundle,m,ident)
  for bg,quadrants in enumerate(planes(tiles,attr)):
   for q,entry in enumerate(quadrants):
    for y in range(8):
     for x in range(8):
      n=tile_pixel(indices,entry,x,y)
      if n:layers[bg].putpixel((cell%w*16+q%2*8+x,cell//w*16+q//2*8+y),tuple(rgb(colors[(entry>>12)*16+n]))+(255,))
 composite=Image.new('RGBA',(w*16,h*16),(0,0,0,255))
 for layer in reversed(layers):composite.alpha_composite(layer)
 return composite,layers

def generate(out):
 bundle=json.loads((out/'bundle.json').read_text());generated=[]
 for name,m in bundle['maps'].items():
  preview,layers=render(bundle,m);folder=out/name;preview.save(folder/'metatile-map.png');generated.append(folder/'metatile-map.png')
  for bg,img in enumerate(layers,1):p=folder/f'BG{bg}.png';img.save(p);generated.append(p)
  ids=sorted(set(w&1023 for w in m['words']+m['border']));cols=16;rows=(len(ids)+cols-1)//cols
  preview,_=render(bundle,m,cols,rows,ids+([ids[0]]*(cols*rows-len(ids))));preview.save(folder/'metatile-atlas.png');generated.append(folder/'metatile-atlas.png')
  (folder/'metatile-atlas-ids.json').write_text(json.dumps(ids)+'\n')
  for role in ['primary','secondary']:
   t=bundle['tilesets'][m[role]];data=t['indices'];im=Image.new('P',(128,((len(data)//64+15)//16)*8));im.putpalette([v for i in range(256) for v in [i,i,i]])
   for i,n in enumerate(data):tile=i//64;pixel=i%64;im.putpixel((tile%16*8+pixel%8,tile//16*8+pixel//8),n*17)
   p=folder/f'tile-atlas-{role}.png';im.save(p);generated.append(p)
   pal=Image.new('RGB',(16*8,16*8))
   for bank,colors in enumerate(t['palettes']):
    for c,word in enumerate(colors):ImageDraw.Draw(pal).rectangle((c*8,bank*8,c*8+7,bank*8+7),fill=tuple(rgb(word)))
   p=folder/f'palette-{role}.png';pal.save(p);generated.append(p)
  overlay=Image.new('RGB',(m['width']*16,m['height']*16));draw=ImageDraw.Draw(overlay)
  for i,word in enumerate(m['words']):_,attr=entries(bundle,m,word&1023);draw.rectangle((i%m['width']*16,i//m['width']*16,i%m['width']*16+15,i//m['width']*16+15),fill=[(50,120,220),(220,120,50),(120,220,50)][attr>>12])
  overlay.save(folder/'layer-type.png');generated.append(folder/'layer-type.png')
 manifest=json.loads((out/'manifest.json').read_text())
 for p in generated:manifest['outputs'][str(p.relative_to(out))]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'sourceCommit':bundle['sourceCommit'],'transformation':'source tile-entry/priority composition; no objects; bit-replicated BGR555','inputs':list(v['sourcePath'] for v in manifest['inputs'])}
 (out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n');print(f'{len(generated)} map/layer/tileset/palette diagnostics')
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--out-dir',type=Path,default=ROOT/'artifacts/emerald-source');a=ap.parse_args();generate(a.out_dir)
