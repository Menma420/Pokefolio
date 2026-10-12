import { sourceRgb, type UiImage } from './ui';

/** Private, indexed source pixels. This contract contains no bundled artwork. */
export interface SourceTrainerSprite {
  width: number;
  height: number;
  frames: number[][];
  palette: number[];
  graphicsPath: string;
  palettePath: string;
  idleFrame: number;
  anchor: [number, number];
}
export type SourcePlayerSprite = SourceTrainerSprite;
export interface SourceOpponentGraphics {
  front: SourceTrainerSprite;
  trainerPicId: number;
  sourceYOffset: number;
  animation: string;
}
export interface SourcePlayerGraphics {
  front: SourcePlayerSprite;
  back: SourcePlayerSprite;
  backThrow: { frame: number; duration: number }[];
}

/** Index zero is transparent. Repeat source pixels, never resample them. */
export function trainerSpriteImage(
  sprite: SourceTrainerSprite,
  n = 1,
  frame = sprite.idleFrame,
): UiImage {
  if (!Number.isInteger(n) || n < 1)
    throw new Error('Trainer sprite scale must be a positive integer');
  const pixels = sprite.frames[frame];
  if (!pixels || pixels.length !== sprite.width * sprite.height)
    throw new Error('Invalid source trainer frame');
  const width = sprite.width * n,
    height = sprite.height * n;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const index = pixels[i]!;
    if (!index) continue;
    const color = sprite.palette[index];
    if (color === undefined) throw new Error('Invalid source trainer palette index');
    const ink = [...sourceRgb(color), 255];
    const x = i % sprite.width,
      y = Math.floor(i / sprite.width);
    for (let dy = 0; dy < n; dy++)
      for (let dx = 0; dx < n; dx++) data.set(ink, ((y * n + dy) * width + x * n + dx) * 4);
  }
  return { width, height, data };
}

/** Backward-compatible player API; both identities share the indexed rasterizer. */
export const playerSpriteImage = trainerSpriteImage;
