# Credential-use binding successor v1

## Purpose

Bind the credential-bearing login effects to one exact live document/form and
fail closed when that identity changes.

## Starting State

- Task ID: `nightwatch-credential-use-binding-successor-v1`
- Starting SHA: `d5175a7d676cbff5584b887363ceaa1d7d7b879f`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Source: `src/auth/devAutoLogin.ts`, `src/auth/loginForm.ts`, and synthetic
  `tests/unit/devLoginSecurity.test.ts`.
- Reproduction: generic locators survive document/form replacement after
  preflight.
- Dependencies: existing DEV safety preflight, source-backed selectors, and
  Playwright synthetic fixture.

## Scope

One-shot non-secret DOM identity binding, per-effect revalidation, categorical
failure mapping, and synthetic race tests.

## Non-Goals

No real credential/provider access, MFA, target, or arbitrary listener
complete proof.

## Safety Constraints

Local synthetic sentinel values only; no secret-bearing callback/DOM/evidence
surface; preserve current preflight and external storage-state rules.

## Architecture / Approach

Create a binding after approved controls are visible and before provider
retrieval. Mark the exact username/password/submit/form with a random non-secret
token and a non-cloneable JS identity property; capture URL/frame and form
action/method/target. Revalidate before each effect and revoke markers in every
exit. Map stale binding to a dedicated DevAuthFailure code.

## Milestones

### M1 — Reproduction and contract

- Objective: reproduce post-preflight replacement/action drift.
- Files/areas: auth security tests and source.
- Implementation actions: add failing synthetic race tests.
- Acceptance criteria: current generic helper fails the new assertions.
- Validation commands: focused dev-login suite.
- Status: COMPLETE

### M2 — Binding implementation

- Objective: implement one-shot binding and caller integration.
- Files/areas: `loginForm.ts`, `devAutoLogin.ts`, tests.
- Implementation actions: marker/identity capture, revalidation, error mapping.
- Acceptance criteria: normal and stale paths behave deterministically.
- Validation commands: focused suite, typecheck, hardening.
- **Status:** COMPLETE

### M3 — Adversarial validation and checkpoint

- Objective: mutation-test binding guards and run milestone lanes.
- Files/areas: tests/state/OpenSpec.
- Implementation actions: remove marker/action/revalidation guards in disposable
  mutations; classify broad source-intelligence residual.
- Acceptance criteria: mutations detected; no secret leakage.
- Validation commands: `gate:dev`, `gate:milestone`.
- **Status:** IN_PROGRESS

### M4 — Close and reassess

- Objective: reconcile truth and select the next local candidate.
- Files/areas: reports/continuity.
- Implementation actions: record residual listener limitations and reassess.
- Acceptance criteria: no false completion claim.
- Validation commands: continuity checks.
- Status: NOT_STARTED

## Validation Strategy

Use synthetic browser tests and static checks; no credential or external target.
Use broad gates at the child checkpoint and classify baseline drift.

## Decision Log

- 2026-09-24 — Select after proxy firewall; credential disclosure has higher
  immediate safety impact and a bounded local binding surface.

## Discoveries

- Compile-time locator types do not bind a live DOM element.
- DOM markers alone are cloneable; a non-cloneable JS identity check is also
  required.

## Deferred Work

Arbitrary dynamic listener proof, lower-level popup target admission, and full
journal recovery remain later.

## Completion Criteria

No secret effect after detected document/form/route drift; normal synthetic path
passes; all residuals are explicit.
