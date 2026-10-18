# Task State

## Identity

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Status: IN_PROGRESS
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3,4,5,6,7,8,9,10,11,12,13,14
TASK_GROUP_NEXT: 15
TASK_NEXT_ID: 15.4
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 94adf9db70565630e5b636ab32065c995ac81c1b
Last substantive checkpoint SHA: 94adf9db70565630e5b636ab32065c995ac81c1b
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-10-15 — the S-bound certification evidence at
`94adf9db70565630e5b636ab32065c995ac81c1b` is produced, published and bound
(25 tracked receipts): the effective evaluator reports 15/16 MET with only
`autonomous-yield-proof` UNMET (owner-gated), the fresh-clone comparison
agrees per condition, and `72dc5666` records the tracked authoritative-gate
receipt repair (D-175).
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 94adf9db70565630e5b636ab32065c995ac81c1b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 94adf9db70565630e5b636ab32065c995ac81c1b
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

M15 (group 15, task 15.4): the owner's 2026-10-15 "TERMINAL PRODUCT
COMPLETION / FINAL EXECUTION MISSION" instruction explicitly authorized
completing the D-173 certification-machinery repair (including the narrowly
necessary BM-078 replacement) and all subsequent Nightwatch-local validation,
receipt production, evidence binding and governed GitHub integration needed
for certification. State of the four defects of the previous instruction:

- **DEFECT A / D-172 — RESOLVED (S2, `f064fa0d`).** Staleness is computed for
  a PROVEN lane ONLY (`bin/lib/validation-lane-state.mjs`).
- **DEFECT B / D-173 — RESOLVED HERE (D-174, pending S3 gates).** The COMMAND
  producer's same-root `head === checkpoint` guard was structurally
  unsatisfiable (a commit cannot declare its own SHA as its anchor). The
  correction separates the OBSERVER ROOT from the MEASUREMENT ROOT: a command
  lane measures against an explicitly supplied exact checkout of the
  substantive checkpoint S, verified by the producer before anything executes
  (real canonicalized non-symlink repository top level; S resolves in both
  object databases; `HEAD == S` exactly; `HEAD^{tree} == S^{tree}` == the
  observer's `S^{tree}`; clean tracked tree; ignored inputs inside a closed
  disposable allowlist; observer on S or a documentary descendant whose
  `S..HEAD` range invalidates no certification; execution re-verified at
  spawn). The receipt keeps its schema: `sourceHead: S`, `observedAtHead: <observer>`. BM-078 is REISSUED against the corrected
  invariant and five new behavioural mutants cover the new guards (BM-118
  tree identity, BM-119 measurement cleanliness, BM-120 observer position,
  BM-121 ignored-input policy, BM-122 TOCTOU guard); census 117 -> 122, 274
  structural probes unchanged, BM-079/BM-080 untouched and still detected.
  24 focused regressions pass (`tests/unit/certifyEvidence.test.ts`),
  including the real-Git positive route: the documentary anchor-advance
  descendant produces a genuine PASS receipt for the six command lanes
  against the verified measurement root at S.
- **DEFECT C / DEFECT D** were downstream of B for the six command lanes and
  are re-measured by the S3 certification choreography rather than patched:
  their receipts, bindings and artifact checks are re-earned at S3.

Condition 3 (autonomous yield proof) stays UNMET and owner-gated. The provider
investigation of the same instruction is complete and read-only (verified
`opencode` binary digest, verified $0.00/$0.00 pricing for
`opencode-go/step-5-preview-free`, no Nightwatch monetary ceiling, no
provider-side hard dollar cap): SAFE TO REQUEST OWNER APPROVAL, conditional on
cost control, with a full proposed authorization drafted and NOT granted.

The campaign remains IN_PROGRESS / NOT_COMPLETE under D-129: 14/16 conditions
MET, `certificationRefused=true`, `advanceClaimed=false`.

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

Nothing is in flight. The S-bound certification choreography is COMPLETE at
`94adf9db70565630e5b636ab32065c995ac81c1b` (15/16 effective MET, every evidence
binding EXACT, canonical and fresh-clone agreement proven), and the
2026-10-18 provider-readiness session closed at the billing gate BEFORE any
inference (D-177): the Pi print-mode identity against
`open-design`/`deepseek-v4.1-flash` is verified and the run configuration is
prepared, but the metered prepaid-credit route has no owner-authorized
monetary or credit cap and its account-side controls (wallet balance,
allowance windows, auto-top-up) are not readable with the local model-plane
credentials. No grant was applied, no provider campaign ran, no spend
occurred.

## Exact Next Action

Task 15.4. STOPPED AT AN OWNER DECISION (D-177): approve the maximum credit
consumption for the single authorised run (computed worst case ≤ $0.09,
realistic ≈ $0.005–$0.01, under the fail-closed HOUR_1 ceilings) and confirm
the account-side controls (auto-top-up off / spend limit, or accept the wallet
as the hard stop). On that approval, in order: apply the exact `parent-12.4`
grant (`printCliDigest sha256:da0c6a49…5cfbb`, provider `open-design`, model
`deepseek-v4.1-flash`) as the sole substantive change of a new checkpoint S5;
run `gate:milestone` and `prepush` at S5; integrate through C-00 and observe
exact-S5 GitHub CI; re-earn every checkpoint-bound condition at S5 (six
COMMAND lanes through the guarded measurement root, gate/clean/topology/UI
imports, OBSERVE_CI, values-only binding) to 15/16; then execute exactly one
PRINT_CLI_PROVIDER campaign with the prepared configuration (D-177) from a
clean checkout at S5; and only if its receipt qualifies (exact identity,
`COMPLETED_SUCCESSFULLY`, ≥1 completed provider call and case, clean leak
scan) bind condition #3 and apply the D-129 advance to 16/16.

Task 15.3's owner boundaries are unchanged, each item an explicit owner
decision: (1) the `owner-manual` lane stays UNAVAILABLE_CAPABILITY with the
owner-approved revisit date 2026-11-14 (DECISION B of 2026-10-15); its
executable `lanes:manual` route would need DEV authentication plus a separate
one-shot authorization. (2) Condition 3 needs a fresh, separately authorized
paid provider campaign under `config/yield-run-authorization.v1.json`; the
existing GRANTED record belongs to historical parent task 12.3 and authorizes
nothing here. (3) Repository visibility (PUBLIC) and the eventual campaign
archive are owner/admin actions. The D-173 extension is authorized and
implemented (D-174) and its S-bound evidence is earned; the remaining local
work is gated only on the D-177 credit decision.

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
| `bin/lib/certify-producers.mjs` + `.d.mts`, `bin/certify-evidence.mjs` | D-174 guarded measurement root (observer/measurement separation, verified exact-checkpoint execution) | updated this session (pending S3) |
| `config/hardening-rule-probes.v1.json` | BM-078 reissue + BM-118..122, requirement tags (census 117 -> 122) | updated this session (pending S3) |
| `tests/unit/certifyEvidence.test.ts` | 24 regressions: corrected invariant + adversarial set | updated this session (pending S3) |
| `bin/lib/certify-producers.mjs`, `tests/unit/certifyEvidence.test.ts` (S4) | allowlist adds the declared `.tmp-nightwatch/` scratch root (defect found at S3 qualification) | repaired forward (this session) |
| `docs/DECISIONS.md`, `.agent/ACTIVE_TASK.md`, this file | D-174 record and continuity | updated this session (pending S3) |

## Validation Ledger
- 2026-10-18 — M15 PI/OPENDESIGN PROVIDER READINESS AND THE BILLING STOP
  (D-177, this session; Phases 1-4 of the Pi/open-design instruction). Verified
  read-only, with no inference: Pi 1.3.0 at `~/.pi/agent/bin/pi`
  (`sha256:da0c6a49…5cfbb`), launcher → `install/releases/1.3.0/…/.bin/pi` →
  `cli.js` (`sha256:e79626f2…6774`); provider `open-design` and model
  `deepseek-v4.1-flash` present in the global `~/.pi/agent/models.json`
  registration at `https://amr-link.open-design.ai/v1` (openai-completions);
  `pi auth check --no-refresh` = `ready` (api_key) and `pi --list-models`
  resolves the model under the print adapter's EXACT stripped child
  environment (`PATH`,`HOME`,`TMPDIR`,`LANG`) — registration and credentials
  survive isolation. The full candidate argv parses without inference, and
  print mode's contract (final assistant text on stdout, diagnostics on
  stderr, non-zero exit on error/abort) matches the adapter's single-document
  extraction. Focused regressions at HEAD: `reasonerPrint`, 
  `printAdapterLifecycle`, `reasonerIdentityBinding` = 25/25 PASS. Billing is
  route B (metered prepaid Design Plan allowance + wallet; catalog
  $0.015/$0.06/$0.00375/$0.015 per 1M tokens) with the account-side controls
  unreadable through the available model-plane `sk-amr-…` keys (no
  `vela_ctrl_…` control credential exists locally), so the instruction's own
  safeguard (`approval before a provider call when prepaid credits would be
  consumed without an authorized amount or hard cap`) STOPS the run before
  inference. Worst-case credit consumption ≤ $0.09. `project:check` = 15/16
  effective MET (only `autonomous-yield-proof` UNMET), `certificationRefused`,
  no advance; `config/yield-run-authorization.v1.json` untouched; no provider
  campaign, no spend. Disclosed: one non-inference wrong-model probe reached
  the gateway and was refused `404 model_not_found` with zero consumption.
