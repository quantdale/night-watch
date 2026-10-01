# Task State

## Identity

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6,7,8,9
TASK_GROUP_NEXT: 10
TASK_NEXT_ID: 10.2
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
Last substantive checkpoint SHA: 321800018bc819465326ba7c0556bac31e565da4
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-09-28 — M9 10.2 IN PROGRESS (59/76 declared, 4
library-retained, 13 pending): the Phase 0 formatter blocker is RESOLVED
(owner disposition of the 16 disposable files, harness formatter/autofix
disabled, canonical clean at `df0a6d35`, workspace:check PASS); the two
10.2 follow-through commits (`0a436f12`, `09c50277`) plus the lint and
continuity follow-through are being checkpointed. Previous: 2026-09-27 —
M8 COMPLETE (9.1-9.13) with gate pair 5712/0 and exact-head CI green (run
36349771611 @ `badb6f88`); M7 COMPLETE (8.1-8.5) at 5645/0 (run
36321415439 @ `995378d2`); M6 COMPLETE (7.1-7.11); M5 COMPLETE (6.1-6.17);
M4 COMPLETE (5.1-5.7); M3 COMPLETE (4.1-4.13) with run 36243034942,
receipt `receipt:sha256:535217a6dbae65b7a26f9243`.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 027367d9da22ea1198c0a60fb1b11805f6719d40
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_FINAL_PRODUCT_COMPLETION_V1_STATUS: IN_PROGRESS

## Objective

