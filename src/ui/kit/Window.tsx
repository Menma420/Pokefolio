'use client';
import { CSSProperties, ReactNode, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { palette } from './palette';
import { PixelContext, TextColorContext, WindowContentContext } from './PixelContext';
import { Raster } from './Raster';
import { BitmapText } from './BitmapText';
import { rgb } from './bitmap';
import frameAtlas from '../../../assets-src/ui/frames.json';
type FrameKind='standard'|'message'|'menu'|'plate'|'document';
interface WindowProps { children: ReactNode; className?: string; style?: CSSProperties; fill?: 'cream'|'blue'|'gold'; header?: string; frame?:FrameKind }
/** Pixel atlas geometry is generated from tokens at render time; no baked border colors. */
export function windowPixels(width: number, height: number, n: number, fill: string, outer: string = palette.outer, inner: string = palette.inner) {
  const data = new Uint8ClampedArray(width*height*n*n*4);
  const colors = {fill: rgb(fill), outer: rgb(outer), inner: rgb(inner)};
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    if((x===0 || x===width-1) && (y===0 || y===height-1)) continue;
    const edge = Math.min(x,y,width-1-x,height-1-y);
    const innerCorner = (x===2 || x===width-3) && (y===2 || y===height-3);
    const color = edge<2 ? colors.outer : edge===2 && !innerCorner ? colors.inner : colors.fill;
    for(let dy=0;dy<n;dy++) for(let dx=0;dx<n;dx++) data.set([...color,255],((y*n+dy)*width*n+x*n+dx)*4);
  }
  return {width:width*n,height:height*n,data};
}
/** Authored corner/edge masks are tiled as a token-colored nine-slice frame. */
export function framedPixels(width:number,height:number,n:number,fill:string,kind:FrameKind) {
 if(kind==='standard')return windowPixels(width,height,n,fill);
 const data=new Uint8ClampedArray(width*height*n*n*4),atlas=frameAtlas[kind];
 const colors=[null,palette.outer,palette.onDark,palette.inner,fill,palette.shadow];
 // Original 6×6 corner slices and straight edge slices use palette tokens.
 // Mirror positions, then replace the lower/right bevel with a dark authored edge.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const cx=Math.min(x,width-1-x),cy=Math.min(y,height-1-y),e=Math.min(cx,cy);
  let token=cx<6&&cy<6?Number(atlas.corner[cy]![cx]):atlas.edge[e]??4;
  if(token===2&&(x>=width-2||y>=height-2))token=1;
  if(kind==='document'&&x===width-6&&y>=3&&y<9)token=1;
  const ink=colors[token];if(!ink)continue;const rgba=[...rgb(ink),255];
  for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(rgba,((y*n+dy)*width*n+x*n+dx)*4);
 }

 return {width:width*n,height:height*n,data};
}
export function Window({children,className='',style,fill='cream',header,frame='standard'}:WindowProps) {
  const ref=useRef<HTMLDivElement>(null); const {n,dpr}=useContext(PixelContext);
  const [size,setSize]=useState({width:240,height:160});
  useLayoutEffect(()=>{
    const element=ref.current; if(!element)return;
    const update=()=>{const rect=element.getBoundingClientRect(); const width=Math.round(rect.width*dpr/n),height=Math.round(rect.height*dpr/n);if(width>0&&height>0)setSize(old=>old.width===width&&old.height===height?old:{width,height});};
    update();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);observer?.observe(element);return ()=>observer?.disconnect();
  },[n,dpr]);
  const image=useMemo(()=>framedPixels(size.width,size.height,n,palette[fill],frame),[size,n,fill,frame]);
  const dark=fill==='blue';
  return <div ref={ref} data-window={fill} data-frame={frame} className={`pixel-window flex flex-col ${className}`} style={{'--window-text':dark?palette.onDark:palette.text,'--window-shadow':dark?palette.outer:palette.shadow,...style} as CSSProperties}>
    <Raster image={image} style={{position:'absolute',left:0,top:0,zIndex:-1}}/>
    <WindowContentContext.Provider value={{width:size.width-14,height:size.height-14}}><TextColorContext.Provider value={{color:dark?palette.onDark:palette.text,shadow:dark?palette.outer:palette.shadow}}>{header && <div className="pixel-header"><BitmapText text={header} color={palette.onDark} shadow={palette.outer}/></div>}{children}</TextColorContext.Provider></WindowContentContext.Provider>
  </div>;
}
