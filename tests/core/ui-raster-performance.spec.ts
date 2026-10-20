import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {UiPainter,sourceRgb} from '../../src/core/emerald/ui';
const hash=(data:Uint8ClampedArray)=>createHash('sha256').update(data).digest('hex');
describe('allocation-free source UI pixels',()=>{
 it('retains the original RGB555 expansion for every source color and clipping',()=>{
  const painter=new UiPainter(),expected=new Uint8ClampedArray(painter.data.length);
  for(let color=0;color<32768;color++){
   painter.pixel(color%240,Math.floor(color/240),color);
   expected.set([...sourceRgb(color),255],color*4);
  }
  painter.pixel(-1,0,0x7fff);painter.pixel(240,0,0x7fff);painter.pixel(0,-1,0x7fff);painter.pixel(0,160,0x7fff);
  expect(hash(painter.data)).toBe(hash(expected));
 });
 it('matches the previous byte-wise expansion at every integer scale 1–8, including alpha',()=>{
  const p=new UiPainter();for(let i=0;i<p.data.length;i++)p.data[i]=(i*13+(i>>9))&255;
  for(let n=1;n<=8;n++){
   const image=p.image(n),expected=new Uint8ClampedArray(image.data.length);
   for(let y=0;y<160*n;y++)for(let x=0;x<240*n;x++){
    const src=(Math.floor(y/n)*240+Math.floor(x/n))*4,dest=(y*240*n+x)*4;
    for(let c=0;c<4;c++)expected[dest+c]=p.data[src+c]!;
   }
   expect([image.width,image.height]).toEqual([240*n,160*n]);
   expect(hash(image.data),`scale ${n}`).toBe(hash(expected));
  }
  const first=p.image();p.data[0]=99;expect(first.data[0]).toBe(0);expect(p.image().data[0]).toBe(99);
  for(const invalid of [0,-1,1.5,NaN])expect(()=>p.image(invalid)).toThrow('Integer UI scale');
 });
});
