import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Physical-pixel raster tests are CPU-heavy; bound concurrent jsdom workers
    // on CI/hosts that report many CPUs but have a smaller effective quota.
    maxWorkers: 2,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    passWithNoTests: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
