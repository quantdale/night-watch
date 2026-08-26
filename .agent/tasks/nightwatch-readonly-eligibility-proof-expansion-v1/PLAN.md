# Living Plan — Read-Only Eligibility Proof Expansion

Task ID: nightwatch-readonly-eligibility-proof-expansion-v1
Phase: SOURCE-READONLY-ELIGIBILITY-PROOF-EXPANSION-V1
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_READONLY_ELIGIBILITY_PROOF_EXPANSION_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Prove or reject additional source-backed read-only facts without changing
Nightwatch's safety or Phase 24 authority.

## Starting State

The live starting state, source identities, and exact pre-campaign metrics are
recorded in the Starting authority section below.

## Scope

Fresh source census, existing authority audit, bounded proof-family discovery,
strict proof implementation only when justified, additive Phase 24 wiring,
adversarial/privacy/performance hardening, and local/clean/isolated closure.

## Non-Goals

No DEV/NEXT/production contact, authentication-state access, product/data/
infrastructure operations, sibling writes, publication, runtime execution,
second selector or semantic authority, or heuristic proof.

## Safety Constraints

All sibling reads use the existing confined source boundary. Unknown,
unsupported, dynamic, ambiguous, stale, or budget-limited behavior fails
closed. Raw source and values remain ephemeral and never enter persisted or
public output.

## Starting authority

- Starting local and remote `main`: `061a0ffdd94bdaa5a7ebf526f4fbb2ea96cb434b`.
- Source snapshot: `srcsnapshot:sha256:04ff583971865f335902f5ad`.
- Source config: `srcconfig:sha256:e8bdfc8f0e58d7d93a87215`.
- Surface digest: `source-surface-discovery:sha256:92ff5f61acfc63aa9b8ad7a5`.
- Gap taxonomy digest: `source-gap-taxonomy:sha256:02a38e1514a46da5ab21f90c`.
- Phase 24 portfolio digest: `portfolio:sha256:fcb3a83934a04f8c9b6c750a`.
- Approved repositories and current SHAs:
  `alphauslabs/blue-sdk-go@8883ee3d3a073352626c8c35e20e9fc5ed765373`,
  `alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`,
  `alphauslabs/grpc-chunk-parser@66802f281698dfcf0903f0a117d4637fce3fd945`,
  `mobingilabs/ouchan@565f00a87fb7616cc23c45d4ffeabee38a41c65f`,
  `mobingilabs/ripple-api@27bb007ad0c798800b6bd3b29760c966422966e7`,
  `mobingilabs/ripple-ui@d80b161b684d9153c7e5acaa65ae1752d93d8ba9`.

## Milestones

- [x] M0 — bootstrap, fetch/prune, fast-forward reconciliation, baseline gates,
  authority reads, fresh census, and continuity activation.
- [ ] M1 — deterministic exclusion-chain census and end-to-end mutability/
  read-only authority audit.
- [ ] M2 — current-source candidate proof-family census, falsification matrix,
  and frozen admission decision.
- [ ] M3 — versioned proof core, write-capability vocabulary, exact bounded
  declaration/dependency resolution, currentness, cache, and invalidation (only
  if M2 admits a family; otherwise hardening-only).
- [ ] M4 — existing source → semantic → Phase 24 integration and compatibility
  matrix; no selector/ranking/owner-policy changes.
- [ ] M5 — adversarial corpus, privacy sweep, deterministic repeats, performance
  budgets, and whole-repository Critical/High hardening.
- [ ] M6 — local authoritative gate, clean Node20 gate, canonical and
  topology-correct isolated regression, and parity reconciliation.
- [ ] M7 — documentation truth, final report, continuity closure, normal push,
  `HEAD == origin/main`, and clean-tree terminal verification.

## M1 census contract

For all discovered operations, retain sanitized counts and category-only
exclusion chains across source, route, request, response, semantic,
mutability, read-only, join/graph, replay, projection, and Phase 24 gates.
Separate hard unsafe, proof gap, unsupported syntax, ambiguity, stale/
unavailable, owner-policy, semantic, replay, containment, and runtime-binding
families. Include repository/language distributions and exact portfolio
before/after identities.

## Architecture / Approach

Start with the current source descriptor and Phase 24 bridge. Add only a small
versioned source-fact layer if M2 proves a complete family; otherwise retain
the existing authority and improve only taxonomy, census, and hardening.

## M2 proof admission gate

Admit only a current-source family with positive exemplars, exact declaration
and dependency binding, branch-complete absence-of-write proof, fixed resource
bounds, deterministic identity, source-current invalidation, no execution,
privacy-safe categorical output, and nearby positive/negative/ambiguity tests.
An incomplete cone is not a negative proof. A zero-admission decision is valid.

## M3–M4 integration rules

Read-only facts are additive source facts. They enter the existing
`RealSourceSurfaceDescriptor` and `toPhase24CandidateInput` path only. Existing
Phase 24 eligibility, selection, diversity, replay, semantic, dossier,
confidence, owner-scope, and Control Center semantics remain unchanged. Measure
read-only proof, projectability, and eligibility as separate deltas.

## M5 validation and hardening

Cover direct reads, exact safe cones, all write classes, aliases, inheritance,
traits, interfaces, dynamic calls, factories, closures/callbacks, transactions,
queues, filesystem/process/network side effects, cycles, stale dependencies,
budget limits, symlink/path shapes, and source replacement. Repeat the
integrated synthetic matrix at least three times. Reproduce and repair every
Critical/High defect in the dependency cone; record bounded Medium repairs.

## Deferred / follow-up

Any DEV acceptance, infrastructure/data work, external coordination,
deployment equivalence, runtime framework inference, unsupported language or
dynamic PHP authority, and any proof family rejected by M2 remain deferred.

## Decision Log

- M0: the live user campaign supersedes the terminal Control Center task; the
  old implementation history remains immutable.
- M0: current source and tests outrank historical prompt measurements; the
  fresh operator census is the baseline authority.

## Discoveries

M1 discoveries are recorded in STATE.md and copied here when the census and
authority audit are complete.

## Deferred Work

See Deferred / follow-up above; no external or owner-frozen operation becomes
authorized through this task.

## Completion Criteria

All applicable proof, integration, privacy, determinism, hardening,
compatibility, clean-checkout, continuity, project-truth, documentation, and
Git closure checks pass, with a truthful zero-delta result allowed.

## Validation Strategy

Typecheck, hardening, focused source/Phase24/proof suites, quality-gate spec and
inventory, semantic compatibility, synthetic campaign, owner provenance,
privacy sentinels, local and clean gates, canonical and isolated full
Playwright, continuity/audit/project checks, and `git diff --check` are required
where applicable. External GitHub Actions is not claimed unless actually
executed; this campaign does not authorize retries.
