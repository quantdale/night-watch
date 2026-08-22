# REPORT — Nightwatch Phase 15H — Whole-System Integrated Hardening

Task ID: `phase-15h-whole-system-integrated-hardening`
Status: BLOCKED_EXTERNAL_CI
Authorization class: `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

Terminal classification: **every local/source gate is green on the earned
hardening tree `06ea7ca62b1d5c8770d42622d4655e942ec68336`; GitHub Actions
remains externally billing-blocked before job execution, so the mass
implementation is local-verified but not CI-verified.** No CI-green claim is
made anywhere in this report.

## 1. Bootstrap / live Git / exact authorization

- Authorization token recorded at bootstrap:
  `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`.
- Original bootstrap (earlier session): clean fetch/fast-forward to
  `7695b87c61890cabfe110e3d147a076c1b1ecea1` == origin/main; recorded as
  STARTING_SHA.
- This continuation session opened on a clean worktree at live HEAD
  `06ea7ca62b1d5c8770d42622d4655e942ec68336` (the already-pushed Phase-15H
  hardening implementation commit). Initial `git fetch` hit a transient
  network failure to github.com:443; a later fetch succeeded and confirmed
  `origin/main == HEAD == 06ea7ca62b1d5c8770d42622d4655e942ec68336` with
  zero divergence (`git rev-list --left-right --count main...origin/main`
  = `0 0`). GIT STATE WINS was honored throughout; no reset, rebase,
  force-push, or history rewrite occurred.

## 2. Phase-15P continuity reconciliation (Gate Zero)

Reproduced from Git in the earlier session and preserved: strategy-shift base
`abc9bf9c8cdc6d1ed594638be19c605d51cfd336` -> mass implementation anchor
`c2640cb08e7057eccab740942c3dc9991109ad1e` = **105 changed files / 17
implementation commits**, testing/typecheck/hardening
NOT_RUN_BY_OWNER_DIRECTION after the mass round. The historical
`PHASE_15P_A01..A16: IMPLEMENTED_FOCUSED_GREEN` lane labels were reconciled as
HISTORICAL focused-green scope only, never proof of the mass round. Earlier
focused-green history is preserved as background; all mass-round claims below
come from commands executed in these sessions.

## 3. Initial compiler result before fixes

`npm run typecheck` on the unvalidated mass anchor: **26 errors / 13 files**
(raw output preserved at `/tmp/p15h_initial_typecheck.txt` during the earlier
session). Recorded before any fix.

## 4. Defect ledger — DEF-01 .. DEF-13 (final status)

Full reproducers/root causes/regressions are in `DEFECT_LEDGER.md` (frozen in
the implementation commit `06ea7ca`). Summary:

| ID | One-line root cause | Status |
| --- | --- | --- |
| DEF-01 | A15 missed caller: `ReasonCode` de-exported while `campaign/types.ts` imports it | FIXED_BROAD_GREEN |
| DEF-02 | `knownClusters.add` name slip inside checkpoint validator | FIXED_BROAD_GREEN |
| DEF-03 | Wrong relative import depth `phase13/shadow.ts -> exploration/types` | FIXED_BROAD_GREEN |
| DEF-04 | `DEPENDENCY_MAP_VERSION` imported from wrapper instead of canonical owner | FIXED_BROAD_GREEN |
| DEF-05 | Stale vocabulary/provenance pins (8/50 vs actual 15/110) | FIXED_BROAD_GREEN |
| DEF-06 | REAL SOURCE BUG: orchestrator checkpoint() spread carried stale interruptedWork/workItemRetries into later checkpoints | FIXED_BROAD_GREEN (writer fixed; integrity validator kept strictly fail-closed) |
| DEF-07 | artifactValidation duplicate export / unrepresentable reserved success / unknown-fed array checks | FIXED_BROAD_GREEN |
| DEF-08 | CLUSTERED missing from independent PATH_TO_STATE/oracle maps | FIXED_BROAD_GREEN |
| DEF-09 | REPLAY_KIND_CAPABILITIES literals lacked const typing | FIXED_BROAD_GREEN |
| DEF-10 | corpus builders import/index seam slips; registry missing type import | FIXED_BROAD_GREEN |
| DEF-11 | Stale corpus EXPECTED count pins (events/kinds) | FIXED_BROAD_GREEN |
| DEF-12 | SELFDEV_AUTHORITATIVE_PATHS not transitively closed after A13 shared-module imports; all fixture mirrors born broken | FIXED_BROAD_GREEN |
| DEF-13 | Two Session-2-era transitionCount pins (5) not updated for canonical CLUSTERED routing (6) | FIXED_BROAD_GREEN |

**DEF-14+: NONE.** M6 campaign/provenance, both full regressions, and all
closure gates produced zero new failures; `DEFECT_LEDGER.md` therefore needed
no mutation in the docs-closure descendant (it is not an approved-checkpoint
path, and there was nothing truthful to add).

## 5. A01–A16 hardening disposition

All sixteen Phase-15P assignment surfaces were exercised post-mass-round by
the focused sweep (367 passed / 0 failed), the adversarial corpus suite, the
all-phase unit sweep (1955 passed / 0 failed / 4 skipped), and the complete
canonical regression (2063 passed / 0 failed / 4 skipped):

A01 lifecycle resolution view — HARDENED_LOCAL_GREEN; A02 vocabularies +
provenance registry (110 entries) — HARDENED_LOCAL_GREEN; A03 source movement
— HARDENED_LOCAL_GREEN; A04 dtoFramework dispatch/coherence —
HARDENED_LOCAL_GREEN; A05 CLUSTERED lifecycle (+ direct MINIMIZED->TRIAGED
compatibility edge retained) — HARDENED_LOCAL_GREEN; A06 replay envelope +
kind capability table — HARDENED_LOCAL_GREEN; A07 minimality evidence —
HARDENED_LOCAL_GREEN; A08 clustering identity convergence —
HARDENED_LOCAL_GREEN; A09 interrupted-work bookkeeping/retry ceiling/resume
refusal (incl. DEF-06 source repair) — HARDENED_LOCAL_GREEN; A10 local
readiness/analyzer/CI classification — HARDENED_LOCAL_GREEN; A11 artifact
kinds 10->14 + registration ordering — HARDENED_LOCAL_GREEN; A12 snapshot
slots/diff rules — COMPATIBILITY_GREEN; A13 private screening/narrowings —
HARDENED_LOCAL_GREEN (trust-root closure fixed per DEF-12); A14 adversarial
corpus registry/builders — HARDENED_LOCAL_GREEN (now executable); A15
deletion/de-export/version-owner convergence — VERIFIED (section 9); A16 seam
assembly/envelope validator registration/readiness optional input —
HARDENED_LOCAL_GREEN.

## 6. Handoff risk 1–10 resolution table

| # | Risk (MASS_IMPLEMENTATION_HANDOFF) | Disposition |
| --- | --- | --- |
| 1 | Entire round unvalidated; tsc expected to fail | CONFIRMED and repaired: 26 errors -> 0 (M1) |
| 2 | Lifecycle state-list pins fail on CLUSTERED | CONFIRMED: DEF-08 oracles extended to 21-edge truth |
| 3 | Provenance/vocabulary pinned counts stale | CONFIRMED: DEF-05 rosters rebuilt compile-checked |
| 4 | Retry ceiling=4 vs budget-exhaustion pin | NOT REPRODUCED (HYP-03): retry suites pass unmodified |
| 5 | Snapshot manifest shape grew required fields | NOT REPRODUCED as runtime defect (HYP-04); old snapshots compare field-wise; schema bump unnecessary |
| 6 | Readiness movement input byte-stability | VERIFIED GREEN: readiness suites pass unmodified (byte-stable when absent) |
| 7 | A13 narrowings break out-of-tree constructors | INTENDED behavior confirmed; no unintended breakage (privacy/authority suites green) |
| 8 | A15 removals lack compiler proof | CONFIRMED: DEF-01/DEF-03/DEF-04 found by tsc; full sweep in section 9 |
| 9 | Sentinel-screen regex duplication | PARTIALLY ADDRESSED by design: A13 consolidated policy/privateArtifacts; remaining copies verified non-conflicting via privacy suites; deeper consolidation remains future scope |
| 10 | CI billing-blocked throughout | STILL TRUE: section 17 |

## 7. Contract/version/schema changes introduced during hardening

None. No DTO version bumped, no schema changed, no new durable kind added.
Hardening repairs were: one writer-side undefined-override (DEF-06), import
re-points/path corrections, const typing, trust-root list extension (DEF-12),
and test-oracle/pin extensions to current mechanically-derived truth. The
reserved `replay-result-envelope` kind gained its deliberate
`ReservedArtifactKind` union member (type-level truth restoration, DEF-07;
no runtime surface change).

## 8. Adversarial corpus execution and raw quality-floor counts

- Corpus architecture became executable: 66-definition registry bound to
  deterministic builders/executors; frozen/gated classes assert blocking.
- Dedicated corpus run: **13 passed / 0 failed**, including whole-matrix
  determinism deep-equal ×3 and rehearsal determinism ×3.
- Fresh floor-bearing batch at closure (phase15pAdversarialCorpus +
  phase12YieldBacktest + phase13Shadow + phase14Analyzer +
  phase15pReleaseRehearsal + phase15pCheckpointDrift): **121 passed /
  0 failed (29.1s)**, including the three-full-rehearsals deep-equal/
  sentinel-free/false-certification-free proof.
- Quality floors (retained): determinismMismatchCount = 0; privacyLeakCount
  = 0; falseCurrentCount = 0; falseAdmissionCount = 0;
  falseMinimalityCertificationCount = 0; versionDriftExecutorEscapeCount =
  0; ownerPolicyEscapeCount = 0; malformedArtifactFalseAcceptCount = 0.

## 9. A15 deletion/de-export proof and restorations

Ground truth reproduced from Git (this session):

- **Git-level file deletions in the whole mass round: 0** — both the A15 lane
  branch (`abc9bf9..c9489e5`) and integrated main (`abc9bf9../d1668334..` ->
  `c2640cb`) contain only A(dd)/M(odify) entries. The A15 commit message's
  "17 full deletions" does not materialize as Git deletions anywhere; nothing
  was deleted, so no deleted-module reference can exist. No empty stub files
  exist either (verified by byte-size walk over the changed cone).
- De-exported surface (mechanical extraction, strategy base -> HEAD):
  **147 removed export names across 55 files** (the handoff's "137
  de-exports" used a different counting method; same scale, same conclusion).
- Surviving external references to any removed export: **0** (full-tree scan
  of `src/ corpus/ tests/ bin/ scenarios/`: 372 total hit sites, all inside
  the declaring files themselves as valid private uses/comments).
- Relative module specifiers resolving: **2996 / 2996** (0 missing targets);
  dynamic `require()/import()` sites: only Node builtin `node:crypto` — no
  dynamic path references to removed modules.
- Historical fixture mirrors: selfDev trust roots **46/46 exist on disk and
  are transitively import-closed** (fresh mechanical audit; DEF-12 fix holds).
- Compatibility dispatch: KIND_VALIDATORS 14-kind registration, dtoFramework
  dispatch, and REPLAY_KIND_CAPABILITIES tables are exercised by green suites
  (artifactValidation, dtoFramework, exploration/API suites) — no dispatch
  entry points at missing code.
- Restorations after A15: **filesRestoredAfterA15 = 0;
  deExportsRestoredAfterA15 = 1** (DEF-01 `ReasonCode` restored for a real
  supported caller; EdgeMatch stayed private). No dead code was restored.

## 10. All-phase 1–15 compatibility matrix with raw test counts

Complete unit sweep workers=1 (`npx playwright test tests/unit --project=
nightwatch --workers=1`): **1955 passed / 0 failed / 4 skipped** (exit 0,
7.4m) covering families: containment/safety/continuity (K01), observation/
journeys/replay (K02), change intelligence (K03), exploration (K04), API
synthetic (K05), Phase-6 frozen-owner-policy (K06), campaign/minimization/
triage (K07), AI quarantine/owner-review (K08), selfDev guards without
promotion (K09), semantic oracle/admission/currentness (K10), local synthetic
harness (K11), deep contracts (K12), collection semantics (K13), yield/triage
(K15), semantic campaign/shadow/replay (K16), analyzer/inventory/drift/
reporting (K18), all Phase-15/15P suites (K19). K14/K17 (Phase 11B/13B)
remain NOT_AUTHORIZED — no suite exists or is permitted. Family mapping
follows the MASS_IMPLEMENTATION_HANDOFF disposition table; absence of a
phase-numbered suite is covered by the mapped dependency-cone suites above.
The later complete canonical run re-executed every family suite again
(2063 passed / 0 failed).

## 11. campaign:synthetic and owner-provenance counts (run twice)

- M6: `npm run campaign:synthetic` = **27 passed / 0 failed** (17.9s);
  `npm run test:owner-provenance` = **91 passed / 0 failed** (10.7s).
- M9 closure re-run: **27 passed / 0 failed** (5.9s) and **91 passed /
  0 failed** (9.3s).

## 12. Canonical complete Playwright raw counts

Command: `npx playwright test --project=nightwatch --workers=1` on the
canonical tree (clean worktree == `06ea7ca`), AFTER the DEF-12/DEF-13 fixes:

- **passed = 2063, failed = 0, skipped = 4**
- duration = 4.8 minutes; exit code = 0

The earlier full run that produced 74 failures (pre-DEF-12/13) was explicitly
NOT relied upon; this is a fresh complete run after those fixes.

## 13. Topology-correct isolated complete Playwright raw counts

Isolated environment: fresh local clone at
`/tmp/nw15h-isolated/REPOSITORIES/nightwatch` (HEAD == `06ea7ca`,
no-hardlinks clone), deterministic `npm ci`, distinct proxy port
(`NIGHTWATCH_PROXY_PORT=19123`; canonical default is 18987), parent topology
reproduced with read-only symlinks
`REPOSITORIES/{alphauslabs,mobingilabs}` -> the canonical sibling org dirs
(nightwatch itself remained the isolated checkout; siblings were only read).

- First attempt WITHOUT sibling topology: 2055 passed / **8 failed** / 4
  skipped, exit 1 — all 8 failures proven topology-caused (7×
  changeIntelligenceBacktest `git cat-file` against
  `mobingilabs/{ripple-ui,ouchan}`; 1× ripple passive smoke
  `discoverRepositories` ENOENT on `REPOSITORIES/alphauslabs`). Not
  explained away; repaired by reproducing the required topology.
- After topology correction: **passed = 2063, failed = 0, skipped = 4**,
  duration = 4.8 minutes, exit code = 0.

L06 comparison: canonical 2063/0/4 == isolated 2063/0/4 — **exact match,
zero enumeration differences**; the only observed delta (2055 vs 2063) was
fully evidenced as missing sibling topology and eliminated.

## 14. Skip inventory (both full runs)

Exactly 4 skips, identical in canonical and isolated runs and identical in
count to the pre-existing M5 unit sweep (4 skipped) — no new skip:

| Test | Condition | Classification |
| --- | --- | --- |
| tests/unit/phase5Api.test.ts:195 | source-built OOPS binary unavailable (`.tmp-nightwatch/oops-build/oops`) | pre-existing environment guard |
| tests/unit/phase5Api.test.ts:244 | same | pre-existing environment guard |
| tests/unit/phase5Api.test.ts:278 | same | pre-existing environment guard |
| tests/unit/selfDevSandboxConfinement.test.ts:143 (case G) | uid/chown semantics unavailable | pre-existing environment guard |

All four are capability-availability guards (`test.skip(<condition>, …)`),
not regression-hiding skips; none was added or modified in this phase.

## 15. Privacy / authority / frozen-phase proof

- Complete Phase-15H source diff (`7695b87c..06ea7ca`, 13 source files)
  scanned: **zero** additions matching password/secret/token/bearer/cookie/
  authorization/raw*/customerValue patterns; only categorical unions, path
  lists, an undefined-override, import re-points, and comments.
- Owner-policy-before-executor: proven by green suites — campaign false-
  positive rejection before any executor callback, corpus executor-call-count
  anchors ("stops before any executor callback"), checkpoint-drift classes
  never reaching an executor callback (all inside the green canonical run).
- Pure-core boundaries: `npm run hardening:check` PASS ("offline structural
  invariants hold") at M2 and again at M9.
- Phase 6 remains FROZEN_BY_OWNER (single marker corpus definition proves
  blocking/quarantine only); Phase 11B and Phase 13B remain NOT_AUTHORIZED.
- AI outputs remain non-oracle/non-authoritative (aiReview/aiOwnerReview
  suites green inside owner-provenance pack).
- selfDev promotion authority unchanged: `nextPromotionAuthority: NONE`,
  variant B AVAILABLE_NOT_ADOPTED (project:check output).
- Execution boundary honored: no DEV/NEXT/production, no real campaign, no
  authenticated product execution, no DB/data-plane/infra operations, no
  Alphaus sibling writes (siblings touched read-only via git cat-file /
  directory listing only, plus read-only symlinks in the isolated sandbox).

## 16. agent:check / agent:audit / project:check / catalog / diff results

- `npm run agent:check` (pre-closure): PASS with 3 warnings, 0 strict errors
  — LEGACY_CONTINUITY inference (legacy pattern), STALE_IMPLEMENTATION_BASELINE
  (truthful: anchors still at 7695b87c while the unvalidated-at-that-time
  06ea7ca existed), legacy-v1 tasks not strict-validated (by policy). The
  STALE warning resolves with this closure's anchor update.
- `npm run agent:audit`: tasks=54, strict_v2=30, legacy_v1=24,
  **strict_errors=0**, legacy_warnings=28.
- `npm run project:check`: **PASS** — status PASS, activeTaskContinuity PASS,
  checkoutClean true, catalogTarget
  `src/core/selfDev/adoptedCaseCatalog.generated.ts`, catalogCount **1**,
  catalogDigest `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`,
  catalogStrategy DECLARATIVE_REGRESSION_CATALOG_PROMOTION,
  nextPromotionAuthority **NONE**.
- Catalog integrity: `git diff --stat 7695b87c..HEAD -- <catalog target>` is
  empty — count/digest **unchanged** from task start through terminal; no
  catalog mutation authorized or performed.
- `git diff --check`: PASS (no whitespace/conflict-marker errors).

## 17. Validated hardening implementation SHA and CI truth

Earned validated implementation SHA:
**`06ea7ca62b1d5c8770d42622d4655e942ec68336`**

Every gate in sections 3–16 ran against exactly this tree (worktree clean,
zero local modifications during all runs), so labeling it validated is not
retroactive relabeling of a different tree — it is the same tree that passed.

Exact GitHub Actions truth (inspected once via authenticated API; no
retry-loop):

| Field | Value |
| --- | --- |
| Run ID | 32554139535 |
| Run number / attempt | 204 / 1 |
| Workflow | Nightwatch hardening |
| Event / branch | push / main |
| Head SHA | 06ea7ca62b1d5c8770d42622d4655e942ec68336 |
| Conclusion | failure |
| Job ID | 96985562679 ("Local hardening checks") |
| Job timing | started 2026-08-22T05:21:42Z, completed 2026-08-22T05:21:43Z (~1s) |
| Steps executed | **ZERO (steps array empty)** |
| Job log | absent (BlobNotFound — nothing ever ran) |
| Failure annotation | "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings" |

Classification: **BLOCKED_EXTERNAL_CI — the external billing/spending-limit
condition prevented any step from executing.** This is a known condition,
recorded once, never retry-looped. CI is NOT green; no CI-green claim exists.

## 18. Post-push decisive local recheck

All closure gates were executed against the validated tree before the docs
closure commit (see Validation Ledger in STATE.md): typecheck PASS,
hardening:check PASS, campaign:synthetic 27/0, owner-provenance 91/0,
agent:check PASS (0 strict errors), agent:audit strict_errors=0,
project:check PASS, git diff --check PASS, floor batch 121/0.

## 19. Durable docs/continuity closure

This report plus STATE.md/PLAN.md/ACTIVE_TASK.md/docs updates form the docs
closure fast-forward (approved checkpoint paths only). The closure commit SHA
is discovered from Git (never predicted here).

## 20. Final HEAD/origin/worktree state

Recorded at closure: fast-forward push of the docs closure; requirement
HEAD == origin/main; working tree clean. Live values are discovered from Git
per LIVE_HEAD_AUTHORITY: GIT.

## 21. Residual limitations and separately gated runtime work

- CI verification of the validated SHA requires the account
  billing/spending-limit condition to be resolved by the owner; until a real
  Actions run executes its steps for `06ea7ca…` (or a documented descendant),
  the mass implementation remains VERIFIED_LOCAL_NOT_CI_VERIFIED.
- Handoff risk 1 residue: same-named public-surface export
  `validateUnifiedContractResultDto` rename remains deferred to a dedicated
  compatibility task (unchanged from PLAN Deferred Work).
- Sentinel-screen regex consolidation beyond the A13 convergence remains
  future hardening scope if separately authorized.
- Phase 9B / 10B contained DEV acceptance and Phase 11B/13B remain
  separately NOT_AUTHORIZED.

## 22. Terminal tokens

```text
PHASE_15H_STATUS: BLOCKED_EXTERNAL_CI
PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_15H_CANONICAL_FULL: VERIFIED
PHASE_15H_ISOLATED_FULL: VERIFIED
PHASE_15H_ALL_PHASE_COMPATIBILITY: VERIFIED
PHASE_15H_QUALITY_FLOORS: VERIFIED_ZERO
PHASE_6_STATUS: FROZEN_BY_OWNER
PHASE_11B_STATUS: NOT_AUTHORIZED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

## Evidence rule

Every PASS above maps to a command executed in these sessions against the
mass anchor or the hardened tree `06ea7ca`. Historical pre-mass greens are
background only. Raw integer counts are quoted verbatim from tool output.
