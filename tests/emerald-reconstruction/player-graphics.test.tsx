import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { render, cleanup } from '@testing-library/react';
import { playerSpriteImage, type SourcePlayerSprite } from '../../src/core/emerald/playerGraphics';
import { type EmeraldUi, sourceRgb } from '../../src/core/emerald/ui';
import { SourceUiContext } from '../../src/ui/emerald/SourceUi';
import { SourcePlayerArt } from '../../src/ui/emerald/SourcePlayerArt';
import { SourceTrainerCard } from '../../src/ui/emerald/SourcePortfolio';
const path = 'artifacts/emerald-source/ui/ui-bundle.json';
afterEach(cleanup);
const fixture: SourcePlayerSprite = {
  width: 2,
  height: 2,
  frames: [[0, 1, 2, 3]],
  palette: [0, 31, 31 << 5, 31 << 10],
  graphicsPath: 'test',
  palettePath: 'test',
  idleFrame: 0,
  anchor: [1, 1],
};
describe('indexed player raster', () => {
  it('keeps transparency and palette exactly at every integer scale', () => {
    for (let n = 1; n <= 8; n++) {
      const image = playerSpriteImage(fixture, n);
      expect([image.width, image.height]).toEqual([2 * n, 2 * n]);
      for (let y = 0; y < 2 * n; y++)
        for (let x = 0; x < 2 * n; x++) {
          const index = fixture.frames[0]![Math.floor(y / n) * 2 + Math.floor(x / n)]!;
          expect([...image.data.slice((y * 2 * n + x) * 4, (y * 2 * n + x) * 4 + 4)]).toEqual(
            index ? [...sourceRgb(fixture.palette[index]!), 255] : [0, 0, 0, 0],
          );
        }
    }
  });
  it('rejects fractional scaling and invalid frames rather than resizing or substituting', () => {
    expect(() => playerSpriteImage(fixture, 1.5)).toThrow('integer');
    expect(() => playerSpriteImage(fixture, 1, 1)).toThrow('frame');
  });
});
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'original source Brendan slots',
  () => {
    const load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
    it('uses Emerald front/back and the idle frame 3 with all throw frames retained', () => {
      const ui = load(),
        p = ui.player!;
      expect(ui.sourceCommit).toBe('731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');
      expect(p.front.graphicsPath).toBe('graphics/trainers/front_pics/brendan.png');
      expect(p.back.graphicsPath).toBe('graphics/trainers/back_pics/brendan.png');
      expect(p.front.frames).toHaveLength(1);
      expect(p.back.frames).toHaveLength(4);
      expect(p.back.idleFrame).toBe(3);
      expect(p.backThrow).toEqual([
        { frame: 0, duration: 24 },
        { frame: 1, duration: 9 },
        { frame: 2, duration: 24 },
        { frame: 0, duration: 9 },
        { frame: 3, duration: 50 },
      ]);
      for (const sprite of [p.front, p.back]) {
        expect([sprite.width, sprite.height]).toEqual([64, 64]);
        expect(sprite.anchor).toEqual([32, 32]);
        expect(sprite.palette).toHaveLength(16);
        for (let frame = 0; frame < sprite.frames.length; frame++)
          expect(playerSpriteImage(sprite, 1, frame).data).toHaveLength(64 * 64 * 4);
      }
    });
    it('resolves the Trainer Card to the original source portrait without legacy art', () => {
      const ui = load();
      const { container, getByRole } = render(
        <SourceUiContext.Provider value={ui}>
          <SourceTrainerCard />
        </SourceUiContext.Provider>,
      );
      const portrait = getByRole('img', { name: 'Brendan player portrait' });
      expect(portrait.dataset.sourceFrame).toBe('0');
      expect(container.querySelector('[data-portfolio-art="trainer-portrait"]')).toBeNull();
    });
    it('keeps semantic player identity and source metadata beside an aria-hidden raster', () => {
      const ui = load();
      const { getByRole } = render(
        <SourceUiContext.Provider value={ui}>
          <SourcePlayerArt x={18} y={42} label="Brendan visitor portrait" />
        </SourceUiContext.Provider>,
      );
      const portrait = getByRole('img', { name: 'Brendan visitor portrait' });
      expect(portrait.dataset.sourceGraphics).toBe('graphics/trainers/front_pics/brendan.png');
      expect(portrait.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    });
  },
);
