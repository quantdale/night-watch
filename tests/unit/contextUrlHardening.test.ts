import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { validateUiUrl } from '../../src/browser/context';
import { loadEnvironmentConfig } from '../../src/core/environment';
import {
  BROWSER_CHANNEL_ENV_VAR,
  DEFAULT_BROWSER_CHANNEL,
  SUPPORTED_BROWSER_CHANNELS,
  isSupportedBrowserChannel,
  playwrightBrowsersDirectory,
  resolveBrowserChannel,
  resolveBrowserChannelExecutable,
  resolveBundledChromiumExecutable,
} from '../../src/browser/channel';

const ENV: EnvironmentConfig = {
  name: 'local',
  label: 'synthetic local environment',
  uiBaseUrl: 'http://127.0.0.1:7311/',
  allowedHosts: ['127.0.0.1'],
  staticAssetHosts: [],
  telemetryHosts: [],
  failOn: [],
};

test('UI target validation rejects URL userinfo and fragment/query material', () => {
  for (const target of [
    'http://synthetic-user:synthetic-password@127.0.0.1:7311/',
    'http://127.0.0.1:7311/?synthetic-query=synthetic-value',
    'http://127.0.0.1:7311/#synthetic-fragment',
  ]) {
    let thrown: Error | undefined;
    try {
      validateUiUrl(ENV, target);
    } catch (error) {
      thrown = error as Error;
    }
    expect(thrown, target).toBeDefined();
    expect(thrown?.message).not.toContain('synthetic-password');
    expect(thrown?.message).not.toContain('synthetic-query');
    expect(thrown?.message).not.toContain('synthetic-fragment');
  }
});

test('UI target validation binds the exact configured origin, not any allowlisted host', () => {
  const environment = { ...ENV, allowedHosts: ['127.0.0.1', 'api.synthetic.local'] };
  expect(() => validateUiUrl(environment, 'http://api.synthetic.local:7311/')).toThrow(/verified environment origin/);
  expect(validateUiUrl(environment, 'http://127.0.0.1:7311/')).toBe('http://127.0.0.1:7311/');
});

test('a disallowed NIGHTWATCH_UI_URL override refuses before a browser context exists', () => {
  // F-19. The override path is the same value a --ui-url flag publishes to the
  // child environment; a host outside the selected environment's allowlist
  // must refuse, and the refusal must happen before the browser is touched.
  const dev = loadEnvironmentConfig('dev');
  expect(() => validateUiUrl(dev, 'https://override.invalid/ripple/')).toThrow(/not in the allowlist/);
  expect(() => validateUiUrl(dev, 'https://app.alphaus.cloud/ripple/')).toThrow(/not in the allowlist/);
  const factory = fs.readFileSync(path.join(process.cwd(), 'src', 'browser', 'context.ts'), 'utf8');
  const validateAt = factory.indexOf('validateUiUrl(opts.env, opts.uiBaseUrl)');
  const newContextAt = factory.indexOf('browser.newContext');
  expect(validateAt, 'the factory must validate the UI URL').toBeGreaterThan(-1);
  expect(newContextAt, 'the factory must create the context in this module').toBeGreaterThan(-1);
  expect(validateAt, 'UI URL validation must precede any browser context creation').toBeLessThan(newContextAt);
});

