# Task State

## Identity

Task ID: phase-8a-1-trusted-evaluation-provenance
Phase: 8A.1 — TRUSTED EVALUATION PROVENANCE + REPLAY INTEGRITY CLOSEOUT
Status: IN_PROGRESS
Starting SHA: f75a547233a2a5189f157b959d309170a4ebdb57
LAST_VALIDATED_IMPLEMENTATION_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac
LAST_DOCUMENTATION_CHECKPOINT_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac
LIVE_HEAD_AUTHORITY: DISCOVER_FROM_GIT
Branch: main
Canonical Git root: /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
Remote: origin -> quantdale/night-watch, main

## Objective

CURRENT_GOAL:
Close the three Phase 8A provenance gaps with versioned content-bound
evaluation/session records, semantic state validation, exact candidate/base
binding, ordered replay, and locally attested source provenance without any
adoption or mutation authority.

## Current Milestone

CURRENT_MILESTONE:
M8 — documentation closure and final CI (IN_PROGRESS).

## Historical status

PHASE_8_STATUS: IN_PROGRESS
PHASE_8A_STATUS: COMPLETE (historical v1 foundation)
PHASE_8A_1_STATUS: COMPLETE
PHASE_8B_STATUS: NOT_STARTED
Phase 6: FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE

## Contract decisions

SESSION_SCHEMA_V2: nightwatch.selfdev-session.private.v2
EVALUATION_SCHEMA_DECISION: introduce nightwatch.selfdev-evaluation.private.v2
PROVENANCE_SCHEMA: nightwatch.selfdev-provenance.private.v1
TRUST_ASSESSMENT_SCHEMA: nightwatch.selfdev-trust-assessment.private.v1
ALGORITHM_VERSION: nightwatch.selfdev-replay-algorithm.v1
SESSION_ID_RECOMPUTATION_STATUS: GAP_CONFIRMED — pre-fix validator checked only ID shape.
EVALUATION_STATE_MACHINE_STATUS: GAP_CONFIRMED — pre-fix validator checked enums/ID only.
CANDIDATE_BINDING_STATUS: IMPLEMENTED — strict candidate ID/digest/base/kind
binding plus ordered replay comparison.
BASELINE_BINDING_STATUS: GAP_CONFIRMED — pre-fix controller defaulted to the zero SHA.
SOURCE_BUNDLE_STATUS: IMPLEMENTED — fixed relative path manifest and
length-prefixed SHA-256 bundle digest.
CONTRACT_DIGEST_STATUS: IMPLEMENTED — declarative registry/budget/schema
manifest with separate SHA-256 digest.
READ_ONLY_GIT_PROVENANCE_STATUS: IMPLEMENTED — fixed-argv no-shell Git
metadata boundary with clean/staged/untracked/ancestry checks.
ORDERED_REPLAY_STATUS: IMPLEMENTED — fresh stateful evaluator, constant
monotonic replay clock, exact canonical evaluation comparison.
LEGACY_V1_POLICY: READABLE_WHERE_SUPPORTED / LEGACY_UNVERIFIED_NOT_ELIGIBLE / NO_MIGRATION
V2_STORAGE_STATUS: IMPLEMENTED — separate v2 namespace, exact-ID read, atomic
no-replace write, exact duplicate/conflict behavior.
READ_BACK_STATUS: IMPLEMENTED — strict read-back identity and replay gate.
PUBLIC_API_STATUS: IMPLEMENTED — raw storage constructor removed from general
selfDev index; read-only trust/replay surface remains explicit.
VERIFY_CLI_STATUS: IMPLEMENTED — exact-ID, read-only, sanitized verifier.
SYNTHETIC_CLI_V2_STATUS: IMPLEMENTED — real local provenance, nonzero HEAD,
v2 persistence and sanitized summary.

## Completed Milestones

- M0 completed: live root/main synchronization, single-writer gate, durable
  task creation, and three pre-fix gap probes all confirmed true positives.
