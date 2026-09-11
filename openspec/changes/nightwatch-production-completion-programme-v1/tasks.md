# Tasks — Nightwatch production completion programme

Each numbered group is a separately ownable campaign under C-00: one owned
session worktree, one session identity, `session:status` PASS before work,
fast-forward integration, session released.

Groups 1–13 close the record-level gaps (F-01 … F-12). Groups 14–21 close the
code-level gaps the second pass found by tracing the implementation
(F-13 … F-21). The numbering is stable, not the execution order.

**Execution order.**

1. Group 1, then 2 — nothing below is estimable against an untrustworthy
   ledger.
2. Group 14 → 15 → 16 → 17, in that order. The loader's literal-path
   requirement (15.1) precedes reachability (14.2) and symbol verification;
   the dead-architecture decision (14.6) precedes the schema lifecycle (17)
   because whether `dtoFramework` is adopted determines how the lifecycle is
   built; `bin/**` type checking (15.5) precedes the rule-engine decomposition
   (16.9) so the decomposition is checked as it lands.
3. Groups 3, 4, 5, 6, 7, 9, 20, 21 in parallel, one owner each — no shared
   surface.
4. Groups 19 → 8 → 18 in that order, single owner: all three edit `App.tsx`,
   and decomposition (19.8) must land first so the other two work in the
   decomposed layout.
5. Group 10 and 11 as their owner decisions land; group 12 once the provider
   pre-flight passes.
6. Group 13 last by construction — its conditions reference every check the
   others create.

## 1. Ledger truth and the spec baseline

- [x] 1.1 Open the campaign task directory, routing block and this OpenSpec
      change from live Git truth; record the measured baseline at the starting
      SHA rather than copying `audit.md`
- [x] 1.2 Build the change↔task pairing report: for all 57 changes and 148 task
      directories, emit change id, task id, task `STATE.md` status, open entry
      count, `DECLARED_NOT_IN_SCOPE` count, and orphan class
- [x] 1.3 Reconcile `nightwatch-residual-closure-and-lane-qualification-v1`
      (27 entries) from its `STATE.md`/`REPORT.md`
- [x] 1.4 Reconcile `nightwatch-repository-hardening-implementation-v1` (19)
- [x] 1.5 Reconcile `nightwatch-overnight-reliability-r13-v1` (8) and
      `nightwatch-system-map-v2-transport-c15c-v1` (7)
- [x] 1.6 Reconcile the four C-0x/C-15b source-intelligence changes: c02b (12),
      c03 (11), c04 (10), c15b (11)
- [x] 1.7 Reconcile c10 (24), c01 (8), `continuous-deep-hardening` (10),
      `post-acceptance-…` (15), `operational-acceptance` (10)
- [x] 1.8 Reconcile `final-assurance-release-readiness-hardening-v1` as
      terminal BLOCKED with its blocker preserved, not as done
- [x] 1.9 Carry every entry that is genuinely undone into this `tasks.md` or
      strike it through with a stated reason; tick nothing that was not done
- [x] 1.10 Assert the reconciliation diff touches only checkboxes,
      strikethroughs and added reasons — no receipt, SHA, count or date
- [x] 1.11 Implement the ledger agreement check in `bin/agent-state.mjs`:
      `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS`, `LEDGER_CHANGE_WITHOUT_TASK`,
      `LEDGER_TASK_WITHOUT_CHANGE`, `DECLARED_NOT_IN_SCOPE`
- [x] 1.12 Run the check in reporting mode over all 148 task directories;
      require zero false positives before registration
- [x] 1.13 Register the check in the `AGENT_CONTINUITY` required group of
      `config/quality-gate.v1.json`; negative-probe it by reopening one box
- [x] 1.14 Classify every terminal change as capability-bearing or
      infrastructure/tooling/docs; record the classification and reason
- [x] 1.15 Archive oldest-first with `openspec archive`, `--skip-specs` where
      classified; stop at the first validation failure; never `--no-validate`
- [x] 1.16 Verify `openspec/specs/` is non-empty, `openspec list --specs`
      returns a set, and `openspec validate --all` exits zero
- [x] 1.17 Derive the open-work report in `bin/nightwatch-status.mjs`; assert no
      field is hand-maintained
- [ ] 1.18 Root `typecheck`, `hardening:check`, `agent:check`,
      `validation:universe`, `gate:local`; integrate; release the session

## 2. Validation lane state as data

- [x] 2.1 Define `nightwatch.validation-lane-state.v1`: lane id, class,
      evidence, evidence SHA, unblock/acquisition condition, revisit date
- [x] 2.2 Populate all ten declared lanes from the recorded evidence in
      `docs/CURRENT_STATE.md` and `docs/HOST-CAPABILITY-MATRIX.md` §4a
- [x] 2.3 Emit the record from `bin/validation-universe.mjs`
- [x] 2.4 `hardening:check`: every class in
      `config/validation-universe.v1.json` has exactly one lane-state entry;
      missing, duplicate or condition-less non-PROVEN entries fail
- [x] 2.5 Compute `STALE_EVIDENCE` against
      `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`; report, never store, the staleness
- [x] 2.6 `agent:check` reports an expired revisit date on any lane record
- [x] 2.7 Negative probes: a lane with no entry, a duplicate entry, a
      non-PROVEN entry with an empty condition, an expired revisit date
- [ ] 2.8 Register, refresh `inventoryDigest`, `gate:local`, integrate, release

## 3. CI-topology clean gate and exact-head CI authority

- [ ] 3.1 Build `gate:topology`: run the authoritative gate under independently
      togglable absences — sibling root unreadable, `bwrap` unreachable, Chrome
      unreachable, fresh `$HOME`
- [ ] 3.2 Create the sibling-absent condition by making the real
      `DEFAULT_SIBLING_ROOT` path unreadable, never by editing the constant
- [ ] 3.3 Prove the fail-closed path under each absence: capability reported
      UNSUPPORTED with a blocker code; no lane passes by inheritance
- [ ] 3.4 Assert the inverse: a lane reporting PASS while its capability is
      absent fails the topology gate, naming the lane and the active absence
- [ ] 3.5 Reproduce the two known run-`33572572053` defect classes and add
      permanent categorical regressions — no test may depend on an absolute
      path outside the checkout, or invoke a binary with no capability probe
- [ ] 3.6 Register `gate:topology` in `config/validation-universe.v1.json` and
      the gate manifest; assert membership; refresh `inventoryDigest`
- [ ] 3.7 Extend the CI block record with run identity, job identity, block
      class, observation date, named owner action and revisit condition
- [ ] 3.8 `project:check` fails `CI_BLOCK_RECORD_INCOMPLETE`; `agent:check`
      reports `CI_BLOCK_RECORD_STALE` on an expired record
- [ ] 3.9 `project:check` refuses a certification whose `CI_OBSERVED_SHA` does
      not match the certified checkpoint
- [ ] 3.10 Record the three candidate CI routes with trade-offs; assert no
      substitute receipt can set `CI_EXECUTED_SHA`; classify a local `gate:ci`
      execution `LOCAL_NOT_CI`
- [ ] 3.11 **Owner decision required:** select the CI route
- [ ] 3.12 Full validation, integrate, release

## 4. Operator CLI contract

- [x] 4.1 Implement the shared parser in `bin/lib/`: declared metadata, help
      rendering, unknown/malformed/conflicting/positional refusal, exit-code and
      `--json` convention
- [x] 4.2 Build the exhaustive sweep over every tracked `bin/*.mjs`; assert a
      non-zero discovered count before any other assertion
- [x] 4.3 Measure side-effect freedom under `--help`: working tree,
      `artifacts/` and `$HOME/.nightwatch` unchanged; a change fails the case
- [x] 4.4 Migrate `bin/quality-gate.mjs` first and prove
      `quality-gate.mjs local --help` prints usage and exits within one second
- [ ] 4.5 Migrate the remaining 61 entry points in batches; the sweep counts
      conformance in reporting mode throughout
- [ ] 4.6 Apply the exit-code convention: 0 success, 1 failure, 2 usage,
      3 fail-closed refusal, 4 external block
- [ ] 4.7 Bring existing JSON emitters to the convention without changing their
      payload semantics; assert stdout parses as exactly one document
- [ ] 4.8 Assert no usage or error text carries a credential or an absolute
      path outside the checkout
