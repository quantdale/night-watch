# Task State

## Identity

Task ID: phase-7b-1-ai-review-authority-hardening
Phase: 7B.1 — AI REVIEW AUTHORITY HARDENING
Status: IN_PROGRESS
Starting SHA: a4f9ba7a761af233f1143d89d95ffa335d15fed7
Current SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Last validated implementation SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Last substantive checkpoint SHA: 40e59ecf6209dac7ef88ac2af0bcef781562a837
Last documentation checkpoint SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Last pushed SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Current local head: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Current remote head: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
Branch: main
Remote: origin -> quantdale/night-watch/main

## Objective

Enforce one non-bypassable bounded AI provider authority and digest-bound
immutable owner-review provenance while preserving zero AI authority over
Nightwatch truth and execution.

## Current Milestone

M7 — durable closure and remote verification.

## Completed Milestones

- M0 — recovery, task routing, and defect reconfirmation.
- M1 — one structural invocation authority.
- M2 — accurate bounded accounting and concurrency.
- M3 — immutable artifact and companion review provenance.
- M4 — forgery, corruption, and renderer regressions.
- M5 — static hardening and call-graph checks.

## Work In Progress

The implementation checkpoint is pushed and synchronized. Project
documentation reconciliation, isolated clean-checkout validation, final task
reporting, and the documentation checkpoint remain.

## Exact Next Action

Reconcile `CURRENT_STATE.md`, `SAFETY_MODEL.md`, `ARCHITECTURE.md`,
`DECISIONS.md`, and `ROADMAP.md`; run the isolated clean-checkout checks; then
commit/push the documentation checkpoint, read its exact remote workflow, and
then record the terminal state push.

## Files Changed

- `.agent/ACTIVE_TASK.md` and this task's `SPEC.md`, `PLAN.md`, `STATE.md`,
  and `REPORT.md`.
- `src/core/aiReview/{types,pipeline,index,validation,review,storage,render,
  syntheticProvider,loopbackProvider}.ts`.
- `src/core/policy/privateArtifacts.ts`.
- `tests/unit/{aiReview,aiReviewLoopback}.test.ts`.
- `bin/hardening-check.mjs`.

## Validation Ledger

- Bootstrap: PASS — canonical root, `main`, clean synchronized origin at
  `a4f9ba7a761af233f1143d89d95ffa335d15fed7`.
- Single writer: PASS — no other active writer in this Nightwatch root.
- Starting Phase 7B tests: PASS — 38/38.
- Current Phase 7B/7B.1 AI and loopback matrix: PASS — 54/54.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- `git diff --check`: PASS.
- Synthetic campaign: PASS — 27/27.
- Full Playwright: PASS — 453/453.
- `npm run agent:check`: PASS with the expected uncommitted implementation
  baseline warning.
- Clean checkout: PASS — isolated `npm ci --ignore-scripts`, typecheck,
  hardening, focused 54/54, campaign 27/27, and agent-state.
- Final post-documentation-checkpoint validation and remote CI: PENDING.

## Continuity Vector

CURRENT_GOAL: Enforce one non-bypassable bounded AI provider authority and
digest-bound immutable owner-review provenance while preserving zero AI
authority over Nightwatch truth and execution.
CURRENT_MILESTONE: M7 — durable closure and remote verification.
STARTING_SHA: a4f9ba7a761af233f1143d89d95ffa335d15fed7
STARTING_REMOTE_SHA: a4f9ba7a761af233f1143d89d95ffa335d15fed7
CURRENT_LOCAL_HEAD: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
CURRENT_REMOTE_HEAD: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
PHASE_7B_STATUS: COMPLETE (historical architecture milestone preserved)
PHASE_8_STATUS: NOT_STARTED
OWNER_SCOPE_POLICY: FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE
INVOCATION_PUBLIC_API: AiReviewSession only for provider execution
INVOCATION_BUDGET_AUTHORITY: one explicit session; raw provider execution private
CANDIDATE_ATTEMPTS: max 3 synchronous owner requests per session
ORACLE_ATTEMPTS: max 3 synchronous owner requests per session
PROVIDER_CALL_SEMANTICS: actual shared synchronous provider-boundary exposure, max 3
CONCURRENCY_STATUS: PASS — four pending requests yielded exactly three invocations
REVIEW_PROVENANCE_MODEL: immutable v2 artifact plus separate digest-bound owner record
ARTIFACT_IMMUTABILITY_STATUS: PASS — generated status unreviewed-only; storage write-once
HUMAN_REVIEW_RECORD_STATUS: PASS — exact-key v2 record with deterministic review ID
STALE_STATE_STATUS: PASS — changed deterministic input projects STALE and preserves history
SCHEMA_VERSION_DECISION: v2 generated artifacts; explicit flat-v1 read compatibility
FILES_CHANGED: implementation, tests, hardening, workflow, task state, and project docs
FOCUSED_TEST_LEDGER: PASS — AI/loopback 54/54; synthetic campaign 27/27; full suite 453/453
ADVERSARIAL_TEST_LEDGER: PASS — bypass, concurrency, accounting, forgery, digest, stale, conflict, corruption, self-approval, scope, and isolation cases
HARDENING_STATUS: PASS — public export, provider call-graph, local-only, storage, and campaign checks
CI_STATUS: PENDING — exact final workflow run after terminal documentation push
PRIVACY_STATUS: PASS — zero real credentials, customer data, findings, or AI output
SAFETY_EVENTS: NONE — DEV/NEXT/production/product/data/infrastructure/publication/AI-tool vectors all zero
LAST_VALIDATED_IMPLEMENTATION_SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 40e59ecf6209dac7ef88ac2af0bcef781562a837
LAST_DOCUMENTATION_CHECKPOINT_SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8
LAST_PUSHED_SHA: 8ca71c7ce2849b1187f6e6989453ae397c2c4ce8

