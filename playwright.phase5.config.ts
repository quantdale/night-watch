// Dedicated opt-in Phase 5 real API configuration. It inherits the mandatory
// loopback proxy global setup but excludes the ordinary self-test suite.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase5-real-api.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
