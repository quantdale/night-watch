# Nightwatch Phase 8A.1 — Living ExecPlan

Status: `IN_PROGRESS`

## Purpose

Close the three Phase 8A provenance gaps with a versioned, content-addressed,
source-bound, replay-verifiable local evaluation record. The verifier remains
read-only and Phase 8B remains unauthorized.

## Starting State

- Starting SHA: `f75a547233a2a5189f157b959d309170a4ebdb57`.
- Canonical branch/root: `main` at the private Nightwatch repository.
- Phase 8: IN_PROGRESS; Phase 8A: COMPLETE historically; Phase 8B:
  NOT_STARTED.
- The three pre-fix gap probes were run before implementation and all were
  true positives.

## Scope

- Evaluation/session v2 identity and semantic validation.
- Ordered replay, fixed source bundle and contract digests, and local
  read-only Git provenance.
- Provenance-required controller, immutable exact-ID storage/read-back,
  derived trust assessment, legacy quarantine, CLIs, hardening, tests, CI,
  and durable documentation.

## Non-Goals

- Source adoption, patch/diff generation, source or Git mutation, models or
  AI, product/DEV/NEXT/production, databases/infrastructure, Alphaus writes,
  publication, or any Phase 8B task.

## Safety Constraints

- The deterministic selfDev core has no child-process, Git, network, or source
  write authority. Only the dedicated provenance boundary reads fixed local
  Git metadata and fixed authoritative bytes.
- Runtime persisted v2 artifacts require nonzero locally attested provenance;
  synthetic zero-base values are test-only.
- Private artifacts are owner-only local state, exact-ID addressed, immutable,
  sanitized, and never committed.

## Architecture / Approach

UNTRUSTED PROPOSAL → STRICT CANDIDATE → DETERMINISTIC EVALUATOR → V2
CONTENT IDENTITY → SEMANTIC STATE VALIDATION → SOURCE/BASELINE PROVENANCE →
ORDERED REPLAY → DERIVED TRUST ASSESSMENT → STOP.

## Validation Strategy

Run focused identity/state/replay/provenance/CLI tests first, then typecheck,
hardening, the existing regression suites, full Playwright, privacy/diff
review, a fresh full-history checkout, and exact GitHub workflow inspection.

## Decision Log

- Evaluation and session v2 are introduced instead of strengthening the
  ambiguous v1 semantics.
- Source bundle and contract digests are separate provenance claims.
- Documentation-only descendants may remain source-equivalent when the
  authoritative source bundle and contract are unchanged.
- Legacy v1 is readable where supported but never replay-trusted or migrated.

## Discoveries

- The pre-fix validator accepted a syntactically valid mismatched session ID,
  a recomputed impossible evaluation tuple, and a persisted zero baseline.
- Existing immutable private storage supplies the no-replace primitive needed
  by v2 without creating publication authority.

## Deferred Work

- Phase 8B controlled source adoption remains NOT_STARTED and requires a new
  owner-authorized task.
- Real model proposers, executable oracle registration, and all product/data/
  infrastructure operations remain permanently outside this task.

## Completion Criteria

All Phase 8A.1 acceptance criteria pass locally and in an isolated checkout;
the implementation checkpoint and documentation descendant are pushed without
force; the normal synthetic v2 artifact verifies exact-base then
source-equivalent-descendant; final CI is observed if readable; and the tree
is clean with Phase 8B still NOT_STARTED.

## Milestones

### M0 — Bootstrap, recovery, and gap reconfirmation (`COMPLETED`)

- Verify canonical root, clean `main`, synchronized `origin/main`, and no
  other Nightwatch writer.
- Read durable project state and completed Phase 8A task state.
- Create this task and preserve historical Phase 8A/8B status.
- Inspect current self-development source/tests and add synthetic pre-fix
  regressions for session-ID, impossible-result-state, and zero-baseline
  persistence if each gap is still present.

### M1 — Versioned v2 contracts and semantic evaluator (`COMPLETED`)

- Add strict evaluation v2/session v2/provenance/trust-assessment DTOs and
  canonical digest helpers.
- Freeze the evaluator-emitted result-state table, reason mapping, counters,
  duplicate variants, and exact candidate/evaluation/session binding.
- Keep candidate v1 and historical artifacts readable only as legacy.

### M2 — Replay and read-only provenance (`COMPLETED`)

- Add bounded replay descriptor and stateful ordered replay verifier.
- Add fixed authoritative source manifest, source bundle digest, contract
  manifest/digest, algorithm version, and exact provenance validation.
- Add a narrow no-shell local Git/source helper with clean/staged/untracked,
  ancestry, non-Git, and command-failure handling.

