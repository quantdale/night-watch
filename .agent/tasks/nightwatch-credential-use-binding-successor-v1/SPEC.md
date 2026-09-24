# Credential-use binding successor v1

## Task purpose

Close the reproduced DEV credential-use race: login controls are approved before
provider retrieval, but later fill/submit effects are not rebound to the exact
live document/form. A navigation or DOM/form replacement can therefore receive
credentials after the original preflight.

## Established starting state

- Task ID: `nightwatch-credential-use-binding-successor-v1`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Starting SHA: `d5175a7d676cbff5584b887363ceaa1d7d7b879f`
- Session branch: `session/nightwatch-successor-campaign-en-628d8bb9`
- Prior child work: shard/census/run-evidence/proxy children are preserved as
  BLOCKED/deferred with classified broad-gate residuals.
- Reproduction: `waitForLoginControls` approves generic locators; the old fill
  helper uses them after provider retrieval without live document/form identity.
- No credential file, real target, or authenticated run is authorized.

## Required deliverables

- Opaque one-shot DOM/form binding created before provider retrieval.
- Revalidation immediately before username fill, password fill, and submit.
- Fail-closed stale/ambiguous/route/form-action errors with categorical codes.
- Synthetic replacement, action drift, navigation, and normal-path tests.
- No secret in DOM markers, callbacks, errors, evidence, or retry state.

## Explicit non-goals

No credential-provider replacement, real login, MFA automation, product/runtime
authority, or complete proof for arbitrary dynamic JavaScript listeners.

## Safety constraints

Synthetic local fixture only; use sentinel credentials; preserve DEV-only
owner-policy and no-real-target boundaries.

## Declared Deletions

None.

## Acceptance criteria

- A replaced document/form or changed action refuses before further secret
  effect.
- A normal synthetic form still fills/submits exactly once.
- Binding markers contain no credential and are revoked on every path.
- Focused tests, typecheck, hardening, and milestone validation are recorded.
- Remaining dynamic-listener/retry limitations are explicit, not hidden.