- 2026-10-15 — M15 PROVIDER MODEL SWITCH VERIFIED (D-176, this session; Phases
  1-3 of the model-switch instruction). Selected `opencode/deepseek-v4.1-flash-free`
  (OpenCode Zen): AVAILABLE in the live authenticated registry (`opencode
  models`, 18 Zen models, no inference made), endpoint `https://opencode.ai/zen/v1`,
  verified $0/$0/cache-$0 across independent current sources (limited-time, no
  end date published). Backup `opencode/mimo-v2.6-flash-free` verified
  likewise. The paid twin `opencode/deepseek-v4.1-flash` is EXCLUDED. CLI
  digest re-verified `sha256:a233de331f4438336e604d8e006fdab18e5911c4ece16de8e502eb61394c3586`
  (v2.0.23). Account-side spend/fallback controls are NOT locally verifiable
  (UNKNOWN, fail closed). The real classifier proves
  `config/yield-run-authorization.v1.json` is SUBSTANTIVE (not path-approved,
  no guard class; the production classifier flags it as a violation), so any
  grant application requires a new substantive checkpoint S5 + exact-S5 CI +
  full evidence re-earning at S5; the file was NOT touched, preserving the
  15/16 state at `94adf9db`. The exact parent-12.4 authorization is proposed
  in D-176 and NOT granted; no provider request, no spend, no record change.
- 2026-10-15 — M15 S-CHOREOGRAPHY, EVIDENCE PRODUCTION AND 15/16 (this
  session, Phase F/G of the terminal mission). Checkpoint
  `94adf9db70565630e5b636ab32065c995ac81c1b` (S3 `6765aabc` = D-174 guarded
  measurement root; S4 `94adf9db` = the allowlist repair-forward), exact-head
  CI run `38756116063` (job `116494865791`, 10 steps) EXECUTED_PASS at S.
  Roles (D-175): observer = canonical checkout carrying the documentary
  maintenance commits (`685fd674` anchor+CI observation, `f70c8a12`/`b64db891`
  publish+bind, `f1b05f18`/`2b9f200a` the validation-lane-closure round,
  `72dc5666` the tracked-receipt repair); measurement root = this owned
  session worktree frozen at S.
  - Six COMMAND lanes genuinely measured at S through the verified
    measurement root: root-compile `receipt:sha256:48fdd79c94cd8fb89d059481`,
    bin-parse `1b886c6f2108d60fd66ba1f7`, structural-invariants
    `9a5fe1758d38f195d762f481`, full-regression `9aa28040d3beba93f978c225`,
    ui `691fd5dd2a21fc47af48cfd8`, browser-workflow `8e2c2255e8f46edf61f19508`.
    The first full-regression attempts were honestly NOT_MET (one fresh-clone
    attempt failed the live-topology self-check by design; one measurement
    attempt tripped test 14 on stale staging scratch) — both recorded, both
    diagnosed, neither hidden; `npm test` then measured 6228 passed / 0 failed
    / 56 skipped at S in the qualified root.
  - Thirteen condition receipts + dependency-advisory + exact-checkpoint-ci
    (run 38756116063) + validation-lane-closure (`561ae3467a260e4846889e12`)
    produced PASS; copy-throughs imported: authoritative-gate
    `receipt:sha256:a59af0c3893a911c8d7a1855` (clean-mode gate, 15/15 groups),
    clean-checkout `clean-receipt:sha256:1453cc0789dd4475b57bbb9e`,
    ui-error-taxonomy-rendering `receipt:sha256:e6678d98bae4eb2b060891f6`.
  - Effective evaluator at S: **15/16 MET / 1 UNMET** (only
    `autonomous-yield-proof`, owner-gated). Independent fresh clone at
    `72dc5666`: per-condition agreement, zero differences (the comparison
    caught the gitignore-masked missing tracked receipt first).
  - prepush PASS at every pushed head (`685fd674`, `2b9f200a`, `72dc5666`;
    affected-shards 6228/0 each). No provider call, no spend, no new grant,
    no visibility change, no Alphaus contact, no sibling write.
- 2026-10-15 — M15 S3 GATES, INTEGRATION AND EXACT-S3 CI; S4 REPAIR-FORWARD
  (this session). S3=`6765aabc7368a402c4c076ce1da2ff96409cbc5a` (the D-174
  repair): `npm run gate:milestone` PASS at S3 (13/13 steps; hardening-rules
  344s; mutation-harness 2431s with the full 122-mutant census DETECTED;
  affected-shards 6228 passed / 0 failed); `npm run prepush` PASS at the same
  HEAD (6228/0). Integrated through C-00 (`SESSION_INTEGRATED`), exact-head CI
  run `38732120873` (job `116412175619`, 10 steps) at `6765aabc` completed
  `success`. Measurement-side qualification at S3 in the qualified checkout
  outside the sibling root: `gate:topology` PASS (PROVEN/BUBBLEWRAP, certifying,
  receipt at `6765aabc`); `gate:clean-exec` (clean mode) PASS all fifteen
  groups (receipt `receipt:sha256:130473cb924284ac3a7b0c8d`); `gate:clean`
  PASS on retry (clean receipt `clean-receipt:sha256:ffc9cb478cc7eb1b29b315f9`,
  sourceHead `6765aabc`, siblingMode ABSENT); the F-18 UI-harness receipt
  recorded at `6765aabc` with all 16 harness tests PASS.
  - FLAKE IDENTIFIED (the previously unidentified intermittent): the
    SEMANTIC_COMPATIBILITY single failure is load/order-sensitive assertions
    over spawned probes — captured twice: `tests/unit/phase23QualityGate.test.ts:197
    ("the push-before tip is forwarded...") EXPECT_EQUAL` in the first clean
    gate, and `tests/unit/activeTaskRoutingBinding.test.ts:149 ("the current
    active task satisfies the rule it introduces") EXPECT_EQUAL` in a direct
    semantic-compat run. Both pass standalone; the second additionally fails
    DETERMINISTICALLY in a plain clone (a live-tree test that requires the
    declared session worktree to be registered, excused only in the CI/CLEAN
    gate contexts). Recorded as monitored test debt under the flake policy
    with both identities; the first clean-gate attempt (`clean-receipt:...8993e79e...`)
    is preserved as the failed attempt and the retry passed honestly.
  - DEFECT FOUND IN IMPLEMENTATION (repaired forward as S4): the guarded
    measurement root's ignored-input allowlist omitted the repository's
    DECLARED test-scratch root `.tmp-nightwatch/`
    (`SCRATCH_ROOT` in `src/core/workspace/ephemeralLayout.ts`), which the
    suites themselves write — the policy would have refused the product's own
    legitimate outputs. Fixed in `bin/lib/certify-producers.mjs`
    (ALLOWED_IGNORED_INPUTS) with the regression extended (test 22d now
    carries both `artifacts/` output and the declared scratch root and must
    still PASS); BM-121 still detects the refusal of undeclared ignored input.
  - No provider call, no spend, no new grant, no visibility change, no Alphaus
    contact, no sibling write in this window.
- 2026-10-15 — M15 D-173/D-174 GUARDED MEASUREMENT ROOT (this session, owner
  instruction "TERMINAL PRODUCT COMPLETION / FINAL EXECUTION MISSION",
  Decision A). Implementation and focused validation, all in the C-00 session
  worktree `nightwatch-final-product-complet-5054d550` (session
  `sess-158bca2d98a8`, base `907ebbcd`):
  - D-173 REPRODUCED first: `tests/unit/certifyEvidence.test.ts` 18/18 at
    `907ebbcd`, including the five R5-15/D-173 proofs (test 17: both the
    substantive checkout and the anchor-advance descendant refuse
    `CERTIFY_HEAD_NOT_CHECKPOINT` in a real synthetic Git repository).
  - `npm run typecheck` clean; `npm run typecheck:bin` PASS (conformance 77/77,
    mode BLOCKING, errors 0, exemptions 0, ceilings 0); `npm run
    hardening:check` PASS.
  - Focused regressions `tests/unit/certifyEvidence.test.ts` 24/24 (real CLI,
    real Git): positive execution (documentary descendant + verified
    measurement root -> PASS receipt with `sourceHead: S`, `observedAtHead: D`;
    all six command lanes reproducible; failing lane honest NOT_MET), wrong
    source identity (wrong SHA, different branch tip, foreign repository,
    untrusted path, symlinked root — all categorical refusals), dirty/tampered
    checkouts and overlays, the ignored-input policy in both directions,
    substantive-descendant refusal (`CERTIFY_CHECKPOINT_RANGE_INVALID`), the
    TOCTOU guard (`CERTIFY_MEASUREMENT_RACE`), forged tree identity, and PASS
    impossible without one real execution. `certificationEvidence` +
    `productionCompletionLaneState` + `validationClassification` 61/61.
  - Mutation census: BM-078 REISSUED (DETECTED_BY_TESTS), BM-118..122 added
    (each DETECTED_BY_TESTS), BM-079/BM-080 unchanged and re-verified
    DETECTED; registry now 122 mutants / 121 requirement tags, 274 structural
    probes unchanged. Full `hardening:mutants` run recorded at the S3 gates.
  - No provider call, no spend, no new grant, no visibility change, no Alphaus
    contact, no sibling write in this session.
