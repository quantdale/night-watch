// Dedicated config for the local Phase 2A gate harness. The gate helper is
// deliberately excluded from the ordinary suite because it requires an
// external storage-state path and is invoked only by bin/observe-gate.mjs.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/observe-gate.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
