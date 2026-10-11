#!/usr/bin/env python3
"""Exact native pixel comparison; no perceptual scores or implied emulator provenance."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image

def compare(actual,reference,out,kind,state):
 a,b=Image.open(actual).convert('RGBA'),Image.open(reference).convert('RGBA')
 if a.size!=(240,160) or b.size!=(240,160):raise ValueError('Compare native 240x160 frames before upscaling')
 manifest=json.loads(Path(state).read_text())
 if kind=='authentic-emulator' and not all(k in manifest for k in ['sourceCommit','map','player','camera','flags','vars','logicalFrame','emulator','romSha256']):raise ValueError('Authentic capture needs reproducible source, ROM/emulator and state provenance')
 diff=Image.new('RGBA',a.size,(0,0,0,255));mismatch=channels=0
 for y in range(160):
  for x in range(240):
   p,q=a.getpixel((x,y)),b.getpixel((x,y))
   if p!=q:mismatch+=1;channels+=sum(v!=w for v,w in zip(p,q));diff.putpixel((x,y),(255,0,255,255))
 out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);diff.save(out.with_suffix('.png'))
 report={'comparisonKind':kind,'nativeDimensions':[240,160],'mismatchedPixels':mismatch,'mismatchedChannels':channels,'totalPixels':38400,'actualSha256':hashlib.sha256(Path(actual).read_bytes()).hexdigest(),'referenceSha256':hashlib.sha256(Path(reference).read_bytes()).hexdigest(),'state':manifest,'authenticFrameParityProven':kind=='authentic-emulator' and mismatch==0}
 out.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(f'{kind}: {mismatch}/38400 differing pixels');return mismatch
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--actual',required=True);ap.add_argument('--reference',required=True);ap.add_argument('--out',required=True);ap.add_argument('--kind',choices=['independent-renderer','authentic-emulator'],required=True);ap.add_argument('--state',required=True);a=ap.parse_args();raise SystemExit(1 if compare(a.actual,a.reference,a.out,a.kind,a.state) else 0)
