# SPEC — R-13 Overnight Reliability, Stress, Determinism + Clean-Clone Certification

Task ID: nightwatch-overnight-reliability-r13-v1
Phase: OVERNIGHT_RELIABILITY_R13_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: d3a464de97225f91cd425b7922b53238a02dc981
Predecessor Task ID: nightwatch-system-map-v2-transport-c15c-v1
Predecessor Status: COMPLETE_IMPLEMENTATION_CI_EXTERNAL_BLOCKER (see §Predecessor truth)
Authorization class: NIGHTWATCH_OVERNIGHT_RELIABILITY_R13_V1

## Frozen intent

A single green run is not certification after the R-12 → C-15c architectural
sequence. R-13 repeats, stresses, permutes and adversarially probes the
deterministic producers, the source-intelligence pipeline, the quality-gate
machinery, the System Map transport, and the Control Center UI — in fresh
processes, in permuted orders, under collision and concurrency, and from a
second clean topology — until repeatability is measured rather than assumed.

R-13 changes NO implementation. The only durable writes are this task record,
its OpenSpec change, routing updates, and the closure report. Every probe
artifact lives in disposable temp directories; every adversarial mutation is
restored; the tree is clean before every gate observation.

## Predecessor truth (carried, not re-litigated)

- C-15c implementation is COMPLETE at `82e3a49`; `gate:local` PASS
  (`receipt:sha256:4e6b059312e2281785e38400`) and `gate:clean` PASS
  (`clean-receipt:sha256:6c14424bbbeb876dbd3c6d95`) at that SHA; browser
  matrix 2/2 PASS; siblingWrites 0; production/NEXT/DEV contacts 0.
- Exact-head CI for `d3a464d` (run `33833574821`, attempts 1–4) fails with an
  identical EXTERNAL signature every time: no runner assigned, zero steps, no
  annotations, failed in 1–4s. The workflow file is byte-identical to the one
  that went green 4h earlier. Classification: EXTERNAL_BLOCKER. Re-attempts
  continue on a changed-hypothesis basis only (time elapsed / GitHub
  recovered), never as blind retries.
- C-06G gate (§48) assessed against the C-03 REPORT: service-level topology is
  PROVEN (12 bindings) and 531/549 RPCs have observed handler methods, but
  ouchan enumeration is TRUNCATED with `repositoryCompleteProof: false`, so the
  inventory-completeness condition is unsatisfiable.
  Verdict: `C06G_BLOCKED_BY_METHOD_BINDING_OR_INVENTORY_COMPLETENESS`.
- C-08b: `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS` (C-08 records, four
  independent verifications). C-07 DEV: BLOCKED on the internal evidence
  blocker (zero admitted targets); C-12/NEXT/production: NOT AUTHORIZED,
  contacts 0.

## Requirement status vocabulary

Every §92–§110 requirement is tracked in REPORT.md as one of NOT_STARTED,
IN_PROGRESS, PASS, FAIL, BLOCKED, NOT_APPLICABLE_WITH_PROOF. No silent
omission. A defect gets ID, symptom, reproduction, root cause, fix,
regression, disposition. A failure gets one of PRE_EXISTING,
CAMPAIGN_INTRODUCED, FLAKE_PROVEN, ENVIRONMENT, TOPOLOGY,
EXPECTED_FAIL_CLOSED, PROJECT_TRUTH_ORDERING, EXTERNAL_BLOCKER, UNKNOWN —
never "flaky" merely because a later run passed.
