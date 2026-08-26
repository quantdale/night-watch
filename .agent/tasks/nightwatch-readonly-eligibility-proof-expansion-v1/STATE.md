# Task State

## Identity

Task ID: nightwatch-readonly-eligibility-proof-expansion-v1
Phase: SOURCE-READONLY-ELIGIBILITY-PROOF-EXPANSION-V1
Title: Read-Only Eligibility Proof Expansion + Campaign Surface Unlock
Authorization class: NIGHTWATCH_READONLY_ELIGIBILITY_PROOF_EXPANSION_LOCAL_SOURCE_SYNTHETIC_ONLY
Status: IN_PROGRESS
Starting SHA: 061a0ffdd94bdaa5a7ebf526f4fbb2ea96cb434b
Last validated implementation SHA: aceda6699c865694e8bdd5bf600855f41e9eca7c
Last substantive checkpoint SHA: aceda6699c865694e8bdd5bf600855f41e9eca7c
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 061a0ffdd94bdaa5a7ebf526f4fbb2ea96cb434b
LAST_VALIDATED_IMPLEMENTATION_SHA: aceda6699c865694e8bdd5bf600855f41e9eca7c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: aceda6699c865694e8bdd5bf600855f41e9eca7c
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
PHASE_SOURCE_READONLY_ELIGIBILITY_PROOF_EXPANSION_V1_STATUS: IN_PROGRESS

## Objective

Build a fresh, mechanically justified read-only proof expansion only where
current approved source supports it, and route the result through existing
source and Phase 24 authorities without widening safety scope.

## Current Milestone

M5 — adversarial corpus, privacy sweep, deterministic repeats, performance
budgets, and whole-repository hardening.

## Completed Milestones

- M0 — canonical repository confirmed; `git fetch --prune origin` and
  fast-forward reconciliation passed; initial tree was clean and
  `HEAD == origin/main`.
- Baseline gates passed: `agent:check`, `agent:audit`, `project:check`,
  `typecheck`, and `hardening:check`.
- Focused source/Phase24/response-flow cone passed 95/95.
- Fresh local source census passed through the existing confined reader.
- M1 exclusion-chain census is implemented as an additive projection and
  passed its synthetic source/Phase-24 integration assertions.
- M2 candidate-family census and the zero-new-proof admission decision are
  complete; M3 proof-core work is not applicable under the fail-closed gate.
- M4 source-to-Phase-24 compatibility remains unchanged: the existing
  portfolio/selector still reports 3 eligible and 125 excluded.

## Fresh baseline snapshot

- Six approved repositories; all six `CURRENT`.
- Inventory: 1,732 files considered; 1,092 read; 1,078 admitted; 654
  rejected; 12,449,877 bytes; 440 directories; 2 budget rejections; 0
  symlink/path rejections.
- Operations/routes/contracts: 128 operations; 127 route proofs; 127 request
  contracts; 83 response contracts; 175 semantic observations.
- Joins: 128 attempted; 118 proven; 10 rejected.
- Mutability: 47 mutation-capable; 5 independently proven read-only; 76
  `READ_ONLY_METHOD_ONLY` operations; remaining operation states are mutation,
  ambiguity, or unsupported categories as surfaced by descriptors.
- Response flow: 13 attempts; 0 proven; 13 rejected; 0 resolved calls; max
  depth 0; 13 dependency declarations.
- Lifecycle: 45 `DISCOVERED`, 80 `MECHANICALLY_PROVEN`, 3 `PROJECTABLE`.
- Existing Phase 24 authority: 128 considered; 3 eligible; 125 excluded;
  portfolio digest `portfolio:sha256:fcb3a83934a04f8c9b6c750a`.
- Source gap taxonomy: 345 rejected diagnostics; 45 proof-gap surfaces; 10
  taxonomy rows; digest `source-gap-taxonomy:sha256:02a38e1514a46da5ab21f90c`.
- Source surface digest: `source-surface-discovery:sha256:92ff5f61acfc63aa9b8ad7a5`.
- Eligibility census digest: `source-eligibility-census:sha256:267a67ef25503b85397a7b46`.
- Read-only candidate census digest:
  `source-readonly-candidate-census:sha256:5e30121ae6a4eefa6f4da6ac`.

## Work In Progress

Saturate the synthetic adversarial and privacy corpus around the rejected
candidate families, repeat the live candidate census for byte-identical
determinism, measure bounded analysis cost, and audit the dependency cone for
reproducible Critical/High defects. Preserve the zero-admission decision.

## Files Changed

Continuity activation changed `.agent/ACTIVE_TASK.md`,
`.agent/EXECUTION_PROMPT.md`, and this task's SPEC/PLAN/STATE/REPORT files.
M1 adds `src/core/source/eligibilityCensus.ts`, the additive bridge field in
`src/core/source/surfaces.ts`, the local `eligibility-census` operator command,
and focused assertions in `tests/unit/phase25SurfaceDiscovery.test.ts`.
M2 adds `src/core/source/readonlyCandidateCensus.ts`, the local
`readonly-census` operator command, package scripts, and the synthetic
`tests/unit/readonlyCandidateCensus.test.ts` corpus.

## Decisions Made During This Task

- The terminal Control Center task is preserved as immutable history; this
  user-authorized campaign is a fresh successor.
- The live source operator census, not historical approximate metrics, is the
  current baseline authority.

## Discoveries

- The current source classifier proves read-only only when an exact current
  Phase 5 catalog binding is `KNOWN_READ` on a GET route. Otherwise a GET is
  `READ_ONLY_METHOD_ONLY`; non-GET routes are mutation-capable by policy.
