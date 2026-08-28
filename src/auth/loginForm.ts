// ---------------------------------------------------------------------------
// Source-backed Ripple login controls.
//
// This module is deliberately limited to the two controls and submit action
// audited from the DEV Ripple login source. It is used only by the guarded
// authentication refresher; exploration and evidence code never imports it.
// ---------------------------------------------------------------------------

import type { Locator, Page } from '@playwright/test';
import type { DevLoginCredential } from './devCredentialProvider';

export interface SourceApprovedDevLoginControls {
  username: Locator;
  password: Locator;
  submit: Locator;
}

export function sourceApprovedDevLoginControls(page: Page): SourceApprovedDevLoginControls {
  return {
    username: page.locator('input[name="username"]'),
    password: page.locator('input[name="password"][type="password"]'),
    submit: page.locator('form button[type="submit"]'),
  };
}

/** Fill and submit exactly the source-backed DEV login form once. */
export async function fillAndSubmitSourceApprovedDevLogin(
  controls: SourceApprovedDevLoginControls,
  credential: DevLoginCredential,
): Promise<void> {
  await controls.username.fill(credential.username);
  await controls.password.fill(credential.password);
  // The locator is source-approved and the two preconditions keep this
  // bounded helper from submitting a hidden/disabled control. Current system
  // Chrome can keep this minimal synthetic button in a perpetual
  // actionability "stable" wait while its geometry is unchanged; force only
  // skips that renderer stability heuristic and does not broaden the locator.
  await controls.submit.waitFor({ state: 'visible', timeout: 10_000 });
  if (!(await controls.submit.isEnabled())) throw new Error('fail-closed: source-approved login submit control is disabled');
  await controls.submit.click({ timeout: 10_000, force: true });
}
