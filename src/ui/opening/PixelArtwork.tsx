'use client';
import { useContext, useMemo } from 'react';
import art from '../../../assets-src/opening/art.json';
import { Raster } from '../kit/Raster';
import { PixelContext } from '../kit/PixelContext';
import { rgb, type BitmapImage } from '../kit/bitmap';
export type OpeningArt = keyof typeof art;
export function rasterArtwork(name: OpeningArt, n: number): BitmapImage {
  const source = art[name];
  const width = source.width * n, height = source.height * n;
  const data = new Uint8ClampedArray(width * height * 4);
  let pixel = 0;
  for (let i = 0; i < source.runs.length; i += 2) {
    const color = source.palette[source.runs[i]!];
    const count = source.runs[i + 1]!;
    if (color) {
      const channels = [...rgb(color), 255];
      for (let p = pixel; p < pixel + count; p++) {
        const x = p % source.width, y = Math.floor(p / source.width);
        for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) data.set(channels, ((y * n + dy) * width + x * n + dx) * 4);
      }
    }
    pixel += count;
  }
  return { width, height, data };
}
export function PixelArtwork({ name, x = 0, y = 0, label }: { name: OpeningArt; x?: number; y?: number; label?: string }) {
  const { n } = useContext(PixelContext);
  const image = useMemo(() => rasterArtwork(name, n), [name, n]);
  return <div role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-opening-art={name} style={{position:'absolute',left:`calc(${x}*var(--u))`,top:`calc(${y}*var(--u))`,width:`calc(${art[name].width}*var(--u))`,height:`calc(${art[name].height}*var(--u))`}}><Raster image={image} style={{position:'absolute',left:0,top:0}} /></div>;
}