- 2026-10-15 — M15 MILESTONE GATE AND PREPUSH AT S2=f064fa0d (this session).
  `npm run gate:milestone` at S2: 13 of 14 steps exit=0 — validation-universe,
  execution-classes, typecheck, hardening-check (PASS), agent-check (PASS),
  handoff-check (PASS), typecheck-bin (PASS, 77/77, 0 errors), hardening-rules
  (rules=96 probes=274 detected=274 undetected=0 restored=136
  statusUnchanged=true), mutation-harness (mutants=117 detected=117 survived=0
  errors=0), project-check (PASS), workspace-check (PASS), affected-tests
  (selected=472). `affected-shards` reported passed=6221 failed=1. A re-run of
  the same 472-file universe at the same HEAD returned result=PASS with totals
  planned=6278 passed=6222 failed=0 skipped=56 (shard-1 2957/0, shard-2
  2829/0, exclusive 436/0), and the immediately preceding `npm run prepush` at
  the same HEAD reported affected-shards passed=6222 failed=0. The single
  failure is therefore intermittent and NOT reproduced; the shard receipt
  records only counts and the lane does not persist the captured child output,
  so the specific location could not be identified and is NOT hidden — it is
  recorded here as an unidentified intermittent, consistent with the earlier
  FLAKE-002/D-147 watch item.
  `npm run prepush` at S2: PASS, every step exit=0, affected-shards passed=6222
  failed=0 in 985.6s.

- 2026-10-15 — M15 CERTIFICATION-MACHINERY REPAIR (this session, owner
  instruction "FINAL CERTIFICATION RECOVERY AND PROVIDER READINESS"). Newly
  authorized scope recorded in `.agent/ACTIVE_TASK.md` and here; the previous
  session's close-out explicitly covered documentary work only. Two defects
  resolved and proven, two proven blocked:
  - D-172 / DEFECT A: `reportLaneState` derives `staleEvidence` for a PROVEN
    lane ONLY (`bin/lib/validation-lane-state.mjs`). Measured effect on
    condition 1's raw detail: `STALE_EVIDENCE:owner-manual` is gone; seven
    `STALE_EVIDENCE:` findings remain (root-compile, bin-parse,
    structural-invariants, full-regression, clean-checkout, ui,
    browser-workflow) plus `evidence artifact config/validation-lane-state.v1.json
    absent at bound SHA 88e3c3fb52937ff303b0944cc22cfee624bf807e`.
  - D-173 / DEFECT B: the COMMAND producer's `head === checkpoint` guard is
    unsatisfiable in any real repository state; proven by a bounded sweep of the
    certify-evidence era (no commit self-declares its anchor), a measured
    non-convergence of anchor amending, and a real synthetic Git repository in
    which BOTH the substantive checkout and the anchor-advance descendant refuse
    with `CERTIFY_HEAD_NOT_CHECKPOINT`.
  Validation (all in the C-00 session worktree
  `nightwatch-final-product-complet-81c79680`, session `sess-7e4166ba3b14`,
  base `4ab808fc`): `npm run typecheck` clean; `npm run typecheck:bin` PASS
  (conformance 77/77, errors 0); `npm run hardening:check` PASS;
  `npm run hardening:rules` rules=96 probes=274 detected=274 undetected=0
  restored=136 statusUnchanged=true; `npm run hardening:mutants` mutants=117
  detected=117 survived=0 errors=0; focused suites
  `tests/unit/certifyEvidence.test.ts` 18/18,
  `tests/unit/productionCompletionLaneState.test.ts` 42/42 (13 new negative
  regressions), `tests/unit/validationClassification.test.ts` 8/8 — 68 passed /
  0 failed. The 12 MANUAL_OWNER harnesses remain unexecuted: the owner's
  DECISION B of 2026-10-15 re-affirms `UNAVAILABLE_CAPABILITY` with the
  approved revisit date 2026-11-14, an unchanged named unblock condition, and
  no claim that they ran. No provider call, no spend, no new grant, no
  visibility change and no Alphaus contact occurred.


