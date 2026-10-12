import Phaser from 'phaser';
import { mountBattleRaster } from './BattleRaster';
import type { GameBridge, IdentifiedGameCommand } from '../runtime/gameBridge/types';
import { BATTLE_TEXTURES, preloadBattleAssets } from './battleAssets';
import type { SourcePlayerGraphics, SourceOpponentGraphics } from '../core/emerald/playerGraphics';
/** Dedicated original battle view. No prose, menus, reducer or WorldSim state here. */
export class BattleScene extends Phaser.Scene {
  private raster:ReturnType<typeof mountBattleRaster>|undefined;
  private visitor!: Phaser.GameObjects.Image;
  private opponent!: Phaser.GameObjects.Image;
  constructor(private readonly bridge: GameBridge, private readonly standalone=false, private readonly playerGraphics?:SourcePlayerGraphics, private readonly opponentGraphics?:SourceOpponentGraphics) { super({key:'PokefolioBattle',active:standalone}); }
  preload() {
    preloadBattleAssets(this, this.bridge, this.playerGraphics, this.opponentGraphics);
  }
  create() {
    for(const key of BATTLE_TEXTURES)if(!this.textures.exists(`battle-${key}`)){this.bridge.emit({type:'assetFailed',key:'battle-art',message:'Battle artwork did not finish loading.'});return;}
    this.add.image(0,0,'battle-background').setOrigin(0);
    this.add.image(136,60,'battle-opponent-platform').setOrigin(0);
    this.add.image(8,88,'battle-visitor-platform').setOrigin(0);
    this.visitor=this.add.image(24,48,'battle-visitor-back').setOrigin(0).setVisible(false);
    if(this.visitor.texture.has('brendan-idle'))this.visitor.setFrame('brendan-idle');
    this.game.canvas.dataset.battlePlayer=this.visitor.texture.has('brendan-idle')?'source-brendan-back-3':'original-pokefolio-visitor';
    this.opponent=this.add.image(160,8,'battle-uttkarsh-front').setOrigin(0).setVisible(false);
    this.game.canvas.dataset.battleOpponentArt=this.opponent.texture.has('steven-front')?'source-steven-front':'original-pokefolio-opponent';
    this.raster=mountBattleRaster(this.game);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.raster?.destroy();this.raster=undefined;});
    this.game.canvas.dataset.battleArt='original-pokefolio';this.game.canvas.dataset.battleScene='ready';
    if(this.standalone){const remove=this.bridge.onCommand(command=>this.execute(command));this.events.once(Phaser.Scenes.Events.SHUTDOWN,remove);}
    this.events.emit('battle-created');this.bridge.emit({type:'battleReady'});
  }
  execute(command:IdentifiedGameCommand):unknown {
    if(command.type==='setBattleSprites'){
      this.raster?.dirty();
      this.visitor.setPosition(command.visitor.x,command.visitor.y).setVisible(command.visitor.visible);
      this.opponent.setPosition(command.opponent.x,command.opponent.y).setVisible(command.opponent.visible);
      this.game.canvas.dataset.battleVisitor=`${command.visitor.x},${command.visitor.y},${command.visitor.visible}`;
      this.game.canvas.dataset.battleOpponent=`${command.opponent.x},${command.opponent.y},${command.opponent.visible}`;
      return {animationKey:command.animationKey};
    }
    if(command.type==='sleepWorldScene'||command.type==='wakeWorldScene')return {standalone:true};
    if(command.type==='loadBattleScene')return {sceneId:'PokefolioBattle'};
    if(command.type==='unloadBattleScene'){this.game.canvas.dataset.battleScene='unloaded';return {sceneId:'PokefolioBattle'};}
    throw new Error(`Unsupported battle view command: ${command.type}`);
  }
}
