import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {expandBattlePixels} from '../../src/game/battlePixels';
it('retains every RGBA byte and transparent physical prefix at DPR 1/2/3 and scales 1–8',()=>{
 const source=new Uint8ClampedArray(240*160*4);for(let i=0;i<source.length;i++)source[i]=(i*23+(i>>8))&255;
 for(const dpr of [1,1.25,2,3])for(let n=1;n<=8;n++){
  const prefixX=Math.ceil(dpr)-1,prefixY=0;
  const im=expandBattlePixels(source,n,prefixX,prefixY,dpr),expected=new Uint8ClampedArray(im.data.length);
  for(let y=0;y<160*n;y++)for(let x=0;x<240*n;x++){
   const from=(Math.floor(y/n)*240+Math.floor(x/n))*4,to=((y+prefixY)*im.width+x+prefixX)*4;
   for(let c=0;c<4;c++)expected[to+c]=source[from+c]!;
  }
  const hash=(bytes:Uint8ClampedArray)=>createHash('sha256').update(bytes).digest('hex');
  expect(hash(im.data),`DPR ${dpr}, scale ${n}`).toBe(hash(expected));
  expect(im.data.length).toBe(im.width*im.height*4);expect(Number.isInteger(im.width)&&Number.isInteger(im.height)).toBe(true);
 }
});
