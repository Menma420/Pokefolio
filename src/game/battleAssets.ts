import Phaser from 'phaser';
import type { GameBridge } from '../runtime/gameBridge/types';
import { playerSpriteImage, trainerSpriteImage, type SourceOpponentGraphics, type SourcePlayerGraphics } from '../core/emerald/playerGraphics';

const MANIFEST = 'pokefolio-battle-manifest';
export const BATTLE_TEXTURES = [
  'background',
  'opponent-platform',
  'visitor-platform',
  'visitor-back',
  'uttkarsh-front',
] as const;

export function battleAssetsReady(scene: Phaser.Scene): boolean {
  return BATTLE_TEXTURES.every((key) => scene.textures.exists(`battle-${key}`));
}

/** Network loading belongs to game initialization, outside the scene-command watchdog.
 * The standalone arena uses the same loader; later battle launches reuse the textures. */
export function preloadBattleAssets(
  scene: Phaser.Scene,
  bridge: GameBridge,
  player?: SourcePlayerGraphics,
  opponent?: SourceOpponentGraphics,
): void {
  if (player && !scene.textures.exists('battle-visitor-back')) {
    const sprite = player.back;
    const texture = scene.textures.createCanvas(
      'battle-visitor-back',
      sprite.width,
      sprite.height * sprite.frames.length,
    )!;
    sprite.frames.forEach((_, frame) => {
      const image = playerSpriteImage(sprite, 1, frame);
      texture.context.putImageData(
        new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height),
        0,
        frame * sprite.height,
      );
      texture.add(`brendan-${frame}`, 0, 0, frame * sprite.height, sprite.width, sprite.height);
    });
    texture.add(
      'brendan-idle',
      0,
      0,
      sprite.idleFrame * sprite.height,
      sprite.width,
      sprite.height,
    );
    texture.refresh();
  }
  if (opponent && !scene.textures.exists('battle-uttkarsh-front')) {
    const sprite = opponent.front;
    const image = trainerSpriteImage(sprite);
    const texture = scene.textures.createCanvas('battle-uttkarsh-front', sprite.width, sprite.height)!;
    texture.context.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0);
    texture.add('steven-front', 0, 0, 0, sprite.width, sprite.height);
    texture.refresh();
  }
  if (battleAssetsReady(scene)) return;
  const enqueueImages = () => {
    const assets = scene.cache.json.get(MANIFEST) as Record<string, { src: string }>;
    for (const key of BATTLE_TEXTURES) {
      if (!scene.textures.exists(`battle-${key}`))
        scene.load.image(`battle-${key}`, assets[key]!.src);
    }
  };
  const failed = (file: Phaser.Loader.File) => {
    if (file.key === MANIFEST || file.key.startsWith('battle-')) {
      bridge.emit({
        type: 'assetFailed',
        key: file.key,
        message: `Could not load original battle artwork: ${file.src}`,
      });
    }
  };
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () =>
    scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed),
  );
  if (scene.cache.json.exists(MANIFEST)) enqueueImages();
  else {
    scene.load.once(`filecomplete-json-${MANIFEST}`, enqueueImages);
    scene.load.json(MANIFEST, '/assets/battle/manifest.json');
  }
}