- 2026-10-09 — M10 11.2/11.4/11.5 (this session). `docs/DECISIONS.md` appended
  with D-153 (OD-1..OD-4; the reserved "D-144" label was already issued, so the
  entry took the next unused number under Erratum E-1's rule), D-154 (the
  228-item census, tiering and disposition vocabulary), D-155 (the seven
  successor behaviours), D-156 (demotion semantics), D-157
  (`SESSION_DECLARED_ABSENT_EXPECTED`), D-158 (DEV-lane registry), D-159 (the
  documentation alignment and the M10 authorities), and D-160..D-167 (the eight
  owner-signed ACCEPTED_RESIDUAL entries: A-15, NW-AUD-027, NW-AUD-030,
  NW-AUD-031, NW-AUD-034, R2-15, R2-17, R2-26, with the NW-AUD-019 2.2 /
  programme 14.7 strike records and D-131 composition as the end state).
  `docs/SAFETY_MODEL.md` appended with §25-§32 and `docs/ARCHITECTURE.md` with
  the "Terminal campaign M9/M10 behaviour record". Task 11.5 removed the
  unconsumed `NIGHTWATCH_REASONER_PRINT` declaration from
  `config/environment-surface.v1.json` (73 variables remain) and corrected the
  `NIGHTWATCH_PRINT_CLI` purpose to the LIVE-provider wording. Commands and
  results: `node bin/hardening-check.mjs --family documentation` PASS (and the
  `--family environment-surface` lane PASS); `npm run agent:check` PASS (85
  legacy warnings, unchanged); `tests/unit/safety.test.ts` 37/37 (the new
  print-CLI environment census pins the three declared reads, the LIVE wording
  and the removed legacy name); `tests/unit/dotEnvLayerStrictness.test.ts` +
  `tests/unit/reasonerPrint.test.ts` 22/22; `tests/unit/projectState.test.ts`
  147/147. A full `npm run hardening:check` at this HEAD reports ONE error that
  is NOT this session's: `SCHEMA_UNDECLARED
  nightwatch.ui-lockfile-assessment.v1 (src/core/dependencyCurrency/uiLockfile.ts)`
  belongs to the concurrently-authored task 11.6 dependency work (untracked
  files `src/core/dependencyCurrency/{text,uiLockfile}.ts` plus a modified
  `config/dependency-currency.v1.json`), whose declaration is still being
  written; the schema-lifecycle rule is the only failing rule and it fails on
  that file, not on any of this session's.

- 2026-10-03 — review-5 close-out complete. Exact-head CI GREEN at the integrated close-out tip `dce05da1`
  (run 37123923541). The close-out session `sess-7c6bca226ba5` was released and removed (`SESSION_BRANCH_DELETED`,
  `SESSION_WORKTREE_REMOVED`); this single canonical maintenance commit (claim `sess-af4de9d82ead`, recorded in
  `.agent/CLAIM_JOURNAL.md`) records the run and returns the routing block to `SESSION WORKTREE: NONE` and
  `Branch: session/nightwatch-final-product-complet-f4139a72`. A `gate:clean` from the canonical checkout with no live session follows from the next session.
- 2026-10-03 — review-5 child CLOSED. Exact-head CI GREEN at the close-out tip `15a8d1e8` (run 37120079300)
  after Track A `4f4d7bfd` (37044532848) and Track B `5b2ea0f7` (37062959122). `gate:clean` PASS over the
  close-out tree `3362bdb0` (`clean-receipt:sha256:59f8982ee3178e3d6adca79c`). The child session was released and removed; a fresh session owned by this
  task made the archive and route-back commit. The repository is clean at `origin/main` with no live session
  other than the one that made it.
- 2026-10-02 — PARENT PAUSED (review-5 preconditions). Resume point M9 task
  10.4. Owner decision "both" recorded as D-152 (RESUME_PROMPT_5). Stale
  continuity prose synced (R5-17): ACTIVE_TASK `TASK_NEXT_ID` 10.2 → 10.4, the
  "no live session"/60-of-76 checkpoint prose, PLAN M9, and the
  `config/bin-typecheck.v1.json` note now point at the structured fields
  (totalCeiling 1412, 78 sources = 63 entry points + 15 bin/lib, any-budget 91).
  Canonical MAINTENANCE-claim record for the claim era so far
  (`sess-176d726bd6df`, role MAINTENANCE, created 2026-10-01T12:27:49Z, now
  RELEASED): the canonical-routed docs commits `67eb3098`, `e5ec64ca` and `46c8b674`
  (2026-10-01) are recorded by review-5 R5-11 as likely made without a live
  MAINTENANCE claim, and no claim journal exists to prove otherwise — recorded
  here as the A9.1 gaps; the append-only claim journal is review-5 task A9.1.

- 2026-10-01 — M9 10.2/10.3 COMPLETE, 10.4 BASELINE MEASURED (parent). Task
  10.2 finished at 76/76 conformance across eight resume batches (auth-configure,
  change-intelligence, hardening-check, review-mutation-campaign,
  w11-historical-arm, phase23-ci, phase23-predev, phase22-dev, phase23-dev,
  portfolio, nightwatch-intelligence, nightwatch-agent): 72 operator-CLI entry
  points + 4 library-retained, 0 pending. Every migration kept its own boundary
  (the DEV-lane guard first, ABSOLUTE/EXTERNAL output checks, the `--env*` and
  unknown-command refusals); four red CI runs from the batch were recorded and
  repaired forward (36867934911 BIN_TYPECHECK_CEILING, 36869760469
  SYNTHETIC_CAMPAIGN, 36889920975 SEMANTIC_COMPATIBILITY, 36912796291
  BIN_TYPECHECK_CEILING) and the top-level ceiling only ever turned DOWN
  (1450 → 1412). Task 10.3 registered `checkSharedOperatorParserStructure`
  (blocking, probe family HC-246..HC-250). `gate:dev` and `gate:milestone` PASS
  at 5865/0; `hardening:rules` 94 rules / 248 probes / 248 DETECTED. Task 10.4
  is NOT STARTED and its measured baseline is recorded: 77 non-conforming bins
  carry 1412 diagnostics, of which the safety-critical first batch is
  `project-state-check.mjs` (132), `nightwatch-session.mjs` (101),
  `workspace-integrity.mjs` (94), `nightwatch-hygiene.mjs` (50),
  `quality-gate.mjs` (27) and `evidence-retention.mjs` (27) — 431 diagnostics.
  A trial annotation pass over `project-state-check.mjs` was measured and
  REVERTED: block-level JSDoc on 23 signatures plus 16 inline arrows reached 128,
  but the inline `String()`/`Number()` wrappers it needed produced NEW
  TS2345 mismatches, so a half-annotated file with imprecise types is a net
  regression in code quality and was discarded rather than committed. The batch
  rule therefore stands: annotate each file to ZERO with accurate types (not
  stringifying wrappers), lower that file's ceiling and the total, and run the
  gate plus the probe campaign after each batch.
- 2026-10-01 — M9 10.2 RESUME BATCH 8 (parent). `nightwatch-intelligence`
  migrated: nineteen subcommands, `--json`/`--repo`/`--surface`/`--actionable`/
  `--irreducible` and the optional positional id. The unknown-command refusal
  and the documented "never accept environment execution" refusal (Phase 25
  boundary, exit 2, empty stdout, no leak) are both preserved and now share
  the parser. `typecheck:bin` PASS unchanged at 1413 (no diagnostics added);
  focused intelligence/CLI suites green. Registry counts 71/4/1. Exact-head CI
  GREEN at run **36892137774** on `92b5907d` (after repairing red run
  36889920975).
- 2026-10-01 — M9 10.2 RESUME BATCH 7 (parent). `portfolio` migrated: seven
  read-only subcommands plus the three real options (`--input`, `--previous`,
  `--current`); `--compact` was a comment only and is deliberately NOT declared.
  Every subcommand re-exercised; `compare-plan` still refuses without both
  manifests. Diagnostics 21 → 20; ceilings lowered to 1413. Registry counts
  70/4/2. Exact-head CI GREEN at run **36887411764** on `9b956e71`.
- 2026-10-01 — M9 10.2 RESUME BATCH 6 (parent). `phase23-dev` migrated — the
  last own-parser DEV launcher now declares the shared contract AFTER the
  DEV-lane guard; the DEV-launcher rule's own-parser map is emptied and its two
  own-parser probes retired. Diagnostics 48 → 43; ceilings lowered (phase23-dev
  43, total 1414); `hardening:rules` 243/243 after the retirement. Registry
  counts 69/4/3. Exact-head CI GREEN at run **36882845810** on `163137a3`.
- 2026-10-01 — M9 10.2 RESUME BATCH 5 (parent). `phase22-dev` migrated:
  its five subcommands plus the full option set are declared, and the shared
  parser replaces the permissive key/value reader so an unknown option exits 2.
  Diagnostics dropped 36 → 28; ceilings lowered (phase22-dev 28, total 1419).
  Registry counts 68/4/4; focused suites 46/46; `hardening:check` PASS;
  `typecheck` clean; `typecheck:bin` PASS at 1419. Exact-head CI GREEN at run
  **36879555162** on `86973c5d`.
- 2026-10-01 — M9 10.2 RESUME BATCH 4 (parent). `phase23-ci` and
  `phase23-predev` migrated (subcommand + bounded options, both keeping their
  own ABSOLUTE/EXTERNAL output boundary). Their bin diagnostics dropped, so the
  three ceilings were LOWERED (phase23-ci 49 → 37, phase23-predev 13 → 6,
  total 1446 → 1427). `phase23-ci observe --run-id=36875579501` re-exercised
  against the live run. Registry counts 67/4/5; focused suites 62/62;
  `hardening:check` PASS; `typecheck` clean; `typecheck:bin` PASS at 1427.
- 2026-10-01 — M9 10.2 BATCH 3 CI CHAIN. Two red exact-head runs were
  recorded and repaired forward, both inside this campaign's scope and both
  now green: run **36867934911** at `ae1ff3a6` (BIN_TYPECHECK_CEILING — the
  four migrated bins introduced bin diagnostics, because `cli.stop` does not
  narrow the `OperatorCliParseResult` union; repaired by narrowing on
  `cli.ok !== true || cli.stop === true` and typing the mutation-campaign
  entry parameter, with `typecheck:bin` PASS at 1446 and every ceiling
  unchanged) and run **36869760469** at `011c408b` (SYNTHETIC_CAMPAIGN — two
  tests pinned the live `blockClass` to `EXECUTED_PASS` and so failed on the
  honest promotion of the red run; repaired by asserting the newest-observation
  property instead). Exact-head CI is GREEN at run **36875579501** on
  `f5c5c8da`; the ci-block-record top level records it, and every run is in the
  record's history.
- 2026-10-01 — M9 10.2 RESUME BATCH 3 (parent). Four bins migrated to the
  shared operator-CLI contract: `change-intelligence` (no flags),
  `hardening-check` (six modes; the full run, `--only=…`, `--list-rules` and
  the 245-probe campaign re-verified through the shared parser),
  `review-mutation-campaign` (`--plan`) and `w11-historical-arm` (`--case`,
  `--out`). Registry counts 65/4/7. Focused: `operatorCliSurface` +
  `cliImplementationContract` 46/46; `hardening:check` PASS; `typecheck` clean;
  `hardening:rules` 245/245.
- 2026-10-01 — M9 10.2 RESUME BATCH 2 (parent). `bin/auth-configure.mjs`
  migrated to the shared operator-CLI contract: the metadata declares no flags
  and no positionals (no argument may carry or name a credential), `--help` and
  `--print-metadata` answer through the shared parser without prompting, an
  unknown option exits 2 with `CLI_UNKNOWN_ARGUMENT`, and the credential path
  is unchanged (hidden terminal input only). Registry counts 61/4/11.
  Focused: `operatorCliSurface` + `cliImplementationContract` +
  `devCredentialProvider` green; `typecheck` and `typecheck:bin` PASS with the
  ratchet unchanged (1446).
- 2026-10-01 — REVIEW-4 CHILD CLOSE-OUT OBSERVED. The canonical close-out
  commit `e5ec64ca827de8dae8c3384281c95de8081ba3d6` carries exact-head CI run
  **36859209949** GREEN (15/15 groups) — the record that the child's archive +
  the route back to this campaign are themselves CI-verified. The MAINTENANCE
  claim was released afterwards.
- 2026-10-01 — REVIEW-4 CHILD CLOSED. The bounded child campaign
  `nightwatch-final-completion-review4-v1` resolved all 24 review-4 findings and
  closed at `17391ae673644d67226de4fadea81d1f4b0b1912` (exact-head CI run
  **36855178941** GREEN, 15/15 groups; `npm test` 5865/0/33; `gate:local` 15/15
  receipt `receipt:sha256:2a04b2cfdc9591076a9f174d`; `gate:clean`
  `clean-receipt:sha256:c3c54d0540df6e7440fd7077` from canonical with no live
  session; harden:rules 93/245/245). Its change is archived
  (`openspec/changes/archive/2026-10-01-nightwatch-final-completion-review4-v1/`,
  spec published as `openspec/specs/review4-closure/`), its session branch is
  deleted, and this campaign is active again, canonical-routed, at the recorded
  resume point: M9 task 10.4 — annotate bins to zero diagnostics in
  safety-critical-first batches with the gate plus probe campaign after each
  batch; then 10.5 (flip the bin type-check to BLOCKING with 0 exemptions) and
  10.6, then M10-M14 and the 13-section final report.
  D-150 (OD-5/OD-6) and D-151 (proxy liveness) were added by the child.
- 2026-10-01 — PARENT PAUSED (review-4 preconditions). Exact-head CI run
  **36830613569** at `aea15b47` is GREEN (15/15 groups) — the continuity-sync
  commit that recorded resume batch 1 and the stale-prose repairs. The parent
  session `sess-83d720703401` (worktree
  `nightwatch-final-product-complet-e3ce743d`) was then released and removed
  with `--delete-branch`; ancestry was proven first (`HEAD == origin/main ==
  aea15b47`, 0 unique commits). Local validation before the push:
  hardening:check PASS, agent:check PASS (86 warnings), project:check PASS
  (exit 0, certificationRefused with 0/16 conditions — the OD-4 baseline), and
  session:check PASS with attention=0. The canonical checkout is clean at
  `aea15b47` and now holds a bounded MAINTENANCE claim only.
- 2026-10-01 — MERGED ORPHAN BRANCH DELETED (owner-visible cleanup, R4-22).
  `session/nightwatch-final-completion-corr-c45f0e9d` tip `b4d0c611`
  (`b4d0c611a7848df675390d47aa21f008d078cde6`) was proven an ancestor of
  `origin/main` with 0 unique commits (`git rev-list --count origin/main..
  <branch>` = 0) and then deleted. No unmerged work existed.

- 2026-10-01 — M9 10.2 RESUME BATCH 1. `bin/ai-local-canary.mjs` migrated to the
  shared operator-CLI contract (3 flags, group `validate`); registry 60/76
  declared, 12 pending; operatorCliSurface/cliImplementationContract/
  aiLocalCanary 56/56; typecheck, typecheck:bin and hardening:check PASS.
  Exact-head CI run **36808189880** at `07dd9506` is GREEN (15/15 groups).

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

- 2026-10-09 — The campaign's planning documents reserved the identifier "D-144"
  for the OD-1..OD-4 owner-decision entry, but D-144 was already issued (the
  `retries` → `failures` budget rename, cited by task 6.7). Under Erratum E-1's
  forward rule ("a new decision takes the next number above the highest already
  used, and never reuses one") the OD-1..OD-4 entry took the next unused number
  and is cited as **D-153**; the reserved label never reaches the document, no
  existing entry was touched, and the collision is recorded inside D-153 rather
  than added to the erratum (an erratum row is for two ISSUED decisions sharing
  a number, which this is not). DECISIONS D-154..D-167 followed in sequence.
- 2026-10-09 — The eight T3 ACCEPTED_RESIDUAL entries each carry the owner
  authority as OD-1..OD-4 via D-153 and the revisit trigger as either a named
  successor condition or the owner's residual-list confirmation (task 14.4);
  D-131 composition is recorded as the adopted END STATE for A-15 and R2-26, and
  NW-AUD-019 task 2.2 / production-completion-programme task 14.7 are struck
  with an explicit disposition record rather than deleted.
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

- RESOLVED (implementation pending gates) 2026-10-15: the D-173 command-lane
  checkpoint cycle. The guarded measurement root (D-174) is implemented and
  regression-proven; the S3 gates and the S3 certification choreography remain
  to be executed (Current Milestone / Exact Next Action).
- Current: owner-manual revisit 2026-10-11 is overdue; the owner-approved
  revisit date is 2026-11-14 (DECISION B of 2026-10-15) and no authenticated
  manual execution is authorized.
- Current: no qualifying autonomous paid proof exists at the new S. The
  existing proof is historical and another paid campaign is expressly
  forbidden here. Fresh owner authorization is required at the final S.
- Current: canonical gate:local cannot construct sibling-root absence from
  a checkout inside that root. Its failure and the historical local-gate
  anchor remain explicit; clean and exact-S CI validation are genuine.
- Visibility/Actions confirmation and eventual campaign archive are owner
  steps; PUBLIC visibility and the active change are preserved.

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

During this recovery: Alphaus DEV/NEXT/production contacts 0; database/cloud
operations 0; sibling writes 0; authentication state or credentials newly
persisted/published 0; new paid provider campaigns/calls 0; force pushes and
history rewrites 0. Public external activity was the authorized C-00
fast-forward push of S and GitHub read/observation. Earlier OD-3 provider and
registry actions remain historical at their recorded checkpoints.

A canonical release attempt was refused with SESSION_CONTINUITY_MISMATCH
because STATE still named the implementation branch. A subsequent adoption
briefly created a duplicate private task claim; workspace:check correctly
returned WORKSPACE_DUPLICATE_TASK_CLAIM. No tracked file changed under that
claim. The new claim (`sess-f669d89d85ad`) was released through C-00, restoring
workspace PASS, then the released worktree was removed through C-00. No
ownership record was edited or deleted by hand.

## Deferred / Follow-Up

- T2-GATE contained-DEV redesigns (NW-AUD-016 full, 025 full, 026, 037, 038):
  quarantined behind the DEV-lane precondition registry (M8).
- TF external prerequisites (production track C-12/C-13/C-14/P4, DEV storage
  re-capture, ripple-api re-admission, owner-gated legacy migration): owner
  actions with revisit triggers, recorded per OD-1.

## Resume Recipe

Read ACTIVE_TASK, SPEC, PLAN and this STATE; inspect Git and session:status.
Resume the Exact Next Action. This is the same campaign, on canonical main
for bounded documentary maintenance. A future source change needs an owned
C-00 worktree and invalidates old evidence; no paid or Alphaus action follows
from an old authorization line.

## Completion Snapshot

NOT_COMPLETE. The latest substantive checkpoint with genuine executed GitHub
CI PASS is recorded in the anchors above; no PROJECT_COMPLETE_AND_CI_CERTIFIED
advance is claimed. M15 is in progress while the D-173/D-174 repair earns its
S3 gates and the S3 certification evidence. The campaign is unarchived, the
repository is PUBLIC, and changing visibility remains owner/admin-only.
Live/final documentary HEADs are DISCOVER_FROM_GIT, never predicted.

## Certification session record (2026-10-11) — the two terminal blockers repaired

**Both blockers are fixed, integrated, and CI-verified. The campaign remains
NOT_COMPLETE for the reasons recorded in the 15.3-15.5 section below.**

1. `HANDOFF_TRUTH` -> `HANDOFF_ACTIVE_CONTINUITY_FAILED`. Root cause, verified
   against `gh` (run 38021486521 @ e582c8c3) and local (`npm run handoff:check`,
   `npm run agent:check`): `CLAIM_JOURNAL_REWRITTEN: claim sess-m14-terminal was
   edited (only an OPEN claim may be closed, keeping its identity and base)
   (commit fcd87fb6)`. At `7ddc6056` the canonical MAINTENANCE window
   `sess-m14-terminal` was closed with tip `c289a6cf`; at `fcd87fb6` it was edited
   again to extend the tip to `7ddc6056`, which the append-only rule forbids. The
   prior session recorded this as a prose `GAP:` line, which is truthful but not
   mechanically admitted, so `agent:check` failed and every derived group failed
   (five consecutive red runs: 38020728921, 38020856016, 38020925695,
   38021029083, 38021486521).
   **Repair** (D-168): the journal's ONE admissible escape is modelled on the
   repository's own `checkAppendOnlyArchives` declared-correction architecture. An
   already-closed claim window may be ADVANCED only where an appended
   `CORRECTION: <claimId> | oldLineSha256=<64-hex> | reason=<text>` line binds the
   EXACT sha256 of the replaced line, and only when the replacement preserves the
   claim's identity (claimId/role/task/created/base), moves its release time
   strictly forward and actually moves its tip. The escape is bounded three ways,
   each fail-closed: digest-bound, non-inert (`CLAIM_JOURNAL_CORRECTION_INERT`
   when the digest names no replaced line or a still-live line) and append-only
   (a declared correction can never be withdrawn). The historical `fcd87fb6`
   replacement is admitted by an appended declaration, not by rewriting it.
   Eighteen regression tests pin both directions.

2. `SYNTHETIC_CAMPAIGN` -> `skipPolicy.result: UNDECLARED_SKIP, skipped: 40,
   undeclared: 1` (run 38018300448 @ ed248033). The GitHub runner has no
   Bubblewrap and no sibling checkout, so the C-03 real-topology suites skip
   categorically with `LIVE_SOURCE_UNAVAILABLE`; exactly one identity was
   undeclared (`tests/unit/c03GrpcTopology.test.ts` / "C-03 - the real measured
   topology" / "every reachable registration is bound as a fact, and the unreached
   ones are named"). **Repair**: the identity is added to
   `canonicalSkipIdentities` in `config/semantic-compatibility.v1.json`, and a
   regression walks every skipping suite of that file and requires a declaration
   for every test title under the token a bwrap-less, sibling-absent runner
   actually produces, so a rename, split or new test now fails closed instead of
   silently widening the allowlist.

**Verified**: exact-head CI PASS at both integrated tips - run 38055518028 @
`effc2baa` and run 38065778727 @ `ddb80be4`, each 15/15 groups with
`skipPolicy.undeclared = 0` in both SEMANTIC_COMPATIBILITY (14 skipped) and
SYNTHETIC_CAMPAIGN (40 skipped). Receipts
`receipt:sha256:1493a385a1d44b07bff76c04` and
`receipt:sha256:f910f3b0f4ead87c75f230b5`.

Current progress figures, stated once at the end so no historical figure can be
read as the current claim: the operator-CLI surface is **77/77 conforming**
(`node bin/bin-typecheck.mjs` → `conformance=77/77 mode=BLOCKING errors=0
exemptions=0 ceilings=0` at HEAD `c931444a`, 2026-10-10) and the bin type-check
lane is BLOCKING at 0 diagnostics across all 143 tracked implementations.

---

- 2026-10-10 — M13 (group 14, tasks 14.1-14.6) COMPLETE, plus the deferred 9.5b
  RESOLVED. `npm run hardening:check` PASS; `npm run agent:check` PASS (35
  warnings); `node bin/validation-universe.mjs` PASS; `npx openspec validate
  --all --strict` PASS (80 passed, 0 failed) with exactly one active change
  remaining; `node bin/bin-typecheck.mjs` `conformance=77/77 mode=BLOCKING
  errors=0 exemptions=0 ceilings=0`; `npm run typecheck` exit 0. Sixty-six active
  changes were archived oldest-first (17 with spec sync, 49 with
  `--skip-specs`), 20 published capability specs gained a real Purpose, the
  task-ID ledger was reduced to this campaign's single entry, and the SPEC's
  `## Declared Deletions` block was extended with the 368 pre-move paths.
  `npm run project:check` reports exactly ONE finding,
  `PROJECT_STATE_CHECKOUT_DIRTY`: the working tree carries this task's
  uncommitted archive-and-documentation work, and this session is forbidden to
  commit (the commit is M14 15.2/15.5). On a clean tree with this same content
  the check exits 0: the release verdict is unchanged
  (`OPERATIONALLY_ACCEPTED`, certified `027367d9`, conditions met 0/16,
  `certificationRefused: true`, `advanceClaimed: false`, external track
  `EXTERNAL_PREREQUISITE_UNMET`). The live figures of record are in
  `docs/CURRENT_STATE.md`'s M13 14.5 append and in the README measured-status
  block.

