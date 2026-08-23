# PLAN — Phase 16B Contained DEV Portfolio Campaign Acceptance

Task ID: `phase-16b-contained-dev-portfolio-campaign-acceptance`
Status: IN_PROGRESS

## Purpose

Execute runtime acceptance of the Phase-16A portfolio planner after Phase-16H
hardening: one bounded, read-only, owner-authorized contained DEV portfolio
campaign through existing Nightwatch runtime, with truthful reconciliation
and private evidence only.

## Starting State

Clean main at be14a21d16127108b66e3d089e159d006c8f24e3 == origin/main (the
Phase 16B publication package). Predecessor terminal truth: Phase 16A
implementation 1737e30afb64a1aed722f61182d87a4f2f6e3bb4; Phase 16H earned
1d6d8759bbba0145962fa0e65810d6f32fa41445 with canonical AND isolated complete
regressions 2161/0/4 exact parity; PHASE_16A_DEV_CAMPAIGN was NOT_AUTHORIZED
until this task's authorization.

## Scope

One bounded DEV portfolio campaign over already-approved targets only,
through the existing campaign runtime and containment/owner-policy stack:
runtime binding proof, safety preflight, deterministic plan freeze, one
execution, checkpoint/resume truth, anomaly handling via existing machinery,
reconciliation, post-run focused local validation, closure records.

## Non-Goals

No NEXT or production. No mutations. No database/data-plane/cloud/infra work.
No Phase-6 expansion. No new target/endpoint/transport authority. No AI/model
oracle authority. No selfDev/promotion/catalog mutation. No publication or
shared findings. Phase 11B and 13B remain NOT_AUTHORIZED. No second executor
or alternate owner-policy path.

## Safety Constraints

Both authorization tokens recorded before any DEV contact; authorization
never mutates plan identity/members/targets/budget/caps/policy; every action
owner-policy checked before execution; production/NEXT/unknown fail closed;
authenticated traces off; storage state through the sanctioned loader only
and never printed/persisted; stop on any containment/currentness/checkpoint/
auth violation; zero dossier-ready findings is a valid result.

## Milestones

### M0 — Bootstrap / authority
- Fetch live Git; require clean fast-forward state.
- Read predecessor Phase 16A/16H evidence and current runtime source.
- Record both execution authorization strings before DEV contact.
- Transition the record from dormant publication to active execution.

Status: COMPLETE — fast-forward `10099740e418cb5dbe0aad32215fcd69b1751f2e` ->
`be14a21d16127108b66e3d089e159d006c8f24e3`; HEAD == origin/main at activation;
both tokens recorded before DEV contact; ACTIVE_TASK/STATE transitioned.

### M1 — Runtime binding proof
- Generate/read the current hardened DEV handoff.
- Trace the exact current source path from inert handoff to campaign runner.
- Prove no guard bypass or invented runner is needed.
- If no safe binding exists, stop with BLOCKED_RUNTIME_BINDING_MISSING.

Status: COMPLETE — TERMINAL BLOCKED_RUNTIME_BINDING_MISSING. Producer exists
(report.ts buildDevHandoffPackage + literal token; bin/portfolio.mjs
stdout-only); exact existing runtime entrypoint identified (npm run
campaign:real -> bin/phase7-real.mjs -> tests/manual/phase7-real-campaign.ts
-> src/core/campaign prepare/resume); mechanically established that NO safe
consumption path exists (no consumer outside portfolio module/unit tests, no
launcher plan input, token consumed by nothing, three of five default plan
targets are synthetic-fixture-only, plan units unmappable onto campaign
budget dimensions). Stopped per SPEC §3 without any bypass and without DEV
contact. Candidate plan/handoff proven byte-deterministic (plan x3, handoff
x2) and parser-valid but never frozen for execution.

### M2 — Safety preflight
Status: NOT_EXECUTED — blocked at M1 (no runtime binding; preflight never
reached; zero DEV requests made).

### M3 — Portfolio plan freeze
Status: NOT_EXECUTED — blocked at M1 (determinism/digest evidence captured in
REPORT §3, but no freeze occurred because admission failed before freeze).

