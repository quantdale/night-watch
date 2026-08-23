# PLAN — Phase 16CH Portfolio Runtime Binding Hardening

Task ID: `phase-16ch-portfolio-runtime-binding-hardening`
Authorization at activation: `PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`
Required execution token: `PHASE_16CH_PORTFOLIO_RUNTIME_BINDING_HARDENING_LOCAL_ONLY`
Plan status: COMPLETE (terminal local-green / external-CI-blocked disposition)

## Purpose

Turn Phase 16C's focused-green runtime binding into an evidence-backed local
release candidate before any separately authorized DEV retry.

## Scope and safety

The task remained LOCAL / SOURCE / SYNTHETIC. It repaired only defects
reproduced in the Phase-16C binding seam, preserved historical serialization
and authority boundaries, and performed no DEV/NEXT/production, data-plane,
infrastructure, sibling-write, publication, AI or promotion operation.

## Milestones

- M0 Bootstrap / predecessor reproduction — COMPLETE.
- M1 Compiler / static / universe baseline — COMPLETE.
- M2 Admission / authorization / parser hardening — COMPLETE.
- M3 Budget / work-item binding hardening — COMPLETE.
- M4 Identity / fingerprint / prepare-resume hardening — COMPLETE.
- M5 Launcher / file-boundary / single-executor hardening — COMPLETE.
- M6 Adversarial corpus / determinism / privacy — COMPLETE.
- M7 Historical compatibility — COMPLETE.
- M8 Canonical complete regression — COMPLETE, 2,232/4/0.
- M9 Topology-correct isolated complete regression — COMPLETE, exact 2,232/4/0.
- M10 Closure gates / validated checkpoint / CI truth — COMPLETE.
- M11 Durable closure — COMPLETE.

## Evidence decisions

- DEF-01 keeps the Phase-16C mapping-v1 feasibility boundary: one and two
  linked APIs are feasible where the documented caps allow them; three linked
  APIs fail closed. The guard now mirrors the approved reserve arithmetic.
- DEF-02 masks unsafe external field names without changing safe-token
  diagnostics or echoing values.
- A throwing executor remains a structured runtime-infrastructure stop; it is
  never a raw error or a reason to bypass admission, fingerprint or owner
  policy.
- The canonical and isolated suites are both 2,232 passed / 4 skipped / 0
  failed with the same four skip identities. The four skips are environmental
  guards, not newly introduced skips.

## Validation strategy and terminal criteria

The focused cone, adversarial corpus, affected compatibility, synthetic
campaign, owner provenance, canonical full suite, isolated full suite,
continuity checker, audit, project checker and diff check all passed. The
catalog count/digest stayed unchanged and promotion authority stayed NONE.

The exact Actions run for the validated implementation checkpoint was
`32624917568` / job `97158631282`; it completed as failure with zero steps
under the standing external billing/spending condition. Therefore the
truthful terminal token is `PHASE_16CH_STATUS: BLOCKED_EXTERNAL_CI` and the
runtime binding is `VERIFIED_LOCAL_NOT_CI_VERIFIED`, not a CI-green claim.

## Deferred work

Phase 16D remains separately owner-gated and unauthorized. Phase 6 remains
frozen; Phase 11B and 13B remain unauthorized. Any new engineering requires
a new task and fresh local/source/synthetic scope.
