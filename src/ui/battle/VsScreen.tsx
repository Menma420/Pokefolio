'use client';
import { useContext, useMemo, useEffect, useRef } from 'react';
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
import { audioService } from '../../runtime/AudioService';
import { isReducedMotion } from '../../runtime/motion';
export interface VsScreenProps { audienceId: AudienceId }
export function VsScreen({ audienceId }: VsScreenProps) {
  const { n } = useContext(PixelContext);
  const audience = Audiences[audienceId];
  const colors = vsPalette[audienceId as keyof typeof vsPalette] ?? vsPalette.RECRUITER;
  const frame = useArtFrame(true, 90);
  const reduced = isReducedMotion();
  const impactPlayed=useRef(false);
  useEffect(()=>{if(frame>=30&&!impactPlayed.current){impactPlayed.current=true;audioService.play('vs.impact');}},[frame]);
  const slide = reduced ? 0 : Math.max(0, 24 - frame) * 8;
  const stripes = reduced ? 0 : Math.max(0, Math.min(20, frame - 8)) * 2;
  const titleOffset = reduced ? 0 : Math.max(0, 4 - Math.floor((frame - 44) / 2)) * 32;
  const shake = !reduced && frame >= 30 && frame < 34 ? frame % 2 ? 1 : -1 : 0;
  const background = useMemo(() => {
    const width = 240*n, height=160*n, data=new Uint8ClampedArray(width*height*4);
    const inks=colors.map(color=>[...rgb(color),255]);
    const dark=[...rgb(palette.outer),255];
    for(let y=0;y<160;y++){
      const row=new Uint8ClampedArray(width*4);
      for(let x=0;x<240;x++){
        const upper=y<57,lower=y>=60&&y<110;
        const diagonal=((x+(upper?-stripes:stripes)+Math.floor(y/4)*7)%88+88)%88;
        const ink=y===57||y===58||y===110?dark:inks[(upper||lower)&&diagonal<15?1:upper?0:1]!;
        for(let dx=0;dx<n;dx++)row.set(ink,(x*n+dx)*4);
      }
      for(let dy=0;dy<n;dy++)data.set(row,(y*n+dy)*width*4);
    }
    return {width,height,data};
  },[colors,n,stripes]);
  const portrait = (audience?.portraitKey ?? 'portrait-recruiter') as OpeningArt;
  return <GameViewport><section aria-label="Interview challenge" data-vs-frame={frame} data-vs-colors={colors.join(',')} className="absolute inset-0 overflow-hidden" style={{background:colors[0]}}>
    <Raster image={background} style={{position:'absolute',left:0,top:0}} />
    <PixelArtwork name="portrait-visitor" x={18-slide} y={42} label="Visitor portrait" />
    <PixelArtwork name={portrait} x={158+slide} y={0} label="Uttkarsh challenger artwork" />
    {(reduced || frame >= 30) && <PixelArtwork name="vs-lettering" x={92+shake} y={33} label="VS" />}
    {!reduced&&frame>=30&&frame<32&&<div aria-hidden="true" data-vs-impact style={{position:'absolute',inset:0,background:palette.onDark}}/>}
    {(reduced || frame >= 44) && <div style={{position:'absolute',left:'calc(12*var(--u))',top:'calc(98*var(--u))'}}><BitmapText text={audience?.challengerTitle.toUpperCase() ?? 'VISITOR'} color={palette.onDark} shadow={palette.outer}/></div>}
    {(reduced || frame >= 44) && <div data-vs-title style={{position:'absolute',left:`calc(${104+titleOffset}*var(--u))`,top:'calc(80*var(--u))',width:'calc(128*var(--u))',height:'calc(16*var(--u))',padding:'calc(4*var(--u))'}}><PixelArtwork name="vs-title-bar" /><BitmapText text="UTTKARSH" color={palette.onDark} shadow={palette.outer} style={{position:'relative'}} /></div>}
    {(reduced || frame >= 50) && <DialogueBox variant="field" text={audience?.announcement ?? 'The interview begins!'} speed={reduced ? 'instant' : 'fast'} disableInputContext awaitInput={false} onComplete={()=>{}} />}
  </section></GameViewport>;
}