### M4 — One bounded DEV execution
Status: NOT_EXECUTED — blocked at M1.

### M5 — Replay / minimization / triage
Status: NOT_EXECUTED — no observations existed.

### M6 — Reconciliation
Status: NOT_APPLICABLE_ZERO — attempted/completed 0; reconciliation trivially
exact; safety floors all zero (REPORT §7-§8, §12).

### M7 — Post-run local checks
Status: COMPLETE — typecheck PASS; hardening:check PASS; focused Phase
16A+16H suites 98/0; campaign:synthetic 27/0; owner-provenance 91/0;
agent:check PASS; project:check PASS; git diff --check CLEAN. No source
changed, so no historical compatibility rerun was required.

### M8 — Closure
Status: COMPLETE — REPORT/STATE populated truthfully; documentation-only
closure push (no source checkpoint manufactured); no Actions inspection
required (no pushed SOURCE checkpoint); active task returned to NONE; STOP.

## Fix policy

A genuine Nightwatch source defect discovered during the contained run may be fixed under this task only when the fix is local to the existing authorized runtime path and does not broaden endpoint/target/mutation authority. After a source fix, rerun the smallest decisive local regression and restart the DEV campaign only if safety semantics require a fresh run. Otherwise create a separate corrective task rather than improvising scope.

## Architecture / Approach

Reuse only existing hardened subsystems, per
docs/design/PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE.md:
approved target registry -> portfolio model -> scoring -> allocation ->
campaign-plan manifest -> inert DEV handoff -> owner authorization ->
existing campaign runtime -> checkpoint/resume -> observation ->
semantic/protocol evaluation -> replay/minimization -> clustering/confidence
-> private dossier/report. No second executor and no alternate owner-policy
path is created; authorization changes permission only.

## Validation Strategy

- M1: source-traced runtime binding proof (no invented runner/flag/route).
- M2: existing containment/owner-policy/auth-state preflight checks prove
  L0-L5, DEV-only allowlist, fail-closed production/unknown, traces off,
  storage-state secrecy, checkpoint compatibility.
- M3: >=3 byte-identical plan/handoff generations with strict parsers.
- M4-M6: runtime reconciliation of planned/attempted/completed/blocked,
  budget/caps, checkpoints/resumes/retries, candidate dispositions, safety
  floors all zero.
- M7: focused Phase-16A/16H/16B suites + typecheck + hardening:check +
  campaign:synthetic + owner-provenance + agent:check + project:check +
  git diff --check (full historical suites only if runtime source changed).

## Decision Log

- D-16B-1 (activation): both authorization tokens recorded before any DEV
  contact; authorization never mutates plan identity/scope/budget/policy.
- D-16B-2 (M1): BLOCKED_RUNTIME_BINDING_MISSING declared from mechanical
  source evidence only; building a binding would require new runner/flag/
  seam code explicitly forbidden by SPEC §3, prompt §2, and the design doc's
  no-second-executor rule.
- D-16B-3 (closure): no source defect found (guards behaved correctly,
  fail-closed); no source checkpoint manufactured; documentation-only closure
  push.

## Discoveries

- Dormant publication STATE/PLAN formats required restructuring into strict
  continuity-v2 active-task form at activation (mechanically enforced).

## Deferred Work

- CI inspection once per relevant pushed checkpoint; standing external
  billing block never retry-looped.
- Further portfolio semantic depth belongs to future separately authorized
  tasks.

## Completion Criteria

SPEC section 8 acceptance list A01-A24 satisfied with truthful evidence;
exactly one bounded DEV campaign executed or a truthful BLOCKED_* terminal
recorded; reconciliation exact; safety floors zero; REPORT.md populated from
actual runtime evidence; STATE/ACTIVE_TASK terminal truthfully; closure push
fast-forward with HEAD == origin/main and clean tree.

Outcome: satisfied via the truthful BLOCKED_RUNTIME_BINDING_MISSING terminal
(A01/A02/A03/A23 met with evidence; A04-A20 vacuously zero — no runtime ever
started; A21-A24 green/recorded).
