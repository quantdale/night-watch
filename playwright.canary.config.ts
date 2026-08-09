// Dedicated config for the Phase 2A unauthenticated canary. It is excluded
// from the ordinary suite so a full local test run can never contact a real
// Alphaus environment accidentally.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase2a-canary.ts'],
  testIgnore: [],
});
