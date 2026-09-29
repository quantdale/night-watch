# Active Task

Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
Title: Corrective campaign (child of the terminal campaign)
CHILD OF: nightwatch-final-product-completion-v1
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-completion-corrections-v1
Starting SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
Last validated implementation SHA: 3c9c1a0671068c8de6bafb54c62f9cd107fed78a
Last checkpoint: 2026-09-29 — M4 COMPLETE. Exact-head CI run 36552500573 at
`3c9c1a06` (the CF-05/FLAKE-002 paced-fixture fix) is GREEN: all 15 groups
PASS, SEMANTIC_COMPATIBILITY 2177/2163/14/0 (skipPolicy PASS 14/0),
SYNTHETIC_CAMPAIGN 1966/1926/40/0 (skipPolicy PASS 40/0), TOPOLOGY PASS
(PROVEN_DEGRADED, envelope BWRAP_UNAVAILABLE_DEGRADED, unexercised [chrome],
honest ciClaim githubExecutionProven=false), UI_CONTROL_CENTER 8 passed —
AND the VC-03 runner-topology artifact uploaded
(`runner-topology-3c9c1a06…`, id 11027375204, 1503 bytes, SHA-bound name).
Group gates at the clean tip (base `491b5ef9`): `gate:dev` PASS (8 steps,
5803/5770/0/33, coverage true, 627s) and `gate:milestone` PASS (12 steps,
same totals, 900s, withinTarget=false disclosed). One session-ownership
transient (STALE_SESSION after a harness restart) was recovered by the
sanctioned `claim --adopt` (`sess-66344fe137d7`). Tasks 3.1 and 3.12 ticked;
M4 (VC-01..VC-11 + CF-04/CF-05) CLOSED.
Previous checkpoint: 2026-09-29 — second exact-head CI cycle: the CF-04 fix
landed as `491b5ef9` and is PROVEN in CI (run 36537649045:
SYNTHETIC_CAMPAIGN skipPolicy PASS, 14 declared / 0 undeclared). That run
then failed SEMANTIC_COMPATIBILITY 1/2177 at `observerSemanticLedger.test.ts:138`
(FLAKE-002: the 550-fetch cap fixture's blind 10 ms pacing loses to the 4-read
acquisition gate under suite load; the gate REFUSES rather than queues). Fixed
per D-147: the loop now advances on the observer's own `activeRequests()`
drain signal (≤ 1 outstanding, drained before asserting) — no source or gate
text touched (bodyReadAcquisition 4/4 byte-untouched pins).
Previous checkpoint: 2026-09-29 — task 3.12 integration half exposed the CI-only
defect CF-04 (exact-head run 36513017223 at `2b5d8178`: SYNTHETIC_CAMPAIGN
UNDECLARED_SKIP 40/4 while local runs declared all 14). Root cause: four
`fs.existsSync` sibling-checkout-gated REAL-artifact tests (c08:110/:238,
c09:301/:314) never had their skip identities declared because this host HAS
the sibling checkouts. Fixed: 4 exact declarations (97 entries) + a
source-bound regression binding declarations to their real skip sites;
focused cone 15/15 + 51/51, typecheck/hardening/typecheck:bin (1559) /
validation:universe PASS; discriminating probe (5 CI identities PASS, drift
UNDECLARED). VC-01's CI-execution half is PROVEN at `2b5d8178` (zero skip
sites in both security suites; receipt 1966/1926/40/0 failed 0). The green
exact-head observation and the VC-03 artifact observation remain pending.
Previous checkpoint: 2026-09-28 — VC-02..VC-06 validation-spine corrections at
clean checkpoint `6b19e428`: focused suites green (routing 15/15, phase23
15/15, receipt 41/41, census 14/14), probe campaigns HC-180..HC-183 DETECTED,
typecheck:bin PASS at 1560 / 14 of 76, universe PASS. The full `gate:clean`
receipt at this anchor proved the VC-06 real-root measurement; inner
PROJECT_TRUTH failed on PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE (the
baseline lagged the task) and is repaired by advancing the baseline to this
anchor in this documentation-only descendant.
Previous checkpoint: 2026-09-28 — VC-01 skip correction at clean checkpoint
`c736ab9b`; the exact committed tree passed the 34-test DEV-login/storage-state
suite with all four browser-backed assertions executed and 0 skips. Exact-head
GitHub Actions proof remains pending the M4 group integration.
Previous checkpoint: 2026-09-29 — CF-04 root cause (four fs.existsSync
sibling-checkout-gated skip identities undeclared) fixed at `491b5ef9` with
4 exact declarations + a source-bound regression; VC-01 CI-execution half
PROVEN at `2b5d8178` (zero skip sites in both security suites; receipt
1966/1926/40/0 failed 0).
Current milestone: M5 Release probes (group 4, tasks 4.1-4.6: VD-01..VD-05 +
CF-01..CF-03). M1-M4 are COMPLETE (M4 closed 2026-09-29: exact-head CI run
36552500573 green at `3c9c1a06` with the SHA-bound runner-topology artifact;
gate:dev + gate:milestone PASS at the tip).
M1, M2, and M3 are COMPLETE. Tasks 3.2 (VC-02 skip-identity enforcement),
3.3 (VC-03 truthful topology classification, PATH-based Bubblewrap,
bounded gate-receipt details, SHA-pinned CI artifact), and 3.4 (VC-04
D-04 CI/CLEAN-only relaxation with exact branch equality; semantic-compat
forwards the parent gate label; HC-180 registered and DETECTED 2/2), and
3.5 (VC-05 `gate:ui` `--ignore-scripts`, esbuild build verified with NO
declared exception, HC-181 DETECTED 4/4), and 3.6 (VC-06 clean-checkout
verdict purity, real-root read-only measurement, early receipts with
siblingMode/versions; probes HC-182/HC-183 DETECTED; gateReceiptPersistence
41/41) are implemented and focused-validated in the worktree. The full
`gate:clean` proof and the semantic-compatibility clean-tree rerun are
COMPLETE at `9a1abf28` (clean gate 15/15 groups PASS, receipt
`clean-receipt:sha256:7ce5fa02f058a2c37ecc4a93`; semantic-compat 2177/2163/
14 declared/0 failed with skipPolicy PASS). The gate:clean arc also exposed
and repaired three real defects: PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE
(baseline advanced to `6b19e428` in `e9ad3300`), HARDENING APPEND_ONLY on the
reconciled prose row (CORR-CORR-002), and the VC-04 report-authorization
regression (lane-identity authorization in `9a1abf28`). Task 3.7 (VC-07
flake ledger + root-cause comment correction) is complete: 11/11 at the 2 s
bound under load 19–26 with concurrent browsers — NOT REPRODUCED, recorded
honestly in `docs/FLAKE-LEDGER.md` (FLAKE-001, declared APPEND_ONLY_ARCHIVE);
the root-cause comment now names the true mechanism (recordEvaluation and the
findings write are one synchronous passage — the wait bounds handler LATENCY
after `goto`, not an async projection). observerSemanticLedger 2/2 and
hardening:check PASS. Task 3.8 (VC-08) is complete: the workflow-pinning
matcher is token-based over every `uses` key form (block/compact/flow/
quoted, comment-aware, fail-closed on empty references) and probes
HC-184..HC-187 cover the previously unprobed forms — probe campaign 5/5
DETECTED, hardening suites 15/15, typecheck:bin PASS at 1559. Task 3.9 (VC-09)
is complete: c04 twins assert non-empty premises, phase14 C3-14 is a declared
skip, and the c03 real-topology describes use `classifyLiveSourceTestState`
with LIVE_SOURCE_ tokens (93 exact config identities, zero generic residue) —
focused 48 passed / 20 declared skips, skip-policy 18/18, semantic-compat
PASS at `71a6ca3b`. Task 3.10 (VC-10) is complete: topology measurements
count declared dependencies separately (declaredDependence beside
measuredDependence), bounded function-returned root extraction resolves
literal returns and leaves path-built ones UNRESOLVED, and
SEMANTIC_COMPATIBILITY / SYNTHETIC_CAMPAIGN truthfully declare
`requiresSiblingTopology: true` — gateTopology 36/36, gate:topology PASS
(PROVEN/BUBBLEWRAP), typecheck:bin 1559, hardening + universe PASS; the dead
`CHILD_ENV_INHERITED_KEYS` export is removed. M4 group gates
and exact-head CI/artifact observation remain pending.
Task 3.11 (VC-11) is complete: orphan-branch counts run against the
canonical remote ref with a numeric `uniqueCommits` assertion, the UI group
declares `NODE22`, the sun_path budget measures the actual TMPDIR, and
HC-188 probes the HANDOFF classification invariant (2/2 DETECTED) — 92/92
focused, hardening/typecheck/universe PASS; the dead
`SHARD_CHILD_ENVIRONMENT_IDS` export is removed.
`gate:milestone` PASSED at the clean checkpoint `8b24e11e` (12/12 steps,
5769 passed / 0 failed shards; OVER_TARGET disclosed as telemetry).
Next action: start M5 (release-probe corrections): implement task 4.1
(probe-at-checkpoint: every release probe resolves MET only at the certified
checkpoint — HEAD == S with a clean tree, or a receipt bound to S; otherwise
NOT_AT_CHECKPOINT), then 4.2-4.5, then 4.6's focused + gate:milestone PASS
and commit. Then group 5 (5.1-5.6) and group 6 (6.2-6.4).