- [x] 4.9 Derive the grouped command listing from declared metadata; point
      `README.md` at it instead of enumerating scripts
- [ ] 4.10 Turn on the structural rule requiring the shared parser once all 62
      conform; negative-probe with a non-conforming bin
- [ ] 4.11 Register the sweep, refresh the digest, full validation, integrate

## 5. Evidence lifecycle hygiene

- [x] 5.1 Re-derive the refusal set from current tracked state; run
      `retention:plan` and record the measured candidate and refusal totals
- [x] 5.2 Assert unprovable-means-refused with a negative probe
- [ ] 5.3 **Owner decision required:** approve the reclaim and the retention
      window
- [ ] 5.4 Execute `--apply` behind an explicit confirmation token; record
      deleted set, byte total, SHA, refusal set and date
- [x] 5.5 Resolve Playwright output to one configured root across the eleven
      root `playwright.*.config.ts` files; move scratch under one ignored root
- [x] 5.6 Extend `hygiene:clean` to the 19 historical `test-results*` roots and
      the 4 `.tmp-*` trees; dry-run lists exactly what it would remove
- [x] 5.7 Assert `hygiene:clean` never touches `artifacts/`, the finding store,
      the review store or any tracked file; `git status --porcelain` unchanged
- [ ] 5.8 Structural rule rejecting a new root-level output or scratch path
- [ ] 5.9 Measure the steady-state footprint (checkout, `node_modules`, one
      run's artifacts, accumulated evidence); record it in
      `docs/HOST-CAPABILITY-MATRIX.md` §1 under the census-figure ledger
- [ ] 5.10 Full validation, integrate, release

## 6. Workspace and continuity drift closure

- [x] 6.1 Extend `WORKSPACE_WORKTREE_METADATA` to resolve each claim's task id
      against `.agent/tasks/<id>/STATE.md`
- [x] 6.2 Report `CLAIM_TASK_TERMINAL` and `CLAIM_TASK_UNKNOWN`; raise
      `attention`; name the owner action; modify nothing automatically
- [x] 6.3 Negative probes: a terminal-task claim, an unknown-task claim, a
      live in-progress claim that must still pass
- [ ] 6.4 Clear the canonical `CANONICAL_MAINTENANCE` claim naming
      `nightwatch-control-center-render-truth-v1`, through the session CLI
      — OWNER ACTION; current state verified, not performed (see record)
- [ ] 6.5 Release `nightwatch-repository-hardening--e7b9be89` through the
      session CLI, by its owner; never by directory deletion
      — OTHER-OWNER ACTION; current state verified, not performed (see record)
- [ ] 6.6 Verify `session:status` reports `attention=0` with no
      `CLAIM_TASK_TERMINAL` and C-00 invariants unchanged
      — BLOCKED by 6.4/6.5; `attention=2` is the correct current reading
- [x] 6.7 Disposition all 31 legacy v1 records: migrated, or
      `PERMANENTLY_HISTORICAL` with a one-line reason; alter no existing line
- [x] 6.8 Exclude declared-historical records from the warning count; assert
      `agent:check` reaches zero legacy warnings and that a new undeclared
      record raises it to one
- [x] 6.9 Classify all 16 non-merged branches from the actual diff against
      `main`, citing unique commits
- [ ] 6.10 **Owner decision required:** approve per-branch deletion; exclude
      any branch held by a registered worktree
- [ ] 6.11 Full validation, integrate, release
      — PARTIAL: validation executed and recorded; integration/release are the
      session owner's action and were not performed by this local worker

### Group 6 record — executed 2026-09-12 in session `nightwatch-production-completion-3d648499`

6.1–6.3. `WORKSPACE_WORKTREE_METADATA` now resolves every valid claim's task id
against `.agent/tasks/<id>/STATE.md` (`resolveClaimTask` in
`bin/workspace-integrity.mjs`). `CLAIM_TASK_TERMINAL` covers STATUS COMPLETE or
BLOCKED; `CLAIM_TASK_UNKNOWN` covers a missing/unreadable STATE.md or an
unrecognized Status. Both raise
`bootstrapAnswers.worktreesRequiringOwnerAttention` and carry the named owner
action; the core remains read-only. Probes in
`tests/unit/workspaceIsolation.test.ts`: a live IN_PROGRESS claim passes with
zero findings, a live COMPLETE claim and a live BLOCKED claim raise attention
with exit status 0 and a byte-identical ownership record, an unknown task id
raises `CLAIM_TASK_UNKNOWN`, and the canonical maintenance claim names the
re-point/release action.

6.4/6.5 owner actions, not performed. Verified current state: the canonical
checkout holds a `CANONICAL_MAINTENANCE` claim whose task
`nightwatch-control-center-render-truth-v1` is terminal COMPLETE
(`live=false`), and `session/nightwatch-repository-hardening--e7b9be89` is a
live `OWNED_SESSION` whose task
`nightwatch-repository-hardening-implementation-v1` is terminal COMPLETE.
`session:status` reports both as ATTENTION with their owner actions.

6.6 is blocked by 6.4/6.5: `attention=2` is the truthful current reading until
the two claims above are cleared through the session CLI.

6.7/6.8. All 31 legacy v1 records carry an appended, append-only
`LEGACY_V1_DISPOSITION: PERMANENTLY_HISTORICAL — <one-line reason>`
declaration; no existing line was changed. `agent:check` now reports
`legacy_v1=31 legacy_declared=31 legacy_undeclared=0 strict_errors=0
legacy_warnings=0`; `legacy_warnings` now counts only legacy-record warnings,
so the 10 inferred-anchor advisories on v2 records no longer inflate it. A new
undeclared legacy record raises `legacy_warnings` to one, and a reasonless
`PERMANENTLY_HISTORICAL` line does not suppress the warning; probes in
`tests/unit/agent-state.test.ts`.

6.9 measured with read-only Git queries against `origin/main` = `fe6226ad`.
The R-05 set is 16 branches; `session/nightwatch-repository-hardening--e7b9be89`
is now MERGED (`ahead=0`) and is held by a live worktree, so it is neither
non-merged nor a deletion candidate. The full current non-merged set is 17
branches (R-05's 16 plus this programme's live session branch). "Superseded"
means every changed path is byte-identical to `origin/main`; "KEEP" means at
least one changed path differs there.

| Branch | Unique commits vs `origin/main` | Content | Classification |
|---|---|---|---|
| `session/nightwatch-production-completion-3d648499` | 93291183, 6a4c1602, 359c00ac, 5a687602, e95ec385, 35166687, e51fedb2, 51306911, 0b30953b, 229f64c5, 171d0306, 132152b1, 0be26da9, e5604a5a, 5c574dc5 | 448 paths differ | KEEP — live programme session, held by a registered worktree; never a deletion candidate |
| `session/nightwatch-reproduction-surface--516a6313` | e09bfef0 | 2 identical, 1 differ (`src/core/agentRuntime/types.ts`) | KEEP — unique content differs from `main`; W10 wave of `nightwatch-autonomous-bug-hunting-programme-v1` |
| `session/nightwatch-reproduction-surface--ce18f499` | fd8381bf | 3 identical, 0 differ | SUPERSEDED — its content is byte-identical on `main`; W10 wave |
| `session/nightwatch-review-operations-his-7431812c` | 725c7a0f, 0b15cfb0, ead92485, c9edef90, 6eb2a0b6, 2a05a0d6, 1ea6e240, a60526b9, c0a061bb, d18c68e2, b67c3995, bfc606c7, f51c233b, 52ea2179, 7214d67f, 7c7d4440 | 72 paths differ | KEEP — parked review-operations/history work of `nightwatch-autonomous-bug-hunting-programme-v1`; content differs from `main` |
| `session/nightwatch-w7-context-providers--6f5b5426` | 26048528 | 3 differ | KEEP — W7 wave content differs from `main` |
| `session/nightwatch-w7-mechanical-admissi-b7ada8d7` | f0d40777 | 1 identical, 3 differ | KEEP — W7 wave content differs from `main` |
| `session/nightwatch-w7-programme-identity-91c69c22` | 13313b5e | 3 identical, 0 differ | SUPERSEDED — its content is byte-identical on `main`; W7 wave |
| `session/nightwatch-w7-replay-parity-v1-1f495e51` | 153cb1d5 | 1 identical, 4 differ | KEEP — W7 wave content differs from `main` |
| `session/nightwatch-w8-campaign-diversity-f4bd878c` | c33535ae | 1 identical, 1 differ | KEEP — W8 wave content differs from `main` |
| `session/nightwatch-w8-efficacy-depth-lan-8c27e81c` | e1b3c087 | 4 identical, 2 differ | KEEP — W8 wave content differs from `main` |
| `session/nightwatch-w8-leakage-proof-lane-ae9ac68a` | 9352bac5 | 1 identical, 0 differ | SUPERSEDED — its content is byte-identical on `main`; W8 wave |
| `session/nightwatch-w8-memory-proof-lane--e5504c9e` | fe4033fa | 2 identical, 0 differ | SUPERSEDED — its content is byte-identical on `main`; W8 wave |
| `session/nightwatch-w8-prompt-adapter-lan-340b9c8d` | 20fbd08d | 1 identical, 1 differ | KEEP — W8 wave content differs from `main` |
| `session/nightwatch-w9-current-source-adm-adc6d9b4` | 228e18ab | 2 identical, 0 differ | SUPERSEDED — its content is byte-identical on `main`; W9 wave |
| `session/nightwatch-w9-owner-local-provid-ccd56c9f` | 95bf036e | 4 identical, 5 differ | KEEP — W9 wave content differs from `main` |
| `session/nightwatch-w9-readiness-lane-v1-fae2fcb3` | eb2c5491, 7dd8147a | 2 identical, 4 differ | KEEP — W9 wave content differs from `main` |
| `session/nightwatch-w9-runtime-semantics--2a772323` | 3d0bce5a | 9 differ | KEEP — W9 wave content differs from `main` |

6.10 remains the owner decision: five SUPERSEDED branches are the only deletion
candidates and none is held by a registered worktree; the twelve KEEP branches
hold content that differs from `main` and must not be deleted without owner
review. `session/nightwatch-repository-hardening--e7b9be89` is already merged
but is held by a live registered worktree and is excluded from deletion.

## 7. Documentation currency

- [x] 7.1 Define `nightwatch.document-role.v1`; assign all 11 `docs/` files
      exactly one role; `hardening:check` fails on undeclared or duplicate
- [x] 7.2 Enforce append-only on `APPEND_ONLY_ARCHIVE`: a diff modifying or
      deleting an existing line fails, with a declared-correction escape
- [x] 7.3 Extend the census ledger from figures to status words: declare the
      governed keys and their current values
- [x] 7.4 Require every governed key to appear as the current value or with an
      explicit historical qualifier; run in reporting mode over all 11 files
      first
- [x] 7.5 Repair every bare stale governed status found in reporting mode by
      adding its checkpoint qualifier, without rewriting the statement
- [x] 7.6 Declare a maximum length per `CURRENT_TRUTH` document; relocate the
      excess into archives
- [x] 7.7 Assert relocation is byte-identical to the removed text
- [x] 7.8 Add the ledger-governed status block to `README.md`: lane classes,
      measured yield, semantic acceptance class, production-track stage; state
      absence rather than omitting it
- [x] 7.9 Turn the status and role checks blocking; negative-probe each
- [ ] 7.10 Full validation, integrate, release
      — PARTIAL: `hardening:check`, `validation:universe`, root `typecheck`,
      `typecheck:bin` (reporting) and the new tests executed and PASS;
      `project:check` reports only the environmental dirty-checkout and
      canonical-dirty blockers; integration/release are the session owner's
      action and were not performed by this local worker

### Group 7 record — executed 2026-09-12 in session `nightwatch-production-completion-3d648499`

7.1/7.2. `config/document-role.v1.json` (`nightwatch.document-role.v1`) assigns
exactly one role to each of the 11 top-level `docs/*.md` files: `CURRENT_TRUTH`
(`HOST-CAPABILITY-MATRIX.md`, `MASTER-IMPLEMENTATION-HARDENING-PLAN.md`, both
bounded), `APPEND_ONLY_ARCHIVE` (7 files), `OPERATOR_REFERENCE` (2 files).
`checkDocumentRoleCurrency` fails on an undeclared, duplicate, missing or
unknown-role file and on a bounded document over its `maxLines`.
`checkAppendOnlyArchives` diffs the merge-base of HEAD and `origin/main` and
fails on any removed line in an archive that no declared correction covers; the
declared-correction escape records the exact `oldLineSha256` plus a reason. The
two fenced machine-checked blocks in `docs/CURRENT_STATE.md`
(`project-state.v2`, `live-state.v1`) are structurally exempt because their
owner rewrites them as current truth.

7.3/7.4. `GOVERNED_STATUS_KEYS` in `src/core/source/censusFigureLedger.ts`
declares 77 governed keys and their current values (phase/project statuses from
`docs/CURRENT_STATE.md`, lane classes from `config/validation-lane-state.v1.json`,
campaign dispositions, and the README keys); `checkGovernedStatusWords` scans
all 11 documents plus `README.md`. Reporting mode
(`node bin/hardening-check.mjs --report-documentation-currency`) reported 9
findings before repair.

7.5. Six bare stale statuses were repaired with checkpoint qualifiers only, no
statement rewritten: `docs/CURRENT_STATE.md:1115` and `:2623`,
`docs/DECISIONS.md:1673`, `:1796`, `:1846`, `:4193`, each carrying an explicit
`<!--status:historical ...-->` marker naming its checkpoint (run 33572572053 at
`c3fed38`; Phase 8B.1-R1 at `24fc437`; pre-9B at `62ec804`). The 6 archive-line
modifications are declared as corrections CORR-7-001…006.

7.6/7.7. `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` was 1,002 lines against
its declared 965; its review-time §2 (44 lines) moved byte-identically to
`docs/ARCHITECTURE.md` (relocation `MASTER-SECTION-2`, digest
`sha256:61a7918d02d7a32e7d96e369`), leaving the plan at 962 lines. The check
extracts the archived bytes between the relocation markers and fails when the
digest does not match the recorded moved text.

7.8. `README.md` carries the governed `<!--status-block:begin/end-->` block:
project completion status, lane-class counts, measured yield
(`MEASURED_YIELD_ADMITTED_FINDINGS=0`, `MEASURED_YIELD_EXACT_REDISCOVERY=0`),
semantic acceptance class (`COMPLETE_LOCAL_SYNTHETIC`, DEV `NOT_PROVEN`) and
production-track stage (`EXTERNAL_PREREQUISITE_UNMET`), plus explicit entries
for the lanes that have never executed (exact-checkpoint CI, owner-manual,
live-app smoke, dependency advisory).

7.9. All three rules are blocking in `hardening:check`. Negative probes
HC-075/076/077 all `DETECTED` with `statusUnchanged=true`. Tests added to the
already-registered `tests/unit/c16ExpectedInformationGain.test.ts` and
`tests/unit/hardeningRuleParity.test.ts` (no new test files, so
`inventoryDigest` is untouched).

7.10. Executed: `node bin/hardening-check.mjs` PASS;
`npm run validation:universe` PASS (447 discovered, 0 unclassified, digest
unchanged); `npm run typecheck` PASS; `typecheck:bin` reporting PASS
(16/63 conforming, unchanged mode); `tests/unit/c16ExpectedInformationGain
+ hardeningRuleParity` 51 passed. `npm run project:check` reports only
`PROJECT_STATE_CHECKOUT_DIRTY` (session work is uncommitted by design) and
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED` (from
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`, a shared-workspace condition
outside this session). Integration and release are not performed here.

