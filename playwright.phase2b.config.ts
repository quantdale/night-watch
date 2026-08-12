// Opt-in Phase 2B real-run configuration. This file is never selected by the
// ordinary local suite, so external authenticated state cannot enter normal
// tests accidentally.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase2b-real-journeys.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
