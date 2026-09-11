// Dedicated config for the opt-in Phase 2A authenticated observation. It is
// excluded from the ordinary suite so real storage state cannot be loaded by
// normal self-tests.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('authenticated'),
  testMatch: ['**/tests/manual/phase2a-authenticated.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});

