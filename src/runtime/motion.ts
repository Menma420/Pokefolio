import { settingsStore } from './stores';
export function isReducedMotion(): boolean {
 return settingsStore.getState().reducedMotion || settingsStore.getState().animationReduced || (typeof window!=='undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false));
}
