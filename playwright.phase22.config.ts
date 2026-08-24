import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/** Phase 22 has one fixed manifest-driven test. The manifest, not a selector,
 * supplies the bounded target list. */
export default defineConfig({
  ...baseConfig,
  testMatch: ['**/tests/manual/phase22-contained-dev-semantic.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
  workers: 1,
});
