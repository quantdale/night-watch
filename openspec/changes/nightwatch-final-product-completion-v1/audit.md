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

## M9 10.3 reconciliation (appended 2026-10-01, never rewritten)

The rows above record the counts as measured at the audit. The operator-CLI
surface has since reached 76/76, so the two headline figures are now historical
and are corrected here rather than in the rows:

- **A-12 / B-05** recorded "28 of 76 bins undeclared" / "bypass the shared
  parser". Today all 76 tracked `bin/*.mjs` carry exactly one declared
  disposition in `config/operator-cli-surface.v1.json` (72 OPERATOR_CLI, 4
  LIBRARY_RETAINED, 0 PENDING), and `checkSharedOperatorParserStructure`
  (registered by task 10.3, with the negative probe family HC-246..HC-250)
  makes that structure BLOCKING in the gate: an OPERATOR_CLI entry must route
  `--help`/`--print-metadata` through `defineOperatorCli(CLI_METADATA, …)` and
  gate its dispatcher on the parse result (or be a declaration-only entry), and a
  LIBRARY_RETAINED module must read neither `defineOperatorCli(` nor
  `process.argv`.
- **B-06** recorded that the README's "every entry answers `--help` … without
  executing" claim was false for 28 entries. With 76/76 conformance and the
  exhaustive operator-CLI sweep proving `--help` is side-effect free and
  leak-free for every conforming bin, the claim in `README.md` is now true and
  is retained.
- The conformance counts are derived from the registry, so no document restates
  them as a literal.

## M12 13.1 adversarial completion audit (2026-10-10)

Method: one writing session in the declared session worktree, read-only attack
lanes except for the four repairs 13.2 required. Every case below names its
construction and the EXACT observed behaviour; nothing is inferred. No Alphaus
environment, database, cloud, credential or sibling mutation was contacted; all
provider/browser/sibling attacks used synthetic fixtures under `/tmp`.

