import Phaser from 'phaser';
import { expandBattlePixels } from './battlePixels';
/** Phaser keeps its 240×160 logical surface. Expand authored cells into physical pixels,
 * with whole-CSS anchoring and transparent device-pixel prefixes (as in the UI Raster). */
export function mountBattleRaster(game:Phaser.Game):{dirty:()=>void;destroy:()=>void} {
 const logical=game.canvas,canvas=document.createElement('canvas');canvas.dataset.bitmap='true';canvas.dataset.battleRaster='physical';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'absolute',display:'block',pointerEvents:'none',imageRendering:'pixelated'});
 const previousOpacity=logical.style.opacity;logical.style.opacity='0';logical.parentElement!.appendChild(canvas);
 let dirty=true,lastGeometry='',disposed=false;
 const draw=()=>{
  if(disposed||!logical.parentElement)return;
  const rect=logical.getBoundingClientRect(),parent=logical.parentElement!.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const n=Math.round(rect.width*dpr/240);if(n<1)return;
  const anchorX=Math.floor(rect.left),anchorY=Math.floor(rect.top),prefixX=Math.round(rect.left*dpr)-Math.round(anchorX*dpr),prefixY=Math.round(rect.top*dpr)-Math.round(anchorY*dpr);
  const geometry=[n,dpr,rect.left,rect.top,parent.left,parent.top].join(',');if(!dirty&&geometry===lastGeometry)return;
  lastGeometry=geometry;dirty=false;
  const native=logical.getContext('2d')!.getImageData(0,0,240,160),image=expandBattlePixels(native.data,n,prefixX,prefixY,dpr);
  canvas.width=image.width;canvas.height=image.height;canvas.style.width=`${image.width/dpr}px`;canvas.style.height=`${image.height/dpr}px`;canvas.style.left=`${anchorX-parent.left}px`;canvas.style.top=`${anchorY-parent.top}px`;
  const context=canvas.getContext('2d')!;context.imageSmoothingEnabled=false;context.putImageData(new ImageData(image.data,image.width,image.height),0,0);canvas.dataset.scale=String(n);canvas.dataset.ready='true';
 };
 game.events.on(Phaser.Core.Events.POST_RENDER,draw);
 return {dirty:()=>{dirty=true;},destroy:()=>{disposed=true;game.events.off(Phaser.Core.Events.POST_RENDER,draw);logical.style.opacity=previousOpacity;canvas.remove();}};
}
