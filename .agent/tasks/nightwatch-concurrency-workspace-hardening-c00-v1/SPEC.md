# Specification — Concurrency and Workspace Hardening (C-00)

## Overview

This campaign establishes the concurrency and workspace isolation model required by the independent second-reviewer architecture review (§11, F-26, revised critical path C-00 → C-01). It is the prerequisite for all subsequent parallel implementation campaigns.

## Scope

- One writing agent owns one Git worktree and one session branch.
- Agents may share the append-only object database but must not share a working tree or index.
- Deterministic repository-global hygiene invariants over the shared common Git directory.
- Bounded destructive-operation policy whose core is a declared-deletion gate.
- Fast-forward-only integration protocol serialized at the canonical `main` ref.
- Adversarial test matrix A–L on disposable synthetic repositories.
- Pinned pre-C-01 eligibility-census baseline.
- Full integration into `agent:check`, the executable quality gate, and documentation.

## Non-goals

C-00 grants no new product/runtime authority. It does not implement C-01 or any later production-observability campaign, does not change the 128-operation cap, does not admit OpenAPI, does not touch DEV/NEXT/production policy, does not contact any environment, and does not modify sibling company repositories.

## Acceptance Criteria

1. `npm run session:status` answers categorically, privacy-safely, and deterministically.
2. `npm run agent:check` fails closed on `skip-worktree`/`assume-unchanged` bits, unauthorized `.git/info/exclude` drift, unexpected hooks, unsafe/unowned worktree metadata, duplicate ownership, and undeclared tracked-file deletions.
3. The executable quality gate gains one required group `WORKSPACE_INTEGRITY`.
4. A deterministic adversarial matrix A–L reproduces every observed hazard class on disposable synthetic repositories and proves both failure and repaired green state.
5. A pinned pre-C-01 eligibility-census baseline is recorded at a clean SHA.
6. All documentation updates (AGENTS.md, DECISIONS.md, docs) are present and pass `npm run project:check`.
7. The session branch is cleanly integrated and `HEAD == origin/main` after push.
8. Canonical worktree is clean.
9. No company repositories, DEV/NEXT/production contact, or runtime authority are touched.

## Deliverables

- `.agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1/SPEC.md`
- `.agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1/PLAN.md`
- `.agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1/STATE.md`
- `.agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1/REPORT.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/*` (audit, proposal, design, tasks, specs)
- Updated `AGENTS.md` (mandatory worktree/session protocol)
- Updated `docs/DECISIONS.md` (D-101 … D-104)
- Updated `docs/CURRENT_STATE.md` (live state and C-00 status)
- Updated `.agent/EXECUTION_PROMPT.md` (C-00 handoff)
- Updated `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md` (C-00 acceptance)
- `bin/workspace-integrity.mjs`
- `bin/nightwatch-session.mjs` (status/check/start/claim/release/reconcile/integrate/remove)
- `config/workspace-integrity.v1.json`
- `tests/unit/workspaceIsolation.test.ts`
- Pinned pre-C-01 census at clean SHA
- Full validation results
- Session branch push and `HEAD == origin/main` verification
- Canonical worktree clean
- No stale worktrees

## Declared Deletions

- NONE
