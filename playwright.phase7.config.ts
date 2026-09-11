// Dedicated opt-in Phase 7 real campaign configuration. It inherits the
// containment global setup but excludes the ordinary and synthetic suites.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

export default defineConfig({
  ...baseConfig,
  outputDir: resolvePlaywrightOutputDir('phase7'),
  testMatch: ['**/tests/manual/phase7-real-campaign.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
