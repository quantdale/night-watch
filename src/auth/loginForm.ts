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
  await controls.submit.click({ timeout: 10_000 });
}
