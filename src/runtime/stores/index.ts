import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import { createStorage } from '../storage';

// --- SETTINGS STORE ---
const SettingsSchema = z.object({
  textSpeed: z.enum(['slow', 'normal', 'fast']),
  soundMuted: z.boolean(),
  musicMuted: z.boolean(),
  reducedMotion: z.boolean()
});
export type SettingsState = z.infer<typeof SettingsSchema>;

const defaultSettings: SettingsState = {
  textSpeed: 'normal',
  soundMuted: false,
  musicMuted: false,
  reducedMotion: false
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
      reducedMotion: next.reducedMotion
    });
    return next;
  })
}));


// --- HINTS STORE ---
const HintsSchema = z.object({
  seenHowToPlay: z.boolean(),
  seenBattleUI: z.boolean()
});
export type HintsState = z.infer<typeof HintsSchema>;

const defaultHints: HintsState = {
  seenHowToPlay: false,
  seenBattleUI: false
};

const hintsStorage = createStorage('uw.hints.v1', HintsSchema, defaultHints, 'local');

export const hintsStore = createStore<HintsState & { markSeen: (key: keyof HintsState) => void }>()((set) => ({
  ...hintsStorage.read(),
  markSeen: (key) => set((state) => {
    const next = { ...state, [key]: true };
    hintsStorage.write({
      seenHowToPlay: next.seenHowToPlay,
      seenBattleUI: next.seenBattleUI
    });
    return next;
  })
}));


// --- PROGRESS STORE ---
const ProgressSchema = z.object({
  projectsVisited: z.array(z.string()),
  battlesWon: z.number()
});
export type ProgressState = z.infer<typeof ProgressSchema>;

const defaultProgress: ProgressState = {
  projectsVisited: [],
  battlesWon: 0
};

const progressStorage = createStorage('uw.progress.v1', ProgressSchema, defaultProgress, 'session');

export const progressStore = createStore<ProgressState & { 
  visitProject: (id: string) => void; 
  winBattle: () => void;
}>()((set) => ({
  ...progressStorage.read(),
  visitProject: (id) => set((state) => {
    if (state.projectsVisited.includes(id)) return state;
    const next = { ...state, projectsVisited: [...state.projectsVisited, id] };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon });
    return next;
  }),
  winBattle: () => set((state) => {
    const next = { ...state, battlesWon: state.battlesWon + 1 };
    progressStorage.write({ projectsVisited: next.projectsVisited, battlesWon: next.battlesWon });
    return next;
  })
}));

// --- UI STORE (Transient Runtime) ---
export interface UiState {
  isTransitioning: boolean;
  transitionType: 'blur' | 'wipe' | 'battle' | null;
  virtualControlsVisible: boolean;
}

const defaultUiState: UiState = {
  isTransitioning: false,
  transitionType: null,
  virtualControlsVisible: false
};

// Vanilla Zustand for transient UI state ONLY. NO localStorage persistence.
export const uiStore = createStore<UiState & { 
  startTransition: (type: UiState['transitionType']) => void; 
  endTransition: () => void;
  setVirtualControls: (visible: boolean) => void;
}>()((set) => ({
  ...defaultUiState,
  startTransition: (type) => set({ isTransitioning: true, transitionType: type }),
  endTransition: () => set({ isTransitioning: false, transitionType: null }),
  setVirtualControls: (visible) => set({ virtualControlsVisible: visible })
}));

