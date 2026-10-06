import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {indexedSprite} from '../helpers/indexed-sprite';
import manifest from '../../public/assets/world/manifest.json';
import golden from '../../assets-src/world/brendan/golden.json';
import unchanged from '../fixtures/brendan-unaffected-art.json';
import {decodePng,cropPixels} from '../helpers/png';
import {characterFrame,characterPosition} from '../../src/game/worldArt';
import type {WorldEntity} from '../../src/core/world/types';
import type {Direction} from '../../src/domain/map';

const atlas=JSON.parse(fs.readFileSync('public'+manifest.characters.atlas,'utf8'));
const sheet=decodePng(fs.readFileSync('public'+manifest.characters.image));
const frame=(name:string)=>{const f=atlas.frames[name].frame;return cropPixels(sheet,f.x,f.y,16,32);};

describe('immutable Sprite Lab Brendan integration',()=>{
 it('matches every directional idle and walk cell byte-for-byte, with only East mirrored',()=>{
  const source=indexedSprite('assets-src/world/brendan/walking.png','f33ec07a5fd17f4422455f8bc55cd3d3522fa65c3bf740ecbdc00da705eaa0d1');
  expect(golden.directions).toEqual({down:[0,3,4],up:[1,5,6],left:[2,7,8],right:[2,7,8]});
  expect(golden.mirrorDirections).toEqual(['right']);
  expect(golden.poseMapping).toEqual({idle:0,'0':0,'1':1,'2':2});
  for(const [direction,ids] of Object.entries(golden.directions))for(const [pose,slot] of Object.entries(golden.poseMapping)){
   const original=cropPixels(source,ids[slot]!*16,0,16,32),expected=new Uint8Array(original.data.length);
   for(let y=0;y<32;y++)for(let x=0;x<16;x++)expected.set(original.data.subarray((y*16+(direction==='right'?15-x:x))*4,(y*16+(direction==='right'?15-x:x))*4+4),(y*16+x)*4);
   expect(frame(`player-${direction}-${pose}`).data).toEqual(expected);
   expect(atlas.frames[`player-${direction}-${pose}`]).toMatchObject({trimmed:false,pivot:{x:0.5,y:1},sourceSize:{w:16,h:32}});
  }
 });
 it('retains the measured +1 walk translation and stable head silhouette',()=>{
  for(const direction of ['down','up','left','right']){
   const idle=frame(`player-${direction}-idle`);
   for(const pose of [1,2]){const walk=frame(`player-${direction}-${pose}`);for(let y=10;y<=17;y++)for(let x=0;x<16;x++)expect(walk.data[((y+1)*16+x)*4+3]).toBe(idle.data[(y*16+x)*4+3]);}
  }
 });
 it('preserves the terrain atlas independently of later owner-requested NPC replacements',()=>{
  expect(manifest.tiles).toEqual(unchanged.tiles);
 });
 it('leaves world coordinates, anchor, footprint and authoritative animation timing unchanged',()=>{
  expect(manifest.artBox).toEqual({width:16,height:32});expect(manifest.footprint).toEqual({width:16,height:16});
  for(const facing of ['down','up','left','right'] as Direction[]){
   const entity:WorldEntity={id:'player',x:7,y:5,facing,movement:null};expect(characterPosition(entity)).toEqual({x:120,y:96});expect(characterFrame(entity,'player')).toBe(`player-${facing}-idle`);
   for(let elapsedTicks=0;elapsedTicks<8;elapsedTicks++){const moving={...entity,movement:{to:{x:8,y:5},elapsedTicks}};expect(characterPosition(moving)).toEqual({x:120+elapsedTicks*2,y:96});expect(characterFrame(moving,'player')).toBe(`player-${facing}-${[0,1,0,2][Math.floor(elapsedTicks/2)]}`);}
   expect(entity).toEqual({id:'player',x:7,y:5,facing,movement:null});
  }
 });
});