## Decisions Made During This Task

- `candidateReviewAttempts` and `oracleSuggestionAttempts` are synchronous
  owner-request reservations, including invalid and disabled requests.
- `providerCalls` is a synchronous shared reservation at actual provider
  handler entry; provider failures, rejected output, and storage failure do
  not refund it.
- Session runtime begins at construction; creating a new session is explicit
  and no automatic session factory exists.
- v2 generated artifacts are unreviewed-only. Owner decisions are separate
  exact-key records with deterministic `reviewId`, artifact schema binding,
  digest binding, owner class, and prohibited publication.
- One exact-artifact terminal decision is allowed; conflicts fail closed.

## Discoveries

- The direct low-level execution bypass and pre-validation provider counter
  increment were both present at the starting SHA.
- The v1 human-review writer stored records flat under the private-store
  `READY` envelope; read compatibility is explicit and still requires a valid
  digest-bound record.

## Blockers

None.

## Safety Events

None. This task has used only local source inspection, synthetic fixtures,
loopback fixture traffic, and temporary owner-only test roots.

## Deferred / Follow-Up

- Owner review CLI remains future work and is not started here.
- Local model canary, cloud provider, campaign AI hook, oracle registration,
  and Phase 8 remain unauthorized and unstarted.

## Resume Recipe

Read `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
`docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`,
`.agent/ACTIVE_TASK.md`, this task's `SPEC.md`, `PLAN.md`, and `STATE.md`.
Inspect `git status`, `git diff`, and `origin/main`; run the focused AI matrix;
resume from `Exact Next Action`. Never run real campaign/auth/product,
database, infrastructure, external AI, or publication commands.

## Completion Snapshot

Phase 6: FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE
Phase 7: COMPLETE
Hardening I: COMPLETE
Hardening I.1: COMPLETE
Phase 7B: COMPLETE (historical architecture milestone)
Phase 7B.1: IN_PROGRESS — source/docs complete; continuity repair and final CI pending
Phase 8: NOT_STARTED
Owner scope: local/static/synthetic/loopback-fixture-only
Invocation public API: `AiReviewSession` only for provider execution
Invocation budget authority: one explicit session; raw provider execution is private
Candidate attempts: max 3 owner requests per session
Oracle attempts: max 3 owner requests per session
Provider-call semantics: actual shared provider-boundary exposure, max 3
Concurrency status: PASS — pending fixture observed exactly 3 invocations
Review provenance model: immutable v2 artifact plus separate digest-bound owner record
Artifact immutability status: PASS — generated status is unreviewed-only and storage is write-once
Human review record status: PASS — exact-key v2 record with deterministic identity
Stale state status: PASS — current input changes project `STALE` and preserve history
Schema version decision: v2 generated artifacts; explicit flat-v1 read compatibility
Hardening status: PASS — export, call-graph, local-only, and isolation checks
CI status: PENDING final pushed workflow read
Privacy status: PASS — no real credentials, customer data, findings, or AI output
Safety vector: DEV 0; NEXT 0; production 0; product mutations 0; database 0; infrastructure 0; publication 0; external AI 0; AI tools 0; AI source edits 0
Last validated implementation SHA: 40e59ecf6209dac7ef88ac2af0bcef781562a837
Last substantive checkpoint SHA: 40e59ecf6209dac7ef88ac2af0bcef781562a837
Last documentation checkpoint SHA: a4f9ba7a761af233f1143d89d95ffa335d15fed7
Last pushed SHA: a4f9ba7a761af233f1143d89d95ffa335d15fed7
