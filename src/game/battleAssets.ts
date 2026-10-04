import Phaser from 'phaser';
import type { GameBridge } from '../runtime/gameBridge/types';

const MANIFEST = 'pokefolio-battle-manifest';
export const BATTLE_TEXTURES = ['background', 'opponent-platform', 'visitor-platform', 'visitor-back', 'uttkarsh-front'] as const;

export function battleAssetsReady(scene: Phaser.Scene): boolean {
  return BATTLE_TEXTURES.every(key => scene.textures.exists(`battle-${key}`));
}

/** Network loading belongs to game initialization, outside the scene-command watchdog.
 * The standalone arena uses the same loader; later battle launches reuse the textures. */
export function preloadBattleAssets(scene: Phaser.Scene, bridge: GameBridge): void {
  if (battleAssetsReady(scene)) return;
  const enqueueImages = () => {
    const assets = scene.cache.json.get(MANIFEST) as Record<string, { src: string }>;
    for (const key of BATTLE_TEXTURES) {
      if (!scene.textures.exists(`battle-${key}`)) scene.load.image(`battle-${key}`, assets[key]!.src);
    }
  };
  const failed = (file: Phaser.Loader.File) => {
    if (file.key === MANIFEST || file.key.startsWith('battle-')) {
      bridge.emit({ type: 'assetFailed', key: file.key, message: `Could not load original battle artwork: ${file.src}` });
    }
  };
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed));
  if (scene.cache.json.exists(MANIFEST)) enqueueImages();
  else {
    scene.load.once(`filecomplete-json-${MANIFEST}`, enqueueImages);
    scene.load.json(MANIFEST, '/assets/battle/manifest.json');
  }
}
