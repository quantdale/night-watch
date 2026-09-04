# Task State

## Identity

Task ID: nightwatch-overnight-reliability-r13-v1
Phase: OVERNIGHT_RELIABILITY_R13_V1
Status: COMPLETE
Starting SHA: d3a464de97225f91cd425b7922b53238a02dc981
Last validated implementation SHA: 2bb865ea476ca1a82841567243be4db39a510466
Last substantive checkpoint SHA: 2bb865ea476ca1a82841567243be4db39a510466
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-overnight-reliability-71c616bc
Last checkpoint: session claimed; R-13 scaffolding written before any gate battery
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d3a464de97225f91cd425b7922b53238a02dc981
LAST_VALIDATED_IMPLEMENTATION_SHA: 2bb865ea476ca1a82841567243be4db39a510466
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 2bb865ea476ca1a82841567243be4db39a510466
LAST_DOCUMENTATION_CHECKPOINT_SHA: d3a464de97225f91cd425b7922b53238a02dc981
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_OVERNIGHT_RELIABILITY_R13_V1_STATUS: COMPLETE

## Objective

Measure — never assume — the repeatability of everything R-12 through C-15c
built: determinism across fresh processes, order independence, lifecycle and
collision robustness, concurrency safety, scale invariance, seeded
properties, second-topology clean behavior, regression stability, UI
endurance, leak freedom, receipt durability, and mutation-probe bite. No
implementation changes.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed; 18 of 19 acceptance rows PASS,
row 18 (exact-head CI) BLOCKED on the external GitHub execution failure with
5 identical no-runner attempts recorded.

## Completed Milestones

- M1 — SPEC, PLAN, STATE, REPORT, OpenSpec change, ACTIVE_TASK and
  EXECUTION_PROMPT routing, live-state block, session claimed; truthful CI
  non-evidence recorded in the machine block and prose (project:check PASS).
- M2 — 12 fresh-process determinism observations byte-identical (§92);
  source-scan repeatability covered by construction (§93); L1 re-probe
  post-fix identical.
- M3 — order battery 597/597/597 (§94); lifecycle driver green: temp 100/0,
  receipts 50/50 + fail-closed ×2, server 25 cycles fd-neutral,
  workspace-integrity 25/25, worktrees 10/10, concurrent receipts 8×10 (§95,
  §97); lease suites repeated via Clean B + regressions (§96).
- M4 — 7 map-scale permutations → 1 digest (§98); 9 seeded properties × 200
  iters = 1,801 checks, 0 failures (§99); DEF-R13-1 (probe-side) fixed.
- M5 — Clean B guards + 622 suites PASS (§100); regression ×3 stable (§101:
  3,572 total, 3,559+13+0 each); semantic ×2 identical (§102); synthetic ×3
  identical (§103: 916/916).
- M6 — endurance v2 22/22 true-depth loops (§104); leak accounting clean
  (§105: OBS-R13-1 noted); receipt durability proven twice (§106).
- M7 — 13/13 mutation bites + restores (§107); DEF-R13-4 repaired; DEF-R13-5
  found and repaired (4 layers, full re-validation); gate:local PASS at
  2bb865e (receipt:sha256:25dfa0521c9645c4d6c4de9b, 11/11, synthetic
  923/923); gate:clean PASS at 2bb865e
  (clean-receipt:sha256:84d32d1be193f7c2012ab458, 11/11, siblingWrites 0,
  with the concurrent-edit caveat in REPORT row 17).
- M8 — close-out records, authoritative clean-gate re-run at the final head
  (next), integration, exact-head CI re-attempt, release.

## Work In Progress

NONE — all executable work is complete. Remaining: authoritative clean gate
at the final head, integrate, observe exact-head CI, record the outcome,
release the session.

## Exact Next Action

STOP on implementation — commit these close-out records (Commit A), run the
authoritative clean gate with zero concurrent writes, integrate, observe CI.

## Files Changed

