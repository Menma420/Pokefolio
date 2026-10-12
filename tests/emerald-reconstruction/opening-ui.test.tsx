import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { type EmeraldUi, sourcePages, sourceRgb } from '../../src/core/emerald/ui';
import {
  birchIntroUi,
  fieldMessageUi,
  audienceChoiceUi,
  sourceNamePlate,
} from '../../src/core/emerald/openingUi';
import { SourceUiContext } from '../../src/ui/emerald/SourceUi';
import { SourceBirchIntro } from '../../src/ui/emerald/SourceOpening';
import { AudienceChoice } from '../../src/ui/opening/AudienceChoice';
import { DialogueBox } from '../../src/ui/kit/DialogueBox';
import { FakeClock } from '../../src/core/clock';
import { globalInputRouter } from '../../src/core/input';
import { INTRO_NARRATION, ENCOUNTER_AUDIENCE_CHOICES } from '../../src/content/narrative';
const path = 'artifacts/emerald-source/ui/ui-bundle.json';
const load = () => JSON.parse(readFileSync(path, 'utf8')) as EmeraldUi;
afterEach(() => {
  cleanup();
  globalInputRouter.clearHeld();
});
it('prepends the welcome and preserves all three original introduction lines', () => {
  expect(INTRO_NARRATION).toEqual([
    'Welcome to the world of Uttkarsh.',
    'Here, you play as Uttkarsh.',
    'But somewhere in this world, you are here too.',
    'Find yourself, and you may get the chance to face Uttkarsh—as yourself.',
  ]);
});
describe.skipIf(process.env.EMERALD_TEST_SOURCE !== '1' || !existsSync(path))(
  'private source opening presentation',
  () => {
    it('extracts the original Birch opening object and its exact source window', () => {
      const ui = load(),
        intro = ui.intro!;
      expect(intro.birch.graphicsPath).toBe('graphics/birch_speech/birch.png');
      expect([intro.birch.width, intro.birch.height, ...intro.birch.center]).toEqual([
        64, 64, 136, 60,
      ]);
      expect(intro.birch.tiles).toHaveLength(4096);
      expect(intro.map).toHaveLength(640);
      expect(intro.window).toEqual({
        bg: 0,
        tilemapLeft: 2,
        tilemapTop: 15,
        width: 27,
        height: 4,
        paletteNum: 15,
        baseBlock: 1,
      });
      const { getByRole } = render(
        <SourceUiContext.Provider value={ui}>
          <SourceBirchIntro />
        </SourceUiContext.Provider>,
      );
      expect(getByRole('img').getAttribute('data-source-graphics')).toBe(intro.birch.graphicsPath);
    });
    it('uses original transparent Birch pixels, source center and palette without enlarging him', () => {
      const ui = load(),
        p = birchIntroUi(ui),
        b = ui.intro!.birch;
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const index =
            b.tiles[(Math.floor(y / 8) * 8 + Math.floor(x / 8)) * 64 + (y % 8) * 8 + (x % 8)]!;
          if (index)
            expect([
              ...p.data.slice(((y + 28) * 240 + x + 104) * 4, ((y + 28) * 240 + x + 104) * 4 + 4),
            ]).toEqual([...sourceRgb(b.palette[index]!), 255]);
        }
    });
    it('uses the distinct field message palette and source font for Birch, audience and VS', () => {
      const ui = load(),
        p = fieldMessageUi(ui, INTRO_NARRATION[0]);
      expect([...p.data.slice((120 * 240 + 16) * 4, (120 * 240 + 16) * 4 + 3)]).toEqual(
        sourceRgb(ui.messagePalette[1]!),
      );
      expect(sourcePages(ui, INTRO_NARRATION[0], 216)).toEqual([INTRO_NARRATION[0]]);
      expect(ui.messagePalette).not.toEqual(ui.battle.palette.slice(0, 16));
      expect(p.data.some((v) => v !== 0)).toBe(true);
      expect(sourceNamePlate(ui, 'UTTKARSH', 104, 80).data[(80 * 240 + 104) * 4 + 3]).toBe(255);
    });
    it('retains audience order, semantic labels, cursor-only selection and callback contract', () => {
      const ui = load(),
        selected: number[] = [];
      const { getByRole } = render(
        <SourceUiContext.Provider value={ui}>
          <AudienceChoice
            choices={ENCOUNTER_AUDIENCE_CHOICES}
            cursor={1}
            select={(i) => selected.push(i)}
          />
        </SourceUiContext.Provider>,
      );
      const buttons = getByRole('group', { name: 'Audience selection' }).querySelectorAll('button');
      expect([...buttons].map((b) => b.getAttribute('aria-label'))).toEqual(
        ENCOUNTER_AUDIENCE_CHOICES.map((c) => c.label),
      );
      expect(buttons[1]!.getAttribute('aria-current')).toBe('true');
      act(() => buttons[2]!.click());
      expect(selected).toEqual([2]);
      const a = audienceChoiceUi(ui, ['RECRUITER', 'ENGINEER', 'FRIEND'], 0).data;
      const b = audienceChoiceUi(ui, ['RECRUITER', 'ENGINEER', 'FRIEND'], 1).data;
      for (let y = 0; y < 160; y++)
        for (let x = 0; x < 240; x++)
          if (a[(y * 240 + x) * 4] !== b[(y * 240 + x) * 4])
            expect(x >= 96 && x < 104 && y >= 49 && y < 81).toBe(true);
    });
    it('keeps Clock-driven typewriter and A reveal/advance ownership', () => {
      const clock = new FakeClock(),
        ui = load();
      let completed = 0;
      const { getByRole, container } = render(
        <SourceUiContext.Provider value={ui}>
          <DialogueBox
            variant="opening"
            text={INTRO_NARRATION[0]}
            clock={clock}
            onComplete={() => completed++}
          />
        </SourceUiContext.Provider>,
      );
      expect(getByRole('button').getAttribute('aria-label')).toBe('Reveal dialogue');
      act(() => clock.tick(100));
      expect(completed).toBe(0);
      act(() => {
        globalInputRouter.handlePress('A');
        globalInputRouter.handleRelease('A');
      });
      expect(getByRole('status').textContent).toBe(INTRO_NARRATION[0]);
      expect(container.querySelector('[data-source-ui="field-message"]')).not.toBeNull();
      act(() => {
        globalInputRouter.handlePress('A');
        globalInputRouter.handleRelease('A');
      });
      expect(completed).toBe(1);
    });
  },
);
