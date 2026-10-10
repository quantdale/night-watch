## Context

`waitForLoginControls` proves generic locators are visible, then provider
credentials are retrieved and the old helper fills/submits without a live DOM
identity check. The fix must bind effects without putting secrets in callbacks,
markers, errors, or evidence.

## Goals / Non-Goals

**Goals:** one-shot binding, non-cloneable identity, form metadata checks,
per-effect revalidation, categorical stale failure, synthetic proof.

**Non-Goals:** real auth, MFA, arbitrary listener proof, or provider changes.

## Decisions

### Use a non-secret marker plus JS identity

A random DOM attribute alone is cloneable. Set a non-cloneable expando on the
exact elements/form and verify it at every effect boundary; this does not contain
or derive from a credential.

### Revalidate before each effect and revoke always

Check page/frame/URL, unique visible controls, expando identity, and form
action/method/target before username, password, and submit. Revoke attributes
and expando in `finally`/error paths.

### Map drift to a safe category

Return `AUTH_FORM_BINDING_STALE`; diagnostics contain no page text, URL
parameters, or credential values.

## Risks / Trade-offs

Dynamic event listeners that do not mutate DOM remain a residual and require
source-proof or browser-level instrumentation. The binding may conservatively
reject benign UI rerenders.

## Migration Plan

1. Add synthetic replacement/action tests.
2. Implement binding and caller integration.
3. Run mutation/static/focused checks and broad gates.
4. Record residual listener/retry limitations.

## Open Questions

None.
