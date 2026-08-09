import { defineConfig } from '@playwright/test';
import { proxyServerUrl } from './src/proxy/server';
import { REQUIRED_BROWSER_LAUNCH_ARGS } from './src/browser/contract';

// ---------------------------------------------------------------------------
// Nightwatch Playwright configuration (Phase 0/1/1.1/1.2).
//
// - Nightwatch manages its own evidence in artifacts/<run-id>; Playwright's
//   own trace/screenshot/video capture is disabled to avoid double capture.
// - The 'nightwatch' project drives the system Google Chrome via channel:
//   'chrome'. If Chrome is unavailable on a machine, install the bundled
//   browser instead:  npx playwright install chromium   and remove the
//   `channel` line below.
// - Test-suite convenience default: the self-tests may run without an
//   explicit NIGHTWATCH_ENV and fall back to 'local'. Real scenario runs via
//   `bin/nightwatch.mjs` REQUIRE --env (fail-closed).
// ---------------------------------------------------------------------------

process.env.NIGHTWATCH_ENV ??= 'local';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/tests/**/*.{test,smoke}.ts', '**/scenarios/**/*.smoke.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/.tmp-*/**'],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'test-results',
  globalSetup: './tests/globalSetup.ts',
  projects: [
    {
      name: 'nightwatch',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        headless: process.env.NIGHTWATCH_HEADED !== '1',
        // Explicit browser launch proxy. HTTP_PROXY/HTTPS_PROXY are not part
        // of the containment contract and are intentionally ignored.
        launchOptions: {
          proxy: { server: proxyServerUrl() },
          args: [
            ...REQUIRED_BROWSER_LAUNCH_ARGS,
            '--disable-background-networking',
            '--disable-sync',
            '--disable-default-apps',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-client-side-phishing-detection',
            '--disable-variations-safe-mode',
            '--disable-variations-seed-fetch',
            '--disable-top-sites',
            '--disable-network-hint',
            '--disable-fetching-hints-at-navigation-start',
            '--disable-features=AutofillServerCommunication,CertificateTransparencyComponentUpdater,InterestFeedContentSuggestions,MediaRouter,OptimizationHints,Translate',
          ],
        },
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
    },
  ],
});
