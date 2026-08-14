# Nightwatch Phase 8A — Evaluated Self-Development Sandbox Foundation

## Purpose

Build a deterministic companion subsystem that accepts only bounded,
strictly declarative synthetic regression candidates, evaluates them against
local synthetic fixtures, and emits private evidence without source-adoption
authority.

## Starting State

- Starting SHA: 9cb70d2b74075f731f787884cd1837e7b36fcf48.
- Phase 7B.3: COMPLETE — harness PASS; real canary NOT_RUN because the local
  runtime was unavailable.
- Phase 8: NOT_STARTED at task creation; Phase 8A is the only authorized
  slice.
- Owner authorization: PROCEED WITH THE NEXT PHASE.

## Scope

- Versioned exact-key candidate and evaluation DTOs.
- Local synthetic fixture, action, assertion, coverage, identity, proposer,
  evaluator, bounded CLI, and private immutable result storage.
- Distinct owner-policy capability and source-scoped hardening checks.
- Deterministic adversarial, privacy, safety, regression, and CI coverage.
- Nightwatch documentation and native task continuity records.

## Non-Goals

- Arbitrary code, patches, diffs, file contents, URLs, commands, scripts,
  source mutation, Git runtime operations, automatic adoption, or Phase 8B.
- Real/local/cloud model execution, AI-review reuse, product traffic,
  DEV/NEXT/production, browser/auth, database/infrastructure, Alphaus writes,
  external publication, or generated executable oracles.

## Safety Constraints

- The proposer is untrusted data generation; deterministic Nightwatch code is
  the only evaluator authority; no adopter exists.
- Exact-key runtime validation rejects unknown fields and all authority-shaped
  values before fixture execution.
- Actions, assertions, fixtures, source references, and coverage classes are
  explicit registries; no callbacks, eval, expression interpreter, or oracle
  registration is available.
- Candidate and session budgets are 3 candidates, 8 actions, 8 assertions,
  30 seconds per candidate, and 120 seconds per session.
- Runtime safety vector is all zero: no product, data, infrastructure, model,
  publication, Git, Nightwatch source, or Alphaus writes.

## Architecture / Approach

UNTRUSTED SYNTHETIC PROPOSAL → STRICT DECLARATIVE DTO → REGISTERED LOCAL
FIXTURE/ACTIONS/ASSERTIONS → DETERMINISTIC EXECUTION AND COVERAGE → PRIVATE
IMMUTABLE EVALUATION RESULT → STOP.

The implementation is isolated under src/core/selfDev. The CLI is a thin
loader around the deterministic controller. Private result persistence reuses
the hardened owner-only PrivateArtifactStore under a separate
self-development namespace. No path leads from a candidate to a source
writer, Git, model, product, data, infrastructure, publication, or oracle
catalog.

## Milestones

### M0 — Bootstrap, recovery, authorization, and task routing (COMPLETE)

Reverified Git, read durable state, confirmed the single-writer condition,
recorded the explicit owner authorization, and created this native task.

### M1 — Candidate/evaluation DTOs and exact-key validators (COMPLETE)

Implemented strict versioned schemas, bounded fields, forbidden-field tests,
zero safety declaration, and deterministic semantic identity.

### M2 — Registries and identity (COMPLETE)

Implemented local synthetic fixture plus allowlisted structural actions,
assertions, source references, and coverage classes.

### M3 — Synthetic proposer and evaluator (COMPLETE)

Implemented the sole synthetic deterministic proposer and the fail-closed
deterministic evaluator with no executable candidate surface.

### M4 — Duplicate, coverage, and budget gates (COMPLETE)

Implemented deterministic duplicate fingerprints, computed coverage deltas,
and monotonic bounded candidate/session budgets.

### M5 — Private evaluation persistence (COMPLETE)

Implemented owner-only immutable session artifact persistence in the separate
self-development namespace, with exact replay verification.

### M6 — CLI, hardening, policy, and CI (COMPLETE)

Implemented the bounded synthetic CLI, distinct owner capability, source
hardening invariants, and read-only private CI matrix.

### M7 — Adversarial and deterministic regression matrix (COMPLETE)

Implemented and passed forbidden-field, unsafe-scope, unknown registry,
privacy, safety-vector, flood, duplicate, coverage, order, timestamp,
repeatability, private persistence, and no-adoption tests.

### M8 — Full validation, clean checkout, and architecture review (IN_PROGRESS)

Run focused and existing regression gates, full Playwright, privacy and
diff checks, isolated full-history validation, and the final scoped authority
review. Repair any failure before checkpointing.

### M9 — Validated checkpoint, documentation closure, and stop (PENDING)

Commit and push the validated implementation, record stable anchors, update
project/task closure records, push documentation closure, inspect exact final
CI, close ACTIVE_TASK, verify synchronization, and stop without Phase 8B.

## Validation Strategy

Use the focused Phase 8A matrix, typecheck, hardening, owner-policy,
private-artifact, agent-state, AI/canary/provenance, and synthetic campaign
tests before the full current Playwright suite. Then run a full-history
isolated clone with npm ci --ignore-scripts and the deterministic checks only.
Inspect the scoped diff, privacy surface, safety vector, Git synchronization,
and exact GitHub hardening workflow step before closure.

## Decision Log

- Phase 8A is evaluation authority only; source adoption is explicitly absent
  and deferred to separately authorized Phase 8B.
- Candidate identity excludes createdAt, filesystem paths, and randomness;
  canonical semantic data determines the candidate ID.
- Candidate claims never determine coverage; coverage is computed from the
  registered fixture/action/assertion evidence.
- Self-development uses a distinct owner operation and never reuses
  AI_REVIEW_LOCAL or AiReviewSession.

## Discoveries

- Existing private artifact persistence supplies the needed owner-only
  immutable publication primitive without adding a new storage authority.
- Playwright’s Nightwatch project uses a fixed local port, so independent
  Playwright commands must run sequentially.
- The repository agent-state checker requires its native heading and field
  syntax; this task’s continuity files were normalized to that contract.

## Deferred Work

- Phase 8B controlled source adoption is NOT_STARTED and must not begin from
  this task.
- Real-model proposer, generated executable oracles, and any broader
  self-development capability require a new explicit owner authorization and
  separate design/review.

## Completion Criteria

Complete only when all Phase 8A acceptance criteria are evidenced: strict
declarative schemas, deterministic registries/proposer/evaluator/identity,
bounded duplicate and coverage gates, zero safety/privacy violations, no
runtime source/Git/product/data/model/publication authority, private result
persistence, focused and full regression, clean isolated checkout, exact
final CI success, stable anchors, clean synchronized Git, Phase 8A COMPLETE,
Phase 8 IN_PROGRESS, and Phase 8B NOT_STARTED.
