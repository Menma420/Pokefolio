import glyphs from '../../../assets-src/font/glyphs.json';
import { glyphAdvance } from './text';
export const bitmapGlyphs: Readonly<Record<string, string>> = glyphs;
export interface BitmapImage { width: number; height: number; data: Uint8ClampedArray }
export function rgb(hex: string): number[] {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}
/** Write authored cells directly, without paths, font shaping, or filtered resampling. */
export function rasterText(text: string, width: number, height: number, scale: number,
  foreground: string, background?: string, shadow?: string, pitch = 16): BitmapImage {
  const w = width * scale, h = height * scale;
  const data = new Uint8ClampedArray(w * h * 4);
  const cell = (x: number, y: number, color: string) => {
    const channels = rgb(color);
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = x * scale + dx, py = y * scale + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const offset = (py * w + px) * 4;
      data.set([...channels, 255], offset);
    }
  };
  if (background) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) cell(x, y, background);
  const paint = (offset: number, color: string) => {
    let x = 0, y = 0;
    for (const char of text) {
      if (char === '\n') { x = 0; y += pitch; continue; }
      const glyph = bitmapGlyphs[char];
      if (!glyph) throw new Error(`Unsupported bitmap glyph: ${char}`);
      glyph.split('/').forEach((row, gy) => [...row].forEach((bit, gx) => {
        if (bit === '1') cell(x + gx + offset, y + gy + offset, color);
      }));
      x += glyphAdvance(char);
    }
  };
  if (shadow) paint(1, shadow);
  paint(0, foreground);
  return { width: w, height: h, data };
}
