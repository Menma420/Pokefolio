/** Data-only private UI adapter. Source pixels are fetched locally, never bundled. */
export interface UiTemplate {
  bg: number;
  tilemapLeft: number;
  tilemapTop: number;
  width: number;
  height: number;
  paletteNum: number;
  baseBlock: number;
}
export interface UiGlyph {
  width: number;
  pixels: number[];
}
export type SourceFont = 'normal' | 'narrow' | 'small';
export interface SourceLayer {
  tiles: number[];
  palette: number[];
}
export interface SourcePortfolio {
  dex: SourceLayer & {
    scrollTimers: number[];
    arrowBounce: number[];
    list: number[];
    underlay: number[];
    info: number[];
    selectBar: number[];
    interface: number[];
    interfacePalette: number[];
    windows: Record<string, UiTemplate>;
  };
  card: SourceLayer & {
    background: number[];
    front: number[];
    windows: Record<string, UiTemplate>;
  };
  party: SourceLayer & {
    map: number[];
    main: number[];
    wide: number[];
    cancel: number[];
    windows: UiTemplate[];
  };
  options: {
    palette: number[];
    windows: Record<string, UiTemplate>;
    backdrop: number;
    darken: number;
  };
}
export interface EmeraldUi {
  portfolio?: SourcePortfolio;
  sourceCommit: string;
  downArrow: number[];
  battleDownArrow: number[];
  frame: { tiles: number[]; palette: number[] };
  standardPalette: number[];
  messagePalette: number[];
  messageTiles: number[];
  arrows: { tiles: number[]; palette: number[]; bounce: number[] };
  fonts: Record<'normal' | 'narrow', Record<string, UiGlyph>> & { small?: Record<string, UiGlyph> };
  start: {
    x: number;
    y: number;
    width: number;
    height: number;
    textX: number;
    textY: number;
    pitch: number;
  };
  bag: {
    tiles: number[];
    map: number[];
    palette: number[];
    sprite: number[];
    spritePalette: number[];
    windows: Record<string, UiTemplate>;
    contextWindows: Record<string, UiTemplate>;
  };
  battle: {
    tiles: number[];
    map: number[];
    palette: number[];
    textPalette: number[];
    windows: Record<string, UiTemplate>;
  };
}
export interface UiImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface BagMotion {
  frame: number;
  switchFrame: number | null;
  previousName?: string;
  direction?: number;
}
export const sourceRgb = (w: number) =>
  [0, 5, 10].map((s) => (((w >> s) & 31) << 3) | (((w >> s) & 31) >> 2));
const displayText = (text: string) =>
  text.replaceAll('…', '...').replaceAll('—', '-').replaceAll('–', '-').replaceAll('’', "'");
