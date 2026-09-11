// Dedicated config for the Phase 2A unauthenticated canary. It is excluded
// from the ordinary suite so a full local test run can never contact a real
// Alphaus environment accidentally.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('canary'),
  testMatch: ['**/tests/manual/phase2a-canary.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
