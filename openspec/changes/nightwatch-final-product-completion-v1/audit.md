# Audit — final product completion (terminal campaign)

Measured read-only on 2026-09-24/25. Round 1 ran at `78efcc9c`; round 2
re-checked every item at base `1f786a4e1b7e4967d06c930946f1107e32931e8a`
(= origin/main, clean, single worktree, orphan branch `c8bcb74c` present)
after the successor campaign integrated 50 commits. Method: four read-only
audit lanes (A git/continuity/ledger, B product/build/CLI/Control Center,
C autonomous efficacy, D release/security/debt), a NW-AUD backlog triage in
nine batches with adversarial verification of every scope-reducing
disposition, a delta re-check against the new HEAD, and a completeness
critic. No repository file was modified. No Alphaus environment, database or
cloud was contacted. No model call was made. GitHub was read with `gh`, and
the npm registry was queried by lane D (disclosed there).

## Owner decisions taken during planning (2026-09-25)

| ID | Decision |
| --- | --- |
| OD-1 | Scope rule: **tiered terminal disposition**. Every item ends in one recorded disposition; T0/T1/T2-FIX fixed; T2-GATE quarantined; T3 accepted-residual unless S; no discovery loop. |
| OD-2 | Target **`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129**: all 16 conditions MET, bin type-check BLOCKING with 0 exemptions, all 76 entry points on the CLI contract, exact-head CI green at S. |
| OD-3 | Authorized: GitHub CI read/observe; one bounded paid provider proof run; one npm registry advisory query (root + UI lockfiles); delete local branch `session/nightwatch-successor-campaign-en-c8bcb74c` after recording SHA `1441cc8a`. |
| OD-4 | This proposal is written uncommitted in canonical. The implementation session moves it into its worktree and commits it with its task continuity in the M1 bootstrap checkpoint. While it is untracked in canonical, `agent:check`/`project:check`/`handoff:check` fail with `LEDGER_CHANGE_WITHOUT_TASK` (measured, expected). |

## Live truth at `1f786a4e` (contradictions this change resolves)

| Surface | Claims | Live evidence |
| --- | --- | --- |
| `.agent/ACTIVE_TASK.md` | successor campaign COMPLETE, "certified"; "C-00 integration is the only remaining step" | integration already happened; six child STATEs still BLOCKED on a cleared blocker (four with open ledger items); CI red at HEAD |
| Exact-head CI | README "never executed" and also "executed green (run 34705274649)"; CURRENT_STATE `CI_STATUS: NOT_OBSERVED`; `ci-block-record` billing block | run 36080583844 at `1f786a4e` executed every step, FAILED at `c03GrpcTopology.test.ts:389`; 87 of the last 100 runs failed; last green run 2026-09-20 |
| Release certification | README `OPERATIONALLY_ACCEPTED`, "9 PROVEN + 1 stale" | `project:check`: 0/16 MET, certificationRefused, proven=0 stale=10; certified checkpoint `87c4506f` is a docs(c00) commit that no gate ran at |
| Open work | "no unfinished work remains" | 66 active changes; 529 of 607 open boxes struck through, including all 39 NW-AUD proposals; `status:local` sees 75 and hides BLOCKED tasks |
| Autonomous hunting | W13-DEF-01 "repaired"; dossiers emitted | the repair lives only in a task harness; product `campaign run` persists no admission and deletes the checkpoint on NO_PROGRESS |
| Canonical record | ACTIVE_TASK names the successor task | `.git/nightwatch-session.v1.json` still names `nightwatch-production-completion-programme-v1` (RELEASED, base `b14f9d74`) |

## Structural traps (why no terminal claim so far has survived)

1. Evidence bindings live in `config/*.json`, which is not an approved
   checkpoint path, so every re-bind commit becomes the new substantive anchor
   and its own evidence is STALE_ANCESTOR (A-01). This reproduced at
   `87c4506f`.
2. `LIVE_TASK_STATUS` is a literal in `src/core/source/censusFigureLedger.ts`,
   so opening or closing a task is a substantive `src` edit (R2-N6).
3. `src/core/releaseCertification/index.ts:125-141` hard-codes six checks
   `implemented:false` although their capabilities landed, and
   `probeAccessibility` has no MET branch, so 7 of 16 conditions can never be
   MET (A-02/D-01).
4. Once an advance is claimed, any later substantive commit or a passed
   revisit date hard-fails PROJECT_TRUTH (X-04).
5. `HANDOFF_TRUTH` fails in CI on any push whose ACTIVE_TASK declares a
   session worktree, while condition 2 demands CI `EXECUTED_PASS` at exactly
   the substantive checkpoint (D-04).

## Tiers and effort (critic estimate, single C-00 writer)

| Tier | Rule | Est. |
| --- | --- | --- |
| P0 | owner pre-flight on canonical (authorized) | <1 d |
| T0-SPINE | certification/CI/ledger truth; always fixed | 9–12 d |
| T0-D129 | bin type-check BLOCKING + CLI contract (OD-2) | 5–7 d |
| T1 | operator-truth defects on normal local paths; fix or narrow | 12–16 d |
| T2-FIX | contained-DEV S/M, synthetically provable; fix | 5–6 d |
| T2-GATE | contained-DEV L/XL; quarantine behind the DEV-lane registry | 0.5–1 d |
| T3 | latent on frozen/no-caller paths; ACCEPTED_RESIDUAL unless S | 2–3 d |
| T4 | quality debt without operator impact; ratchet, fix S | ~1 d |
| TF | external; recorded owner action | — |

Total: about 33–42 engineer-days. Fixing every item in full would be about
45–55 and is excluded by OD-1.

## External prerequisites (TF) after OD-3

- Production track C-12/C-13/C-14/P4: `POSITIVE_DEPLOYMENT_FACTS` = 0; C-08b
  manifest access and observer identity are organizational (D-22, D-134, D-135).
- Contained-DEV semantic acceptance (Phase 9B/10B) and the owner-manual lane:
  need a fresh DEV storage state (24 days old) and a separate owner
  authorization (D-23, X-10).
- ripple-api re-admission at its new SHA (`4e3e200d` → `e5afe40a`): owner-only
  and recurring. Not a completion criterion; drift is made visible (C-27).
- Provider account validity for the authorized paid proof run: if it is
  unusable, the run records `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, and the
  live proof becomes EXTERNAL (B-20).
- Owner-gated migration of the 50 legacy campaign files in
  `~/.nightwatch/findings`, and the retention apply (programme 5.3/5.4, X-11).

## Active change disposition map

| Group | Changes | Action at M13 |
| --- | --- | --- |
| Complete, unarchived (13) | priority-audit-remediation-sequence, semantic-request-admission (re-tag 3.2/4.2 first), session-mutation-authority-binding, test-infrastructure-performance, provider-resilient-current-yield-w13, certification-closure-and-validation-integrity, validation-classification-and-skip-truth, published-spec-baseline-integrity, continuity-live-waypoint-binding, shard-temp-isolation, successor-campaign-engine, credential-use-binding-successor, live-source-test-hermeticity (after R2-N1/N2) | archive oldest-first |
| Successor partials (4) | shard-certification-integrity, child-process-census-indirection, proxy-event-firewall, run-evidence-transaction-successor | tick with M9/M10 receipts, close children, archive |
| Priority partials (4) | release-evidence-lineage (010), child-process-boundary-totality (014), authenticated-evidence-minimization (018), private-payload-screening (019) | close residual tasks per census, archive |
| NW-AUD originals (39) | 001, 004, 005, 007, 009, 011, 012, 013, 015, 016, 017, 021–043, 044–048 | disposition per census; spec sync only if fully implemented as written, else `--skip-specs` plus record |
| Legacy ledgers (6) | production-completion-programme, autonomous-bug-hunting-programme, autonomous-yield-proof-w11, production-observability-system-map-master-plan, control-center-design-system, exhaustive-repository-audit-proposals | tick-with-citation or strike-with-disposition; set tasks terminal; archive |
| This change | nightwatch-final-product-completion-v1 | archived in the final documentary step |

## Residual-debt census

Classes: A real local defect · B real local quality debt · C completed later ·
D superseded · E historical record · F external prerequisite · G intentional
non-goal · H invalid/stale claim. Sources: R1/R2 lane and triage outputs
(full evidence with file:line citations is in the planning session's
workflow journals; each implementation milestone re-verifies its items at
the live base before editing). Several IDs cross-reference the same defect
(for example NW-AUD-044 ≡ C-05, NW-AUD-029 ≡ C-08); both rows are kept so
neither lineage is lost.

Totals: 228 items — A 71 · B 97 · C 19 · D 6 · E 4 · F 9 · G 5 · H 17.

### P0 — owner pre-flight (authorized) (2)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-04 | Canonical self record still names nightwatch-production-completion-programme-v1 (RELEASED, base b14f9d74), and workspace:status shows it without the… | R1 Lane A | H | low/S | FIX (authorized pre-flight) |
| A-06 | Orphan branch session/...-c8bcb74c (commit 1441cc8a) is superseded and cannot be disposed of through the session CLI | R1 Lane A | D | low/S | FIX (authorized pre-flight) |

### T0-SPINE — certification, CI and ledger truth (66)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-01 | Release certification can never be satisfied: evidence bindings sit on a substantive (non-approved) path, so every re-bind commit makes its own… — R2: evidence moved, anchor chase reproduced. A docs(c00) commit became the certified checkpoint, so the… | R1 Lane A | A | high/M | FIX |
| A-02 | 7 of 16 release conditions can never be MET: checks hard-coded implemented:false after their groups landed, and the accessibility probe cannot… | R1 Lane A | A | high/L | FIX |
| A-03 | CLAIM_TASK_UNKNOWN false positive: a live session's task is looked up in the invoking checkout, and the output tells the caller to release another… — R2: evidence moved. The CLAIM_TASK_UNKNOWN symptom is absent only because no live session exists; the code… | R1 Lane A | A | medium/S | FIX |
| A-07 | No tool reports session branches that have no worktree | R1 Lane A | B | low/S | FIX |
| A-08 | production-completion-programme STATE says IN_PROGRESS with a resolved blocker; 29 of its 47 open boxes were already completed later — R2: worsened. Four successor child tasks are left BLOCKED on a cleared blocker, and their struck validation… | R1 Lane A | B | medium/S | FIX |
| A-09 | autonomous-bug-hunting programme: all 18 open boxes are done; STATE still names milestone W12 | R1 Lane A | H | medium/S | RECONCILE — render from live evidence |
| A-10 | W11 stays IN_PROGRESS with a stale external 'provider unavailable' blocker that W12/W13 superseded | R1 Lane A | H | low/S | RECONCILE — render from live evidence |
| A-11 | Observability master plan: 4 of its 10 open tracks are done; the other 6 are external or out of scope — reclassified F→C | R1 Lane A | C | low/S | COMPLETED_LATER — tick with citation |
| A-14 | CI block-record judgements are not wired into agent:check/project:check; two CI authorities disagree (programme 3.8, 3.9) | R1 Lane A | B | low/S | FIX |
| A-18 | Contradictory completion, lane and CI claims across README, RELEASE-ADVANCE-CONDITIONS, CURRENT_STATE, the CI block record and live project:check — R2: partially changed. The CURRENT_STATE v2 block advanced, but the file now contradicts itself; README,… | R1 Lane A | H | medium/S | RECONCILE — render from live evidence |
| A-19 | The release-certification schema cannot represent the 13.8 decision, so the machine verdict contradicts D-129 | R1 Lane A | H | low/S | RECONCILE — render from live evidence |
| A-20 | Production track data does not match D-134: C-14 reports REPOSITORY_WORK_REMAINING for a stage that is closed terminal | R1 Lane A | H | low/S | RECONCILE — render from live evidence |
| A-21 | 514 struck-through deferred items behind COMPLETE tasks do not appear in open-work accounting (39 NW-AUD proposals at 0/N) — R2: worsened. Four successor child tasks are left BLOCKED on a cleared blocker, and their struck validation… | R1 Lane A | B | medium/S | FIX |
| A-22 | 9 completed OpenSpec changes never archived — R2: worsened. Complete-but-unarchived changes rose 9 to 13; active changes 58 to 66 | R1 Lane A | B | low/S | FIX |
| A-24 | New successor changes on the live branch may duplicate NW-AUD originals — R2: confirmed (was PLAUSIBLE). Successor changes do not reference, reconcile or narrow their NW-AUD originals | R1 Lane A | B | low/S | FIX |
| B-14 | gate:clean (the fresh-clone proof) covers neither the UI package nor the full regression, and its receipt is not persisted | R1 Lane B | B | medium/M | FIX |
| B-15 | CURRENT_STATE and lane state still name c18db55 as the last clean-validated SHA, contradicting the green clean receipt at 8200ae4f — R2: partially changed. The CURRENT_STATE v2 block advanced, but the file now contradicts itself; README,… | R1 Lane B | H | low/S | RECONCILE — render from live evidence |
| B-16 | README status block contradicts itself on exact-head CI and overstates completion — R2: partially changed. The CURRENT_STATE v2 block advanced, but the file now contradicts itself; README,… | R1 Lane B | H | low/S | RECONCILE — render from live evidence |
| B-19 | UI lane-state evidence text is historical (63 tests), but the lane currently passes at 101 | R1 Lane B | E | low/n/a | HISTORICAL — preserve |
| C-30 | Stale ledgers and docs misdescribe the agent path (autonomous programme 18/18 unchecked; PRINT_CLI called 'deterministic'; 'receives no… | R2 Lane C | H | low/S | RECONCILE — render from live evidence |
| D-01 | Release certification is structurally unsatisfiable: 6 conditions can never reach MET despite implemented checks | R1 Lane D | A | high/L | FIX |
| D-02 | CI is red at HEAD: reviewStore traversal test compares the shared os.tmpdir() listing — R2: not fixed. Shard temp isolation does not reach the CI group that failed; the test passed this time by… | R1 Lane D | A | high/S | FIX |
| D-03 | The three CI records are stale and contradict each other; CI is executable, not billing-blocked — R2: partially changed. The CURRENT_STATE v2 block advanced, but the file now contradicts itself; README,… | R1 Lane D | H | high/S | RECONCILE — render from live evidence |
| D-04 | CI signal is mostly noise: HANDOFF_TRUTH fails on every push that declares a session worktree — reclassified B→A; R2: not reproduced in CI because pushes were batched at canonical routing; the mechanism… | R1 Lane D | A | medium/M | FIX |
| D-05 | Nine certification conditions and ten lanes carry evidence 390 commits behind the certified checkpoint | R1 Lane D | B | medium/M | FIX |
| D-06 | Evidence SHAs predate the evidence they certify | R1 Lane D | H | medium/S | RECONCILE — render from live evidence |
| D-07 | Programme tasks 9.1-9.3 still say the advisory query was withheld; config records it as executed | R1 Lane D | H | low/S | RECONCILE — render from live evidence |
| D-08 | Dependency assessment excludes the ui/control-center lockfile, which has 2 unrecorded moderate advisories | R1 Lane D | B | medium/M | FIX |
| D-10 | No skip-identity allowlist for the full regression; the existing allowlist covers only 13 of the 18 skips — R2: partially changed. Shard receipts now fail ALL_SKIPPED shards and phase12 G03 became a real before/after… | R1 Lane D | B | medium/M | FIX |
| D-11 | 12 of the 18 skips can never execute: hard-coded /tmp snapshots with no tracked creator | R1 Lane D | B | medium/M | FIX |
| D-12 | Tests pass without testing anything when the disposable snapshot is absent (counted as passed, not skipped) — R2: partially changed. Shard receipts now fail ALL_SKIPPED shards and phase12 G03 became a real before/after… | R1 Lane D | B | medium/M | FIX |
| D-18 | The UI and browser lanes (incl. accessibility certification) are outside gate:ci and gate:local | R1 Lane D | B | low/M | FIX |
| D-19 | CI runtime is out of date: Node 20 EOL, deprecated action runtimes, runner image changing | R1 Lane D | B | low/S | FIX |
| D-24 | The earlier CI failure in observerSemanticLedger.test.ts:77 is fixed at HEAD — reclassified C→A; R2: STATUS CHANGED (C to A): observerSemanticLedger.test.ts:77 is nondeterministic and red… | R1 Lane D | A | low/M | FIX |
| NW-AUD-001 | ci-action-supply-chain-integrity-v1: The only CI workflow runs actions/checkout@v4 and actions/setup-node@v4, which are mutable tags — present@HEAD=YES | R1 triage | A | medium/M | FIX |
| NW-AUD-010 | release-evidence-lineage-integrity-v1 — present@HEAD=PARTIAL | priority/R2 partials | B | high/n/a | FIX residual 5.2/5.3 via M2/M4/M13; 5.1/7.1/7.2 COMPLETED_LATER |
| NW-AUD-014 | child-process-boundary-totality-v1 — present@HEAD=PARTIAL | priority/R2 partials | B | high/n/a | FIX 3.2 via R2-03/R2-04; 3.3/4.1/4.2 per R2-15/R2-17; rest COMPLETED_LATER |
| R2-01 | live-source-test-hermeticity is falsely complete: exact-head CI at HEAD fails c03GrpcTopology.test.ts:389 (regression from b48604be) | R2 partials | A | high/S | FIX |
| R2-03 | Child-process census indirection still fails OPEN for dynamic import(), createRequire and namespace destructuring, contrary to its design | R2 partials | A | medium/S | FIX |
| R2-09 | NW-AUD-010 task 5.2 (re-run owning checks at exact checkpoint, re-bind) is blocked by local certification design defects | R2 partials | A | high/L | FIX |
| R2-11 | NW-AUD-010 task 5.3: release documentation still contradicts the hardened verdict | R2 partials | B | medium/S | FIX |
| R2-18 | NW-AUD-014 task 4.3: mutation registry covers only part of the listed classes | R2 partials | B | low/S | FIX |
| R2-21 | NW-AUD-014 task 5.2: safety documentation never describes the child-process census or profiles | R2 partials | B | low/S | FIX |
| R2-23 | Successor reconcile lines (census 4.1, shard 4.2, proxy-firewall 4.1, run-evidence 4.1) never done; six child STATEs still BLOCKED on a resolved… | R2 partials | B | medium/S | FIX |
| R2-30 | Successor mutation proofs are one-off /tmp scripts; no probe was registered for any successor guard | R2 partials | B | medium/M | FIX |
| R2-37 | NW-AUD-021 task 4.3: mutations not registered | R2 partials | B | low/S | FIX |
| R2-38 | NW-AUD-021 task 5.2: auth, safety and architecture docs not updated (integration done) | R2 partials | B | low/S | FIX |
| R2-44 | NW-AUD-024 tasks 4.1 and 4.2: adversarial tests partial and mutations unregistered | R2 partials | B | low/S | FIX |
| R2-45 | NW-AUD-024 task 4.4: evidence architecture and safety truth not updated (integration done) | R2 partials | B | low/S | FIX |
| R2-49 | NW-AUD-022 tasks 4.2 and 4.3: crash/duplicate/concurrency/capacity faults and mutation registration missing | R2 partials | B | low/M | FIX |
| R2-51 | control-center-design-system task 6.4 (focus-indicator contrast measurement): disposition unchanged | R2 partials | B | low/S | FIX |
| R2-61 | Changed disposition: exact-head CI is no longer 'never observed / billing-blocked' — it executes on every push and is red for local causes | R2 partials | H | high/S | RECONCILE — render from live evidence |
| R2-62 | status:local open-work silently excludes BLOCKED tasks, so six BLOCKED children are invisible ('blockers: 0') | R2 partials | B | low/S | FIX |
| R2-63 | The successor campaign changed seven safety or validation behaviours without any DECISIONS, SAFETY_MODEL or ARCHITECTURE record | R2 partials | B | low/S | FIX |
| R2-65 | CI semantic-lane flake: observerSemanticLedger.test.ts:77 failed at 3506dd48 and passed at HEAD with identical test code | R2 partials | B | low/M | FIX |
| R2-CI | CI measurement at HEAD 1f786a4e: RED (executed; 10 of 12 groups ran, 1 failed, 2 NOT_RUN) | R2 delta | A | high/S | FIX |
| R2-N1 | CI red at HEAD: hermeticity commit removed the sibling skip but left c03GrpcTopology.test.ts:389 unguarded | R2 delta | A | high/S | FIX |
| R2-N2 | Hermeticity turned honest skips into tautological passes; STALE ripple-api means its live-source assertions now run on no host | R2 delta | A | medium/M | FIX |
| R2-N3 | gate:clean is not sibling-hermetic, and its receipt field siblingWrites:0 is a hard-coded literal | R2 delta | A | medium/S | FIX |
| R2-N6 | Live task status is a literal in src/core/source/censusFigureLedger.ts, so every campaign lifecycle transition needs a substantive src commit — reclassified B→A | R2 delta | A | low/S | FIX |
| X-02 | The only CI-absence simulator (gate:topology) is in no certifying gate, its static scan misses imported path constants, and the gate's… | R2 critic | A | high/M | FIX |
| X-04 | Once completion is claimed, any later substantive commit or a revisit date passing turns PROJECT_TRUTH red, so the terminal state decays into a new… | R2 critic | A | medium/M | FIX |
| X-06 | Archiving the NW-AUD proposals the default way would write requirements that were never implemented into the published spec baseline | R2 critic | B | medium/S | FIX |
| X-07 | CURRENT_STATE status rows and ROADMAP headings still say CI is externally blocked and name superseded provider blockers | R2 critic | H | low/S | RECONCILE — render from live evidence |
| X-08 | The session terminal-closeout relaxation skips the STATE-branch check for any branch, not only the canonical one, and is covered only by a positive… | R2 critic | B | low/S | FIX |
| X-09 | Refreshing dependency-advisory lane evidence at the final checkpoint needs owner-authorized registry egress | R2 critic | F | low/n/a | EXECUTE (authorized registry query at S) |

### T0-D129 — D-129 debt (OD-2) (10)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-12 | Operator CLI contract incomplete: 28 of 76 bins undeclared; the shared-parser rule is not blocking (programme 4.5-4.8, 4.10, 4.11) | R1 Lane A | B | medium/L | FIX |
| A-13 | bin type-check lane still REPORTING (programme 15.7, 15.11) — R2: worsened. bin type-check errors rose 1515 to 1522 because the successor campaign modified… | R1 Lane A | B | medium/M | FIX |
| B-05 | Operator CLI migration incomplete: 28 of 76 bins (39 of 91 bin-invoking npm scripts) bypass the shared parser; help, unknown-flag and exit-code… | R1 Lane B | B | medium/XL | FIX |
| B-06 | README says every entry answers --help without executing; 28 entries do not declare it, and some execute | R1 Lane B | H | medium/S | RECONCILE — render from live evidence |
| B-07 | bin/ typecheck lane is report-only: 1515 diagnostics, 14/76 conforming, no baseline, not in the quality gate — R2: worsened. bin type-check errors rose 1515 to 1522 because the successor campaign modified… | R1 Lane B | B | medium/M | FIX |
| D-13 | bin type-check conformance is 14/76 with 1515 errors, still in REPORTING mode — R2: worsened. bin type-check errors rose 1515 to 1522 because the successor campaign modified… | R1 Lane D | B | medium/M | FIX |
| D-14 | Operator CLI contract: 28 of 76 entry points undeclared | R1 Lane D | B | medium/L | FIX |
| R2-58 | production-completion-programme: 12 real debt items unchanged (operator CLI, bin typecheck, CI block wiring, dtoFramework, CF-1) | R2 partials | B | medium/L | FIX |
| X-03 | Terminal-status constraint no lane surfaced: D-129 permits only PROJECT_COMPLETE_AND_CI_CERTIFIED, and two of its 16 conditions make the bin… | R2 critic | B | high/XL | FIX |
| X-12 | Tooling from superseded waves and the thin phase*-real wrappers count against the bin surface that conditions 5 and 10 must fully cover | R2 critic | B | low/S | FIX |

### T1 — operator-truth defects on normal local paths (54)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| B-01 | Control Center Runs and Execution Graph go UNAVAILABLE once artifacts/ exceeds 256 directories, reported with a misleading OVERSIZED code | R1 Lane B | A | high/M | FIX |
| B-02 | Campaign orchestrator writes checkpoints, manifests and briefs into the findings dossier root, so the Findings view stays UNKNOWN | R1 Lane B | A | high/M | FIX |
| B-03 | `nightwatch agent campaign run` dispatches multi-hour campaigns into a child killed after 180 s | R1 Lane B | A | high/S | FIX |
| B-04 | `campaign:findings` / `nightwatch findings` returns a hard-coded actionableFindings: 0 | R1 Lane B | A | medium/S | FIX |
| B-08 | README install path is incomplete for a first-time operator: no UI dependency install, no autonomous-hunt launch, no auth adoption or configure… | R1 Lane B | B | medium/S | FIX |
| B-09 | Documented Chromium fallback does not work without editing the tracked Playwright config | R1 Lane B | H | low/S | RECONCILE — render from live evidence |
| B-10 | Default sibling-source root is hard-coded to the owner's home path, and source intelligence and the Control Center source view ignore the override — R2: partially fixed. nightwatch-intelligence honours NIGHTWATCH_REPOS_ROOT; the Control Center source view… | R1 Lane B | B | medium/S | FIX |
| B-11 | Safety Center screen is wired to a constant empty input and is permanently UNKNOWN with zero checks | R1 Lane B | B | medium/M | FIX |
| B-12 | Autonomous agent campaigns (the main bug-hunt output) are not visible in the Control Center, and nightwatch-agent status is a static constant | R1 Lane B | B | medium/L | FIX |
| B-13 | Operator JSON and diagnostics print absolute machine paths | R1 Lane B | B | low/S | FIX |
| B-17 | nightwatch:status / campaign:plan\|coverage\|contracts\|gaps\|operator report synthetic Phase 19-21 previews under operator-facing names | R1 Lane B | B | low/S | FIX |
| B-18 | status:local renders auth entries under 'blockers: 0' as if they were blockers | R1 Lane B | B | low/S | FIX |
| C-01 | Product campaign run never persists admitted dossiers; NO_PROGRESS/CANCELLED/SAFETY_BLOCKED delete the only checkpoint, so admissions survive only… | R2 Lane C | A | high/M | FIX |
| C-02 | Idempotent resume of a TERMINATED campaign re-derives admissions from an empty history, flipping VERIFIED_REPRODUCTION to REFUSED_NO_REPRODUCTION | R2 Lane C | A | medium/S | FIX |
| C-03 | B-03 still present: `nightwatch agent campaign run` dispatcher kills hunts after 180 s and drops NIGHTWATCH_REPOS_ROOT/PRINT_DEBUG | R2 Lane C | A | high/S | FIX |
| C-04 | Provider failure is indistinguishable from budget exhaustion in product output; the W13 ten-class provider taxonomy is computed then dropped | R2 Lane C | A | medium/M | FIX |
| C-05 | NW-AUD-044 still present, and reasoner identity is vacuous on the print path (records the node binary, not the provider CLI/model) | R2 Lane C | A | medium/M | FIX |
| C-06 | NW-AUD-045 still present: resumed investigation budget counts in-flight usage twice (false BUDGET_EXHAUSTED) | R2 Lane C | A | medium/M | FIX |
| C-07 | No signal handling or progress checkpoint: an interrupted multi-hour campaign loses all progress and orphans the detached reasoner process group | R2 Lane C | A | medium/M | FIX |
| C-08 | NW-AUD-029 re-confirmed: v1 protocol dossier persisted READY after failed minimization, making the campaign COMPLETE_WITH_FINDINGS and the morning… | R2 Lane C | A | high/M | FIX |
| C-09 | NW-AUD-048 re-confirmed: Control Center collapses dossier status to a boolean READY/INCOMPLETE (false READY from C-08; V2 UNRESOLVED shown as… | R2 Lane C | A | medium/S | FIX |
| C-10 | NW-AUD-025 re-confirmed: anomaly admission deduplicates by runId only, so any 2 or 3 distinct run labels reach L1/L2 regardless of contextKind | R2 Lane C | A | medium/L | FIX |
| C-11 | Print adapter leaks the prompt file (containing untrusted source bytes) and its isolated cwd on every provider failure | R2 Lane C | A | low/S | FIX |
| C-12 | `campaign findings` lists proposed (unadmitted) candidate IDs, flattened across campaigns without namespacing, as findings | R2 Lane C | A | low/S | FIX |
| C-13 | B-04 re-confirmed: campaign:findings / `nightwatch findings` returns hard-coded actionableFindings: 0 | R2 Lane C | A | medium/S | FIX |
| C-14 | Resume silently uses 8 turns per investigation while run defaults to 50; maxTurns is not persisted | R2 Lane C | A | low/S | FIX |
| C-15 | Failover-policy validator accepts provider orders the engine ceilings can never reach (README's 'future owner decision' item) | R2 Lane C | A | low/S | FIX |
| C-16 | Failure ceilings are fixed across 1h..overnight, 'retries' counts every failure, and there is no backoff, so long hunts cannot survive transient… | R2 Lane C | B | high/M | FIX |
| C-18 | Current-source reproduction does not discriminate environment-caused assertion failures; admissions are labelled VERIFIED_REPRODUCTION | R2 Lane C | B | medium/M | FIX |
| C-19 | Autonomous finding dossier has no stable identity or source binding (no dossierId, campaignId, repo HEAD, failing-test fingerprint, reasoner identity) | R2 Lane C | B | medium/M | FIX |
| C-20 | No owner-review or Control Center path for autonomous findings; nightwatch-agent status is a static constant (B-12) | R2 Lane C | B | medium/L | FIX |
| C-21 | B-02 re-confirmed: campaign orchestrator state in the findings root blanks the Control Center Findings view | R2 Lane C | A | high/M | FIX |
| C-22 | B-10 only partly fixed: the Control Center source view, the historical context and the env-surface consumer list still ignore NIGHTWATCH_REPOS_ROOT;… | R2 Lane C | B | medium/S | FIX |
| C-23 | Operator path is undocumented and cannot run a short bounded proof: no README launch section, no npm script, minimum duration 1h, no wall-clock flag | R2 Lane C | B | low/S | FIX |
| C-24 | Print adapter fills in missing model evidence refs with all observed campaign refs and defaults TERMINATE/REJECT reasons, so groundedness looks… | R2 Lane C | B | low/S | FIX |
| C-25 | status:local currentness is permanently unevaluated=6: no production caller supplies source-contract movement evidence | R2 Lane C | B | low/M | FIX |
| C-26 | Source currency and provenance are HEAD-only: working-tree bytes are labelled with the HEAD SHA, dirty trees go undetected, stale repos are silently… — reclassified B→A | R2 Lane C | A | medium/M | FIX |
| C-28 | Honest-measurement machinery (failover supervisor, provider attribution, run receipts, sibling identity, safety proof, dossier persistence) exists… | R2 Lane C | B | high/L | FIX (minimal product run receipt, D7); multi-provider failover stays an owner option |
| C-29 | NW-AUD-047 (partial) and NW-AUD-046 re-confirmed unchanged: silent S3/MEDIUM/title defaults claiming grounding; Lane C atlas synthetic fallback | R2 Lane C | B | low/S | FIX |
| NW-AUD-012 | configuration-layer-authority-integrity-v1: Launchers validate a process+.env merge, then execute and forward from ambient process.env, so values… — present@HEAD=YES | R1 triage | A | medium/L | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-025 | replay-context-provenance-integrity-v1: Anomaly admission deduplicates by runId only and ignores contextKind, so any 2 or 3 distinct run labels… — present@HEAD=YES | R1 triage | A | high/L | FIX |
| NW-AUD-029 | protocol-dossier-readiness-integrity-v1: The v1 protocol dossier constructor hard-codes status READY — present@HEAD=YES | R1 triage | A | high/M | FIX |
| NW-AUD-036 | source-snapshot-transaction-integrity-v1: The audit found four gaps — present@HEAD=YES | R1 triage | A | high/L | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-039 | semantic-partial-observation-soundness-v1: Incomplete projection evidence collapses into decisive outcomes — present@HEAD=YES | R1 triage | A | high/L | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-040 | semantic-source-analyzer-proof-soundness-v1: The Phase-20 source analyzers mark regex matches over raw text as MECHANICALLY_PROVABLE — present@HEAD=YES; re-tiered: (Tier 1, narrowed, M) | R1 triage | A | high/XL | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-041 | semantic-coverage-evidence-authority-v1: The Phase 20/21 semantic coverage lifecycle treats caller booleans and structural DTOs as proof — present@HEAD=YES | R1 triage | B | high/L | FIX |
| NW-AUD-042 | semantic-gap-ledger-integrity-v1: The gap closure ledger is not evidence-bound and does not preserve the census — present@HEAD=YES | R1 triage | B | medium/M | FIX |
| NW-AUD-044 | campaign-resume-reasoner-identity-binding-v1: resumeLocalCliCampaign builds a fresh CLI driver from the caller's executable/args/provider/model and… — present@HEAD=YES | R1 triage | A | high/M | FIX |
| NW-AUD-045 | investigation-resume-budget-arithmetic-integrity-v1: When a paused investigation resumes, its in-flight usage is subtracted from the policy passed… — present@HEAD=YES | R1 triage | A | medium/M | FIX |
| NW-AUD-046 | agent-tool-fixture-fallback-integrity-v1: When a caller supplies no fixture, the Lane C executeAgentTool atlas adapters fall back to synthetic… — present@HEAD=YES | R1 triage | B | medium/S | FIX |
| NW-AUD-047 | local-finding-admission-grounding-integrity-v1: Three sub-claims — present@HEAD=PARTIAL | R1 triage | B | medium/S | FIX |
| NW-AUD-048 | control-center-finding-status-projection-integrity-v1: The Control Center finding summary maps dossier status with a boolean (`status === 'READY' ?… — present@HEAD=PARTIAL | R1 triage | A | medium/S | FIX |
| X-01 | The Control Center Runs view reads only the checkout's artifacts/ directory. Unit tests fill it; real contained-DEV runs are written elsewhere and… | R2 critic | A | high/M | FIX |
| X-05 | Owner-local reproduction copies the sibling's working tree, including uncommitted changes, and labels admissions with the HEAD SHA; ouchan, the only… | R2 critic | A | high/S | FIX |

### T2-FIX — contained-DEV, S/M, synthetically provable (28)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| NW-AUD-015 | auth-capability-bundle-transaction-integrity-v1: The storage-state file and its lifecycle sidecar are published by separate writes — present@HEAD=YES | R1 triage | A | medium/M | FIX |
| NW-AUD-016 | proxy-runtime-instance-attestation-v1: Proxy admission trusts a self-asserted runtime-state JSON file plus any loopback listener that returns HTTP… — present@HEAD=YES | R1 triage | A | high/L | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-018 | authenticated-evidence-minimization-integrity-v1 — present@HEAD=PARTIAL | priority/R2 partials | B | high/n/a | FIX 4.2 residual tests (R2-25) |
| NW-AUD-020 | semantic-request-admission-integrity-v1 — present@HEAD=PARTIAL | priority/R2 partials | B | high/n/a | FIX popup L0 plus tests (R2-05/R2-28); re-tag 3.2/4.2 until proven |
| NW-AUD-021 | dev-credential-use-binding-v1: The DEV auto-login checks the page URL and the uniqueness and visibility of three generic locators, then retrieves… — present@HEAD=YES; R2: partially fixed by c1670abe. The one-shot DOM binding is checked before each fill, but… | R1 triage | B | high/S | FIX |
| NW-AUD-022 | proxy-evidence-effect-ordering-v1: For allowed destinations, HTTP piping, the CONNECT 200 plus socket coupling, and the Upgrade handshake forwarding… — present@HEAD=YES; R2: partially changed by d5175a7d. Proxy events are now schema-validated and fsynced, but… | R1 triage | A | medium/M | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-023 | browser-context-guard-transaction-integrity-v1: createNightwatchContext creates a BrowserContext and page, then runs many fallible setup stages with… — present@HEAD=YES | R1 triage | A | high/L | NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL) |
| NW-AUD-024 | run-evidence-bundle-transaction-integrity-v1: The run recorder reuses an existing run directory and there is no exclusive bundle generation — present@HEAD=PARTIAL; R2: partially fixed by ea0b7110. Exclusive run directory, fsync, integrity latch and… | R1 triage | B | high/S | FIX |
| NW-AUD-028 | phase5-relay-invocation-authority-v1: The Phase-5 relay treats the public operation ID in the URL and X-Nightwatch-Operation-Id header as its only… — present@HEAD=YES | R1 triage | A | medium/M | FIX |
| NW-AUD-035 | browser-response-acquisition-integrity-v1: The network observer races `response.body()` against a 5 s timer — present@HEAD=YES | R1 triage | B | medium/M | FIX |
| NW-AUD-043 | change-intelligence-source-generation-integrity-v1: The audit found three gaps in change-directed selection — present@HEAD=YES | R1 triage | A | medium/M | FIX |
| R2-02 | Run-evidence successor exclusive run dir makes every repeat phase7 real campaign fail with RUN_EVIDENCE_DIRECTORY_EXISTS (deterministic runIds) | R2 partials | A | medium/S | FIX |
| R2-04 | NW-AUD-014 task 3.2 still real: implicit ambient-env inheritance and unenforced per-call bounds | R2 partials | A | medium/M | FIX |
| R2-05 | Popup L0 residual (NW-AUD-020 / successor 'future design prerequisite'): redirect follow-up of a popup's first navigation bypasses L1 and L0 | R2 partials | A | medium/M | FIX |
| R2-06 | NW-AUD-022 core effect-before-evidence ordering unchanged (original tasks 1.2, 1.3, 2.2, 2.3, 3.1, 3.2, 4.1, 5.1, 5.2) | R2 partials | A | medium/L | FIX |
| R2-07 | NW-AUD-021 task 2.2 residual: credential binding re-checks then acts through re-resolving Locators (check-then-act race) | R2 partials | A | low/S | FIX |
| R2-08 | NW-AUD-024 task 3.3 residual: observers still swallow failures; download.cancel() skipped if the recorder throws | R2 partials | A | low/S | FIX |
| R2-25 | NW-AUD-018 task 4.2 residual reduced: concurrent recorders now refused; killed-process and pre-seeded temp-collision tests still missing | R2 partials | B | low/S | FIX |
| R2-28 | NW-AUD-020 task 4.1 PARTIAL tests and task 4.3 stale-currentness probe gap | R2 partials | B | low/M | FIX |
| R2-31 | NW-AUD-021 task 1.1: no credential retrieval/use/zeroization consumer census | R2 partials | B | low/S | FIX |
| R2-32 | NW-AUD-021 task 1.2: regressions only partly added by the successor | R2 partials | B | low/S | FIX |
| R2-34 | NW-AUD-021 task 2.1: binding lacks source-approved form action, expected exchange and proxy-instance binding | R2 partials | B | low/S | FIX |
| R2-36 | NW-AUD-021 tasks 4.1 and 4.2: adversarial matrix mostly missing | R2 partials | B | low/M | FIX |
| R2-39 | NW-AUD-024 task 1.1: no complete run-evidence writer/reader/observer denominator | R2 partials | B | low/S | FIX |
| R2-40 | NW-AUD-024 task 1.2: regressions partly added; manifest reset-on-parse-error and swallowed-observer cases still untested and present | R2 partials | B | low/S | FIX |
| R2-43 | NW-AUD-024 task 2.3: network/console JSONL mirrors are not validated against events.jsonl at finalize | R2 partials | B | low/S | FIX |
| R2-46 | NW-AUD-022 task 1.1: proxy effect/evidence path denominator not discovered | R2 partials | B | low/S | FIX |
| R2-64 | RunRecorder now fsyncs synchronously on every event and enforces the 25k-event / 16MB bound only at finalize | R2 partials | B | low/S | FIX |

### T2-GATE — contained-DEV redesigns, quarantined (4)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| NW-AUD-026 | exploration-observed-postcondition-integrity-v1: The real Ripple exploration runtime writes the catalog's expectedStructuralDelta into its own view… — present@HEAD=YES | R1 triage | A | medium/L | QUARANTINE — DEV-lane precondition registry |
| NW-AUD-037 | real-source-expectation-authority-integrity-v1: Real-source expectation authority rests on shape checks, not on proof from the producer — present@HEAD=YES | R1 triage | A | high/L | QUARANTINE — DEV-lane precondition registry |
| NW-AUD-038 | semantic-receipt-acceptance-integrity-v1: Semantic receipts and findings have split parser strength and composable acceptance — present@HEAD=YES | R1 triage | A | medium/L | QUARANTINE — DEV-lane precondition registry |
| R2-47 | NW-AUD-022 task 2.1: journal binding to the attested proxy instance depends on NW-AUD-016 | R2 partials | B | low/M | QUARANTINE — DEV-lane precondition registry |

### T3 — latent on frozen / no-caller / one-shot paths (19)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-15 | dtoFramework adopted (D-131) but migration unfinished: the hand-rolled validators are wrapped, not removed (programme 14.7) | R1 Lane A | B | low/L | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| NW-AUD-004 | exact-runtime-toolchain-identity-v1: CI selects the moving major `node-version: 20` — present@HEAD=YES | R1 triage | A | medium/L | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-005 | retention-crash-consistent-receipts-v1: Evidence-retention apply does one best-effort write of a receipt that says STARTED with an empty deletedSet,… — present@HEAD=YES | R1 triage | A | medium/L | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-007 | change-shadow-offline-runtime-integrity-v1: The audit said change:shadow ran `npx tsc` twice, so a missing local dependency could fetch and run an… — present@HEAD=PARTIAL | R1 triage | B | medium/M | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-009 | local-report-publication-integrity-v1: Six current.json report writers use mkdirSync + direct truncating writeFileSync: no symlink refusal, no… — present@HEAD=YES | R1 triage | B | medium/M | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-011 | canonical-promotion-transaction-serialization-v1: Canonical self-dev apply is one-shot per approval ID only — present@HEAD=YES | R1 triage | A | medium/L | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-013 | schema-preservation-integrity-v1: schema:export pre-slices candidates to 10,000 and swallows every per-record read/parse failure before the… — present@HEAD=YES; re-tiered: latent (Tier 3 | R1 triage | A | high/L | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-017 | l6-qualification-proof-integrity-v1: L6 qualification marks every proof field PROVEN even though the Node probe's UDP result is left out of… — present@HEAD=YES; re-tiered: latent (Tier 3 | R1 triage | A | high/L | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-019 | private-payload-screening-structural-integrity-v1 — present@HEAD=PARTIAL | priority/R2 partials | B | high/n/a | 2.2 → ACCEPTED_RESIDUAL via the D-131 end-state decision; 5.1 COMPLETED_LATER |
| NW-AUD-027 | production-persistence-lifecycle-integrity-v1: Three gaps in the retained C-10 production-local persistence modules: (1) profile cleanup recursively… — present@HEAD=YES | R1 triage | B | medium/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| NW-AUD-030 | triage-evidence-contract-integrity-v1: The durable triage-evidence validators have gaps — present@HEAD=YES | R1 triage | B | medium/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| NW-AUD-031 | durable-artifact-validation-bounds-v1: The artifact facade validateArtifact returns any leaf Error.message verbatim and runs no preflight budget — present@HEAD=PARTIAL | R1 triage | B | medium/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| NW-AUD-032 | phase6-owner-scope-quarantine-integrity-v1: The owner-freeze check exists only inside the default GatedReadToolInvoker — present@HEAD=YES; reclassified G→A; verify refuted G→A | R1 triage | A | medium/S | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-033 | production-budget-reservation-lifecycle-integrity-v1: The C-11 run gate reserves budget (including the in-flight concurrency slot) at… — present@HEAD=YES | R1 triage | B | medium/S | NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder |
| NW-AUD-034 | production-observation-receipt-integrity-v1: validatePqReceipt accepts extra keys, checks gateDefinitionDigest by shape only (it never recomputes… — present@HEAD=YES | R1 triage | B | medium/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| R2-15 | NW-AUD-014 task 3.3: fixed tools (git/gh/etc.) resolved via PATH with no exact identity or digest | R2 partials | B | low/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| R2-17 | NW-AUD-014 tasks 4.1 and 4.2: no executing child-process proof (ambient-secret inspection, fake PATH, hung or forked children) | R2 partials | B | medium/M | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| R2-26 | NW-AUD-019 task 2.2: family-specific safe DTO constructors not implemented; store still accepts unknown | R2 partials | B | low/L | ACCEPTED_RESIDUAL — owner-signed DECISIONS |
| R2-29 | NW-AUD-020 tasks 3.2 and 4.2 are marked [x] without qualification but do not hold at the popup redirect boundary | R2 partials | H | medium/S | RECONCILE — render from live evidence |

### T4 — quality debt without operator impact (7)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-16 | CF-1 fuzz/property ≥20 cases never re-measured; probably already met | R1 Lane A | B | low/S | FIX |
| D-15 | Campaign clustering has a dead fallback: a failed semantic observation would be silently dropped | R1 Lane D | B | low/S | FIX |
| D-16 | Leftover debug console.log in the settlement wait | R1 Lane D | B | low/S | FIX |
| D-17 | Unused exports: 122 exported value symbols in src/ are referenced nowhere (reachability is checked per module only) | R1 Lane D | B | low/M | RATCHET |
| D-20 | Deprecated serializer aliases still have live callers | R1 Lane D | B | low/S | FIX |
| X-11 | Evidence retention covers only artifacts/; tracked docs pin 57 run directories that a clean clone does not have; the 43.6 MB of campaign state in… | R2 critic | B | low/M | RATCHET |
| X-13 | The deep L6 containment lane is NOT_EXERCISED in CI by design; it is required only where the host can prove it | R2 critic | G | low/n/a | NON_GOAL — cite owner scope/decision |

### TF — external prerequisites (8)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-17 | Remaining owner and external items in the programme ledger | R1 Lane A | F | low/n/a | EXTERNAL — owner action + revisit |
| B-20 | Running a real autonomous bug hunt needs an external reasoner CLI/provider | R1 Lane B | F | medium/n/a | EXECUTE (authorized proof run); EXTERNAL only if the provider account is unusable |
| C-27 | ripple-api has advanced past its pinned SHA again, so the hunt universe silently excludes it and a scoped ripple-api run fails… — re-tiered: F (recurring operational maintenance, not a terminal blocker) | R2 Lane C | F | medium/n/a | EXTERNAL — owner action + revisit |
| D-22 | Production track: C-12/C-13/P4 are external; C-14 repository work depends on C-13 evidence | R1 Lane D | F | low/n/a | EXTERNAL — owner action + revisit |
| D-23 | The owner-manual lane and tests/manual harness skips are gated on authorization | R1 Lane D | F | low/n/a | EXTERNAL — owner action + revisit |
| R2-55 | observability master plan C-07 DEV, C-08b, C-12, C-13, C-14: disposition unchanged (external/owner) | R2 partials | F | low/S | EXTERNAL — owner action + revisit |
| R2-59 | production-completion-programme 5.3, 5.4, 11.3, 11.4, CF-2: disposition unchanged (owner/external) | R2 partials | F | low/n/a | EXTERNAL — owner action + revisit |
| X-10 | The DEV storage state is 24 days old, so any contained-DEV validation needs the owner to re-capture it | R2 critic | F | low/n/a | EXTERNAL — owner action + revisit |

### Untiered — completed later, superseded, historical, non-goal (30)

| ID | Item | Source | Class | Sev/Eff | Disposition |
| --- | --- | --- | --- | --- | --- |
| A-05 | Live owned session 628d8bb9 (27 unique commits) must be integrated or abandoned by its owner before a main-only topology exists — reclassified F→C; R2: resolved. Live session 628d8bb9 was integrated, released and removed | R1 Lane A | C | medium/n/a | COMPLETED_LATER — tick with citation |
| A-23 | Task directories without an OpenSpec change are historical records; the '65' count is wrong (live: 63 v2 + 31 legacy) | R1 Lane A | E | low/n/a | HISTORICAL — preserve |
| C-17 | Structural efficacy ceiling: only GO_VENDORED_PACKAGE_TEST reproduction exists, so only mobingilabs/ouchan (1 of 8 approved repos) can ever yield an… | R2 Lane C | G | medium/n/a | NON_GOAL — cite owner scope/decision |
| C-31 | W13 evidence consistency: owner-local state matches the W13 receipts; the single admission is unrecoverable, and the run-05 receipt's… | R2 Lane C | E | low/n/a | HISTORICAL — preserve |
| D-09 | Root dependency posture: one accepted low advisory; the pin is intentional | R1 Lane D | G | low/n/a | NON_GOAL — cite owner scope/decision |
| D-21 | Marker census: no genuinely unfinished work in the code | R1 Lane D | G | low/n/a | NON_GOAL — cite owner scope/decision |
| D-25 | gate:inventory 'missingModernPhases 13-22' describes the retired legacy workflow baseline | R1 Lane D | E | low/n/a | HISTORICAL — preserve |
| NW-AUD-006 | session-mutation-authority-binding-v1 — present@HEAD=NO | priority/R2 partials | C | high/n/a | COMPLETED_LATER — archive |
| R2-10 | NW-AUD-010 task 5.1 (leave unearned evidence null; never substitute HEAD) is satisfied by current state | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-12 | NW-AUD-010 task 7.1 (focused suites, typechecks, hardening, local and clean gates) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-13 | NW-AUD-010 task 7.2 (strict-validate, privacy/diff, C-00 integration, CI as evidence or explicit non-evidence) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-14 | NW-AUD-014 task 3.1 (assign every call to a closed profile) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-16 | NW-AUD-014 task 3.4 (zero unclassified and zero stale records) satisfied | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-19 | NW-AUD-014 task 4.4 (mutation restoration leaves state clean) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-20 | NW-AUD-014 task 5.1 (focused suites, gates, full regression) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-22 | Successor lines 'run focused/static/hardening/milestone lanes' (census 3.3, shard 4.1, proxy-firewall 3.3, run-evidence 3.3) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-24 | Successor lines 'commit checkpoint / reassess next campaign' (census 4.2, shard 4.3, proxy-firewall 4.2, run-evidence 4.2) completed later | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-27 | NW-AUD-019 task 5.1 (full regression, clean and topology gates) completed later by umbrella M6 | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-33 | NW-AUD-021 task 1.3: opaque one-shot capability schema superseded by the successor's non-secret one-shot binding | R2 partials | D | low/S | SUPERSEDED — strike with citation |
| R2-35 | NW-AUD-021 tasks 2.3, 3.1, 3.2, 3.3, 5.1 satisfied by successor plus pre-existing code | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-41 | NW-AUD-024 tasks 1.3, 2.2, 3.2 (journal/claim schemas, integrity-linked journal, recovery/rebuild) superseded by the successor's narrower design | R2 partials | D | low/S | SUPERSEDED — strike with citation |
| R2-42 | NW-AUD-024 tasks 2.1, 3.1, 4.3 completed by the run-evidence successor | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-48 | NW-AUD-022 task 3.3 (bounded, privacy-safe records) completed by proxy-event-firewall | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-50 | control-center-design-system tasks 2.2 and 2.7: disposition unchanged (superseded) | R2 partials | D | low/S | SUPERSEDED — strike with citation |
| R2-52 | autonomous-yield-proof-w11 M5.1, M5.2, M10.3: disposition unchanged (superseded by W12/W13); STATE still projects a phantom EXTERNAL blocker | R2 partials | D | low/S | SUPERSEDED — strike with citation |
| R2-53 | autonomous-bug-hunting-programme 0/18: disposition unchanged (all done later, unticked) | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-54 | observability master plan C-05, C-08, C-09, C-15: disposition unchanged (completed via archived changes) | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-56 | observability master plan P4: disposition unchanged (outside owner scope) | R2 partials | G | low/S | NON_GOAL — cite owner scope/decision |
| R2-57 | production-completion-programme: 29 items done later but unticked — disposition unchanged | R2 partials | C | low/S | COMPLETED_LATER — tick with citation |
| R2-60 | production-completion-programme 11.6: disposition unchanged (superseded per D-135) | R2 partials | D | low/S | SUPERSEDED — strike with citation |

## Owner pre-flight drift record (2026-09-25, tasks.md 1.1)

Measured read-only at the unchanged base `1f786a4e1b7e4967d06c930946f1107e32931e8a`
after `git fetch origin` (no movement): `HEAD == origin/main == 1f786a4e`.

| Surface | Measured at pre-flight | Drift vs this audit |
| --- | --- | --- |
| `git status` | clean except untracked `openspec/changes/nightwatch-final-product-completion-v1/` | none (OD-4 state reproduced exactly) |
| `git worktree list` | canonical only; no registered session worktree | none |
| `git branch -a` | `main` + orphan `session/nightwatch-successor-campaign-en-c8bcb74c` | none (A-06 target present) |
| `project:check` | FAIL `PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; verdict `nightwatch.release-certification.v1`; status `OPERATIONALLY_ACCEPTED`; lanes proven=0 neverAttempted=1 staleEvidence=10; conditions met=0/16 (STALE_EVIDENCE: 01,04,05,06,07,08,10,11,15; UNMET: 02; UNAVAILABLE_CAPABILITY: 03,09,12,13,14,16); certificationRefused=true; checkpoint `87c4506f` | none — matches "0/16 MET, certificationRefused, proven=0 stale=10" |
| `agent:check` | FAIL (1 error) `LEDGER_CHANGE_WITHOUT_TASK` for `nightwatch-final-product-completion-v1` (open=113); plus legacy warnings (31 v2 orphans + 31 legacy task dirs) | none — exactly the OD-4 predicted error |
| `workspace:status` | PASS all seven invariants; self record still `nightwatch-production-completion-programme-v1` (RELEASED, base `b14f9d74`); clean=false (untracked planning dir) | none — matches the "Canonical record" row |
| `status:local` | `READY_LOCAL_SYNTHETIC`; `nightwatch-final-product-completion-v1 status=MISSING_TASK open=113 blocker=missing continuity-v2 task record`; campaigns=5 open-items=188 externally-blocked=2 | one numeric correction: the "Open work" row's inline `status:local sees 75` is NOT reproduced at `1f786a4e` (measured 188 open items across 5 campaigns). The qualitative claim stands: no BLOCKED class is reported, and the new change shows as MISSING_TASK. Recorded as measured; the row's `75` is treated as a stale round-1 figure. |

No other drift. The base is exactly the audited base, and every structural
trap (A-01, A-02/D-01, R2-N6, X-04, D-04) is live as described.

### A-06 orphan-branch disposition record (2026-09-25, tasks.md 1.3)

`session/nightwatch-successor-campaign-en-c8bcb74c` → `1441cc8aa8c430ccffc743c99e4d9974d54d06dc`
verified before deletion: exactly one commit ahead of `main`
(`1441cc8a docs(c00): record blocked successor discovery`), touching only
`.agent/ACTIVE_TASK.md` and `.agent/tasks/nightwatch-successor-campaign-en-*`
continuity files (SPEC/PLAN/STATE/REPORT), i.e. the docs-only BLOCKED record
described in the census. It is superseded by this change and by the
successor campaign's integrated work. Deleted with `git branch -D` under
owner decision OD-3.
