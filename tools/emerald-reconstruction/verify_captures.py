#!/usr/bin/env python3
"""Pixel-exact physical nearest-neighbor validation of browser screenshots."""
import json
from PIL import Image,ImageChops
from extract import ROOT
folder=ROOT/'artifacts/emerald-source/screenshots';reports=[];baseline=Image.open(folder/'town-1x-native.png').convert('RGBA')
for path in sorted(folder.glob('town-*-geometry.json')):
 label=path.name.removesuffix('-geometry.json');geometry=json.loads(path.read_text());w,h=geometry['viewportCSS'];dpr=geometry['dpr'];n=geometry['integerScale'];native=Image.open(folder/(label+'-native.png')).convert('RGBA');actual=Image.open(folder/(label+'.png')).convert('RGBA')
 x=(w*dpr-240*n)//2;y=(h*dpr-160*n)//2;crop=actual.crop((x,y,x+240*n,y+160*n));expected=native.resize((240*n,160*n),Image.Resampling.NEAREST)
 mismatches=sum(p!=q for p,q in zip(crop.get_flattened_data(),expected.get_flattened_data()));native_mismatches=sum(p!=q for p,q in zip(native.get_flattened_data(),baseline.get_flattened_data()));colors=set(native.get_flattened_data());intermediate=sum(p not in colors for p in crop.get_flattened_data());diff=ImageChops.difference(crop,expected);diff.save(folder/(label+'-physical-diff.png'))
 reports.append({**geometry,'screenshot':label+'.png','physicalRasterDimensions':list(actual.size),'physicalCrop':[x,y,240*n,160*n],'physicalMismatchCount':mismatches,'nativeStateMismatchCount':native_mismatches,'intermediateColorCount':intermediate,'nativeColorCount':len(colors),'histogram':{','.join(map(str,c)):count for count,c in crop.getcolors(crop.width*crop.height)}})
print(json.dumps([{k:v for k,v in r.items() if k!='histogram'} for r in reports],indent=2));(folder/'physical-validation.json').write_text(json.dumps(reports,indent=2)+'\n');assert reports and all(r['physicalMismatchCount']==r['nativeStateMismatchCount']==r['intermediateColorCount']==0 for r in reports)
