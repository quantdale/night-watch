// Opt-in Phase 4 real exploration configuration. The ordinary suite never
// creates authenticated exploration contexts.
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase4-real-exploration.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
