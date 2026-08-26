# Living Plan — Source-to-Campaign Proof Chain Expansion

Task ID: nightwatch-source-to-campaign-proof-chain-expansion-v1
Phase: SOURCE-TO-CAMPAIGN-PROOF-CHAIN-EXPANSION-V1
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_SOURCE_TO_CAMPAIGN_PROOF_CHAIN_EXPANSION_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close the strongest current source-to-campaign proof gap without weakening
fail-closed safety, mutability classification, semantic requirements, replay,
dossier readiness, owner policy, or the existing Phase-24 selector.

## Starting State

- Live starting SHA and `origin/main`: `545f6b8d700be131e55c424d055331887ed04189`.
- Six approved repositories are current under the existing source boundary.
- Inventory: 1,732 considered / 1,092 read / 1,078 admitted / 654 rejected /
  12,449,877 bytes; 440 directories; 2 budget rejections; 0 path/symlink
  rejections.
- Source snapshot: `srcsnapshot:sha256:04ff583971865f335902f5ad`.
- Source config: `srcconfig:sha256:e8bdfc8f0e58d7d93a87215`.
- Surface digest: `source-surface-discovery:sha256:92ff5f61acfc63aa9b8ad7a5`.
- Existing gap taxonomy: `source-gap-taxonomy:sha256:02a38e1514a46da5ab21f90c`.
- Existing Phase-24 portfolio digest:
  `portfolio:sha256:fcb3a83934a04f8c9b6c750a`.
- Existing profile: 128 operations; 127 route proofs; 127 request
  contracts; 83 response contracts; 175 semantic observations; 118 proven /
  10 rejected joins; 47 mutation-capable; 5 read-only-proven; 76
  `READ_ONLY_METHOD_ONLY`; 3 eligible / 125 excluded.
- Existing response-flow profile: 13 attempts / 0 proven / 13 rejected / 0
  resolved calls / maximum depth 0.

## Scope

Fresh proof-chain census; blocker taxonomy and source/language/currentness
measurements; ranked response/semantic/runtime-binding/join/bridge
investigation; smallest justified proof expansion; additive source and
Control Center diagnostics where materially useful; adversarial/privacy/
determinism/performance hardening; local/clean/isolated closure; documentation
and Git synchronization.

## Non-Goals

No DEV/NEXT/production or auth-state work; no data/infrastructure/cloud work;
no source-repository writes; no runtime application execution; no heuristic
eligibility; no new selector, mutability registry, replay/dossier authority,
semantic model, persistence store, publication, AI authority, or promotion.

## Safety Constraints

All sibling reads use the existing path-confined reader. Proof cores are
source-only and deterministic, with explicit budgets and no child-process,
network, fs, DB, AI, selfDev, or product authority. Unknown and partial
analysis is rejected. Persisted outputs contain only safe IDs, categories,
counts, digests, and bounded diagnostics; synthetic tests use fake sentinels.

## Architecture / Approach

1. Treat the existing source surface descriptor and Phase-24 adapter as the
   baseline authority. Extend the deterministic census projection rather than
   creating a parallel selector.
2. Represent every proof-chain stage and all secondary blockers as sanitized,
   canonically ordered records. The first blocker is derived from stage
   precedence, not hand-entered.
3. Rank candidate families by potential downstream unlock, completeness,
   safety, determinism, currentness, burden, false-positive risk, fan-out,
   replay usefulness, and bug-hunting value. A family is not selected merely
   because it has many observations.
4. For the selected family, prove exact identities and currentness before
   deriving downstream facts. Integrate through existing descriptors,
   semantic/replay/dossier adapters, and the existing Phase-24 bridge only.
5. Switch explicitly through BUILD → TEST → AUDIT → FIX → HARDEN → OPTIMIZE
   → VALIDATE after substantive work, preserving every reproduced defect and
   adding permanent regressions.

## Milestones

- [x] M0 — bootstrap: read required durable memory, audit the terminal
  predecessor, fetch/prune origin, verify clean `main` and exact starting
  SHA, run baseline source and local gates, create this v2 task, and activate
  it only after cross-file consistency.
- [x] M1 — fresh proof-chain census: deterministically measure all required
  stages, first/secondary blockers, distributions, currentness, unsupported
  constructs, runtime/replay/dossier compatibility, and proof-cost metrics;
  add regression coverage for census determinism and privacy.
- [x] M2 — leverage ranking and candidate-family investigation: audit response
  contracts, semantic mappings, runtime bindings, join completeness, and the
  Phase-24 bridge; falsify at least the required adversarial families and
  record the selected proof gap or a supported no-admission decision.
- [x] M3 — proof implementation: implement the smallest reusable versioned
  source-bound authority only if M2 proves an exact current family; otherwise
  harden the census/taxonomy and preserve zero-admission.
- [x] M4 — integration: feed only admitted facts through existing source,
  semantic, runtime-binding, replay, dossier, campaign, and Control Center
  projections; verify Phase-24 remains the sole selector and measure the full
  before/after chain delta.
