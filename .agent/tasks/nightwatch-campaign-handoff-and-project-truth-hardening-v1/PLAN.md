# Campaign Handoff + Project Truth Hardening

## Purpose

Close the reproduced planner-to-executor route gap and make the current
machine-checked project snapshot an explicit, narrow, mechanically owned
truth boundary.

## Starting State

- Task ID: `nightwatch-campaign-handoff-and-project-truth-hardening-v1`
- Starting SHA: `cf26ef88fdfe2d36c321c4c176674c5c8ee0d8fa`
- Planned-From: `7165beeda3006ce1f64e61e7ae62fa919441fe96`
- Branch/remote: `main` / `origin`
- Predecessor: `nightwatch-variant-b-adoption-and-cli-hardening`, terminal
- Current defects: canonical prompt route is unchecked; project-state v1
  accepts unchecked fields and normalizes SPENT to NONE in output.
- Established boundaries: local/source/synthetic only; project/product,
  cloud/data, publication, promotion, and L6 work remain out of scope.

## Scope

Implement the handoff parser/checker, strict project-state successor, SHA-role
transition coverage, authoritative gate integration, hardening guards, tests,
and durable documentation named by the OpenSpec.

## Non-Goals

No product functionality, source intelligence expansion, real environment
execution, datastore/infrastructure work, canonical promotion, generic
workflow engine, historical-task rewrite, test deletion, skip addition,
assertion weakening, or snapshot laundering.

## Safety Constraints

Use only synthetic temporary Git repositories and repository-local fixtures.
All checkers stay read-only, local, deterministic, bounded, shell-disabled
for fixed child processes, and privacy-safe. Zero external contacts and zero
runtime Git writes.

## Architecture / Approach

1. Add a pure versioned handoff-header parser/state model and a read-only Git
   and filesystem checker for current route truth.
2. Keep task continuity as the milestone/state authority and reuse existing
   SHA-role classification. Add only the exact OpenSpec planning-document
   patterns needed by the pulled READY checkpoint; transition fixtures prove
   that this narrow route allowance is not a substitute for role validation.
3. Replace the permissive project-state block with a strict v2 key schema,
   mechanically derived catalog/portfolio values, and explicit promotion
   lifecycle/effective-authority output.
4. Make the quality gate own one handoff invocation, then protect the new
   boundary with hardening and adversarial Playwright tests.
5. Close with durable state, report, docs, exact-head validation, and a
   substantive implementation checkpoint followed by documentation closure.

## Milestones

### M1 — H0 audit, baseline, and takeover activation — COMPLETE

- Objective: record the literal audit and establish a fresh continuity task.
- Areas: `.agent/tasks/`, `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`.
- Acceptance: reviewed-count equals tracked-count; baseline receipts and
  reproduction dispositions are in STATE; prompt/task activation is coherent.
- Validation: all-file NUL-safe audit, `npm run agent:check`,
  `npm run project:check`, `npm run hardening:check`, quality-gate checks.

### M2 — Handoff protocol and route checker — COMPLETE

- Objective: enforce versioned prompt state, exact campaign/OpenSpec route,
  branch, planned-from, and task binding.
- Acceptance: READY, IN_PROGRESS, BLOCKED, and COMPLETE semantics plus all
  malformed/traversal/untracked/identity failures have deterministic tests.

### M3 — SHA-role transition hardening — COMPLETE

- Objective: prove planning/documentation descendants never occupy the
  substantive implementation role and source drift fails closed.
- Acceptance: synthetic commit-chain matrix is green without allowlist drift.

### M4 — Strict project-state v2 — COMPLETE

- Objective: make every machine-block field owned and output semantically
  faithful, while relocating stale historical fields.
- Acceptance: current two-entry/exhausted state passes; unknown, duplicate,
  stale, malformed, mismatch, and SPENT/NONE fixtures fail or project clearly.

### M5 — Gate integration, hardening, and adversarial matrix — IN_PROGRESS

- Objective: make handoff truth authoritative exactly once across gate modes.
- Acceptance: local/CI/clean/pre-DEV gate paths, hardening, inventory, and
  x3 deterministic focused runs cover the complete OpenSpec matrix.

### M6 — Full acceptance and closure — NOT_STARTED

- Objective: execute all required local, clean, Node20/topology, campaign,
  provenance, and documentation acceptance, then push the validated result.
- Acceptance: clean exact-head `origin/main`, truthful terminal task/prompt,
  strict project state, final report, and observed CI classification.

## Validation Strategy

Run focused parser/checker/project-state/continuity tests after each owning
milestone, then typecheck, hardening, quality-gate specification and inventory,
agent checks, project check, synthetic campaign, semantic compatibility,
owner provenance, local/clean gates, Playwright enumeration, disposable
Node20/topology acceptance where available, and `git diff --check`.
Record exact results and safe performance measures in STATE and REPORT.

## Decision Log

- 2026-08-27 — Pulled `origin/main` to `cf26ef8` and retained the planner's
  one-commit docs-only descendant as the starting checkout.
- 2026-08-27 — Created a fresh task rather than resuming the completed
  predecessor, as required by the handoff prompt.
- 2026-08-27 — Initial validated implementation anchor carries forward the
  predecessor's substantive `544e90e...` baseline until this task lands its
  own source/test/tooling implementation checkpoint.
- 2026-08-27 — Added exact OpenSpec planning-file checkpoint patterns because
  the pulled `Planned-From` descendant contains those route inputs; nested,
  source-like, and non-Markdown paths remain outside the allowlist.
- 2026-08-27 — The first clean-gate run exposed that its detached disposable
  clone violated the new branch-bound handoff contract. The clean gate now
  checks out and verifies the exact head on local `main`; this is a substantive
  repair, not a relaxation of branch validation.

## Discoveries

- H0 discovered 1,359 tracked regular files; all were read and hashed.
- The planning commit adds four OpenSpec route files plus a checklist; the
  live tracked count must remain discovered rather than hardcoded.

## Deferred Work

- Any unrelated Medium/Low hygiene findings from the all-file audit.
- Browser-process speculative DNS and restricted L6 containment.
- Historical v1 task migration and external zero-step CI remediation.

## Completion Criteria

The strict handoff and project-state checks are authoritative and green, every
OpenSpec requirement and adversarial matrix is permanently tested, full local
acceptance is green without weakened assertions, safety boundaries remain
untouched, and the final validated head is pushed to `origin/main` with a
clean checkout and truthful terminal continuity records.