## 8. Control Center residual truth

- [ ] 8.1 Extract every selector from the built stylesheet; assert a non-zero
      count before any reachability assertion
- [ ] 8.2 Require each selector to match an element in the synthetic
      composition across the qualification walk, or appear in the reasoned
      unreachable list
- [ ] 8.3 Make the unreachable list fail in both directions; declare
      pseudo-class and media-query exemptions by name with reasons
- [ ] 8.4 Mutation proof: alter a live rule's selector so nothing matches; the
      lane must fail
- [ ] 8.5 Cover native form controls at runtime on non-forced properties
      (geometry, spacing, border, font, layout); declare forced properties by
      name rather than excluding the element
- [ ] 8.6 Prove an inert class on a native control fails unless declared
      base-only with a reason
- [ ] 8.7 **Owner decision required:** adopt an evidence-status taxonomy for
      the system map, or state flatness
- [ ] 8.8 If adopted: map all 13 core evidence values with no default bucket;
      a fourteenth value fails the completeness assertion; assert at least one
      non-colour computed property differs
- [ ] 8.9 If not adopted: render the statement that evidence status is not
      shown on the graph and name where it is; cover it by the contract-render
      guard
- [ ] 8.10 Register the new suites, refresh `inventoryDigest`, verify the
      raised `UI_LANE` count