- Source handler bodies and reachable call effects are not yet part of the
  mutability authority; the current 13 response-flow attempts are unrelated
  response-shape proof and all rejected.
- Existing Phase 24 conversion maps only `PROVEN_READ_ONLY` to READ_ONLY;
  unknown/read-only-method-only remains excluded.
- The census reproduces the authoritative baseline: 128 operations, 127
  routes, 127 requests, 83 responses, 175 semantic observations, 128 joins
  attempted with 118 proven and 10 rejected, 47 mutation-capable, 5
  read-only-proven, 76 read-only-method-only, and 3 eligible/125 excluded.
- Census lifecycle counts are 45 `DISCOVERED`, 80 `MECHANICALLY_PROVEN`, and
  3 `PROJECTABLE`; source currentness is current for all six approved repos and
  all 128 surfaces.
- Census source exclusion counts are: handler unresolved 10, mutation
  capable 47, read-only not proven 76, request contract unproven 1, response
  contract unproven 45, runtime binding missing 123, and semantic contract
  unproven 45.
- Read-only is not an isolated current unlock bottleneck: 76 surfaces carry
  `READ_ONLY_NOT_PROVEN`, zero carry it as their only source exclusion, and
  Phase 24 remains authoritative at 3 eligible/125 excluded.
- Current route-language distribution is 128 YAML surfaces; handler-language
  distribution is 126 PHP and 2 unknown; all discovered surfaces belong to
  `mobingilabs/ripple-api` because the bounded route universe is currently
  YAML-backed there.
- The census is category-only and deterministic. It contains safe IDs,
  source identities, statuses, reason codes, counts, and digests; it does not
  retain source text, literals, request/response values, or proof authority.
- Candidate census family results are: direct pure-return handler population
  0 (127 handlers rejected: 117 non-return-body syntax, 9 unavailable, 1
  non-literal expression); exact bounded declaration cone 13 attempts, 0
  complete, 13 rejected (9 dynamic dispatch, 3 unsupported helper syntax, 1
  branch-incomplete), 13 root declarations, depth 0, ambiguity 0; known-read
  registry 5 complete baseline entries with 5 positive read facts and 3
  current eligible surfaces; GET-only negative control 81 routes, 76
  method-only, 0 positive read evidence.
- Candidate-family false-positive assessment is explicit: direct literal
  syntax has low side-effect risk but no read evidence; exact cones remain high
  risk without an effect registry and have no complete current examples; the
  Phase-5 registry is exact but not new; GET-only is never authority. The
  candidate census reports 0 likely new Phase-24 unlocks.
- No independently trustworthy current source annotation, query-builder
  declaration, generated safe-method contract, or complete transitive
  read-effect registry was found beyond the existing five-entry Phase-5
  baseline. Naming, GET, comments, and absence-of-obvious-write remain
  rejected as proof.

## Exact Next Action

Run the adversarial/privacy/performance hardening matrix, then perform the
whole-repository dependency-cone audit and repair any reproduced Critical or
High defect before the integrated validation ladder.

## Blockers

None. External product, DEV, data, infrastructure, and publication work are
permanently outside this task rather than blockers.

## Safety Events

NONE — local Git, Nightwatch source/tests, and confined read-only source
intelligence only. No product, auth, data, infrastructure, sibling write,
publication, or runtime AI operation occurred.

## Validation Ledger

- `git fetch --prune origin` + `git merge --ff-only origin/main`: PASS; no
  reconciliation required.
- `npm run agent:check`: PASS with the repository's known checkpoint/legacy
  warnings before successor activation.
- `npm run agent:audit`: PASS; 75 tasks, 51 strict v2, 24 legacy, 0 strict
  errors; historical `phase-13` remains an independent legacy in-progress
  record and is not resumed by this task.
- `npm run project:check`: PASS.
- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Focused source/Phase24/response-flow suite: PASS, 95/95.
- `npm run campaign:source-gaps`: PASS; live digest and counts above, safety
  marker `NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT`.
- `node bin/nightwatch-intelligence.mjs surfaces`: PASS; existing Phase 24
  portfolio 3 eligible / 125 excluded, same portfolio digest.
- `git diff --check`: PASS before task activation.
- `npm run typecheck`: PASS after M1 census implementation.
- `npx playwright test tests/unit/phase25SurfaceDiscovery.test.ts --workers=1`:
  PASS, 3/3 after one corrected expectation (the write route has a proven
  empty request contract).
- `node bin/nightwatch-intelligence.mjs eligibility-census --json`: PASS;
  census digest `source-eligibility-census:sha256:267a67ef25503b85397a7b46`,
  safety marker `NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT`.
- `npm run typecheck`: PASS after M2 candidate census implementation.
- `npm run campaign:synthetic`: PASS, 62/62, including the candidate census
  corpus.
- `npx playwright test tests/unit/readonlyCandidateCensus.test.ts
  tests/unit/phase25SurfaceDiscovery.test.ts --workers=1`: PASS, 4/4.
- `node bin/nightwatch-intelligence.mjs readonly-census --json`: PASS;
  candidate census digest `source-readonly-candidate-census:sha256:5e30121ae6a4eefa6f4da6ac`,
  safety marker `NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT`.

## Deferred / Follow-Up

To be populated after M2 census and the final remaining bottleneck is known.

## Resume Recipe

Read this STATE and the living PLAN; inspect live Git/status/diff; continue the
exact M1 action. Do not rerun completed broad scans unless currentness or a
recorded milestone requires it.

## Completion Snapshot

IN_PROGRESS — M0 through M4 are complete. M2 rejected all new proof families;
M5 hardening and final validation remain.