## M14 terminal record (2026-10-10) — the one remaining blocker

**Verdict: NOT_COMPLETE.** Everything that is locally actionable has been done;
the campaign stops at one genuine, precisely-identified local defect that could
not be closed inside the budget that remained.

### What IS complete

- **M9 (group 10)** — 10.1-10.6 COMPLETE. The bin type-check lane is BLOCKING at
  **0 diagnostics across all 143 tracked `bin/**/*.mjs` implementations**, 77 of
  77 entry points conforming, 0 exemptions, 0 per-file ceilings and 0
  diagnostic-silencing widening annotations. The recorded 1402-diagnostic
  baseline was a FLOOR, not a measurement: `tsconfig.bin.json` used to include
  `bin/**/*.d.mts`, which made TypeScript drop each shadowed implementation from
  the program (53 implementations, 952 real diagnostics, never checked), and
  `runTsc` read an empty (clean) tsc output as a toolchain failure. Both are
  closed with a permanent regression suite
  (`tests/unit/binTypecheckLaneCompleteness.test.ts`).
- **M10 (group 11)** — 11.1-11.7 COMPLETE. Every locally actionable T3/T4 S-fix
  implemented with a regression (NW-AUD-005/007/009/011/032/033; D-15/D-16/D-17/
  D-20/X-11/A-16), the DECISIONS of record written (D-153..D-167), SAFETY_MODEL
  §25-§33 and the ARCHITECTURE M10 record appended, and the dependency
  assessment extended to the UI lockfile.
