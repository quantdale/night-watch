# Phase 20 Living Plan

Task ID: phase-20-semantic-coverage-saturation
Phase: 20-SEMANTIC-COVERAGE-SATURATION
Status: IN_PROGRESS
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Starting State

- Live starting SHA: `9ee25002d9d3ed1309356467e12778a49f93389e`.
- Bootstrap verified `HEAD == origin/main` at that SHA and the worktree was
  clean.
- Phase 19 is terminal at the starting point; its records remain historical
  and are not edited.
- Existing Phase 9–19 semantic, source, campaign, replay, minimization,
  dossier, safety, and product authorities are the compatibility baseline.

## Purpose

Increase the mechanically justified semantic behavior universe and connect it
to the existing Phase 19 bug-yield loop.

## Scope

The workstreams in SPEC.md, executable synthetic fixtures/tests, safe operator
output, and durable implementation records required to prove them.

## Non-Goals

DEV/NEXT/production acceptance, infrastructure/data-layer work, sibling writes,
external publication, raw evidence, AI/self-development authority, and
heuristic semantic inference.

## Safety Constraints

LOCAL / SOURCE / SYNTHETIC only. Unknown, stale, malformed, unsupported,
ambiguous, or privacy-unsafe inputs fail closed. No new module may contact an
external environment, execute sibling source, persist raw values, or grant
execution authority.

## Architecture / Approach

Add bounded `src/core/semanticCoverage/**` DTO/analyzer/graph/evaluation/
generation modules and compose their sanitized outputs into Phase 19
coverage/planner/dossier surfaces. Preserve Phase 9–19 readers and schemas.

## Milestones

- [x] M0 — bootstrap, authority reconciliation, and continuity-v2 task setup.
- [x] M1 — discovery inventory, bounded analyzers, admission/currentness, and
  deterministic contract graph. Synthetic inventory: 22 candidates / 21
  mechanically provable / 1 explicit unsupported-syntax rejection.
- [x] M2 — relational contracts, differential engine, metamorphic relations,
  and privacy-safe projection depth. Focused semantic outcomes and hostile
  projection paths are covered by the Phase 20 suite.
- [x] M3 — contract-derived source-boundary and relational/differential/
  metamorphic fixtures, mutation measurement, richer synthetic product model,
  and an 88-case adversarial corpus.
- [x] M4 — Phase 19 coverage-gap/ranking integration, campaign composition,
  replay/minimization bindings, dossier v4 derivation depth, operator workflow,
  and source-keyed bounded caches.
- [ ] M5 — focused and compatibility-cone validation; repair all failures.
- [ ] M6 — canonical/isolated parity, durable documentation, synchronized
  checkpoint(s), and truthful external-CI inspection.

## Architecture

The new Phase 20 core will live in additive `src/core/semanticCoverage/**`
modules and compose `src/core/campaignIntelligence/**` plus the existing
`src/oracles/**` boundaries. Source reads remain confined to
`src/core/source/siblingSource.ts`; analyzers receive bounded source text and
have no execution/network/persistence authority. The contract graph is an
explainability/coverage input, not a second coverage authority.

## Validation gates

After each implementation milestone, run focused tests and update STATE.md.
The terminal cone includes:

```text
npm run typecheck
npm run hardening:check
npm run agent:check
npm run project:check
npm run campaign:synthetic
```

Also run the Phase 20 focused suite and the affected Phase 9–19 compatibility
cone. Before closure, run the canonical full Playwright suite and the
topology-correct isolated full suite, comparing exact enumeration and skip
identity parity. Do not adjust expected counts to hide failures.

## Validation Strategy

Use data-driven synthetic matrices and deterministic byte-stability tests after
each milestone, then run the focused Phase 9–20 compatibility cone and the
repository's established full canonical/isolated procedure.

## Decision Log

- M0: Phase 20 is a fresh successor task; Phase 19 remains terminal.
- M0: additive semantic-coverage modules compose Phase 19 rather than create
  a second coverage authority.

## Discoveries

Record implementation/test evidence and defects in STATE.md at each milestone;
current code and test results outrank stale durable prose.

## Deferred Work

Contained DEV/NEXT acceptance, infrastructure/data-layer work, and any source
pattern lacking fixed mechanical proof remain deferred.

## Completion Criteria

Every acceptance row is evidence-backed; benign/privacy/safety floors are
zero; focused, compatibility, typecheck, hardening, continuity, project,
canonical, and isolated validation are green with exact parity; external CI
truth is reported without retrying the standing restriction.

## Safety constraints

No real environment contact, authenticated state, database/cloud/infra work,
sibling writes, external communication, raw evidence, secrets, or new
execution authority. Unknown, stale, malformed, unsupported, ambiguous, or
privacy-unsafe inputs fail closed.

## Deferred / follow-up

Contained DEV acceptance, infrastructure/data-layer work, external CI billing
restriction, and any source contract whose proof is not mechanically
established remain deferred.