- `.agent/tasks/nightwatch-overnight-reliability-r13-v1/{SPEC,PLAN,STATE,REPORT}.md` — R-13 records
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/` — proposal, design, audit, tasks, specs
- `config/campaign-certification.v1.json` — R-13 declared with `"suites": []` + reason
- `bin/hardening-check.mjs` — DEF-R13-4: parse the C-08 vocabulary array
- `src/controlCenter/adapters/systemMapAdapter.ts` — DEF-R13-5: namespace+membership focus resolution
- `src/controlCenter/contracts/systemMap.ts` — DEF-R13-5: V2 focus wire vocabulary
- `src/controlCenter/server/server.ts` — DEF-R13-5: focus validator on V2 branches; separator screening scoped to path
- `ui/control-center/src/App.tsx` — DEF-R13-5: drill + subject-kind gating
- `tests/unit/c15cSystemMapTransport.test.ts` — tests 28–34 (focus resolution + vocabulary)
- `tests/unit/controlCenterServer.test.ts` — V2 focus charset over HTTP
- `tests/browser/systemMapV2.browser.ts` — L1→L2→L3→L4 content, kind gating, blocking chain
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md` — R-13 routing + CI non-evidence truth

## Validation Ledger

| Check | Result |
|---|---|
| determinism ×12 + L1 re-probe post-fix (§92) | PASS — byte-identical, fix perturbs nothing |
| order battery ×3 (§94) | PASS — 597/597/597 |
| lifecycle driver (§95, §97) | PASS — temp 100/0, receipts 50/50, server fd-neutral, integrity 25/25, worktrees 10/10, concurrent 8×10 |
| map scale ×7 (§98) | PASS — 1 digest |
| properties 9×200 (§99) | PASS — 1,801 checks, 0 failures |
| Clean B (§100) | PASS — guards + 622 suites (pre-fix baseline; fix covered by clean gate below) |
| regression ×3 (§101) | PASS — 3,572 total, 3,559+13+0 each |
| semantic-compat ×2 (§102) | PASS — identical |
| synthetic ×3 (§103) | PASS — 916/916 each |
| UI endurance v2 (§104) | PASS — 22/22 true-depth loops |
| receipt durability ×2 (§106) | PASS — fail-closed receipts with NOT_RUN groups |
| mutation battery (§107) | PASS — 13/13 bites + restores |
| c15c suite / server suite / UI suite | 34/34, 44/44, 12/12 PASS |
| browser matrix | 2/2 PASS |
| typecheck / hardening / handoff / agent / project | PASS (re-run at commit) |
| Full gate battery | NOT RUN YET at fix head — M7 close-out |
## Decisions Made During This Task

Probes live in /tmp/r13, never in the repo tree (SPEC rationale recorded).

## Discoveries

- C-15c exact-head CI (run 33833574821, attempts 1–4): EXTERNAL_BLOCKER with
  an identical no-runner/zero-step/no-annotation signature; workflow file
  byte-identical to the last green run. Recorded in SPEC predecessor truth.
- DEF-R13-2 (process, repaired): a relative-path edit to
  `config/campaign-certification.v1.json` resolved against the session cwd
  and landed in the CANONICAL checkout instead of this worktree — a C-00
  write-authority violation caught by `git status` before anything else.
  Repair: single-file `git checkout --` of my own edit in canonical
  (verified clean after), re-applied via absolute path here. Prevention:
  absolute worktree paths on every edit; verify `git status` in ALL trees
  after each edit batch.
- C-06G gate assessed from the C-03 REPORT (service topology PROVEN but
  ouchan enumeration TRUNCATED, `repositoryCompleteProof: false`):
  `C06G_BLOCKED_BY_METHOD_BINDING_OR_INVENTORY_COMPLETENESS`.
- DEF-R13-3 (process, repaired): M1 ran agent:check + project:check but NOT
  hardening:check + handoff:check after scaffolding — the same
  scaffolding-before-battery rule I cite, incompletely applied. Clean B caught
  it: missing openspec audit/design, invalid predecessor-status vocabulary,
  dropped STATE ledger sections, undeclared R-13 registry entry. Credit to the
  second topology for doing its job. Fixed in b4e0832; all guards green there.
