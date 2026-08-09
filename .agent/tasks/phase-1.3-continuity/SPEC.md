# Phase 1.3 — Durable Agent Continuity / Execution-State Protocol

## Task purpose

Give Nightwatch a repository-native memory protocol that lets a competent
fresh agent recover project state, active work, evidence, constraints, and the
exact next action without relying on conversational/model memory.

## Established starting state

- Nightwatch is a private, separate TypeScript/Node/Playwright repository.
- Starting SHA: `ea2d327f54269c101123c2660a456e69dd319735`.
- Phase 1, 1.1, and 1.2 are complete; the existing suite is green at handoff:
  `npx tsc --noEmit` PASS and `npx playwright test` 93 passed, 0 failed.
- Phase 1.2 has a mandatory loopback egress proxy and shared outbound policy.
- DNS resolver activity remains a known process/network-namespace residual gap.
- A historical intermediate Phase 1.1 contact to `api.alphaus.cloud` is real,
  retained, and only partially known; it must not be rewritten as no contact.

## Required deliverables

- Concise permanent root `AGENTS.md` operating contract.
- `.agent/README.md`, `.agent/PLANS.md`, and `.agent/ACTIVE_TASK.md`.
- Current task files under `.agent/tasks/phase-1.3-continuity/`:
  `SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`.
- Future-work templates under `.agent/templates/` for all four task files.
- Project documentation updates to `docs/CURRENT_STATE.md`,
  `docs/DECISIONS.md`, and `docs/ROADMAP.md`.
- A small deterministic `npm run agent:check` validator if practical, with
  tests for malformed/missing/mismatched/stale state and synthetic secrets.

## Explicit non-goals

- No real Alphaus environment connection, product testing, database query, or
  production mutation.
- No autonomous exploration, DeepSeek, oops integration, database access,
  change-directed selection, Docker L6 containment, or Phase 2 work.
- No broad repository rediscovery or rerun of old experiments beyond the
  existing local regression suite.
- No giant agent framework or database/task-management application.

## Safety constraints

- All implementation remains inside `REPOSITORIES/nightwatch/`.
- Alphaus repositories remain read-only and are not contacted by this task.
- No credentials, auth state, bearer tokens, cookies, customer data, or real
  secrets may enter task memory or tests. Validator secret tests use only fake
  synthetic values.
- Existing Nightwatch read-only and fail-closed safety constraints remain in
  force; local synthetic tests are the only runtime validation here.

## Acceptance criteria

- Fresh-session, context-compaction, checkpoint, validation, scope, and
  completion/handoff behavior is documented and routable from one small file.
- Task state has an exact next action, validation ledger, resume recipe, and
  truthful safety/history sections.
- Templates are usable for future tasks.
- Validator checks the required protocol invariants, including task identity,
  required headings/files, active status, stale SHA, and secret-like values.
- Typecheck, full Playwright suite, validator, clean-scope inspection, and
  final task documentation all pass; no Alphaus repository is modified.
