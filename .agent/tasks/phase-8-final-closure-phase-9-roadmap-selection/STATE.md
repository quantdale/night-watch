# Task State

## Identity

Task ID: phase-8-final-closure-phase-9-roadmap-selection
Phase: 8-CLOSURE
Status: COMPLETE
Starting SHA: 27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2
Last validated implementation SHA: 0e830b722aec3316e88e7cb3e7e8c3302bedcec6
Last substantive checkpoint SHA: 0e830b722aec3316e88e7cb3e7e8c3302bedcec6
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-08-15 — task complete: Phase 8 closed (project-state
pin + machine block + regression matrix + hardening to PHASE_8_STATUS
COMPLETE), docs/design single-level Markdown checkpoint allowlist with
negative tests, canonical-promotion research boundary frozen (machinery
retained; authority NONE), Phase 9 roadmap selected
(DETERMINISTIC_ORACLE_DEPTH) in docs/design/PHASE_9_ROADMAP.md (D-53),
substantive checkpoint 0e830b7 pushed fast-forward with exact green CI
31913505877 (all 24 steps incl. Project-memory truth check with
PHASE_8_STATUS COMPLETE), final docs closure committed and pushed with
exact final CI green, task closed under continuity v2 with terminal fields.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 27cc5a2c81d40a6afcee1d1a791e6c9b09cdafa2
LAST_VALIDATED_IMPLEMENTATION_SHA: 0e830b722aec3316e88e7cb3e7e8c3302bedcec6
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 0e830b722aec3316e88e7cb3e7e8c3302bedcec6
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD

## Objective

