'use client';
import { CSSProperties, useContext, useMemo } from 'react';
import { PixelContext, TextColorContext } from './PixelContext';
import { Raster } from './Raster';
import { palette } from './palette';
import { rgb } from './bitmap';
export function cursorPixels(n:number,direction:'right'|'down',dark:boolean) {
 const width=8*n;const data=new Uint8ClampedArray(width*width*4);
 const rows=direction==='right'?['01000000','01100000','01110000','01111000','01110000','01100000','01000000','00000000']:['00000000','00000000','11111110','01111100','00111000','00010000','00000000','00000000'];
 const darkRows=direction==='right'?['00000000','00100000','00110000','00111000','00110000','00100000','00000000','00000000']:['00000000','00000000','01111100','00111000','00010000','00000000','00000000','00000000'];
 const cells=(dark?darkRows:rows).map(row=>[...row].map(bit=>bit==='1'));
 for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
  const inside=cells[y]![x];const outline=dark&&!inside&&[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>cells[y+dy!]?.[x+dx!]);
  if(!inside&&!outline)continue;
  const color=rgb(inside?(dark?palette.onDark:palette.text):palette.outer);
  for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set([...color,255],((y*n+dy)*width+x*n+dx)*4);
 }
 return {width,height:width,data};
}
export function Cursor({className='',style={},direction='right',dark:darkOverride}:{className?:string;style?:CSSProperties;direction?:'right'|'down';dark?:boolean}) {
 const {n,dpr}=useContext(PixelContext);const inherited=useContext(TextColorContext);const dark=darkOverride??inherited.color===palette.onDark;const image=useMemo(()=>cursorPixels(n,direction,dark),[n,direction,dark]);
 return <span aria-hidden="true" data-cursor={direction} className={`pixel-cursor ${className}`} style={{display:'inline-block',position:'relative',width:8*n/dpr,height:8*n/dpr,flexShrink:0,verticalAlign:'top',...style}}><Raster image={image}/></span>;
}