Authorization class: COMPLETION_CORRECTIONS_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
LAST_VALIDATED_IMPLEMENTATION_SHA: 3c9c1a0671068c8de6bafb54c62f9cd107fed78a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3c9c1a0671068c8de6bafb54c62f9cd107fed78a
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_COMPLETION_CORRECTIONS_V1_STATUS: IN_PROGRESS

## Mission

Close the corrective change `nightwatch-final-completion-corrections-v1`
(39 tasks) so the parent campaign `nightwatch-final-product-completion-v1`
resumes from sound foundations at M9 task 10.2 (remainder: 59/76 declared).

## Read order

1. `.agent/tasks/nightwatch-final-completion-corrections-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-completion-corrections-v1/{proposal,design,audit,tasks}.md`
3. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE,REPORT}.md`
4. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`

## Routing and safety

```text
CAMPAIGN: nightwatch-final-completion-corrections-v1
CHILD OF: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-completion-corr-c45f0e9d

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3, CHILD SUBSET ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes. The parent's
  single-use grants (the one bounded paid provider proof run, task 12.3, and
  the one npm registry advisory query, task 15.4) are OWNED by those parent
  tasks and are NOT granted to this child.

CURRENT STATUS:
  IN_PROGRESS — M4 COMPLETE (exact-head CI 36552500573 green at `3c9c1a06`
  + runner-topology artifact; gate:dev/milestone PASS at the tip); M5
  (release probes 4.1-4.6) is next.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never discard
a newer canonical tip, and never touch another owner's worktree. Do not claim
completion without evidence. Never write under the canonical checkout while
this session is live; if canonical becomes dirty, STOP and report the exact
files and mtimes.
