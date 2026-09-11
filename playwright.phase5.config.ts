// Dedicated opt-in Phase 5 real API configuration. It inherits the mandatory
// loopback proxy global setup but excludes the ordinary self-test suite.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('phase5'),
  testMatch: ['**/tests/manual/phase5-real-api.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
