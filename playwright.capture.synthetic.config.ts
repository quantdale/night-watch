// Dedicated config for the local synthetic auth-capture regression. It uses
// the same project/global setup and containment contract as real capture, but
// its target is an in-process loopback fixture and it never accepts human or
// external credentials.

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/auth-capture.synthetic.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
});
