'use client';
import {useContext,useMemo} from 'react';
import assets from '../../../assets-src/portfolio/art.json';
import {PixelContext} from '../kit/PixelContext';
import {Raster} from '../kit/Raster';
import {rgb} from '../kit/bitmap';
export type PortfolioAsset=keyof typeof assets;
export function portfolioRaster(key:PortfolioAsset,n:number){
 const a=assets[key],width=a.width*n,height=a.height*n,data=new Uint8ClampedArray(width*height*4);let p=0;
 for(let i=0;i<a.runs.length;i+=2){const ink=a.palette[a.runs[i]!],count=a.runs[i+1]!;if(ink){const c=[...rgb(ink),255];for(let j=p;j<p+count;j++){const x=j%a.width,y=Math.floor(j/a.width);for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(c,((y*n+dy)*width+x*n+dx)*4);}}p+=count;}
 return {width,height,data};
}
export function PortfolioArt({name,x=0,y=0,label}:{name:PortfolioAsset;x?:number;y?:number;label?:string}){
 const {n}=useContext(PixelContext),image=useMemo(()=>portfolioRaster(name,n),[name,n]);
 return <div role={label?'img':undefined} aria-label={label} aria-hidden={!label} data-portfolio-art={name} style={{position:'absolute',left:`calc(${x}*var(--u))`,top:`calc(${y}*var(--u))`}}><Raster image={image}/></div>;
}