- [ ] 8.11 UI typecheck, tests, build; browser lane; root typecheck;
      `hardening:check`; `validation:universe`; `gate:local`; integrate

## 9. Dependency and supply-chain currency

- [ ] 9.1 **Owner decision required:** authorize one bounded registry query
- [ ] 9.2 Execute the read-only advisory assessment over the four declared
      dependencies and their lockfile closure; record date, registry, exact
      versions and per-advisory result
- [ ] 9.3 Assess each found advisory for reachability with its call path or the
      reason it is unreachable; a severity alone is not a disposition
- [ ] 9.4 If authorization is withheld, keep the lane
      `UNAVAILABLE_CAPABILITY` with its acquisition condition and revisit date;
      assert no document implies a clean result
- [ ] 9.5 Mechanize three of the four Vue review conditions: call-site count,
      literal-only template content, `require.resolve` declared-dependency
      resolvability
- [ ] 9.6 Carry the review date with an interval; `agent:check` reports it due
- [ ] 9.7 Separate the declared `engines.node` range from the qualified points
      in the matrix; a lane on an unqualified runtime reports unqualified
- [ ] 9.8 Re-run and re-date the disposable `npm ci --offline` lockfile
      verification; a stale date fails certification
- [ ] 9.9 Full validation, integrate, release

## 10. Deployment fact acquisition and the production track

- [x] 10.1 Implement `PRODUCTION_READ_NO_DEPLOYMENT_FACT`: refuse at
      construction any production read whose route carries no positive
      deployment fact, independent of authorization state — `src/core/prodObserve/deploymentFactAdmission.ts`;
      the fact guard runs before the authorization field is inspected and the
      refusal error carries only the category and established bit
- [x] 10.2 Prove the guard by removing it and observing the suite fail; record
      the mutation — mutation measured in the owned session: with the guard
      line commented out, 5 of 14 cases in
      `tests/unit/c13ProductionReadGuard.test.ts` failed (all five guard-refusal
      cases); with the line restored, 14/14 pass
- [x] 10.3 Report the production-read capability as unavailable with
      `POSITIVE_DEPLOYMENT_FACTS: 0` as its stated reason —
      `productionReadCapability(0)` returns `UNAVAILABLE_CAPABILITY`,
      `available: false`, `reason: 'POSITIVE_DEPLOYMENT_FACTS: 0'`; the count,
      not a flag, gates the capability
- [ ] 10.4 Record C-08b as the critical-path prerequisite for C-13 and C-14 in
      the roadmap, current state and master plan, with its lead time — PARTIAL:
      recorded in `docs/ROADMAP.md` and `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`
      (NW-16) with the bounded ask and lead-time assumption; `docs/CURRENT_STATE.md`
      was deliberately not edited in this session per the owner instruction, so
      this item remains open on that one document
- [x] 10.5 Write the bounded access request: read-only `mochi` at
      `services/{env}/{appproxy,serviceproxy}/ingress.yaml`, no write, no other
      path — recorded in `docs/ROADMAP.md`; the reader refuses any other
      repository, path or route
- [ ] 10.6 **Owner/organizational action required:** obtain or refuse the
      access; refuse any manifest from another route — PENDING OWNER DECISION,
      unclaimed: no access was requested, inferred, or worked around. The
      reader-side refusal of any other route is implemented; the organizational
      action itself is not an agent action
- [x] 10.7 If granted: bounded manifest reader, `ev:sha256` evidence digest
      over the normalized structure, provenance bound to `repo @ SHA : path`,
      fail-closed on ambiguity; settle U-1 and U-2 or keep them explicit
      unknowns — `src/core/source/deploymentManifestReader.ts`; U-1/U-2 remain
      explicit unknowns and the C-08 typed-unresolved projection is unchanged
- [x] 10.8 Ambiguous, multi-match, templated or environment-conditional
      mappings yield explicit unknowns; a changed manifest requires fresh
      derivation, never silent re-binding — `SERVICE_BACKEND_AMBIGUOUS`,
      `HOST_UNSPECIFIED`, `HOST_TEMPLATED`, `ROUTE_TEMPLATED`,
      `PORT_AMBIGUOUS`, `SERVICE_BACKEND_MISSING`; `assertDeploymentFactCurrent`
      throws `DEPLOYMENT_FACT_REBIND_REFUSED`
- [x] 10.9 Update `CENSUS_FIGURES` for `POSITIVE_DEPLOYMENT_FACTS`; re-check
      every document stating it — the count remains 0 because no access was
      granted, so the ledger value is unchanged and correct; the capability
      derives from `CENSUS_FIGURES`, and the policed-document census check is
      asserted in `c13ProductionReadGuard.test.ts`
- [x] 10.10 Record per-stage repository work and external prerequisite for
      C-12, C-13, C-14 and P4 as data; report
      `EXTERNAL_PREREQUISITE_UNMET` distinctly from `AWAITING_AUTHORIZATION` —
      `src/core/productionTrack/`; `NOT_AUTHORIZED` is absent from the status
      vocabulary by construction and by assertion
- [x] 10.11 Assert production stays structurally unloadable by default and that
      any future loadability is per-stage, per-session and revoked at session
      end — D-4 asserted (`SUPPORTED_ENVIRONMENTS`, config file, outbound
      policy); loadability policy `globalLoadability: NEVER`,
      `grantScope: PER_STAGE_PER_SESSION`, `revokeAtSessionEnd: true`
- [x] 10.12 Prove passive observation is passive: a Nightwatch-attributable
      request aborts the session; an internal error emits a safe receipt with
      no raw value or value-derived digest — P1 session now aborts with
      `NIGHTWATCH_ATTRIBUTABLE_REQUEST_ABORT` and marks evidence
      `INVALID_FOR_ACCEPTANCE`; `safeReceipt.ts` emits a bounded-class
      `INTERNAL_ERROR` receipt
- [ ] 10.13 **Owner decision required:** if access will not be granted, record
      C-13 and C-14 terminal and close the production track honestly — PENDING
      OWNER DECISION, unclaimed: the track currently reports
      `EXTERNAL_PREREQUISITE_UNMET`; no terminal closure is taken
- [ ] 10.14 Full validation, integrate, release

## 11. Contained DEV semantic acceptance

- [x] 11.1 Make the semantic layer report its acceptance class as data
      (`COMPLETE_LOCAL_SYNTHETIC`, DEV result `NOT_PROVEN`, blocker) and render
      it wherever the capability is presented
- [x] 11.2 Assert a local synthetic pass never satisfies a DEV acceptance
      assertion
- [ ] 11.3 **Owner decision required:** unblock Phase 9B/10B, or close it
      permanently with a reason — PENDING OWNER DECISION, not decided: both
      paths and their consequences are recorded as data with their own
      completeness checks; no auth artefact is claimed and no terminal closure
      is taken
- [ ] 11.4 If unblocking: record the auth artefact, authorization class,
      containment envelope, bounded approved target set, acceptance criteria
      and expected evidence; a path missing any of these fails its own check
      — APPLIES ONLY AFTER the 11.3 unblock decision; the complete prospective
      unblock record exists and `validateUnblockPathRecord` fails any missing
      artefact
- [x] 11.5 Preserve the pre-browser auth gate and `PARTIAL_AUTH_BLOCKED`;
      acceptance runs after the gate, never around it
- [ ] 11.6 If closing: record the phase terminal with its reason and make the
      acceptance class permanently synthetic-only — APPLIES ONLY AFTER the
      11.3 closure decision; the closure record and
      `validatePermanentClosurePathRecord` exist and the class stays
      `COMPLETE_LOCAL_SYNTHETIC` until a decision is recorded
- [x] 11.7 Assert the Phase 9A.1 admission route stays the only route: a DEV
      observation cannot create an expectation; a relabel fails with
      `REAL_SOURCE_EXPECTATION_PROOF_MISSING`
