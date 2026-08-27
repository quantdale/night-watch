# Source-Proof Soundness + Static Discovery Hardening

## Purpose

Close the new OpenSpec campaign by hardening source-derived proof boundaries
and static discovery without weakening existing observations or the owner
freeze.

## Starting State

- Task ID: `nightwatch-source-proof-soundness-and-static-discovery-hardening-v1`
- Starting Nightwatch SHA: `54090566dad7ba3f65c9ffb2a398e4fcf1fad52b`
- Relevant architecture: bounded source readers, PHP response analyzers,
  TypeScript/JavaScript and Go route extractors, PHP declaration discovery,
  response-flow/currentness/admission/eligibility projections, and the
  existing hardening/continuity gates.
- Dependencies: the new OpenSpec proposal, design, audit, tasks, and spec;
  the completed predecessor's implementation and terminal state.
- Established facts that must not be rediscovered: the predecessor is
  terminal; the infrastructure/data layer is owner-frozen; Phase 9/10
  semantic privacy and real-source admission rules remain permanent.

## Scope

Reproduce and, where soundness failures are confirmed, repair bounded PHP
reachability and lexical-aware static discovery. Add adversarial tests,
downstream parity checks, fresh source/eligibility census evidence, and the
required closure records.

## Non-Goals

All product/data/infrastructure/cloud/authenticated execution, sibling writes,
source execution, publication, broad parser replacement, speculative family
promotion, and unrelated refactors.

## Safety Constraints

Use only local repository source, approved read-only sibling snapshots when a
fixture requires them, and synthetic values. Keep scanners deterministic,
bounded, fail-closed, and free of eval/child-process/fs/network/DB/AI/selfDev
authority beyond the existing confined source boundary.

## Architecture / Approach

First checkpoint task activation and a literal tracked-file audit. Reproduce
the public discovery probes before changing code. If the PHP direct-return
family admits implicit fallthrough, add a local path-completeness boundary
with explicit unsupported/ambiguous outcomes. Replace raw route/declaration
regex discovery with bounded lexical-aware scanning that preserves real order
and identity while excluding comments and strings. Then census all downstream
consumers, prove identity/version parity, run adversarial and differential
tests, and close the task only after the complete local acceptance sequence.

## Milestones

### M0 — Activation, baseline, and audit

- Objective: activate this fresh task and establish a current, exhaustive,
  sanitized baseline before source edits.
- Files/areas: `.agent/ACTIVE_TASK.md`, this task directory, Git topology,
  tracked manifest, project/continuity/gate commands.
- Implementation actions: create coherent v2 task records; run baseline
  checks; read/hash every tracked path; classify every path and deep-read
  executable/config/gate surfaces; record hygiene findings.
- Acceptance criteria: the reviewed path count equals the tracked count and
  the activation checkpoint is validated.
- Validation commands: `npm run agent:check`, `npm run agent:audit`,
  `npm run project:check`, `npm run hardening:check`,
  `npm run quality-gate:spec`, `npm run gate:inventory`,
  `git diff --check`
- Status: DONE

### M1 — Soundness probe reproduction

- Objective: reproduce or falsify all three mandatory claims through public
  discovery and preserve controls.
- Files/areas: synthetic fixtures/tests and the public source discovery APIs.
- Implementation actions: run PHP path cases; TS/JS and Go comment/string
  route cases; PHP real/comment/string declaration cases; capture exact safe
  outputs and classify deltas.
- Acceptance criteria: every required positive, negative, and fail-closed
  control has a deterministic result and no source edit precedes the record.
- Validation commands: focused Phase25/26/27/28 and source-analysis suites.
- Status: DONE

### M2 — PHP path-completeness hardening

- Objective: make incomplete direct-return functions ineligible while
  retaining valid complete observations.
- Files/areas: owning PHP response analyzer and its focused tests.
- Implementation actions: implement the narrow supported control-flow proof;
  reject implicit fallthrough, loops/try/yield/dynamic or ambiguous forms;
  add bounded adversarial and identity-preservation coverage.
