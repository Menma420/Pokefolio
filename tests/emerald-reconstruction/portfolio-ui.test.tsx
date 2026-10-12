import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { SourceUiContext } from '../../src/ui/emerald/SourceUi';
import { Dex, Projects, Experience, TrainerCard } from '../../src/ui/portfolio/PortfolioScreens';
import {
  OptionsScreen,
  ControlsScreen,
  ExitConfirmation,
} from '../../src/ui/portfolio/MenuScreens';
import { PartyScreen } from '../../src/ui/battle/PartyScreen';
import { PlayerMenu } from '../../src/ui/portfolio/PlayerMenu';
import { ClockContext } from '../../src/ui/kit/PixelContext';
import { FakeClock } from '../../src/core/clock';
import { globalInputRouter } from '../../src/core/input';
import { uiStore, settingsStore } from '../../src/runtime/stores';
import {
  getSkills,
  getPortfolioProjects,
  getExperiences,
  getTrainerCard,
  OPTION_LABELS,
} from '../../src/content/portfolio';
import { createPortfolioView } from '../../src/core/menu';
import {
  dexListUi,
  partyUi,
  optionsUi,
  trainerUi,
  partyBoxes,
  sourceParagraph,
} from '../../src/core/emerald/portfolioUi';
import { sourceRgb, type EmeraldUi } from '../../src/core/emerald/ui';
const path = 'artifacts/emerald-source/ui/ui-bundle.json',
  load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
