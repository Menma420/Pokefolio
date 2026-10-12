import { UiPainter, type EmeraldUi, type UiTemplate } from './ui';

/** main_menu.c: settled welcome phase, before the later Lotad release. */
export function birchIntroUi(ui: EmeraldUi) {
  const intro = ui.intro!;
  const p = new UiPainter();
  p.fill(0, 0, 240, 160, intro.palette[0]!);
  p.tilemap(intro.tiles, intro.palette, intro.map);
  const b = intro.birch;
  const x = b.center[0]! - b.width / 2,
    y = b.center[1]! - b.height / 2;
  for (let ty = 0; ty < b.height / 8; ty++)
    for (let tx = 0; tx < b.width / 8; tx++)
      p.tile(b.tiles, b.palette, ty * (b.width / 8) + tx, x + tx * 8, y + ty * 8);
  return p;
}

/** main_menu.c NewGameBirchSpeech_CreateDialogueWindowBorder; same 14-tile
 * message family as menu.c, with the source message palette (not battle colors). */
export function fieldMessageUi(ui: EmeraldUi, text: string) {
  const t: UiTemplate = ui.intro?.window ?? ui.bag.windows.WIN_MESSAGE!;
  const p = new UiPainter(),
    x = t.tilemapLeft * 8,
    y = t.tilemapTop * 8;
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
    p.tile(ui.messageTiles, ui.messagePalette, tile | 2048, x + xx * 8, y + t.height * 8, false);
  }
  p.fill(x, y, t.width * 8, t.height * 8, ui.messagePalette[1]!);
  p.text(ui, text, x, y + 1, 'normal', ui.messagePalette, 2, 3, t.width * 8);
  return p;
}

/** Portfolio adaptation of script_menu.c's PrintMenuTable and standard frame.
 * Labels, selection ownership and portraits remain PokéFolio's. */
export function audienceChoiceUi(ui: EmeraldUi, labels: string[], cursor: number) {
  const p = new UiPainter();
  p.frame(ui, 16, 32, 64, 64);
  p.frame(ui, 96, 32, 128, 64);
  p.text(ui, 'YOUR PERSPECTIVE?', 104, 33, 'normal', ui.messagePalette, 2, 3, 120);
  labels.forEach((label, i) =>
    p.text(ui, label, 104, 49 + i * 16, 'normal', ui.messagePalette, 2, 3, 120),
  );
  p.text(ui, '▶', 96, 49 + cursor * 16, 'normal', ui.messagePalette, 2, 3);
  return p;
}

/** VS has no matching original portfolio nameplate; reuse the source standard
 * outer frame without changing the existing name reveal position or timing. */
export function sourceNamePlate(ui: EmeraldUi, text: string, x: number, y: number) {
  const p = new UiPainter();
  p.frame(ui, x, y, 128, 16);
  p.text(ui, text, x + 8, y + 1, 'normal', ui.messagePalette, 2, 3, 120);
  return p;
}
