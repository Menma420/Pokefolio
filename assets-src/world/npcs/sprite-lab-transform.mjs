// Exact Sprite Lab v0.8.3 integer slot transform. Source SHA256: c9736ab4b719b747b057343167261747f1a9400d488b5de064a9cbd213ed9fd5
const clampInt=(value,min,max)=>Math.min(max,Math.max(min,Math.round(value)));
export function v07TransformPixel(px,srcB,tgtB){
  const sw=Math.max(1,srcB.width),sh=Math.max(1,srcB.height),tw=Math.max(1,tgtB.x1-tgtB.x0+1),th=Math.max(1,tgtB.y1-tgtB.y0+1);
  const tx=tw===1?tgtB.x0:tgtB.x0+Math.round(px.x*(tw-1)/Math.max(1,sw-1));
  const ty=th===1?tgtB.y0:tgtB.y0+Math.round(px.y*(th-1)/Math.max(1,sh-1));
  return{x:clampInt(tx,0,15),y:clampInt(ty,0,31),paletteIndex:px.paletteIndex};
}
