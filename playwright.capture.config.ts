// Dedicated config for the human-led authenticated capture. The manual
// helper is intentionally excluded from the ordinary suite so a normal local
// test run can never open a real target or wait for human input accidentally.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/auth-capture.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
