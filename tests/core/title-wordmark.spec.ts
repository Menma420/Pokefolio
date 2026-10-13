import {describe,it,expect} from 'vitest';
import {titleUi,titleWordmark} from '../../src/core/emerald/titleUi';
import {type EmeraldUi,sourceRgb} from '../../src/core/emerald/ui';

describe('app-owned PokéFolio title wordmark',()=>{
 it('uses individually shaped, integer-pixel lettering with an explicit acute and dot',()=>{
  const logo=titleWordmark;
  expect(logo.text).toBe('PokéFolio');expect(logo.glyphs.map(g=>g.char).join('')).toBe(logo.text);
  expect([logo.width,logo.height,logo.x,logo.y]).toEqual([216,60,12,9]);
  expect(logo.pixels).toHaveLength(logo.width*logo.height);
  expect(logo.outlinePixels).toBe(3);expect(logo.shadowOffset).toEqual([2,3]);
  expect(logo.pixels.every(index=>Number.isInteger(index)&&index>=0&&index<logo.palette.length)).toBe(true);
  expect(logo.paletteIndices.every(index=>logo.pixels.includes(index))).toBe(true);
  expect(new Set(logo.glyphs.map(g=>g.baseline)).size).toBeGreaterThan(3);
  const acute=logo.glyphs.find(g=>g.char==='é')!;
  expect(acute.accent).toHaveLength(5);
  for(const [x,y] of acute.accent!){expect(Number.isInteger(x)&&Number.isInteger(y)).toBe(true);expect(logo.pixels[y!*logo.width+x!]).toBeGreaterThan(0);}
  expect(Math.max(...acute.accent!.map(point=>point[1]!))).toBeLessThan(acute.bodyTop-2);
  expect(logo.glyphs.find(g=>g.char==='i')!.dot).toHaveLength(4);
  const [left,top,right,bottom]=logo.bounds;
  expect(left).toBeGreaterThan(0);expect(top).toBeGreaterThan(0);
  expect(right).toBeLessThan(logo.width);expect(bottom).toBeLessThan(logo.height);
  expect(logo.x+right!).toBeLessThan(240);expect(logo.y+bottom!).toBeLessThan(80);
 });
 it('renders the new branding even with an older pinned release, without altering background pixels',()=>{
  // Minimal background fixture. No extracted source data required in CI.
  const ui={title:{palette:Array(256).fill(0),sine:Array(256).fill(0),wave:Array(64).fill(0),cloudBlend:[6,15],rayquaza:{tiles:Array(64).fill(0),map:Array(1024).fill(0)},clouds:{tiles:Array(64).fill(0),map:Array(1024).fill(0)},logo:{width:1,height:1,x:0,y:0,pixels:[1]}}} as unknown as EmeraldUi;
  const before=JSON.stringify(ui),frame=titleUi(ui,64,false),background=titleUi(ui,64,false,0,false);
  let changed=0;
  for(let y=0;y<160;y++)for(let x=0;x<240;x++){
   const index=x>=titleWordmark.x&&x<titleWordmark.x+titleWordmark.width&&y>=titleWordmark.y&&y<titleWordmark.y+titleWordmark.height?titleWordmark.pixels[(y-titleWordmark.y)*titleWordmark.width+x-titleWordmark.x]!:0;
   const at=(y*240+x)*4;
   if(index){expect([...frame.data.slice(at,at+4)]).toEqual([...sourceRgb(titleWordmark.palette[index]!),255]);changed++;}
   else expect(frame.data.slice(at,at+4)).toEqual(background.data.slice(at,at+4));
  }
  expect(changed).toBeGreaterThan(6500);expect(JSON.stringify(ui)).toBe(before);
  const shifted=titleUi(ui,64,false,-4);
  const gold=titleWordmark.pixels.indexOf(4),x=gold%titleWordmark.width+titleWordmark.x,y=Math.floor(gold/titleWordmark.width)+titleWordmark.y;
  expect(shifted.data.slice(((y-4)*240+x)*4,((y-4)*240+x)*4+4)).toEqual(frame.data.slice((y*240+x)*4,(y*240+x)*4+4));
 });
});
