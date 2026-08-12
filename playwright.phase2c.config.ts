// Opt-in Phase 2C real-run configuration. It is never selected by the
// ordinary local suite and requires the gated launcher plus external auth.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase2c-real-journeys.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