- **M11 (group 12)** — 12.1, 12.2, 12.4, 12.5 COMPLETE; 12.3 EXECUTED.
  The operator journey is proven command by command, the durable
  AgentFindingRecord is proven through the CLI and the live Control Center, the
  synthetic campaign passes 1983 tests with every skip declared, `gate:clean`
  passes sibling-absent with root and UI, and the authorized paid provider run
  executed for real against `mobingilabs/ouchan`.
- **M12 (group 13)** — COMPLETE. The adversarial completion audit exercised all
  fourteen canonical families and repaired four defects, each with a permanent
  regression: refusals delivered as uncaught throws in the DEV-lane guard (13
  launchers), the phase*-real argv validation (7 launchers),
  `nightwatch-agent status`, and the `.env` layer (3 launchers plus the Control
  Center).
- **M13 (group 14)** — COMPLETE. All 228 census items dispositioned (FIXED 153,
  SUPERSEDED 24, ACCEPTED_RESIDUAL 18, INVALID_STALE_CLAIM 16,
  EXTERNAL_PREREQUISITE 8, QUARANTINED 5, HISTORICAL_ONLY 4); the NW-AUD
  originals reconciled with SHA citations; the six BLOCKED successor children
  closed; 66 completed changes archived oldest-first with
  `openspec validate --all --strict` PASS (80/80) and exactly one active change
  remaining; the operator truth rendered from live evidence; and the repository
  visibility mismatch resolved against GitHub's authoritative answer (PUBLIC).

### The exact blocking requirement

**Exact-head CI at the final substantive SHA `199ca024` (run `38015082655`) failed
in ONE of the fifteen required groups.** GATE_DEFINITION, STATIC,
BIN_TYPECHECK_CEILING, HARDENING, HARDENING_PROBES, HANDOFF_TRUTH, PROJECT_TRUTH,
AGENT_CONTINUITY, SEMANTIC_COMPATIBILITY and OWNER_PROVENANCE all PASS, and the
group that failed reports `total: 1983, passed: 1943, skipped: 40, didNotRun: 0,
failed: 0` — no test failed. The failure is a **skip-identity accounting
failure**: `skipPolicy.result: UNDECLARED_SKIP, skipped: 40, undeclared: 1`, with
`deepContainmentLane: NOT_EXERCISED_BWRAP_UNAVAILABLE`.

The GitHub runner has no Bubblewrap binary, so the L6 deep-containment lane
declares its own non-exercise and 26 more tests skip there than on a host that
has it (40 versus 14 locally). Twenty-five of those identities are already in
the canonical skip-identity allowlist in `config/semantic-compatibility.v1.json`;
**exactly one is missing.** The lane is failing closed, correctly: an undeclared
skip is a validation gap and must never read as agreement.

To close it, on any host that CAN reproduce the bwrap-less path (the L6
capability probe reads the absolute candidates `/usr/bin/bwrap` and
`/bin/bwrap`, so a PATH mask does not reproduce it) run
`node bin/campaign-synthetic.mjs` under a masked or absent `/usr/bin/bwrap`,
read the `test-results/synthetic-*/skip-identity-report.json` it writes, add the
one missing identity with its reason token to `canonicalSkipIdentities` in
`config/semantic-compatibility.v1.json`, re-run `npm run prepush` and
`npm run gate:milestone`, create a new final substantive S, integrate it and
observe exact-head CI again. Then close 15.3-15.7.

This is NOT an external prerequisite and NOT a platform failure: the defect is
local, the fix is one allowlist entry, and the campaign stops here only because
the remaining budget ran out — not because the work is hard or out of scope.

### Autonomy counters

No Alphaus DEV/NEXT/production contact; no database or data-plane operation; no
sibling repository mutation (ouchan `565f00a8`, blueapi `691422e5` and
blue-sdk-go `8883ee3` were read-only observed before and after every proof run);
no external publication; no force push; no history rewrite. Authorized external
contact was OD-3 only: GitHub Actions read/observe, C-00 fast-forward pushes,
one bounded paid provider proof run (executed three times — the first two were
operator-invocation errors recorded as `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`,
the third is the real proof), and the one npm registry advisory query remains
unauthorized-unexecuted (task 15.4).

## CI recovery evidence (2026-10-13)

- Observed main/remote: `9fe141c726928469344d4e3b126ea898a8f4a52d`, clean.
- CI `38283888651` executed and failed at that head. Clean-clone reproduction
  fails `projectState.test.ts:2862`, subject `ui-error-taxonomy-rendering`:
  expected raw checkState not MET, actual MET. Effective state EVIDENCE_ABSENT,
  bound/resolved evidence SHA null, evidenceRelation null; 0/16 MET, certification
  refused. Range SUBSTANTIVE_DESCENDANT; binding HEAD_NOT_CHECKPOINT.
- The UI receipt is genuinely bound to `7871b463a03936016caaf88081c9221baccc60f0`,
  digest `receipt:sha256:158af3f91d2467dbf0b5d652`, verified. D-148 explicitly
  permits a receipt probe to report MET at S regardless of the measuring HEAD;
  a tree probe requires the checkpoint binding. The D3 assertion conflated them.
- All three lifecycle receipts added by `20dfa607` exist in its Git tree and
  current HEAD. Digests re-derived and subject/SHA/clean/PASS bindings VERIFIED:
  `0b4f2cdb` → `receipt:sha256:24f81d52f03a1506062767a2`,
  `7871b463` → `receipt:sha256:e4005284147a8ffdac4dc201`,
  `dbe3349e` → `receipt:sha256:61840bc7bfe429fa114c4b6c`.
