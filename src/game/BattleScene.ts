import Phaser from 'phaser';
import type { GameBridge, IdentifiedGameCommand } from '../runtime/gameBridge/types';
/** Dedicated original battle view. No prose, menus, reducer or WorldSim state here. */
export class BattleScene extends Phaser.Scene {
  private visitor!: Phaser.GameObjects.Image;
  private opponent!: Phaser.GameObjects.Image;
  constructor(private readonly bridge: GameBridge, private readonly standalone=false) { super({key:'PokefolioBattle',active:standalone}); }
  preload() {
    this.load.json('pokefolio-battle-manifest','/assets/battle/manifest.json');
    this.load.once('filecomplete-json-pokefolio-battle-manifest',()=>{
      const assets=this.cache.json.get('pokefolio-battle-manifest') as Record<string,{src:string}>;
      for(const key of ['background','opponent-platform','visitor-platform','visitor-back','uttkarsh-front'])this.load.image(`battle-${key}`,assets[key]!.src);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR,(file:Phaser.Loader.File)=>this.bridge.emit({type:'assetFailed',key:file.key,message:`Could not load original battle artwork: ${file.src}`}));
  }
  create() {
    for(const key of ['background','opponent-platform','visitor-platform','visitor-back','uttkarsh-front'])if(!this.textures.exists(`battle-${key}`)){this.bridge.emit({type:'assetFailed',key:'battle-art',message:'Battle artwork did not finish loading.'});return;}
    this.add.image(0,0,'battle-background').setOrigin(0);
    this.add.image(136,60,'battle-opponent-platform').setOrigin(0);
    this.add.image(8,88,'battle-visitor-platform').setOrigin(0);
    this.visitor=this.add.image(24,48,'battle-visitor-back').setOrigin(0).setVisible(false);
    this.opponent=this.add.image(160,8,'battle-uttkarsh-front').setOrigin(0).setVisible(false);
    this.game.canvas.dataset.battleArt='original-pokefolio';this.game.canvas.dataset.battleScene='ready';
    if(this.standalone){const remove=this.bridge.onCommand(command=>this.execute(command));this.events.once(Phaser.Scenes.Events.SHUTDOWN,remove);}
    this.events.emit('battle-created');this.bridge.emit({type:'battleReady'});
  }
  execute(command:IdentifiedGameCommand):unknown {
    if(command.type==='setBattleSprites'){
      this.visitor.setPosition(command.visitor.x,command.visitor.y).setVisible(command.visitor.visible);
      this.opponent.setPosition(command.opponent.x,command.opponent.y).setVisible(command.opponent.visible);
      this.game.canvas.dataset.battleVisitor=`${command.visitor.x},${command.visitor.y},${command.visitor.visible}`;
      this.game.canvas.dataset.battleOpponent=`${command.opponent.x},${command.opponent.y},${command.opponent.visible}`;
      return {animationKey:command.animationKey};
    }
    if(command.type==='loadBattleScene')return {sceneId:'PokefolioBattle'};
    if(command.type==='unloadBattleScene'){this.game.canvas.dataset.battleScene='unloaded';return {sceneId:'PokefolioBattle'};}
    throw new Error(`Unsupported battle view command: ${command.type}`);
  }
}