// ---------------------------------------------------------------------------
// M11 task 12.1 (audit B-09) — the declared browser channel.
//
// The README used to document `npx playwright install chromium` as the
// fallback when system Chrome is unavailable. It was not: every tracked
// Playwright config hard-coded channel:'chrome', so the fallback required
// editing tracked files. The channel is now a declared, fail-closed-selected
// environment variable, selected before any browser exists.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Tracked source with comments blanked, so a comment can never satisfy a code assertion. */
function readCode(relativePath: string): string {
  const absolute = path.join(REPO_ROOT, relativePath);
  expect(fs.existsSync(absolute), `${relativePath} is tracked`).toBe(true);
  return fs.readFileSync(absolute, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function readText(relativePath: string): string {
  const absolute = path.join(REPO_ROOT, relativePath);
  expect(fs.existsSync(absolute), `${relativePath} is tracked`).toBe(true);
  return fs.readFileSync(absolute, 'utf8');
}

test.describe('the declared browser channel is selected fail-closed (M11 12.1, B-09)', () => {
  test('an unset environment selects the system Chrome default', () => {
    const resolution = resolveBrowserChannel({});
    expect(resolution.channel).toBe('chrome');
    expect(resolution.source).toBe('default');
    expect(DEFAULT_BROWSER_CHANNEL).toBe('chrome');
    expect(SUPPORTED_BROWSER_CHANNELS).toEqual(['chrome', 'chromium']);
  });

  test('the declared environment variable selects the chromium channel', () => {
    const resolution = resolveBrowserChannel({ [BROWSER_CHANNEL_ENV_VAR]: 'chromium' });
    expect(resolution.channel).toBe('chromium');
    expect(resolution.source).toBe('environment');
    const explicit = resolveBrowserChannel({ [BROWSER_CHANNEL_ENV_VAR]: 'chrome' });
    expect(explicit.channel).toBe('chrome');
    expect(explicit.source).toBe('environment');
  });

  test('an unsupported or empty channel value fails closed by name', () => {
    for (const value of ['msedge', 'CHROMIUM', 'Chromium', 'firefox', '', ' chrome']) {
      expect(() => resolveBrowserChannel({ [BROWSER_CHANNEL_ENV_VAR]: value }))
        .toThrow('BROWSER_CHANNEL_UNSUPPORTED');
      expect(isSupportedBrowserChannel(value)).toBe(false);
    }
  });

  test('the variable is declared in the environment-surface declaration', () => {
    // F-19 totality: hardening:check refuses a NIGHTWATCH_* read that has no
    // declaration. This pins the read site and the declaration together, so
    // renaming one without the other fails here first.
    const surface = JSON.parse(readText('config/environment-surface.v1.json')) as {
      schemaVersion: string;
      variables: Array<{ name: string; shape: { kind: string; values?: string[] }; default: string; secretBearing: boolean }>;
    };
    expect(surface.schemaVersion).toBe('nightwatch.environment-surface.v1');
    const entry = surface.variables.find((candidate) => candidate.name === BROWSER_CHANNEL_ENV_VAR);
    expect(entry, `${BROWSER_CHANNEL_ENV_VAR} is declared`).toBeDefined();
    expect(entry!.shape.kind).toBe('enum');
    expect(entry!.shape.values).toEqual(['chrome', 'chromium']);
    expect(entry!.default).toBe(DEFAULT_BROWSER_CHANNEL);
    expect(entry!.secretBearing).toBe(false);
  });

  test('no tracked Playwright config hard-codes the chrome channel any more', () => {
    // The documented fallback must work WITHOUT editing tracked files. The base
    // config resolves the channel from the environment through the shared
    // resolver, every other config inherits it by spreading the base config,
    // and no tracked config carries a literal that would defeat either.
    const configs = fs.readdirSync(REPO_ROOT).filter((name) => /^playwright[^/]*\.config\.ts$/.test(name));
    expect(configs.length).toBeGreaterThan(0);
    for (const name of configs.sort()) {
      const code = readCode(name);
      expect(code, `${name} does not hard-code channel: 'chrome'`).not.toContain("channel: 'chrome'");
    }
    const base = readText('playwright.config.ts');
    expect(readCode('playwright.config.ts')).toContain("from './src/browser/channel'");
    expect(base).toContain('channel: browserChannel.channel');
  });

  test('the direct capture runner honours the selection; the containment lane deliberately does not', () => {
    // The auth-capture lane launches a browser itself instead of letting
    // Playwright resolve it, so it must consult the resolver.
    const runner = readText('src/auth/directRunner.ts');
    expect(runner).toContain("from '../browser/channel'");
    expect(runner).toContain('resolveBrowserChannel(process.env).channel');
    // The L6 containment lane deliberately does NOT follow the operator's
    // channel: a containment proof must not change because an operator
    // selected a channel for their lanes, and the invariant `state === READY`
    // whenever bwrap is available must hold under every declared channel. It
    // keeps its own synthetic browser instrument, so it reads no channel value.
    const l6Code = readCode('src/core/oops/l6.ts');
    expect(l6Code, 'the containment lane reads no browser-channel variable')
      .not.toMatch(/BROWSER_CHANNEL_ENV_VAR|resolveBrowserChannel/);
  });

  test('every launcher that spawns a browser lane forwards the declared channel', () => {
    // The child environment is an explicit allowlist, so a launcher that does
    // not name the variable would silently substitute the default channel for
    // the operator's selection.
    for (const relativePath of [
      'bin/nightwatch.mjs',
      'bin/lib/shard-child-environment.mjs',
      'bin/campaign-synthetic.mjs',
    ]) {
      const code = readCode(relativePath);
      expect(code, `${relativePath} forwards the declared channel`).toMatch(/NIGHTWATCH_BROWSER_CHANNEL/);
    }
  });

  test('the chromium channel resolves the installed Playwright browser when present', () => {
    const environment: Record<string, string | undefined> = {
      PLAYWRIGHT_BROWSERS_PATH: path.join(path.sep, 'synthetic', 'ms-playwright'),
    };
    expect(playwrightBrowsersDirectory(environment)).toBe(path.join(path.sep, 'synthetic', 'ms-playwright'));
    // A missing install is an honest null: the lane reports unproven instead
    // of silently launching a different browser.
    expect(resolveBundledChromiumExecutable(environment)).toBeNull();
    const installed = resolveBrowserChannelExecutable('chromium');
    if (installed === null) {
      // Host capability, not a repository invariant: a host without the
      // Playwright-managed Chromium has none to resolve.
      expect(resolveBrowserChannelExecutable('chromium', { PLAYWRIGHT_BROWSERS_PATH: path.join(path.sep, 'absent') })).toBeNull();
      return;
    }
    const stat = fs.lstatSync(installed.executable);
    expect(stat.isFile()).toBe(true);
    expect(stat.isSymbolicLink()).toBe(false);
  });

  test('the chrome channel resolves the system Chrome when present', () => {
    const resolved = resolveBrowserChannelExecutable('chrome');
    if (resolved === null) {
      // Host capability: no system Chrome installed. The documented remedy is
      // the chromium channel, which is exactly what the env var selects.
      expect(resolveBrowserChannelExecutable('chrome', {})).toBeNull();
      return;
    }
    expect(path.basename(resolved.executable)).toMatch(/^(chrome|chromium|chromium-browser|google-chrome)$/);
  });
});