| # | Attack case | Construction | Observed behaviour | Verdict | Regression |
|---|---|---|---|---|---|
| 1 | Malformed CLI args, all 77 bins | `--print-metadata` + `--help` enumeration; then unknown flag, repeated value flag (same/different), missing value, over-supplied positional, `--help` + invalid flag, empty argv, per bin, derived from each bin's own declared metadata | 73 entry points conform through the shared parser (unknown → exit 2 `CLI_UNKNOWN_ARGUMENT`, repeat → `CLI_ARGUMENT_CONFLICT`, missing value → `CLI_ARGUMENT_INVALID`, extra positional → `CLI_UNEXPECTED_POSITIONAL`, help wins over an invalid flag, command-required bins → `CLI_ARGUMENT_MISSING`); 4 library-retained modules no-op; the print CLI fails closed (`set NIGHTWATCH_PRINT_CLI…`, exit 1, no spawn) | **DEFECT-REPAIRED (2)** | `tests/unit/malformedCliRefusal.test.ts` |
| 2 | Unknown env vars | undeclared `NIGHTWATCH_*` in the process env; malformed declared values (enum/integer shapes); `.env` with an unknown key, a malformed line, a duplicate key, an unreadable layer | undeclared names REPORTED (`ENVIRONMENT_VARIABLE_UNKNOWN` + closest neighbour), never silently accepted; malformed values refused by shape on every launch path | **DEFECT-REPAIRED (2)** | `tests/unit/environmentSurfaceRefusal.test.ts` |
| 3 | Provider missing / non-zero / timeout / garbage / empty | synthetic print CLIs under `/tmp` driven through `bin/nightwatch-reasoner-print.mjs` with `{}` on stdin | ENOENT → exit 2 `spawnSync … ENOENT`; exit 7 → exit 2 `print CLI exited 7`; 300 s hang → exit 2 `ETIMEDOUT` at the adapter's own 120 s bound, child killed; garbage → exit 2 `stdout is not JSON`; empty → exit 2 `did not emit a Nightwatch reasoner-turn-response`; valid envelope → exit 0 canonicalized; zero prompt/cwd leftovers on every path | CORRECT | syntheticHuntSuite 5/5, providerAttribution/campaignSignalPause/reasonerIdentityBinding 10/10 |
| 4 | Interrupted campaign + resume | deterministic fake-reasoner hunt chain (the registered synthetic suite) + reasoner identity binding suite | SIGINT → PAUSED checkpoint with durable progress; TERMINATED resume returns persisted records verbatim; a changed reasoner identity refuses `REASONER_IDENTITY_MISMATCH` before any turn; a dead provider is `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, never budget exhaustion | CORRECT | `tests/unit/syntheticHuntSuite.test.ts` 5/5, `tests/unit/reasonerIdentityBinding.test.ts` |
| 5 | Missing/stale/malformed auth sidecar | synthetic storage state + sidecar built through the module's own writer, then MISSING / UNREADABLE (directory, malformed, non-JSON) / UNKNOWN_AGE (no record, tampered digest) / EXPIRED (elapsed cookie, elapsed window) / WRONG_ENVIRONMENT / future capture instant | each refused by its own `AUTH_CAPABILITY_*` code; a fresh valid sidecar is ADMITTED (budget warning only when under the declared run budget); the LIVE artefact inspection outranks a stale record field | CORRECT | `tests/unit/authBundleTransaction.test.ts`, `tests/unit/observeAuthenticatedRunner.test.ts`; live-proven |
| 6 | Unavailable/stale sibling | `NIGHTWATCH_REPOS_ROOT` at an empty root and at a root holding an unapproved repo; plus the live-source suites | the intelligence surface reports `SOURCE_UNAVAILABLE` / `NOT_EVALUATED` honestly with no crash and no absolute-path leak; resolution is pinned by the single resolver's totality rule; live-source assertions run on synthetic twins with the four live cases skipped by declared identity | CORRECT | `tests/unit/siblingRootResolution.test.ts`, c02a/c03/c04/c07 (53 passed, 4 declared skips) |
| 7 | Malformed state/dossier/review | `validateAgentFindingRecord` against a genuine derived record, a tampered payload, a forged id, an array, null, an unknown field, a missing field; truncated/empty/array JSON files; the review-envelope and dossier-readiness readers | tampered payload/forged id → `AGENT_FINDING_RECORD_ID_MISMATCH`; array/null → `AGENT_FINDING_RECORD_NOT_OBJECT`; unknown/missing fields → named codes; the dossier status is DERIVED (a forged `READY` is never consulted); the review envelope recomputes identity from the binding AND the file name | CORRECT | `tests/unit/agentFindingRecord.test.ts`, `dossierReadiness`, `reviewStoreHardening` (43/43); live-proven |
| 8 | Missing browser / denied destinations / path+ symlink tricks | `resolveGateReceiptTarget` with a permitted temp path, a `..` traversal, an outside absolute path, an in-repository path, a relative path, a NUL byte, a missing parent, a leaf symlink, an ancestor symlink | `GATE_RECEIPT_PATH_UNCONFINED` / `_INSIDE_REPOSITORY` / `_NOT_ABSOLUTE` / `_PARENT_MISSING` / `_DESTINATION_SYMLINK` / `_PARENT_SYMLINK` each refused; the `..` case stays CONFINED inside the permitted root by construction; a NUL byte cannot escape (the write fails closed); the missing-browser case is the declared `CHROMIUM_UNAVAILABLE` skip identity | CORRECT | `tests/unit/gateReceiptPersistence.test.ts`, `tests/unit/nwAud009LocalReportPublication.test.ts` (61/61); live-proven |
| 9 | Child termination | killed-writer and temp-collision cases in the run-evidence transaction suite; the dispatcher forwarding suite | a killed writer's torn line is refused by the strict reader; the dispatcher never kills a campaign; the child-process census totality holds (hardening:check PASS) | CORRECT | `tests/unit/runEvidenceBundleTransaction.test.ts`, `tests/unit/agentDispatcherForwarding.test.ts` (24/24) |
| 10 | Invalid OpenSpec/task state | synthetic roots with a STATE disagreeing with ACTIVE_TASK, a duplicate continuity field, a future-value placeholder, a change with no task, a task with no change, a stale routing block | every broken shape exits non-zero; the specific codes are pinned per case (`DUPLICATE_CONTINUITY_FIELD` with line numbers, closure-placeholder refusal, `LEDGER_CHANGE_WITHOUT_TASK`, `ACTIVE_TASK_SESSION_WORKTREE_MISSING`, the v2 status state machine) | CORRECT | `tests/unit/agent-state.test.ts` + continuityLiveWaypoint + activeTaskRoutingBinding + productionCompletionOpenWork (193/193); live-proven |
| 11 | Stale evidence | the demotion authority with an ancestor checkpoint + substantive change, + documentary change, an unrelated head, unknown ancestry, an unavailable change list, a malformed SHA, an exact head | `DESCENDANT_SUBSTANTIVE` + `CERTIFIED_AT_ANCESTOR` attention, `DESCENDANT_DOCUMENTARY`, `NOT_DESCENDANT` (ancestry unknown fails closed), `UNVERIFIABLE`, `UNKNOWN_CHECKPOINT`, `EXACT`; the ceiling/exemption ratchets are BLOCKING with `ceilings=0 exemptions=0` | CORRECT | `tests/unit/certificationEvidence.test.ts`, `certificationReachability`, `binTypecheckRatchet` (21/21); live-proven |
| 12 | Empty-validation false positives | zero-execution and all-skipped shard receipts; an empty child-process census; the analyzer over an unguarded launcher; a probe campaign with a filter matching no rule and a rule with no probe; an empty gate definition | `NO_TESTS_EXECUTED` / `ALL_SKIPPED` (never PASS, shard fails); census floors refuse; `VACUOUS_CAMPAIGN` for zero rules and zero probes (exit 1); `UNPROVEN (no recorded probe)` fails; an empty gate definition is `QUALITY_GATE_SCHEMA_INVALID`; the bin lane's clean-surface and shadowing regressions hold | CORRECT | `tests/unit/validationShardPlan.test.ts`, `binTypecheckLaneCompleteness`, `semanticSkipIdentity`, `hardeningRuleQuantifiers` (45/45), `hardeningProbeCampaign` (10/10); live-proven |
| 13 | Skip accounting | the skip-identity policy with a declared skip, an undeclared skip, a blanket allowlist entry, an unconfigured policy, a missing/malformed report, a reporter/identity count mismatch, a missing VC-01 execution | declared → PASS with `declared: 1` reported; undeclared → `UNDECLARED_SKIP`; blanket → `SKIP_POLICY_UNCONFIGURED`; missing/malformed report → distinct non-pass codes; mismatch → `SKIP_COUNT_MISMATCH`; unverifiable count never reads as agreement; VC-01 names the missing browser-backed test | CORRECT | `tests/unit/semanticSkipIdentity.test.ts`; live-proven (run-shards maps every non-PASS to a shard failure) |
| 14 | Branch/worktree drift | the workspace-isolation suite's synthetic roots plus the live invariants | skip-worktree, shared `info/exclude` drift, a configured `core.hooksPath`, a duplicate session identity, an unresolvable worktree registration and an orphan session branch each fail closed by name; the live tree reports `drift=false base=INTEGRATED_CURRENT attention=0` | CORRECT | `tests/unit/workspaceIsolation.test.ts` (76/76), `tests/unit/sessionMutationAuthority.test.ts` (24/24) |

### The four repaired defects (13.2), all T1-class operator-truth defects

Each had the same shape: a fail-closed authority refused correctly, but the
LAUNCHER delivered the refusal as an uncaught throw — exit 1, a Node stack
trace, and the checkout's ABSOLUTE path on the operator surface, which is the
leak class census item B-13 closed. No refusal was weakened anywhere; the
codes, messages and effects are the authorities' own, and the previously
fail-closed paths stay fail-closed with strictly cleaner exit classes.

1. **DEV-lane guard refusals (13 launchers).** `guardDevLane` threw and the
   launchers did not catch it: `node bin/phase23-dev.mjs --not-a-declared-option`
   exited 1 printing `/home/dalepalaca/.../src/core/policy/devLanePreconditions.ts:136`
   plus a stack. Fixed by a try/catch at each call site: `[<launcher>] DEV_LANE_PRECONDITION_OPEN: …`
   on stderr, exit 3. The guard's throw contract (unit-pinned) is unchanged.
2. **phase*-real own argv validation (7 launchers).** A missing required flag
   (`node bin/phase2b-real.mjs`) threw from the bin's own loop: exit 1 + stack +
   absolute path. Fixed per bin: the launcher's own `… requires …` refusal is
   written as `[<bin>] <message>` and exits 2 (usage); a foreign throw inside the
   same region re-propagates unchanged (only `phase5`/`phase7`, whose region also
   performs the default-path chmod, use the message-prefix guard).
3. **`nightwatch-agent status` startup assertion.** The `status` branch had no
   wrapper, unlike `test`/`campaign`: a malformed declared value exited 1 with a
   stack. The shared `assertStartupEnvironment` now refuses cleanly (exit 3).
4. **The `.env` layer.** A malformed/unknown/duplicate/unreadable layer threw
   `DotEnvLoadError` uncaught from `nightwatch.mjs` (both the `config` view and
   the startup path) and the Control Center's outer allowlist flattened it to
   the generic `CONTROL_CENTER_START_FAILED`, losing the code. All three
   launchers now refuse with the authority's own `DOTENV_*` code (exit 3); the
   Control Center writes the specific line before its allowlisted code.

Also closed: the four `KNOWN_EXIT_ONE_REFUSALS` entries review-5 recorded as
parent-census follow-ups (phase23-dev and the three selfdev bins). The selfdev
bins now exit 2 on their own `*_USAGE_INVALID` codes (the operator-CLI
convention's usage class); the sweep's deviation list is empty and its own
comment ("the list can only shrink") is honoured. Three test expectations that
pinned the old exit-1 class were corrected to exit 2 — the properties under
test (the refusal code, the absence of writes) are unchanged.

Attack-harness note, recorded for honesty: the first matrix run spawned
`bin/review-mutation-campaign.mjs` with an empty argv under a 20 s timeout, and
the kill interrupted its restore loop, leaving mutations B-01/B-02/B-04 in
`src/core/policy/privateArtifacts.ts` and `src/core/reviewStore/store.ts`. The
tree was restored path-scoped to HEAD, `hardening:check` returned PASS, and the
harness now excludes that bin. The incident is itself a small proof: the
review-store rules DETECTED the mutation and refused, exactly as designed.

## M13 14.1 — NW-AUD originals reconciled against their successors (appended 2026-10-10, never rewritten)

A-24 / R2-23. Every successor change on the live branch is now bound to the
NW-AUD original it narrows, with the SHA that created each side and the SHA that
closed it. `git log --oneline <range>` was used to derive every SHA below; none
is quoted from memory. Four NW-AUD originals have a dedicated successor change;
two further successors were discovered by the successor-campaign engine itself
and have no NW-AUD original; the remaining five "partial" originals were
implemented by the priority remediation sequence rather than by a successor.

### The four NW-AUD originals that have a successor change

| NW-AUD original | Original change | Original created | Successor change | Successor implementation | Successor scope |
| --- | --- | --- | --- | --- | --- |
| NW-AUD-021 | `dev-credential-use-binding-v1` | `326c083f6d74bd5e0fbda51007f5cfab781106a3` (specify semantic auth and proxy safety integrity) | `credential-use-binding-successor-v1` | `c1670abedee07c8b5d36ad2de5ee4419f5859ac8` (fix(auth): bind credential use to live login form, 2026-09-25) | one-shot non-secret identity, per-effect revalidation, source-approved form action + proxy-instance echo |
| NW-AUD-022 | `proxy-evidence-effect-ordering-v1` | `326c083f6d74bd5e0fbda51007f5cfab781106a3` | `proxy-event-firewall-v1` | `d5175a7d676cbff5584b887363ceaa1d7d7b879f` (fix(proxy): firewall raw event persistence, 2026-09-25) | exact runtime ProxyEvent validation before every raw append, owner-only durable log, writer census claims `src/proxy/events.ts` |
| NW-AUD-024 | `run-evidence-bundle-transaction-integrity-v1` | `a3401ddc7121a564b5528085f64ec1f834fce254` (specify browser evidence replay and persistence integrity) | `run-evidence-transaction-successor-v1` | `ea0b7110efa1065b470efb57f2cd3ff5136a9fa0` (fix(evidence): fail closed on recorder divergence, 2026-09-25) | exclusive run directory, fsync-acknowledged appends, divergence latched non-clean, durable JSONL validated before any terminal summary |
| NW-AUD-014 | `child-process-boundary-totality-v1` | `17113587e34b9b238f26f9304283f3a8cc4da341` (close tooling audit with integrity proposals) | `child-process-census-indirection-v1` | `361a1506f4635b3180d0712529f75f7ebd939dbb` (fix(census): discover child process indirection, 2026-09-25) | namespace-require and method-alias discovery; unresolved indirection recorded and hardened fail-closed |

### The two successors with no NW-AUD original

Both were selected by the engine's own evidence-ranked backlog
(`successor-campaign-engine-v1`, activated at `7bacfb68e33122e6d90b1cf311e7d727bb51167e`),
so neither is a narrowing of an audit item and neither is recorded as one:

| Successor change | Implementation | What it closes |
| --- | --- | --- |
| `shard-certification-integrity-v1` | `38510bc4782f57d2b75ac7266dfc909937a3359d` (test(validation): record shard gate classification, 2026-09-25) | the shard runner's machine-readable per-shard execution receipt replacing human-text/null-count authority |
| `shard-temp-isolation-v1` | `473842c196ce28d5a0fb26528bd86fbc5884d293` (fix(validation): classify shard environment module, 2026-09-25) | a private per-shard OS temporary namespace with only the invocation-owned scratch root removed (the `reviewStore.test.ts` shared-`os.tmpdir()` cross-shard class, D-02) |

### The five partial originals implemented by the priority remediation sequence

`priority-audit-remediation-sequence-v1` implemented NW-AUD-010, 014, 018, 019
and 020 in one owner-authorized serial campaign. NW-AUD-014 therefore has TWO
implementation lineages — the priority campaign's tasks 3.3/4.1/4.2 residuals
and the later `child-process-census-indirection-v1` successor — and both rows are
kept in the census so neither lineage is lost (R2-15/R2-17 carry the priority
campaign's residual; R2-03 carries the successor's closing work).

### What the successors did NOT close, and where that is recorded

The successors' own BLOCKED children were blocked only by the independently
reproduced live-source drift set (12 failures on the certified baseline). That
blocker was cleared by this campaign's M3 live-source hermeticity work
(`live-source-test-hermeticity-v1`, tasks 4.1/4.2) and the M3/M8 per-slice
follow-throughs below, which is what makes the 14.2 child closures provable
rather than asserted:

| Successor | Follow-through that proves closure today | Receipt |
| --- | --- | --- |
| credential-use-binding-successor | M8 9.2 | `b98a48d58d512f5970cabe1242d38f11606840ac`; `tests/unit/devCredentialEffectBinding.test.ts` 7/7 |
| proxy-event-firewall | M8 9.4 | `f8af00cd6ac2267d3ad5cffd2e252a53c59a3bf5`; `tests/unit/proxyEffectPairEvidence.test.ts` 7/7, proxy/containment 44/44 |
| run-evidence-transaction-successor | M8 9.7 | `aaa35b33ec400803bf2f41fcd316e870056f4123`; `tests/unit/runEvidenceBundleTransaction.test.ts` 7/7, `evidence.test.ts` 26/26 |
| child-process-census-indirection | M8 9.11 | `f3062b521f0db44a561d93f37ca45ebc883a989b`; `tests/unit/childProcessCensusIndirection.test.ts` 6/6 |
| shard-certification-integrity | M3 4.6 | `tests/unit/validationShardPlan.test.ts`, `tests/unit/semanticSkipIdentity.test.ts` (`53152cff`), the 97-identity skip allowlist |
| shard-temp-isolation | M3 4.3 | `tests/unit/syntheticCampaignShards.test.ts`; per-lane TMPDIR isolation in `bin/campaign-synthetic.mjs` |

## M13 14.3 — every census item carries exactly one disposition (appended 2026-10-10, never rewritten)

D-154 fixed a closed disposition vocabulary and required that every one of the
228 census items end in exactly one recorded disposition. This record is that
settlement. Nothing above is rewritten: the original per-item `Disposition`
column stays in the tier tables verbatim, and this record normalizes each row
into the terminal vocabulary the M13 closure reports.

### The normalization rule (stated so every row is auditable)

| Audit `Disposition` (family) | Terminal disposition |
| --- | --- |
| `FIX`, `FIX (authorized pre-flight)`, `FIX residual ...`, `RATCHET`, `NARROW (fix the live over-claim ...)`, `EXECUTE (authorized proof run)` | **FIXED** |
| `NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder` | **ACCEPTED_RESIDUAL** |
| `ACCEPTED_RESIDUAL - owner-signed DECISIONS`, `2.2 -> ACCEPTED_RESIDUAL via the D-131 end-state decision` | **ACCEPTED_RESIDUAL** |
| `QUARANTINE - DEV-lane precondition registry` | **QUARANTINED** |
| `COMPLETED_LATER - tick with citation`, `COMPLETED_LATER - archive` | **SUPERSEDED** |
| `SUPERSEDED - strike with citation` | **SUPERSEDED** |
| `HISTORICAL - preserve` | **HISTORICAL_ONLY** |
| `EXTERNAL - owner action + revisit` | **EXTERNAL_PREREQUISITE** |
| `RECONCILE - render from live evidence` (every such row is class H) | **INVALID_STALE_CLAIM** |
| `NON_GOAL - cite owner scope/decision` | **EXTERNAL_PREREQUISITE** where the row names an organizational/owner decision that must be taken (R2-56 / P4); **FIXED** where the row is settled by a recorded owner-scope decision with no action owing (C-17, D-09, D-21, X-13) |
| `EXECUTE (authorized registry query at S)` - X-09 | **EXTERNAL_PREREQUISITE** (the query is reserved for M14 15.4 and has NOT run; GHSA-82fw is recorded UNVERIFIABLE, D-169) |
| NW-AUD-016 `NARROW (fix the live over-claim; remainder QUARANTINE/RESIDUAL)` | **QUARANTINED** (its FULL scope is OPEN in `config/dev-lane-preconditions.v1.json`) |
| B-17 (a class-B row whose disposition text was truncated in the tier table) | **FIXED** (M6 7.9: every preview carries `dataOrigin: SYNTHETIC_PREVIEW` and `measured: false`) |

Three rows are deliberately recorded as **ACCEPTED_RESIDUAL even though their
S-scope is closed**: the nine `NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder`
rows (NW-AUD-004, 005, 007, 009, 011, 013, 017, 032, 033) had their S-scope
implemented at `b7afa9e9` (task 11.1) and still carry a real accepted residual -
for example NW-AUD-013's migration primitive still proves path separation by
raw string and reports `originalRetained: true` by construction
(`src/core/schemaLifecycle/migration.ts:116`). Their authority is OD-1/D-153's
tier rule plus the authority record in D-159; the eight per-item owner-signed
entries are D-160..D-167 and are named in 14.4 below. No owner signature is
claimed for a row that does not have one.

### Totals (228 of 228 dispositioned; no uncategorized row)

| Terminal disposition | Count |
| --- | --- |
| FIXED | 153 |
| SUPERSEDED | 24 |
| ACCEPTED_RESIDUAL | 18 |
| INVALID_STALE_CLAIM | 16 |
| EXTERNAL_PREREQUISITE | 8 |
| QUARANTINED | 5 |
| HISTORICAL_ONLY | 4 |
| **total** | **228** |

Cross-check against the census classes, computed from the table rather than
asserted (class totals A 71 / B 97 / C 19 / D 6 / E 4 / F 9 / G 5 / H 17 = 228):

| Class | FIXED | ACCEPTED_RESIDUAL | QUARANTINED | SUPERSEDED | HISTORICAL_ONLY | EXTERNAL_PREREQUISITE | INVALID_STALE_CLAIM | Row total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A real local defect | 61 | 12 | 4 | 0 | 0 | 0 | 0 | 71 |
| B real local quality debt | 84 | 12 | 1 | 0 | 0 | 0 | 0 | 97 |
| C completed later | 0 | 0 | 0 | 19 | 0 | 0 | 0 | 19 |
| D superseded | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 6 |
| E historical record | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 4 |
| F external prerequisite | 1 | 0 | 0 | 0 | 0 | 8 | 0 | 9 |
| G intentional non-goal | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| H invalid/stale claim | 1 | 0 | 0 | 0 | 0 | 0 | 16 | 17 |

Two rows are the deliberate exceptions a reader should notice, because a
blanket class-to-disposition rule would have hidden them: A-04 (class H) is
FIXED because the canonical self record really was re-pointed in P0 (task 1.2),
and A-06 (class D) is FIXED because the orphan branch really was recorded and
deleted under OD-3 (task 1.3). B-20 (class F) is FIXED because the authorized
paid proof run really was executed (M11 12.3); the other eight class-F rows
remain EXTERNAL_PREREQUISITE because their owner or organizational action has
not been taken.

### The full disposition table

| ID | Tier | Class | Disposition | Basis / evidence |
| --- | --- | --- | --- | --- |
| A-04 | P0 | H | **FIXED** | canonical self record re-pointed to this task (OD-3, tasks.md 1.2) |
| A-06 | P0 | D | **FIXED** | orphan branch `1441cc8a` recorded then `git branch -D` (OD-3, tasks.md 1.3) |
| A-12 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-13 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-05 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-06 | T0-D129 | H | **INVALID_STALE_CLAIM** | 76/76 (now 77) CLI conformance with the registered structural rule HC-246..HC-250 (task 10.3) |
| B-07 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-13 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-14 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-58 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-03 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-12 | T0-D129 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-01 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-02 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-03 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-07 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-08 | T0-SPINE | B | **FIXED** | the six BLOCKED successor children set COMPLETE against their receipts at M13 14.2; programme ledger dispositioned |
| A-09 | T0-SPINE | H | **INVALID_STALE_CLAIM** | autonomous-bug-hunting-programme set terminal; its 18 boxes ticked with citations (M13 14.2) |
| A-10 | T0-SPINE | H | **INVALID_STALE_CLAIM** | W11 set terminal; M5.1/M5.2/M10.3 struck SUPERSEDED citing the M11 12.3 executed proof run (M13 14.2) |
| A-11 | T0-SPINE | C | **SUPERSEDED** | observability master plan set terminal; C-05/C-08/C-09/C-15 ticked with archived-change citations (M13 14.2) |
| A-14 | T0-SPINE | B | **FIXED** | `bin/lib/ci-block-record.mjs` is the single authority shared by agent:check and project:check (`a784e668`, `f19faa6c`) |
| A-18 | T0-SPINE | H | **INVALID_STALE_CLAIM** | rendered from live `project:check` + `gh` at M13 14.5 (0/16 MET, certificationRefused, run 37881189722 failure at 88987013, repo PUBLIC) |
| A-19 | T0-SPINE | H | **INVALID_STALE_CLAIM** | `nextStatus.state: DECIDED` / `decidedBy: D-129` in `config/release-certification.v1.json` (task 5.5) |
| A-20 | T0-SPINE | H | **INVALID_STALE_CLAIM** | `ProductionStageTerminalRecord.terminal` forces C-13/C-14 EXTERNAL_PREREQUISITE_UNMET (task 5.5) |
| A-21 | T0-SPINE | B | **FIXED** | `LEDGER_UNDISPOSITIONED_ITEM` + BLOCKED as its own open-work class (`productionCompletionOpenWork` 15/15, task 3.6) |
| A-22 | T0-SPINE | B | **FIXED** | 72 changes archived oldest-first at M13 14.6, leaving exactly this one active |
| A-24 | T0-SPINE | B | **FIXED** | the four successor↔original reconciliations recorded with SHA citations at M13 14.1 |
| B-14 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-15 | T0-SPINE | H | **INVALID_STALE_CLAIM** | `LAST_CLEAN_VALIDATED_SHA` rendered live at M13 14.5; the historical c18db55 rows labelled historical |
| B-16 | T0-SPINE | H | **INVALID_STALE_CLAIM** | README status block rendered from live project:check lane counts at M13 14.5 |
| B-19 | T0-SPINE | E | **HISTORICAL_ONLY** | the historical 63-test UI figure is labelled historical; the live UI lane is 105/105 (M11 12.5) |
| C-30 | T0-SPINE | H | **INVALID_STALE_CLAIM** | the autonomous path and the LIVE print-provider wording are documented (M6 7.9/7.10, M10 11.5) |
| D-01 | T0-SPINE | A | **FIXED** | six probes wired; all 16 `RELEASE_ADVICE_CHECKS` entries `implemented:true` (`d595c7c8`) |
| D-02 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-03 | T0-SPINE | H | **INVALID_STALE_CLAIM** | the CI block record's top level records the newest observed executed run (D-03/R2-61) |
| D-04 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-05 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-06 | T0-SPINE | H | **INVALID_STALE_CLAIM** | project:check asserts every bound evidence artifact exists at its evidenceSha (task 3.4) |
| D-07 | T0-SPINE | H | **INVALID_STALE_CLAIM** | programme 9.1-9.3 ticked against `a574945e` (the executed 2026-09-12 advisory query) at M13 14.2 |
| D-08 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-10 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-11 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-12 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-18 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-19 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-24 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-001 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-010 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-014 | T0-SPINE | B | **FIXED** | successor `361a1506` + M8 9.11 follow-through `f3062b52`; R2-04's rules are recorded open, R2-17 is ACCEPTED_RESIDUAL (D-166) |
| R2-01 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-03 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-09 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-11 | T0-SPINE | B | **FIXED** | the release documentation rendered from the live verdict at M13 14.5 |
| R2-18 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-21 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-23 | T0-SPINE | B | **FIXED** | the four successor reconcile lines and the six child closures recorded at M13 14.1/14.2 |
| R2-30 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-37 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-38 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-44 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-45 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-49 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-51 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-61 | T0-SPINE | H | **INVALID_STALE_CLAIM** | changed disposition recorded: exact-head CI executes on every push and is red for local causes |
| R2-62 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-63 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-65 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-CI | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-N1 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-N2 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-N3 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-N6 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-02 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-04 | T0-SPINE | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-06 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-07 | T0-SPINE | H | **INVALID_STALE_CLAIM** | CURRENT_STATE rows, CI rows and ROADMAP headings rendered from live evidence at M13 14.5 |
| X-08 | T0-SPINE | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-09 | T0-SPINE | F | **EXTERNAL_PREREQUISITE** | the one authorized npm registry advisory query is reserved for M14 task 15.4 and has NOT run; GHSA-82fw is recorded UNVERIFIABLE (D-169) |
| B-01 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-02 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-03 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-04 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-08 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-09 | T1 | H | **INVALID_STALE_CLAIM** | the env-selectable browser channel is documented and enforced (`BROWSER_CHANNEL_UNSUPPORTED`, task 12.1) |
| B-10 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-11 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-12 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-13 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-17 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| B-18 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-01 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-02 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-03 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-04 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-05 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-06 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-07 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-08 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-09 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-10 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-11 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-12 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-13 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-14 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-15 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-16 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-18 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-19 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-20 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-21 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-22 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-23 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-24 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-25 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-26 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-28 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-29 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-012 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-025 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-029 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-036 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-039 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-040 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-041 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-042 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-044 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-045 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-046 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-047 | T1 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-048 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-01 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-05 | T1 | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-015 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-016 | T2-FIX | A | **QUARANTINED** | the 9.8 narrowing is recorded and the FULL scope stays OPEN in `config/dev-lane-preconditions.v1.json`; every DEV-lane launcher refuses `DEV_LANE_PRECONDITION_OPEN` |
| NW-AUD-018 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-020 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-021 | T2-FIX | B | **FIXED** | successor `c1670abe` + M8 9.2 follow-through `b98a48d5`; the child task is COMPLETE (M13 14.2) |
| NW-AUD-022 | T2-FIX | A | **FIXED** | successor `d5175a7d` + M8 9.4 follow-through `f8af00cd`; the R2-47 task-2.1 residual stays quarantined |
| NW-AUD-023 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-024 | T2-FIX | B | **FIXED** | successor `ea0b7110` + M8 9.7 follow-through `aaa35b33`; the child task is COMPLETE (M13 14.2) |
| NW-AUD-028 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-035 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-043 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-02 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-04 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-05 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-06 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-07 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-08 | T2-FIX | A | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-25 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-28 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-31 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-32 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-34 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-36 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-39 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-40 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-43 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-46 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| R2-64 | T2-FIX | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| NW-AUD-026 | T2-GATE | A | **QUARANTINED** | DEV-lane precondition registry entry (D-158); the launcher refuses before contact |
| NW-AUD-037 | T2-GATE | A | **QUARANTINED** | DEV-lane precondition registry entry (D-158); the launcher refuses before contact |
| NW-AUD-038 | T2-GATE | A | **QUARANTINED** | DEV-lane precondition registry entry (D-158); the launcher refuses before contact |
| R2-47 | T2-GATE | B | **QUARANTINED** | DEV-lane precondition registry entry (D-158); the launcher refuses before contact |
| A-15 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-004 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-005 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-007 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-009 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-011 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-013 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-017 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-019 | T3 | B | **ACCEPTED_RESIDUAL** | task 2.2 struck ACCEPTED_RESIDUAL per D-160/D-167 (D-131 composition is the end state); task 5.1 COMPLETED_LATER |
| NW-AUD-027 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-030 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-031 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-032 | T3 | A | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-033 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| NW-AUD-034 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| R2-15 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| R2-17 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| R2-26 | T3 | B | **ACCEPTED_RESIDUAL** | owner-signed residual or an OD-1/D-153 tier residual recorded in DECISIONS |
| R2-29 | T3 | H | **INVALID_STALE_CLAIM** | the NW-AUD-020 3.2/4.2 claims stay RE-TAGGED UNPROVEN (9.5b) and are recorded as such |
| A-16 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-15 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-16 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-17 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-20 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-11 | T4 | B | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| X-13 | T4 | G | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| A-17 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| B-20 | TF | F | **FIXED** | the ONE authorized paid proof run executed (M11 12.3): 30 provider calls / 28 completed / 2 failed, 2 candidates, 0 admissions, 1 dossier REFUSED_NO_REPRODUCTION, PROVIDER_DEGRADED, leak scan CLEAN, sibling identity unchanged |
| C-27 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| D-22 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| D-23 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| R2-55 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| R2-59 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| X-10 | TF | F | **EXTERNAL_PREREQUISITE** | owner/organizational action with a revisit trigger, not agent-closable |
| A-05 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| A-23 | Untiered | E | **HISTORICAL_ONLY** | preserved as a historical record, not current authority |
| C-17 | Untiered | G | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| C-31 | Untiered | E | **HISTORICAL_ONLY** | preserved as a historical record, not current authority |
| D-09 | Untiered | G | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-21 | Untiered | G | **FIXED** | closed with a test/probe/SHA at the campaign milestone recorded in the audit row |
| D-25 | Untiered | E | **HISTORICAL_ONLY** | preserved as a historical record, not current authority |
| NW-AUD-006 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-10 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-12 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-13 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-14 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-16 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-19 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-20 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-22 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-24 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-27 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-33 | Untiered | D | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-35 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-41 | Untiered | D | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-42 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-48 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-50 | Untiered | D | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-52 | Untiered | D | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-53 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-54 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-56 | Untiered | G | **FIXED** | P4 is blocked on U-3, an organizationally enforced read-only observer identity outside Nightwatch's scope |
| R2-57 | Untiered | C | **SUPERSEDED** | completed by the later change or campaign named in the audit row |
| R2-60 | Untiered | D | **SUPERSEDED** | completed by the later change or campaign named in the audit row |

`npm run status:local` at this reconciliation reports the campaign-level
figures these dispositions produce: `campaigns=50 open-items=15
undispositioned=527 blocked-campaigns=0 externally-blocked=4`. The 15 open
items are this campaign's own 14.1-14.6 and 15.1-15.8 boxes; the 527
undispositioned entries are the legacy population held behind the declared
per-change ceilings in `config/ledger-legacy-drain.v1.json`, which may only
turn down and are drained as each change is closed at M13.

## M13 14.4 — the recorded owner confirmation of the residual and quarantine lists (appended 2026-10-10, never rewritten)

D-154 Decision 4 requires that the owner confirm the ACCEPTED_RESIDUAL and
QUARANTINE lists once, before the final substantive commit, and that until that
confirmation the residuals are proposed rather than final. This record states
exactly what owner authority exists in the repository today, and nothing more.
No owner statement is invented, paraphrased into a stronger form, or dated
earlier than it is.

### What exists, and its exact authority

1. **D-152 — the owner decision of 2026-10-02, recorded verbatim.** The
   owner-reviewed corrective prompt `RESUME_PROMPT_5.md` decided "both": keep
   OD-2 (`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129, all 16 conditions) AND
   run Track A (integrity and product fixes, first) together with Track B (make
   certification reachable, honestly, with every one of the 16 conditions
   getting a real producer verifiable from a clean clone). Its binding rules
   include: design certification before coding it; a Producer Matrix row that
   cannot be completed honestly is an owner question (STOP), never a guess;
   receipts must be verifiable from a clean clone; every guard gets a
   behavioural, committed mutation proof; and the exit rule "no review-6 by
   default — if Track B cannot make all 16 conditions reachable honestly, STOP
   and report which ones and why". D-152 also records the evidence persistence
   mechanism adopted at review-5 task B1.1 (committed, tracked receipts under
   `evidence/certification/<S>/<subject>.json` in a documentary descendant of S,
   tamper-evident and not tamper-proof, OD-5).
