import { expect, it, vi } from 'vitest';

it('migrates existing progress and keeps discoveries when other progress fields change', async () => {
  sessionStorage.setItem(
    'uw.progress.v1',
    JSON.stringify({
      projectsVisited: [],
      battlesWon: 0,
      introSeen: true,
      firstEncounterDone: true,
    }),
  );
  vi.resetModules();
  const { progressStore } = await import('../../src/runtime/stores');
  expect(progressStore.getState().discoveries).toEqual([]);
  progressStore.getState().discover('forest-knight');
  progressStore.getState().discover('forest-knight');
  progressStore.getState().visitProject('POKEFOLIO');
  progressStore.getState().winBattle();
  progressStore.getState().markIntroSeen();
  progressStore.getState().markFirstEncounterDone();
  expect(progressStore.getState().discoveries).toEqual(['forest-knight']);
  vi.resetModules();
  const reloaded = await import('../../src/runtime/stores');
  expect(reloaded.progressStore.getState().discoveries).toEqual(['forest-knight']);
  expect(reloaded.progressStore.getState().projectsVisited).toEqual(['POKEFOLIO']);
  expect(reloaded.progressStore.getState().battlesWon).toBe(1);
  sessionStorage.clear();
});
