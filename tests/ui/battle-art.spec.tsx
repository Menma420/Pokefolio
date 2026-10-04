import { expandBattlePixels } from '../../src/game/battlePixels';
import { render } from '@testing-library/react';
import { PartyScreen } from '../../src/ui/battle/PartyScreen';
import { getParty } from '../../src/content/party';
import { getProject } from '../../src/content/registry';
import { AUDIENCE_ENGINEER,AUDIENCE_FRIEND } from '../../src/content/audiences';
import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import art from '../../assets-src/battle/art.json';
import manifest from '../../assets-src/battle/manifest.json';
import { battleRaster } from '../../src/ui/battle/BattleArtwork';
import { battleArtFrame,attachBattleView } from '../../src/runtime/BattleView';
import { createGameBridge } from '../../src/runtime/gameBridge';
import { FakeClock } from '../../src/core/clock';
import { getProjectDefinitions } from '../../src/content/registry';
import { decodePng } from '../helpers/png';

describe('B3 authored battle view',()=>{
 it('loads complete original scene, sprites and all project/Party art without missing source assets',()=>{
  expect(art.background).toMatchObject({width:240,height:160});
  expect(art['opponent-platform']).toMatchObject({width:96,height:24});
  expect(art['visitor-platform']).toMatchObject({width:104,height:24});
  for(const name of ['visitor-back','uttkarsh-front'] as const)expect(art[name]).toMatchObject({width:64,height:64});
  for(const [key,image]of Object.entries(art)){
   expect(image.runs.filter((_,i)=>i%2===1).reduce((a,b)=>a+b,0)).toBe(image.width*image.height);
   const record=manifest[key as keyof typeof manifest],png=decodePng(fs.readFileSync(`public${record.src}`));expect([png.width,png.height]).toEqual([image.width,image.height]);
   const pixels=battleRaster(key as keyof typeof art,1);expect(Array.from(png.data)).toEqual(Array.from(pixels.data));
   expect(image.palette.length).toBeLessThanOrEqual(key==='background'?14:10);
  }
  for(const project of getProjectDefinitions()){
   expect(project.visual.plateName!.length).toBeLessThanOrEqual(23);expect(project.visual.shortName!.length).toBeLessThanOrEqual(11);expect(project.visual.tagline!.length).toBeLessThanOrEqual(37);
   expect(art[`project-${project.slug}` as keyof typeof art]).toMatchObject({width:64,height:64});expect(art[`thumb-${project.slug}` as keyof typeof art]).toMatchObject({width:16,height:16});
   expect(fs.existsSync(`public${project.visual.logo.src}`)).toBe(true);expect(fs.existsSync(`public${project.visual.thumb.src}`)).toBe(true);
  }
 });
 it('replicates native RGBA cells without resampling at fractional CSS origins',()=>{
  const source=battleRaster('background',1);
  for(const dpr of [1,1.25,1.5,2,2.5,3])for(const n of [1,3,4,8]){
   const prefix=Math.ceil(dpr)-1,image=expandBattlePixels(source.data,n,prefix,prefix,dpr);expect(Number.isInteger(image.width)).toBe(true);expect(Number.isInteger(image.height)).toBe(true);expect(image.data.length).toBe(image.width*image.height*4);let errors=0;
   for(let y=0;y<160;y++)for(let x=0;x<240;x++)for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++){
    const a=(y*240+x)*4,b=((y*n+dy+prefix)*image.width+x*n+dx+prefix)*4;
    for(let c=0;c<4;c++)if(source.data[a+c]!==image.data[b+c])errors++;
   }
   expect(errors).toBe(0);
  }
 });
 it('fits complete type labels and wide short names without truncation or changing the font',()=>{
  for(const audience of [AUDIENCE_ENGINEER,AUDIENCE_FRIEND]){
   const projects=getParty(audience).map(id=>{const project=getProject(id)!;return {id,name:project.name,type:project.type,visual:project.visual};});
   const view=render(<PartyScreen activeProjectId={projects.at(-1)!.id} projects={projects} onSelect={()=>{}} onCancel={()=>{}}/>);
   try{
    if(audience===AUDIENCE_ENGINEER){const label=view.getByRole('button',{name:'PortScanner'}).querySelector('[data-bitmap-text="NETWORKING"]');expect(label).not.toBeNull();expect(label?.getAttribute('data-native-width')).toBe('60');}
    else{const label=view.getByRole('button',{name:'ChatRoomApp'}).querySelector('[data-bitmap-text="CHATROOMAPP"]');expect(label).not.toBeNull();expect(label?.getAttribute('data-native-width')).toBe('70');}
   }finally{view.unmount();}
  }
 });
 it('samples the locked arrival, withdrawal, reveal and plate positions at whole native pixels',()=>{
  expect(battleArtFrame('initial',0)).toMatchObject({logo:'hidden',plateOffset:4,complete:false});
  expect(battleArtFrame('initial',16).message).toBe('sendout');
  expect(battleArtFrame('initial',40).logo).toBe('flash');expect(battleArtFrame('initial',44).logo).toBe('silhouette');expect(battleArtFrame('initial',46).logo).toBe('full');
  expect(battleArtFrame('initial',56)).toMatchObject({plateOffset:0,opponent:{visible:false},complete:true});
  expect(battleArtFrame('switch',16)).toMatchObject({oldLogo:true,message:'withdraw',withdrawY:8});expect(battleArtFrame('switch',36).withdrawY).toBe(48);
  expect(battleArtFrame('switch',40)).toMatchObject({oldLogo:false,logo:'flash',message:'sendout'});expect(battleArtFrame('switch',70).complete).toBe(true);
  for(const beat of ['initial','switch','idle']as const)for(let frame=0;frame<=100;frame++){
   const state=battleArtFrame(beat,frame);for(const value of [state.visitor.x,state.visitor.y,state.opponent.x,state.opponent.y,state.withdrawY,state.plateOffset])expect(Number.isInteger(value)).toBe(true);
  }
  expect(battleArtFrame('initial',0,true)).toMatchObject({logo:'full',plateOffset:0,complete:true,opponent:{visible:false}});
 });
 it('loads before sleeping the preserved world, then unloads before waking it through acknowledged commands',async()=>{
  const bridge=createGameBridge(new FakeClock());const commands:string[]=[];bridge.onCommand(command=>{commands.push(command.type);return {sceneId:'test'};});
  const errors:Error[]=[];let ready=false;const detach=attachBattleView(bridge,e=>errors.push(e),()=>{ready=true;});
  for(let i=0;i<12;i++)await Promise.resolve();expect(ready).toBe(true);expect(commands).toEqual(['loadBattleScene','sleepWorldScene']);detach();for(let i=0;i<12;i++)await Promise.resolve();expect(commands).toEqual(['loadBattleScene','sleepWorldScene','unloadBattleScene','wakeWorldScene']);expect(errors).toEqual([]);
 });
});
