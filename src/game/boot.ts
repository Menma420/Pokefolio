import Phaser from 'phaser';
import type { GameBridge } from '../runtime/gameBridge/types';
import { WorldScene } from './WorldScene';
import { BattleScene } from './BattleScene';

export const GAME_WIDTH = 240;
export const GAME_HEIGHT = 160;

export function mountWorldGame(host: HTMLElement, bridge: GameBridge): () => void {
  try {
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#314c3a',
      scene: [new WorldScene(bridge),new BattleScene(bridge)],
      scale: { mode: Phaser.Scale.NONE, width: GAME_WIDTH, height: GAME_HEIGHT },
      render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
      audio: { noAudio: true },
      banner: false,
    });
    game.canvas.style.display = 'block';
    game.canvas.style.width = `${GAME_WIDTH}px`;
    game.canvas.style.height = `${GAME_HEIGHT}px`;
    game.canvas.style.imageRendering = 'pixelated';
    return () => game.destroy(true);
  } catch (error) {
    bridge.emit({ type: 'assetFailed', key: 'phaser-boot', message: error instanceof Error ? error.message : String(error) });
    return () => undefined;
  }
}

/** Standalone battle renderer for the existing development arena. */
export function mountBattleGame(host:HTMLElement,bridge:GameBridge):()=>void {
 const game=new Phaser.Game({type:Phaser.CANVAS,parent:host,width:240,height:160,scene:[new BattleScene(bridge,true)],scale:{mode:Phaser.Scale.NONE,width:240,height:160},render:{pixelArt:true,antialias:false,roundPixels:true},audio:{noAudio:true},banner:false});
 game.canvas.style.imageRendering='pixelated';return ()=>game.destroy(true);
}
