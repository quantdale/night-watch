# Nightwatch Phase 8A — Evaluated Self-Development Sandbox Foundation

Status: `FROZEN INTENT`
Frozen: 2026-08-14

## Purpose

Establish a deterministic, private, non-adopting self-development boundary
for Nightwatch's own regression/scenario corpus. An untrusted synthetic
proposer may produce only a strictly declarative
`SYNTHETIC_REGRESSION_CASE`; deterministic Nightwatch code validates scope,
deduplicates, evaluates it against local synthetic fixtures, measures bounded
coverage, runs safety/privacy gates, and emits a private evaluation result.

The trust flow is deliberately one-way:

```text
untrusted proposal → strict DTO → deterministic evaluator → private result
```

There is no source-write or adoption edge in this phase.

## Starting state

- Task ID: `phase-8a-evaluated-self-development-sandbox`.
- Canonical root:
  `/home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch`.
- Starting SHA: `9cb70d2b74075f731f787884cd1837e7b36fcf48`.
- Historical Phase 7B.3 validated implementation/substantive anchor:
  `5e7bad758efa7e5d87610c8b7878f6690bb0b821`.
- Phase 7B.3 is complete: harness PASS; real local-model canary NOT_RUN
  because `LOCAL_RUNTIME_NOT_AVAILABLE`.
- Phase 6 remains `FROZEN_BY_OWNER /
  INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Phase 8 is `IN_PROGRESS` only because this task is now durably created;
  Phase 8A is the only active slice and Phase 8B remains `NOT_STARTED`.

## Owner authorization

The owner explicitly instructed: `PROCEED WITH THE NEXT PHASE.` This records
authorization to start Phase 8A only. It does not authorize Phase 8B,
automatic source adoption, real-model self-development, generated executable
oracles, Alphaus source mutation, product traffic, DEV/NEXT/production
execution, database/infrastructure access, Git runtime writes, or publication.

## Scope

- Versioned exact-key candidate and evaluation DTOs.
- One deterministic synthetic proposer class:
  `SYNTHETIC_DETERMINISTIC`.
- One declarative candidate kind: `SYNTHETIC_REGRESSION_CASE`.
- Explicit allowlists for safe local synthetic actions and deterministic
  assertions, plus registered offline fixtures.
- Deterministic semantic identity, duplicate detection, bounded execution,
  coverage delta, safety/privacy vectors, and no-adoption result classes.
- A bounded `npm run selfdev:synthetic` wrapper and source-scoped hardening.
- Synthetic unit/adversarial/determinism tests and private local result
  persistence only when the hardened private store is reused safely.
- Sanitized task/project documentation and read-only CI with `contents: read`.

## Non-goals and prohibitions

No arbitrary JavaScript/TypeScript/shell/SQL/regex/expression execution;
source code, patches, diffs, file contents, paths, URLs, commands, prompts,
models, tools, functions, network, browser, auth, product, DEV/NEXT/
production, database, infrastructure, Alphaus repository writes, Git runtime
operations, publication, executable oracle registration, evidence/admission
authority, AI review/provider reuse, automatic source mutation, automatic
adoption, automatic follow-up, or Phase 8B behavior.

## Frozen budgets

- Maximum candidates per synthetic session: `3`.
- Maximum actions per candidate: `8`.
- Maximum assertions per candidate: `8`.
- Maximum candidate evaluation runtime: `30_000 ms`.
- Maximum synthetic session runtime: `120_000 ms`.
- Private output is small, sanitized JSON only.

## Safety contract

Every result carries a zero-valued vector for DEV, NEXT, production,
product mutations, database queries, infrastructure queries, external AI,
real model calls, publication, runtime Git writes, Nightwatch runtime source
writes, and Alphaus writes. Unsafe scope is rejected before fixture/action
execution. All execution is local and synthetic. The result always carries
`adoptionStatus: NOT_AUTHORIZED_PHASE_8A` and `publication: PROHIBITED`.

## Future boundary

The evaluator exposes result data and a narrow future-facing evaluation
interface, but no adopter, patch, source writer, registry mutation, commit,
push, or Phase 8B launcher. A future separately authorized Phase 8B must add
any source-adoption authority as a new reviewed boundary rather than widening
this one.
