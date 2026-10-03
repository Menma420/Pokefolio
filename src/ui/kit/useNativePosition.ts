'use client';
import { useContext,useLayoutEffect,useRef } from 'react';
import { PixelContext } from './PixelContext';
/** Snap presentation boxes to the native grid relative to the frame, not to the browser baseline. */
export function useNativePosition<T extends HTMLElement>(key:unknown) {
 const ref=useRef<T>(null);const {n,dpr,originX=0,originY=0}=useContext(PixelContext);
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  const snap=()=>{
   element.style.left='0px';element.style.top='0px';
   const rect=element.getBoundingClientRect();
   element.style.left=`${(originX+Math.round((rect.left*dpr-originX)/n)*n)/dpr-rect.left}px`;
   element.style.top=`${(originY+Math.round((rect.top*dpr-originY)/n)*n)/dpr-rect.top}px`;
  };
  snap();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(snap);if(element.parentElement)observer?.observe(element.parentElement);
  return ()=>observer?.disconnect();
 },[n,dpr,originX,originY,key]);
 return ref;
}