- Existing canonical maintenance record was live to the session CLI; adoption
  refused SESSION_ALREADY_OWNED without effects. Its exact session was released
  through C-00, then a dedicated implementation worktree was started/claimed.
- Canonical versus fresh-clone raw/effective pairs are identical at the observed
  head. Root install in the clone used `npm ci --ignore-scripts --offline`.
- Safety: no Alphaus contact, sibling write, database/cloud operation, provider
  campaign, visibility mutation, archive or history rewrite.

### Recovery implementation validation

- Focused receipt, committed-measurement, certification-evidence and reachability
  suites: 31 passed, 0 failed. Typecheck exit 0; bin typecheck BLOCKING, 77/77,
  errors/exemptions/ceilings 0/0/0. Structural hardening PASS.
- Continuity initially caught three stale waypoint/progress statements; repaired
  the task number, group number and current PLAN conformance. Agent check PASS
  with 36 warnings (35 historical and the owner-manual revisit due).
- Mutation validation correctly refused BM-108's obsolete search literal before
  applying any mutant. Its operation now removes the committed-Git receipt read;
  the clean-clone receipt tests remain its behavioural detector. A new mutant
  broadens the ignore exception and is covered by Git's secret filename matrix.
- Full projectState and the required mutation/lane validations remain pending.

- Full projectState suite: 140 passed, 0 failed (3.1 minutes), including the
  repaired real-tree D3 assertion. DEV launcher effects suite: 42 passed,
  0 failed after strengthening the census to retain BM-001..BM-116 plus BM-117.
- The first mutation scratch baseline failed its old 116 census pin after the
  new mutant was added; no mutant ran. The live regression now requires all
  117 exact identities, retaining every prior mutant. Re-run the complete
  mutation harness through the milestone lane at the committed candidate S.
- Diff reviewed; whitespace check PASS. Added-line scan found no absolute home
  path, private key, bearer value, AWS access key or JWT. Only synthetic receipt
  and filename values enter tests; existing tracked receipts remain unchanged.
- Next: commit the scoped substantive candidate, execute milestone and prepush
  at that exact HEAD, repair forward on any failure, then C-00 integration.

- Candidate `057c79fa187e3f0de8bfdd5c38206af45984e491` is local only. The first
  milestone attempt correctly failed execution-class admission: the new clone
  regression exposes an artifacts-write signal, so releaseReceiptProbes needs
  PROCESS_ISOLATED_ONLY. Its declaration is strengthened from PARALLEL_SAFE;
  no test or guard is exempted. This is a substantive configuration correction
  and lands forward before integration. The final S is discovered from Git.

### Candidate S validation at efcf9d43 (not integrated)

- Candidate `efcf9d433f345d4bdff5c4fc24c0b4dd170a2f97` remained clean and
  session:status PASS, owned, no drift, base CURRENT. Nothing was pushed.
- Milestone: static/type/bin/continuity/handoff/workspace/project PASS;
  hardening probes PASS (274 detected), behavioural mutants PASS (117 detected,
  zero survivors). Affected 472-file regression FAILED: 6202 passed, 2 failed.
- Prepush: mandatory prefix checks PASS; affected regression FAILED identically,
  6202 passed, 2 failed. No failed checkpoint was integrated.
- Clean gate: install, static, bin, hardening, probes, handoff, project and agent
  PASS; SEMANTIC_COMPATIBILITY failed `projectState.test.ts:3115:EXPECT_EQUAL`,
  with 14 declared skips and 0 undeclared. It stopped before remaining groups.
- G18 collector fixture cloned the actual committed HEAD. The earlier pre-commit
  run cloned the old checker, explaining why it passed. The committed checker
  correctly prefers the verified tracked receipt of S over the injected stale
  host receipt. Repair the fixture by proving that preference, then removing
  only G18's tracked receipt in the owned synthetic Git fixture before asserting
  the unchanged local-only wrong-SHA rejection. No production exception changes.
- The second failure is eligibilityCensus's census-presence assertion: inventory
  availability was treated as equivalent to an admitted mechanically provable
  population. Capture the bounded categorical emission and repair its semantic
  discriminator while preserving determinism and all positive content assertions.
- Topology qualification at this candidate returned NOT_PROVEN/FAIL because
  its baseline and fresh-home lanes hit the census assertion. It is not used
  as certifying evidence.
- Resume: finish these two regression repairs, commit forward with a new genuine
  S, rerun required gates at the exact new HEAD, then integrate and observe CI.
  No documentary certification binding or CI advancement has been performed.

- Census reproduction (bounded categorical output only) returned exit 0,
  LOCAL_SOURCE_ONLY / NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT, inventory entries
  CURRENT/SOURCE_STALE/SOURCE_UNAVAILABLE, zero examined operations and zero
  proofs/candidates/eligible operations, note NO_MECHANICALLY_PROVABLE_SOURCE_SURFACE,
  no census, null portfolio/queue. Reading inventory is not admitting a proven
  operation population. The deterministic test now follows that explicit
  discriminator, keeps every absent-source and positive-population assertion,
  verifies stale/current identities, and requires zero proof counters. No
  source is re-admitted and no Alphaus repository is written or contacted.

- Repaired collector fixture suite: 2 passed, 0 failed, including the actual
  committed-checker G18 test. Repaired eligibility census suite: 4 passed,
  0 failed, including three fresh process byte-stability and zero-evidence
  refusal. Execution-class admission remains PASS with the stricter UI class.
- These fixture repairs are substantive test changes. Commit forward to a
  new S and repeat milestone/prepush/clean validation at that exact HEAD.

### CI recovery: bounded body-acquisition fixture (2026-10-13)

- At candidate `deb2ee0898c393d59b7748b92e8dd41ef3bc4592`, prepush
  PASS (472 selected files, 6204 passed / 0 failed), gate:clean PASS (all
  15 groups; semantic 2239 passed / 14 declared skips / 0 failed; synthetic
  1951 passed / 37 declared skips / 0 failed), and topology PROVEN/BUBBLEWRAP
  PASS. UI 105/105 and browser 9/9 PASS at that SHA. These are local results,
  and no GitHub execution at this unpushed SHA is claimed.
- Milestone prefixes PASS, including 274 structural probes and all 117
  behavioural mutants, then affected shards FAILED (6203 passed / 1 failed).
  The failing test is `tests/smoke/negative.smoke.ts`'s malformed-json
  assertion: the two fixture `/api/broken` responses were HTTP 200 with
  `bodyCapture: unavailable` / `BODY_READ_ACQUISITION_BOUND`. An unreadable
  body correctly yielded no malformed-json oracle. The isolated unchanged
  smoke rerun passed, confirming burst-dependent acquisition rather than a
  certification regression. No failed candidate was pushed.
- Repair only the synthetic smoke driver: wait for pending response handlers
  to drain, request `/api/broken` once locally, and await the actual oracle
  event before finalization. All original assertions and the production
  body-acquisition bound remain intact. Repeat this focused test, then commit
  a new substantive S and repeat the required checks at that exact SHA.
- Prior S receipts remain historical; they will not be rebound to the new S.
  No paid campaign, Alphaus contact, sibling write, force push or archive.
- Focused repair validation: negative smoke 8 consecutive runs PASS (21.6s);
  root typecheck, structural hardening, execution-class admission and
  agent:check PASS (36 existing warnings, including the owner-manual revisit).
  The source diff is only this synthetic driver plus the task waypoint; all
  original negative assertions survive, no tracked deletion or secret bytes.

### Exact-S CI recovery observation (2026-10-13)

- S `efbb277348a3d756036b2568ca02bb45a5a2018f`; real run `38382773612`, job `115247033554`,
  completed/success, observer EXECUTED_GREEN / EXACT_HEAD_AND_GATE_PASS;
  full original CI gate receipt VERIFIED, digest
  `receipt:sha256:42eeb5b21ca39e9774302861`, 15/15 groups PASS.
- Required source validation: milestone PASS (6204/0, 472 selected;
  hardening-rules 274/274, mutants 117/117), prepush PASS (6204/0), root
  typecheck and bin typecheck PASS (77/77 BLOCKING, zero exemptions/errors),
  UI 105/105, browser 9/9, gate:clean PASS in two independent clone runs.
- Canonical clean receipt VERIFIED `clean-receipt:sha256:da11731f54a463b23f56e7af`;
  inner clean gate digest `receipt:sha256:acf1d11860b879d6d3191a52`, all 15
  groups; clean before/after, dependency reuse false, no auth/finding state,
  sibling identities unchanged. Its liveSessionCount includes the canonical
  MAINTENANCE claim; linked implementation sessions were released.
- Canonical gate:local failed only at TOPOLOGY (UI NOT_RUN), and canonical
  standalone topology returned NOT_PROVEN: CHECKOUT_INSIDE_SIBLING_ROOT.
  The qualified independent checkout at S produced VERIFIED PROVEN/BUBBLEWRAP
  `topology-receipt:sha256:23fde630aa54ce855566be34`. No degraded or absent
  envelope is relabelled as certifying. A disposable local-gate attempt also
  failed HANDOFF_TARGET_BRANCH_MISMATCH; that failed receipt is not used.
