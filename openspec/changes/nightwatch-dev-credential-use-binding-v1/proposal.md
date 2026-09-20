## Why

Nightwatch retrieves the owner-only DEV credential only after policy/proxy checks and an approved page URL exposes one visible username/password/submit selector set. After retrieval, the helper fills those locators and force-clicks the button without revalidating the page generation, exact approved route, form ownership, submit/navigation target, or token-exchange binding at each secret-bearing side effect. The selectors are generic enough that the focused test intentionally accepts any synthetic page with matching controls. Navigation or DOM replacement between the precheck and fills can therefore deliver the credential to a different allowed page/form before the later token-exchange wait detects failure.

## What Changes

- Create a short-lived, single-use credential-use capability bound to the exact browser context/page/document/frame, approved login origin/route, selector/form structure, expected token exchange, proxy instance, and source proof.
- Revalidate that capability immediately before username fill, password fill, and submit; revoke it on navigation, frame/DOM replacement, popup, route/proxy/source drift, timeout, or first use.
- Prevent page-controlled input/submit listeners or form destination changes from receiving credentials outside the exact reviewed flow; fail before the first secret-bearing input when proof is unavailable.
- Keep credentials out of callbacks, errors, evidence, arguments, and retry state; zeroize and close on every failure.
- Add navigation/DOM/form-action/event-listener/token-exchange races, duplicate controls, and mutation/non-vacuity tests.

## Capabilities

### New Capabilities

- dev-credential-use-binding: Defines exact, fresh, one-shot credential-use authority and revocation for the guarded DEV login flow.

### Modified Capabilities

None.

## Impact

- Affects DEV credential provider consumers, login-form/source proof, auto-login/direct-runner sequencing, browser document identity, proxy/auth exchange binding, and auth security tests.
- Preserves the designated external owner-only credential store, DEV-only scope, MFA handoff, and zero product-state-mutation claim.
- No credential is read and no login is attempted by this planning change.
