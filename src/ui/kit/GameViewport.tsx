'use client';
import { createContext, ReactNode, useContext, useEffect, useState, CSSProperties } from 'react';
import { palette } from './palette';
import { viewportGeometry } from './viewportGeometry';
import { PixelContext } from './PixelContext';
import Link from 'next/link';
export const GAME_WIDTH = 240;
export const GAME_HEIGHT = 160;
export function getIntegerViewportScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  return Math.max(1, Math.floor(Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)));
}
const InGameViewport = createContext(false);
export const TouchLayout = createContext(false);
export function GameViewport({ children,controllerScale=3 }: { children: ReactNode;controllerScale?:3|4 }) {
  const nested = useContext(InGameViewport);
  const [touched,setTouched]=useState(false);
  const [geometry, setGeometry] = useState({ n: 1, dpr: 1, x: 0, y: 0, small: false, touch: false });
  useEffect(() => {
    if (nested) return;
    const update = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const touch = touched || (window.matchMedia?.('(pointer: coarse)').matches ?? false);
      const probe=document.querySelector<HTMLElement>('[data-safe-area]');
      const safe=probe?getComputedStyle(probe):null;
      const insets={top:parseFloat(safe?.paddingTop??'0')||0,right:parseFloat(safe?.paddingRight??'0')||0,bottom:parseFloat(safe?.paddingBottom??'0')||0,left:parseFloat(safe?.paddingLeft??'0')||0};
      setGeometry(viewportGeometry(w,h,dpr,touch,insets,controllerScale));
    };
    update();
    window.addEventListener('resize', update); window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); window.visualViewport?.removeEventListener('resize', update); };
  }, [nested,touched,controllerScale]);
  if (nested) return <div className="absolute inset-0">{children}</div>;
  const {n,dpr,x,y,small,touch} = geometry;
  return <div role="region" aria-label="Game display" className="fixed inset-0 overflow-hidden" style={{ background: palette.black }}>
    <div data-safe-area aria-hidden="true" style={{position:'absolute',visibility:'hidden',paddingTop:'var(--safe-top, env(safe-area-inset-top, 0px))',paddingRight:'var(--safe-right, env(safe-area-inset-right, 0px))',paddingBottom:'var(--safe-bottom, env(safe-area-inset-bottom, 0px))',paddingLeft:'var(--safe-left, env(safe-area-inset-left, 0px))'}}/>
    {small ? <p style={{ color: palette.onDark }}>This display is too small. <Link href="/about">About</Link> <Link href="/projects">Projects</Link></p> :
      <InGameViewport.Provider value={true}><TouchLayout.Provider value={touch}><PixelContext.Provider value={{n,dpr,originX:x*dpr,originY:y*dpr}}>
        <div role="region" aria-label="Game frame" tabIndex={-1} data-scale={n} onPointerDown={event=>{if(event.pointerType==='touch')setTouched(true);}} className="game-surface absolute overflow-hidden" style={{
          ...Object.fromEntries(Object.entries(palette).map(([key,value]) => [`--ui-${key}`,value])), '--u': `${n/dpr}px`, '--game-scale': n, left:x, top:y, width:240*n/dpr, height:160*n/dpr,
          // Preserve the last physical pixel when CSS layout quantizes n/DPR to 1/64px.
          // The extra clip margin contains transparent raster padding, not native content.
          overflow:'clip', overflowClipMargin:'1px',
          imageRendering:'pixelated', isolation:'isolate', background:palette.black, outline:'none',
        } as CSSProperties}>{children}</div>
      </PixelContext.Provider></TouchLayout.Provider></InGameViewport.Provider>}
  </div>;
}
