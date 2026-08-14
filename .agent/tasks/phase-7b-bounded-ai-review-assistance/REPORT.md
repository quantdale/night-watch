# Nightwatch Phase 7B — Bounded Private AI Review Assistance

Status: `COMPLETE`

## Checkpoint

- Starting local and remote SHA: `123ffbce31c4c2b09ddb91d8aa59b6ddc611c908`.
- Substantive validated implementation checkpoint:
  `34775913c122d2e8eed6a70072487e28c2eb02e0`.
- The final documentation checkpoint is a documentation-only descendant of
  that implementation checkpoint; the exact pushed SHA is recorded at the
  session handoff after push.
- Phase 6: `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 7: `COMPLETE`.
- Hardening Campaign I/I.1: `COMPLETE`.
- Phase 8: not started.

## Delivered boundary

Nightwatch remains the authority for deterministic evidence, evidence level,
severity, priority, source relevance, campaign state, safety, privacy, owner
scope, action catalogs, and oracle truth. The AI path is a one-way optional
review branch:

```text
deterministic evidence -> strict sanitized DTO -> synthetic or loopback-local
provider -> opaque output -> strict validator -> private unreviewed companion
artifact -> explicit owner review
```

The existing `nightwatch.ai-ready-evidence.private.v1` package is reused as
the upstream deterministic boundary. No raw evidence, authenticated state,
customer data, source dump, transcript, or real finding is persisted in Git.

## Versioned products

- Input: `nightwatch.ai-review-input.private.v1`.
- Bug draft: `nightwatch.ai-bug-draft.private.v1`.
- Oracle suggestion: `nightwatch.ai-oracle-suggestion.private.v1`.
- Human review: `nightwatch.ai-human-review.private.v1`.
- Prompt: `nightwatch.ai-review-prompt.private.v1`.
- Provider adapter: `nightwatch.ai-provider-adapter.private.v1`.

Bug-draft eligibility is L2/L3 only; L0, L1, and transient candidates are
rejected before provider invocation. Drafts are always
`AI_GENERATED_UNREVIEWED`, visibly labeled unverified, and require owner
review. Oracle approval can only mean
`APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW`; it never registers or executes
an oracle.

## Validation results

- Focused Phase 7B AI matrix: PASS (38 tests).
- Serial campaign/owner-scope/Phase 6 isolation companions: PASS (38 tests).
- Full Playwright suite: PASS (437/437).
- TypeScript typecheck: PASS.
- `npm run hardening:check`: PASS.
- `npm run campaign:synthetic`: PASS (27/27).
- `npm run agent:check`: PASS.
- `git diff --check`: PASS.
- Clean-checkout validation: PASS for install, typecheck, hardening, focused
  synthetic tests, and agent-state checks.
- Privacy and safety review: PASS; no real private data entered source,
  fixtures, artifacts, or task state.

Adversarial coverage includes prompt injection, fake L3 promotion, changed
evidence level, fake root cause/deployment/source facts, invented references,
tool/shell/mutation/publication/Git/Phase 6 requests, unknown fields, malformed
JSON, oversized output, timeout, unavailable provider, privacy sentinels,
staleness, self-approval, loopback escape, LAN/external endpoints, redirects,
and oracle isolation. All prohibited paths fail closed or remain inert data.

## Provider and budget policy

Only `SYNTHETIC_LOCAL` is required. `LOOPBACK_LOCAL` is optional and accepts
only an explicit localhost/127.0.0.1/::1 endpoint with fixed path, bounded
input/output, timeout, no redirects, proxy, credentials, tools, or fallback.
Cloud providers and external model access are prohibited. No model runtime
was installed, downloaded, or contacted; local runtime/canary status is
`NOT_AVAILABLE` / `NOT_RUN`.

The invocation maximum is 3 candidate reviews, 3 oracle suggestions, 64 KiB
input, 32 KiB output, 3 provider calls, 5 seconds per call, and 15 seconds
total runtime, with no automatic retry loop.

## Private storage and review

Validated runtime artifacts use the existing owner-only atomic private store
under the owner findings directory, outside Git. Incomplete writes cannot
become reviewable artifacts. Human decisions are separate digest-bound
records; approval never publishes, files an issue, changes a dossier, or
changes deterministic admission. Changed input digest, candidate fingerprint,
evidence level, dossier/source snapshot, or schema makes an old artifact
stale/superseded.

## Isolation and vectors

Phase 7 runs identically without an AI provider; campaign result, manifest,
candidate admission, budget, headline, and evidence level are unchanged.
Oracle catalogs remain unchanged by suggestions. AI has no import or callback
path to campaign authority, oracle registration, safe actions, browser/API,
Phase 6, credentials, shell, Git, source writes, or publication.

Safety vector: DEV contacts 0; NEXT contacts 0; production attempts 0;
product mutations 0; database queries 0; infrastructure queries 0; external
publication attempts 0; external AI calls 0; AI tool executions 0; AI source
modifications 0. Privacy vector: zero persisted real credentials, tokens,
cookies, storage state, customer identities, account identifiers, financial
values, raw bodies, DOM, screenshots, or authenticated traces.

## CI and remaining debt

The private read-only workflow uses only repository-local synthetic/loopback
fixtures, no AI credentials, no model service, no artifact upload, and
`contents: read`. Exact remote CI status for the final documentation-only
descendant is checked after push when read access is available; otherwise it
must be reported as `REMOTE_CI_VERIFICATION_REQUIRED`.

Remaining debt is intentionally deferred: an optional owner-controlled local
model canary, a small owner review CLI, and any actual deterministic oracle
implementation. None is required for this bounded architecture, and Phase 8
self-development remains unstarted.

Recommended next task: none in this session. If the owner wants follow-up,
create a separate explicit task for the review CLI or synthetic-only local
model canary; do not start Phase 8 here.
