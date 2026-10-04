import type { TransitionKind, TransitionFrame } from '../TransitionDirector';
import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import { createStorage } from '../storage';
import type { PortfolioView } from '../../domain/menu';
import { pushScreen, popScreen, updateScreen, type ScreenStack } from '../../core/menu';

// --- SETTINGS STORE ---
const SettingsSchema = z.object({
  textSpeed: z.enum(['slow', 'normal', 'fast', 'instant']),
  soundMuted: z.boolean(),
  musicMuted: z.boolean(),
  reducedMotion: z.boolean(),
  animationReduced: z.boolean().default(false)
});
export type SettingsState = z.infer<typeof SettingsSchema>;

const defaultSettings: SettingsState = {
  textSpeed: 'normal',
  soundMuted: false,
  musicMuted: false,
  reducedMotion: false,
  animationReduced: false
};

const settingsStorage = createStorage('uw.settings.v1', SettingsSchema, defaultSettings, 'local');

export const settingsStore = createStore<SettingsState & { update: (partial: Partial<SettingsState>) => void }>()((set) => ({
  ...settingsStorage.read(),
  update: (partial) => set((state) => {
    const next = { ...state, ...partial };
    settingsStorage.write({
      textSpeed: next.textSpeed,
      soundMuted: next.soundMuted,
      musicMuted: next.musicMuted,
      reducedMotion: next.reducedMotion,
      animationReduced: next.animationReduced
    });
    return next;
  })
}));


// --- HINTS STORE ---
const HintsSchema = z.object({
  seenHowToPlay: z.boolean(),
  seenBattleUI: z.boolean(),
  seenFirstMove: z.boolean().default(false),
  seenFirstInteract: z.boolean().default(false),
  seenPokedex: z.boolean().default(false),
  seenTrainerCard: z.boolean().default(false),
});
export type HintsState = z.infer<typeof HintsSchema>;

const defaultHints: HintsState = {
  seenHowToPlay: false,
  seenBattleUI: false,
  seenFirstMove: false,
  seenFirstInteract: false,
  seenPokedex: false,
  seenTrainerCard: false,
};

const hintsStorage = createStorage('uw.hints.v1', HintsSchema, defaultHints, 'local');

export const hintsStore = createStore<HintsState & { reset: () => void;
  markSeen: (key: keyof HintsState) => void }>()((set) => ({
  ...hintsStorage.read(),
  reset: () => {hintsStorage.write(defaultHints);set(defaultHints);},
  markSeen: (key) => set((state) => {
    const next = { ...state, [key]: true };
    hintsStorage.write({
      seenHowToPlay: next.seenHowToPlay,
      seenBattleUI: next.seenBattleUI,
      seenFirstMove: next.seenFirstMove,
      seenFirstInteract: next.seenFirstInteract,
      seenPokedex: next.seenPokedex,
      seenTrainerCard: next.seenTrainerCard,
    });
    return next;
  })
}));


// --- PROGRESS STORE ---
const ProgressSchema = z.object({
  projectsVisited: z.array(z.string()),
  battlesWon: z.number(),
  introSeen: z.boolean().default(false),
  firstEncounterDone: z.boolean().default(false),
  discoveries: z.array(z.string()).default([]),
});
export type ProgressState = z.infer<typeof ProgressSchema>;

const defaultProgress: ProgressState = {
  projectsVisited: [],
  battlesWon: 0,
  introSeen: false,
  firstEncounterDone: false,
  discoveries: [],
};

const progressStorage = createStorage('uw.progress.v1', ProgressSchema, defaultProgress, 'session');

export const progressStore = createStore<ProgressState & { 
  visitProject: (id: string) => void; 
  winBattle: () => void;
  markIntroSeen: () => void;
  markFirstEncounterDone: () => void;
  discover: (id: string) => void;
}>()((set) => ({
  ...progressStorage.read(),
  discover: (id) => set(state => {
    if (state.discoveries.includes(id)) return state;
    const next = { ...state, discoveries: [...state.discoveries, id] };
    progressStorage.write(next);
    return next;
  }),
  visitProject: (id) => set((state) => {
    if (state.projectsVisited.includes(id)) return state;
    const next = { ...state, projectsVisited: [...state.projectsVisited, id] };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon, introSeen: next.introSeen, firstEncounterDone: next.firstEncounterDone, discoveries: next.discoveries });
    return next;
  }),
  winBattle: () => set((state) => {
    const next = { ...state, battlesWon: state.battlesWon + 1 };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon, introSeen: next.introSeen, firstEncounterDone: next.firstEncounterDone, discoveries: next.discoveries });
    return next;
  }),
  markIntroSeen: () => set((state) => {
    const next = { ...state, introSeen: true };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon, introSeen: next.introSeen, firstEncounterDone: next.firstEncounterDone, discoveries: next.discoveries });
    return next;
  }),
  markFirstEncounterDone: () => set((state) => {
    const next = { ...state, firstEncounterDone: true };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon, introSeen: next.introSeen, firstEncounterDone: next.firstEncounterDone, discoveries: next.discoveries });
    return next;
  }),
}));

// --- UI STORE (Transient Runtime) ---
export interface UiState {
  screenStack: ScreenStack<PortfolioView>;
  lastMenuCursor: number;
  isTransitioning: boolean;
  transitionType: TransitionKind | null;
  transitionFrame: TransitionFrame | null;
  virtualControlsVisible: boolean;
}

const defaultUiState: UiState = {
  screenStack: [],
  lastMenuCursor: 0,
  isTransitioning: false,
  transitionType: null,
  transitionFrame: null,
  virtualControlsVisible: false
};

// Vanilla Zustand for transient UI state ONLY. NO localStorage persistence.
export const uiStore = createStore<UiState & { 
  openScreen: (frame: PortfolioView) => void;
  pushScreen: (frame: PortfolioView) => void;
  updateScreen: (patch: Partial<PortfolioView>) => void;
  popScreen: () => void;
  closeScreens: () => void;
  rememberMenuCursor: (cursor: number) => void;
  startTransition: (type: UiState['transitionType']) => void; 
  endTransition: () => void;
  setTransitionFrame: (frame: TransitionFrame) => void;
  setVirtualControls: (visible: boolean) => void;
}>()((set) => ({
  ...defaultUiState,
  openScreen: (frame) => set({screenStack:[frame]}),
  pushScreen: (frame) => set(state => ({screenStack:pushScreen(state.screenStack, frame)})),
  updateScreen: (patch) => set(state => ({screenStack:updateScreen(state.screenStack, patch)})),
  popScreen: () => set(state => ({screenStack:popScreen(state.screenStack)})),
  closeScreens: () => set({screenStack:[]}),
  rememberMenuCursor: (cursor) => set({lastMenuCursor:cursor}),
  startTransition: (type) => set({ isTransitioning: true, transitionType: type, transitionFrame: null }),
  setTransitionFrame: (frame) => set({transitionFrame:frame}),
  endTransition: () => set({ isTransitioning: false, transitionType: null, transitionFrame: null }),
  setVirtualControls: (visible) => set({ virtualControlsVisible: visible })
}));
