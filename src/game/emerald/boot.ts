import Phaser from 'phaser';
import type {Clock,ScheduledTask} from '../../core/clock';
import {FRAME_MS} from '../../core/clock';
import type {EmeraldWorld} from '../../core/emerald/world';
import type {Facing} from '../../core/emerald/types';
import {mountWorldRaster} from '../WorldRaster';
/** Phaser owns the display; indexed source rendering stays in the pure core. */
export function mountEmerald(host:HTMLElement,world:EmeraldWorld,clock:Clock,direction:()=>Facing|undefined,onFrame:()=>void){
 let task:ScheduledTask|undefined;
 class LittlerootScene extends Phaser.Scene {
  constructor(){super('SourceLittleroot');}
  create(){
   const texture=this.textures.createCanvas('source-native',240,160)!;
   this.add.image(0,0,'source-native').setOrigin(0);
   const paint=()=>{const pixels=world.pixels();texture.context.putImageData(new ImageData(new Uint8ClampedArray(pixels),240,160),0,0);texture.refresh();raster?.dirty();onFrame();};
   paint();
   let deadline=clock.now()+FRAME_MS;
   const tick=()=>{if(!world.paused){world.tick(direction());paint();}deadline+=FRAME_MS;task=clock.schedule(tick,Math.max(0,deadline-clock.now()));};task=clock.schedule(tick,FRAME_MS);
  }
 }
 const game=new Phaser.Game({type:Phaser.CANVAS,width:240,height:160,parent:host,transparent:false,pixelArt:true,antialias:false,roundPixels:true,scene:[LittlerootScene],audio:{noAudio:true},scale:{mode:Phaser.Scale.NONE}});
 game.canvas.style.width='100%';game.canvas.style.height='100%';const raster=mountWorldRaster(game);
 return ()=>{task?.cancel();raster?.destroy();game.destroy(true);};
}
