'use client';
import {useContext,useMemo,type CSSProperties} from 'react';
import {PixelContext} from './PixelContext';
import {Raster} from './Raster';
import {rgb} from './bitmap';
import {palette} from './palette';

export const chromeBox=(x:number,y:number,w:number,h:number):CSSProperties=>({position:'absolute',left:`calc(${x}*var(--u))`,top:`calc(${y}*var(--u))`,width:`calc(${w}*var(--u))`,height:`calc(${h}*var(--u))`});
/** Native opaque pixels only: dimming never relies on alpha-blended CSS. */
export function PixelPattern({x=0,y=0,width=240,height=160,color=palette.outer,secondary,step=2}:{x?:number;y?:number;width?:number;height?:number;color?:string;secondary?:string;step?:number}) {
 const {n}=useContext(PixelContext);
 const image=useMemo(()=>{
  const data=new Uint8ClampedArray(width*height*n*n*4);
  for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++){
   const ink=(xx+yy)%step===0?color:secondary;if(!ink)continue;
   const rgba=[...rgb(ink),255];
   for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(rgba,((yy*n+dy)*width*n+xx*n+dx)*4);
  }
  return {width:width*n,height:height*n,data};
 },[n,width,height,color,secondary,step]);
 return <div aria-hidden="true" data-pixel-pattern style={{...chromeBox(x,y,width,height),pointerEvents:'none'}}><Raster image={image}/></div>;
}

const masks={
 dex:['00111100','01111110','11000011','11011011','11011011','11000011','01111110','00111100'],
 projects:['00111100','01100110','11011011','11011011','01100110','00111100','00011000','00111100'],
 experience:['00111100','00100100','01111110','11000011','11011011','11000011','11111111','01111110'],
 bag:['00111100','00100100','01111110','11011011','11011011','11000011','11111111','01111110'],
 card:['01111110','11000011','11011011','11011011','11000011','11011011','11000011','01111110'],
 options:['00011000','01011010','01111110','11100111','11100111','01111110','01011010','00011000'],
 exit:['01111110','01000010','01011010','01111111','01011010','01000010','01111110','00000000'],
 music:['00001110','00001010','00001010','00001010','01101010','11101110','01101110','00000000'],
 sound:['00010000','00110010','01110101','11110101','11110101','01110101','00110010','00010000'],
 text:['01111110','00011000','00011000','00011000','00011000','00011000','00011000','00111100'],
 motion:['10000000','11001000','11100100','11000010','10000001','00000010','00000100','00001000'],
 controls:['00011000','00011000','01111110','11111111','11111111','01111110','00011000','00011000'],
 reset:['00111100','01100110','11000011','11000000','11001111','01100011','00111110','00000000'],
} as const;
export type GameIconName=keyof typeof masks;
export function GameIcon({name,x=0,y=0,color=palette.header}:{name:GameIconName;x?:number;y?:number;color?:string}) {
 const {n}=useContext(PixelContext);
 const image=useMemo(()=>{const data=new Uint8ClampedArray(8*8*n*n*4),ink=[...rgb(color),255];masks[name].forEach((row,yy)=>[...row].forEach((pixel,xx)=>{if(pixel!=='1')return;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(ink,((yy*n+dy)*8*n+xx*n+dx)*4);}));return {width:8*n,height:8*n,data};},[n,name,color]);
 return <div aria-hidden="true" data-game-icon={name} style={chromeBox(x,y,8,8)}><Raster image={image}/></div>;
}
