# Child-process census indirection v1

## Purpose

Make the child-process authority census total over supported JavaScript
indirection forms and fail closed when an import cannot be resolved safely.

## Starting State

- Task ID: `nightwatch-child-process-census-indirection-v1`
- Starting Nightwatch SHA: `5619aeaf77e22862cc87c6da6ad6e022fa60b774`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Relevant source: `bin/lib/childProcessCensus.mjs`,
  `bin/lib/hardening/rules/process-and-network.mjs`,
  `tests/unit/childProcessCensus.test.ts`, and census probe configuration.
- Reproduction: namespace `require` and method alias source strings are marked
  as imports but produce zero bindings/namespaces/sites.
- Dependencies: existing closed invocation vocabulary, execution profiles,
  hardening totality rule, and local synthetic tests.

## Scope

Pure parser/census logic, a bounded unknown-import result, hardening refusal,
focused tests, and continuity/OpenSpec records.

## Non-Goals

No eval, runtime instrumentation, arbitrary transpilation, child-process
execution, network, credentials, or external target.

## Safety Constraints

Local source analysis and synthetic fixtures only; preserve fail-closed
unknown handling and existing production profile classifications.

## Architecture / Approach

Parse direct namespace/default/named imports and both supported require forms.
Collect namespace bindings first, then resolve direct method aliases against
the closed invocation vocabulary. If a file imports child_process but exposes
no recognized binding/namespace or contains unresolved dynamic indirection,
emit an explicit unknown-import record consumed by the hardening rule. Keep
profile classification pure and bounded. Add fixture tests for every supported
form and mutation negatives.

## Milestones

### M1 — Contract and reproduction

- Objective: freeze supported indirection and unknown-result schemas.
- Files/areas: census module/tests and child OpenSpec.
- Implementation actions: add failing namespace-require/alias tests.
- Acceptance criteria: current implementation fails the intended assertions.
- Validation commands: focused child-process census suite.
- **Status:** COMPLETE

### M2 — Totality implementation

- Objective: discover supported forms and refuse unresolved imports.
- Files/areas: census, hardening rule, probe/quantifier tests if required.
- Implementation actions: implement namespace/method alias parsing and
  unknown-import refusal.
- Acceptance criteria: all supported forms discovered; unknown cannot be green.
- Validation commands: focused tests, typecheck, hardening.
- **Status:** COMPLETE

### M3 — Adversarial validation and checkpoint

- Objective: mutation-test the new guards and run milestone validation.
- Files/areas: tests/hardening/task state.
- Implementation actions: remove each discovery/refusal guard in a temporary
  mutation and prove detection; classify unrelated broad-gate drift.
- Acceptance criteria: mutations detected; no profile or safety regression.
- Validation commands: `gate:dev`, `gate:milestone`.
- **Status:** BLOCKED

### M4 — Close and reassess

- Objective: reconcile truth and select the next successor.
- Files/areas: reports/OpenSpec/active route.
- Implementation actions: record exact receipts and reassess run-evidence
  transaction integrity versus remaining candidates.
- Acceptance criteria: no false COMPLETE claim; next campaign evidence-led.
- Validation commands: continuity checks and justified release grouping.
- **Status:** NOT_STARTED

## Validation Strategy

Use the focused census suite and hardening probes during implementation. Use
`gate:dev`/`gate:milestone` at the child checkpoint; classify pre-existing
source-intelligence failures rather than absorbing them.

## Decision Log

- 2026-09-24 — Select this before the larger run-evidence transaction redesign:
  the bypass is reproduced, safety-relevant, and small/low-risk to correct.
- 2026-09-24 — Pure parser now discovers namespace `require`, destructured
  aliases, and direct method aliases; unresolved imports are explicit records
  consumed by hardening.

## Discoveries

- The current `IMPORT_RE` proves import presence but does not bind namespace
  `require` assignments.
- The current hardening rule trusts `unclassifiedCount === 0`; an unresolved
  import needs a separate non-vacuity refusal.

## Deferred Work

Run-evidence transaction integrity, popup L0 readiness, proxy raw-event
persistence, and credential-use binding remain later candidates.

## Completion Criteria

Supported namespace/method indirection is discovered, unresolved imports fail
closed, focused/static/milestone evidence is recorded, and any broad gate
residual is explicitly classified without reopening the prior campaign.
