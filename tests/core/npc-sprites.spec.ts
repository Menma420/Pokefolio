import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../public/assets/world/manifest.json';
import trainer from '../../assets-src/world/npcs/trainer.json';
import unchanged from '../fixtures/npc-unaffected-art.json';
import {decodePng,cropPixels} from '../helpers/png';
import {indexedSprite} from '../helpers/indexed-sprite';
import {characterArt} from '../../src/game/worldArt';
const atlas=JSON.parse(fs.readFileSync('public'+manifest.characters.atlas,'utf8'));
const image=decodePng(fs.readFileSync('public'+manifest.characters.image));
const frame=(name:string)=>{const f=atlas.frames[name].frame;return cropPixels(image,f.x,f.y,16,32);};
const directions={down:[0,3,4],up:[1,5,6],left:[2,7,8],right:[2,7,8]};
describe('supplied Steven, May and supplied Trainer neighbor',()=>{
 it('maps the challenger, guide and neighbor without changing their logical identities',()=>{
  expect(characterArt('challenger','player')).toBe('challenger');expect(characterArt('route-guide','player')).toBe('npc-guide');expect(characterArt('route-neighbor','player')).toBe('npc-neighbor');
  expect(manifest.footprint).toEqual({width:16,height:16});expect(manifest.artBox).toEqual({width:16,height:32});
 });
 for(const [art,filename,digest] of [
  ['challenger','steven','1985641fddd18d7ac996228eb9160ca67f6806cfd002e15518083607a015b3d8'],
  ['npc-guide','may','7f185cda9854f7812545c306795b454dc750be440e582974518ba8a63c9b7e87'],
 ] as const)it(`${art} matches every original source cell with only its authorized palette mapping`,()=>{
  const source=indexedSprite(`assets-src/world/npcs/${filename}.png`,digest);
  for(const [direction,ids] of Object.entries(directions))for(const [pose,slot] of Object.entries({idle:0,'0':0,'1':1,'2':2})){
   const expected=new Uint8Array(16*32*4);
   for(let y=0;y<32;y++)for(let x=0;x<16;x++){
    const sourceX=ids[slot]!*16+(direction==='right'?15-x:x),index=source.indices[y*144+sourceX]!;
    if(!index)continue;expected.set([...source.palette[index]!,255],(y*16+x)*4);
   }
   expect(frame(`${art}-${direction}-${pose}`).data).toEqual(expected);
   expect(atlas.frames[`${art}-${direction}-${pose}`]).toMatchObject({trimmed:false,pivot:{x:0.5,y:1},sourceSize:{w:16,h:32}});
  }
 });
 it('matches every Trainer slot exactly to the owner-supplied four-direction sheet',()=>{
  const bytes=fs.readFileSync('assets-src/world/npcs/Trainer-4dir.png');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('f0b66a0fbf6a87577541125d5174c4ce8c4e6adeb6b9a29008cc01899465b645');
  const golden=decodePng(bytes);expect(golden.width).toBe(64);expect(golden.height).toBe(32);
  for(const [direction,cell] of Object.entries({down:0,up:1,left:2,right:3}))for(const pose of ['idle','0','1','2']){
   expect(frame(`npc-neighbor-${direction}-${pose}`).data).toEqual(cropPixels(golden,cell*16,0,16,32).data);
   expect(atlas.frames[`npc-neighbor-${direction}-${pose}`]).toMatchObject({trimmed:false,pivot:{x:0.5,y:1},sourceSize:{w:16,h:32}});
  }
 });
 it('preserves the single Trainer export and supplied East/West orientation without fabricating walking art',()=>{
  const bytes=fs.readFileSync('assets-src/world/npcs/Trainer.png');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('dfdb0f2e14f25b4f043a24266452a37d87cbc6928a418a1c1712450290622389');
  expect(frame('npc-neighbor-down-idle').data).toEqual(decodePng(bytes).data);
  const west=frame('npc-neighbor-left-idle'),east=frame('npc-neighbor-right-idle');
  for(let y=0;y<32;y++)for(let x=0;x<16;x++)expect(east.data.slice((y*16+x)*4,(y*16+x)*4+4)).toEqual(west.data.slice((y*16+15-x)*4,(y*16+15-x)*4+4));
  expect(trainer.poseMapping).toEqual({idle:0,'0':0,'1':0,'2':0});
 });
 it('preserves Brendan and terrain exactly and keeps the variant distinct from Steven',()=>{
  expect(manifest.tiles).toEqual(unchanged.tiles);
  for(const [name,hash] of Object.entries(unchanged.playerFrames))expect(createHash('sha256').update(frame(name).data).digest('hex')).toBe(hash);
  expect(trainer.source).toBe('assets-src/world/npcs/Trainer-4dir.png');
  expect(frame('npc-neighbor-down-idle').data).not.toEqual(frame('challenger-down-idle').data);
 });
});
