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

- [ ] 2.1 Define `nightwatch.validation-lane-state.v1`: lane id, class,
      evidence, evidence SHA, unblock/acquisition condition, revisit date
- [ ] 2.2 Populate all ten declared lanes from the recorded evidence in
      `docs/CURRENT_STATE.md` and `docs/HOST-CAPABILITY-MATRIX.md` §4a
- [ ] 2.3 Emit the record from `bin/validation-universe.mjs`
- [ ] 2.4 `hardening:check`: every class in
      `config/validation-universe.v1.json` has exactly one lane-state entry;
      missing, duplicate or condition-less non-PROVEN entries fail
- [ ] 2.5 Compute `STALE_EVIDENCE` against
      `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`; report, never store, the staleness
- [ ] 2.6 `agent:check` reports an expired revisit date on any lane record
- [ ] 2.7 Negative probes: a lane with no entry, a duplicate entry, a
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

- [ ] 4.1 Implement the shared parser in `bin/lib/`: declared metadata, help
      rendering, unknown/malformed/conflicting/positional refusal, exit-code and
      `--json` convention
- [ ] 4.2 Build the exhaustive sweep over every tracked `bin/*.mjs`; assert a
      non-zero discovered count before any other assertion
- [ ] 4.3 Measure side-effect freedom under `--help`: working tree,
      `artifacts/` and `$HOME/.nightwatch` unchanged; a change fails the case
- [ ] 4.4 Migrate `bin/quality-gate.mjs` first and prove
      `quality-gate.mjs local --help` prints usage and exits within one second
- [ ] 4.5 Migrate the remaining 61 entry points in batches; the sweep counts
      conformance in reporting mode throughout
- [ ] 4.6 Apply the exit-code convention: 0 success, 1 failure, 2 usage,
      3 fail-closed refusal, 4 external block
- [ ] 4.7 Bring existing JSON emitters to the convention without changing their
      payload semantics; assert stdout parses as exactly one document
- [ ] 4.8 Assert no usage or error text carries a credential or an absolute
      path outside the checkout
- [ ] 4.9 Derive the grouped command listing from declared metadata; point
      `README.md` at it instead of enumerating scripts
- [ ] 4.10 Turn on the structural rule requiring the shared parser once all 62
      conform; negative-probe with a non-conforming bin
- [ ] 4.11 Register the sweep, refresh the digest, full validation, integrate

## 5. Evidence lifecycle hygiene

- [ ] 5.1 Re-derive the refusal set from current tracked state; run
      `retention:plan` and record the measured candidate and refusal totals
- [ ] 5.2 Assert unprovable-means-refused with a negative probe
- [ ] 5.3 **Owner decision required:** approve the reclaim and the retention
      window
- [ ] 5.4 Execute `--apply` behind an explicit confirmation token; record
      deleted set, byte total, SHA, refusal set and date
- [ ] 5.5 Resolve Playwright output to one configured root across the eleven
      root `playwright.*.config.ts` files; move scratch under one ignored root
- [ ] 5.6 Extend `hygiene:clean` to the 19 historical `test-results*` roots and
      the 4 `.tmp-*` trees; dry-run lists exactly what it would remove
- [ ] 5.7 Assert `hygiene:clean` never touches `artifacts/`, the finding store,
      the review store or any tracked file; `git status --porcelain` unchanged
