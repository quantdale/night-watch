// Synthetic browser and ordering checks for the guarded DEV login path.

import { test, expect } from '@playwright/test';
import type { Browser } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import { selectEnvironment } from '../../src/core/environment';
import { fillAndSubmitSourceApprovedDevLogin, sourceApprovedDevLoginControls } from '../../src/auth/loginForm';
import { isApprovedDevAuthTokenExchange, runDevAuthRefresh } from '../../src/auth/devAutoLogin';
import {
  CHROME_DEVTOOLS_MCP_TOOL_COUNT,
  CHROME_DEVTOOLS_MCP_TOOLS,
  MCP_PROHIBITED_AUTHENTICATED_REAL_TOOLS,
  MCP_SECRET_INPUT_ALLOWED,
  MCP_REAL_BROWSER_DISABLED_BY_SAFETY,
  decideMcpAttachment,
  mcpDiscoveryIsConsistent,
} from '../../src/mcp/chromeDevtoolsPolicy';

const SYNTHETIC_PASSWORD = 'SYNTHETIC_LOGIN_SENTINEL_8c4e7a1d2f9b6c0e';

test('source-approved login helper fills the synthetic form once without evidence plumbing', async ({ page }) => {
  const server = await startFixtureServer('auth');
  try {
    await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await fillAndSubmitSourceApprovedDevLogin(sourceApprovedDevLoginControls(page), {
      username: 'synthetic-dev-user',
      password: SYNTHETIC_PASSWORD,
    });
    await expect(page).toHaveURL(`${server.origin}/synthetic-authenticated`);
  } finally {
    await server.close();
  }
});

test('non-DEV target is rejected before the credential provider is consulted', async () => {
  const environment = selectEnvironment('dev');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-dev-auth-order-'));
  const output = path.join(directory, 'state.json');
  let retrievals = 0;
  try {
    await expect(runDevAuthRefresh({
      browser: {} as Browser,
      environment,
      uiUrl: 'https://app.alphaus.cloud/ripple/',
      storageStatePath: output,
      provider: {
        providerType: 'external-owner-only-file',
        environment: 'dev',
        accountAlias: 'ripple-dev-designated-account',
        storageClass: 'external-owner-only-secret-file',
        getDevLoginCredential: () => {
          retrievals += 1;
          return { username: 'synthetic-dev-user', password: SYNTHETIC_PASSWORD };
        },
        inspect: () => ({
          configured: true,
          providerType: 'external-owner-only-file',
          environment: 'dev',
          accountAlias: 'ripple-dev-designated-account',
          storageClass: 'external-owner-only-secret-file',
          storagePermissionsValid: true,
        }),
      },
    })).rejects.toMatchObject({ code: 'AUTO_LOGIN_DEV_ONLY' });
    expect(retrievals).toBe(0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('DEV auth response gate accepts only the source-backed allowlisted token exchange', () => {
  const environment = selectEnvironment('dev');
  const target = new URL(environment.uiBaseUrl);
  expect(isApprovedDevAuthTokenExchange(environment, target, 'https://logindev.alphaus.cloud/ripple/access_token')).toBe(true);
  expect(isApprovedDevAuthTokenExchange(environment, target, 'https://appdev.alphaus.cloud/ripple/access_token')).toBe(false);
  expect(isApprovedDevAuthTokenExchange(environment, target, 'https://logindev.alphaus.cloud/ripple/access_token?redirect=unexpected')).toBe(false);
  expect(isApprovedDevAuthTokenExchange(environment, target, 'https://login.alphaus.cloud/ripple/access_token')).toBe(false);
});

test('MCP discovery is fixed and real authenticated attachment stays disabled by default policy', () => {
  expect(CHROME_DEVTOOLS_MCP_TOOLS).toHaveLength(CHROME_DEVTOOLS_MCP_TOOL_COUNT);
  expect(mcpDiscoveryIsConsistent()).toBe(true);
  expect(MCP_SECRET_INPUT_ALLOWED).toBe(false);
  expect(MCP_PROHIBITED_AUTHENTICATED_REAL_TOOLS).toEqual(expect.arrayContaining(['fill', 'fill_form', 'type_text', 'take_screenshot', 'take_heapsnapshot', 'take_snapshot']));
  const decision = decideMcpAttachment({
    dedicatedNightwatchProfile: false,
    loopbackOnly: false,
    nightwatchOwnsBrowserLifecycle: false,
    mandatoryProxyActive: true,
    productionDenyActive: true,
    unknownHostContainmentActive: true,
    websocketContainmentActive: true,
    authenticatedPrivacyPolicyActive: true,
    primaryExecutorRemainsNightwatch: true,
  });
  expect(decision).toEqual({
    attached: false,
    containmentProven: false,
    status: 'CHROME_DEVTOOLS_MCP_AVAILABLE_BUT_NOT_ATTACHED',
    reason: MCP_REAL_BROWSER_DISABLED_BY_SAFETY,
    credentialInputAllowed: false,
  });
});
