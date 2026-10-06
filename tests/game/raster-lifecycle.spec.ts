import {afterEach,describe,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
vi.mock('phaser',()=>({default:{Core:{Events:{POST_RENDER:'postrender'}}}}));
import {mountWorldRaster} from '../../src/game/WorldRaster';
import {mountBattleRaster} from '../../src/game/BattleRaster';
afterEach(()=>{document.body.replaceChildren();vi.unstubAllGlobals();});
describe('physical surface navigation lifecycle',()=>{
 for(const [name,mount] of [['world',mountWorldRaster],['battle',mountBattleRaster]] as const){
  it(`${name} ignores render callbacks after canvas detachment and disposal`,()=>{
   let render:()=>void=()=>{},resize:()=>void=()=>{};const disconnect=vi.fn();
   vi.stubGlobal('ResizeObserver',class{constructor(callback:()=>void){resize=callback;}observe(){}disconnect=disconnect;});
   const parent=document.createElement('div'),logical=document.createElement('canvas');logical.style.opacity='1';parent.append(logical);document.body.append(parent);
   const on=vi.fn((_event:string,callback:()=>void)=>{render=callback;}),off=vi.fn(),isActive=vi.fn(()=>false);
   const game={canvas:logical,events:{on,off},scene:{isActive}} as unknown as Phaser.Game;
   const surface=mount(game);expect(parent.querySelector('[data-bitmap]')).not.toBeNull();
   logical.remove();expect(()=>render()).not.toThrow();expect(()=>resize()).not.toThrow();expect(isActive).not.toHaveBeenCalled();
   surface.destroy();expect(()=>render()).not.toThrow();expect(()=>resize()).not.toThrow();expect(parent.querySelector('[data-bitmap]')).toBeNull();expect(logical.style.opacity).toBe('1');expect(off).toHaveBeenCalledTimes(1);if(name==='world')expect(disconnect).toHaveBeenCalledTimes(1);
  });
 }
});
