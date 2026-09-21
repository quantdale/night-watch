import { defineConfig } from '@playwright/test';
import { proxyServerUrl } from './src/proxy/server';
import { nightwatchChromiumLaunchOptions } from './src/browser/contract';
import { resolvePlaywrightOutputDir } from './src/core/workspace/ephemeralLayout';

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

// F-PERF-1: a second, silent timing reporter writes one bounded timing
// document per invocation under the owned `test-results/timings/` directory.
// The lane label is an environment input so a shard, a gate lane, or the full
// regression all stay attributable; it is sanitized by the reporter itself.
const timingLane = process.env.NIGHTWATCH_TIMING_LANE ?? 'default';

export default defineConfig({
  testDir: '.',
  testMatch: ['**/tests/**/*.{test,smoke}.ts', '**/scenarios/**/*.smoke.ts'],
  testIgnore: ['**/fixtures/**', '**/node_modules/**', '**/dist/**', '**/artifacts/**', '**/test-results/**', '**/.tmp-*/**'],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['./tests/helpers/playwrightTimingReporter.ts', { lane: timingLane }]],
  outputDir: resolvePlaywrightOutputDir('core'),
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
          ...nightwatchChromiumLaunchOptions(proxyServerUrl()),
        },
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
    },
  ],
});