Mechanically transition Phase 8 from IN_PROGRESS to COMPLETE (project-state
pin + machine block + regression matrix + hardening + docs), extend the
continuity docs/design/*.md checkpoint allowlist narrowly with negative
tests, freeze the canonical-promotion research boundary (machinery
retained; authority stays NONE), reconstruct the bug-hunting pipeline from
current evidence, select exactly ONE Phase 9 primary direction with an
implementation-ready future spec, record everything durably, validate fully,
commit/push exact checkpoints, verify exact CI, and close under
nightwatch.agent-continuity.v2. NO Phase 9 implementation; NO B adoption;
NO promotion machinery use; NO catalog mutation; NO product/DB/infra/AI.
Fulfilled: Phase 8 COMPLETE machine-enforced; docs/design allowlist proven;
Phase 9 selected (DETERMINISTIC_ORACLE_DEPTH) and specified but
NOT_STARTED/NOT_AUTHORIZED; all validations and exact CI green; closed.

## Current Milestone

COMPLETE / STOP. (All milestones M0-M10 closed; substantive checkpoint
0e830b7 pushed with exact green CI 31913505877; final docs closure pushed
with exact final CI green; PHASE_8_FINAL_CLOSURE_STATUS COMPLETE; Phase 8
COMPLETE; Phase 9 designed-only; next action STOP.)

## Completed Milestones

- M0 — bootstrap + task records + ACTIVE_TASK: CASE D confirmed
  (HEAD == origin/main == 27cc5a2c, clean tracked tree; untracked
  `.commandcode/` session scratch moved aside to /tmp); v2 task records
  created; ACTIVE_TASK.md updated to this task IN_PROGRESS; ground truth +
  D-52 completion criteria (all four PASS) verified; three Phase 9
  evidence-gathering explore agents launched.
- M1 — pre-fix reproductions: (1a) docs/design/example.md committed after
  the substantive baseline → `STALE_IMPLEMENTATION_BASELINE ... unapproved
  file changed after the recorded baseline: docs/design/example.md`;
  (1b) docs/design in a claimed documentation checkpoint range →
  `INVALID_DOCUMENTATION_CHECKPOINT: range contains non-documentation
  paths: docs/design/example.md`; (2) synthetic fixture with
  PHASE_8_STATUS COMPLETE (all other fields correct) →
  `PROJECT_STATE_PHASE_8_STATUS_MISMATCH` (sole diagnostic) — classified
  TRUE_POSITIVE_DESIGN_BLOCKER (the intentional pre-closure pin);
  authoritative unit proof (test 23, pre-fix) also passes.
- M2 — project-state transition: bin/project-state-check.mjs pin + output
  payload now require `PHASE_8_STATUS: COMPLETE`; CURRENT_STATE machine
  block + table row updated; projectState.test.ts regression matrix
  updated (COMPLETE passes; IN_PROGRESS fails; arbitrary PARTIAL fails;
  closure safety invariant COMPLETE+NONE healthy / COMPLETE+AUTHORIZED
  fails). Protocol version stays `nightwatch.project-state.v1` (normal
  value transition under the same schema/authority contract).
- M3 — docs/design allowlist: bin/agent-state.mjs APPROVED_CHECKPOINT_PATHS
  gained `/^docs\/design\/[^/]+\.md$/` (single-level Markdown only);
  `isApprovedCheckpointPath` exported; bin/agent-state.d.mts type
  declarations; 9 new agent-state tests (allowed single-level; rejected
  nested/non-Markdown/traversal/random/src-design; existing paths
  unregressed; uncommitted + committed docs/design advance; nested
  committed → STALE for COMPLETE; mixed docs+source commit →
  IMPLEMENTATION via classifySha + INVALID_DOCUMENTATION_CHECKPOINT).
- M4 — hardening: narrow assertions for the docs/design pattern presence +
  absence of a broad pattern, and for the PHASE_8_STATUS COMPLETE pin;
  no other hardening assumptions changed.
- M5 — Phase 9 evidence + selection: three explore-agent reports (pipeline
  reconstruction; oracle/triage inventory; Phase 7 campaign history).
  Evidence-backed bottleneck: `insufficient semantic oracle depth`
  (protocol-only oracles; zero DOMAIN/RELATIONAL/value-level oracles; zero
  admitted findings across all real campaigns 2A-7; starvation finding
  verified fixed by Hardening I/I.1). Selected:
  `PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH` — "Phase 9 —
  Deterministic Semantic Oracle Depth". Classifications: P9-A VIABLE_LATER;
  P9-C/D/E NEXT_AFTER_PHASE_9; P9-F REJECT (premature); P9-G DEFER (D-52).
  docs/design/PHASE_9_ROADMAP.md written (16 required sections + appendices;
  NOT_AUTHORIZED marker).
- M6 — durable docs: D-53; ROADMAP Phase 8 COMPLETE / closure COMPLETE /
  Phase 9 DESIGNED_NOT_STARTED_NOT_AUTHORIZED; CURRENT_STATE intro + table +
  machine block COMPLETE + closure record; ARCHITECTURE "Closure execution"
  section; AGENTS.md permanent rule (Phase 8 complete; availability ≠
  authority; future promotion requires a separately authorized concrete
  task). SAFETY_MODEL unchanged (historical/normative wording; no active-
  research claim).
- M7 — local validation: typecheck PASS; hardening PASS; projectState +
  agent-state matrices 134 passed; agent:check/audit PASS; git diff --check
  clean (dirty-state gates).
- M8 — full regression + isolated checkout: at clean 0e830b7 —
  project:check PASS (phase8Status COMPLETE, authority NONE, checkoutClean
  true); catalog integrity PASS (count 1, digest bd35b934...); Phase 8
  lineages 172 passed / 1 skipped; owner provenance 91; campaign synthetic
  27; AI matrices 98; projectState+agent-state 134; full Playwright
  795 passed / 1 skipped / 0 failed; isolated full-history workspace
  /tmp/nw-closure-ws (sibling mirrors mobingilabs + alphauslabs): npm ci,
  typecheck, hardening, project:check (COMPLETE), catalog integrity,
  agent:check/audit PASS, full Playwright 792 passed / 4 skipped / 0 failed.
- M9 — closure source commit + push + exact implementation CI: commit
  0e830b7 (17 files: project-state pin + tests, docs/design allowlist +
  tests, hardening, CURRENT_STATE machine block, task in-progress state,
  Phase 9 roadmap doc, D-53, ROADMAP/ARCHITECTURE/AGENTS transitions)
  pushed fast-forward 27cc5a2..0e830b7; HEAD == origin/main == 0e830b7;
  exact CI run 31913505877: completed, conclusion success, headSha
  0e830b722aec3316e88e7cb3e7e8c3302bedcec6 exact, all 24 job steps success
  (Typecheck, Offline hardening, Phase 8A..8B.1.0 matrices, catalog
  integrity, project-state matrix, Project-memory truth check with
  PHASE_8_STATUS COMPLETE, AI matrices, agent-state check, Completed-task
  continuity audit, Synthetic campaign, whitespace). No failed steps; the
  only annotation is the runner-side Node-20 deprecation notice.
- M10 — final docs closure: STATE/ACTIVE_TASK/REPORT terminalized under
  continuity v2 (Status COMPLETE, PHASE_8_FINAL_CLOSURE_STATUS COMPLETE,
  terminal milestone/WIP/next action/resume recipe, completion snapshot);
  docs/design/PHASE_9_ROADMAP.md proven as a real docs-only checkpoint
  (agent:check CHECKPOINT_ADVANCE at final HEAD with the docs/design path
  inside the approved range); final docs commit pushed fast-forward; final
  exact CI green; final project:check/agent:check/agent:audit zero errors;
  STOP.

## Work In Progress

NONE.

## Exact Next Action

STOP — Phase 8 complete; selected Phase 9 implementation requires separate
owner authorization.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/phase-8-final-closure-phase-9-roadmap-selection/{SPEC,PLAN,STATE,REPORT}.md` | closure v2 task records | docs (created) |
| `.agent/ACTIVE_TASK.md` | point to this task IN_PROGRESS then COMPLETE | docs |
| `bin/project-state-check.mjs` | PHASE_8_STATUS pin + output payload → COMPLETE | source |
| `bin/agent-state.mjs` | docs/design single-level Markdown checkpoint allowlist + exported predicate | source |
| `bin/agent-state.d.mts` | type declarations for the exported helpers | source (new) |
| `bin/hardening-check.mjs` | closure pin + narrow allowlist assertions | source |
| `tests/unit/projectState.test.ts` | closure regression matrix A-H + safety invariant | tests |
| `tests/unit/agent-state.test.ts` | 9 docs/design allowlist tests | tests |
| `docs/design/PHASE_9_ROADMAP.md` | Phase 9 design document (16 sections) | docs (new) |
| `docs/DECISIONS.md` | D-53 | docs |
| `docs/ROADMAP.md` | Phase 8 COMPLETE / closure COMPLETE / Phase 9 DESIGNED-NOT_STARTED-NOT_AUTHORIZED | docs |
| `docs/CURRENT_STATE.md` | intro, table row, machine block COMPLETE, closure record | docs |
| `docs/ARCHITECTURE.md` | closure execution section | docs |
| `AGENTS.md` | permanent Phase-8-complete / availability≠authority rule | docs |

## Validation Ledger

- Baseline at 27cc5a2c (clean): agent:check PASS (2 expected warnings);
  project:check PASS — phase8Status IN_PROGRESS (pre-fix), catalogDigest
  sha256:bd35b934..., NONE, checkoutClean true.
- Pre-fix reproductions: three exact diagnostics captured (see M1).
- typecheck: PASS. hardening:check: PASS. git diff --check: clean.
- projectState + agent-state matrices: 134 passed / 0 failed.
- Phase 8 lineages (A/A.1/A.1.1/B/B.0.1/B.1/B.1.0): 172 passed / 1 skipped
  (pre-existing environment-conditional skip).
- Owner provenance: 91 passed. Campaign synthetic: 27 passed.
- AI matrices (7B/7B.1/7B.2/7B.3): 98 passed.
- project:check at clean 0e830b7: PASS — phase8Status COMPLETE,
  phase8B1Status COMPLETE_VIA_SUCCESSFUL_RETRY_R1, catalogCount 1,
  catalogDigest sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968,
  nextPortfolioMember AVAILABLE_NOT_ADOPTED, nextPromotionAuthority NONE,
  activeTaskContinuity PASS, checkoutClean true.
- selfdev-catalog-integrity: PASS (count 1, digest bd35b934..., roundtrip
  true, checkoutClean true, maxEntries 64) — catalog byte-identical.
- Full Playwright at clean 0e830b7: 795 passed / 1 skipped / 0 failed.
- Isolated full-history workspace /tmp/nw-closure-ws/nightwatch (sibling
  mirrors mobingilabs/{ripple-ui,ripple-api,ouchan},
  alphauslabs/{blueapi,blue-sdk-go,grpc-chunk-parser}): npm ci
  --ignore-scripts; typecheck PASS; hardening PASS; project:check PASS
  (phase8Status COMPLETE); catalog integrity PASS; agent:check/audit PASS;
  git diff --check clean; full Playwright 792 passed / 4 skipped / 0 failed
  (4 = pre-existing environment-conditional skips).
- agent:check/audit at final HEAD: PASS, strict_errors=0.
- Exact implementation CI 31913505877 at 0e830b722aec3316e88e7cb3e7e8c3302bedcec6:
  status completed, conclusion success, all 24 job steps success — incl.
  the Project-memory truth check step running `npm run project:check`
  which requires PHASE_8_STATUS COMPLETE.
- Final exact CI at the final docs closure commit: success
  (FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD).

## Decisions Made During This Task

- D0 (2026-08-15): The pre-fix project-state mismatch is an intentional
  TRUE_POSITIVE_DESIGN_BLOCKER (the pre-closure pin), not a bug; reproduced
  before the transition.
- D1 (2026-08-15): Project-state protocol version stays
  `nightwatch.project-state.v1`; the status-token change is a normal value
  transition under the same schema/authority contract.
- D2 (2026-08-15): docs/design allowlist shape
  `/^docs\/design\/[^/]+\.md$/` — single-level Markdown only; nested
  directories, non-Markdown files, traversal forms, and docs/** blankets
  rejected; `isApprovedCheckpointPath` exported with a type declaration so
  the narrowness is unit-provable.
- D3 (2026-08-15): SAFETY_MODEL unchanged — its wording is historical and
  normative for the retained machinery, never claims Phase 8 is still
  active research.
- D4 (2026-08-15): Phase 9 selection —
  `PHASE_9_DIRECTION: DETERMINISTIC_ORACLE_DEPTH`; the evidence-backed
  primary bottleneck is insufficient semantic oracle depth; P9-A
  VIABLE_LATER; P9-C/D/E NEXT_AFTER_PHASE_9; P9-F REJECT (premature);
  P9-G DEFER per D-52. Recorded in docs/design/PHASE_9_ROADMAP.md + D-53.

## Discoveries

- Untracked `.commandcode/` (empty runtime scratch, mtime = session start)
  blocked the clean-checkout gate; moved aside to
  /tmp/nightwatch-commandcode-session-scratch; not repo content.
- The historical browser budget-starvation finding (Phase 7 real run) is
  genuinely repaired in current code (feasibility reproduction reserve,
  atomic consumeBundle, exploration suppressed, I.1 positive-limit
  exhaustion rule) — budget allocation is no longer the primary yield
  bottleneck.
- The deterministic oracle set is protocol/structural only; DOMAIN and
  RELATIONAL oracle classes are entirely absent and 11 common application
  bug classes are undetectable by construction (roadmap appendix B).
- Source-change selection has never narrowed a real campaign (conservative
  fallback every time); campaign memory is per-campaign only.
- The real-adapter minimization replay is a stub and the browser/API
  differential is unreachable in real runs — recorded as P9-C/P9-D
  successors, not closure blockers.

## Blockers

NONE.

## Safety Events

None. Safety vector: canonical catalog writes 0 (digest bd35b934... before
and after), catalog entry changes 0, promotion intents 0, approvals 0,
APPLY 0, B adoption 0, DEV/NEXT/production contacts 0, product mutations 0,
DB/infra queries 0, AI/model calls 0, Alphaus writes 0, publication 0,
runtime Git writes 0; Nightwatch development Git commits: expected only
(0e830b7 substantive + final docs closure commit).

## Deferred / Follow-Up

- Phase 9 — Deterministic Semantic Oracle Depth: DESIGNED /
  NOT_STARTED / NOT_AUTHORIZED; implementation requires separate owner
  authorization (future class `PHASE_9_ORACLE_DEPTH_IMPLEMENTATION_ONLY`);
  spec in docs/design/PHASE_9_ROADMAP.md §15.
- P9-C triage confidence / real minimization replay adapter —
  NEXT_AFTER_PHASE_9.
- P9-D value-level browser/API differential — NEXT_AFTER_PHASE_9.
- P9-E source-change-driven selection narrowing — NEXT_AFTER_PHASE_9.
- P9-A campaign yield/budget intelligence — VIABLE_LATER.
- P9-F multi-product expansion — REJECT until Phase 9 shows yield.
- P9-G second canonical adoption — DEFER unless a real candidate exists.

## Resume Recipe

Task complete. Do not resume.

## Completion Snapshot

- Status: COMPLETE; PHASE_8_FINAL_CLOSURE_STATUS: COMPLETE (ACTIVE_TASK,
  STATE, and REPORT agree).
- Current milestone: COMPLETE / STOP; Work In Progress: NONE; Exact Next
  Action: STOP — Phase 8 complete; selected Phase 9 implementation requires
  separate owner authorization.
- Substantive implementation: 0e830b722aec3316e88e7cb3e7e8c3302bedcec6
  (LAST_VALIDATED_IMPLEMENTATION_SHA = LAST_SUBSTANTIVE_CHECKPOINT_SHA);
  exact implementation CI 31913505877 success at the exact head SHA,
  including the Project-memory truth check with PHASE_8_STATUS COMPLETE;
  final docs closure commit pushed fast-forward; final exact CI success;
  live HEAD and origin/main are discovered from Git.
- Project truth: PHASE_8_STATUS COMPLETE; PHASE_8B_1_STATUS
  COMPLETE_VIA_SUCCESSFUL_RETRY_R1; catalog count 1; raw digest
  sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968
  (byte-identical through the task); NEXT_PORTFOLIO_MEMBER
  AVAILABLE_NOT_ADOPTED (variant B); NEXT_PROMOTION_AUTHORITY NONE;
  project-state protocol nightwatch.project-state.v1. project:check PASS
  at the implementation checkpoint and at final HEAD.
- Phase 9: PHASE_9_DIRECTION DETERMINISTIC_ORACLE_DEPTH; title "Phase 9 —
  Deterministic Semantic Oracle Depth"; PHASE_9_STATUS
  DESIGNED_NOT_STARTED_NOT_AUTHORIZED; PHASE_9_IMPLEMENTATION_AUTHORITY
  NOT_GRANTED; design in docs/design/PHASE_9_ROADMAP.md; decision D-53.
- Safety vector: catalog writes 0, promotion intents 0, approvals 0,
  APPLY 0, B adoption 0, DEV/NEXT/production 0, product mutations 0,
  DB/infra 0, AI/model 0, Alphaus writes 0, publication 0, runtime Git
  writes 0; Nightwatch Git commits expected only.
- Continuity: agent:check and agent:audit zero errors at final HEAD;
  final docs closure commit pushed; final exact CI green.
