// Opt-in Phase 4 real exploration configuration. The ordinary suite never
// creates authenticated exploration contexts.
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('phase4'),
  testMatch: ['**/tests/manual/phase4-real-exploration.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
