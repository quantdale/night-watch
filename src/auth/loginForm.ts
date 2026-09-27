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
  /** The exchange the submit control will actually issue (R2-34). */
  readonly submitAction: string;
  readonly submitMethod: string;
}

/**
 * M8 (9.2 / NW-AUD-021 R2-07): the elements the LAST successful verification
 * saw, pinned as handles. An effect issued through these acts on the verified
 * element IDENTITY, never on a fresh locator resolution — so a swap between
 * the check and the act detaches the handle and fails closed instead of
 * redirecting the secret.
 */
export interface PinnedElement {
  fill(value: string): Promise<void>;
  click(options?: { readonly timeout?: number; readonly force?: boolean }): Promise<void>;
  isEnabled(): Promise<boolean>;
  waitForElementState(state: 'visible', options?: { readonly timeout?: number }): Promise<void>;
  dispose(): Promise<void>;
}

export interface SourceApprovedDevLoginPins {
  readonly username: PinnedElement;
  readonly password: PinnedElement;
  readonly submit: PinnedElement;
}

export interface SourceApprovedDevLoginBinding {
  readonly page: Page;
  readonly controls: SourceApprovedDevLoginControls;
  assertCurrent(): Promise<void>;
  /** Verify and return the pinned handles in the SAME round trip. */
  pinVerified(): Promise<SourceApprovedDevLoginPins>;
  /** True once a secret-bearing effect sequence has started. */
  readonly used: boolean;
  /**
   * Start the ONE effect sequence this binding permits (9.2: `used` is set on
   * the first effect). A second sequence, or a sequence after revocation,
   * fails closed.
   */
  beginEffectSequence(): Promise<SourceApprovedDevLoginPins>;
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

export interface SourceApprovedDevLoginBindingInput {
  /**
   * R2-34 proxy-instance binding: when supplied, the page must echo exactly
   * this instance identity (`globalThis.__nightwatchProxyInstance`) before any
   * effect, so a secret can never be typed into a document served through a
   * different proxy instance.
   */
  readonly expectedProxyInstanceId?: string | undefined;
}

export async function createSourceApprovedDevLoginBinding(
  page: Page,
  controls: SourceApprovedDevLoginControls,
  input: SourceApprovedDevLoginBindingInput = {},
): Promise<SourceApprovedDevLoginBinding> {
  const expectedProxyInstanceId = input.expectedProxyInstanceId?.trim() ?? '';
  if (page.isClosed() || !(await visibleUnique(controls.username)) || !(await visibleUnique(controls.password)) || !(await visibleUnique(controls.submit))) {
    throw new Error('AUTH_FORM_BINDING_STALE');
  }
  const frame = page.mainFrame();
  const initialUrl = page.url();
  const marker = randomBytes(16).toString('hex');
  const snapshot = await controls.submit.evaluate((element) => {
    const form = element.form;
    if (form === null) return null;
    return {
      action: form.action,
      method: form.method,
      target: form.target,
      // R2-34: the SOURCE-APPROVED exchange is bound explicitly — a control
      // whose own formAction/formMethod disagrees with its form is refused.
      submitAction: (element as unknown as { formAction?: string }).formAction ?? form.action,
      submitMethod: (element as unknown as { formMethod?: string }).formMethod ?? form.method,
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
    // `used` is deliberately NOT a revocation term: a one-shot flow issues
    // several effects and must keep verifying between them. It gates the START
    // of a NEW sequence (beginEffectSequence) instead.
    if (revoked || page.isClosed() || page.mainFrame() !== frame || page.url() !== initialUrl) stale();
    if (expectedProxyInstanceId !== '') {
      const observed = await page.evaluate(() => {
        const dom = globalThis as unknown as { __nightwatchProxyInstance?: unknown };
        return typeof dom.__nightwatchProxyInstance === 'string' ? dom.__nightwatchProxyInstance : null;
      });
      if (observed !== expectedProxyInstanceId) stale();
    }
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
          && form.action === expected.action && form.method === expected.method && form.target === expected.target
          && (submit as unknown as { formAction?: string }).formAction === expected.submitAction
          && (submit as unknown as { formMethod?: string }).formMethod === expected.submitMethod,
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

  /**
   * Verify, then return handles to the very elements the verification saw. One
   * round trip per element: `evaluateHandle` pins the element identity, so a
   * swap after the check detaches the handle instead of redirecting the fill
   * (NW-AUD-021 R2-07 — the check-then-act race).
   */
  const pinVerified = async (): Promise<SourceApprovedDevLoginPins> => {
    await assertCurrent();
    const pin = async (selector: string): Promise<PinnedElement> => {
      const handle = await page.evaluateHandle(({ marker, selector: target }) => {
        const dom = globalThis as unknown as { document: { querySelector(selector: string): any } };
        const element = dom.document.querySelector(target);
        return element !== null && element.__nightwatchLoginBinding === marker ? element : null;
      }, { marker, selector });
      const element = handle.asElement();
      if (element === null) {
        await handle.dispose();
        stale();
      }
      return element as unknown as PinnedElement;
    };
    const username = await pin(USERNAME_SELECTOR);
    const password = await pin(PASSWORD_SELECTOR);
    const submit = await pin(SUBMIT_SELECTOR);
    await assertCurrent();
    return { username, password, submit };
  };

  try {
    await assertCurrent();
  } catch (error) {
    await revoke();
    throw error;
  }
  const beginEffectSequence = async (): Promise<SourceApprovedDevLoginPins> => {
    if (used) stale();
    used = true;
    return pinVerified();
  };

  return { page, controls, assertCurrent, pinVerified, beginEffectSequence, get used() { return used; }, revoke };
}

/** Fill and submit exactly the source-backed DEV login form once. */
export async function fillAndSubmitSourceApprovedDevLogin(
  binding: SourceApprovedDevLoginBinding,
  credential: DevLoginCredential,
): Promise<void> {
  let pins: SourceApprovedDevLoginPins | null = null;
  try {
    // Verify and pin in one step: every effect below acts on the VERIFIED
    // element identity, never on a fresh locator resolution.
    pins = await binding.beginEffectSequence();
    await pins.username.fill(credential.username);
    await binding.assertCurrent();
    pins = await binding.pinVerified();
    await pins.password.fill(credential.password);
    await binding.assertCurrent();
    pins = await binding.pinVerified();
    await pins.submit.waitForElementState('visible', { timeout: 10_000 });
    if (!(await pins.submit.isEnabled())) throw new Error('AUTH_FORM_BINDING_STALE');
    await pins.submit.click({ timeout: 10_000, force: true });
    await binding.revoke();
  } catch (error) {
    await binding.revoke();
    throw error;
  } finally {
    for (const pin of [pins?.username, pins?.password, pins?.submit]) {
      if (pin !== undefined) await pin.dispose().catch(() => undefined);
    }
  }
}
