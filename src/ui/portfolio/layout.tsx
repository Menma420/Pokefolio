'use client';
import {useContext,useMemo,type CSSProperties,type ReactNode} from 'react';
import {PixelContext,TextColorContext} from '../kit/PixelContext';
import {Raster} from '../kit/Raster';
import {rgb} from '../kit/bitmap';
import {Window} from '../kit/Window';
import {BitmapText} from '../kit/BitmapText';
import {Cursor} from '../kit/Cursor';
import {palette} from '../kit/palette';
import {paginateDialogue} from '../kit/text';
export const px=(n:number)=>`calc(${n}*var(--u))`;
export function box(x:number,y:number,width:number,height:number):CSSProperties{return {position:'absolute',left:px(x),top:px(y),width:px(width),height:px(height)};}
export function Rect({x,y,width,height,color,outline=false}:{x:number;y:number;width:number;height:number;color:string;outline?:boolean}){
 const {n}=useContext(PixelContext),image=useMemo(()=>{const data=new Uint8ClampedArray(width*height*n*n*4),ink=[...rgb(color),255];for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++){if(outline&&xx!==0&&yy!==0&&xx!==width-1&&yy!==height-1)continue;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)data.set(ink,((yy*n+dy)*width*n+xx*n+dx)*4);}return {width:width*n,height:height*n,data};},[width,height,color,n,outline]);
 return <div aria-hidden="true" style={box(x,y,width,height)}><Raster image={image}/></div>;
}
export function Text({text,x,y,width,pitch=16,maxLines,color}:{text:string;x:number;y:number;width?:number;pitch?:number;maxLines?:number;color?:string}){return <div style={{position:'absolute',left:px(x),top:px(y)}}><BitmapText text={text} width={width} pitch={pitch} maxLines={maxLines} color={color}/></div>;}
export function Screen({name,children,fill='cream'}:{name:string;children:ReactNode;fill?:'cream'|'gold'}){return <main aria-label={name} data-portfolio-screen={name} style={box(0,0,240,160)}><Window fill={fill} style={{width:'100%',height:'100%',padding:0}}>{children}</Window></main>;}
export function Header({name,right,onLeft,onRight,icon}:{name:string;right?:string;onLeft?:()=>void;onRight?:()=>void;icon?:ReactNode}){return <><Rect x={7} y={7} width={226} height={16} color={palette.header}/>{icon}<Text text={name} x={icon?29:11} y={11} color={palette.onDark}/>{right&&<><Text text={right} x={124} y={11} width={100} maxLines={1} color={palette.onDark}/>{onLeft&&<button aria-label="Previous category or page" onClick={onLeft} style={box(117,7,12,16)}><Text text="◂" x={0} y={4} color={palette.onDark}/></button>}{onRight&&<button aria-label="Next category or page" onClick={onRight} style={box(220,7,12,16)}><Text text="▸" x={2} y={4} color={palette.onDark}/></button>}</>}</>;}
export function Row({name,selected,y,onTap,children,x=7,width=226,height=16,pressed=false,disabled=false}:{name:string;selected:boolean;y:number;onTap:()=>void;children:ReactNode;x?:number;width?:number;height?:number;pressed?:boolean;disabled?:boolean}){const inherited=useContext(TextColorContext);return <button type="button" aria-label={name} aria-current={selected?'true':undefined} aria-disabled={disabled||undefined} data-row-selected={selected} data-row-pressed={pressed} onClick={onTap} style={{...box(x,y,width,height),textAlign:'left',color:pressed?palette.link:undefined}}>{selected&&<div style={box(0,0,8,8)}><Cursor/></div>}<TextColorContext.Provider value={pressed?{...inherited,color:palette.link}:inherited}>{children}</TextColorContext.Provider></button>;}
export function Divider({y}:{y:number}){return <Rect x={11} y={y} width={218} height={1} color={palette.inner}/>;}
export function pages(text:string,width:number,lines:number){const all=paginateDialogue(text||'No authored information supplied.',width).flatMap(page=>page.split('\n'));const output=[];for(let i=0;i<all.length;i+=lines)output.push(all.slice(i,i+lines).join('\n'));return output;}
export function ScrollArrows({start,total,visible=8}:{start:number;total:number;visible?:number}){return <>{start>0&&<Text text="▲" x={225} y={25}/>} {start+visible<total&&<Text text="▼" x={225} y={145}/>}</>;}
export const bounded=(i:number,delta:number,length:number)=>Math.max(0,Math.min(length-1,i+delta));
export const firstRow=(selected:number,visible:number)=>Math.max(0,selected-visible+1);
