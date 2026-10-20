import {defineConfig} from '@playwright/test';
import production from './production.playwright.config';
export default defineConfig({...production,testMatch:['movement.e2e.ts'],outputDir:'../../artifacts/emerald-source/phase-movement-timing/browser-results'});
