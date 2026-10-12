import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { render, cleanup } from '@testing-library/react';
import { trainerSpriteImage } from '../../src/core/emerald/playerGraphics';
import type { EmeraldUi } from '../../src/core/emerald/ui';
import { SourceUiContext } from '../../src/ui/emerald/SourceUi';
import { SourceOpponentArt } from '../../src/ui/emerald/SourceOpponentArt';
import { AudienceChoice } from '../../src/ui/opening/AudienceChoice';
import { ENCOUNTER_AUDIENCE_CHOICES } from '../../src/content/narrative';
import { Audiences } from '../../src/content/audiences';
const path = 'artifacts/emerald-source/ui/ui-bundle.json';
afterEach(cleanup);
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'source Steven opponent',
  () => {
    const load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
    it('uses the original 64x64 trainer front, embedded palette and static source frame', () => {
      const ui = load(),
        o = ui.opponent!,
        sprite = o.front;
      expect(ui.sourceCommit).toBe('731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');
      expect(o.trainerPicId).toBe(81);
      expect(o.sourceYOffset).toBe(1);
      expect(o.animation).toBe('sAnims_Steven -> sAnim_GeneralFrame0: frame 0, duration 0, END');
      expect(sprite.graphicsPath).toBe('graphics/trainers/front_pics/steven.png');
      expect(sprite.palettePath).toBe(sprite.graphicsPath);
      expect([sprite.width, sprite.height, sprite.idleFrame]).toEqual([64, 64, 0]);
      expect(sprite.anchor).toEqual([32, 32]);
      expect(sprite.frames).toHaveLength(1);
      expect(sprite.palette).toHaveLength(16);
      for (let n = 1; n <= 8; n++) {
        let mismatches = 0;
        const image = trainerSpriteImage(sprite, n);
        expect([image.width, image.height]).toEqual([64 * n, 64 * n]);
        const native = trainerSpriteImage(sprite);
        for (let y = 0; y < image.height; y++)
          for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4,
              j = (Math.floor(y / n) * 64 + Math.floor(x / n)) * 4;
            for (let c = 0; c < 4; c++) if (image.data[i + c] !== native.data[j + c]) mismatches++;
          }
        expect(mismatches).toBe(0);
      }
    });
    it('preserves semantic identity, exact slot geometry and hidden raster', () => {
      const { getByRole } = render(
        <SourceUiContext.Provider value={load()}>
          <SourceOpponentArt x={158} y={0} label="Steven Stone opponent portrait" />
        </SourceUiContext.Provider>,
      );
      const node = getByRole('img', { name: 'Steven Stone opponent portrait' });
      expect(node.dataset.sourceOpponent).toBe('steven-front');
      expect(node.dataset.sourceFrame).toBe('0');
      expect(node.dataset.sourceGraphics).toBe('graphics/trainers/front_pics/steven.png');
      expect(node.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
      // Actual positioned pixels are checked by the normal-game browser matrix.
    });
    it('shows the same original Steven in the audience portrait for every perspective', () => {
      const ui = load();
      const view = render(
        <SourceUiContext.Provider value={ui}>
          <AudienceChoice choices={ENCOUNTER_AUDIENCE_CHOICES} cursor={0} select={() => {}} />
        </SourceUiContext.Provider>,
      );
      for (const cursor of [0, 1, 2]) {
        view.rerender(
          <SourceUiContext.Provider value={ui}>
            <AudienceChoice
              choices={ENCOUNTER_AUDIENCE_CHOICES}
              cursor={cursor}
              select={() => {}}
            />
          </SourceUiContext.Provider>,
        );
        const portrait = view.getByRole('img', { name: 'Steven Stone challenger portrait' });
        expect(portrait.dataset.sourceGraphics).toBe('graphics/trainers/front_pics/steven.png');
        expect(view.container.querySelector('[data-opening-art^="portrait-"]')).toBeNull();
        expect(
          [
            ...view.getByRole('group', { name: 'Audience selection' }).querySelectorAll('button'),
          ].map((b) => b.getAttribute('aria-current')),
        ).toEqual([0, 1, 2].map((i) => i === cursor ? 'true' : null));
      }
    });
    it('keeps Brendan and all audience portrait identities separate', () => {
      const ui = load();
      expect(ui.player!.front.graphicsPath).toBe('graphics/trainers/front_pics/brendan.png');
      expect(ui.player!.back.graphicsPath).toBe('graphics/trainers/back_pics/brendan.png');
      expect([
        Audiences.RECRUITER!.portraitKey,
        Audiences.ENGINEER!.portraitKey,
        Audiences.FRIEND!.portraitKey,
      ]).toEqual(['portrait-recruiter', 'portrait-engineer', 'portrait-friend']);
    });
  },
);
