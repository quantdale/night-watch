# Living Plan — Source-Analysis Runtime Hardening

Task ID: nightwatch-source-analysis-runtime-hardening-v1
Phase: SOURCE-ANALYSIS-RUNTIME-HARDENING-V1
Status: IN_PROGRESS
Authorization class: NIGHTWATCH_SOURCE_ANALYSIS_RUNTIME_HARDENING_LOCAL_SOURCE_SYNTHETIC_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Execute every ordered task in the OpenSpec change while preserving proof
identity and Nightwatch's local/source/synthetic safety model.

## Starting State

- Starting/live `main`: `bebe357313b7210161c5524e90c442137a605aab` after a
  fast-forward pull from `origin/main`.
- Worktree clean and local `HEAD == origin/main` at activation.
- Planned-from: `910ff0f65aaf966aae20e4c72fe8b695e66038e4`; intervening commits
  contain the prior optimization closure and this campaign's OpenSpec plan.
- Baseline pre-activation: `hardening:check` PASS; `agent:check` and
  `project:check` intentionally reported stale predecessor routing until this
  fresh task was activated; `agent:audit` had zero strict errors.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, TypeScript `5.9.3`.

## Scope

Tracked-file audit; duplicated bin TypeScript loader mechanics; exact source
read reuse in discovery/integration; optional shared immutable parse/token work
only after proof; differential safe-observable harness; adversarial/privacy/
determinism hardening; source/eligibility/Phase 24 compatibility; performance;
local, clean, canonical, isolated, continuity, project, and Git closure.

## Non-Goals

No product or environment execution, new source-proof/selection authority,
Phase 29, worker parallelism, disk source cache, broad monolith split, sibling
write, data/infra work, runtime AI, or self-development promotion.

## Safety Constraints

All work stays within the repository and synthetic fixtures, plus approved
confined read-only source metadata where a task explicitly requires it. No
credentials, auth state, raw source/value, customer data, owner-only finding,
or external publication may enter this task or Git.

## Milestones

- [x] M0 — bootstrap: pull/reconcile Git, read authority and OpenSpec records,
  run pre-edit baseline, create/activate this continuity-v2 task.
- [x] M1 — exhaustive tracked-file and affected-path audit; baseline source
  census, loader census, hygiene review, timings/RSS and safe output captures.
- [x] M2 — build the complete differential parity harness before optimization;
  include byte-stable CLI checks, repeated-symbol fixtures, and mutation probes.
- [x] M3 — centralize equivalent TypeScript runtime loading, add only proven
  process-local compiler-derivative reuse, migrate incrementally, and test
  restoration/invalidation/fallback behavior.
- [x] M4 — instrument and implement call-scoped exact-snapshot source-read
  reuse; prove identity separation, privacy, bounds, fail-closed behavior and
  parity across source/join/eligibility paths.
- [x] M5 — measure residual parser/token cost; admit shared parse work only if
  exact symbol-specific parity is provable, otherwise record rejection while
  retaining M3/M4 wins.
- [ ] M6 — adversarial hardening for collisions, symbols, mtimes/content,
  malformed/privacy/stale/unavailable input, exceptions, concurrency and proof
  non-manufacture.
- [ ] M7 — repository-wide architecture/hygiene and affected compatibility
  sweep; validate operator, Control Center, manifests, source gaps, Phase 24,
  synthetic and provenance surfaces.
- [ ] M8 — repeat timings/RSS and execute all required local acceptance,
  semantic compatibility, synthetic/provenance, clean Node20, and isolated
  parity gates.
- [ ] M9 — use remaining productive budget for in-scope regression hunting,
  reconcile all records/docs, inspect privacy/diff, commit/push, observe exact
  Actions truth once, and write final report.

## Validation Strategy

1. Focused tests after each implementation slice.
2. Differential identity and CLI-byte harness after each candidate.
3. `typecheck`, `hardening:check`, `project:check`, `agent:check`,
   `agent:audit`, focused source/analyzer/eligibility/response tests.
4. `campaign:synthetic`, `test:owner-provenance`, `test:semantic-compat`,
   `gate:local`, current Node20 clean gate, and affected canonical/isolated
   parity.
5. Final `git diff --check`, privacy surface inspection, normal fast-forward
   push, exact-head Actions observation, and post-push Git equality.

## Architecture / Approach

Build the differential safe-observable harness first. Keep existing source,
analyzer, evidence, currentness, eligibility, Phase 24, replay, dossier,
operator, and Control Center authorities authoritative. Add a single explicit
loader profile layer and a call-scoped source read view only where the census
and parity evidence admit them. Treat parser sharing as optional and reject it
if exact symbol-specific evidence identity cannot be proven.

## Decision rules

- Current tests/runtime evidence outrank assumptions and stale plan text.
- A same-input identity drift is a hard stop unless it exposes a separately
  reproduced correctness defect with the required versioning and authority.
