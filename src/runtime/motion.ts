import { settingsStore } from './stores';
export function isReducedMotion(): boolean {
 return settingsStore.getState().reducedMotion || (typeof window!=='undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false));
}
