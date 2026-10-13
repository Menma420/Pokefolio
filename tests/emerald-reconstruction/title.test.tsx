import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { type EmeraldUi, sourceRgb } from '../../src/core/emerald/ui';
import {
  titleUi,
  titleBlend,
  titlePrompt,
  titlePromptLayout,
} from '../../src/core/emerald/titleUi';
import { SourceUiContext } from '../../src/ui/emerald/SourceUi';
import { ClockContext } from '../../src/ui/kit/PixelContext';
import { FakeClock } from '../../src/core/clock';
import { TitleScreen } from '../../src/ui/opening/TitleScreen';
const path = 'artifacts/emerald-source/ui/ui-bundle.json';
const load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
afterEach(cleanup);
it('blends GBA RGB555 channels with integer truncation and saturation', () => {
  expect(titleBlend(0x7fff, 0)).toBe(11 | (11 << 5) | (11 << 10));
  expect(titleBlend(0x7fff, 0x7fff)).toBe(0x7fff);
  expect(titleBlend(0x001f, 0x03e0)).toBe(11 | (29 << 5));
});
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'source title',
  () => {
    it('retains pinned source layers, native assets and original prompt geometry', () => {
      const ui = load(),
        t = ui.title!;
      expect(ui.sourceCommit).toBe('731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');
      expect(t.rayquaza.map).toHaveLength(1024);
      expect(t.clouds.map).toHaveLength(1024);
      expect(t.sourceLogo.bpp).toBe(8);
      expect(t.sourceLogo.map).toHaveLength(1024);
      expect(t.pressStart).toMatchObject({ x: 48, y: 104, tileOffsets: [1, 5, 9, 13, 17] });
      expect(t.cloudBlend).toEqual([6, 15]);
      expect(t.wave).toHaveLength(64);
      expect(t.logo).toMatchObject({ width: 180, height: 34, x: 30, y: 18, text: 'PokéFolio' });
      expect(t.logo.pixels).toHaveLength(180 * 34);
      expect(t.logo.glyphs.map((g) => g.char).join('')).toBe('PokéFolio');
      const e = t.logo.glyphs[3]!;
      expect(e.char).toBe('é');
      expect(e.accent).toHaveLength(4);
      for (const [x, y] of e.accent!) expect(t.logo.pixels[y! * 180 + x!]).not.toBe(0);
      for (const g of t.logo.glyphs) {
        expect(g.baseline).toBe(30);
        if (g.char === 'o' || g.char === 'é') expect(g.bodyTop).toBe(11);
      }
      expect(t.logo.glyphs.find((g) => g.char === 'i')!.dot).toHaveLength(4);
      expect(t.logo.paletteIndices).toHaveLength(3);
      expect(t.logo.pixels.every((p) => p === 0 || t.logo.paletteIndices.includes(p))).toBe(true);
      expect(t.logo.bounds).toEqual([0, 2, 180, 32]);
    });
    it('renders deterministic animation without mutating source data or introducing fractional pixels', () => {
      const ui = load(),
        before = JSON.stringify(ui.title);
      const a = titleUi(ui, 64),
        b = titleUi(ui, 64),
        c = titleUi(ui, 100);
      expect(a.data).toEqual(b.data);
      expect(a.data).not.toEqual(c.data);
      expect(JSON.stringify(ui.title)).toBe(before);
      expect(a.data.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
      for (const n of [1, 3, 4]) {
        const im = a.image(n);
        expect([im.width, im.height]).toEqual([240 * n, 160 * n]);
        for (const [x, y] of [
          [10, 10],
          [120, 80],
          [200, 145],
        ])
          for (let dy = 0; dy < n; dy++)
            for (let dx = 0; dx < n; dx++)
              expect([
                ...im.data.slice(
                  ((y! * n + dy) * im.width + x! * n + dx) * 4,
                  ((y! * n + dy) * im.width + x! * n + dx) * 4 + 4,
                ),
              ]).toEqual([...a.data.slice((y! * 240 + x!) * 4, (y! * 240 + x!) * 4 + 4)]);
      }
    });
    it('uses mixed-case bitmap prompt rather than browser text and preserves disabled/start actions', () => {
      const clock = new FakeClock();
      let starts = 0;
      const view = render(
        <SourceUiContext.Provider value={load()}>
          <ClockContext.Provider value={clock}>
            <TitleScreen ready locked={false} onStart={() => starts++} />
          </ClockContext.Provider>
        </SourceUiContext.Provider>,
      );
      expect(view.getByRole('heading', { name: 'PokéFolio' })).toBeTruthy();
      expect(view.container.querySelector('[data-source-ui="emerald-title"]')).not.toBeNull();
      expect(view.getByRole('button', { name: 'PRESS START' }).textContent).toBe('');
      expect(
        view.getByRole('button', { name: 'PRESS START' }).getAttribute('data-title-prompt'),
      ).toBe('Press Start');
      act(() => clock.tick(400));
      fireEvent.click(view.getByRole('button', { name: 'PRESS START' }));
      expect(starts).toBe(1);
      view.rerender(
        <SourceUiContext.Provider value={load()}>
          <TitleScreen ready locked onStart={() => starts++} />
        </SourceUiContext.Provider>,
      );
      fireEvent.click(view.getByRole('button', { name: 'PRESS START' }));
      expect(starts).toBe(1);
    });
    it('centers the exact Press Start source bitmap glyphs with an opaque dark contour', () => {
      const ui = load(),
        p = titleUi(ui, 64),
        hidden = titleUi(ui, 64, false),
        t = titlePromptLayout(ui),
        ink = titlePrompt(ui);
      expect(t).toEqual({ text: 'Press Start', x: 89, y: 119, width: 61, height: 16 });
      expect(Math.abs(t.x + t.width / 2 - 120)).toBeLessThanOrEqual(0.5);
      let compared = 0;
      let gx = t.x;
      for (const char of t.text) {
        const glyph = ui.fonts.normal[char]!;
        for (let y = 0; y < 15; y++)
          for (let x = 0; x < glyph.width; x++) {
            if (glyph.pixels[y * 16 + x] !== 1) continue;
            const at = ((t.y + y) * 240 + gx + x) * 4;
            expect([...p.data.slice(at, at + 4)]).toEqual([
              ...sourceRgb(ui.title!.pressStart.palette[5]!),
              255,
            ]);
            compared++;
          }
        gx += glyph.width;
      }
      for (let at = 0; at < ink.data.length; at += 4)
        if (ink.data[at + 3]) {
          expect(ink.data[at + 3]).toBe(255);
          expect([...ink.data.slice(at, at + 4)]).toEqual([...p.data.slice(at, at + 4)]);
        }
      expect(compared).toBeGreaterThan(100);
      for (let y = 0; y < 160; y++)
        for (let x = 0; x < 240; x++) {
          const at = (y * 240 + x) * 4;
          if (
            p.data[at] !== hidden.data[at] ||
            p.data[at + 1] !== hidden.data[at + 1] ||
            p.data[at + 2] !== hidden.data[at + 2]
          )
            expect(x >= t.x - 1 && x < t.x + t.width + 1 && y >= t.y - 1 && y < t.y + 17).toBe(
              true,
            );
        }
    });
    it('preserves every background pixel at the pre-correction animation checkpoints', () => {
      const ui = load();
      const expected = [
        [0, '509e38930805448b1a3126d70f18d1d64a7f8ededfe89b4e2b57ad124d852b32'],
        [64, 'fab15c7876e9ebd4367549ecbe76ed1f45c86f9e6cca2974a309a2897536008a'],
        [128, '7b385b9322638800484a411e284d7e21ecc7a853a43cd2bc9d59141d5cf8abc0'],
        [208, 'f9e4a090f33f178c39be7b62c38aa837b8ae4ba4dd0acba4c42b9d50d4151fd9'],
      ] as const;
      for (const [frame, hash] of expected)
        expect(
          createHash('sha256')
            .update(titleUi(ui, frame, false, 0, false).data)
            .digest('hex'),
        ).toBe(hash);
    });
  },
);