- M1 completed: v2 DTOs, content identity, contract manifest, and canonical
  evaluator result-state invariant.
- M2 completed: bounded replay descriptor, ordered replay, fixed source bundle,
  contract digest, and read-only local Git provenance helper.
- M3 completed: provenance-required v2 controller, immutable storage/read-back,
  exact-ID read, derived trust statuses, and legacy quarantine.
- M4 completed: synthetic/verify CLI changes, explicit API surface, and
  hardening checks.
- M5 completed: 36 focused Phase 8A/8A.1 tests, dedicated CI step, and
  adversarial identity/state/replay/provenance matrix.
- M6 completed: full `npm test` Playwright regression passed 562/562;
  `npm run test:owner-provenance` passed 91/91; serial
  `npm run campaign:synthetic` passed 27/27; typecheck, hardening,
  agent-state, whitespace, and staged privacy checks passed. A parallel test
  attempt briefly collided on the synthetic fixture port and was rerun
  serially; no source failure or safety event resulted.
- The first e56e068 full-history clone failed one verify-CLI test because its
  `/tmp` private root was inside the clone's detected workspace. The policy
  behavior was correct; the fixture was repaired to use a home-directory
  temporary root, and the local focused 39-test plus full 562-test rerun
  passed.
- M6 clean-checkout closure: replacement checkpoint
  `4602fac417746a30927fc19f8e4ca48ab9143cac` passed a fresh full-history
  clone with `npm ci --ignore-scripts`, typecheck, hardening, 39 focused tests,
  91 owner/provenance tests, 27 synthetic campaign tests, synthetic v2 CLI,
  `agent:check`, and diff check.
- M7 completed: replacement substantive checkpoint and push were verified
  against `origin/main`; normal synthetic v2 persistence and exact-base
  verification passed; CI run `31822125738` passed with the dedicated Phase
  8A.1 step executed.

## Gap reconfirmation

SESSION_IDENTITY_GAP: TRUE_POSITIVE — `session:sha256:` plus 64 `f` hex
characters was accepted by the pre-fix validator despite differing from the
canonical digest of the actual artifact; the forged value was not persisted.
EVALUATION_SEMANTICS_GAP: TRUE_POSITIVE — a valid pass evaluation was mutated
to an impossible rejection-like tuple, its evaluationId was recomputed, and
the pre-fix validator accepted it.
BASELINE_SOURCE_BINDING_GAP: TRUE_POSITIVE — a normal persisted synthetic
session used the all-zero default in a temporary injected private root; no
real owner state was touched.

## Work In Progress

Implementation, focused tests, hardening, full current regression, isolated
checkout, substantive checkpoint, exact-base acceptance artifact, and
substantive CI are complete. Documentation closure is in progress. The
artifact remains owner-only local state and is not committed.

## Exact Next Action

Commit and push the documentation closure, verify the same artifact as a
source-equivalent descendant, then perform final CI/state closure without
starting Phase 8B.

## Files Changed

Implementation/configuration: `src/core/selfDev/`, `src/core/provenance/`,
`src/core/policy/privateArtifacts.ts`, `bin/selfdev-*.mjs`,
`bin/hardening-check.mjs`, `package.json`, and the dedicated workflow step.
Tests: `tests/unit/selfDev*.test.ts`. Continuity: this task directory and
`.agent/ACTIVE_TASK.md`. No private artifact JSON is in the repository.

## Acceptance artifact

ACCEPTANCE_ARTIFACT_ID: session:sha256:1266c08b365fbabc56f6bbdf631c8b979df17288c1898d40cd27dc0952bf5aed
ACCEPTANCE_ARTIFACT_BASE_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac
ACCEPTANCE_ARTIFACT_SOURCE_DIGEST: sha256:80b0db2df5d8ac7b87eded03c0b8be7ee2d58103fa83251b0b31d784d5ca3493
ACCEPTANCE_ARTIFACT_CONTRACT_DIGEST: sha256:05ad2ecf035381b58c47f3126bc844864137c57e5645df89a338cb7995a367a4
ACCEPTANCE_ARTIFACT_INITIAL_TRUST_STATUS: VERIFIED_EXACT_BASE / REPLAY_PASS
ACCEPTANCE_ARTIFACT_FINAL_DOC_DESCENDANT_STATUS: NONE

