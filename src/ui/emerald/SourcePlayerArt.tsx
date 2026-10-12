'use client';
import { useContext, useMemo } from 'react';
import { playerSpriteImage } from '../../core/emerald/playerGraphics';
import { PixelContext } from '../kit/PixelContext';
import { Raster } from '../kit/Raster';
import { nativeBox, useSourceUi } from './SourceUi';

/** Player identity only; audience, host and NPC portraits use their own assets. */
export function SourcePlayerArt({
  view = 'front',
  x,
  y,
  label,
}: {
  view?: 'front' | 'back';
  x: number;
  y: number;
  label: string;
}) {
  const sprite = useSourceUi()?.player?.[view];
  const { n } = useContext(PixelContext);
  const image = useMemo(() => sprite && playerSpriteImage(sprite, n), [sprite, n]);
  if (!sprite || !image) return null;
  return (
    <div
      role="img"
      aria-label={label}
      data-source-player={view}
      data-source-graphics={sprite.graphicsPath}
      data-source-frame={sprite.idleFrame}
      style={nativeBox(x, y, sprite.width, sprite.height)}
    >
      <Raster image={image} />
    </div>
  );
}
