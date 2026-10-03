'use client';
import { useContext, useMemo } from 'react';
import { PixelContext } from '../kit/PixelContext';
import { Raster } from '../kit/Raster';
import { rgb } from '../kit/bitmap';
import { AudienceId } from '../../domain/types';
import { Audiences } from '../../content/audiences';
import { GameViewport } from '../kit';
import { BitmapText } from '../kit/BitmapText';
import { DialogueBox } from '../kit/DialogueBox';
import { palette, vsPalette } from '../kit/palette';
import { PixelArtwork, type OpeningArt } from '../opening/PixelArtwork';
import { useArtFrame } from '../opening/useArtFrame';
import { isReducedMotion } from '../../runtime/motion';
export interface VsScreenProps { audienceId: AudienceId }
export function VsScreen({ audienceId }: VsScreenProps) {
  const { n } = useContext(PixelContext);
  const audience = Audiences[audienceId];
  const colors = vsPalette[audienceId as keyof typeof vsPalette] ?? vsPalette.RECRUITER;
  const frame = useArtFrame(true, 90);
  const reduced = isReducedMotion();
  const slide = reduced ? 0 : Math.max(0, 24 - frame) * 8;
  const stripes = reduced ? 0 : Math.max(0, Math.min(20, frame - 8)) * 2;
  const titleOffset = reduced ? 0 : Math.max(0, 4 - Math.floor((frame - 44) / 2)) * 32;
  const shake = !reduced && frame >= 30 && frame < 34 ? frame % 2 ? 1 : -1 : 0;
  const background = useMemo(() => {
    const width = 240*n, height=160*n, data=new Uint8ClampedArray(width*height*4);
    const inks=colors.map(color=>[...rgb(color),255]);
    for(let band=0;band<20;band++){const row=new Uint8ClampedArray(width*4);
      for(let x=0;x<240;x++){const index=((x-band*8-stripes)%32+32)%32<16?0:1;for(let dx=0;dx<n;dx++)row.set(inks[index]!, (x*n+dx)*4);}
      for(let y=band*8*n;y<(band+1)*8*n;y++)data.set(row,y*width*4);
    }
    return {width,height,data};
  },[colors,n,stripes]);
  const portrait = (audience?.portraitKey ?? 'portrait-recruiter') as OpeningArt;
  return <GameViewport><main aria-label="Interview challenge" data-vs-frame={frame} data-vs-colors={colors.join(',')} className="absolute inset-0 overflow-hidden" style={{background:colors[0]}}>
    <Raster image={background} style={{position:'absolute',left:0,top:0}} />
    <PixelArtwork name="portrait-visitor" x={16-slide} y={40} label="Visitor portrait" />
    <PixelArtwork name={portrait} x={160+slide} y={8} label="Uttkarsh challenger artwork" />
    {(reduced || frame >= 30) && <PixelArtwork name="vs-lettering" x={92+shake} y={40} label="VS" />}
    {(reduced || frame >= 44) && <div data-vs-title style={{position:'absolute',left:`calc(${104+titleOffset}*var(--u))`,top:'calc(80*var(--u))',width:'calc(128*var(--u))',height:'calc(16*var(--u))',padding:'calc(4*var(--u))'}}><PixelArtwork name="vs-title-bar" /><BitmapText text={`THE ${audience?.challengerTitle.toUpperCase() ?? 'VISITOR'}`} color={palette.onDark} shadow={palette.outer} style={{position:'relative'}} /></div>}
    {(reduced || frame >= 50) && <DialogueBox variant="field" text={audience?.announcement ?? 'The interview begins!'} speed={reduced ? 'instant' : 'fast'} disableInputContext awaitInput={false} onComplete={()=>{}} />}
  </main></GameViewport>;
}
