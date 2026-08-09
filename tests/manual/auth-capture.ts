import { test } from '@playwright/test';
import { selectEnvironment } from '../../src/core/environment';
import { createNightwatchContext } from '../../src/browser/context';
import { validateStorageStateFile, validateStorageStateOutputPath } from '../../src/browser/fixtures/storageState';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';

test('manual authenticated state capture', async ({ browser }) => {
  if (process.env.NIGHTWATCH_MANUAL_CAPTURE !== '1') {
    throw new Error('manual auth capture is not enabled');
  }
  if (process.env.NIGHTWATCH_STORAGE_STATE?.trim()) {
    throw new Error('manual auth capture refuses to use an existing storage state');
  }
  const environment = selectEnvironment(process.env.NIGHTWATCH_ENV);
  const output = validateStorageStateOutputPath(process.env.NIGHTWATCH_CAPTURE_OUTPUT ?? '');
  const uiUrl = process.env.NIGHTWATCH_UI_URL?.trim() || environment.uiBaseUrl;
  if (!process.stdin.isTTY) {
    throw new Error('USER_ACTION_REQUIRED: run auth:capture from an interactive terminal so the human can complete login/MFA');
  }
  const configured = new URL(environment.uiBaseUrl);
  const selected = new URL(uiUrl);
  if (
    selected.protocol !== 'https:' ||
    selected.hostname.toLowerCase() !== configured.hostname.toLowerCase() ||
    selected.port !== configured.port ||
    selected.search !== '' ||
    selected.hash !== ''
  ) {
    throw new Error('fail-closed: manual capture UI URL must be the verified HTTPS Ripple UI host without query or fragment');
  }
  const recorder = new RunRecorder({
    runId: createRunId(),
    environment: environment.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: 'manual-auth-capture',
    authenticated: true,
  });
  const ctx = await createNightwatchContext(browser, {
    env: environment,
    recorder,
    uiBaseUrl: uiUrl,
    trace: 'off',
  });
  try {
    await ctx.page.goto(uiUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    console.log('[auth:capture] Browser is on the approved Ripple target. Complete login/MFA manually, then press ENTER here. No credential values are read or printed by Nightwatch.');
    await new Promise<void>((resolve) => {
      process.stdin.resume();
      process.stdin.once('data', () => resolve());
    });
    await ctx.context.storageState({ path: output });
    validateStorageStateFile(output);
    console.log('[auth:capture] Storage state captured and structurally validated at the user-selected external path. Secret values were not printed.');
  } finally {
    await ctx.close();
  }
});