- [ ] 11.8 Full validation, integrate, release
      — PARTIAL/BLOCKED: root `typecheck`, `hardening:check`,
      `validation:universe` (digest unchanged) and the focused semantic suites
      executed and PASS (results in the group record). Integration cannot
      complete while the canonical checkout is externally dirty
      (`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`, external planning
      artifact) and the session work is uncommitted by design; integration and
      release are the session owner's action and were not performed here

### Group 11 record — executed 2026-09-12 in session `nightwatch-production-completion-3d648499`

11.1. `config/semantic-acceptance-class.v1.json`
(`nightwatch.semantic-acceptance-class.v1`) is the single data source:
`acceptanceClass: COMPLETE_LOCAL_SYNTHETIC`, `devResult: NOT_PROVEN`, `blocker:
PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` (since 2026-08-16), `syntheticOnly:
true`, plus the pending owner decision. `src/core/semanticAcceptance/` validates
it fail-closed at load (`SEMANTIC_ACCEPTANCE_CLASS_INVALID`), freezes it,
renders it (`renderSemanticAcceptanceClass`) and checks each presentation
surface (`checkSemanticAcceptanceSurface`: a surface that presents the
capability must carry the class, the DEV result and the blocker). Rendered in:
`README.md` (governed status block, blocker tag added),
`docs/ARCHITECTURE.md` (appended acceptance-status section),
`bin/semantic-compat.mjs` (`--validate` and full receipt both carry
`semanticAcceptance`), and the Control Center meta module output
(`ControlCenterMetaDto.semanticAcceptance`, filled by `projectMeta()`). The
Control Center `App.tsx` render is intentionally not edited (another owner per
group 19.11); the server contract is the UI's render input.

11.2. Receipts carry the evidence class (`SemanticEvidenceAcceptanceClass`,
builder default `LOCAL_SYNTHETIC`; v2-only, v1 receipts never carry it);
`summarizePhase9bPass` derives `evidenceAcceptanceClasses`; the DEV assertions
`evaluateContainedDevAcceptance` / `evaluateContainedDevDeepAcceptance` require
exactly `['CONTAINED_DEV']` in addition to the raw gate, failing with
`SEMANTIC_ACCEPTANCE_LOCAL_SYNTHETIC_NEVER_SATISFIES_DEV`. The Phase 9B/10B
runners mark their contexts `semanticAcceptanceClass: 'CONTAINED_DEV'` and use
the DEV assertions. Probes: synthetic raw gate PASS + DEV assertion FAIL,
CONTAINED_DEV PASS, deep variant likewise.

11.3. Owner decision left open. The data records both paths with consequences:
UNBLOCK (one-shot owner authorization, external `auth:capture` artefact, L6/
browser-harness containment, bounded read-only canary target, Phase 9B/10B
criteria, receipt/summary evidence) and PERMANENT CLOSURE (terminal status with
a required reason, `CLOSED_SYNTHETIC_ONLY`). `validateUnblockPathRecord` fails
on any missing artefact; `validatePermanentClosurePathRecord` fails a closure
without a reason. No decision, authorization or terminal state is claimed.

11.5. The pre-browser gate is unchanged and asserted by stage: the runner calls
`assertAuthCapabilityPreflight` before `observeOnce`, `observeOnce` refuses
with `PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` before `runRealRunGate` and
`createNightwatchContext`, and `assertAcceptanceRunsAfterAuthGate` refuses an
acceptance request that skipped the gate
(`SEMANTIC_ACCEPTANCE_AUTH_GATE_BYPASSED`). `PARTIAL_AUTH_BLOCKED` remains the
campaign auth-refusal class; `SEMANTIC_ACCEPTANCE_AUTH_REFUSAL_RESULT_CLASS`
pins it.

11.7. `assertRealSourceExpectationProof` refuses an expectation without a
real-source derivation version and a well-formed `ev:sha256` digest
(`REAL_SOURCE_EXPECTATION_PROOF_MISSING`); both DEV runners invoke it when
building the oracle. `assertNoExpectationCreatedFromObservation` fails closed
when the admitted set changes across an observation. Probes: a relabelled
synthetic expectation fails with the exact code; a `NO_EXPECTATION` observation
is non-PASS, carries no expectation id, and creates nothing.

11.8. Executed in the session worktree: `npm run typecheck` PASS;
`node bin/hardening-check.mjs` PASS (`offline structural invariants hold`);
`npm run validation:universe` PASS (discovered=447, unclassified=0,
digest `sha256:e04d813efa7aa0bbbb1fa219` unchanged; no new discovered files, so
no `config/validation-universe.v1.json` registration was needed); focused
suites PASS — `semanticReceipt` + `phase9bHarness` + `realSourceAdmission` 55
passed, `phase10bHarness` 25 passed, plus
`phase11a1ReceiptCloseout`/`phase11a2`/`phase11a3`/`phase15pArtifactValidation`/
`phase15pSchemaCoherence`/`observerSemanticLedger`/`semanticIntegration` 158
passed and `controlCenterAdapters`/`controlCenterServer`/`nw09ShippedReviewCapability`/
`cliImplementationContract`/`phase23QualityGate`/`syntheticCampaignDiagnostics`
89 passed. `bin/semantic-compat.mjs --validate` emits
`acceptanceClass=COMPLETE_LOCAL_SYNTHETIC, devResult=NOT_PROVEN,
blocker=PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED`.

Two full-regression failures were observed and are NOT group 11:
`campaign.test.ts:1598` and `phase15pAdversarialCorpus.test.ts:2612`
(CHECKPOINT_DRIFT) both fail on the resume-compatibility/version-drift wrapping
in `src/core/campaign/checkpoint.ts` (the `restartReason` message added there
during this session by a concurrent writer — mtime 04:50:48 — while group 11
edited only semantic surfaces); the failing assertions name campaign checkpoint
internals untouched by group 11. Integration/release are not performed: the
canonical checkout is externally dirty
(`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`) and integration is the session
owner's action.


## 12. Autonomous yield proof

- [ ] 12.1 Record the provider prerequisite concretely: provider, capability,
      toolchain versions, repository set, confirming probe, reachability
      threshold
- [ ] 12.2 Run the pre-flight across the intended repository set; refuse to open
      the wave below the recorded threshold
- [ ] 12.3 **Owner authorization required:** open the successor wave
- [ ] 12.4 Strict `EXACT_REDISCOVERY` against the historical corpus; per-case
      disposition and reason; a near match records its distance and never
      promotes
- [ ] 12.5 Exclude `ENVIRONMENT_BLOCKED` cases from both numerator and
      denominator of any yield rate
- [ ] 12.6 Fix the previously-unknown-defect campaign's repository set, budget
      and stopping condition at a committed SHA before execution; a widened
      resume fails closed
- [ ] 12.7 Execute across a materially wider slice of the eight admitted
      repositories under the host-owned `--repository` scope
- [ ] 12.8 Report investigations, calls, actions, unique targets, hypotheses,
      attempts, executions, candidates, admissions, false positives, leakage;
      abort on any leakage rather than publishing a yield beside it
- [ ] 12.9 Admit only through the existing mechanical path; refuse an admission
      with no reproduction as `MISSING_REPRODUCTION`
- [ ] 12.10 State the campaign's limit: an unfound defect is not an absent one;
      an admission is a Nightwatch admission, not an Alphaus-confirmed bug
- [ ] 12.11 Publish the measured yield into the ledger-governed `README.md` and
      current-state blocks
- [ ] 12.12 Full validation, integrate, release

## 13. Release definition and verdict

- [x] 13.1 Extend `nightwatch.release-certification.v1` with the ordered
      advance conditions, each backed by an existing or newly created check
      — `config/release-certification.v1.json` declares all sixteen ordered
      conditions (the eight record-level conditions 1–8 and the eight
      code-level conditions 9–16 added by the second pass); the registry and
      definition validation live in
      `src/core/releaseCertification/index.ts`; the "eight" in this line was
      the pre-second-pass count and is superseded by the frozen change spec
- [x] 13.2 Assert every condition resolves from a check's output, not prose; a
      condition with no backing check fails the definition itself
      — `parseReleaseCertificationDefinition` fails a condition whose `check`
      is not in `RELEASE_ADVANCE_CHECKS` (`RELEASE_DEFINITION_CHECK_UNBACKED`);
      `project:check` evaluates each condition from the output of the check
      that owns it and the verdict records the state and detail; probes in
      `tests/unit/projectState.test.ts` (pure negative probe and project:check
      fixture probe R3)
