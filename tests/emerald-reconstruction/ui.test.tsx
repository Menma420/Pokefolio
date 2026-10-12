import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  type EmeraldUi,
  UiPainter,
  startUi,
  bagUi,
  battleUi,
  sourceTextWidth,
  sourcePages,
  sourceFit,
  sourceRgb,
} from '../../src/core/emerald/ui';
import { SourceUiContext, SourceButtons } from '../../src/ui/emerald/SourceUi';
import { SourceStartMenu, SourceBag } from '../../src/ui/emerald/SourceMenus';
import { PlayerMenu } from '../../src/ui/portfolio/PlayerMenu';
import { ClockContext } from '../../src/ui/kit/PixelContext';
import { FakeClock, FRAME_MS } from '../../src/core/clock';
import { globalInputRouter } from '../../src/core/input';
import { uiStore, settingsStore } from '../../src/runtime/stores';
import { PLAYER_MENU, getBagCategories } from '../../src/content/portfolio';
import { createPortfolioView } from '../../src/core/menu';
const path = 'artifacts/emerald-source/ui/ui-bundle.json';
const load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
const press = (key: Parameters<typeof globalInputRouter.handlePress>[0]) =>
  act(() => {
    globalInputRouter.handlePress(key);
    globalInputRouter.handleRelease(key);
  });