- [ ] 5.8 Structural rule rejecting a new root-level output or scratch path
- [ ] 5.9 Measure the steady-state footprint (checkout, `node_modules`, one
      run's artifacts, accumulated evidence); record it in
      `docs/HOST-CAPABILITY-MATRIX.md` §1 under the census-figure ledger
- [ ] 5.10 Full validation, integrate, release

## 6. Workspace and continuity drift closure

- [ ] 6.1 Extend `WORKSPACE_WORKTREE_METADATA` to resolve each claim's task id
      against `.agent/tasks/<id>/STATE.md`
- [ ] 6.2 Report `CLAIM_TASK_TERMINAL` and `CLAIM_TASK_UNKNOWN`; raise
      `attention`; name the owner action; modify nothing automatically
- [ ] 6.3 Negative probes: a terminal-task claim, an unknown-task claim, a
      live in-progress claim that must still pass
- [ ] 6.4 Clear the canonical `CANONICAL_MAINTENANCE` claim naming
      `nightwatch-control-center-render-truth-v1`, through the session CLI
- [ ] 6.5 Release `nightwatch-repository-hardening--e7b9be89` through the
      session CLI, by its owner; never by directory deletion
- [ ] 6.6 Verify `session:status` reports `attention=0` with no
      `CLAIM_TASK_TERMINAL` and C-00 invariants unchanged
- [ ] 6.7 Disposition all 31 legacy v1 records: migrated, or
      `PERMANENTLY_HISTORICAL` with a one-line reason; alter no existing line
- [ ] 6.8 Exclude declared-historical records from the warning count; assert
      `agent:check` reaches zero legacy warnings and that a new undeclared
      record raises it to one
- [ ] 6.9 Classify all 16 non-merged branches from the actual diff against
      `main`, citing unique commits
- [ ] 6.10 **Owner decision required:** approve per-branch deletion; exclude
      any branch held by a registered worktree
- [ ] 6.11 Full validation, integrate, release

## 7. Documentation currency

- [ ] 7.1 Define `nightwatch.document-role.v1`; assign all 11 `docs/` files
      exactly one role; `hardening:check` fails on undeclared or duplicate
- [ ] 7.2 Enforce append-only on `APPEND_ONLY_ARCHIVE`: a diff modifying or
      deleting an existing line fails, with a declared-correction escape
- [ ] 7.3 Extend the census ledger from figures to status words: declare the
      governed keys and their current values
- [ ] 7.4 Require every governed key to appear as the current value or with an
      explicit historical qualifier; run in reporting mode over all 11 files
      first
- [ ] 7.5 Repair every bare stale governed status found in reporting mode by
      adding its checkpoint qualifier, without rewriting the statement
- [ ] 7.6 Declare a maximum length per `CURRENT_TRUTH` document; relocate the
      excess into archives
- [ ] 7.7 Assert relocation is byte-identical to the removed text
- [ ] 7.8 Add the ledger-governed status block to `README.md`: lane classes,
      measured yield, semantic acceptance class, production-track stage; state
      absence rather than omitting it
- [ ] 7.9 Turn the status and role checks blocking; negative-probe each
- [ ] 7.10 Full validation, integrate, release

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

- [ ] 10.1 Implement `PRODUCTION_READ_NO_DEPLOYMENT_FACT`: refuse at
      construction any production read whose route carries no positive
      deployment fact, independent of authorization state
- [ ] 10.2 Prove the guard by removing it and observing the suite fail; record
      the mutation
- [ ] 10.3 Report the production-read capability as unavailable with
      `POSITIVE_DEPLOYMENT_FACTS: 0` as its stated reason
- [ ] 10.4 Record C-08b as the critical-path prerequisite for C-13 and C-14 in
      the roadmap, current state and master plan, with its lead time
- [ ] 10.5 Write the bounded access request: read-only `mochi` at
      `services/{env}/{appproxy,serviceproxy}/ingress.yaml`, no write, no other
      path
- [ ] 10.6 **Owner/organizational action required:** obtain or refuse the
      access; refuse any manifest from another route
- [ ] 10.7 If granted: bounded manifest reader, `ev:sha256` evidence digest
      over the normalized structure, provenance bound to `repo @ SHA : path`,
      fail-closed on ambiguity; settle U-1 and U-2 or keep them explicit
      unknowns
- [ ] 10.8 Ambiguous, multi-match, templated or environment-conditional
      mappings yield explicit unknowns; a changed manifest requires fresh
      derivation, never silent re-binding
- [ ] 10.9 Update `CENSUS_FIGURES` for `POSITIVE_DEPLOYMENT_FACTS`; re-check
      every document stating it
- [ ] 10.10 Record per-stage repository work and external prerequisite for
      C-12, C-13, C-14 and P4 as data; report
      `EXTERNAL_PREREQUISITE_UNMET` distinctly from `AWAITING_AUTHORIZATION`
- [ ] 10.11 Assert production stays structurally unloadable by default and that
      any future loadability is per-stage, per-session and revoked at session
      end
- [ ] 10.12 Prove passive observation is passive: a Nightwatch-attributable
      request aborts the session; an internal error emits a safe receipt with
      no raw value or value-derived digest
- [ ] 10.13 **Owner decision required:** if access will not be granted, record
      C-13 and C-14 terminal and close the production track honestly
- [ ] 10.14 Full validation, integrate, release

## 11. Contained DEV semantic acceptance

- [ ] 11.1 Make the semantic layer report its acceptance class as data
      (`COMPLETE_LOCAL_SYNTHETIC`, DEV result `NOT_PROVEN`, blocker) and render
      it wherever the capability is presented
- [ ] 11.2 Assert a local synthetic pass never satisfies a DEV acceptance
      assertion
- [ ] 11.3 **Owner decision required:** unblock Phase 9B/10B, or close it
      permanently with a reason
- [ ] 11.4 If unblocking: record the auth artefact, authorization class,
      containment envelope, bounded approved target set, acceptance criteria
      and expected evidence; a path missing any of these fails its own check
- [ ] 11.5 Preserve the pre-browser auth gate and `PARTIAL_AUTH_BLOCKED`;
      acceptance runs after the gate, never around it
- [ ] 11.6 If closing: record the phase terminal with its reason and make the
      acceptance class permanently synthetic-only
- [ ] 11.7 Assert the Phase 9A.1 admission route stays the only route: a DEV
      observation cannot create an expectation; a relabel fails with
      `REAL_SOURCE_EXPECTATION_PROOF_MISSING`
- [ ] 11.8 Full validation, integrate, release

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

- [ ] 13.1 Extend `nightwatch.release-certification.v1` with the eight ordered
      advance conditions, each backed by an existing or newly created check
- [ ] 13.2 Assert every condition resolves from a check's output, not prose; a
      condition with no backing check fails the definition itself
- [ ] 13.3 Exclude the production path from the advance conditions; report it
      as a separate external track with its own status
- [ ] 13.4 `project:check` refuses an advance with unmet conditions, naming
      each; negative-probe with one condition forced unmet
- [ ] 13.5 Carry the three lane counts (proven, externally blocked, never
      attempted) with the status; a surface presenting the status alone fails
      the render guard
- [ ] 13.6 Bind each condition's evidence SHA; report `STALE_EVIDENCE` when it
      precedes the certified checkpoint and refuse the certification
- [ ] 13.7 Re-assert that a documentation-only descendant is never the
      implementation anchor
- [ ] 13.8 **Owner decision required:** name the status beyond
      `OPERATIONALLY_ACCEPTED`
- [ ] 13.9 Evaluate the conditions against the tree as it stands after groups
      1–12 and record the honest result, met or unmet
- [ ] 13.10 Full offline regression, `gate:local`, `gate:clean`,
      `gate:topology`, UI and browser lanes; reconcile project truth;
      integrate by fast-forward; verify `HEAD == origin/main`; release


## 14. Dead architecture closure

- [ ] 14.1 Build the reference graph over `src`, `tests`, `bin`, `ui` and
      `scenarios`, resolving static imports, loader string-literal paths and
      `require.resolve` specifiers
- [ ] 14.2 Assert a non-zero edge count before evaluating reachability; a
      resolver that stops finding edges fails the check
- [ ] 14.3 Verify the graph produces no false positive for the Control Center
      server, the self-dev sandbox planner and executor, or the Vue fixture
- [ ] 14.4 Fail `hardening:check` on a tracked source module whose exports are
      referenced nowhere outside its own directory
- [ ] 14.5 Add the reasoned-retention list; make it fail in both directions
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
- [ ] 14.9 Resolve each of the eleven zero-importer `index.ts` barrels to
      enforced or removed
- [ ] 14.10 For each enforced barrel, add the rule forbidding a deep import
      from outside the module; negative-probe it
- [ ] 14.11 Resolve `src/controlCenter/index.ts` explicitly: either
      `bin/nightwatch-control-center.mjs` loads through it, or it is removed
- [ ] 14.12 Register the new rule, refresh `inventoryDigest`, full validation,
      integrate, release

## 15. CLI-to-implementation contract

- [ ] 15.1 Require a string literal for every `loadTypeScriptModule` /
      `loadTypeScriptModules` path; fail the structural rule on a computed path
- [ ] 15.2 Resolve all 198 referenced `src/**/*.ts` paths; fail on any that
      does not exist
- [ ] 15.3 Extract the symbols each call site destructures or reads; fail on
      any the target module does not export
- [ ] 15.4 Assert a non-zero resolved call-site count before reporting success
- [ ] 15.5 Add `tsconfig.bin.json` under `checkJs` with root-equivalent
      `strict` and `noUncheckedIndexedAccess`; run it in reporting mode with a
      conformance count
- [ ] 15.6 Give the loader a typed returned shape derived from the target
      module, so a bin's destructuring is checked rather than `any`
- [ ] 15.7 Annotate bins in batches until all 62 conform; turn the lane
      blocking; exemptions are declared list entries with reasons that fail
      once the bin passes
- [ ] 15.8 Add an executing test for each of the twelve untested bins —
      `efficacy-corpus`, `frontier-determinism`, `phase22-dev`, `phase22-real`,
      `phase23-ci`, `phase23-dev`, `phase23-predev`, `phase2b-real`,
      `phase9b-real`, `review-mutation-campaign`, `selfdev-provenance`,
      `semantic-compat`
- [ ] 15.9 For each authorization-gated launcher, assert the fail-closed
      refusal: refusal code, non-zero exit, and no browser context, subprocess,
      socket or file created
- [ ] 15.10 Add the rule enumerating tracked bins and failing on one with no
      executing test; assert the enumeration is non-vacuous
- [ ] 15.11 Register both lanes, refresh the digest, full validation, integrate

## 16. Structural rule soundness

- [ ] 16.1 Replace the `read`/`withoutComments` pair with one code-only
      accessor plus an explicitly named raw accessor
- [ ] 16.2 Convert the five fail-if-absent raw-source assertions — lines 108,
      184, 863, 1868, 3697 — to the code-only accessor
- [ ] 16.3 Prove each conversion: moving the matched literal into a comment in
      the target file makes the rule fail; record the five mutations
- [ ] 16.4 Add the self-check failing a fail-if-absent matcher over the raw
      accessor
- [ ] 16.5 Audit every rule's quantifier; make totality rules evaluate all
      occurrences and report each failing line
- [ ] 16.6 Make existence rules explicitly named as such; fail a totality rule
      implemented with a first-match test
- [ ] 16.7 Give every rule a recorded, reversible negative probe against real
      guarded source
- [ ] 16.8 Build the rule mutation campaign; require all 70 rules to report a
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

- [ ] 17.1 Declare all 319 schema identifiers: persisted or in-memory, store
      location where persisted, current version, versions still accepted
- [ ] 17.2 Fail on an undeclared schema literal and on a declaration naming a
      schema that no longer exists; assert a non-zero discovered count
- [ ] 17.3 Require a migration disposition — `MIGRATE`, `READ_COMPATIBLE` or
      `ORPHAN` — on every persisted version change; fail when absent
- [ ] 17.4 **Owner decision required:** whether one disposition is the presumed
      default for a persisted bump
- [ ] 17.5 Implement `MIGRATE`: validate against the old validator first,
      retain the original until the new record is written and re-read, leave
      the original readable on interruption
- [ ] 17.6 Implement `READ_COMPATIBLE` proof: a fixture read at each accepted
      version; removing support for one fails the test
- [ ] 17.7 Make `ORPHAN` a recorded decision in `docs/DECISIONS.md`, never a
      default reached by omission
- [ ] 17.8 Split `VERSION_UNSUPPORTED` out of `CORRUPT` in the review store and
      every other persisted reader; carry the found version and affected count
- [ ] 17.9 Render the distinction on the Control Center reviewer surface: a
      record predating the current schema is a migration, not a defect
- [ ] 17.10 Report affected stores and the disposition in campaign output at
      bump time
- [ ] 17.11 Build the bounded sanitized export: read-only, through the
      redaction layer, written outside the repository, in no gate
- [ ] 17.12 Make a refused checkpoint resume explain itself — differing
      versions, completed work items, whether a restart can consume the ledger
- [ ] 17.13 Mark an unrecoverable campaign terminal rather than perpetually
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

- [ ] 20.1 Enumerate every status distinction the built composition renders
- [ ] 20.2 Require each pair to differ in accessible text or a non-colour
      computed property; a colour-only difference fails naming both values
- [ ] 20.3 Run the check on the built bundle via the existing runtime
      computed-style sweep
- [ ] 20.4 Enumerate rendered foreground/background pairs from the DOM, not the
      stylesheet; assert a non-zero pair count
- [ ] 20.5 Measure contrast against WCAG 2.2 AA for each pair's computed size
      and weight; 3:1 for non-text status boundaries
- [ ] 20.6 Add the reasoned contrast exemption list; fail in both directions
- [ ] 20.7 Drive every operator workflow by keyboard in the browser lane:
      navigation, paging, run selection, graph drill-down, filtering, review
      decision
- [ ] 20.8 Assert visible focus at every step, reading-order focus, no
      pointer-only control, no unintended focus trap
- [ ] 20.9 Assert the existing navigation behaviour survives: title set and
      main content focused only for operator navigation
- [ ] 20.10 Add automated structural auditing per view with a reasoned
      both-directions violation-exemption list
- [ ] 20.11 State the audit's own limit in its output: structural subset, not
      certification
- [ ] 20.12 Register the new suites, refresh `inventoryDigest`, UI and browser
      lanes, integrate

## 21. Authenticated capability lifecycle

- [ ] 21.1 Define the capture sidecar record: capture instant, environment,
      origin, earliest observed cookie expiry, declared validity window,
      artefact digest — and no cookie value, token or storage value
- [ ] 21.2 Write it atomically with the capture in `auth:capture`; pass it
      through the redaction layer; extend the secret-file ignore patterns
- [ ] 21.3 Add the one-time adoption path so an existing artefact gains a
      record without re-capture
- [ ] 21.4 Implement the pre-flight resolving `VALID`, `EXPIRED`,
      `WRONG_ENVIRONMENT`, `UNKNOWN_AGE`, `MISSING`, `UNREADABLE`
- [ ] 21.5 Evaluate expiry with the existing `storageState.ts` cookie
      applicability logic; add a rule failing on a second implementation
- [ ] 21.6 Refuse every non-`VALID` state before any browser context,
      subprocess, socket or file, with a distinct code and the re-capture
      remedy
- [ ] 21.7 Prove `UNKNOWN_AGE` refuses rather than proceeding optimistically
- [ ] 21.8 Wire the pre-flight into all 18 authorization-gated checks,
      `journey:phase2c`, `explore:phase4`, `api:phase5`, `campaign:real` and
      the C-12 path
- [ ] 21.9 Report authentication state from `status:local`,
      `observe:preflight` and `c12:preflight` reading metadata only — no
      browser, no host contact, no cookie value read
- [ ] 21.10 Warn when remaining validity is shorter than a campaign's declared
      budget, naming both durations
- [ ] 21.11 Surface present-and-expired on the Control Center as an epistemic
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