- [x] 13.3 Exclude the production path from the advance conditions; report it
      as a separate external track with its own status
      — `externalTrack` declares C-12 → C-14 and P4 and
      `excludedFromAdvanceConditions: true`; a condition naming a
      production-track check fails the definition
      (`RELEASE_DEFINITION_PRODUCTION_CONDITION`); the verdict reports the
      track's own status from `src/core/productionTrack/`
      (`EXTERNAL_PREREQUISITE_UNMET` at this checkpoint)
- [x] 13.4 `project:check` refuses an advance with unmet conditions, naming
      each; negative-probe with one condition forced unmet
      — an advance status with any unmet condition fails with
      `PROJECT_STATE_ADVANCE_CONDITION_UNMET: <id> (<state>)` per condition;
      the pure probe forces exactly one condition unmet and asserts only that
      id is named; fixture probe R2 exercises the refusal end to end
- [x] 13.5 Carry the three lane counts (proven, externally blocked, never
      attempted) with the status; a surface presenting the status alone fails
      the render guard
      — the verdict carries `laneCounts` (7 / 1 / 2, plus stale evidence 1 at
      this checkpoint); `checkVerdictPresentation` fails a surface that
      carries `status:PROJECT_COMPLETION_STATUS=` without the three count
      markers (`PROJECT_STATE_VERDICT_PRESENTED_BARE`); README and the new
      surface both carry them; fixture probe R5
- [x] 13.6 Bind each condition's evidence SHA; report `STALE_EVIDENCE` when it
      precedes the certified checkpoint and refuse the certification
      — every condition binds `evidenceSha` (40-hex, `HEAD` or `null`); a
      bound SHA that is a strict ancestor of the certified checkpoint reports
      `STALE_EVIDENCE`, is unmet and sets `certificationRefused`; an advance
      fails with `PROJECT_STATE_STALE_EVIDENCE: <id>`; pure probe and fixture
      probe R4
- [x] 13.7 Re-assert that a documentation-only descendant is never the
      implementation anchor
      — `project:check` classifies the commit at
      `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`; a commit touching only approved
      checkpoint paths fails
      `PROJECT_STATE_IMPLEMENTATION_ANCHOR_DOCUMENTATION_ONLY`; fixture probe
      R6; the existing A10 docs-only descendant chain still passes
- [ ] 13.8 **Owner decision required:** name the status beyond
      `OPERATIONALLY_ACCEPTED` — PENDING OWNER DECISION, not claimed: the
      certification record carries
      `nextStatus.state: PENDING_OWNER_DECISION` with safe default
      `OPERATIONALLY_ACCEPTED` and owner decision `13.8`; no code or document
      invents the name, and only `PROJECT_COMPLETE_AND_CI_CERTIFIED` is
      currently treated as an advance status
- [x] 13.9 Evaluate the conditions against the tree as it stands after groups
      1–12 and record the honest result, met or unmet
      — 4 of 16 MET (`completion-ledger-truth`, `documentation-currency`,
      `dependency-supply-chain-currency`, `structural-rule-soundness`), 5
      UNMET (`validation-lane-closure`, `exact-head-ci-authority`,
      `operator-cli-contract`, `workspace-continuity-drift-closure`,
      `cli-implementation-contract`), 7 UNAVAILABLE because the group that
      creates the check has not landed (3, 9, 12, 13, 14, 15, 16); recorded in
      `docs/RELEASE-ADVANCE-CONDITIONS.md` and reproduced by
      `node bin/project-state-check.mjs`
- [ ] 13.10 Full offline regression, `gate:local`, `gate:clean`,
      `gate:topology`, UI and browser lanes; reconcile project truth;
      integrate by fast-forward; verify `HEAD == origin/main`; release
      — PARTIAL/BLOCKED: `project:check`, `typecheck`, `hardening:check`,
      `validation:universe` and the focused suites executed (results in the
      group record). `gate:local`/regression/integration cannot complete while
      the canonical checkout is externally dirty with a concurrent planning
      artifact and the session work is uncommitted by design; integration and
      release are the session owner's action and were not performed here

### Group 13 record — executed 2026-09-12 in session `nightwatch-production-completion-3d648499`

13.1/13.2. `config/release-certification.v1.json` carries the ordered
conditions; each names a `check` id registered in `RELEASE_ADVANCE_CHECKS` in
`src/core/releaseCertification/index.ts`. The definition validator fails an
unregistered check (`RELEASE_DEFINITION_CHECK_UNBACKED`), an invalid order, a
duplicate id, a malformed evidence SHA, a condition naming an excluded
production-track check, and a missing pending-owner `nextStatus`. The checker
maps definition errors to `PROJECT_STATE_<code>` and evaluates each condition
from the output of the check that owns it: lane state (G2), project CI anchors
(G3), the agent-state ledger/claim diagnostics (G1/G6), the operator command
listing (G4), the documentation-currency report (G7), the dependency-advisory
lane record (G9), the bin-typecheck lane mode (G15), the hardening rule
registry (G16) and the accessibility lane registration (G20). Conditions whose
group has not landed report UNAVAILABLE_CAPABILITY naming the group.

13.3/13.9. The external production track is excluded from the conditions by
construction and reported with its own status
(`EXTERNAL_PREREQUISITE_UNMET`). The live evaluation at checkpoint
`88e3c3fb52937ff303b0944cc22cfee624bf807e` is recorded in
`docs/RELEASE-ADVANCE-CONDITIONS.md`: 4 MET, 5 UNMET, 7 UNAVAILABLE; the
advance is not claimed, so the unmet conditions do not fail `project:check`,
and setting `PROJECT_COMPLETE_AND_CI_CERTIFIED` today would fail naming every
unmet condition.

13.5/13.6. The verdict carries proven=7, externally blocked=1 and never
attempted=2, with stale evidence 1 separately. `checkVerdictPresentation`
requires the three count tags wherever a surface presents the status; README
already carried them and the new surface carries them. Evidence bindings at
`88e3c3f…` (checkpoint), `8bad862e…` (the session head at which the check
outputs were earned), `36bd493…` (the dependency lane record) and `NONE` for
uneamed evidence are all current; a stale binding refuses the certification
and an advance fails with `PROJECT_STATE_STALE_EVIDENCE: <id>`.

13.7. `project:check` refuses a documentation-only commit as
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`
(`PROJECT_STATE_IMPLEMENTATION_ANCHOR_DOCUMENTATION_ONLY`); the docs-only
descendant chains in the A10 fixtures still pass because the anchor there is
an implementation commit.

13.10. Executed in the session worktree: `npm run typecheck` PASS;
`node bin/hardening-check.mjs` PASS; `npm run validation:universe` PASS
(discovered=447, unclassified=0, digest unchanged); `npx playwright test
tests/unit/projectState.test.ts --workers=1` PASS (81 passed, including the
F-12 probes); `node bin/project-state-check.mjs` FAIL only on
`PROJECT_STATE_CHECKOUT_DIRTY` (session work uncommitted by design) and
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED` (external canonical dirty with a
concurrent planning artifact), with the release verdict printed as recorded
above. `gate:local`, the full regression, UI/browser lanes, integration and
release are not performed: they cannot pass while the canonical checkout is
externally dirty, and integration/release are the session owner's action.


## 14. Dead architecture closure

- [x] 14.1 Build the reference graph over `src`, `tests`, `bin`, `ui` and
      `scenarios`, resolving static imports, loader string-literal paths and
      `require.resolve` specifiers
- [x] 14.2 Assert a non-zero edge count before evaluating reachability; a
      resolver that stops finding edges fails the check
- [x] 14.3 Verify the graph produces no false positive for the Control Center
      server, the self-dev sandbox planner and executor, or the Vue fixture
- [x] 14.4 Fail `hardening:check` on a tracked source module whose exports are
      referenced nowhere outside its own directory
- [x] 14.5 Add the reasoned-retention list; make it fail in both directions
- [ ] 14.6 **Owner decision required:** adopt or remove
      `src/core/dtoFramework/` (519 lines) and `src/core/adversarialCorpus/`
      (385 lines); record the outcome and reason in `docs/DECISIONS.md`