afterEach(() => {
  cleanup();
  globalInputRouter.unregister('p1-world');
  globalInputRouter.clearHeld();
  uiStore.getState().closeScreens();
  uiStore.getState().endTransition();
  vi.restoreAllMocks();
  settingsStore.getState().update({ animationReduced: false, reducedMotion: false });
});
describe('source UI raster rules independent of private assets', () => {
  it('expands each native pixel into exact integer physical blocks without new colors', () => {
    const p = new UiPainter();
    p.pixel(5, 7, 0x1234);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const image = p.image(n);
      expect([image.width, image.height]).toEqual([240 * n, 160 * n]);
      for (let y = 7 * n; y < 8 * n; y++)
        for (let x = 5 * n; x < 6 * n; x++)
          expect([
            ...image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4),
          ]).toEqual([...sourceRgb(0x1234), 255]);
    }
    expect(() => p.image(1.5)).toThrow('Integer');
  });
  it('decodes both source tile flips and palette banks without interpolating', () => {
    const tiles = Array(64).fill(0),
      pal = Array(32).fill(0);
    tiles[0] = 1;
    pal[17] = 0x001f;
    const p = new UiPainter();
    p.tile(tiles, pal, 0x1c00, 0, 0);
    expect([...p.data.slice((7 * 240 + 7) * 4, (7 * 240 + 7) * 4 + 4)]).toEqual([255, 0, 0, 255]);
    expect(p.data[3]).toBe(0);
  });
});
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'pinned private Emerald UI assets and adapters',
  () => {
    it('pins all assets to the existing world revision and validates provenance hashes', () => {
      const ui = load(),
        manifest = JSON.parse(readFileSync('artifacts/emerald-source/ui/ui-manifest.json', 'utf8')),
        world = JSON.parse(readFileSync('artifacts/emerald-source/manifest.json', 'utf8'));
      expect(ui.sourceCommit).toBe(world.source.commit);
      expect(ui.fonts.normal["'"]).toEqual(ui.fonts.normal['’']);
      expect(sourceTextWidth(ui, "Uttkarsh's")).toBe(sourceTextWidth(ui, 'Uttkarsh’s'));
      for (const [path, record] of Object.entries(manifest.inputs) as [
        string,
        { sha256: string },
      ][])
        expect(
          createHash('sha256')
            .update(readFileSync('pokeemerald/' + path))
            .digest('hex'),
        ).toBe(record.sha256);
      expect(
        manifest.conversionChecks.every(
          (c: { gbagfxMismatches: number; roundtripMismatches: number }) =>
            c.gbagfxMismatches === 0 && c.roundtripMismatches === 0,
        ),
      ).toBe(true);
    });
    it('uses the source seven-action template, row pitch and content palette distinct from border palette', () => {
      const ui = load();
      expect(ui.start).toEqual({
        x: 176,
        y: 8,
        width: 56,
        height: 128,
        textX: 8,
        textY: 9,
        pitch: 16,
      });
      const p = startUi(
        ui,
        PLAYER_MENU.map((x) => x.label),
        0,
      );
      expect([...p.data.slice((10 * 240 + 180) * 4, (10 * 240 + 180) * 4 + 3)]).toEqual(
        sourceRgb(ui.messagePalette[1]!),
      );
      expect(ui.frame.palette[1]).not.toBe(ui.messagePalette[1]);
      for (const l of PLAYER_MENU) {
        const font = sourceTextWidth(ui, l.label) > 48 ? 'narrow' : 'normal';
        let x = 0,
          lastInk = 0;
        for (const c of l.label) {
          const g = ui.fonts[font][c]!;
          g.pixels.forEach((v, i) => {
            if (v === 1 || v === 2) lastInk = Math.max(lastInk, x + (i % 16) + 1);
          });
          x += g.width;
        }
        const textX = font === 'narrow' ? Math.min(8, 56 - sourceTextWidth(ui, l.label, font)) : 8;
        expect(textX).toBeGreaterThanOrEqual(7);
        expect(textX + lastInk).toBeLessThanOrEqual(56);
      }
    });
    it('parses exact Bag tile-unit rectangles and 4-pocket metadata without invented items', () => {
      const ui = load();
      for (const [key, l, t, w, h] of [
        ['WIN_ITEM_LIST', 14, 2, 15, 16],
        ['WIN_DESCRIPTION', 0, 13, 14, 6],
        ['WIN_POCKET_NAME', 4, 1, 8, 2],
        ['WIN_MESSAGE', 2, 15, 27, 4],
      ] as const)
        expect(ui.bag.windows[key]).toMatchObject({
          tilemapLeft: l,
          tilemapTop: t,
          width: w,
          height: h,
        });
      expect(ui.bag.map).toHaveLength(1024);
      expect(ui.battle.map).toHaveLength(2048);
      expect(ui.bag.sprite).toHaveLength(6 * 64 * 64);
      expect(ui.arrows.bounce).toHaveLength(32);
      expect(ui.arrows.bounce.slice(0, 9)).toEqual([0, 0, 0, 1, 1, 1, 1, 1, 2]);
      expect(getBagCategories().map((c) => c.name)).toEqual([
        'DOCUMENTS',
        'PROFILES',
        'CONTACT',
        'EXTRAS',
      ]);
    });
    it('renders all Bag pockets, cursor changes and descriptions deterministically', () => {
      const ui = load();
      for (const [i, c] of getBagCategories().entries()) {
        const a = bagUi(
          ui,
          i,
          c.name,
          c.items.map((x) => x.name),
          0,
          c.items[0]?.description ?? 'Empty',
        ).image();
        expect(a.data).toEqual(
          bagUi(
            ui,
            i,
            c.name,
            c.items.map((x) => x.name),
            0,
            c.items[0]?.description ?? 'Empty',
          ).image().data,
        );
      }
      const labels = ['RESUME', 'CERTIFICATES'];
      expect(bagUi(ui, 0, 'DOCUMENTS', labels, 0, 'A').data).not.toEqual(
        bagUi(ui, 0, 'DOCUMENTS', labels, 1, 'B').data,
      );
    });
    it('reconstructs the 16-row pocket wipe/name slide through the shared Clock and respects reduced motion', () => {
      const ui = load(),
        clock = new FakeClock(),
        view = createPortfolioView('bag');
      const tree = (category: number) => (
        <SourceUiContext.Provider value={ui}>
          <ClockContext.Provider value={clock}>
            <SourceBag view={{ ...view, category }} tap={() => {}} category={() => {}} />
          </ClockContext.Provider>
        </SourceUiContext.Provider>
      );
      const screen = render(tree(0));
      screen.rerender(tree(1));
      act(() => clock.tick(0));
      expect(screen.getByRole('region', { name: 'Bag' }).getAttribute('data-bag-switching')).toBe(
        'true',
      );
      act(() => clock.tick(18 * FRAME_MS));
      expect(screen.getByRole('region', { name: 'Bag' }).getAttribute('data-bag-switching')).toBe(
        'false',
      );
      const midway = bagUi(ui, 1, 'PROFILES', ['GITHUB', 'LINKEDIN'], 0, 'Profile', 0, {
        frame: 0,
        switchFrame: 8,
        previousName: 'DOCUMENTS',
        direction: 1,
      });
      const pixel = (x: number, y: number) => [
        ...midway.data.slice((y * 240 + x) * 4, (y * 240 + x) * 4 + 3),
      ];
      expect(pixel(112, 16)).toEqual(sourceRgb(ui.bag.palette[ui.bag.tiles[17 * 64]!]!));
      expect(pixel(112, 16 + 15 * 8)).toEqual(sourceRgb(ui.bag.palette[ui.bag.tiles[11 * 64]!]!));
      act(() => settingsStore.getState().update({ reducedMotion: true }));
      screen.rerender(tree(2));
      act(() => clock.tick(FRAME_MS));
      expect(screen.getByRole('region', { name: 'Bag' }).getAttribute('data-bag-switching')).toBe(
        'false',
      );
    });
    it('preserves ordered semantic menu entries, every command handler and source grid hit geometry', () => {
      const ui = load(),
        tap = vi.fn();
      const screen = render(
        <SourceUiContext.Provider value={ui}>
          <SourceStartMenu cursor={2} tap={tap} />
        </SourceUiContext.Provider>,
      );
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(
        PLAYER_MENU.map((p) => p.label),
      );
      expect(screen.getByRole('button', { name: 'EXPERIENCE' }).getAttribute('aria-current')).toBe(
        'true',
      );
      cleanup();
      const commands = render(
        <SourceButtons
          options={['DETAILS', 'LINK', 'PARTY', 'EXIT']}
          index={0}
          onSelect={tap}
          kind="commands"
        />,
      );
      for (const [i, b] of commands.getAllByRole('button').entries()) {
        act(() => b.click());
        expect(tap).toHaveBeenLastCalledWith(i);
      }
    });
    it('keeps the source menu wrap, pause lock, exact B return and cursor restoration', () => {
      const clock = new FakeClock(),
        pause = vi.fn(() => Promise.resolve()),
        resume = vi.fn(() => Promise.resolve());
      globalInputRouter.register('p1-world', 'WORLD', () => {});
      uiStore.getState().rememberMenuCursor(0);
      const screen = render(
        <SourceUiContext.Provider value={load()}>
          <ClockContext.Provider value={clock}>
            <PlayerMenu available={() => true} pause={pause} resume={resume} onExit={() => {}} />
          </ClockContext.Provider>
        </SourceUiContext.Provider>,
      );
      press('X');
      expect(pause).toHaveBeenCalledOnce();
      expect(uiStore.getState().isTransitioning).toBe(false);
      press('UP');
      expect(screen.getByRole('button', { name: 'EXIT' }).getAttribute('aria-current')).toBe(
        'true',
      );
      press('DOWN');
      expect(screen.getByRole('button', { name: 'POKÉDEX' }).getAttribute('aria-current')).toBe(
        'true',
      );
      press('B');
      expect(resume).toHaveBeenCalledOnce();
      press('X');
      expect(screen.getByRole('button', { name: 'POKÉDEX' }).getAttribute('aria-current')).toBe(
        'true',
      );
    });
    it('retains disabled certificates, safe direct PDF use and Bag B contract', () => {
      const clock = new FakeClock(),
        opener = vi.spyOn(window, 'open').mockImplementation(() => null);
      globalInputRouter.register('p1-world', 'WORLD', () => {});
      const screen = render(
        <SourceUiContext.Provider value={load()}>
          <ClockContext.Provider value={clock}>
            <PlayerMenu
              available={() => true}
              pause={() => Promise.resolve()}
              resume={() => Promise.resolve()}
              onExit={() => {}}
            />
          </ClockContext.Provider>
        </SourceUiContext.Provider>,
      );
      press('Y');
      act(() => clock.tick(500));
      expect(
        screen.getByRole('button', { name: 'CERTIFICATES' }).getAttribute('aria-disabled'),
      ).toBe('true');
      press('A');
      expect(opener).toHaveBeenCalledWith(
        expect.stringContaining('/documents/Uttkarsh_Malviya.pdf'),
        '_blank',
        'noopener,noreferrer',
      );
      for (const [actions, pocket, item] of [
        [['RIGHT'], 1, 0],
        [['DOWN'], 1, 1],
        [['RIGHT'], 2, 0],
      ] as const) {
        act(() => clock.tick(200));
        for (const action of actions) press(action);
        press('A');
        expect(opener).toHaveBeenLastCalledWith(
          getBagCategories()[pocket]!.items[item]!.url,
          '_blank',
          'noopener,noreferrer',
        );
      }
      act(() => clock.tick(200));
      press('B');
      act(() => clock.tick(500));
      expect(screen.queryByRole('region', { name: 'Bag' })).toBeNull();
    });
    it('renders semantic Bag descriptions and source-only surfaces', () => {
      const ui = load(),
        view = createPortfolioView('bag'),
        screen = render(
          <SourceUiContext.Provider value={ui}>
            <SourceBag view={view} tap={() => {}} category={() => {}} />
          </SourceUiContext.Provider>,
        );
      expect(screen.getByRole('status').textContent).toContain(
        getBagCategories()[0]!.items[0]!.description,
      );
      expect(screen.container.querySelector('[data-source-ui="bag"]')).not.toBeNull();
    });
    it('fits compact topic cells without slicing glyphs, retains full text in two-line pages and paged grid buttons', () => {
      const ui = load(),
        text = 'WHAT DID YOU PERSONALLY OWN?';
      expect(sourceTextWidth(ui, sourceFit(ui, text, 64, 'narrow'), 'narrow')).toBeLessThanOrEqual(
        64,
      );
      expect(sourceFit(ui, text, 64, 'narrow')).toContain('...');
      const pages = sourcePages(ui, text, 64);
      expect(pages.join(' ').replaceAll('\n', ' ')).toContain('PERSONALLY');
      const tap = vi.fn(),
        screen = render(
          <SourceButtons
            kind="topics"
            options={['0', '1', '2', '3', '4', '5']}
            labels={['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5']}
            index={4}
            onSelect={tap}
          />,
        );
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
        'Q4',
        'Q5',
      ]);
    });
    it('uses all three battle source tilemap pages, distinct message/action palettes and exact cursor changes', () => {
      const ui = load();
      // Runtime LoadBattleMenuWindowGfx overwrites the base PNG's frame banks.
      for (const offset of [0x12, 0x22])
        expect(ui.battle.tiles.slice(offset * 64, (offset + 9) * 64)).toEqual(ui.frame.tiles);
      expect(ui.battle.palette.slice(16, 32)).toEqual(ui.frame.palette);
      expect(ui.downArrow).not.toEqual(ui.battleDownArrow);
      expect(ui.battle.windows.B_WIN_ACTION_MENU).toMatchObject({
        tilemapLeft: 17,
        tilemapTop: 35,
        width: 12,
        height: 4,
      });
      const renders = [0, 1, 2, 3].map(
        (i) =>
          battleUi(
            ui,
            'commands',
            ['DETAILS', 'LINK', 'PARTY', 'EXIT'],
            i,
            'What do you want to know?',
          ).data,
      );
      // CopyToBgTilemapBufferRect_ChangePalette(..., 0x11) preserves the
      // source word's palette bits (bg.c case 17); cursor tiles use bank 0.
      const ink = ui.battle.tiles.slice(64, 128).indexOf(9);
      expect(ink).toBeGreaterThanOrEqual(0);
      const pixel = ((120 + Math.floor(ink / 8)) * 240 + 128 + (ink % 8)) * 4;
      expect([...renders[0]!.slice(pixel, pixel + 3)]).toEqual(sourceRgb(ui.battle.palette[9]!));
      for (let i = 1; i < 4; i++) expect(renders[i]).not.toEqual(renders[0]);
      expect(battleUi(ui, 'message', [], 0, 'Hello').data).not.toEqual(
        battleUi(ui, 'topics', ['Topic'], 0).data,
      );
    });
  },
);
