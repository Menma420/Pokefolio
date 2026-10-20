import {defineConfig} from '@playwright/test';
import production from './production.playwright.config';
export default defineConfig({
 ...production,
 testMatch:['product-runtime.e2e.ts','music-production.e2e.ts','integrated.e2e.ts','menus.e2e.ts','music.e2e.ts','opponent.e2e.ts','title.e2e.ts','performance.e2e.ts'],
 outputDir:'../../artifacts/emerald-source/phase-android-performance/browser-results',
});