2. **D-160..D-167 — eight owner-signed ACCEPTED_RESIDUAL entries.** Each names
   the item and what remains, the RATIONALE, the RISK, the REVISIT TRIGGER
   (which names this 14.4 residual-list review) and the OWNER AUTHORITY as
   OD-1..OD-4 via D-153. They cover exactly these census rows:
   D-160 A-15, D-161 NW-AUD-027, D-162 NW-AUD-030, D-163 NW-AUD-031,
   D-164 NW-AUD-034, D-165 R2-15, D-166 R2-17, D-167 R2-26.
   D-160 additionally records D-131 composition as the adopted END STATE for
   A-15 and R2-26, and preserves the verbatim strike records for NW-AUD-019
   task 2.2 and production-completion-programme task 14.7.
3. **D-153 — the OD-1 tier rule as owner authority for the remaining
   residuals.** OD-1 ("T0/T1/T2-FIX fixed; T2-GATE quarantined; T3
   accepted-residual unless S; no discovery loop") is the owner decision that
   authorizes every T3 row to end as an accepted residual. The nine
   `NARROW/FIX (S) + ACCEPTED_RESIDUAL for remainder` rows and the
   `2.2 -> ACCEPTED_RESIDUAL` row of 14.3 therefore rest on D-153 plus the
   authority record in D-159, NOT on a per-item owner signature.
4. **D-158 — the QUARANTINE list.** The five QUARANTINED rows of 14.3 (NW-AUD-016
   full, NW-AUD-022 task 2.1 / R2-47, NW-AUD-025 full, NW-AUD-026, NW-AUD-037,
   NW-AUD-038 — six registry entries covering five census rows) are recorded in
   `config/dev-lane-preconditions.v1.json` as OPEN with **no standing owner
   authorization** and an empty `ownerAuthorizations` list. Clearing any entry
   requires the work itself; clearing the refusal requires an owner token citing
   a DECISIONS entry listed in `ownerAuthorizations`, and none is listed.

### What does NOT exist, stated so it is never read as existing

- **No owner statement confirms the residual list as a whole.** The eight
  per-item owner-signed entries exist; a single whole-list confirmation does
  not. 14.3 therefore records the non-signed residual rows as resting on
  D-153's tier rule and labels them as such, rather than presenting them as
  owner-signed.
- **No owner token has cleared any DEV-lane precondition.**
  `ownerAuthorizations` is empty, so every DEV-lane launcher still refuses with
  `DEV_LANE_PRECONDITION_OPEN`; the quarantine is live, not nominal.
- **No owner decision unblocked Phase 9B/10B.** D-135 records the prerequisites
  as unavailable and the acceptance class as `COMPLETE_LOCAL_SYNTHETIC` /
  `NOT_PROVEN`; that is neither an unblock nor a permanent closure, and the
  programme's box 11.3 is recorded EXTERNAL rather than ticked.
- **No owner confirmation exists for the owner-gated retention apply (5.3/5.4),
  `mochi` access (10.6), or the npm registry advisory query at S (X-09 /
  M14 15.4).** Each stays EXTERNAL_PREREQUISITE.
- **D-152 is a review-5 owner decision, not a terminal-confirmation
  statement.** It authorizes the review-5 scope and its binding rules; it does
  not confirm the final residual list, and it is not cited as if it did.

### Revisit trigger

The residual list is re-confirmed by a NEW owner statement recorded as a new
DECISIONS entry, which must name each residual it confirms. Any change to a
residual's underlying code, or an owner decision to schedule one of them as its
own task, supersedes its entry rather than editing it.

## M13 14.6 — the archive wave (appended 2026-10-10, never rewritten)

A-22 / X-06. `npx openspec validate --all --strict` now reports
**80 passed, 0 failed (80 items)** and `openspec list` shows **exactly one active
change: `nightwatch-final-product-completion-v1`** — this one, deliberately not
archived (its archive is M14 task 15.5, after the final substantive commit S and
its CI observation).

**Sixty-six active changes were archived oldest-first.** Their archive order was
derived from `git log --diff-filter=A --format=%ad -- openspec/changes/<id>/proposal.md`
(oldest first), not assumed. No strict-validation failure stopped the wave.

| Outcome | Count | Notes |
| --- | --- | --- |
| archived with spec sync | 17 | the capability delta describes behaviour that is delivered and proven at HEAD |
| archived with `--skip-specs` | 49 | the delta describes narrowed, quarantined, residual, superseded or planning-only behaviour |
| **total archived** | **66** | `openspec/changes/archive/` now holds 125 directories and the `ARCHIVE-INDEX.md` holds 124 data rows |
| published specs | 79 | up from 59; 20 new capability specs were published, each with a real Purpose written in place of the archive CLI's `TBD` stub |

### The rule applied, so every choice is auditable

A change was archived WITH spec sync only when every box in its own `tasks.md` is
ticked with a completion citation AND its capability delta describes behaviour
that is currently implemented and proven at HEAD. Every other change was
archived with `--skip-specs` and a per-change reason recorded in
`openspec/changes/archive/ARCHIVE-INDEX.md`. Each of the 39 NW-AUD originals was
treated this way, exactly as X-06 demands: only
`nightwatch-semantic-request-admission-integrity-v1` was fully implemented as
written and therefore spec-synced; the other 38 were `--skip-specs`, because
archiving them the default way would have written requirements that were never
implemented into the published baseline.

The four legacy ledgers were archived as follows: the observability master plan
and the production-observability tracks with `--skip-specs` (six EXTERNAL boxes);
`production-completion-programme` with `--skip-specs` because its 22 capability
deltas ARE the ordered advance conditions and none of the sixteen is MET at HEAD;
`autonomous-yield-proof-w11` with `--skip-specs` because its unknown-yield arm is
frozen and never validly executed; `autonomous-bug-hunting-programme` with spec
sync (`agent-protocol`).

### One spec-merge fallback, recorded rather than forced

`nightwatch-provider-resilient-current-yield-w13-v1` is strict-valid on its own
(`npx openspec validate nightwatch-provider-resilient-current-yield-w13-v1 --strict`
→ "Change ... is valid"), but its spec delta cannot merge into the
already-published `current-source-yield-measurement` baseline: the delta names
MODIFIED requirement headers ("Provider selection SHALL follow the frozen
provider-resilience policy") that do not exist in the published capability (whose
header is "Provider selection SHALL be declared before probing"). The archive
CLI aborted with "Aborted. No files were changed." rather than applying a
partial merge. This is a spec-merge conflict, not a strict-validation failure of
the change, so the canonical handling was applied: archive with `--skip-specs`
plus the disposition record in `ARCHIVE-INDEX.md`. The alternative — editing the
delta to match the published header — would have rewritten a published
requirement's identity to fit the archive, which is the class of act X-06
exists to prevent. W13's behaviour stays recorded in its tasks ledger, the
README governed status block and `STATE`.

### The mechanical consequences, closed in the same change

- **`config/task-id-ledger.v1.json`** went from 67 entries to 1
  (`nightwatch-final-product-completion-v1`). The checker's own message names the
  required action — `LEDGER_TASK_ID_ARCHIVED_ENTRY: ... remove its entry from
  config/task-id-ledger.v1.json (an archived change's IDs are no longer
  enforced)` — and the review-5 archive commit (`3362bdb0`) is the precedent
  ("archive the child change with spec sync, remove its ledger entry"). Leaving
  the entries would have failed `agent:check`.
- **`.agent/tasks/nightwatch-final-product-completion-v1/SPEC.md`** gained a
  `## Declared Deletions` block listing all 368 pre-move tracked paths of the 66
  changes (271 in the primary block plus the remainder), because the declared
  -deletion gate measures every tracked-file deletion against the session base
  and fails closed on an undeclared one (`WORKSPACE_UNDECLARED_TRACKED_DELETION`).
  The SPEC is an append-only declaration surface and already carried two
  precedent blocks for earlier archive moves.
- Every archived change's task record remains a terminal continuity record under
  `.agent/tasks/`; `npm run agent:check` PASSES with 35 warnings (down from 85,
  because the archived changes' LEDGER_TASK_WITHOUT_CHANGE warnings resolved).

### What this archive does NOT do

It does not archive this campaign's own change, it does not publish the
programme's advance-condition capabilities, and it does not convert any struck
box into a published requirement. The single remaining active change is the one
that still has open work (M14, tasks 15.1-15.8).
