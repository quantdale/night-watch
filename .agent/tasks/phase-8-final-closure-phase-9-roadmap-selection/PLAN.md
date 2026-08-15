# Nightwatch Phase 8 Final Closure & Phase 9 Roadmap Selection — PLAN

## Purpose

Plan the strict-v2 execution of the Phase 8 final closure and Phase 9
roadmap selection task
(`phase-8-final-closure-phase-9-roadmap-selection`, phase `8-CLOSURE`,
authorization `PHASE_8_CLOSURE_AND_ROADMAP_SELECTION_ONLY`).

## Starting State

- HEAD == origin/main == `27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2`,
  worktree clean (untracked session scratch `.commandcode/` moved aside to
  /tmp).
- Active task: `phase-8-next-architecture-design-review` COMPLETE; Phase 8
  IN_PROGRESS; Phase 8B.1 COMPLETE_VIA_SUCCESSFUL_RETRY_R1; catalog count 1
  (digest `sha256:bd35b934...`); B AVAILABLE_NOT_ADOPTED; authority NONE.
- Baseline verified: `agent:check` PASS (2 expected warnings), `project:check`
  PASS (phase8Status IN_PROGRESS).

## Scope

Implement the mechanical Phase-8 closure transition (project-state pin +
machine block + tests + hardening), extend the `docs/design/*.md`
checkpoint allowlist narrowly with negative tests, reconstruct the
bug-hunting pipeline from current source/evidence, select exactly one
Phase 9 direction, write `docs/design/PHASE_9_ROADMAP.md`, update durable
docs (D-53, ROADMAP, CURRENT_STATE, ARCHITECTURE, AGENTS/SAFETY_MODEL only
if required), validate fully (local + isolated checkout + full Playwright),
commit/push the source-bearing closure checkpoint, verify exact
implementation CI, then finalize docs, commit/push, verify final CI, and
close under continuity v2. NO Phase 9 implementation; NO B adoption; NO
promotion machinery use; NO catalog mutation.

## Non-Goals

- Implementing any Phase 9 capability.
- Adopting variant B or running any promotion/sandbox step.
- Changing promotion authority, evaluator/proposal semantics, the adopted
  catalog, ownerScope, campaign/triage/oracle implementation.
- Product/DEV/NEXT/production execution, DB/infra, AI/model, publication.

## Safety Constraints

- Catalog byte-identity preserved (digest `bd35b934...`); any drift is a
  STOP.
- All gates (typecheck, hardening, matrices, agent:check/audit, project:
  check, catalog integrity, full Playwright, diff --check, exact CI)
  stay unweakened; zero new skips.
- No writes outside the allowed file set; no git mutation beyond
  development checkpoints on Nightwatch main (no force-push, no reset).

## Architecture / Approach

- Mechanical transition first: pre-fix reproductions → pin/test/hardening
  edits → docs → validation → commit.
- Phase 9 selection: three read-only exploration agents gather pipeline /
  oracle-triage / campaign-history evidence in parallel; the roadmap
  document is written from that evidence with the fixed scoring criteria.
- Closure: implementation checkpoint commit → exact CI → docs closure
  commit → exact CI → task terminalization under v2.

## Milestones

- M0 — bootstrap + task records + ACTIVE_TASK: CASE D confirmed; SPEC/PLAN/
  STATE/REPORT created; ACTIVE_TASK.md updated to this task IN_PROGRESS.
- M1 — pre-fix reproductions: project-state pin (COMPLETE block → mismatch)
  and docs/design path rejection (exact diagnostics recorded).
- M2 — project-state transition: `bin/project-state-check.mjs` pin + output
  payload to COMPLETE; CURRENT_STATE machine block to COMPLETE; regression
  matrix (A-H) in tests/unit/projectState.test.ts; closure-safety invariant
  (COMPLETE + NONE) test.
- M3 — docs/design allowlist: `bin/agent-state.mjs` narrow pattern; positive
  (docs/design/PHASE_9_ROADMAP.md) + negative (nested/non-Markdown/
  traversal/random/src) tests; mixed docs+source commit = IMPLEMENTATION
  proof; existing paths regression covered by untouched existing tests.
- M4 — hardening: `bin/hardening-check.mjs` direct closure assumptions
  (Phase 8 COMPLETE required; classification explicit); narrow assertions.
- M5 — Phase 9 evidence + selection: pipeline reconstruction, oracle/triage
  inventory, campaign history (delegated); bottleneck statement; option
  matrix; selection; docs/design/PHASE_9_ROADMAP.md (16 sections).
- M6 — durable docs: D-53; ROADMAP transition; CURRENT_STATE narrative +
  machine block; ARCHITECTURE research-boundary update; AGENTS/SAFETY_MODEL
  only if required.
- M7 — local validation: typecheck, hardening, project-state matrix,
  agent-state matrix, agent:check, agent:audit, project:check (Phase 8
  COMPLETE), catalog integrity, git diff --check.
- M8 — full regression + isolated checkout: Phase 8A/8A.1/8A.1.1/8B/8B.0.1/
  8B.1 matrices, owner provenance, campaign synthetic, full clean Playwright
  0 failed, isolated full-history workspace (`npm ci --ignore-scripts`).
- M9 — closure source commit + push + exact implementation CI (Project-
  memory truth check PASS with PHASE_8_STATUS COMPLETE).
- M10 — docs/design self-proof + final docs closure: commit + push + exact
  final CI; terminal continuity fields; final report; STOP.

## Validation Strategy

- `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`,
  `npm run agent:audit`, `npm run project:check`,
  `npm run selfdev:catalog-integrity`, `git diff --check`.
- `npx playwright test` focused matrices: projectState, agent-state,
  selfDev lineages, owner provenance, campaign synthetic.
- Full `npx playwright test --project=nightwatch --workers=1` on the clean
  checkout and in the isolated full-history workspace: 0 failed.
- Exact CI verification via GitHub Actions for both checkpoints.

## Decision Log

- D0 (2026-08-15): Pre-fix project-state mismatch is a
  TRUE_POSITIVE_DESIGN_BLOCKER (intentional pre-closure pin), not a bug.
- D1: Protocol version stays `nightwatch.project-state.v1` — only a current
  value changes under the same schema/authority contract.
- D2: docs/design allowlist shape `/^docs\/design\/[^/]+\.md$/` — single
  level, Markdown only, repository-native design documents.
- D3 (expected at selection): one evidence-backed Phase 9 primary direction;
  recorded with the exact bottleneck statement in the roadmap document.

## Discoveries

- `.commandcode/` session scratch (empty) existed untracked at start; moved
  aside to /tmp to satisfy the clean-checkout gate; not part of the repo.

## Deferred Work

- All nonselected Phase 9 options, classified in the roadmap document.

## Completion Criteria

- PHASE_8_STATUS COMPLETE machine-enforced; IN_PROGRESS rejected by tests.
- docs/design single-level Markdown allowed; nested/non-Markdown/mixed
  rejected; existing paths unregressed.
- Phase 9 roadmap with bottleneck + matrix + one direction + future spec;
  implementation NOT started, NOT authorized.
- All validation green incl. full Playwright 0 failed and exact CI for the
  implementation and final docs checkpoints; catalog digest unchanged;
  task closed under continuity v2 with terminal fields.
