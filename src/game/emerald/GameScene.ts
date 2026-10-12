import Phaser from 'phaser';
import type {EmeraldWorld} from '../../core/emerald/world';
import type {GameBridge,IdentifiedGameCommand} from '../../runtime/gameBridge/types';
import {BattleScene} from '../BattleScene';
import {battleAssetsReady,preloadBattleAssets} from '../battleAssets';
import {mountWorldRaster} from '../WorldRaster';
import type {SourcePlayerGraphics,SourceOpponentGraphics} from '../../core/emerald/playerGraphics';

/** Bridge-compatible source display. The runtime session, not Phaser, ticks it. */
class EmeraldGameScene extends Phaser.Scene {
 private raster:ReturnType<typeof mountWorldRaster>|undefined;
 private texture!:Phaser.Textures.CanvasTexture;
 private indicator!:Phaser.GameObjects.Graphics;
 private exclaim:string|null=null;
 constructor(private bridge:GameBridge,private world:EmeraldWorld,private playerGraphics?:SourcePlayerGraphics,private opponentGraphics?:SourceOpponentGraphics){super('SourceLittlerootGame');}
 preload(){preloadBattleAssets(this,this.bridge,this.playerGraphics,this.opponentGraphics);}
 create(){
  if(!battleAssetsReady(this))return;
  this.texture=this.textures.createCanvas('source-game-native',240,160)!;
  this.add.image(0,0,'source-game-native').setOrigin(0);this.indicator=this.add.graphics();
  this.raster=mountWorldRaster(this.game);
  const removeCommand=this.bridge.onCommand(command=>this.execute(command));
  const removeSnapshot=this.bridge.onSnapshot(()=>this.paint());
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{removeCommand();removeSnapshot();this.raster?.destroy();});
  this.paint();this.bridge.emit({type:'worldReady'});
 }
 private paint(){
  const pixels=this.world.pixels();this.texture.context.putImageData(new ImageData(new Uint8ClampedArray(pixels),240,160),0,0);this.texture.refresh();
  const snapshot=this.bridge.getLatestSnapshot(),p=this.world.player;
  Object.assign(this.game.canvas.dataset,{worldArt:'source-emerald',sourceCommit:this.world.bundle.sourceCommit,sourceState:JSON.stringify(this.world.manifest()),cameraMode:'source-ring',cameraX:String(this.world.renderer.camera.totalX),cameraY:String(this.world.renderer.camera.totalY),mapWidth:String(this.world.renderer.map.width),mapHeight:String(this.world.renderer.map.height),frameplayer:`player-${p.facing}-${p.step?'walk':'idle'}`});
  this.indicator.clear();
  if(this.exclaim&&snapshot){const npc=snapshot.state.npcs.find(n=>n.id===this.exclaim),body=npc&&this.world.objects.find(o=>o.x===npc.x&&o.y===npc.y);
   if(body){const pos=this.world.actorRaster(body),x=pos.x+(pos.width-20)/2;
    // Source object frames include transparent headroom. Anchor the portfolio
    // alert to the extracted silhouette, not the top of its 16×32 art box.
    const firstPixel=pos.pixels.findIndex(index=>index!==0),head=Math.floor(Math.max(0,firstPixel)/pos.width),y=pos.y+head-21;
    this.indicator.fillStyle(0x283d38).fillRect(x+3,y,14,17).fillRect(x+1,y+2,18,13).fillRect(x+8,y+17,4,3);
    this.indicator.fillStyle(0xf3e7c6).fillRect(x+4,y+2,12,13).fillRect(x+3,y+4,14,9).fillRect(x+9,y+16,2,2);
    this.indicator.fillStyle(0x283d38).fillRect(x+8,y+4,4,6).fillRect(x+9,y+10,2,1).fillRect(x+9,y+12,2,2);
   }
  }
  this.raster?.dirty();
 }
 private async execute(command:IdentifiedGameCommand):Promise<unknown>{
  switch(command.type){
   case 'loadBattleScene':{
    const battle=this.scene.get('PokefolioBattle') as BattleScene;
    if(!this.scene.isActive('PokefolioBattle'))await new Promise<void>(resolve=>{battle.events.once('battle-created',resolve);this.scene.launch('PokefolioBattle');});
    return {sceneId:'PokefolioBattle'};
   }
   case 'sleepWorldScene':this.exclaim=null;this.scene.sleep();this.game.canvas.dataset.worldScene='sleeping';return {sleeping:true};
   case 'wakeWorldScene':this.scene.wake();this.paint();this.game.canvas.dataset.worldScene='awake';return {sleeping:false};
   case 'unloadBattleScene':this.scene.stop('PokefolioBattle');this.game.canvas.dataset.battleScene='unloaded';return {sceneId:'PokefolioBattle'};
   case 'setBattleSprites':return (this.scene.get('PokefolioBattle') as BattleScene).execute(command);
   case 'loadMap':{
    const snapshot=this.bridge.getLatestSnapshot();if(!snapshot||snapshot.map.id!==command.mapId)throw new Error('Source snapshot/map mismatch');
    this.paint();this.bridge.emit({type:'mapArrived',mapId:snapshot.map.id,roomId:snapshot.state.cameraRoomId});return {mapId:snapshot.map.id};
   }
   case 'snapshot':this.paint();return this.bridge.getLatestSnapshot();
   case 'showExclaim':this.exclaim=command.entityId;this.paint();return {entityId:command.entityId};
   case 'resumeWorld':this.exclaim=null;this.paint();return {paused:false};
   case 'pauseWorld':return {paused:true};
   case 'setCameraRoom':case 'faceEntity':case 'playEntityRoute':this.paint();return {};
  }
 }
}

export function mountEmeraldGame(host:HTMLElement,bridge:GameBridge,world:EmeraldWorld,player?:SourcePlayerGraphics,opponent?:SourceOpponentGraphics){
 const game=new Phaser.Game({type:Phaser.CANVAS,parent:host,width:240,height:160,scene:[new EmeraldGameScene(bridge,world,player,opponent),new BattleScene(bridge,false,player,opponent)],scale:{mode:Phaser.Scale.NONE},render:{pixelArt:true,antialias:false,roundPixels:true},audio:{noAudio:true},banner:false});
 game.canvas.style.width='100%';game.canvas.style.height='100%';game.canvas.style.imageRendering='pixelated';game.canvas.dataset.worldScene='awake';
 return ()=>game.destroy(true);
}
