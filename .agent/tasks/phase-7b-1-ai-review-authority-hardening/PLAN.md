# Phase 7B.1 — AI Review Authority Hardening Plan

## Purpose

Close the two independently confirmed Phase 7B integrity gaps: the exported
low-level provider path could bypass the session budget, and owner-looking
artifact status could be accepted without digest-bound owner provenance. Fix
the provider-call accounting defect at the same boundary.

## Starting State

- Canonical root: `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Branch: `main`; private `origin`; clean and synchronized at
  `a4f9ba7a761af233f1143d89d95ffa335d15fed7`.
- Phase 6: `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 7, Hardening I/I.1, and historical Phase 7B: `COMPLETE`.
- Phase 8: `NOT_STARTED`.

## Scope

- One `AiReviewSession` budget authority for synthetic and loopback-local
  provider exposure.
- Synchronous attempt and shared provider-call reservations with deterministic
  error accounting and concurrency regressions.
- v2 immutable generated-artifact semantics, separate owner-only review
  records, digest binding, effective-state projection, freshness, and legacy
  v1 read compatibility.
- Static call-graph/export checks, focused adversarial fixtures, documentation,
  full local validation, isolated checkout validation, and private GitHub
  checkpointing.

## Non-Goals

- No owner review CLI, real model, cloud provider, campaign hook, retry loop,
  Phase 8 capability, product traffic, authentication capture, data-layer or
  infrastructure operation, publication, or Alphaus-repository write.

## Safety Constraints

- Synthetic and loopback fixture traffic only; no external AI or product
  network.
- Existing local-provider, owner-scope, private-storage, exact-key DTO, and
  zero-AI-authority boundaries remain mandatory.
- No credentials, customer values, findings, authenticated state, raw bodies,
  prompts, responses, or runtime artifacts enter Git or task state.
- Never force-push; stop if `origin/main` advances unexpectedly.

## Architecture / Approach

```text
explicit owner request
  -> AiReviewSession attempt reservation and deadline
  -> strict input/local-provider validation
  -> synchronous shared provider-call reservation
  -> private registered provider handler
  -> bounded output and reference/privacy validation
  -> immutable v2 AI artifact
  -> optional owner-only atomic storage

immutable artifact + exact owner review record + current deterministic input
  -> validated effective review projection
```

Raw provider execution functions are module-private. Provider adapters expose
metadata only and register behavior behind the session's private boundary.
Owner approval is a companion record, never a mutable artifact status.

## Milestones

### M0 — Recovery, task routing, and defect reconfirmation — COMPLETE

Created this task, routed `ACTIVE_TASK.md`, verified the canonical Git state,
read the durable Phase 7B handoff, and recorded exact source evidence for both
gaps and the pre-validation `providerCalls` increment.

### M1 — One structural invocation authority — COMPLETE

`AiReviewSession` is the only supported provider-execution API. The public
index and direct pipeline module no longer expose raw review functions; the
static check rejects extra provider paths and automatic session creation.

### M2 — Accurate bounded accounting and concurrency — COMPLETE

Attempt counters reserve synchronously, provider calls reserve immediately
before handler entry, the mixed bug/oracle cap is shared, failures/storage
errors consume exposure, and pending synthetic requests prove no fourth call.

### M3 — Immutable artifact and companion review provenance — COMPLETE

Generated artifacts use v2 unreviewed-only schemas. Exact-key v2 owner records
bind review identity and artifact digest. Storage separates both records and
projection derives approval/rejection/supersede/freshness state.

### M4 — Forgery, corruption, and renderer regressions — COMPLETE

Forged statuses, missing/mismatched/modified records, stale inputs, legacy v1
status, owner rejection/supersede, model self-approval, private corruption,
and oracle/catalog isolation are covered by deterministic tests.

### M5 — Static hardening and call-graph checks — COMPLETE

`npm run hardening:check` protects the public export surface, canonical
provider boundary, non-AI import surface, local provider allowlist, private
storage, campaign isolation, and loopback containment.

### M6 — Full local and isolated validation — COMPLETE

Focused 7B/7B.1 tests, typecheck, hardening, synthetic campaign, full
Playwright suite, agent-state, privacy review, and diff-whitespace validation
pass. The isolated clean checkout is the remaining validation item.

### M7 — Durable closure and remote verification — IN_PROGRESS

Commit and push a validated implementation checkpoint, complete project/task
documentation without rewriting historical Phase 7B evidence, push the final
 documentation checkpoint, repair continuity state, verify synchronized origin,
 and read the exact final workflow result if safely available.

## Validation Strategy

Run focused AI/loopback tests first, then typecheck, hardening, synthetic
campaign, full Playwright, `agent:check`, privacy/secret scan, `git diff
--check`, manual diff review, and a clean isolated checkout using only
synthetic/local fixtures. Validate each pushed checkpoint with fetch and
`HEAD == origin/main`.

## Decision Log

- Attempt maxima remain owner-request maxima; `providerCalls` means actual
  provider-boundary exposure only.
- One terminal owner decision is allowed for an exact artifact; conflicting
  records fail closed. `SUPERSEDE` is distinct from input-driven `STALE`.
- v2 is required because v1 mutable-status semantics cannot remain current
  approval authority. v1 is read-compatible only with explicit validated
  companion provenance.

## Discoveries

- The starting pipeline exported `reviewBugCandidate` and `suggestOracle`,
  and the index re-exported them.
- The starting session incremented `providerCalls` before input/provider
  validation.
- Historical v1 human-review storage was a flat private-store envelope; the
  reader now recognizes that shape without trusting its status field.

## Deferred Work

No owner review CLI, local model canary, cloud provider, oracle registration,
campaign AI hook, or Phase 8 work is authorized by this task.

## Completion Criteria

All 7B.1 acceptance invariants pass locally; the implementation and closure
documentation are committed and pushed to `origin/main`; local and remote
heads match; privacy/safety vectors remain zero; historical Phase 7B remains
complete; Phase 8 remains unstarted; and exact remote CI is reported only from
readable evidence.