- LAST_LOCALLY_VALIDATED_SHA remains the historical actual local-gate anchor;
  source validation and clean/CI validation at S are recorded separately.
- The three original lifecycle receipts reverified from Git trees at 20dfa607,
  9fe141c7 and S with identical digests and VERIFIED subject/SHA bindings.

### Documentary evidence binding and resumed authority (2026-10-13)

- The preceding process ended with 23 genuine S receipts committed at
  `56c681aaabcc95f4b50e3c093e5e7b47469e7857` and a values-only binding diff.
  Its stale canonical claim was explicitly adopted through C-00 as
  `sess-af150610aa5f`, preserving base S; session:status PASS, one checkout.
- All 24 prospective bound receipt bodies reverified by the production verifier.
  The genuine CI gate proof is also named `authoritative-gate.json`, which
  matches the preserved `auth*.json` exclusion. Stage only that exact verified,
  sanitized path explicitly; do not broaden the ignore exception. No auth state
  or secret becomes newly trackable. Original exclusions remain unchanged.
- Live GitHub re-observation confirms run 38382773612 completed/success at S.
  Temporary prior-process logs are unavailable; tracked verified receipts,
  task records and live Actions are the durable validation authorities.
- Next: commit the safe exact gate proof and values-only bindings, rederive
  the documentary range, compare all 16 states in a fresh independent clone,
  finish the report and run exact-HEAD prepush before the documentary push.

## HC-177 probe-fixture repair and S'-bound evidence (2026-10-13)

- **Defect reproduced.** At the documentary head `556b764e` the required
  HARDENING_PROBES group failed: `npm run hardening:rules` reported
  `[probe] checkReleaseEvidenceBindings UNDETECTED HC-177` (exit 1) because the
  probe's search literal named `"subject": "root-compile"` +
  `"evidenceSha": "88e3c3fb…"`, a pair the S evidence re-bind legitimately
  replaced. A plain literal update would rot again at the next re-certification,
  so the probe now declares an unevidenced PROVEN lane in
  `config/validation-lane-state.v1.json` — the same rule branch with stable
  literals. No rule, guard, bound or exemption changed.
- **S' = `70f4b8269eae0c08e4a28c22f87b82c4958bbb92`**, integrated alone through
  C-00 (`sess-b273f0dab1b4`, canonical MAINTENANCE window `sess-af150610aa5f`
  closed at `556b764e` first). Exact-head CI run `38461538853` (job
  `115517671966`) completed/success.
- **Validation at S'.** `gate:milestone` PASS (affected-shards 6204/0,
  hardening-rules 274/274, mutation-harness 117 detected / 0 survivors);
  `prepush` PASS (6204/0, selected 472); `gate:clean` PASS all 15 groups;
  a qualified clean-mode gate outside the sibling root PASSED all 15 groups with
  TOPOLOGY PROVEN and UI_CONTROL_CENTER PASS; browser lane 9/9; `openspec
  validate --all --strict` 80/80.
- **Evidence.** 18 subjects measured, published and bound at S' (`certify:evidence
  verify` → 18 valid / 0 invalid). `authoritative-gate.json` needed an explicit
  force-add: the defensive `auth*.json` rule matches it, so the receipt was on
  disk but untracked, which made a clean clone demote ten conditions to
  NOT_AT_CHECKPOINT. No ignore rule was changed.
- **Canonical vs fresh clone.** At `4ab156cd` both report 14/16 effective MET,
  identical evaluation digest `sha256:6997fa8ecb205a4a03…`, zero per-condition
  differences, same stale list `["validation-lane-closure"]`.
- **Remaining.** Condition 1 (`owner-manual` revisit 2026-10-11 passed; owner
  action required) and condition 3 (no qualifying paid provider campaign at S';
  a fresh owner authorization is required). No agent may refresh the owner
  approval or launch a paid run.

## Owner manual-validation disposition — implementation record (2026-10-14)

- **Owner decision (D-171, applied).** `owner-manual` stays
  `UNAVAILABLE_CAPABILITY`; its revisit date moves from the expired
  `2026-10-11` to `2026-11-14`; the owner accepts continued documented
  unavailability, does not claim the twelve checks passed, does not authorize
  their execution and does not authorize DEV authentication.
- **Classification.** The production classifier judges
  `config/validation-lane-state.v1.json` neither approved nor guarded, so the
  change is SUBSTANTIVE (`checkpointRoleViolations` on the commit returns that
  one path). The checkpoint therefore advanced and every subject's evidence was
  re-earned at it rather than rebound by text.
- **S = `efae50ce5516d0d919bb8c5a6463dbb51caf3dc8`**, integrated alone through
  C-00 (`sess-6e666451e658`). Exact-head CI run `38553902449` (job
  `115818175336`, 10 steps) completed/success.
- **Validation at S.** `gate:milestone` PASS (affected shards 6204/0, 274
  structural probes, 117 behavioural mutants, 0 survivors); `prepush` PASS
  (6204/0, 472 selected); `typecheck` clean; `typecheck:bin` PASS
  `77/77 BLOCKING` with 0 exemptions/errors/ceilings; `hardening:check` PASS;
  a qualified clean-mode gate outside the sibling root PASSED all fifteen
  groups (`TOPOLOGY` PROVEN, `UI_CONTROL_CENTER` PASS); browser lane 9/9;
  `openspec validate --all --strict` 80/80; the ten negative cases of the owner
  disposition were re-proved (expired date fails, missing unblock condition
  fails, class flip fails, false/tampered receipts fail, untracked receipts
  cannot certify, wrong-SHA evidence fails, non-documentary changes invalidate
  older measurements, the twelve harnesses remain unexecuted, 2026-11-14 is
  current today and 2026-11-15 makes it revisit-due again).
- **Evidence at S.** 17 tracked receipts verified (`certify:evidence verify`
  ok, 0 invalid), published and bound values-only: the thirteen MET condition
  receipts, the `dependency-advisory` and `exact-checkpoint-ci` lanes, the
  imported UI-harness and `authoritative-gate` receipts from the qualified
  clean-mode gate, and the accessibility certification receipt from the
  S-bound browser-lane record. `authoritative-gate.json` again needed an
  explicit stage because the defensive `auth*.json` rule matches it; no ignore
  rule changed.
- **Verdict.** `OPERATIONALLY_ACCEPTED`, 14/16 effective MET at S, all EXACT,
  `certificationRefused: true`, `advanceClaimed: false`, digest
  `sha256:a0b1b731796fd9bce613edb35ef76cf98bcb2570028f6fc86a015e163d0b4e8c`.
  Canonical and a fresh clone agree exactly (identical digest, zero
  per-condition differences).
- **Repair on the way.** The first two documentary pushes (`ee905117`,
  `c2800cad`) were red: `checkDocumentationFreshness` requires the
  CURRENT_STATE header date to cover the document's own last change, so the
  appended record made the header stale and the HARDENING group failed with
  every later group NOT_RUN. `36e5c7d4` bumps the header to 2026-10-14 and
  registers the replaced line as `CORR-M14-003` in
  `config/document-role-corrections.v1.json` (the same sanctioned pattern as
  CORR-M13-004). CI at `36e5c7d4` is green, all 15 groups PASS, receipt
  `receipt:sha256:f53c9cc286732f049b5a7247`.
- **Condition 1's exact remaining blocker.** `REVISIT_DUE:owner-manual` is
  gone, and condition 1 now reports only `STALE_EVIDENCE` for eight lanes
  (`root-compile`, `bin-parse`, `structural-invariants`, `full-regression`,
  `clean-checkout`, `ui`, `browser-workflow`, `owner-manual`) plus the
  condition-level note that `config/validation-lane-state.v1.json` is absent at
  its bound `88e3c3fb`. Two independent machinery limits cause it: a lane
  binding cannot be advanced without a verifying receipt (the values-only
  guard), and `owner-manual` is certifiable by no declared schema
  (`bin/lib/certification-subjects.mjs` route `NONE`, producer `UNAVAILABLE`),
  while the six COMMAND lanes can no longer be produced at a fresh checkpoint
  at all (`CERTIFY_HEAD_NOT_CHECKPOINT`: the producer requires
  `HEAD == certifiedCheckpointSha`, which needs the anchor to name the checked
  out commit). Resolving it needs an owner-authorized decision: either the
  executable `lanes:manual` route the archived spec requires, or a bounded
  change to the lane-evidence binding rules for non-PROVEN lanes.
- **Condition 3.** Still UNMET. A fresh paid provider-run authorization is
  proposed but NOT executed (see the session's authorization proposal): no
  provider call, no spend, no grant change, no run-count or budget increase.
- **Safety.** No Alphaus DEV/NEXT/production contact, no database or
  cloud operation, no sibling write, no credential publication, no visibility
  change, no force push, no published-history rewrite. External activity was
  GitHub CI read/observe and validated fast-forward pushes.
