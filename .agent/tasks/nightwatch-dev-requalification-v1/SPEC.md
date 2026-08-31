# Nightwatch Bounded DEV Requalification

## Task ID

`nightwatch-dev-requalification-v1`

## Phase

`DEV_REQUALIFICATION_V1`

## Objective

Use the freshly refreshed owner-managed DEV authentication state to obtain a
bounded, serial, truthful real-system reliability sample from the existing
read-only Phase 2C, Phase 4, Phase 5, campaign, and replay paths. Preserve the
completed hardening campaign as history and do not relabel any earlier
auth-blocked, divergent, or retry result.

## Scope

- Three independent Phase 2C invocations.
- One guarded Phase 4 read-only exploration.
- One guarded Phase 5 read-only API operation.
- One campaign prepare/resume lifecycle and one safe selected replay when
  available.
- Sanitized owner-local evidence, state/cleanup inspection, clustering, and
  final task/project reconciliation.
- Local implementation repair only if a concrete Nightwatch defect is
  discovered, with deterministic regression coverage before continuation.

## Non-goals and prohibitions

- No production or NEXT contact, DEV mutation, database/datastore or
  infrastructure access, sibling-repository writes, publication, or issue
  creation.
- No credential capture beyond the owner-led auth command already completed;
  no credential/state-content inspection or raw authenticated evidence.
- No new proof family, oracle relaxation, retry-based correctness claim,
  opaque scoring, or arbitrary project-verdict promotion.
- Do not reopen or edit completed predecessor task records.

## Authorization and verdict effect

The current project verdict remains `OPERATIONALLY_ACCEPTED` while this
bounded evidence task is active through explicit
`PROJECT_VERDICT_EFFECT: PRESERVE`. If validated evidence genuinely
invalidates the verdict, stop and transition through the explicit
`REEVALUATE` protocol; do not hide the result in a task-name change, retry, or
historical edit.

## Required outcomes

1. Every attempted real operation has an independent sanitized outcome.
2. Phase 2C clean, divergence, timing, product, auth, environment, framework,
   and unknown categories are reported distinctly.
3. Campaign state, finding identity, replay identity, and cleanup are checked
   without duplicate/lost work or false completion.
4. Any Nightwatch-owned Critical/High defect is repaired and regression-tested
   before closure.
5. Final DEV, local, clean, continuity, project, and Git results are recorded
   with no stronger claim than the evidence supports.
