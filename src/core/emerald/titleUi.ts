import { UiPainter, sourceTextWidth, type EmeraldUi } from './ui';

export interface SourceTitle {
  palette: number[];
  rayquaza: { tiles: number[]; map: number[] };
  clouds: { tiles: number[]; map: number[] };
  wave: number[];
  sine: number[];
  cloudBlend: number[];
  pressStart: { tiles: number[]; palette: number[]; x: number; y: number; tileOffsets: number[] };
  logo: {
    width: number;
    height: number;
    x: number;
    y: number;
    pixels: number[];
    text: string;
    adaptation: string;
    bounds: number[];
    paletteIndices: number[];
    glyphs: {
      char: string;
      x: number;
      width: number;
      baseline: number;
      bodyTop: number;
      accent: number[][] | null;
      dot: number[][] | null;
    }[];
  };
  sourceLogo: { tiles: number[]; map: number[]; bpp: number };
}

/** GBA alpha blend: RGB555 integer channels, clamped before LCD expansion. */
export function titleBlend(first: number, second: number, a = 6, b = 15) {
  return [0, 5, 10].reduce(
    (word, shift) =>
      word |
      (Math.min(31, (((first >> shift) & 31) * a + ((second >> shift) & 31) * b) >> 4) << shift),
    0,
  );
}

function sample(layer: SourceTitle['clouds'], x: number, y: number) {
  x = (x + 256) & 255;
  y &= 255;
  const word = layer.map[(y >> 3) * 32 + (x >> 3)]!;
  const index =
    layer.tiles[
      (word & 1023) * 64 +
        (word & 2048 ? 7 - (y & 7) : y & 7) * 8 +
        (word & 1024 ? 7 - (x & 7) : x & 7)
    ] ?? 0;
  return index ? (word >> 12) * 16 + index : 0;
}

export function titlePromptLayout(ui: EmeraldUi) {
  const text = 'Press Start';
  const width = sourceTextWidth(ui, text);
  return { text, x: Math.floor((240 - width) / 2), y: 119, width, height: 16 };
}

/** Source normal bitmap glyphs with a one-native-pixel black contour. */
export function titlePrompt(ui: EmeraldUi) {
  const t = titlePromptLayout(ui),
    ink = new UiPainter(),
    p = new UiPainter();
  const palette = ui.title!.pressStart.palette;
  ink.text(ui, t.text, t.x, t.y, 'normal', palette, 5, 1, t.width);
  for (let y = 0; y < 160; y++)
    for (let x = 0; x < 240; x++) {
      if (!ink.data[(y * 240 + x) * 4 + 3]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) p.pixel(x + dx, y + dy, palette[1]!);
    }
  for (let at = 0; at < ink.data.length; at += 4)
    if (ink.data[at + 3]) p.data.set(ink.data.subarray(at, at + 4), at);
  return p;
}

/** Settled title phase (title_screen.c Task_TitleScreenPhase3), with the
 * PokéFolio wordmark replacing both original branding layers. Flow stays owned
 * by the existing orchestrator; this painter does not emulate the main menu. */
export function titleUi(
  ui: EmeraldUi,
  frame: number,
  showPrompt = true,
  logoY = 0,
  showLogo = true,
) {
  const t = ui.title!;
  const p = new UiPainter();
  const palette = [...t.palette];
  const tick = Math.floor(frame / 4) * 4;
  const intensity = ((t.sine[(tick + 64) & 255]! * 128) >> 8) + 128;
  palette[239] =
    (31 - ((intensity * 31) >> 8)) | ((31 - ((intensity * 22) >> 8)) << 5) | (12 << 10);
  const scrollY = Math.floor((frame + 1) / 4);
  for (let y = 0; y < 160; y++) {
    const wave = t.wave[(y + frame) & 63]!;
    for (let x = 0; x < 240; x++) {
      const below = palette[sample(t.rayquaza, x, y)]!;
      const cloud = sample(t.clouds, x + wave, y + scrollY);
      p.pixel(
        x,
        y,
        cloud ? titleBlend(palette[cloud]!, below, t.cloudBlend[0], t.cloudBlend[1]) : below,
      );
    }
  }
  if (showLogo)
    for (let y = 0; y < t.logo.height; y++)
      for (let x = 0; x < t.logo.width; x++) {
        const index = t.logo.pixels[y * t.logo.width + x]!;
        if (index) p.pixel(x + t.logo.x, y + t.logo.y + logoY, palette[index]!);
      }
  if (showPrompt) {
    const prompt = titlePrompt(ui);
    for (let at = 0; at < prompt.data.length; at += 4)
      if (prompt.data[at + 3]) p.data.set(prompt.data.subarray(at, at + 4), at);
  }
  return p;
}
