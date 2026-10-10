## Context

`waitForLoginControls` checks the current URL and uniqueness/visibility of three generic locators, returns locator objects, and only then is the plaintext credential fetched. `fillAndSubmitSourceApprovedDevLogin` fills username/password and force-clicks without page/document/form revalidation. Token exchange and authenticated shell validation happen afterward. Outer host policy prevents external destinations but does not prove that the exact reviewed login document/form received the secret or prevent disclosure to another allowlisted page.

## Goals / Non-Goals

**Goals:** exact document/form/source/proxy binding; just-in-time revalidation; single-use/revocable authority; no secret-bearing event exposure beyond the reviewed mechanism; race and failure cleanup proof.

**Non-Goals:** changing the owner credential store, automating MFA, authorizing non-DEV login, recording credentials, or implementing now.

## Decisions

### Admission produces an opaque one-shot credential-use capability

Preflight returns no boolean declaration. It creates an opaque capability bound to environment, exact UI/auth origins and routes, browser context/page/main-frame/document generation, source-evidence identity, controls/form identity, expected credential submission/token exchange contract, and attested proxy/runtime generation. Callers cannot construct or serialize it.

### Secret use is atomic with revalidation

The capability owner performs username fill, password fill, and submit as one guarded operation. Immediately before every secret-bearing effect it verifies the same live document/frame/form/control identities and approved route. Navigation, history replacement, detached/replaced elements, new handlers/action targets, popup/frame transfer, proxy loss, source staleness, timeout, or prior use revokes the capability and aborts before further input.

### The submission mechanism is source proven

The implementation must prove how the reviewed page transfers credentials: native exact form action or an exact source-proven script/token-exchange path. Generic CSS selector presence is insufficient. Event listeners or dynamic action/target changes not in the proof are refusals. Secrets never enter a generic page-evaluation callback or evidence channel.

### Failures erase and close

The capability is non-retryable. Any partial-fill/failure closes or replaces the page/context according to a proven cleanup path, zeroizes mutable credential buffers, and records only categorical stage/revocation codes. A retry performs complete fresh preflight and credential retrieval.

## Risks / Trade-offs

- Playwright does not expose a single atomic multi-step DOM transaction; implementation may require a tightly scoped source-proven browser primitive and document-generation checks between effects.
- Framework event handlers can be dynamic. If their exact credential path cannot be proven, automatic login remains blocked and the human-led path is retained.
- Strong binding may require source-proof refresh whenever login implementation changes.

## Migration Plan

1. Derive exact login document/form/submission evidence and capability schema.
2. Implement non-constructible one-shot preflight and document generation tracking.
3. Move all secret use behind the guarded capability; remove exported generic helper authority.
4. Add race/revocation/cleanup/mutation tests and update auth safety truth.

## Open Questions

None. When exact submission proof is unavailable, automatic credential use must remain blocked.
