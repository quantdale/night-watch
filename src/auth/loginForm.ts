// ---------------------------------------------------------------------------
// Source-backed Ripple login controls.
//
// The credential-bearing path uses a one-shot DOM binding. It is created
// before provider retrieval, revalidated immediately before each secret-
// bearing effect, and revoked on every exit. No credential is passed into a
// page callback, DOM marker, error, or evidence channel.
// ---------------------------------------------------------------------------

import { randomBytes } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import type { DevLoginCredential } from './devCredentialProvider';

const BINDING_ATTRIBUTE = 'data-nightwatch-login-binding';
const USERNAME_SELECTOR = 'input[name="username"]';
const PASSWORD_SELECTOR = 'input[name="password"][type="password"]';
const SUBMIT_SELECTOR = 'form button[type="submit"]';

export interface SourceApprovedDevLoginControls {
  username: Locator;
  password: Locator;
  submit: Locator;
}

interface FormSnapshot {
  readonly action: string;
  readonly method: string;
  readonly target: string;
}

export interface SourceApprovedDevLoginBinding {
  readonly page: Page;
  readonly controls: SourceApprovedDevLoginControls;
  assertCurrent(): Promise<void>;
  revoke(): Promise<void>;
}

export function sourceApprovedDevLoginControls(page: Page): SourceApprovedDevLoginControls {
  return {
    username: page.locator(USERNAME_SELECTOR),
    password: page.locator(PASSWORD_SELECTOR),
    submit: page.locator(SUBMIT_SELECTOR),
  };
}

function stale(): never {
  throw new Error('AUTH_FORM_BINDING_STALE');
}

async function visibleUnique(locator: Locator, timeout = 10_000): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    return (await locator.count()) === 1 && await locator.first().isVisible();
  } catch {
    return false;
  }
}

export async function createSourceApprovedDevLoginBinding(
  page: Page,
  controls: SourceApprovedDevLoginControls,
): Promise<SourceApprovedDevLoginBinding> {
  if (page.isClosed() || !(await visibleUnique(controls.username)) || !(await visibleUnique(controls.password)) || !(await visibleUnique(controls.submit))) {
    throw new Error('AUTH_FORM_BINDING_STALE');
  }
  const frame = page.mainFrame();
  const initialUrl = page.url();
  const marker = randomBytes(16).toString('hex');
  const snapshot = await controls.submit.evaluate((element) => {
    const form = element.form;
    return form === null ? null : {
      action: form.action,
      method: form.method,
      target: form.target,
    };
  });
  if (snapshot === null) stale();
  await controls.username.evaluate((element, value) => {
    element.setAttribute('data-nightwatch-login-binding', value);
    Object.defineProperty(element, '__nightwatchLoginBinding', { value, configurable: true });
  }, marker);
  await controls.password.evaluate((element, value) => {
    element.setAttribute('data-nightwatch-login-binding', value);
    Object.defineProperty(element, '__nightwatchLoginBinding', { value, configurable: true });
  }, marker);
  await controls.submit.evaluate((element, value) => {
    element.setAttribute('data-nightwatch-login-binding', value);
    Object.defineProperty(element, '__nightwatchLoginBinding', { value, configurable: true });
    if (element.form !== null) {
      element.form.setAttribute('data-nightwatch-login-binding', value);
      Object.defineProperty(element.form, '__nightwatchLoginBinding', { value, configurable: true });
    }
  }, marker);
  let used = false;
  let revoked = false;

  const assertCurrent = async (): Promise<void> => {
    if (used || revoked || page.isClosed() || page.mainFrame() !== frame || page.url() !== initialUrl) stale();
    const state = await page.evaluate(({ marker, expected }) => {
      const dom = globalThis as unknown as {
        document: {
          querySelector(selector: string): any;
          querySelectorAll(selector: string): any[];
        };
        getComputedStyle(element: any): { display: string; visibility: string };
      };
      const username = dom.document.querySelector('input[name="username"]');
      const password = dom.document.querySelector('input[name="password"][type="password"]');
      const submit = dom.document.querySelector('form button[type="submit"]');
      const form = submit?.form ?? null;
      const marked = (element: any): boolean => element !== null && element.__nightwatchLoginBinding === marker;
      const visible = (element: any): boolean => {
        if (element === null) return false;
        const rect = element.getBoundingClientRect();
        const style = dom.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      return {
        valid: username !== null && password !== null && submit !== null && form !== null
          && marked(username) && marked(password) && marked(submit) && marked(form)
          && visible(username) && visible(password) && visible(submit)
          && form.action === expected.action && form.method === expected.method && form.target === expected.target,
        unique: dom.document.querySelectorAll('input[name="username"]').length === 1
          && dom.document.querySelectorAll('input[name="password"][type="password"]').length === 1
          && dom.document.querySelectorAll('form button[type="submit"]').length === 1,
      };
    }, { marker, expected: snapshot });
    if (!state.valid || !state.unique) stale();
  };

  const revoke = async (): Promise<void> => {
    if (revoked) return;
    revoked = true;
    if (page.isClosed()) return;
    try {
      await page.evaluate(({ marker }) => {
        const dom = globalThis as unknown as { document: { querySelectorAll(selector: string): any[] } };
        for (const element of dom.document.querySelectorAll(`[data-nightwatch-login-binding="${marker}"]`)) {
          element.removeAttribute('data-nightwatch-login-binding');
          try { delete element.__nightwatchLoginBinding; } catch { /* already detached */ }
        }
      }, { marker });
    } catch {
      // A navigation/replacement already invalidated the binding.
    }
  };

  try {
    await assertCurrent();
  } catch (error) {
    await revoke();
    throw error;
  }
  return { page, controls, assertCurrent, revoke };
}

/** Fill and submit exactly the source-backed DEV login form once. */
export async function fillAndSubmitSourceApprovedDevLogin(
  binding: SourceApprovedDevLoginBinding,
  credential: DevLoginCredential,
): Promise<void> {
  try {
    await binding.assertCurrent();
    await binding.controls.username.fill(credential.username);
    await binding.assertCurrent();
    await binding.controls.password.fill(credential.password);
    await binding.assertCurrent();
    await binding.controls.submit.waitFor({ state: 'visible', timeout: 10_000 });
    if (!(await binding.controls.submit.isEnabled())) throw new Error('AUTH_FORM_BINDING_STALE');
    await binding.controls.submit.click({ timeout: 10_000, force: true });
    await binding.revoke();
  } catch (error) {
    await binding.revoke();
    throw error;
  }
}
