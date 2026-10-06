'use client';
import { useContext,useEffect,useState,PointerEvent,useMemo,useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { InputAction,globalInputRouter } from '../../core/input';
import { TouchLayout } from './GameViewport';
import { PixelContext } from './PixelContext';
import { Raster } from './Raster';
import { palette } from './palette';
import { rasterText,rgb } from './bitmap';
import { unlockAudio } from '../../runtime/AudioUnlocker';
import { uiStore } from '../../runtime/stores';
type Mode='title'|'world'|'dialogue'|'battle'|'party';
function buttonArt(action:InputAction,active:boolean,dimmed:boolean,m:number) {
 const native=action.length>1?14:action==='X'||action==='Y'?16:20;
 const data=new Uint8ClampedArray(native*native*m*m*4);
 const color=rgb(active?palette.header:palette.inner),border=rgb(palette.outer);
 const directional=action.length>1;
 const disc=[8,12,14,16,18,18,20,20,20,20,20,20,20,20,18,18,16,14,12,8];
 const round=action==='A'||action==='B';
 const inside=(x:number,y:number)=>y>=0&&y<20&&x>=(20-disc[y]!)/2&&x<(20+disc[y]!)/2;
 for(let y=0;y<native;y++)for(let x=0;x<native;x++) {
  if(directional)continue;
  const edge=Math.min(x,y,native-1-x,native-1-y);
  if(round&&!inside(x,y))continue;
  if(!round&&!directional&&edge<2&&((x<4||x>=native-4)&&(y<4||y>=native-4)))continue;
  const rim=round?[[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>!inside(x+dx!,y+dy!)):edge<2;
  const ink=rim?border:dimmed?rgb(palette.disabled):color;
  for(let dy=0;dy<m;dy++)for(let dx=0;dx<m;dx++)data.set([...ink,255],((y*m+dy)*native*m+x*m+dx)*4);
 }
 const label=({UP:'▲',DOWN:'▼',LEFT:'◂',RIGHT:'▸',A:'A',B:'B',X:'X',Y:'Y'})[action];
 const glyph=rasterText(label,8,8,m,palette.outer);
 const ox=(Math.floor((native-8)/2)+(action==='LEFT'?3:action==='RIGHT'?-3:0))*m,oy=(Math.floor((native-8)/2)+(action==='UP'?3:action==='DOWN'?-3:0))*m;
 for(let y=0;y<glyph.height;y++)for(let x=0;x<glyph.width;x++) {
  const source=(y*glyph.width+x)*4;if(glyph.data[source+3])data.set(glyph.data.subarray(source,source+4),((y+oy)*native*m+x+ox)*4);
 }
 return {width:native*m,height:native*m,data};
}
function crossArt(m:number) {
 const width=40*m,data=new Uint8ClampedArray(width*width*4);
 for(let y=0;y<40;y++)for(let x=0;x<40;x++) {
  if(!(x>=14&&x<26||y>=14&&y<26))continue;
  const border=x===0||y===0||x===39||y===39||((x===14||x===25)&&!(y>14&&y<25))||((y===14||y===25)&&!(x>14&&x<25));
  const color=rgb(border?palette.outer:palette.inner);
  for(let dy=0;dy<m;dy++)for(let dx=0;dx<m;dx++)data.set([...color,255],((y*m+dy)*width+x*m+dx)*4);
 }
 return {width,height:width,data};
}
/** Original hard-edged handheld deck. Hit targets and logical controls are unchanged. */
function deckArt(w:number,h:number,m:number){
 const width=w*m,height=h*m,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if((x<2||x>=w-2)&&(y<2||y>=h-2))continue;
  const e=Math.min(x,y,w-1-x,h-1-y),ink=rgb(e===0?palette.outer:e===1?palette.inner:palette.blue);
  for(let dy=0;dy<m;dy++)for(let dx=0;dx<m;dx++)data.set([...ink,255],((y*m+dy)*width+x*m+dx)*4);
 }
 return {width,height,data};
}
function TouchButton({action,label,x,y,size=60,dimmed=false,locked=false}:{action:InputAction;label:string;x:number;y:number;size?:number;dimmed?:boolean;locked?:boolean}) {
 const [active,setActive]=useState(false);
 const {dpr}=useContext(PixelContext);
 const {n:m}=useContext(PixelContext);
 const down=(event:PointerEvent<HTMLButtonElement>)=>{event.preventDefault();if(locked||dimmed)return;void unlockAudio();event.currentTarget.setPointerCapture?.(event.pointerId);setActive(true);globalInputRouter.handlePress(action);};
 const up=()=>{setActive(false);globalInputRouter.handleRelease(action);};
 useEffect(()=>()=>globalInputRouter.handleRelease(action),[action]);
 useEffect(()=>{if(locked||dimmed)globalInputRouter.handleRelease(action);},[action,locked,dimmed]);
 const image=useMemo(()=>buttonArt(action,active,dimmed,m),[action,active,dimmed,m]);
 const artSize=image.width/dpr;
 return <button aria-label={label} aria-disabled={locked||dimmed} data-action={action} onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&!event.repeat&&!locked&&!dimmed){event.preventDefault();globalInputRouter.handlePress(action);globalInputRouter.handleRelease(action);}}} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} style={{position:'absolute',left:x,top:y,width:size,height:size,padding:0,touchAction:'none',opacity:active?1:0.5,background:'transparent',border:0}}>
  <Raster image={image} style={{position:'absolute',left:(size-artSize)/2,top:(size-artSize)/2+(active?m/dpr:0),}}/>
 </button>;
}
export function TouchController({mode='world',artScale=3}:{mode?:Mode;artScale?:3|4}) {
 const mounted=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
 const touch=useContext(TouchLayout);const locked=useStore(uiStore,s=>s.isTransitioning);
 const [dpr,setDpr]=useState(1);
 useEffect(()=>{const update=()=>setDpr(window.devicePixelRatio||1);update();window.addEventListener('resize',update);return ()=>window.removeEventListener('resize',update);},[]);
 if(!mounted||!touch||typeof document==='undefined')return null;
 const topOnly=mode==='title';const dimmed=mode==='battle'||mode==='dialogue';
 const pad=artScale===3?160:216,hit=16*artScale,ab=20*artScale,bankHeight=artScale===3?172:232,mid=(pad-hit)/2;
 return createPortal(<PixelContext.Provider value={{n:Math.round(artScale*dpr),dpr}}><div aria-label="Touch controller" className="touch-controller" data-mode={mode} style={{position:'fixed',inset:0,zIndex:50,pointerEvents:'none','--ui-inner':palette.inner,'--pad-half':`${pad/2}px`,'--bank-half':`${bankHeight/2}px`} as React.CSSProperties}>
  {!topOnly&&<div className="touch-pad" style={{position:'absolute',left:'calc(16px + var(--safe-left, env(safe-area-inset-left, 0px)))',bottom:'calc(16px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',width:pad,height:pad,pointerEvents:'auto'}}>
<Raster image={deckArt(Math.ceil(pad/artScale)+4,Math.ceil(pad/artScale)+4,Math.round(artScale*dpr))} style={{position:'absolute',left:-2*artScale,top:-2*artScale,opacity:0.5,pointerEvents:'none'}}/>
<Raster image={crossArt(Math.round(artScale*dpr))} style={{position:'absolute',left:(pad-40*artScale)/2,top:(pad-40*artScale)/2,opacity:0.5}}/>
   <TouchButton action="UP" label="Move up" x={mid} y={0} size={hit} locked={locked}/><TouchButton action="LEFT" label="Move left" x={0} y={mid} size={hit} locked={locked}/><TouchButton action="RIGHT" label="Move right" x={pad-hit} y={mid} size={hit} locked={locked}/><TouchButton action="DOWN" label="Move down" x={mid} y={pad-hit} size={hit} locked={locked}/>
  </div>}
  <div className="touch-buttons" style={{position:'absolute',right:'calc(16px + var(--safe-right, env(safe-area-inset-right, 0px)))',bottom:'calc(16px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',width:pad,height:bankHeight,pointerEvents:'auto'}}>
   {!topOnly&&<Raster image={deckArt(Math.ceil(pad/artScale)+4,Math.ceil(bankHeight/artScale)+4,Math.round(artScale*dpr))} style={{position:'absolute',left:-2*artScale,top:-2*artScale,opacity:0.5,pointerEvents:'none'}}/>}
   {!topOnly&&<><TouchButton action="X" label="Menu (X)" x={0} y={0} size={hit} dimmed={dimmed} locked={locked}/><TouchButton action="Y" label="Bag (Y)" x={pad-hit} y={0} size={hit} dimmed={dimmed} locked={locked}/><TouchButton action="B" label="B back" x={0} y={bankHeight-ab} size={ab} locked={locked}/></>}
   <TouchButton action="A" label="A confirm" x={28*artScale} y={mid} size={ab} locked={locked}/>
  </div>
 </div></PixelContext.Provider>,document.body);
}
