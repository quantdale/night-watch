## Why

DEV login controls are approved before provider retrieval, but the old fill and
submit helper uses generic locators later. A navigation or DOM/form replacement
can therefore direct credentials to a different live document. This successor
adds a one-shot, non-secret binding and just-in-time revalidation.

## What Changes

- Capture exact page/frame/control/form identity and form action metadata.
- Revalidate before every secret-bearing effect.
- Revoke markers and fail categorically on drift/reuse.
- Add synthetic replacement/action/normal-path regressions.

## Capabilities

### New Capabilities

- `credential-use-binding-integrity`: Defines one-shot DEV credential-use
  authority over the exact live login document/form.

### Modified Capabilities

None.

## Impact

- Affected code: `src/auth/loginForm.ts`, `src/auth/devAutoLogin.ts`, and
  synthetic auth security tests.
- No real credential, target, or external authority.
