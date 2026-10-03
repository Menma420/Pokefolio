'use client';
import { useContext,useMemo } from 'react';
import assets from '../../../assets-src/battle/art.json';
import { PixelContext } from '../kit/PixelContext';
import { Raster } from '../kit/Raster';
import { palette } from '../kit/palette';
import { rgb } from '../kit/bitmap';
export type BattleAsset=keyof typeof assets;
export function battleRaster(name:BattleAsset,n:number,silhouette=false) {
 const a=assets[name],width=a.width*n,height=a.height*n,data=new Uint8ClampedArray(width*height*4);let p=0;
 for(let i=0;i<a.runs.length;i+=2){const ink=a.palette[a.runs[i]!],count=a.runs[i+1]!;if(ink){const color=[...rgb(silhouette?palette.text:ink),255];for(let j=p;j<p+count;j++){const x=j%a.width,y=Math.floor(j/a.width);for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(color,((y*n+dy)*width+x*n+dx)*4);}}p+=count;}
 return {width,height,data};
}
export function BattleArtwork({name,x=0,y=0,silhouette=false,label}:{name:string;x?:number;y?:number;silhouette?:boolean;label?:string}) {
 const {n}=useContext(PixelContext);const key=name as BattleAsset;const image=useMemo(()=>assets[key]?battleRaster(key,n,silhouette):null,[key,n,silhouette]);
 if(!image)return <span role="img" aria-label={label??'Unavailable project artwork'}>…</span>;
 return <div role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} data-battle-art={name} style={{position:'absolute',left:`calc(${x}*var(--u))`,top:`calc(${y}*var(--u))`,width:`calc(${assets[key].width}*var(--u))`,height:`calc(${assets[key].height}*var(--u))`}}><Raster image={image} style={{position:'absolute',left:0,top:0}}/></div>;
}