- [ ] M5 — adversarial hardening: run negative/privacy/currentness/
  invalidation/budget/cycle/ambiguity suites, three deterministic repeats,
  fresh-process checks, performance bounds, and dependency-cone audit; repair
  every reproduced Critical/High and bounded Medium/Low defect.
- [ ] M6 — acceptance: run typecheck, hardening, quality-gate spec/inventory,
  semantic compatibility, owner provenance, synthetic campaign, local gate,
  clean Node20 gate, continuity/audit/project checks, whitespace, canonical
  full Playwright, and topology-correct isolated parity.
- [ ] M7 — closure: reconcile only earned claims in state/report/current
  state/roadmap/decisions/architecture/safety docs, inspect privacy surface
  and complete diff, commit and push validated checkpoints without force,
  verify clean `HEAD == origin/main`, inspect external CI once if available,
  and terminalize continuity.

## Validation Strategy

Focused suites run after each implementation slice. Required terminal commands
include `npm run typecheck`, `npm run hardening:check`,
`npm run quality-gate:spec`, `npm run gate:inventory`,
`npm run campaign:synthetic`, `npm run test:owner-provenance`,
`npm run test:semantic-compat`, `npm run gate:local`, `npm run gate:clean`,
`npm run agent:check`, `npm run agent:audit`, `npm run project:check`,
`npx playwright test --project=nightwatch --workers=1`, and `git diff --check`.
The isolated run must use a fresh detached Nightwatch checkout, fresh install,
the required read-only approved-source topology, and exact skip parity.

## Decision Log

- M0: the prior read-only eligibility task is terminal immutable history; this
  task starts from live `origin/main` at `545f6b8d…` and does not resume it.
- M0: current tests/runtime evidence and the fresh confined source census
  outrank historical campaign counts.
- M1/M2/M3 decisions will be recorded here only after mechanical evidence;
  no proof family is pre-authorized by this plan.
- M1: the v2 census is an additive projection over the existing source-surface
  descriptors and Phase-24 portfolio. Its 12-stage chain, first/secondary
  blockers, structural cost, currentness, language, and family measurements
  do not select or authorize a candidate.
- M2: no response-contract, semantic-contract, runtime-binding, join-graph, or
  Phase-24 bridge expansion clears the admission bar on the current source.
  Response gaps are 45 surfaces (44 first blockers) with 13 response-flow
  attempts and 0 proven flows; semantic gaps have 0 independent surfaces;
  runtime has 5 exact bindings and 123 source-only surfaces; joins are 118
  proven / 10 rejected; and the bridge count reconciles exactly at 3 / 125.
- M3: the safe implementation is reusable census hardening, not a new proof
  family. It separates mutation classification from read-only suitability,
  validates census/portfolio counts, and emits an advisory family rank with
  explicit no-match/aligned assessments. Zero unlock is preserved.
- M4: the same census is projected through the existing Control Center source
  authority as bounded aggregate diagnostics under source-summary v2. No
  selector, mutability registry, replay authority, dossier authority, or
  second bridge was introduced.

## Discoveries

The initial current-source census reproduced the prior profile exactly. The
completed v2 census is `source-eligibility-census:sha256:1a71425620210ac5fa6af6c4`.
All 128 surfaces are current and belong to `mobingilabs/ripple-api`; route
language is YAML and resolved handler language is PHP for 126 surfaces, with
2 handler identities unresolved. The primary blocker distribution is 44
response-contract, 37 mutability-classification, 43 read-only-proof, 1 route,
and 3 complete. Runtime and replay gaps are both 123, while dossier structural
compatibility is 128. The response and semantic gaps are the same 45 surfaces;
there is no independent semantic gap to admit.

The highest-value current work is therefore observability and falsification,
not relaxed proof. Existing adversarial suites reproduce dynamic dispatch,
aliases/cycles, duplicate or multiply-defined routes, missing handlers,
unsupported syntax, same-SHA content drift, source budgets, stale snapshots,
privacy rejection, mismatched contracts, and Phase-24 invalidation. The new
census tests additionally prove that mutation-capable surfaces stop at
`READ_ONLY_PROOF`, method-only surfaces stop at
`MUTABILITY_CLASSIFICATION`, semantic gaps are distinguished from response
gaps, and portfolio/census eligibility counts cannot diverge.

## Deferred Work

DEV/NEXT/production acceptance, auth refresh, data/infrastructure/cloud
investigation, dynamic/runtime framework inference, unsupported syntax, source
changes in sibling repositories, external coordination, publication, AI/model
calls, canonical promotion, and any proof family that fails the admission bar.

## Completion Criteria

One of: exact downstream coverage unlock with full traceable proof chain;
reusable correctness/proof infrastructure with no current unlock; or an
evidence-backed no-safe-implementation result. All safety, privacy,
currentness, determinism, boundedness, local/clean/isolated, continuity,
project-truth, documentation, and Git closure requirements are satisfied.