export function sourceTextWidth(ui: EmeraldUi, text: string, font: SourceFont = 'normal') {
  return [...displayText(text)].reduce(
    (n, c) =>
      n +
      ((ui.fonts[font] ?? ui.fonts.normal)[c]?.width ??
        (ui.fonts[font] ?? ui.fonts.normal)['?']!.width),
    0,
  );
}
export function sourceFit(ui: EmeraldUi, text: string, width: number, font: SourceFont = 'normal') {
  if (sourceTextWidth(ui, text, font) <= width) return text;
  let tail = text;
  while (tail && sourceTextWidth(ui, tail + '...', font) > width) tail = tail.slice(0, -1);
  return tail.trimEnd() + '...';
}
export function sourceLines(
  ui: EmeraldUi,
  text: string,
  width: number,
  font: SourceFont = 'normal',
) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (sourceTextWidth(ui, next, font) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
      while (sourceTextWidth(ui, line, font) > width) {
        let end = 1;
        while (end < line.length && sourceTextWidth(ui, line.slice(0, end + 1), font) <= width)
          end++;
        lines.push(line.slice(0, end));
        line = line.slice(end);
      }
    }
    lines.push(line);
  }
  return lines;
}
export function sourcePages(ui: EmeraldUi, text: string, width = 208) {
  const lines = sourceLines(ui, text, width);
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2).join('\n'));
  return pages;
}
export class UiPainter {
  readonly width = 240;
  readonly height = 160;
  readonly data = new Uint8ClampedArray(240 * 160 * 4);
  pixel(x: number, y: number, color: number) {
    if (x < 0 || y < 0 || x >= 240 || y >= 160) return;
    this.data.set([...sourceRgb(color), 255], (y * 240 + x) * 4);
  }
  fill(x: number, y: number, w: number, h: number, color: number) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.pixel(x + xx, y + yy, color);
  }
  tile(tiles: number[], palette: number[], word: number, x: number, y: number, transparent = true) {
    for (let yy = 0; yy < 8; yy++)
      for (let xx = 0; xx < 8; xx++) {
        const i =
          tiles[(word & 1023) * 64 + (word & 2048 ? 7 - yy : yy) * 8 + (word & 1024 ? 7 - xx : xx)];
        if (i !== undefined && (i || !transparent))
          this.pixel(x + xx, y + yy, palette[(word >> 12) * 16 + i]!);
      }
  }
  tilemap(tiles: number[], palette: number[], map: number[], scroll = 0) {
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 30; x++)
        this.tile(tiles, palette, map[(y + scroll) * 32 + x]!, x * 8, y * 8);
  }
  text(
    ui: EmeraldUi,
    text: string,
    x: number,
    y: number,
    font: SourceFont,
    palette: number[],
    fg: number,
    shadow: number,
    width = 240,
    pitch = 16,
  ) {
    const left = x;
    for (const char of displayText(text)) {
      if (char === '\n') {
        x = left;
        y += pitch;
        continue;
      }
      const g =
        (ui.fonts[font] ?? ui.fonts.normal)[char] ?? (ui.fonts[font] ?? ui.fonts.normal)['?']!;
      for (let gy = 0; gy < 15; gy++)
        for (let gx = 0; gx < g.width; gx++) {
          const p = g.pixels[gy * 16 + gx];
          if ((p === 1 || p === 2) && x + gx < left + width)
            this.pixel(x + gx, y + gy, palette[p === 1 ? fg : shadow]!);
        }
      x += g.width;
    }
  }
  frame(ui: EmeraldUi, x: number, y: number, w: number, h: number) {
    this.fill(x, y, w, h, ui.messagePalette[1]!);
    for (let yy = -8; yy <= h; yy += 8)
      for (let xx = -8; xx <= w; xx += 8) {
        if (xx >= 0 && xx < w && yy >= 0 && yy < h) continue;
        const tx = xx < 0 ? 0 : xx >= w ? 2 : 1,
          ty = yy < 0 ? 0 : yy >= h ? 2 : 1;
        this.tile(ui.frame.tiles, ui.frame.palette, ty * 3 + tx, x + xx, y + yy, false);
      }
  }
  image(scale = 1): UiImage {
    if (!Number.isInteger(scale) || scale < 1) throw new Error('Integer UI scale required');
    const width = 240 * scale,
      height = 160 * scale,
      data = new Uint8ClampedArray(width * height * 4);
    const row = new Uint8ClampedArray(width * 4);
    for (let y = 0; y < 160; y++) {
      for (let x = 0; x < 240; x++) {
        const src = (y * 240 + x) * 4;
        for (let dx = 0; dx < scale; dx++)
          for (let c = 0; c < 4; c++) row[(x * scale + dx) * 4 + c] = this.data[src + c]!;
      }
      for (let dy = 0; dy < scale; dy++) data.set(row, (y * scale + dy) * width * 4);
    }
    return { width, height, data };
  }
}
export function startUi(ui: EmeraldUi, labels: string[], cursor: number) {
  const p = new UiPainter(),
    s = ui.start;
  p.frame(ui, s.x, s.y, s.width, s.height);
  labels.forEach((label, i) => {
    const font = sourceTextWidth(ui, label) > s.width - s.textX ? 'narrow' : 'normal';
    const textX =
      font === 'narrow' ? Math.min(s.textX, s.width - sourceTextWidth(ui, label, font)) : s.textX;
    p.text(
      ui,
      label,
      s.x + textX,
      s.y + s.textY + s.pitch * i,
      font,
      ui.messagePalette,
      2,
      3,
      s.width - textX,
    );
  });
  p.text(ui, '▶', s.x, s.y + s.textY + cursor * s.pitch, 'normal', ui.messagePalette, 2, 3);
  return p;
}
export function bagUi(
  ui: EmeraldUi,
  category: number,
  name: string,
  items: string[],
  cursor: number,
  description: string,
  descriptionPage = 0,
  motion: BagMotion = { frame: 0, switchFrame: null },
) {
  const p = new UiPainter(),
    b = ui.bag;
  p.tilemap(b.tiles, b.palette, b.map);
  const switching = motion.switchFrame !== null;
  if (switching)
    for (let row = 0; row < 16; row++)
      for (let col = 0; col < 15; col++)
        p.tile(
          b.tiles,
          b.palette,
          row < motion.switchFrame! ? 17 : 11,
          112 + col * 8,
          16 + row * 8,
          false,
        );
  // Four portfolio categories retain source pocket art; no fifth fictional category.
  for (let i = 0; i < 5; i++)
    p.tile(
      b.tiles,
      b.palette,
      i === 4 ? b.map[3 * 32 + 10]! : i === category ? 0x102b : 0x1017,
      40 + i * 8,
      24,
      false,
    );
  const bounce = ui.arrows.bounce[motion.frame % 32] ?? 0;
  for (const [cx, flip] of [
    [28, false],
    [100, true],
  ] as const)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++)
        p.tile(
          ui.arrows.tiles,
          ui.arrows.palette,
          (y * 2 + (flip ? 1 - x : x)) | (flip ? 1024 : 0),
          cx - 8 + x * 8 + (flip ? -bounce : bounce),
          8 + y * 8,
        );
  const closing = motion.switchFrame !== null && motion.switchFrame < 6;
  const frame = closing ? 0 : ([1, 3, 4, 5][category] ?? 1);
  const bagOffsetY = closing ? Math.min(0, -5 + motion.switchFrame!) : 0;
  for (let y = 0; y < 64; y += 8)
    for (let x = 0; x < 64; x += 8)
      p.tile(
        b.sprite,
        b.spritePalette,
        frame * 64 + (y / 8) * 8 + x / 8,
        36 + x,
        34 + y + bagOffsetY,
      );
  const pocket = b.windows.WIN_POCKET_NAME!;
  if (!switching)
    p.text(
      ui,
      name,
      pocket.tilemapLeft * 8 + Math.floor((pocket.width * 8 - sourceTextWidth(ui, name)) / 2),
      pocket.tilemapTop * 8 + 1,
      'normal',
      b.palette.slice(16),
      1,
      4,
    );
  else {
    // PrintPocketNames builds a 128px buffer; CopyPocketNameToWindow copies
    // a 64px slice, advancing one tile every other logical frame.
    const buffer = new UiPainter(),
      right = (motion.direction ?? 1) > 0,
      names = right ? [motion.previousName ?? name, name] : [name, motion.previousName ?? name],
      advance = Math.floor(motion.switchFrame! / 2) * 8,
      offset = right ? advance : 64 - advance;
    names.forEach((label, i) =>
      buffer.text(
        ui,
        label,
        i * 64 + Math.floor((64 - sourceTextWidth(ui, label)) / 2),
        1,
        'normal',
        b.palette.slice(16),
        1,
        4,
      ),
    );
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 64; x++) {
        const index = (y * 240 + offset + x) * 4;
        if (buffer.data[index + 3])
          p.data.set(
            buffer.data.subarray(index, index + 4),
            ((pocket.tilemapTop * 8 + y) * 240 + pocket.tilemapLeft * 8 + x) * 4,
          );
      }
  }
  const list = b.windows.WIN_ITEM_LIST!,
    start = Math.max(0, cursor - 7);
  (switching ? [] : items)
    .slice(start, start + 8)
    .forEach((text, i) =>
      p.text(
        ui,
        text,
        list.tilemapLeft * 8 + 8,
        list.tilemapTop * 8 + 1 + i * 16,
        'narrow',
        b.palette.slice(16),
        1,
        3,
        112,
      ),
    );
  if (items.length && !switching)
    p.text(
      ui,
      '▶',
      list.tilemapLeft * 8,
      list.tilemapTop * 8 + 1 + (cursor - start) * 16,
      'narrow',
      b.palette.slice(16),
      1,
      3,
    );
  const d = b.windows.WIN_DESCRIPTION!;
  const lines = sourceLines(ui, description, d.width * 8 - 6),
    pages = Math.ceil(lines.length / 3) || 1;
  if (!switching)
    p.text(
      ui,
      lines.slice((descriptionPage % pages) * 3, (descriptionPage % pages) * 3 + 3).join('\n'),
      d.tilemapLeft * 8 + 3,
      d.tilemapTop * 8 + 1,
      'normal',
      b.palette.slice(16),
      1,
      3,
      d.width * 8 - 6,
    );
  if (!switching && (start > 0 || start + 8 < items.length)) {
    for (const [cy, flip, visible] of [
      [12, false, start > 0],
      [148, true, start + 8 < items.length],
    ] as const)
      if (visible)
        for (let y = 0; y < 2; y++)
          for (let x = 0; x < 2; x++)
            p.tile(
              ui.arrows.tiles,
              ui.arrows.palette,
              (4 + (flip ? 1 - y : y) * 2 + x) | (flip ? 2048 : 0),
              164 + x * 8,
              cy - 8 + y * 8 + (flip ? -bounce : bounce),
            );
  }
  return p;
}
export function sourceDownArrow(ui: EmeraldUi, bob = 0, x = 216, y = 137, bag = false) {
  const p = new UiPainter();
  const arrow = bag ? ui.downArrow : ui.battleDownArrow;
  const palette = bag ? ui.standardPalette : ui.battle.palette;
  for (let yy = 0; yy < 16; yy++)
    for (let xx = 0; xx < 8; xx++) {
      const i = arrow[(yy + bob) * 8 + xx];
      if (i) p.pixel(x + xx, y + yy, palette[i]!);
    }
  return p;
}
export function bagMessageUi(ui: EmeraldUi, text: string) {
  const p = new UiPainter(),
    t = ui.bag.windows.WIN_MESSAGE!,
    x = t.tilemapLeft * 8,
    y = t.tilemapTop * 8,
    w = t.width * 8,
    h = t.height * 8;
  // src/menu.c WindowFunc_DrawDialogFrameWithCustomTileAndPalette, 14 source tiles.
  for (let yy = 0; yy < 5; yy++)
    for (let xx = -2; xx <= t.width; xx++)
      p.tile(
        ui.messageTiles,
        ui.messagePalette,
        xx === -2 ? 7 : xx === t.width ? 10 : 9,
        x + xx * 8,
        y + yy * 8,
        false,
      );
  for (let xx = -2; xx <= t.width; xx++) {
    const tile = xx === -2 ? 1 : xx === -1 ? 3 : xx === t.width ? 6 : xx === t.width - 1 ? 5 : 4;
    p.tile(ui.messageTiles, ui.messagePalette, tile, x + xx * 8, y - 8, false);
    p.tile(ui.messageTiles, ui.messagePalette, tile | 2048, x + xx * 8, y + h, false);
  }
  p.fill(x, y, w, h, ui.standardPalette[1]!);
  p.text(ui, text, x, y + 1, 'normal', ui.standardPalette, 2, 3, w);
  return p;
}
export function battleUi(
  ui: EmeraldUi,
  mode: 'commands' | 'topics' | 'message',
  options: string[] = [],
  cursor = 0,
  text = '',
  previewPage = 0,
) {
  const p = new UiPainter(),
    b = ui.battle;
  p.tilemap(b.tiles, b.palette, b.map, mode === 'commands' ? 20 : mode === 'topics' ? 40 : 0);
  if (mode === 'message') {
    p.text(ui, text, 16, 121, 'normal', b.palette, 1, 6, 208);
    return p;
  }
  if (mode === 'commands') {
    p.fill(8, 120, 112, 32, b.palette[15]!);
    p.text(
      ui,
      sourceLines(ui, text, 110).slice(0, 2).join('\n'),
      9,
      121,
      'normal',
      b.palette,
      1,
      6,
      110,
    );
    p.fill(136, 120, 96, 32, b.textPalette[14]!);
  } else {
    p.fill(16, 120, 144, 32, b.textPalette[14]!);
    p.fill(168, 120, 64, 32, b.textPalette[14]!);
  }
  const start = mode === 'topics' ? Math.floor(cursor / 4) * 4 : 0;
  options
    .slice(start, start + 4)
    .forEach((label, i) =>
      p.text(
        ui,
        sourceFit(
          ui,
          label,
          mode === 'commands' ? (i % 2 === 0 ? 48 : 40) : 64,
          mode === 'commands' ? 'normal' : 'narrow',
        ),
        mode === 'commands' ? 136 + (i % 2) * 56 : 16 + (i % 2) * 72,
        121 + Math.floor(i / 2) * 16,
        mode === 'commands' ? 'normal' : 'narrow',
        b.textPalette,
        13,
        15,
        mode === 'commands' ? (i % 2 === 0 ? 48 : 40) : 64,
      ),
    );
  const local = cursor - start;
  p.tile(
    b.tiles,
    b.palette,
    1,
    mode === 'commands' ? 128 + (local % 2) * 56 : 8 + (local % 2) * 72,
    120 + Math.floor(local / 2) * 16,
  );
  p.tile(
    b.tiles,
    b.palette,
    2,
    mode === 'commands' ? 128 + (local % 2) * 56 : 8 + (local % 2) * 72,
    128 + Math.floor(local / 2) * 16,
  );
  if (mode === 'topics') {
    const lines = sourceLines(ui, options[cursor] ?? '', 60, 'narrow'),
      pages = Math.ceil(lines.length / 2) || 1;
    p.text(
      ui,
      lines.slice((previewPage % pages) * 2, (previewPage % pages) * 2 + 2).join('\n'),
      168,
      121,
      'narrow',
      b.textPalette,
      13,
      15,
      64,
    );
  }
  return p;
}