### M3 — v2 controller/storage and trust assessment (`COMPLETED`)

- Make persisted synthetic execution require current attested provenance and
  a nonzero real HEAD; keep in-memory tests explicitly synthetic.
- Add pre-write trust gate, exact-ID read, immutable collision behavior,
  read-back verification, legacy quarantine, and derived currentness statuses.
- Keep the core evaluator free of Git/child-process/network authority.

### M4 — CLIs, API narrowing, and hardening (`COMPLETED`)

- Upgrade `selfdev:synthetic` to v2 real local provenance and sanitized
  summary output.
- Add read-only `selfdev:verify -- --artifact-id <exact-id>` with strict
  argument rejection and no directory enumeration.
- Narrow public exports and harden the approved runtime call graph and Git
  verb/path surface.

### M5 — Adversarial tests and CI (`COMPLETED`)

- Add table-driven result-state mutation, identity, binding, replay-tamper,
  provenance/temp-Git, storage, legacy, CLI, privacy, and no-authority tests.
- Add a dedicated Phase 8A.1 CI step while preserving early hardening and
  read-only permissions/full history.

### M6 — Full validation and isolated checkout (`COMPLETED`)

- Run focused tests first, then typecheck, hardening, applicable AI/canary,
  owner/provenance, agent-state, campaign, Playwright, whitespace, privacy,
  and manual scoped diff review. Local validation is green: 562/562 full
  Playwright tests, 91/91 owner/provenance tests, and 27/27 synthetic campaign
  tests; typecheck, hardening, agent-state, whitespace, and privacy checks
  passed. The first clean clone exposed a test-fixture portability defect in
  the injected private-root location; the fixture was repaired to use a
  temporary home-directory root and the replacement checkpoint passed a
  fresh full-history clone.
- Validate a fresh full-history clone with `npm ci --ignore-scripts` and the
  deterministic checks, including a temp private root and Git provenance.

### M7 — Substantive checkpoint, acceptance artifact, and CI (`COMPLETED`)

- Update state with stable anchors, validate diff/privacy, commit/push the
  implementation-bearing checkpoint, verify `HEAD == origin/main`, and inspect
  exact substantive CI if available.
- At clean substantive SHA run one normal synthetic session, capture only its
  sanitized ID/digests/counts, and verify exact-base trust. Completed at
  `4602fac417746a30927fc19f8e4ca48ab9143cac`; exact CI run `31822125738`
  passed and the artifact verified `VERIFIED_EXACT_BASE` with replay `PASS`.

### M8 — Documentation closure and final CI (`IN_PROGRESS`)

- Update project state/safety/decisions/roadmap/architecture and task report;
  close ACTIVE_TASK only after all acceptance evidence is recorded.
- Push documentation-only descendant, reverify the same artifact as a source-
  equivalent descendant, inspect exact final CI step, and leave clean synced
  `main` without starting Phase 8B.

## Expected implementation surface

- `src/core/selfDev/types.ts`, `validation.ts`, `canonical.ts`,
  `registry.ts`, `proposer.ts`, `evaluator.ts`, `controller.ts`, `storage.ts`,
  `index.ts`, plus narrowly scoped new replay/provenance/verification modules.
- `bin/selfdev-provenance.mjs` or equivalent narrow local boundary,
  `bin/selfdev-synthetic.mjs`, `bin/selfdev-verify.mjs`, `bin/hardening-check.mjs`.
- `tests/unit/selfDev*.test.ts`, provenance/replay/CLI tests, owner-policy and
  atomic storage regressions, `.github/workflows/hardening.yml`, `package.json`.
- Phase 8A.1 task files and relevant `docs/` updates only; no Alphaus sibling
  repository changes and no private artifact JSON.

## Migration and compatibility

- Candidate v1 stays the input contract.
- Evaluation/session v2 are new persisted semantics; no v1 in-place rewrite.
- Existing v1 reads classify legacy/unverified and never become future-review
  evidence.
- Normal runtime persistence is v2-only and refuses missing/zero provenance.

## Checkpoint discipline

At every milestone: run its scoped validation, update STATE with the exact
result and next action, inspect privacy/diff, then continue. Commit/push only
validated durable checkpoints. `LAST_VALIDATED_IMPLEMENTATION_SHA` and
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` name the implementation commit; documentation
descendants use `LAST_DOCUMENTATION_CHECKPOINT_SHA`; live HEAD is discovered
from Git.

## Stop conditions

Stop and report a blocker only for repository drift, another writer,
unacceptable authority expansion, inability to safely bind provenance/replay,
required external/product/data/model/Alphaus action, or unreadable final CI
where local work is otherwise complete. Do not start Phase 8B.
