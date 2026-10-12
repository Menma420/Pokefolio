'use client';
import { useContext, useMemo } from 'react';
import { trainerSpriteImage } from '../../core/emerald/playerGraphics';
import { PixelContext } from '../kit/PixelContext';
import { Raster } from '../kit/Raster';
import { nativeBox, useSourceUi } from './SourceUi';

/** Opposing trainer in audience choice and VS; field actors retain their source identities. */
export function SourceOpponentArt({ x, y, label }: { x: number; y: number; label: string }) {
  const sprite = useSourceUi()?.opponent?.front;
  const { n } = useContext(PixelContext);
  const image = useMemo(() => sprite && trainerSpriteImage(sprite, n), [sprite, n]);
  if (!sprite || !image) return null;
  return (
    <div
      role="img"
      aria-label={label}
      data-source-opponent="steven-front"
      data-source-graphics={sprite.graphicsPath}
      data-source-frame={sprite.idleFrame}
      style={nativeBox(x, y, sprite.width, sprite.height)}
    >
      <Raster image={image} />
    </div>
  );
}