- [ ] 14.7 If adopting `dtoFramework`: migrate its four already-registered
      kinds first — semantic evaluation receipt, triage replay plan, campaign
      manifest, campaign checkpoint — removing each one's hand-rolled
      validation in the same change
- [ ] 14.8 If removing: declare the deletions under `## Declared Deletions`;
      verify `workspace:check` passes with no
      `WORKSPACE_UNDECLARED_TRACKED_DELETION`
- [x] 14.9 Resolve each of the eleven zero-importer `index.ts` barrels to
      enforced or removed
- [x] 14.10 For each enforced barrel, add the rule forbidding a deep import
      from outside the module; negative-probe it
- [x] 14.11 Resolve `src/controlCenter/index.ts` explicitly: either
      `bin/nightwatch-control-center.mjs` loads through it, or it is removed
- [ ] 14.12 Register the new rule, refresh `inventoryDigest`, full validation,
      integrate, release

14.1–14.5, 14.9–14.11 evidence. The graph and both rules are implemented in
`bin/hardening-check.mjs` (`buildReferenceGraph`, `checkSourceReachability`,
`checkModuleBarrierEnforcement`) against the data-only
`config/reference-graph.v1.json`; no new `bin/lib` or test file was added, so
the validation-universe digest is unchanged. Reachability is forward from
executable roots (`tests/`, `bin/`, `ui/`, `scenarios/`) plus any `src` module
with an inbound edge from outside its own directory, so a dead subsystem cannot
bootstrap itself alive while a module imported only by a live sibling (the
sandbox planner/executor) stays reachable. Measured `--report-reachability` at
this checkpoint: files=1072, parsed=1072, edges=6238, findings=0. An empty edge
set fails `REFERENCE_GRAPH_EMPTY`; fewer than 100 parsed files fails
`REFERENCE_GRAPH_VACUOUS`. The retention list fails in both directions and is
probed: HC-079 removes the dtoFramework entry and the rule reports its modules
as unlisted-dead, HC-080 appends a consumer to a retained module and the rule
reports `REFERENCE_RETENTION_STALE`. False-positive checks: the Control Center
server is reached through the `bin/nightwatch-control-center.mjs` loader edges
(`server/index.ts`, `server/defaultCollector.ts`,
`authorities/reviewWriteAuthority.ts`); the self-dev sandbox planner/executor
are reached through the `bin/selfdev-adopt-sandbox.mjs` loader list and the
test-only mirror helper; the Vue fixture's `require.resolve('vue/dist/vue.js')`
is recorded as an external `REQUIRE_RESOLVE_EXTERNAL` edge rather than a
resolution failure.

Resolutions (11/11). `src/core/provenance/index.ts` is `ENFORCED`: all five
`selfDevPromotion` consumers, `tests/unit/selfDevProvenance.test.ts` and the
five bins that loaded `localGit.ts` now load the barrel, the generated loader
declaration is regenerated, and `checkModuleBarrierEnforcement` (probe HC-081)
fails any deep import into the module from outside. Nine barrels are `REMOVED`
with their deletions declared under `## Declared Deletions` in the programme
`SPEC.md`: `controlCenter`, `campaignIntelligence`, `investigationMemory`,
`localInvestigation`, `ownerLocalReproduction`, `prodProvenance`,
`reproductionSurface`, `selfDevSandbox`, `systemAtlas`. `selfDevSandbox` could
not be enforced without re-exporting `setSandboxBaseOverrideForTests`, which
`checkPhase8B01CloseoutIntegrity` forbids, so deep imports are the honest
interface there; its plan/run entry points are still asserted directly on
`planner.ts`/`sandboxExecutor.ts`, and `checkPhase8BSandboxBoundary` still
polices every reach into the module. `src/core/controlCenter/index.ts` is
resolved by removal (14.11), leaving the deep `server/index.ts` loaders as the
Control Center's public surface. `src/core/dtoFramework/` and
`src/core/adversarialCorpus/` remain in the reasoned-retention list with reason
`G14.6 owner decision OPEN`; 14.6–14.8 stay open and no adoption or removal is
claimed.

14.12 partial. The new rules are registered with probes HC-078–HC-081 and
`node bin/hardening-check.mjs` passes; `npm run validation:universe` passes with
the unchanged digest `sha256:e04d813efa7aa0bbbb1fa219`. Integration and release
remain the session owner's action exactly as recorded for the programme; no
`inventoryDigest` was edited because no discovered file was added.


## 15. CLI-to-implementation contract

- [x] 15.1 Require a string literal for every `loadTypeScriptModule` /
      `loadTypeScriptModules` path; fail the structural rule on a computed path
- [x] 15.2 Resolve all 198 referenced `src/**/*.ts` paths; fail on any that
      does not exist
- [x] 15.3 Extract the symbols each call site destructures or reads; fail on
      any the target module does not export
- [x] 15.4 Assert a non-zero resolved call-site count before reporting success
- [x] 15.5 Add `tsconfig.bin.json` under `checkJs` with root-equivalent
      `strict` and `noUncheckedIndexedAccess`; run it in reporting mode with a
      conformance count
- [x] 15.6 Give the loader a typed returned shape derived from the target
      module, so a bin's destructuring is checked rather than `any`
- [ ] 15.7 Annotate bins in batches until all 62 conform; turn the lane
      blocking; exemptions are declared list entries with reasons that fail
      once the bin passes
- [x] 15.8 Add an executing test for each of the twelve untested bins —
      `efficacy-corpus`, `frontier-determinism`, `phase22-dev`, `phase22-real`,
      `phase23-ci`, `phase23-dev`, `phase23-predev`, `phase2b-real`,
      `phase9b-real`, `review-mutation-campaign`, `selfdev-provenance`,
      `semantic-compat`
- [x] 15.9 For each authorization-gated launcher, assert the fail-closed
      refusal: refusal code, non-zero exit, and no browser context, subprocess,
      socket or file created
- [x] 15.10 Add the rule enumerating tracked bins and failing on one with no
      executing test; assert the enumeration is non-vacuous
- [ ] 15.11 Register both lanes, refresh the digest, full validation, integrate

## 16. Structural rule soundness

- [x] 16.1 Replace the `read`/`withoutComments` pair with one code-only
      accessor plus an explicitly named raw accessor
- [x] 16.2 Convert the five fail-if-absent raw-source assertions — lines 108,
      184, 863, 1868, 3697 — to the code-only accessor
- [x] 16.3 Prove each conversion: moving the matched literal into a comment in
      the target file makes the rule fail; record the five mutations
- [x] 16.4 Add the self-check failing a fail-if-absent matcher over the raw
      accessor
- [ ] 16.5 Audit every rule's quantifier; make totality rules evaluate all
      occurrences and report each failing line
- [x] 16.6 Make existence rules explicitly named as such; fail a totality rule
      implemented with a first-match test
- [x] 16.7 Give every rule a recorded, reversible negative probe against real
      guarded source
- [x] 16.8 Build the rule mutation campaign; require all 70 rules to report a
      detected mutation; assert a non-zero rule count and an unchanged
      `git status --porcelain` afterwards
- [ ] 16.9 Decompose `bin/hardening-check.mjs` into one module per invariant
      family plus a rule registry; reduce the entry point to running the
      registry
- [ ] 16.10 Prove decomposition is behaviour-preserving: byte-identical output
      on the tree at the starting SHA
- [ ] 16.11 Make the registry the enumeration authority; fail on an
      unregistered rule module
- [ ] 16.12 Full validation, integrate, release

## 17. Schema version lifecycle

- [x] 17.1 Declare all 319 schema identifiers: persisted or in-memory, store
      location where persisted, current version, versions still accepted
- [ ] 17.2 Fail on an undeclared schema literal and on a declaration naming a
      schema that no longer exists; assert a non-zero discovered count
- [x] 17.3 Require a migration disposition — `MIGRATE`, `READ_COMPATIBLE` or
      `ORPHAN` — on every persisted version change; fail when absent
- [ ] 17.4 **Owner decision required:** whether one disposition is the presumed
      default for a persisted bump
- [x] 17.5 Implement `MIGRATE`: validate against the old validator first,
      retain the original until the new record is written and re-read, leave
      the original readable on interruption
- [x] 17.6 Implement `READ_COMPATIBLE` proof: a fixture read at each accepted
      version; removing support for one fails the test
- [x] 17.7 Make `ORPHAN` a recorded decision in `docs/DECISIONS.md`, never a
      default reached by omission