- Acceptance criteria: incomplete cases fail closed; complete controls pass;
  no global cancellation or raw-value leakage occurs.
- Validation commands: focused Phase26/source-analysis/parity tests,
  `npm run typecheck`, `npm run hardening:check`.
- Status: DONE

### M3 — Lexical route and declaration hardening

- Objective: prevent comments and strings from creating static facts.
- Files/areas: TypeScript/JavaScript/Go route extractors, PHP declaration
  discovery, scanner helpers and focused fixtures.
- Implementation actions: add bounded lexical-aware scanners; preserve source
  order and real route identity; make PHP declaration multiplicity count only
  lexically real declarations; fail closed on unsupported/dynamic syntax.
- Acceptance criteria: mandatory false-positive probes pass; two real PHP
  declarations still reject; existing valid surfaces retain identities.
- Validation commands: focused Phase25/27/28 and source extraction/parity
  suites plus hardening/typecheck.
- Status: DONE

### M4 — Downstream parity and fresh census

- Objective: prove local rejection ownership and refresh source/eligibility
  evidence without granting promotion authority.
- Files/areas: response flow, semantic/currentness/admission/eligibility,
  source-analysis parity harnesses, census commands, project docs if truth
  changes.
- Implementation actions: perform consumer census; classify all observation,
  version, and identity changes; run fresh source/eligibility/read-only
  census; admit no more than one exact family only if the strict bar is met.
- Acceptance criteria: downstream outputs remain equal except justified
  rejects; `NO_SAFE_NEW_FAMILY` is recorded when the bar is not met; no
  candidate availability becomes promotion authority.
- Validation commands: `npm run campaign:source-gaps`,
  `npm run campaign:eligibility-census`, `npm run campaign:readonly-census`,
  `npm run test:semantic-compat`, `npm run test:owner-provenance`.
- Status: DONE

### M5 — Adversarial, performance, and full acceptance

- Objective: close all focused and repository acceptance checks with bounded
  resource use and no privacy/topology regressions.
- Files/areas: tests, local campaign harnesses, task report/state, project
  memory, Git and exact-head CI evidence.
- Implementation actions: run adversarial/differential cases; measure timing
  and RSS; execute the complete required command list, Playwright
  enumeration, disposable checkout/topology acceptance, and exact-head
  Actions observation; repair failures before closure.
- Acceptance criteria: every required gate passes or has an explicit allowed
  external classification; task records and project truth are coherent; clean
  pushed Git state is verified.
- Validation commands: the complete OpenSpec H10/H11 acceptance list.
- Status: IN_PROGRESS

## Validation Strategy

Use narrow probe and focused test results after each implementation milestone,
then run all mandatory typecheck, hardening, spec/inventory, campaign,
semantic/provenance, local/clean gate, continuity, audit, project, diff,
Playwright, topology, timing/RSS, and exact-head Actions checks. Record exact
results in STATE and REPORT; do not treat a zero-step CI run as green evidence.

## Decision Log

- 2026-08-27 — Decision: start a fresh task from live `5409056` rather than
  resume the completed runtime-hardening task; reason: the new planner prompt
  explicitly supersedes the old campaign; evidence: OpenSpec and
  `PLANNER_HANDOFF.md`; consequence: old task remains immutable.

## Discoveries

- M4 fresh census is reconciled: operation identity and handler joins are
  unchanged, 40 unsound direct response proofs were removed, and no safe new
  candidate family cleared the admission bar.

## Deferred Work

- Any candidate family that fails the strict exact-source admission bar.
- All owner-frozen infrastructure/data-layer work and any future DEV semantic
  acceptance requiring separate authorization.

## Completion Criteria

All OpenSpec tasks are complete; soundness probes and downstream parity are
validated; the tracked-file audit reconciles; every required local gate and
topology/browser/CI check is recorded; task/project continuity is terminal;
Git is pushed with local and remote heads equal and the final tree clean.
