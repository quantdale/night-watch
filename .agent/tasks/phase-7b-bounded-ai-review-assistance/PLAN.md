# Phase 7B — Bounded Private AI Review Assistance Plan

## Purpose

Implement and validate a private, bounded AI review-assistance boundary over
Nightwatch's existing sanitized deterministic evidence. The model remains
untrusted review material and never becomes an authority over evidence,
execution, safety, privacy, scope, publication, or source.

## Starting State

- Starting local/remote SHA: `123ffbce31c4c2b09ddb91d8aa59b6ddc611c908`.
- Branch `main`, canonical private `origin`, clean and synchronized.
- Phase 6 `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 7 `COMPLETE`; Hardening I and I.1 `COMPLETE`.
- Existing upstream AI package: `nightwatch.ai-ready-evidence.private.v1`.

## Scope

This task includes strict runtime DTO validation, L2/L3 candidate eligibility,
synthetic and loopback-local provider containment, private companion artifacts,
non-executable oracle suggestions, owner review records, staleness detection,
offline hardening, and deterministic CI coverage.

## Non-Goals

Cloud model providers, real model downloads, real findings, campaign hooks,
automatic oracle adoption, product requests, Phase 6 operations, publication,
Git writes from AI, and Phase 8 self-development are excluded.

## Safety Constraints

No real Alphaus target, credential, database, infrastructure, browser, API,
customer data, or external model endpoint may be contacted. The deterministic
campaign and oracle catalogs remain independent of AI review.

## Architecture / Approach

Deterministic evidence is projected into one strict sanitized input DTO; an
optional synthetic or explicit loopback provider returns opaque bytes; exact
validators enforce schema, privacy, references, immutable facts, and bounded
authority; only an unreviewed owner-only companion artifact is persisted.

## Milestones

## Milestones

### M0 — Recovery, task routing, and threat-model freeze

Create native task artifacts, route `ACTIVE_TASK.md`, record the single-writer
check and exact starting SHA, and freeze the non-oracle/privacy threat model.

### M1 — Strict DTOs, gates, references, and private storage

Implement exact-key runtime validators, AI-ready compatibility validation,
L2/L3 eligibility, input privacy/safety/owner gates, immutable references,
versioned prompt identity, bounded budgets, and companion artifact storage.

### M2 — Synthetic provider and bug-draft pipeline

Implement provider-neutral interfaces, deterministic synthetic response modes,
opaque output parsing, strict bug-draft construction, response digest/error
classes, and synthetic valid/malformed/adversarial coverage.

### M3 — Structural change input and non-executable oracle suggestions

Build sanitized Phase 3 change DTOs, validate conceptual oracle suggestions,
ensure no generated suggestion can execute/register/write, and cover direct,
shared, transitive, unrelated, empty, unknown, and unsafe matrices.

### M4 — Owner review lifecycle and stale semantics

Implement deterministic human-review records, explicit status transitions,
artifact digest binding, self-approval rejection, stale/superseded detection,
and AI-labeled rendering metadata without customer-facing text.

### M5 — Loopback adapter and containment

Implement one fixed local loopback-only adapter with bounded request/response,
timeout, no redirects/proxy/auth/tools/fallback, then prove external/LAN/
credential-bearing/redirect/oversize/slow endpoints fail closed offline.

### M6 — Adversarial authority/privacy matrix

Exercise prompt injection, fake L3/root cause/deployment/source facts, tool/
shell/mutation/publication/Phase 6/Git requests, secret sentinels, malformed
and unknown outputs, and owner-policy adversarial classes.

### M7 — Isolation, hardening, CI, and full validation

Prove Phase 7 semantics are unchanged without AI, oracle catalogs are unchanged,
AI has no campaign/source/Git/publication path, extend offline hardening/CI,
run all acceptance checks, inspect privacy/diff, and checkpoint the result.

### M8 — Closure

Update task/project durable state and report, set `ACTIVE_TASK.md` complete,
commit/push validated checkpoints without private runtime output, verify
`HEAD == origin/main` and exact remote CI if readable, then stop before Phase 8.

## Validation rule

For every milestone: focused tests first, repair failures before advancing,
update `STATE.md` with exact results and next action, inspect the diff/privacy
surface before each durable checkpoint, and never run real campaign/auth/
journey/API/data/infrastructure/publication commands.

## Validation Strategy

Run focused Phase 7B Playwright tests, TypeScript, offline hardening, agent
state, deterministic synthetic campaign, full Playwright, privacy/diff checks,
and a clean-checkout validation. Never use real campaign/auth/journey/API,
database, infrastructure, or publication commands.

## Decision Log

- Reuse `nightwatch.ai-ready-evidence.private.v1`; do not create a competing
  deterministic evidence format.
- Keep AI artifacts as companion data over the existing owner-only atomic
  store; do not rewrite dossiers or campaign results.
- Permit only synthetic and explicit loopback-local providers; cloud fallback
  is prohibited.

## Discoveries

- The repository uses Playwright Test for unit and campaign fixtures; no second
  test runner is added.
- The existing private artifact store provides the required owner-only atomic
  persistence boundary.

## Deferred Work

- Any real local model canary is optional and synthetic-only; absence is not a
  blocker and no model may be downloaded.
- CLI/UI rendering remains intentionally small; private JSON/text artifacts
  and deterministic review records are sufficient.
- Actual oracle implementation, registry adoption, or Phase 8 self-development
  requires a separate explicitly approved task.

## Completion Criteria

All acceptance criteria in the frozen SPEC, the full deterministic validation
suite, hardening/CI checks, privacy and safety review, clean checkout, final
remote synchronization, and architecture/adversarial review must pass before
this task is marked complete.