- [x] 17.8 Split `VERSION_UNSUPPORTED` out of `CORRUPT` in the review store and
      every other persisted reader; carry the found version and affected count
- [x] 17.9 Render the distinction on the Control Center reviewer surface: a
      record predating the current schema is a migration, not a defect
- [x] 17.10 Report affected stores and the disposition in campaign output at
      bump time
- [x] 17.11 Build the bounded sanitized export: read-only, through the
      redaction layer, written outside the repository, in no gate
- [x] 17.12 Make a refused checkpoint resume explain itself — differing
      versions, completed work items, whether a restart can consume the ledger
- [x] 17.13 Mark an unrecoverable campaign terminal rather than perpetually
      pending
- [ ] 17.14 Register the new suites, full validation, integrate, release

## 18. UI error taxonomy rendering

- [ ] 18.1 Render `kind` and, where present, `status` at every error site;
      derive the operator action from the kind
- [ ] 18.2 Present `INVALID_RESPONSE` as a contract mismatch naming the
      contract, with no retry affordance
- [ ] 18.3 Present a deliberate 404 as a capability that is not enabled, naming
      how it is enabled; not as an outage
- [ ] 18.4 Render nothing for `ABORTED`
- [ ] 18.5 Offer retry only for `NETWORK`, `TIMEOUT`, 408 and 429
- [ ] 18.6 Assert no error state contains server-supplied message, stack,
      header or path
- [ ] 18.7 Extend the differential render harness to the failure path: drive
      each view into each kind and require the DOM to differ between kinds
- [ ] 18.8 Drive the coverage assertion off `ApiErrorKind`'s members, not a
      hand-written list, so a sixth kind fails until rendered
- [ ] 18.9 Add the reasoned exemption list for legitimately identical pairs;
      fail in both directions
- [ ] 18.10 Mutation proof: collapsing a view's error rendering to one generic
      state fails the harness naming the conflated kinds
- [ ] 18.11 Render partial composition failures per source — starting with
      `CampaignView` and the Overview — reserving the whole-view error state
      for total failure
- [ ] 18.12 Prove partial disclosure: failing exactly one source requires both
      the rendered data and the named failure
- [ ] 18.13 Register the new suites, refresh `inventoryDigest`, UI lanes,
      browser lane, full validation, integrate

## 19. Configuration contract and UI decomposition

- [ ] 19.1 Declare every environment variable the code reads: name, purpose,
      required-in-which-mode, value shape, default, secret-bearing, consumers
- [ ] 19.2 Replace runtime-assembled variable names with literals, or enumerate
      their construction in the declaration
- [ ] 19.3 Validate at startup; fail closed on a malformed value before any
      browser, subprocess or socket
- [ ] 19.4 Report an unknown `NIGHTWATCH_*` variable with its closest declared
      name
- [ ] 19.5 Add the printable effective configuration with per-variable source;
      redact secret-bearing values to presence only
- [ ] 19.6 Fail `hardening:check` on a variable read with no declaration
- [ ] 19.7 Schema-validate `config/environments/*.json`: required keys, no
      unknown keys, well-formed host patterns, no known production host in any
      allowlist, `local.json` loopback-only, `production.json` still
      structurally unloadable
- [ ] 19.8 Assert a disallowed `--ui-url` / `NIGHTWATCH_UI_URL` override
      refuses before a browser context exists
- [ ] 19.9 Validate `NIGHTWATCH_REASONER_CLI` as an absolute, existing,
      executable regular file resolved without shell interpretation; record the
      resolved path and digest in run evidence
- [ ] 19.10 Document the reasoner surface in `docs/SAFETY_MODEL.md`; extend the
      child-process boundary rule to assert no-shell at that call site
- [ ] 19.11 Decompose `App.tsx` into one module per view plus a shared
      component module; re-point the existing guards
- [ ] 19.12 Prove decomposition changes nothing: identical rendered DOM for
      every view under the existing fixture matrix, and every exemption list
      unchanged or shorter
- [ ] 19.13 Make contract-coverage carriers per-view so a field rendered in a
      non-owning view fails
- [ ] 19.14 Full validation, integrate, release

## 20. Accessibility certification

- [x] 20.1 Enumerate every status distinction the built composition renders
- [x] 20.2 Require each pair to differ in accessible text or a non-colour
      computed property; a colour-only difference fails naming both values
- [x] 20.3 Run the check on the built bundle via the existing runtime
      computed-style sweep
- [x] 20.4 Enumerate rendered foreground/background pairs from the DOM, not the
      stylesheet; assert a non-zero pair count
- [x] 20.5 Measure contrast against WCAG 2.2 AA for each pair's computed size
      and weight; 3:1 for non-text status boundaries
- [x] 20.6 Add the reasoned contrast exemption list; fail in both directions
- [x] 20.7 Drive every operator workflow by keyboard in the browser lane:
      navigation, paging, run selection, graph drill-down, filtering, review
      decision
- [x] 20.8 Assert visible focus at every step, reading-order focus, no
      pointer-only control, no unintended focus trap
- [x] 20.9 Assert the existing navigation behaviour survives: title set and
      main content focused only for operator navigation
- [x] 20.10 Add automated structural auditing per view with a reasoned
      both-directions violation-exemption list
- [x] 20.11 State the audit's own limit in its output: structural subset, not
      certification
- [ ] 20.12 Register the new suites, refresh `inventoryDigest`, UI and browser
      lanes, integrate

## 21. Authenticated capability lifecycle

- [x] 21.1 Define the capture sidecar record: capture instant, environment,
      origin, earliest observed cookie expiry, declared validity window,
      artefact digest — and no cookie value, token or storage value
- [x] 21.2 Write it atomically with the capture in `auth:capture`; pass it
      through the redaction layer; extend the secret-file ignore patterns
- [x] 21.3 Add the one-time adoption path so an existing artefact gains a
      record without re-capture
- [x] 21.4 Implement the pre-flight resolving `VALID`, `EXPIRED`,
      `WRONG_ENVIRONMENT`, `UNKNOWN_AGE`, `MISSING`, `UNREADABLE`
- [ ] 21.5 Evaluate expiry with the existing `storageState.ts` cookie
      applicability logic; add a rule failing on a second implementation
      (single evaluator reused and the one pre-existing second implementation
      in `bin/phase23-dev.mjs` removed; the registered structural rule itself
      is owner-blocked: `bin/hardening-check.mjs` belongs to another worker)
- [x] 21.6 Refuse every non-`VALID` state before any browser context,
      subprocess, socket or file, with a distinct code and the re-capture
      remedy
- [x] 21.7 Prove `UNKNOWN_AGE` refuses rather than proceeding optimistically
- [ ] 21.8 Wire the pre-flight into all 18 authorization-gated checks,
      `journey:phase2c`, `explore:phase4`, `api:phase5`, `campaign:real` and
      the C-12 path (all named bin launchers and 10 MANUAL_OWNER runners are
      wired; the LIVE_APP_SMOKE checks that build synthetic local state are
      not real authenticated lanes and remain unwired)
- [x] 21.9 Report authentication state from `status:local`,
      `observe:preflight` and `c12:preflight` reading metadata only — no
      browser, no host contact, no cookie value read
- [x] 21.10 Warn when remaining validity is shorter than a campaign's declared
      budget, naming both durations
- [x] 21.11 Surface present-and-expired on the Control Center as an epistemic
      class, distinct from absent
- [ ] 21.12 Document in `README.md` and `docs/SAFETY_MODEL.md` that
      authenticated capability expires, that no automated renewal exists, and
      why
- [ ] 21.13 Record the dependency in `docs/HOST-CAPABILITY-MATRIX.md` so an
      expired artefact yields `UNAVAILABLE_CAPABILITY`, not a failure
- [ ] 21.14 Measure and document the renewal cadence from observed capture
      lifetimes with the measurement date
- [ ] 21.15 Full validation, integrate, release

## Carried forward from prior ledgers

Live work carried verbatim from a terminal campaign's OpenSpec ledger during
the G1 reconciliation. These entries were genuinely not done and are not
otherwise covered by the groups above; they remain open work in this
programme.

- [ ] CF-1 (from `nightwatch-continuous-deep-hardening-v1` 3.2) Fuzz/property ≥20 cases PASS
- [ ] CF-2 (from `nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1` 5.1) local-model canary conditional.