- A cache miss, corrupt entry, uncertain identity, exception, or unsupported
  state may cost time or fail closed; it may never yield a proof.
- Large files/configs are review targets, not automatic refactor scope.
- Document rejected/deferred candidates under `Deferred / Follow-Up` rather
  than manufacturing work or widening authority.

## Decision Log

- M0-01: The predecessor systemic-optimization task remains terminal history;
  this fresh OpenSpec campaign gets its own continuity-v2 task and active route.
- M0-02: The pulled head is the baseline authority after reconciling all
  commits after the planner's planned-from SHA.
- M3-01: No persistent derivative cache was justified by the measured baseline;
  process-local compiler output is sufficient and has smaller privacy and
  interruption surface.
- M4-01: Positive source text is cached only after an exact post-scan digest
  check; all uncertain identities use the existing reader path.
- M5-01: A measured but cross-authority parser optimization is not admitted
  without an exact evidence-identity proof; independent loader/read wins stay
  in scope and the parser candidate is recorded as rejected.

## Discoveries

- The OpenSpec change contains 53 ordered tasks and is ready for application.
- The first pre-activation continuity failure was stale predecessor routing,
  not a source correctness failure. Activation fixes routing without changing
  the predecessor record.
- The exhaustive tracked manifest contains 1,303 paths and hashes 14,211,727
  bytes. Classification is 435 agent/tooling/planning, 405 executable source,
  228 tests, 112 fixture/corpus, 49 bin entrypoints, 30 durable docs, 25
  config/workflow, 14 UI, 1 scenario, 1 artifact scaffold and 3 other
  tracked files.
- The affected TypeScript runtime seam is 20 bin-local `.ts` require hooks;
  all 20 use ES2022/CommonJS/Node10/esModuleInterop/skipLibCheck and restore
  the previous hook in `finally`. `bin/portfolio.mjs` has a separate
  compile-fingerprint mechanism and is not a duplicate require hook.
- Source discovery has one production operator caller
  (`bin/nightwatch-intelligence.mjs`), one Control Center authority adapter,
  and synthetic/unit/browser consumers. Exact source reads occur in the
  confined sibling reader, scan inventory, response-flow indexing, joins,
  per-operation observations, readonly census and semantic expectation paths.
- Hygiene counts are TODO 11, FIXME 2, HACK 3, XXX 1, DEPRECATED 30,
  dead-path 4 and duplicate 1,401 matches. Manual review classified the
  duplicate matches as intentional duplicate detection, deduplication,
  historical records, or fixtures; no unrelated source cleanup is admitted.
- The parity harness projects every deterministic discovery and Phase 24
  field, plus the review queue, while deliberately excluding only advisory
  elapsed timings. A same-handler-file synthetic fixture proved distinct
  symbols retain distinct response evidence and semantic identities, and the
  serialized safe projection excludes its raw marker.
- The first harness run passed three tests, including temporary order,
  identity and currentness mutation probes. The probes were removed after
  proving each caused `SOURCE_PARITY_MISMATCH`; the retained harness run is
  two tests passing, including byte equality for `contracts`, `differential`
  and `mutation-score` CLI JSON, with zero stderr and status 0.
- M3 completed at `dc368eb`: all 20 equivalent bin-local TypeScript hooks now
  delegate to one explicit-profile loader; the loader suite passes 4/4,
  including content/mtime/profile/nested-error controls. The default profile
  preserves the audited ES2022/CommonJS/Node10 options; process-local output
  reuse is bounded and no disk cache was admitted.
- M4 completed at `dc368eb`: the discovery path uses the bounded
  `createCallScopedSourceReadView` only after `scanSource` establishes exact
  file identities. The focused read-reuse suite passes 4/4, including
  cross-repository/snapshot separation and stale/rejected/unavailable fallback;
  the affected source cone retained parity and hardening/typecheck passed.
- M5 completed: repeated same-method `--json` source-census measurements kept
  the snapshot and normalized safe projections identical; tokenizer metrics
  remained 94 files/766 declarations/32,027 max tokens/242,093 max bytes. A
  V8 profile measured `tokenizePhp` at 284 of 4,409 ticks (6.4%). Shared parse
  state was rejected because safe reuse would bridge independent Phase 14,
  Phase 20 and Phase 26 analyzer contracts with per-symbol/hint inputs; no
  same-input identity proof was available at this checkpoint.

## Deferred Work

Populate only with evidence-backed candidates rejected within this campaign,
including reasons and any required future authorization.

## Completion Criteria

All 53 OpenSpec tasks are marked complete only with evidence in STATE/REPORT;
all required local, clean, canonical, isolated, continuity, project, privacy,
and Git checks pass; exact-head Actions is truthfully classified; the final
tree is clean and local `HEAD == origin/main`.
