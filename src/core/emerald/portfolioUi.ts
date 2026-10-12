/** Presentation-only adaptations of the pinned Pokédex, Party, Card and Options. */
import {
  UiPainter,
  sourceFit,
  sourceLines,
  sourceTextWidth,
  type EmeraldUi,
  type SourceFont,
} from './ui';
export const partyBoxes = [
  [8, 24, 80, 56],
  [96, 8, 144, 24],
  [96, 32, 144, 24],
  [96, 56, 144, 24],
  [96, 80, 144, 24],
  [96, 104, 144, 24],
] as const;
export function sourceParagraph(
  ui: EmeraldUi,
  text: string,
  width: number,
  lines: number,
  page: number,
  font: SourceFont = 'normal',
) {
  const all = sourceLines(ui, text, width, font),
    count = Math.max(1, Math.ceil(all.length / lines));
  return {
    text: all.slice((page % count) * lines, ((page % count) + 1) * lines).join('\n'),
    count,
    index: page % count,
  };
}
const ink = (ui: EmeraldUi) => ui.portfolio!.dex.palette;
export function dexText(
  p: UiPainter,
  ui: EmeraldUi,
  text: string,
  x: number,
  y: number,
  width = 224,
  font: SourceFont = 'normal',
) {
  p.text(ui, text, x, y, font, ink(ui), 15, 3, width);
}
function layer(p: UiPainter, ui: EmeraldUi, map: number[], stride = 32) {
  const d = ui.portfolio!.dex;
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 30; x++) p.tile(d.tiles, d.palette, map[y * stride + x] ?? 0, x * 8, y * 8);
}
function interfaceTile(
  p: UiPainter,
  ui: EmeraldUi,
  id: number,
  x: number,
  y: number,
  flip = false,
) {
  const d = ui.portfolio!.dex;
  p.tile(d.interface, d.interfacePalette, id | (flip ? 2048 : 0), x, y);
}
/** Original centered-list mask/underlay; number and caught-marker columns become names. */
export function dexListUi(
  ui: EmeraldUi,
  title: string,
  category: string,
  labels: string[],
  cursor: number,
  caption: string,
  motion: { offset: number; frame: number } = { offset: 0, frame: 0 },
) {
  const p = new UiPainter(),
    d = ui.portfolio!.dex;
  p.fill(0, 0, 240, 160, d.palette[0]!);
  layer(p, ui, d.underlay);
  // No invented seen/owned counters or Pokédex numbers. Existing categories occupy the HUD.
  for (let delta = -4; delta <= 4; delta++) {
    const i = cursor + delta;
    if (i >= 0 && i < labels.length)
      dexText(
        p,
        ui,
        sourceFit(ui, labels[i]!, 84, 'narrow'),
        140,
        73 + delta * 16 + motion.offset,
        84,
        'narrow',
      );
  }
  // BG1 list mask occludes BG2 list text, including the top/bottom rows.
  layer(p, ui, d.list);
  if (title !== 'POKÉDEX') {
    p.fill(9, 7, 118, 10, d.palette[1]!);
    dexText(p, ui, title, 22, 5, 104, 'narrow');
  }
  dexText(p, ui, sourceFit(ui, category, 120, 'narrow'), 8, 24, 120, 'narrow');
  // Source interface tiles: ANIMCMD_FRAME(0) scrollbar and (1) arrow; centers 230,20 / 184,4.
  interfaceTile(p, ui, 0, 226, 16 + Math.floor((cursor * 120) / Math.max(1, labels.length - 1)));
  const bob = d.arrowBounce[motion.frame % 32] ?? 0;
  if (cursor > 0) {
    interfaceTile(p, ui, 1, 176, -bob);
    interfaceTile(p, ui, 2, 184, -bob);
  }
  if (cursor < labels.length - 1) {
    interfaceTile(p, ui, 1, 176, 152 + bob, true);
    interfaceTile(p, ui, 2, 184, 152 + bob, true);
  }
  dexText(p, ui, sourceFit(ui, caption, 116, 'narrow'), 8, 129, 116, 'narrow');
  dexText(p, ui, 'A: OPEN  B: BACK', 8, 145, 120, 'small');
  return p;
}
/** Original info tilemap, entry sprite at (48,56), name/type at (96,25)/(100,41). */
export function dexDetailUi(
  ui: EmeraldUi,
  title: string,
  name: string,
  type: string,
  body: string,
  page = 0,
  lines = 3,
) {
  const p = new UiPainter(),
    d = ui.portfolio!.dex;
  layer(p, ui, d.info);
  // The portfolio has no AREA/CRY/SIZE actions. Reuse the source selector bar's INFO family,
  // and print the real section instead of exposing nonfunctional source screen labels.
  p.fill(6, 1, 228, 13, d.palette[1]!);
  dexText(p, ui, sourceFit(ui, title, 218, 'narrow'), 10, 0, 218, 'narrow');
  dexText(p, ui, sourceFit(ui, name, 130, 'narrow'), 96, 25, 130, 'narrow');
  dexText(p, ui, sourceFit(ui, type, 126, 'narrow'), 100, 41, 126, 'narrow');
  const paragraph = sourceParagraph(ui, body, 216, lines, page);
  dexText(p, ui, paragraph.text, 12, 95, 216);
  return { p, paragraph };
}
/** No-HP source bitmaps with exact per-slot palette writes from LoadPartyBoxPalette. */
export function partyUi(
  ui: EmeraldUi,
  labels: string[],
  types: string[],
  cursor: number,
  active: number,
  description: string,
) {
  const p = new UiPainter(),
    d = ui.portfolio!.party;
  p.tilemap(d.tiles, d.palette, d.map);
  partyBoxes.forEach(([x, y, w, h], i) => {
    if (i >= labels.length) return;
    const pal = d.palette.slice(48, 64);
    const ids1 = i === cursor ? [116, 117, 118] : [52, 53, 54],
      ids2 = i === cursor ? [97, 103, 104] : [49, 55, 56];
    [4, 5, 6].forEach((v, j) => {
      pal[v] = d.palette[ids1[j]!]!;
    });
    [1, 7, 8].forEach((v, j) => {
      pal[v] = d.palette[ids2[j]!]!;
    });
    const map = i === 0 ? d.main : d.wide;
    for (let yy = 0; yy < h / 8; yy++)
      for (let xx = 0; xx < w / 8; xx++)
        p.tile(d.tiles, pal, map[(yy * w) / 8 + xx]!, x + xx * 8, y + yy * 8, false);
    const textX = x + (i === 0 ? 24 : 22),
      nameY = y + (i === 0 ? 11 : 3),
      nameW = i === 0 ? 54 : 114;
    p.text(ui, sourceFit(ui, labels[i]!, nameW, 'small'), textX, nameY, 'small', pal, 3, 2, nameW);
    p.text(
      ui,
      sourceFit(ui, types[i] ?? '', i === 0 ? 54 : i === active ? 64 : 114, 'small'),
      textX,
      y + (i === 0 ? 28 : 13),
      'small',
      pal,
      3,
      2,
      i === 0 ? 54 : i === active ? 64 : 114,
    );
    if (i === active)
      p.text(
        ui,
        'IN PLAY',
        i === 0 ? x + 24 : x + 91,
        y + (i === 0 ? 38 : 13),
        'small',
        pal,
        3,
        2,
        50,
      );
  });
  // sDefaultPartyMsgWindowTemplate: (1,17), 21x2. Normal cancel art is in bg.bin.
  p.frame(ui, 8, 136, 168, 16);
  p.text(ui, sourceFit(ui, description, 168), 8, 137, 'normal', ui.standardPalette, 2, 3, 168);
  p.text(ui, 'CANCEL', 196, 137, 'small', d.palette.slice(48, 64), 3, 2, 42);
  return p;
}
export function optionsUi(
  ui: EmeraldUi,
  labels: string[],
  values: string[],
  cursor: number,
  title = 'OPTION',
  notice = '',
) {
  const p = new UiPainter(),
    o = ui.portfolio!.options;
  p.fill(0, 0, 240, 160, o.backdrop);
  p.frame(ui, 16, 8, 208, 16);
  p.frame(ui, 16, 40, 208, 112);
  p.fill(16, 8, 208, 16, o.palette[1]!);
  p.fill(16, 40, 208, 112, o.palette[1]!);
  p.text(ui, title, 24, 9, 'normal', o.palette, 2, 3, 192);
  labels.forEach((label, i) => {
    p.text(
      ui,
      sourceFit(
        ui,
        label,
        values[i] ? 96 : 192,
        sourceTextWidth(ui, label) > (values[i] ? 96 : 192) ? 'narrow' : 'normal',
      ),
      24,
      41 + i * 16,
      sourceTextWidth(ui, label) > (values[i] ? 96 : 192) ? 'narrow' : 'normal',
      o.palette,
      2,
      3,
      values[i] ? 96 : 192,
    );
    if (values[i])
      p.text(
        ui,
        sourceFit(ui, values[i]!, 96, 'normal'),
        120,
        41 + i * 16,
        'normal',
        o.palette,
        4,
        5,
        96,
      );
  });
  // WIN0 excludes selected row from BLDY=4. Reproduce GBA channel truncation in RGB555,
  // affecting BG0 content, not the user frame on BG1.
  for (let y = 40; y < 152; y++)
    if (y < 40 + cursor * 16 || y >= 56 + cursor * 16)
      for (let x = 16; x < 224; x++) {
        const at = (y * 240 + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v = p.data[at + c]! >> 3,
            dim = v - Math.floor((v * o.darken) / 16);
          p.data[at + c] = (dim << 3) | (dim >> 2);
        }
      }
  if (notice) {
    p.fill(16, 136, 208, 16, o.palette[1]!);
    p.text(ui, sourceFit(ui, notice, 204, 'small'), 18, 137, 'small', o.palette, 2, 3, 204);
  }
  return p;
}
export function trainerUi(ui: EmeraldUi, facts: string[], achievement: string) {
  const p = new UiPainter(),
    d = ui.portfolio!.card;
  for (const map of [d.background, d.front])
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 30; x++) p.tile(d.tiles, d.palette, map[y * 30 + x]!, x * 8, y * 8);
  // BADGES and numbered badge wells are baked into front.bin: restore the source
  // striped background in that region, rather than present fabricated credentials.
  for (let y = 14; y < 17; y++)
    for (let x = 2; x < 28; x++)
      p.tile(d.tiles, d.palette, d.front[9 * 30 + 10]!, x * 8, y * 8, false);
  facts.forEach((text, i) =>
    p.text(
      ui,
      sourceFit(ui, text, 132, sourceTextWidth(ui, text) > 132 ? 'narrow' : 'normal'),
      24,
      41 + i * 16,
      sourceTextWidth(ui, text) > 132 ? 'narrow' : 'normal',
      ui.standardPalette,
      2,
      3,
      132,
    ),
  );
  p.text(
    ui,
    sourceFit(ui, achievement, 204, 'small'),
    24,
    121,
    'small',
    ui.standardPalette,
    2,
    3,
    204,
  );
  return p;
}
export function confirmationUi(ui: EmeraldUi, cursor: number) {
  const p = new UiPainter();
  p.frame(ui, 16, 112, 160, 32);
  p.text(ui, 'EXIT?\nRETURN TO PORTFOLIO?', 16, 113, 'normal', ui.standardPalette, 2, 3, 160);
  // CreateYesNoMenu's standard two-row source frame and source font cursor.
  p.frame(ui, 168, 72, 40, 32);
  ['YES', 'NO'].forEach((t, i) =>
    p.text(ui, t, 176, 73 + i * 16, 'normal', ui.standardPalette, 2, 3, 32),
  );
  p.text(ui, '▶', 168, 73 + cursor * 16, 'normal', ui.standardPalette, 2, 3, 8);
  return p;
}
export function pageIndicator(p: UiPainter, ui: EmeraldUi, index: number, count: number) {
  const t = `${index + 1}/${count}  A: NEXT  B: BACK`;
  dexText(p, ui, t, 240 - sourceTextWidth(ui, t, 'small') - 8, 145, 224, 'small');
}