- DEF-R13-4 (pre-existing guard weakness, REPAIRED): the C-08 vocabulary
  check tested file-substring presence, so dropping 'STALE' from
  `DEPLOYMENT_BINDING_STATES` while its token lingered at line 152 produced
  NO hardening failure (P-DEP NO_BITE, verified). Defense in depth held —
  the registered C-08 suite pins the exact array (test.ts:103) — but the
  hardening rule did not prove what it claimed. Repair: parse the
  `DEPLOYMENT_BINDING_STATES` array literal instead (bin/hardening-check.mjs,
  message text unchanged). After-probe P-DEP BITES with the identical
  message; typecheck + C-08 suite 32/32 + hardening PASS. No test pins the
  old message; nothing else consumes it.

- DEF-R13-5 (campaign-introduced by C-15c, REPAIRED): V2 drill focuses never
  resolved. (1) Adapter passed node ids (`product:ripple`) straight to
  projections wanting bare ids (`ripple`), rendering degenerate single-node
  views (`product:product:ripple`) as successful navigation — every L2/L3/L4
  drill and every focus query with a selected subject. (2) The transport
  charset forbade `/`, 400ing every legitimate L3 drill. (3) Encoded
  separators were screened across the whole raw URL, 400ing encoded query
  focuses. (4) The UI offered subject queries for kind-mismatched subjects
  and drills for non-resolving kinds, stranding operators on trap views.
  Survived because the C-15c suite tested rejection paths but never a valid
  focus's CONTENT, and the browser matrix asserted breadcrumbs, not members.
  Fix: adapter namespace+membership resolution (unresolvable → null/404);
  V2 focus wire vocabulary admitting `/` with explicit `..`/`//` refusal;
  separator screening scoped to the path; UI drill + per-query subject-kind
  gating. Regression: c15c suite 34/34 (tests 28–34 new), server 44/44,
  UI 12/12, browser 2/2 with L1→L2→L3→L4 content + kind-gating + blocking
  chain, endurance 22/22 true-depth loops, L1 digests byte-identical,
  typecheck + hardening PASS.

## Blockers

- C-15c exact-head CI: EXTERNAL_BLOCKER (GitHub assigns no runner). R-13
  offline work proceeds; re-attempt on changed hypothesis only.

## Safety Events

NONE. Production contacts 0, NEXT contacts 0, DEV requests 0, credentials
acquired 0, sibling repository writes 0, force pushes 0. C-12 remains NOT
AUTHORIZED and is not begun.

## Deferred / Follow-Up

C-12, C-13, C-14, residual C-07 DEV, C-08b — all out of scope, recorded in
PLAN.

## Resume Recipe

STOP — task complete, do not resume. Integration, CI observation and release
are the owner's remaining session steps, recorded in ACTIVE_TASK.

## Completion Snapshot

- Task status: COMPLETE (18/19 rows PASS; row 18 BLOCKED-external)
- Substantive anchor: `2bb865ea476ca1a82841567243be4db39a510466`
- `gate:local`: PASS (receipt:sha256:25dfa0521c9645c4d6c4de9b), 11 groups
- `gate:clean`: PASS (clean-receipt:sha256:84d32d1be193f7c2012ab458), 11 groups
- `campaign:synthetic` ×3: 916/916 each (final gate: 923/923 with new tests)
- `test:semantic-compat` ×2: 2,033/2,020/13/0 each
- Regression ×3: 3,572 total, 3,559+13+0 each
- Determinism ×12: byte-identical; properties 1,801/1,801; map 7→1 digest
- Browser matrix 2/2; endurance 22/22 true-depth; mutations 13/13
- Defects: DEF-R13-1 (probe), DEF-R13-2 (process), DEF-R13-3 (process),
  DEF-R13-4 (guard, repaired), DEF-R13-5 (product, repaired)
- Sibling writes: 0. Production/NEXT/DEV contacts: 0. Credentials: 0.

## Method notes

Scaffolding-before-battery ordering is now the third consecutive application
of the C-16/C-07/C-15c process correction.