afterEach(() => {
  cleanup();
  globalInputRouter.unregister('p12-world');
  globalInputRouter.clearHeld();
  uiStore.getState().closeScreens();
  uiStore.getState().endTransition();
  vi.restoreAllMocks();
  settingsStore.getState().update({ animationReduced: false, reducedMotion: false });
});
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'P1.2 source assets and menu behavior',
  () => {
    it('loads correct distinct source templates and byte-indexed no-HP Party slots', () => {
      const ui = load(),
        p = ui.portfolio!;
      expect(ui.sourceCommit).toBe('731ad5bfd6e6f265508d0efcca0ba42f9dcf5881');
      expect(p.dex.list).toHaveLength(640);
      expect(p.dex.info).toHaveLength(640);
      expect(p.card.front).toHaveLength(600);
      expect(p.card.background).toHaveLength(600);
      expect(p.card.windows.WIN_TRAINER_PIC).toMatchObject({
        tilemapLeft: 19,
        tilemapTop: 5,
        width: 9,
        height: 10,
      });
      expect(p.options.windows.WIN_OPTIONS).toMatchObject({
        tilemapLeft: 2,
        tilemapTop: 5,
        width: 26,
        height: 14,
      });
      expect(p.options.darken).toBe(4);
      expect(p.party.main).toEqual([
        ...readFileSync('pokeemerald/graphics/party_menu/slot_main_no_hp.bin'),
      ]);
      expect(p.party.wide).toHaveLength(54);
      expect(
        p.party.windows
          .slice(0, 6)
          .map((t) => [t.tilemapLeft * 8, t.tilemapTop * 8, t.width * 8, t.height * 8]),
      ).toEqual(partyBoxes);
      expect(ui.fonts.small?.A?.width).toBeGreaterThan(0);
    });
    it('keeps list borders in front of text and produces deterministic palette-only physical pixels', () => {
      const ui = load(),
        p = dexListUi(
          ui,
          'POKÉDEX',
          'ALL',
          getSkills().map((s) => s.name),
          3,
          'LANGUAGE',
        );
      expect(p.image().data).toEqual(
        dexListUi(
          ui,
          'POKÉDEX',
          'ALL',
          getSkills().map((s) => s.name),
          3,
          'LANGUAGE',
        ).image().data,
      );
      const allowed = new Set(ui.portfolio!.dex.palette.map((c) => sourceRgb(c).join(',')));
      for (let i = 0; i < p.data.length; i += 4)
        if (p.data[i + 3]) expect(allowed.has([...p.data.slice(i, i + 3)].join(','))).toBe(true);
      const q = dexListUi(ui, 'POKÉDEX', 'ALL', [], 0, 'LANGUAGE');
      // Original BG1 bottom edge must occlude any overflowing BG2 glyphs.
      expect(p.data.slice((148 * 240 + 136) * 4, (148 * 240 + 224) * 4)).toEqual(
        q.data.slice((148 * 240 + 136) * 4, (148 * 240 + 224) * 4),
      );
    });
    it('reproduces selected-row WIN0 exclusion from GBA BLDY truncation', () => {
      const ui = load(),
        a = optionsUi(ui, ['MUSIC', 'SFX'], ['ON', 'OFF'], 0),
        b = optionsUi(ui, ['MUSIC', 'SFX'], ['ON', 'OFF'], 1),
        at = (40 * 240 + 18) * 4;
      const rgb = sourceRgb(ui.portfolio!.options.palette[1]!);
      expect([...a.data.slice(at, at + 3)]).toEqual(rgb);
      expect([...b.data.slice(at, at + 3)]).toEqual(
        rgb.map((v) => {
          const c = v >> 3,
            d = c - Math.floor((c * 4) / 16);
          return (d << 3) | (d >> 2);
        }),
      );
    });
    it('recolors each Party slot independently and removes baked Card badge numbers without fake facts', () => {
      const ui = load(),
        labels = getPortfolioProjects()
          .slice(0, 6)
          .map((p) => p.visual.shortName!),
        a = partyUi(ui, labels, [], 0, 0, 'CHOOSE A PROJECT'),
        b = partyUi(ui, labels, [], 1, 0, 'CHOOSE A PROJECT');
      expect(a.data).not.toEqual(b.data);
      // Unselected slot 3 pixels do not change when selection moves between slots 1/2.
      for (let y = 32; y < 56; y++)
        expect(a.data.slice((y * 240 + 96) * 4, (y * 240 + 240) * 4)).toEqual(
          b.data.slice((y * 240 + 96) * 4, (y * 240 + 240) * 4),
        );
      const profile = getTrainerCard(),
        card = trainerUi(ui, [profile.name], profile.achievements[0]!);
      expect(card.image().width).toBe(240);
      expect([...card.data.slice((112 * 240 + 32) * 4, (112 * 240 + 32) * 4 + 3)]).toEqual(
        sourceRgb(ui.portfolio!.card.palette[ui.portfolio!.card.tiles[64]!]!),
      );
    });
    it('pages all supplied prose without losing words', () => {
      const ui = load(),
        text = getPortfolioProjects()[0]!.summary.pages.join(' ');
      const first = sourceParagraph(ui, text, 216, 3, 0),
        all = Array.from(
          { length: first.count },
          (_, i) => sourceParagraph(ui, text, 216, 3, i).text,
        )
          .join(' ')
          .replace(/\s+/g, ' ');
      expect(all).toBe(text.replace(/\s+/g, ' '));
      expect(sourceParagraph(ui, text, 216, 3, first.count)).toEqual(first);
    });
    it.each([
      'dex',
      'dex-detail',
      'projects',
      'project-detail',
      'experience',
      'experience-detail',
      'card',
      'options',
      'controls',
      'exit',
    ] as const)(
      'renders %s via source UI with semantic content and unchanged actions',
      (screen) => {
        const ui = load(),
          view = createPortfolioView(screen, { cursor: screen === 'exit' ? 1 : 0 }),
          tap = vi.fn(),
          category = vi.fn(),
          related = vi.fn(),
          link = vi.fn();
        const child = screen.startsWith('dex') ? (
          <Dex view={view} tap={tap} category={category} related={related} />
        ) : screen.startsWith('project') ? (
          <Projects view={view} tap={tap} page={category} link={link} />
        ) : screen.startsWith('experience') ? (
          <Experience view={view} tap={tap} section={category} />
        ) : screen === 'card' ? (
          <TrainerCard />
        ) : screen === 'options' ? (
          <OptionsScreen
            view={view}
            values={['ON', 'ON', 'NORMAL', 'FULL', 'FOLLOW OS', '', '']}
            tap={tap}
          />
        ) : screen === 'controls' ? (
          <ControlsScreen />
        ) : (
          <ExitConfirmation cursor={1} tap={tap} />
        );
        const r = render(<SourceUiContext.Provider value={ui}>{child}</SourceUiContext.Provider>);
        expect(r.container.querySelector('[data-source-ui]')).not.toBeNull();
        expect(r.container.querySelector('[data-screen-recipe]')).toBeNull();
        if (screen === 'dex') {
          fireEvent.click(r.getByRole('button', { name: getSkills()[0]!.name }));
          expect(tap).toHaveBeenCalledWith(0);
          fireEvent.click(r.getByRole('button', { name: 'Next category or page' }));
          expect(category).toHaveBeenCalledWith(1);
        }
        if (screen === 'options') {
          expect(r.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(
            OPTION_LABELS,
          );
          fireEvent.click(r.getByRole('button', { name: 'TEXT SPEED' }));
          expect(tap).toHaveBeenCalledWith(2);
        }
        if (screen === 'exit') {
          expect(r.getByRole('button', { name: 'NO' }).getAttribute('aria-current')).toBe('true');
          fireEvent.click(r.getByRole('button', { name: 'YES' }));
          expect(tap).toHaveBeenCalledWith(0);
        }
        if (screen === 'experience-detail')
          expect(r.container.textContent).toContain(getExperiences()[0]!.sections[0]!.text);
        if (screen === 'card')
          expect(r.container.textContent).toContain(getTrainerCard().education);
      },
    );
    it('preserves screen-stack focus and settings effects through source-only presentation', () => {
      globalInputRouter.register('p12-world', 'WORLD', () => {});
      uiStore.getState().rememberMenuCursor(0);
      const ui = load(),
        clock = new FakeClock(),
        r = render(
          <ClockContext.Provider value={clock}>
            <SourceUiContext.Provider value={ui}>
              <PlayerMenu
                available={() => true}
                pause={async () => {}}
                resume={async () => {}}
                onExit={() => {}}
              />
            </SourceUiContext.Provider>
          </ClockContext.Provider>,
        );
      const press = (key: Parameters<typeof globalInputRouter.handlePress>[0]) =>
        act(() => {
          globalInputRouter.handlePress(key);
          globalInputRouter.handleRelease(key);
          clock.tick(1000);
        });
      press('X');
      press('A');
      act(() => clock.tick(1000));
      press('DOWN');
      press('A');
      expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('dex-detail');
      press('B');
      expect(uiStore.getState().screenStack.at(-1)).toMatchObject({ screen: 'dex', cursor: 1 });
      expect(document.activeElement).toBe(r.getByRole('button', { name: getSkills()[1]!.name }));
      press('B');
      act(() => clock.tick(1000));
      press('DOWN');
      press('DOWN');
      press('DOWN');
      press('DOWN');
      press('DOWN');
      press('A');
      act(() => clock.tick(1000));
      expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('options');
      press('DOWN');
      press('DOWN');
      const before = settingsStore.getState().textSpeed;
      press('RIGHT');
      expect(settingsStore.getState().textSpeed).not.toBe(before);
    });
    it('uses Clock-driven integer list scrolling and cancels it for reduced motion', () => {
      const ui = load(),
        clock = new FakeClock(),
        view = createPortfolioView('dex'),
        renderView = (cursor: number) => (
          <ClockContext.Provider value={clock}>
            <SourceUiContext.Provider value={ui}>
              <Dex
                view={{ ...view, cursor }}
                tap={() => {}}
                category={() => {}}
                related={() => {}}
              />
            </SourceUiContext.Provider>
          </ClockContext.Provider>
        ),
        r = render(renderView(0));
      r.rerender(renderView(1));
      act(() => clock.tick(0));
      expect(
        r.container
          .querySelector('[data-source-list-scroll]')
          ?.getAttribute('data-source-list-scroll'),
      ).toBe('16');
      act(() => clock.tick((4 * 1000) / 60));
      expect(
        r.container
          .querySelector('[data-source-list-scroll]')
          ?.getAttribute('data-source-list-scroll'),
      ).toBe('8');
      act(() => clock.tick((8 * 1000) / 60));
      expect(
        r.container
          .querySelector('[data-source-list-scroll]')
          ?.getAttribute('data-source-list-scroll'),
      ).toBe('0');
      act(() => settingsStore.getState().update({ reducedMotion: true }));
      r.rerender(renderView(2));
      act(() => clock.tick(0));
      expect(
        r.container
          .querySelector('[data-source-list-scroll]')
          ?.getAttribute('data-source-list-scroll'),
      ).toBe('0');
    });
    it('keeps six Party project handlers, active marker and B cancellation', () => {
      const ui = load(),
        projects = getPortfolioProjects().slice(0, 6),
        clock = new FakeClock(),
        select = vi.fn(),
        cancel = vi.fn(),
        r = render(
          <ClockContext.Provider value={clock}>
            <SourceUiContext.Provider value={ui}>
              <PartyScreen
                projects={projects}
                activeProjectId={projects[0]!.id}
                onSelect={select}
                onCancel={cancel}
              />
            </SourceUiContext.Provider>
          </ClockContext.Provider>,
        );
      expect(r.getByRole('button', { name: projects[0]!.name }).getAttribute('aria-pressed')).toBe(
        'true',
      );
      act(() => {
        globalInputRouter.handlePress('DOWN');
        globalInputRouter.handleRelease('DOWN');
      });
      act(() => {
        globalInputRouter.handlePress('A');
        globalInputRouter.handleRelease('A');
        clock.tick(1000);
      });
      expect(select).toHaveBeenCalledWith(projects[1]!.id);
      act(() => {
        globalInputRouter.handlePress('B');
        globalInputRouter.handleRelease('B');
      });
      expect(cancel).toHaveBeenCalledOnce();
    });
  },
);
