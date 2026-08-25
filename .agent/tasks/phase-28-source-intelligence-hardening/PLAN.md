# Phase 28 Living Plan

Task ID: phase-28-source-intelligence-hardening
Phase: 28-EVIDENCE-DRIVEN-SOURCE-INTELLIGENCE-HARDENING
Status: IN_PROGRESS
Starting SHA: 09979f6d8f22dc28d9a07bdf99e263578ee0b3e9
Authorization class: PHASE_28_EVIDENCE_DRIVEN_SOURCE_INTELLIGENCE_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Determine, from current approved source, whether any exact response/producer
family is worth admitting and otherwise harden source-gap measurement,
diagnostics, resource bounds, currentness, cache identity, and operator
explainability without changing authority boundaries.

## Starting State

- Canonical repository is clean `main`; local `HEAD == origin/main ==
  09979f6d8f22dc28d9a07bdf99e263578ee0b3e9` after fetch/prune.
- Phase 27 is complete and immutable. Its current-source response-flow
  attempt found no safe current helper/resource/DTO boundary.
- Phase 24 remains the only candidate/portfolio authority and the owner scope
  remains `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## Scope

Fresh source census, safe gap aggregation, response-flow diagnostic precision,
lexical and resolver budget hardening, cache/invalidation correctness,
determinism, privacy/adversarial tests, existing surface/operator integration,
and complete local/source/synthetic certification.

## Non-Goals

No generic PHP data-flow engine, execution, framework/container inference,
runtime/deployment/read-only inference, DEV/NEXT/production contact,
datastore/cloud/infrastructure work, Alphaus writes, publication, or new
portfolio authority.

## Safety Constraints

Sibling source is read only through the confined boundary. Raw source and
runtime values remain ephemeral. Unknown, dynamic, ambiguous, stale,
malformed, oversized, cyclic, and budget-exhausted cases fail closed. Phase 24
remains the only portfolio authority.

## Fresh census baseline (2026-08-25)

- Approved repositories: 6, all `CURRENT`; source snapshot
  `srcsnapshot:sha256:04ff583971865f335902f5ad`.
- Repository SHAs: blue-sdk-go `8883ee3d3a073352626c8c35e20e9fc5ed765373`;
  blueapi `691422e5dc81afd263d064986fb50fcb3ea432a9`; grpc-chunk-parser
  `66802f281698dfcf0903f0a117d4637fce3fd945`; ouchan
  `565f00a87fb7616cc23c45d4ffeabee38a41c65f`; ripple-api
  `27bb007ad0c798800b6bd3b29760c966422966e7`; ripple-ui
  `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`.
- Inventory: 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected;
  12,449,877 bytes; 440 directories; 2 budget rejections; zero symlink/path
  rejections. Config `srcconfig:sha256:e8bdfc8f0e58d7d93a87215` and
  extractor `nightwatch.real-source-scan-extractor.v1`.
- Surfaces: 128 operations / 127 route proofs / 127 request contracts / 83
  response contracts / 175 semantic observations / 118 proven and 10
  rejected joins; 47 mutation-capable / 5 independently proven read-only;
  lifecycle 45 `DISCOVERED`, 80 `MECHANICALLY_PROVEN`, 3 `PROJECTABLE`;
  Phase 24 3 eligible / 125 excluded.
- Response flow: 13 attempts / 0 proven / 13 rejected / 0 resolved calls /
  maximum depth 0. Rejections: 9 dynamic dispatch, 3 unsupported helper
  syntax, 1 incomplete branch. At M1 the surface projection still collapsed
  these into generic `UNSUPPORTED_SYNTAX`; M3 now preserves the resolver's
  exact categorical reason in the source-gap taxonomy.
- Producer census: zero strict single-assignment direct-literal producer
  candidates; 34 literal producers with control flow, 16 multiple assignments,
  12 no local assignment, and 4 opaque assignments among variable-return
  handlers. No producer proof family is admitted at M1.

## Architecture / Approach

Keep the existing source scan, analyzer, response-flow, graph, cache,
invalidation, review, and Phase 24 seams authoritative. Add a bounded
sanitized taxonomy projection over existing inventory/surface facts, use the
flow resolver's categorical rejection as the primary flow diagnostic, and
include all analyzer/taxonomy versions in deterministic identities where
meaning changes. Do not admit producer flow without a new current-source
evidence gate.

## Milestones

- M0 — mandatory bootstrap, live Git/source authority review, and Phase 27
  handoff read. Status: COMPLETE.
- M1 — fresh six-repository census, exact producer admission gate, and
  bounded timing/rejection baseline. Status: COMPLETE.
- M2 — taxonomy schema, category vocabulary, safe aggregate, and privacy
  contract. Status: COMPLETE — focused Phase 28 suite 7/7.
- M3 — precise response-flow diagnostic wiring and resolver resource-reason
  split. Status: COMPLETE — combined Phase 25/26/27/28 focused suite 15/15.
- M4 — lexical/declaration/index budget hardening and pathological fixtures.
  Status: COMPLETE — source, tokenizer, branch, index, and declaration limits
  are separately exercised.
- M5 — cache/currentness/invalidation/determinism hardening and regression
  matrix. Status: COMPLETE — relevant Phase 25/26/27/28 regression run 22/22;
  synthetic campaign 49/49.
- M6 — source graph, review/operator/CLI, Phase 24, and quality-gate
  integration. Status: COMPLETE — taxonomy/delta/performance are wired into
  existing discovery, invalidation, CLI, and synthetic gate seams; JSON/human
  operator projections agree semantically.
- M7 — expanded adversarial/false-positive corpus and synthetic campaign.
  Status: COMPLETE — Phase 28 focused 10/10 and combined synthetic 49/49,
  with zero false-positive admissions.
- M8 — profiling/baseline, compatibility review, documentation truth, and
  checkpoint qualification. Status: IN_PROGRESS — current docs are reconciled;
  clean local qualification remains before final closure.
- M9 — complete validation cone, disposable clean qualification, canonical/
  isolated parity, exact-head CI observation, final report, and synchronized
  `main`. Status: PENDING.

## Decision Log

- M0: live Git outranks the selected bootstrap SHA; it still matched the
  expected Phase 27 terminal commit exactly.
- M1: the fresh source snapshot reproduces Phase 27 inventory and surface
  metrics exactly. The current producer population is not branch-complete or
  single-assignment enough to justify producer-flow authority. Phase 28 is
  hardening-first; any later implementation must pass the frozen gate in
  SPEC.md.
- M1: current response-flow rejection reasons are already categorical inside
  the resolver but are hidden by the surface diagnostic's generic rejection
  code. Taxonomy work will preserve the flow code as the primary safe reason,
  with bounded secondary dimensions rather than source-derived strings.

## Validation Strategy

After each milestone run the smallest focused tests and update STATE.md.
Before each durable checkpoint inspect the diff and privacy surface. Final
validation uses the repository's current full cone: typecheck, hardening,
quality-gate spec/inventory, semantic compatibility, synthetic campaign,
owner provenance, continuity/audit/project checks, local and clean gates,
focused Phase 25/26/27/28 tests, canonical Playwright, topology-correct
isolated Playwright, and `git diff --check`.

## Discoveries

The complete current-source and producer census is recorded above. Phase 27's
surface projection currently stores a generic analyzer rejection alongside a
more precise flow rejection, causing gap aggregation to overcount
`UNSUPPORTED_SYNTAX`. The current producer population has no strict candidate.

## Deferred Work

Namespace/import resolution, inheritance/traits/interfaces, service/property
chains, dynamic dispatch, factories/DTOs/resources, runtime calls, generic
PHP data flow, and any proof family not supported by the current census remain
excluded. Follow-up priority is determined only after the final Phase 28
measurements.

## Completion Criteria

All required focused and full validation passes, no false-positive admission,
privacy surface remains clean, documentation and continuity v2 agree, clean
canonical and isolated qualification pass, exact-head CI is observed and
classified truthfully, and local `main` equals `origin/main` with a clean tree.
