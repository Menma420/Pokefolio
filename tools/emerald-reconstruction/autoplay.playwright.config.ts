import {defineConfig} from '@playwright/test';
import production from './production.playwright.config';
export default defineConfig({...production,testMatch:['autoplay.e2e.ts','music.e2e.ts','music-production.e2e.ts'],outputDir:'../../artifacts/emerald-source/phase-audio-autoplay/browser-results'});
