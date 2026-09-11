// Opt-in Phase 9B real-run configuration (contained DEV semantic acceptance).
// This file is never selected by the ordinary local suite, so external
// authenticated state cannot enter normal tests accidentally.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('phase9b'),
  testMatch: ['**/tests/manual/phase9b-contained-dev-semantic.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