## Validation Ledger

FOCUSED_TEST_LEDGER: PASS — `npm run typecheck`; `npm run hardening:check`;
39 tests in selfDevSchema/selfDev/selfDevProvenance/selfDevCli; `git diff
--check`.
FULL_TEST_LEDGER: PASS — `npm test` 562/562; `npm run
test:owner-provenance` 91/91; `npm run campaign:synthetic` 27/27.
CLEAN_CHECKOUT_STATUS: PASS — fresh full-history clone at 4602fac passed
`npm ci --ignore-scripts`, typecheck, hardening, 39 focused tests, 91
owner/provenance tests, 27 campaign tests, synthetic v2 CLI, agent-state, and
diff check.
CI_STATUS: PASS — workflow 31822125738 at 4602fac passed; its Phase 8A.1
evaluation provenance and replay integrity matrix executed and passed. Prior
e56e068 workflow 31821592114 also passed before the clean-checkout fixture
repair.
SAFETY_EVENTS: NONE
PRIVACY_STATUS: PASS — staged diff secret/privacy-shape scan found no
credential, token, customer, auth, model, or private-artifact content.

## Decisions Made During This Task

- v2 evaluation/session schemas preserve the meaning of Phase 8A v1.
- Ordered stateful replay, not a recomputed hash, is the trust authority for
  evaluator semantics.
- Source bundle and contract digests are dual provenance claims; neither is
  sufficient alone.
- The provenance wrapper uses only fixed no-shell read-only Git commands.
- The general selfDev index does not export the raw private storage class.

## Discoveries

- All three prompt-reported gaps were TRUE_POSITIVE in the pre-fix code.
- Rejected raw proposals are unnecessary for replay because the bounded
  proposer descriptor regenerates the exact sequence and the evaluator emits
  safe identity metadata for rejected inputs.
- An isolated clone under `/tmp` detects `/tmp` as its workspace parent, so
  CLI tests must place injected private roots outside that workspace. This is
  a test-fixture portability constraint, not a relaxation of private-root
  safety.

## Blockers

None currently. Remote CI remains an observation gate after the validated
implementation is pushed; no external product/data/model action is needed.

## Safety Events

SAFETY_EVENTS: NONE. No model, product, DEV/NEXT/production, database,
infrastructure, Alphaus repository, runtime source/Git write, or publication
operation occurred. Only temporary synthetic Git repositories and fixed
read-only provenance commands were used in tests.

## Deferred / Follow-Up

- Phase 8B controlled source adoption is NOT_STARTED and must not begin.
- Any real model, executable oracle, product, data, infrastructure, or
  publication work requires a separately authorized task.

## Exact Next Action

Commit and push the documentation closure, then verify the same acceptance
artifact as a source-equivalent descendant and run final CI/state closure.

## Resume Recipe

Read AGENTS.md, docs/CURRENT_STATE.md, docs/SAFETY_MODEL.md,
docs/DECISIONS.md, docs/ROADMAP.md, docs/ARCHITECTURE.md, this task's
SPEC.md/PLAN.md/STATE.md, then inspect `git status` and live `HEAD`/`origin/main`.
Run the smallest decisive gap regression before broad edits. Never use models,
product/DEV/NEXT/production, databases/infrastructure, Alphaus writes,
runtime Git writes, source writes, or publication.

## Completion Snapshot

Not complete. The validated implementation anchor is
`4602fac417746a30927fc19f8e4ca48ab9143cac`; the exact-base acceptance artifact
and replacement CI are green. Documentation closure and descendant/final CI
verification remain. Live HEAD remains discovered from Git.