Execute the terminal campaign `nightwatch-final-product-completion-v1`
(tasks.md phases 1-15): disposition every audited census item (OD-1), make the
certification spine checkpoint-neutral and CI-green, persist truthful
autonomous-hunt results, reconcile every operator-truth surface, close the
ledger, and end at `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 with a
`main`-only clean topology (OD-2).

## Current Milestone

M9 D-129 CLI contract and bin type-check (group 10, tasks 10.1-10.6): 10.1
DONE, 10.2 IN PROGRESS (59/76 declared, 4 library-retained, 13 pending). The
corrective child campaign (`nightwatch-final-completion-corrections-v1`) is
CLOSED and archived; the parent resumes at "M9 task 10.2 remainder" in a fresh
C-00 session.

## Completed Milestones

- **M0 COMPLETE** — owner pre-flight on canonical: drift recorded in
  audit.md (1.1); canonical record re-pointed to this task (1.2, A-04);
  orphan branch `1441cc8a` recorded and deleted (1.3, A-06); MAINTENANCE
  claim released, planning material moved to the session scratchpad,
  canonical verified clean with `workspace:check` PASS (1.4).
- **M1 COMPLETE** — session bootstrap: `sess-0734f2070d08` on
  `session/nightwatch-final-product-complet-a891357d` at base `1f786a4e`;
  planning change and continuity committed together as bootstrap checkpoint
  `ec6010a2`; session:check PASS, handoff:check PASS, agent:check PASS
  (35 legacy warnings), project:check PASS post-commit.

- **M2 COMPLETE** — certification anchors and ratchets: LIVE_TASK_STATUS
  derivation (R2-N6), checkpoint-neutral binding files behind the diff-shape
  guard (A-01), `checkReleaseEvidenceBindings` + HC-144..146 (146/146),
  project:check D-06 assertions, the bin type-check ceiling ratchet as gate
  group BIN_TYPECHECK_CEILING, and the disposition-token ledger accounting
  (A-21, R2-62). Anchors `8775b58a` + `6f8a9d7c`; gate:dev PASS 5481/0;
  gate:milestone PASS (all steps exit=0).

- **M3 COMPLETE** — CI-green, deterministic, hermetic spine (4.1-4.13):
  declared live-source skips + hermetic temp paths + per-shard skip-identity
  enforcement (`eccce619`); sibling-absent clean gate with measured identity
  (`874015b9`, `7374d511`, `8ac69c22`); TOPOLOGY + UI_CONTROL_CENTER
  certification groups, Node 22 and SHA-pinned workflow actions with the
  workflow-pinning rule (all in `4a1c2619`); X-08/A-03/A-07 session fixes
  (`981fb7f8`);
  M3 ledger docs (`7accc8de`, `11afc06a`). Exact-head CI then failed four
  times and every failure was repaired forward: environment-surface gate-label
  enum + COMPATIBILITY absent-worktree classification (`760e90fc`), declared
  CHROMIUM_UNAVAILABLE skips for the real-browser tests (`988834e1`,
  `58bf06f2`), shared port-lease authority + sun_path-safe campaign temp root
  (`736e0e09`), X-02 degraded envelope mode for bwrap-less runners
  (`aa78a014`). gate:dev PASS 5507/0; gate:milestone PASS; exact-head CI
  green (run 36243034942, all 15 groups PASS, receipt
  `receipt:sha256:535217a6dbae65b7a26f9243`).

- **M4 COMPLETE** — release-certification machinery (5.1-5.7): the six probes
  (G14 reachability, G17 schema lifecycle, G18 UI error-taxonomy receipt, G19
  environment declaration, G21 auth-capability single evaluator, G12 product
  run receipt plus the historical W13 aggregate) wired in
  `collectReleaseCheckOutputs` with all 16 `RELEASE_ADVANCE_CHECKS` entries
  `implemented: true` (`d595c7c8`); the G20 accessibility result record emitted
  by the browser certification and consumed by its fail-closed parser
  (`cab67d76`, `875490be`, `09d942cb`); the `implemented` honesty rule
  (`checkReleaseImplementedHonesty`, registry 88 rules / 148 probes at M4; 91 rules / 192 probes after the corrections campaign), the X-04
  post-certification demotion classification, the A-19 DECIDED state citing
  D-129 / programme 13.8 and the A-20 terminal C-14 record, and the A-14/D-03
  CI block-record single authority with the observed executed run
  (`a784e668`); two CI-shape repairs (`f19faa6c`, `93bf8377`); final
  integration `137207b1` after reconciling origin/main `946b52c4` and
  restoring the ledger-governed README status block. gate:dev and
  gate:milestone both PASS 5520/0 on the reconciled base.

- **M5 COMPLETE** — autonomous hunt result integrity (6.1-6.17): the
  content-addressed `AgentFindingRecord` derived in `admitLocalFinding` with a
  fail-closed validator; the atomic `agent-findings/` store published BEFORE
  any checkpoint deletion (write failure → `NOT_PERSISTED`, checkpoint kept,
  CLI exit 3); the TERMINATED resume returning persisted records verbatim or
  `UNAVAILABLE_NOT_PERSISTED`; the full reasoner identity (executable, adapter,
  print CLI, `PRINT_ARGS`, provider, model) with `REASONER_IDENTITY_MISMATCH`
  and the `--model` cross-check; resumed-budget conservation (the in-flight
  usage was being subtracted twice), the persisted per-investigation turn limit
  and the per-dimension conservation assertion; per-call provider-failure
  classes with the honest `terminationClass`; tier-scaled failure ceilings with
  transient/permanent classes and bounded jittered backoff plus the unreachable
  provider-order rule; the `retries` → `failures` rename with read-compatible
  bytes (D-144); the streaming dispatcher with signal-driven pause, reasoner
  group kill and per-investigation progress checkpoints; print-adapter cleanup
  on every exit path without fabricated grounding; HEAD-bound Git-object
  reproduction (D-145); environment-signature refusal; the product run receipt
  with the D-7 run identity; measured findings/status surfaces; malformed-state
  refusal with marked presentation defaults and `ADAPTER_UNAVAILABLE` atlas
  adapters; the bounded operator launch; and the deterministic synthetic hunt
  suite registered in the gate. gate:dev PASS 5585/0; gate:milestone PASS
  5585/0.

## Work In Progress

**Current (2026-09-30):** the parent is paused at M9 task 10.2 (59/76 declared) for the corrective child campaign; nothing is uncommitted here. The log below is HISTORICAL (M7 onward, oldest first) and is not the current state.

- M7 (tasks 8.1-8.5) is in progress; 8.1 is implemented and committed: the
  `.env` layer is parsed FAIL CLOSED (a malformed line, an undeclared key and a
  duplicate key are each refused with their line number; an ABSENT file is an
  empty layer while an UNREADABLE one is a `DOTENV_UNREADABLE` error), and the
  launchers now forward the VALIDATED process+.env merge — the dispatcher
  spawns every child from `mergedEnvironment` (its agent, operator and scenario
  branches) and the agent CLI reads its forwarded configuration from the merge
  via a cached `campaignEnvironment()` (`campaignEnvironment().NIGHTWATCH_*`),
  never from the ambient environment. `tests/unit/dotEnvLayerStrictness.test.ts`
  7/7 and 15/15 across the launcher cones.
  8.2 — HEAD is re-checked AFTER the scan (`currentness.currentSnapshot(repoId)`
  per scanned repository, computed once), the surface descriptor carries the
  verified `sourceSnapshotMatches` (true only on a match, false on a mismatch,
  ABSENT when the re-check could not run), the Phase 24 projection reads that
  fact instead of the hard-coded `true`, and the read view's proof signal now
  requires `=== true` — `tests/unit/sourceSnapshotRecheck.test.ts` 4/4 and 207
  source-cone tests green.
  8.3 — evidence that could not be evaluated is INCOMPLETE, never PASS: the
  semantic oracle's `anyPass ? 'PASS' : 'NOT_APPLICABLE'` became an
  every-invariant-PASS rule with an explicit MIX distinction (a passed +
  unevaluated pair is `PARTIAL_COVERAGE`; nothing applicable is
  `NOT_APPLICABLE`; a partially covered invariant is `PARTIAL_COVERAGE`
  regardless) — `tests/unit/semanticEvidenceCompleteness.test.ts` 4/4, the
  semantic/oracle cones 105/105 and the FULL suite 5623 passed / 33 skipped /
  0 failed on this change.
  8.4 — regex-derived analyzer observations are no longer proof: the
  observation vocabulary gained `HEURISTIC` and the raw-text regex families
  (`TS_STATIC_REQUIRED_FIELDS` / `TS_STATIC_ENUM` / `TS_STATIC_DEFAULT` /
  `TS_STATIC_FIELD_TYPE` / `GO_STRUCT_TAGS` / `GO_STRUCT_FIELD_TYPE`) now carry
  it, so the proven-candidate filters (which compare
  `status === 'MECHANICALLY_PROVABLE'`) exclude them by construction; a
  truncated observation budget is REPORTED as `ANALYZER_OUTPUT_TRUNCATED`
  instead of silently sliced. Evidence:
  `tests/unit/sourceAnalyzerProofTier.test.ts` 5/5 plus the Phase 20/25/26 +
  semantic cones 63/63; the Phase 20 fixture/mutant floors were re-calibrated
  to the honest admitted set (78 fixtures / 28 mutants, score still 1000,
  zero survivors, zero benign false positives).
  8.5 — **M7 IS COMPLETE.** `npm run gate:dev` PASS (5645 passed / 0 failed,
  every group exit=0) and `npm run gate:milestone` PASS (wall 1087.9s, 5645/0,
  typecheck-bin + hardening-rules + project-check + workspace-check exit=0);
  8.1-8.5 are ticked in `tasks.md` and PLAN M7 is COMPLETE. The narrowed claims
  legitimately re-based the frozen Phase 20/21 baselines (graph 157->133 nodes,
  gaps 86->62, mutants 67->55) and required the semantic receipt to carry
  `PARTIAL_COVERAGE_NO_VIOLATION` whenever the oracle reports incomplete
  coverage (the `realSourceConformingMutation` empty-list case is now
  PARTIAL_COVERAGE, never PASS).
  M8 9.1 DONE — DEV-lane precondition registry and launcher refusal:
  `config/dev-lane-preconditions.v1.json` lists NW-AUD-016 (full), 022 (task
  2.1 / R2-47), 025 (full), 026, 037, 038 as OPEN with NO standing owner
  authorization; `src/core/policy/devLanePreconditions.ts` is the authority
  (fail-closed registry parse, `DEV_LANE_PRECONDITION_OPEN` listing every open
  id, `DEV_LANE_OWNER_TOKEN_UNRECOGNIZED` for an unrecognized/unauthorized
  `D-<n>` citation) and `bin/lib/dev-lane-precondition.mjs` is the launcher
  guard, called FIRST by all thirteen DEV-contacting launchers (before argument
  validation, auth validation or any child process). `observe-preflight.mjs` is
  exempt by construction (pinned: no spawn/browser/socket/cookie read) so its
  argument-validation coverage survives. A registry-path seam
  (`NIGHTWATCH_DEV_LANE_REGISTRY_PATH`) plus `tests/helpers/devLaneAuthorization.ts`
  keeps each launcher's OWN boundary tests reachable under an authorized
  citation; the shipped default still refuses unconditionally. Evidence:
  `tests/unit/devLanePreconditions.test.ts` 10/10 (including a real spawn of
  every guarded launcher), the repaired launcher-boundary suites green, and the
  sharded lane PASS at 5655/0 (5688 planned, 0 failed).
  M8 9.2 DONE — DEV credential effect binding (NW-AUD-021 residual): effects
  now go through `pinVerified()` element handles (the verified element
  IDENTITY, never a fresh locator resolution), `beginEffectSequence()` sets
  `used` on the FIRST effect and refuses a second sequence, the snapshot pins
  the source-approved exchange (`formAction`/`formMethod`) and an optional
  `expectedProxyInstanceId` must be echoed before any effect. Evidence:
  `tests/unit/devCredentialEffectBinding.test.ts` 7/7 (one-shot mark, detached
  pin after a swap, navigation between effects, `formaction` redirect refused,
  proxy-instance mismatch, the full pinned-handle login, and a source census of
  the effect sites / same-evaluate verification / credential consumers) plus
  the pre-existing `devLoginSecurity` suite green and the sharded lane PASS at
  5662/0 (5695 planned, 0 failed).
  M8 9.3 DONE — transactional storage-state plus sidecar publication
  (NW-AUD-015): `publishAuthCapabilityBundle` stages both files, journals the
  intended pair (`nightwatch.auth-bundle-transaction.v1`), commits the two
  renames and removes the journal; the record is built from the STAGED artefact
  bytes so a digest disagreement refuses before any rename; readers refuse a
  pending journal (`AUTH_BUNDLE_TRANSACTION_PENDING`) instead of reading an
  interrupted publication as a completed pair, and `recoverAuthCapabilityBundle`
  completes the commit only against the journal's digests
  (`AUTH_BUNDLE_RECOVERY_REFUSED` otherwise). The capture path
  (`directRunner.ts`) publishes through the bundle and the old separate-write
  pair is gone (source-censused). Evidence:
  `tests/unit/authBundleTransaction.test.ts` 7/7, the auth launcher suites
  green, `hardening:check` + `schema-lifecycle check` PASS, and the sharded lane
  PASS at 5669/0 (5702 planned, 0 failed).
  M8 9.4 DONE — proxy effect-pair evidence (NW-AUD-022 narrowed): every effect
  path (HTTP forward, CONNECT tunnel, Upgrade handshake) writes a PREPARED
  record before the effect and exactly one TERMINAL record after it, joined by
  one `effectId`; `readProxyEventLedger` fails closed on malformed lines/events
  and on unmatched, orphaned, duplicated or mis-ordered pairs
  (`PROXY_EVIDENCE_LEDGER_INVALID`), while `readProxyEvents` stays the tolerant
  live reader. This work also found and fixed a real falsy-seq defect: the
  evidence-write sentinel was `!recorded`, so the legitimate first record
  (seq 0) was treated as a write failure and closed the socket — it is now
  `recorded < 0`. Evidence: `tests/unit/proxyEffectPairEvidence.test.ts` 7/7,
  the proxy/containment suites 44/44, `hardening:check` PASS, and the sharded
  lane PASS at 5676/0 (5709 planned, 0 failed).
  M8 9.5 DONE — browser context guard transaction integrity (NW-AUD-023
  narrowed): a rollback boundary now closes the context and clears the health
  poll when any post-context setup stage fails (the original error still
  propagates); the health poll is a tracked variable cleared on both exit
  paths; popup acquisition is an awaited barrier whose failure mode is
  deny-by-policy (reported at close, never swallowed); and `close()` joins
  every in-flight acquisition before tearing down. The NW-AUD-020 tasks 3.2/4.2
  closure claims are RE-TAGGED UNPROVEN (9.5b). Evidence:
  `tests/unit/contextGuardTransaction.test.ts` 5/5, `hardening:check` PASS, and
  the sharded lane PASS at 5681/0 (5714 planned, 0 failed).
  M8 9.6 DONE — bounded response-body acquisition (NW-AUD-035): a body read
  that loses its race against the 5s timer is now JOINED (one settlement
  handler that discards the value and swallows the rejection, released exactly
  once), and acquisition is bounded at `MAX_CONCURRENT_BODY_READS` (4) with a
  distinct refusal outcome reported as the new closed failure code
  `BODY_READ_ACQUISITION_BOUND` instead of an unbounded queue. Cancellation is
  not available for Playwright's `body()`, so joining + the gate is the
  strongest available guarantee and is recorded as such. Evidence:
  `tests/unit/bodyReadAcquisition.test.ts` 4/4, the network-observer/journey
  suites 14/14, `hardening:check` PASS, and the sharded lane PASS at 5685/0
  (5718 planned, 0 failed).
  M8 9.7 DONE — run evidence bundle transaction integrity (NW-AUD-024
  residual): a deterministic `generation` identity in the manifest (two
  bundles differing in run id or start instant are distinguishable; a
  frozen-clock replay stays byte-identical), `addManifestEntry` fails closed on
  a malformed manifest instead of silently replacing it with `{}`, appends are
  bounded at append time (`RUN_EVIDENCE_APPEND_BOUND_EXCEEDED`), and
  `download.cancel()` moved into a `finally`. Evidence:
  `tests/unit/runEvidenceBundleTransaction.test.ts` 7/7, `evidence.test.ts`
  26/26 (including byte-for-byte reproducibility with the new field),
  `hardening:check` PASS, and the sharded lane PASS at 5692/0 (5725 planned,
  0 failed).
  M8 9.8 DONE (with a recorded narrowing) — per-start proxy instance nonce
  (NW-AUD-016): each start generates a fresh 32-hex nonce, the health endpoint
  echoes it, the runtime state records it (optional-but-validated key) and
  EVERY event record carries it, so a log belongs to one instance.
  `checkProxyHealthDetailed` reports `observedNonce`/`attested`; the boolean
  startup gate deliberately keeps its 204 semantics, so the echo is OBSERVED
  and available to callers but NOT enforced there (a foreign listener that
  answers 204 without or with a wrong header still passes the boolean gate).
  That remaining enforcement is recorded as open rather than over-claimed.
  Evidence: `tests/unit/proxyInstanceNonce.test.ts` 4/4, the sharded lane PASS
  at 5695/0 before commit plus `projectState` 103/103 post-commit,
  `hardening:check` PASS.
  M8 9.9 DONE (with a recorded narrowing) — relay invocation authority
  (NW-AUD-028): a per-INVOCATION 32-hex credential is minted by the relay,
  accepted as protocol surface and presented by the parent on every relay
  request; a RELAY-WIDE budget (`MAX_RELAY_REQUESTS = 8`) is owned by the relay
  and spent per request; and an observation is written ONCE per operation
  (a second write is refused with `RELAY_OBSERVATION_ALREADY_RECORDED` and the
  first stands). NARROWING: the relay-wide budget is accounted but not yet
  ENFORCED in `requestPhase5Relay` (an earlier attempt blocked a legitimate run
  with `RELAY_SAFETY_BLOCK`; the probe/scenario traffic must be counted first),
  so the runtime-level bound still holds and this stays open. Evidence:
  `tests/unit/relayInvocationAuthority.test.ts` 5/5, `phase5Api` 18/18,
  `hardening:check` PASS, sharded lane PASS at 5701/0 (5734 planned).
  M8 9.10 DONE (with a recorded narrowing) — change intelligence source
  generation integrity (NW-AUD-043): `validateChangeSet` runs before any
  selection and RECOMPUTES `changesetId` from the content (canonical `cs-<24
  hex>` ids only; `CHANGESET_ID_MISMATCH`), requires a baseline for every
  changed file (`CHANGESET_BASELINE_MISSING`), requires BOTH rename endpoints
  (`CHANGESET_RENAME_ENDPOINT_MISSING`) and refuses a self-referential rename;
  both endpoints already drive edge matching and non-runtime classification,
  and edges are matched against the changeset's own baselines. NARROWING: the
  baseline SHA-SHAPE rule was removed (it coupled the validator to synthetic
  fixture conventions and broke 16 legitimate aiReview/aiOwnerReview tests) and
  stays open. Evidence: `tests/unit/changeSetGenerationIntegrity.test.ts` 5/5,
  the aiReview/aiOwnerReview/changeIntelligence suites green, `hardening:check`
  PASS, sharded lane PASS at 5705/0 (5739 planned) plus `projectState` 103/103.
  M8 9.11 DONE for R2-03, R2-04 RECORDED OPEN — child-process census
  indirection totality: dynamic `import()`, `createRequire`, string-built
  specifiers and namespace destructuring all record an unresolved indirection
  now (a plain literal import stays clean; the two legitimate `createRequire`
  sites are named in `KNOWN_CREATE_REQUIRE_SITES` so a new one still fails).
  R2-04's explicit-env-allowlist and sync timeout/output-bound rules were
  implemented, run and REVERTED because dozens of existing call sites are not
  conformant (affected-tests, bin-typecheck, c12-preflight, evidence-retention,
  finding-intel-scale, …); they need their own conformance sweep and stay open,
  with the test pinning that the rules are absent rather than pretending.
  Evidence: `tests/unit/childProcessCensusIndirection.test.ts` 6/6,
  `hardening:check` PASS, sharded lane PASS at 5711/0 (5745 planned).
  M8 9.12 + 9.13 DONE — **M8 IS COMPLETE.** A new TOTALITY rule
  `checkM8GuardTotality` requires 22 M8 guards to remain present in code, each
  with its own registered mutation probe (HC-155…HC-176); the run-bundle guards
  gained four probes on the evidence-firewall rule (HC-150…HC-153) and the
  census indirection guard gained HC-154. The FULL campaign is green: **90
  rules, 175 probes, 175 DETECTED, 0 undetected, every mutation restored**.
  `npm run gate:dev` PASS (5712 passed / 0 failed, all groups exit=0) and
  `npm run gate:milestone` PASS (wall 829.9s, 5712/0, typecheck-bin +
  hardening-rules + project-check + workspace-check exit=0); rule-count pins
  advanced (90 rules / 67 TOTALITY). One 9.6 follow-through: the
  `observerSemanticLedger` overflow loop is paced because bounded acquisition
  deliberately refuses reads under saturation (the exact 512 cap and the
  explicit-overflow assertion are unchanged).
  M9 10.1 DONE, 10.2 IN PROGRESS — the operator-CLI surface registry
  (`config/operator-cli-surface.v1.json`) declares every tracked `bin/*.mjs`
  file with exactly one disposition (OPERATOR_CLI / LIBRARY_RETAINED with a
  reason / PENDING_OPERATOR_CLI) and records the counts, so the remaining
  migration is a counted fact; `tests/unit/operatorCliSurface.test.ts` pins the
  declaration/entry-point honesty and the count reconciliation. Seven DEV
  launchers are migrated with accurate flag metadata (phase2b/2c/4/5/9b/10b/
  22-real), which surfaced a real defect: the migrated bins exited 0 on a
  `cli.stop` path and overwrote the shared parser's refusal code, so an unknown
  option exited 0 instead of 2 — fixed by exiting with `process.exitCode ?? 0`.
  `phase7-real` was reverted deliberately (its option surface is richer than the
  derived set). Conformance: 55/76 declared, 4 library-retained, 17 pending.
  Second 10.2 batch: `auth-capture`, `ai-owner-review` (+ its `show`/`status`/
  `decide` commands), `nightwatch-control-center` and `phase7-real` migrated —
  conformance is now 59/76 declared, 4 library-retained, 13 pending. The
  migration surfaced two shared-parser refusal codes (`CLI_ARGUMENT_CONFLICT`,
  `CLI_UNKNOWN_ARGUMENT`), so the launcher boundary suites accept the shared
  codes alongside the bins' own; the properties under test are unchanged.
  Sharded lane PASS at 5718/0 (5751 planned).
  Next: continue 10.2 (the remaining 13 bins), then 10.3 (shared-parser
  structural rule with a negative probe, task counts, README claim at 76/76).
- M6 is COMPLETE: 7.1-7.11 are ticked in the campaign ledger with DONE notes
  and PLAN marks M6 COMPLETE. The view-DOM baseline was intentionally
  REGENERATED (`NIGHTWATCH_UPDATE_VIEW_DOM_BASELINE=1`) because the Agent
  Campaigns view adds a navigation entry and a view — an intended DOM change
  the baseline test itself requires to be recorded here.
- M7 (tasks 8.1-8.x) has not started.

- M5 is COMPLETE (ledger ticked, PLAN/STATE advanced, gate pair 5585/0,
  exact-head CI run 36302111703 green) and pushed.
- M6 (tasks 7.1-7.11) is in progress; 7.1-7.3 are implemented and committed:
  7.1 — the protocol dossier's status is DERIVED (`protocolDossierReadiness`)
  instead of hard-coded READY, the v1 validator accepts the truthful
  `UNRESOLVED`, and every consumer filtering on `status === 'READY'` excludes a
  dossier that never reproduced (`tests/unit/dossierReadiness.test.ts` 4/4);
  7.2 — the Control Center status mapping is TOTAL: the dossier-status
  vocabulary gained `UNRESOLVED` (+ `UNKNOWN` for unknown values), one
  exhaustive `dossierStatusOf` projection serves the adapter and the findings
  authority, and the sanitizer allowlists are DERIVED from the contract
  vocabularies (the inline dossier-status list was silently dropping an
  unresolved dossier) — `tests/unit/controlCenterStatusTotality.test.ts` 4/4;
  7.3 — replay contexts are ROLE-typed: the admission key is `(role, runId)`,
  L1/L2 require a genuinely different role, three runs of one role stay an L0
  candidate, and the phase7 harness receives its role explicitly instead of
  inferring it — `tests/unit/replayContextRoles.test.ts` 6/6.
  7.4 — orchestrator state now lives in a dedicated `campaign-state/` private
  subtree (the closed directory vocabulary gained a second member, with the
  hardening pin and its mutation probe widened), the legacy findings-root
  location stays READABLE through a fallback, and the Control Center findings
  authority decides the DOSSIER FAMILY first: a non-dossier file is skipped
  with the informational `FINDINGS_NON_DOSSIER_FILE_SKIPPED` reason instead of
  being parsed as a corrupt dossier, so orchestrator state beside the dossiers
  can never blank the Findings view — `tests/unit/campaignStateSubtree.test.ts`
  3/3 and 158 affected tests green.
  7.5 — the run-evidence reader now reports a bounded NEWEST-N window over the
  real run root (with `window.limit/considered/truncated` and the informational
  `RUN_EVIDENCE_WINDOW_TRUNCATED` reason) instead of refusing a growing tree,
  inspection itself is bounded, and the test seam carries an injectable window
  limit so the bound is provable without materialising 256 run directories —
  `tests/unit/controlCenterRunEvidenceReader.test.ts` 12/12;
  7.6 — a read-only agent-campaign authority/view/route: measured per-campaign
  rows read from the durable owner-local store, an unreadable store is
  explicitly UNAVAILABLE (never a silent empty view), the DTO carries campaign
  and candidate ids plus `afr:` dossier identities and counts but NO path
  (asserted against `/`, `\\`, `.nightwatch` and the store root), and
  `/api/v1/agent/campaigns` is served by the collector —
  `tests/unit/controlCenterAgentCampaigns.test.ts` 4/4.
  7.7 — the Safety Center is MEASURED: the owner-scope check comes from the
  policy record, the owner-CLI surfaces (workspace integrity, session
  protocol) are explicitly `NOT_MEASURED` with named reasons, the frozen
  operation classes come from `FROZEN_OWNER_OPERATIONS`, and currentness is
  labelled `NOT_WIRED` with the prerequisite named (C-25); the retired
  `DEFAULT_CONTROL_CENTER_SAFETY_INPUT` constant is gone (asserted) —
  `tests/unit/controlCenterSafetyAuthority.test.ts` 6/6;
  7.8 — ONE `resolveSiblingRoot()` in the topology authority (trimmed,
  env-first, empty-means-unset, relative refuses) now serves the intelligence
  CLI, the Control Center source view, the historical context, the bug-atlas
  miner, the owner-local context and reproduction provider, the operational
  CLIs and the shared test authority; the new TOTALITY rule
  `checkSiblingRootResolution` (probe HC-149) flags direct leaf-constant reads
  and the pre-existing rule enforces the resolver call form —
  `tests/unit/siblingRootResolution.test.ts` 4/4, 62 affected green.
  Next: 7.9 (relabel the synthetic Phase 19-21 previews as synthetic preview,
  or delegate them to `status:local`).
- M5 history (kept for context): 6.1-6.11 are implemented, validated and
  committed (`9a044b49`, `5719f6ea`-lineage): the content-addressed
  `AgentFindingRecord` in `admitLocalFinding`; the atomic `agent-findings/`
  store published BEFORE any checkpoint deletion (write failure →
  `NOT_PERSISTED`, checkpoint kept, CLI exit 3); the TERMINATED resume that
  returns persisted records verbatim or `UNAVAILABLE_NOT_PERSISTED`; the full
  reasoner identity with `REASONER_IDENTITY_MISMATCH` and `--model`
  cross-check; resumed-budget conservation (the in-flight usage was being
  subtracted twice), the persisted per-investigation turn limit and the
  per-dimension conservation assertion; per-call provider-failure classes with
  the honest `terminationClass` (a dead provider is no longer BUDGET_EXHAUSTED
  or zero yield); tier-scaled failure ceilings, transient/permanent classes
  with bounded jittered backoff, unreachable provider orders, and the
  `retries` → `failures` rename with read-compatible legacy bytes (D-144);
  the dispatcher forwards a campaign without a fixed deadline, streaming output
  and forwarding signals; SIGINT/SIGTERM pause with a PAUSED checkpoint and a
  reasoner group kill plus per-investigation progress checkpoints; the print
  adapter cleans up on every exit path and never fabricates grounding refs;
  and reproduction materializes from the recorded HEAD tree in the Git object
  store (D-145). Next: 6.12 (ENVIRONMENT_DEPENDENT refusal).

## M7 exact-head CI observation (OD-3)

Command: `gh run watch 36321415439 --exit-status` (OD-3 exact-head CI observation, M7)
Result: PASS — `completed / success`, headSha `995378d23316173a91596bf6c3f72045a31dbb35`
When: 2026-09-27
Relevant failure/output summary: the M7 closeout head; every job step green
(`Execute authoritative quality gate` included). The TWO PRIOR pushes failed CI
and were repaired forward in this head: run `36314901548` at `56ec55c5` (the 8.4
push) and run `36314103246` at `895f0e02` (the 8.3 push) both failed on the
frozen Phase 20/21 baselines that the honest narrowing legitimately moved
(graph 157->133 nodes, gaps 86->62, mutants 67->55) plus the receipt coherence
for an incomplete-coverage outcome. Those repairs are committed
(`19fba2b2`, the differential re-base, and the semantic receipt mapping) and CI
confirmed the repaired head green. M7 is validated end to end: focused cones,
`gate:dev` and `gate:milestone` at 5645/0, and exact-head CI green.

## M8 exact-head CI observation (OD-3)

Command: `gh run watch 36349771611 --exit-status` (OD-3 exact-head CI observation, M8)
Result: PASS — `completed / success`, headSha `badb6f883f51b7001d59552b7c0b19d16d4f1012`
When: 2026-09-27
Relevant failure/output summary: the M8 closeout head; every job step green
(`Execute authoritative quality gate` included). The PRIOR push (`ab1fa187`,
the 9.11 census-indirection checkpoint) failed CI in run `36343583350` with
exactly one failed location — `tests/unit/observerSemanticLedger.test.ts:136`,
the 550-request ledger-overflow loop, which assumed every response body is
captured and therefore collided with 9.6's bounded acquisition gate (a
saturated gate refuses a read rather than queueing it). That failure was
repaired forward by pacing the loop and widening the poll timeout while keeping
the exact 512 cap and the explicit-overflow assertion, and CI confirmed the
repaired head green. M8 is validated end to end: focused cones, the full probe
campaign (175/175 detected), `gate:dev` and `gate:milestone` at 5712/0, and
exact-head CI green.

## M9 10.2 checkpoint CI observation (OD-3)

Command: `gh run watch 36366426608 --exit-status` (OD-3 exact-head CI
observation, M9 10.2 checkpoint)
Result: PASS — `completed / success`, headSha
`321800018bc819465326ba7c0556bac31e565da4`
When: 2026-09-28
Relevant failure/output summary: the M9 10.2 checkpoint head (three commits:
`0a436f12`, `09c50277`, `32180001`); every job step green (`Execute
authoritative quality gate` included). Local validation before the push:
gate:dev PASS 5718/0 post-commit (the only pre-commit failure was the known
`projectState.test.ts:2316` clean-tree assertion on the dirty worktree),
projectState 103/103, focused CLI/launcher/review suites 77/77, full probe
campaign 176/176 detected with every mutation restored, hardening:check PASS,
agent:check PASS (86 warnings).

## Exact Next Action

M9 task 10.2 remainder. When the corrective child campaign closes (its ACTIVE_TASK route returns here at IN_PROGRESS): start a fresh C-00 parent session (`session start --task nightwatch-final-product-completion-v1`, then `claim --adopt`), finish the 13 pending 10.2 declarations (59/76 declared), then 10.3-10.6, M10-M14, and the 13-section final report. Sequencing constraint recorded in D-148: run the paid proof (12.3) after the last substantive fix so G12's receipt binds to S.

## Superseded Next Action (8.1, complete)

Read tasks 8.1-8.x and the environment-surface loader
(`src/core/config/environmentSurface.ts`) plus the launchers that forward
configuration, then implement 8.1 (NW-AUD-012 narrowed) with focused tests,
repairing forward with new commits. Then continue the M7 items in order,
committing each validated batch, and close M7 with focused + `gate:milestone`
PASS, the C-00 integrate and the `gh` CI observation (OD-3) as in M4-M6.

## Superseded Next Action (M6, complete)

Implement 7.9: relabel the synthetic Phase 19-21 previews
(`nightwatch:status`, `campaign:plan|coverage|contracts|gaps|operator`) as
SYNTHETIC PREVIEW in their output (or delegate them to `status:local`) so a
preview can never read as a measured product state (B-17, NW-AUD-041/042
narrowed). Then 7.10 (`status:local` renders auth entries under their own
heading, not under blockers) and 7.11 (browser/UI coverage for the new views:
typecheck, vitest, browser suite), then the M6 closeout with focused +
`gate:milestone` PASS, the C-00 integrate and the `gh` CI observation (OD-3)
exactly as in M4/M5.

## Files Changed

| Path | Reason | Status |
| --- | --- | --- |
| `openspec/changes/nightwatch-final-product-completion-v1/` | terminal campaign contract (proposal/design/audit/tasks/specs) | restored unchanged into the worktree |
| `openspec/changes/nightwatch-final-product-completion-v1/audit.md` | P0 drift record (1.1) and A-06 disposition record (1.3) | updated this session |
| `.agent/tasks/nightwatch-final-product-completion-v1/` | continuity v2 record for this campaign | created in the worktree (M1) |
| `.agent/ACTIVE_TASK.md` | active route and session binding | flipped to this campaign (M1) |
| `.agent/EXECUTION_PROMPT.md` | planner-executor handoff for this campaign | rewritten (M1) |
| `bin/`, `src/`, `config/`, `tests/`, `ui/control-center/`, `docs/` (M2-M9) | the certification spine, hunt integrity, finding truth, narrowed claims, contained-DEV lane and CLI contract work | committed and integrated; see `git log 1f786a4e..1d47e2ee` |
| `openspec/changes/nightwatch-final-product-completion-v1/tasks.md` | stable IDs restored (VA-01), reopened-by-corrections annotations | corrected by the child campaign (task 5.1) |

## Validation Ledger

Command: `git fetch origin` + `git rev-parse HEAD origin/main`
Result: PASS
When: 2026-09-25
Relevant failure/output summary: no remote movement; `HEAD == origin/main ==
1f786a4e1b7e4967d06c930946f1107e32931e8a`; single canonical worktree; orphan
branch `session/nightwatch-successor-campaign-en-c8bcb74c` present.

Command: `npm run project:check`
Result: FAIL (EXPECTED, OD-4)
When: 2026-09-25
Relevant failure/output summary:
`PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED`; release verdict
`nightwatch.release-certification.v1` OPERATIONALLY_ACCEPTED; conditions
met=0/16; certificationRefused=true; checkpoint `87c4506f`. Matches the
audit's predicted baseline exactly.

Command: `npm run agent:check`
Result: FAIL (EXPECTED, OD-4)
When: 2026-09-25
Relevant failure/output summary: 1 error
`LEDGER_CHANGE_WITHOUT_TASK` (change `nightwatch-final-product-completion-v1`
had no task STATE yet at measurement time); legacy warnings unchanged.

Command: `npm run workspace:status` / `npm run status:local`
Result: PASS / MEASURED
When: 2026-09-25
Relevant failure/output summary: workspace invariants all PASS,
clean=false (untracked planning dir, OD-4 state); `status:local` reports the
change as MISSING_TASK open=113; drift recorded in audit.md.

Command: `openspec validate nightwatch-final-product-completion-v1 --strict`
Result: PASS
When: 2026-09-25
Relevant failure/output summary: Change is valid (113 tasks, 7 delta specs).

Command: `git show session/nightwatch-successor-campaign-en-c8bcb74c`
Result: PASS (A-06)
When: 2026-09-25
Relevant failure/output summary: tip `1441cc8a` verified as the single
docs-only BLOCKED record commit before `git branch -D` under OD-3.

Command: `node bin/nightwatch-session.mjs claim/release` (canonical MAINTENANCE)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: `sess-200ba55d7757` adopted from
`sess-36dedce34085`, naming this task (A-04), then released after the
continuity staging bound it; canonical clean afterwards with
`workspace:check` PASS (attention=0).

Command: `node bin/nightwatch-session.mjs start/claim` (session worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: worktree
`nightwatch-final-product-complet-a891357d`, branch
`session/nightwatch-final-product-complet-a891357d`, base `1f786a4e`,
session `sess-0734f2070d08`; claim adopted the created registration.

Command: `npm run session:check` (worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: OWNED_SESSION, drift=false, attention=0,
canonicalSafe=true; worktree dirty only with the staged bootstrap content.

Command: `npm run handoff:check` (worktree)
Result: PASS
When: 2026-09-25
Relevant failure/output summary: planner-handoff receipt status PASS;
OpenSpec route files tracked; Planned-From `1f786a4e` is a main ancestor.

Command: `npm run agent:check` (worktree)
Result: PASS (35 legacy warnings)
When: 2026-09-25
Relevant failure/output summary: 0 strict errors after the STATE heading set
was completed and the stray slash-joined command list was rephrased out of
ACTIVE_TASK; warnings are the known historical LEDGER_TASK_WITHOUT_CHANGE
population.

Command: `npm run project:check` (worktree, pre-commit)
Result: FAIL (EXPECTED, pre-commit)
When: 2026-09-25
Relevant failure/output summary:
`PROJECT_STATE_CHECKOUT_DIRTY` — the bootstrap content is staged but not yet
committed; every other section reproduced the certified-baseline detail with
ledger_errors=0 (OD-4's LEDGER_CHANGE_WITHOUT_TASK resolved). Re-run after
the bootstrap commit.

Command: `npm run typecheck`, `npm run typecheck:bin`, `npm run hardening:check`
Result: PASS (M2)
When: 2026-09-26
Relevant failure/output summary: root typecheck clean; bin lane PASS with the
new ceiling ratchet (bin/run-shards.mjs 14 <= 25 after JSDoc annotation; no
behaviour change), conformance 14/76 (burn-down is M9); hardening structural
invariants hold including the new `checkReleaseEvidenceBindings` rule.

Command: `node bin/hardening-check.mjs --probe-campaign`
Result: PASS (M2, task 3.3)
When: 2026-09-26
Relevant failure/output summary: rules=86 probes=146 detected=146
undetected=0 restored statusUnchanged=true; HC-144 (subject mutation),
HC-145 (non-binding key), HC-146 (correction-entry non-binding key) all
DETECTED by `checkReleaseEvidenceBindings`.

Command: focused suites (liveTaskStatusDerivation 5/5, c16ExpectedInformationGain,
hardeningRuleParity, productionCompletionOpenWork 15/15, projectState 91/91,
plannerHandoff, validationShardPlan, validationExecutionClasses,
phase23QualityGate, hardeningRuleQuantifiers, nw14HostCapabilityMatrix)
Result: PASS (M2)
When: 2026-09-26
Relevant failure/output summary: contract pins updated for the new rule
(86 rules), the BIN_TYPECHECK_CEILING gate group, the new test-file
classifications, and the binding-authority migration (lane evidence resolved
through config/release-evidence.v1.json with the one-time legacy fallback).

Command: `npm run gate:dev`
Result: PASS (M2, task 3.7)
When: 2026-09-26
Relevant failure/output summary: all steps exit=0; affected-shards
passed=5481 failed=0 in 420.2s; validation-universe unclassified=0 after
registering tests/unit/liveTaskStatusDerivation.test.ts.

Command: `npm run gate:milestone` (pre-commit)
Result: STEP_FAILED (EXPECTED PRE-COMMIT)
When: 2026-09-26
Relevant failure/output summary: every step exit=0 (typecheck-bin,
hardening-rules 146/146 probe campaign included) except project-check exit=1
on `PROJECT_STATE_CHECKOUT_DIRTY` — the milestone gate requires committed
state; re-run after the M2 commit.

Command: `npm run gate:dev` (M3, tasks 4.1-4.6)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all steps exit=0; affected-shards
passed=5485 failed=0, 33 skips all declared by the per-shard skip-identity
policy; validation-universe PASS with refreshed inventory digest after
registering tests/unit/sanitizedFailureLocations.test.ts.

Command: gate:dev affected-shards (M3 intermediate)
Result: ONE INTERMITTENT TEST FAILURE (exclusive bucket, not reproduced)
When: 2026-09-26
Relevant failure/output summary: a single gate:dev run reported the exclusive
shard failed=1; the same bucket then passed 361/361 in isolation, the full
run-shards universe passed 5485/0, and a subsequent gate:dev passed 5485/0.
The receipt was overwritten before the failing location could be read; cause
NOT identified and NOT hidden — watch item for 4.13's full validation.

Command: looped + load-stressed `observerSemanticLedger.test.ts` (M3 4.4)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: 5/5 looped passes idle; 3/3 passes under
6-way CPU saturation (wall 10s → 14s) after converting the waits to
event-driven polls (D-24/R2-65 reproduction + fix evidence).

Command: focused suites (c03 31+3sk, c04 12+6sk, c02b 17+2sk, c02a 20+2sk,
realSourceCanary, c07, phase14FreshSourceAdmission, phase14ContractReport,
reviewStore 54/54, sanitizedFailureLocations, gateReceiptPersistence,
syntheticCampaignDiagnostics, plannerHandoff, validationShardPlan)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all green; typecheck clean; hardening:check
PASS including the dead-`protocol` cleanup in documentation.mjs.

Command: `node bin/run-shards.mjs --json` (M3 skip-policy enforcement)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: result PASS, totals 5485/0 with 33 declared
skips; undeclared-skip enforcement proven earlier by shard-1
SHARD_UNDECLARED_SKIP (3 undeclared → fixed via the rebuilt allowlist) and
the phase14ContractReport double-quote reason that the original generator
missed.

Command: `npm run gate:clean` (M3 4.7 evidence)
Result: RECEIPT RECORDED (both the dirty-tree ENVIRONMENT_MISMATCH path and
the full pre-4.7 run)
When: 2026-09-26
Relevant failure/output summary: the full run's receipt carries
siblingMode=ABSENT, siblingRootClass=EMPTY_DISPOSABLE, measured
siblingIdentityBefore==After (empty digest), install PASS, Node 20 toolchain
(pre-4.11), HARDENING+PROBES PASS and HANDOFF_TRUTH TEST_FAILURE — the latter
was the clone lacking the session worktree (D-04), fixed by 4.10; receipts now
persist to artifacts/gate-receipts/ (B-14).

Command: `npm run gate:topology` (M3 4.8)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all four absence envelopes constructed,
dynamic lanes PASS, findings [], plus requiresSiblingTopologyMeasurements
for all 14 groups (3 measurable, 0 dependence, 11 unmeasurable);
checkWorkflowActionPinning probe HC-147 DETECTED (campaign 147/147).

Command: `npm run gate:ui` (M3 4.9)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: npm ci + typecheck + vitest + vite build +
build verification all PASS (3 built files, 359051 bytes).

Command: clone reproduction of the HANDOFF_TRUTH failure (M3 4.10)
Result: REPRODUCED THEN FIXED
When: 2026-09-26
Relevant failure/output summary: a manual clone failed with
ACTIVE_TASK_SESSION_WORKTREE_MISSING (the declared session worktree is not
registered in a fresh clone) → HANDOFF_ACTIVE_CONTINUITY_FAILED; with the
4.10 classification the same clone passes under NIGHTWATCH_GATE_ENVIRONMENT=CI
and still fails without the label (local strictness preserved).

Command: focused suites for 4.7-4.12 (workspace/session 86/86, topology
26/26 incl. X-02 twins, quantifier 6/6 at 87 rules, phase23 gate pins,
routing/agent-state, phase14 twins, reviewStore 54/54)
Result: PASS
When: 2026-09-26
Relevant failure/output summary: all green; typecheck clean;
hardening:check PASS including the workflow-pinning rule and the authenticated
writer census (quality-gate-clean registered as LANE_RECEIPT_TOOL for its
receipt persistence).

Command: `npm run gate:dev` + `npm run gate:milestone` (M3 4.13 close-out,
post topology repair)
Result: PASS (both)
When: 2026-09-26
Relevant failure/output summary: at `aa78a014` — gate:dev affected-shards
5507/0 (selected 395); gate:milestone every step exit=0 with affected-shards
5507/0; npx tsc clean; hardening:check PASS; gate-topology local envelope
regression PASS (envelope BUBBLEWRAP, all four absences constructed, findings
[]) and degraded e2e PASS inside a bwrap-masked user namespace (envelope
BWRAP_UNAVAILABLE_DEGRADED, findings []). Canonical was formatter-churned in
`tests/unit/syntheticCampaignShards.test.ts` and restored path-scoped
(token-identical) before the runs.

Command: `node bin/nightwatch-session.mjs integrate --expect-session
sess-0734f2070d08 --expect-head aa78a014cd18b5cdc1c90b27286f12e0e6bb345f`
Result: SESSION_INTEGRATED — origin/main=aa78a014cd18b5cdc1c90b27286f12e0e6bb345f
When: 2026-09-26
Relevant failure/output summary: fast-forward only (CAS on the remote ref),
no force push, no history rewrite; session `sess-0734f2070d08`.

Command: `gh run watch 36243034942` (OD-3 exact-head CI observation)
Result: PASS — `completed / success`, gate `finalResult: PASS`
When: 2026-09-26 (run 12:47:28Z → 13:00:49Z)
Relevant failure/output summary: gitHead `aa78a014`; node v22.23.2 /
npm 10.9.8; environmentClass CI; receipt `receipt:sha256:535217a6dbae65b7a26f9243`;
all 15 required groups PASS — GATE_DEFINITION, STATIC, BIN_TYPECHECK_CEILING,
HARDENING, HARDENING_PROBES, HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY,
SEMANTIC_COMPATIBILITY (2148 total / 2134 passed / 14 skipped / 0 failed),
OWNER_PROVENANCE, SYNTHETIC_CAMPAIGN (1951 / 1907 / 44 skipped / 0 failed),
PATCH_INTEGRITY, WORKSPACE_INTEGRITY, TOPOLOGY (degraded envelope — the
runner has no bwrap), UI_CONTROL_CENTER. R2-CI satisfied.

Command: exact-head CI repair chain (runs 36221563120 → 36237628855)
Result: FAIL → FAIL → FAIL → FAIL → FAIL, every failure repaired forward
When: 2026-09-26
Relevant failure/output summary: 36221563120 @`11afc06a` —
ENVIRONMENT_VALUE_MALFORMED (gate-label enum missing
COMPATIBILITY/DEV_LANE/REVIEW_MUTATION) + SESSION_WORKTREE_MISSING on fresh
checkouts (classification was CI|CLEAN only) → `760e90fc`; 36227213833
@`760e90fc` — storageState:503 real-browser fixture on the browser-less
runner (the campaign stops at the first failure, masking devLogin's three
page tests) → `988834e1`; 36231098989 @`988834e1` — devLoginSecurity:28/46/66
same root cause → `58bf06f2`; 36233319116 @`58bf06f2` — campaign exit=1 with
0 counted failures: the per-lane TMPDIR isolation had split the shared
port-lease authority (EADDRINUSE on 18987 across concurrent shards) and the
nested temp path overflowed Chromium's 107-byte sun_path
(process_singleton_posix "Socket path too long") → `736e0e09` (shared
NIGHTWATCH_PROXY_LEASE_DIR + short `nw-synth-` prefix + two regression pins);
36237628855 @`736e0e09` — TOPOLOGY envelope spawns ENOENT because the runner
has no bwrap (the group had never run green in CI) → `aa78a014` (X-02
degraded envelope mode; direct observation with declared BWRAP_UNAVAILABLE
non-exercises, recorded in the receipt as `envelope:
BWRAP_UNAVAILABLE_DEGRADED`). Never amended; five repair commits total.

Command: `gh run watch 36244721098` (OD-3, M3 closeout docs head)
Result: PASS — `completed / success`
When: 2026-09-26
Relevant failure/output summary: gitHead `78b23520` (the closeout docs
commits on top of `aa78a014`); CI green holds at the closeout head. This
entry is committed with the closeout record and pushed together with the
first M4 checkpoint — no push cycle spent on a one-line ledger entry.

Command: `npm run gate:dev` + `npm run gate:milestone` (M4 close-out, post-reconcile)
Result: PASS (both)
When: 2026-09-26
Relevant failure/output summary: at `137207b1` — affected-shards 5520/0 in
both lanes (selected 395) and every other step exit=0. The M4 repairs that got
there: a first pass with 46 failures — 42 in `agent-state.test.ts` from
synthetic roots lacking `config/ci-block-record.v1.json` (now a
`CI_BLOCK_RECORD_UNAVAILABLE` warning while invalid/stale records stay errors)
and 4 in `plannerHandoff.test.ts` whose fixture copied `bin/agent-state.mjs`
without its `bin/lib/ci-block-record.mjs` import target. Canonical was
formatter-/autofix-churned by pi-lens during the window and restored
path-scoped before every gate run.

Command: `node bin/nightwatch-session.mjs reconcile --expect-session sess-0734f2070d08`
Result: SESSION_RECONCILED — merged origin/main=946b52c4 (merge `73fe4015`)
When: 2026-09-26
Relevant failure/output summary: the owner's README replacement emptied
`README.md` and failed CI run 36254110908 (completed/failure, 52s). After the
merge `hardening:check` failed `STATUS_WORD README.md must carry the
ledger-governed measured-status block`, so the README bytes from the last
green head were restored as their own commit (`137207b1`) and hardening:check
returned PASS before the gate pair.

Command: `node bin/nightwatch-session.mjs integrate --expect-session sess-0734f2070d08 --expect-head 137207b176c36d7125aeb91c533dd1be57089dce`
Result: SESSION_INTEGRATED — origin/main=137207b176c36d7125aeb91c533dd1be57089dce
When: 2026-09-26
Relevant failure/output summary: fast-forward only (the first attempt
correctly refused with SESSION_INTEGRATION_NOT_FAST_FORWARD while origin/main
carried 946b52c4); canonical was fast-forwarded to the integrated head
afterwards and `workspace:check` holds.

Command: `gh run watch 36292162386 --exit-status` (OD-3 exact-head CI observation)
Result: PASS — `completed / success`, gate `finalResult: PASS`
When: 2026-09-27 (run 03:41:57Z → 03:55:46Z, gate 816982ms)
Relevant failure/output summary: gitHead `137207b176c36d7125aeb91c533dd1be57089dce`;
node v22.23.2 / npm 10.9.8; environmentClass CI; receipt
`receipt:sha256:60c13bcf4fe5f97f75bf1326`; all 15 required groups PASS —
SEMANTIC_COMPATIBILITY 2160 total / 2146 passed / 14 skipped / 0 failed,
SYNTHETIC_CAMPAIGN 1951 / 1907 / 44 skipped / 0 failed, OWNER_PROVENANCE 91
passed, UI_CONTROL_CENTER 7 passed, TOPOLOGY PASS (the runner has no bwrap and
uses the X-02 degraded envelope). Exact-head CI is green at the M4 head; the
prior head `946b52c4` had failed (36254110908) on the emptied README.

Command: focused suites for M5 6.1-6.3 (`tsc --noEmit`, the two new suites, the
campaign, admission, store and schema suites, `hardening:check`)
Result: PASS
When: 2026-09-27
Relevant failure/output summary: `tests/unit/agentFindingRecord.test.ts` 7/7
and `tests/unit/agentFindingPersistence.test.ts` 6/6 pass; the changed-admission
suites (`currentSourceFindingAdmission`, `realLocalCampaignPath`,
`campaignEndurance`, `localCampaign*`, `campaignStrategyMemory`) 135 passed
with the only two failures being the new schema families, fixed by declaring
`nightwatch.agent-finding-record` in `src/core/schemaLifecycle/declarations.ts`
and dropping the unused store version literal (`schema-lifecycle check` then
PASS: discovered 420 / families 397 / persisted 109); `reviewStoreHardening`
(the mutation proof of the new
`PRIVATE_ARTIFACT_DIRECTORIES = ['agent-findings']` pin) and both new suites
37/37 after the declaration. Committed as `9a044b49`.

Command: `npm run gate:dev` + `npm run gate:milestone` (M5 close-out)
Result: PASS (both)
When: 2026-09-27
Relevant failure/output summary: at the M5 closeout head — affected-shards
5585/0 in both lanes (selected 411) and every other step exit=0. The repair
chain that got there: the campaign manifest's file-count pins (106 → 107) and
the shard-weight table entry for the new hunt suite; the checkpoint attribution
serialized as a LIST because `SECRET_ECHO` is a legitimate failure-class NAME
that the checkpoint secret screen refuses as a credential-shaped KEY; the
secret-smuggling and print-salvage expectations updated for the permanent
`SECRET_ECHO` class and for the removal of fabricated grounding; the atlas
block-class expectations and the writer-census count updated for
`ADAPTER_UNAVAILABLE` and the receipt writer; and the execution class declared
for all 16 new suites.

Command: `gh run watch 36302111703 --exit-status` (OD-3 exact-head CI observation, M5)
Result: PASS — `completed / success`, gate `finalResult: PASS`
When: 2026-09-27 (run 07:06:59Z → 07:18:10Z)
Relevant failure/output summary: gitHead `0503d34774481e495bfef5067f44b07130ad5833`
(the M5 closeout head); gate receipt `receipt:sha256:ad687c70156dfc3d6717d953`;
every job step green, including `Execute authoritative quality gate`. M5 is
therefore validated end to end: focused suites, the gate pair at 5585/0 and
exact-head CI green.

Command: focused M5 suites (16 new suites + the affected campaign, admission,
store, provider and schema cones)
Result: PASS
When: 2026-09-27
Relevant failure/output summary: `agentFindingRecord` 7/7,
`agentFindingPersistence` 6/6, `reasonerIdentityBinding` 4/4,
`campaignBudgetConservation` 2/2, `providerAttribution` 3/3,
`failureCeilingsAndBackoff` 7/7, `agentDispatcherForwarding` 2/2,
`campaignSignalPause` 3/3, `printAdapterLifecycle` 5/5,
`reproductionGitMaterialization` 4/4, `environmentSignatureRefusal` 3/3,
`productRunReceipt` 3/3, `findingsSurfaces` 3/3,
`adapterUnavailableAndDefaults` 4/4, `boundedOperatorLaunch` 3/3 and
`syntheticHuntSuite` 5/5; the owner-local reproduction cones 71/71 and 96/96;
`schema-lifecycle check` PASS with the three new families declared.

Command: `npm run gate:dev` + `npm run gate:milestone` (M6 close-out)
Result: PASS (both)
When: 2026-09-27
Relevant failure/output summary: affected-shards 5625/0 in both lanes
(selected 420) with every other step exit=0. The repair chain: the bounded
per-invocation argv cap was raised from 400 to 512 (`MAX_FILES_PER_INVOCATION`)
because the tracked universe legitimately grew past the old cap and a
one-shard plan was refused; the rule-quantifier pins moved 88→89 rules and
65→66 TOTALITY rules for `checkSiblingRootResolution`; the paired-baseline
brief expectation now reads the truthful `NO ADMITTED REPRODUCIBLE PRODUCT
ANOMALIES` headline (the baseline's protocol dossiers are UNRESOLVED under the
derived readiness); and the UI test file is owned by the UI lane, not the
execution-class registry (whose discovery covers `tests/**` and
`scenarios/**` only).

Command: UI and browser lane for the new view (7.11)
Result: PASS
When: 2026-09-27
Relevant failure/output summary: `control-center:ui:typecheck` clean;
`control-center:ui:test` 105/105 with the view-DOM baseline INTENTIONALLY
regenerated (`NIGHTWATCH_UPDATE_VIEW_DOM_BASELINE=1`) for the added
navigation entry and view; `control-center:ui:browser` 9/9 including the new
Agent Campaigns qualification and its totality-checked navigation set.

Command: `gh run watch 36310500932 --exit-status` (OD-3 exact-head CI observation, M6)
Result: PASS — `completed / success`, gate `finalResult: PASS`
When: 2026-09-27
Relevant failure/output summary: gitHead `ca417d0f4c5920641c1f5a584136bccb80c6fb31`
(the M6 closeout head); every job step green. The PRIOR push (`67e403b7`) failed
CI in run 36304718720 with exactly one failed location —
`tests/unit/semanticCampaign.test.ts:447:EXPECT_MATCH`, the paired-baseline
headline expectation that the derived dossier readiness (7.1) legitimately
changed — and that failure was repaired forward in this head, which CI then
confirmed green. M6 is validated end to end: focused suites, the UI and browser
lanes, the gate pair at 5625/0 and exact-head CI green.

## Decisions Made During This Task

- 2026-09-25 — Adopt the released canonical MAINTENANCE record for this task
  and release it inside P0, staging the continuity record transiently in
  canonical because `release` binds continuity against
  `.agent/ACTIVE_TASK.md` + `.agent/tasks/<id>/STATE.md` bytes (measured
  `SESSION_CONTINUITY_MISMATCH` otherwise; authority:
  `bin/lib/session-authority.mjs admitContinuity`, commit `b0f9b1f2`).
  Consequence: canonical ended P0 clean with the released record naming this
  task; the full continuity is committed in this M1 bootstrap checkpoint.
- 2026-09-25 — `PROJECT_VERDICT_EFFECT: PRESERVE` (D-98 semantics): the
  project state projects `OPERATIONALLY_ACCEPTED`, which an IN_PROGRESS task
  may preserve only with PRESERVE; the D-129 terminal verdict is claimed only
  at S.

## Discoveries

- P0 pre-flight reproduced the audited baseline exactly; one stale figure in
  the audit's live-truth table (`status:local sees 75`; measured 188 open
  items across 5 campaigns) is corrected in audit.md's drift record.
- `release` continuity admission makes the literal P0 ordering require the
  transient activation staging described above; tasks.md 1.4's two hard
  requirements (released claim, clean canonical) are both satisfied by it.
- `agent:check` requires the full STATE heading set (including
  `## Decisions Made During This Task`, `## Discoveries`, `## Blockers`,
  `## Deferred / Follow-Up`, `## Resume Recipe`, `## Completion Snapshot`) and
  the routing checker reads every `session/...` token in ACTIVE_TASK as a
  worktree reference, so slash-joined command lists must not look like
  `session/...` paths.

## Blockers

- RESOLVED 2026-09-28 (RESUME_PROMPT): the Phase 0 canonical-dirty blocker.
  The owner dispositioned the 16 formatter-rewritten files as
  behaviour-neutral disposable output (AST-verified against `df0a6d35`;
  only `let minedById`→`const` and one redundant paren pair were non-layout)
  and authorized the restore. The harness formatter/autofix (pi-lens
  post-write pipeline: deferred format + biome autofix) is now disabled at
  global and project scope outside the repositories; canonical was restored
  with the authorized `git checkout -- <the 16 files>` command and
  `workspace:check` PASS (`canonicalSafe=true`, clean tree at `df0a6d35`).
  The pre-existing lint findings those rewrites had autofixed
  (`loadTypeScriptModule` unused in `ai-local-canary`/`auth-configure`,
  `sibling` unused in `w11-historical-arm`) are fixed forward in the session
  worktree (in the 10.2 migration and this checkpoint), not in canonical.
  Corrections task 6.1 (repo `biome.json` formatter-off + `.editorconfig`)
  lands first in the child campaign so future formatter runs are no-ops.

## Safety Events

No Alphaus environment, database, cloud, credential, or external publication
contact; no sibling repository mutation; no force push or history rewrite;
all testing local/synthetic. External contact is OD-3 only: `git fetch`
(reads), C-00 fast-forward pushes of validated checkpoints to `origin/main`
(heads `11afc06a`, `760e90fc`, `988834e1`, `58bf06f2`, `736e0e09`,
`aa78a014`), and `gh` CI observations of the six matching hardening runs
(36221563120, 36227213833, 36231098989, 36233319116, 36237628855,
36243034942 — five failed, the last succeeded). The authorized npm registry
advisory query (task 15.4) has not been run yet.

## Deferred / Follow-Up

- T2-GATE contained-DEV redesigns (NW-AUD-016 full, 025 full, 026, 037, 038):
  quarantined behind the DEV-lane precondition registry (M8).
- TF external prerequisites (production track C-12/C-13/C-14/P4, DEV storage
  re-capture, ripple-api re-admission, owner-gated legacy migration): owner
  actions with revisit triggers, recorded per OD-1.

## Resume Recipe

Resume from this file: read `.agent/ACTIVE_TASK.md`, then the change's
`tasks.md` (phases 1-15) and `audit.md` dispositions, reconcile against
`git status` and the session record, run the smallest decisive validation,
and continue the Exact Next Action. All work happens in the session worktree
named in the routing block; integration is fast-forward only.

## Completion Snapshot

Not complete. Terminal snapshot is written at M14: all 228 census items
dispositioned (OD-1), `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 with CI
`EXECUTED_PASS` at S (OD-2), operator proofs recorded, ledger closed, and a
`main`-only clean topology equal to `origin/main`.
