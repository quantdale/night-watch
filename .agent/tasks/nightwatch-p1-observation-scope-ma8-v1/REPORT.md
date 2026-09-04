Status: COMPLETE

# Report — MA-8 / F-13 P1 Observation-Scope Prerequisite

## Campaign

```text
Campaign: MA-8 / F-13 P1 observation-scope prerequisite
Task ID: nightwatch-p1-observation-scope-ma8-v1
Starting SHA: 0195a39e60e82b80439ec10ad5a36453804fe030
Implementation anchor: 4642c1647f53c02dbc939f2475e04202249522a9
Final SHA: close-out head (verified HEAD == origin/main at release; live HEAD authority: GIT)
Status: COMPLETE (M1–M7 closed; STOP)
```
## Authorization accounting (final)

```text
real production contacts: 0
production reads: 0
production writes: 0
NEXT operations: 0
DEV operations: 0
credential changes: 0
production config changes: 0
deployments: 0
restarts: 0
sibling writes: 0
destructive Git operations: 0
force pushes: 0
```

## Architecture delivered

- `src/core/prodObserveP1/`: fifteen-gate `nightwatch.p1-observation-scope.v1`
  chain (named, ordered, digested, per-gate denial codes, code-confinement
  enforced at runtime), `P1_OBSERVE` one-shot expiring grants bound to
  campaign + implementation SHA + PQ receipt digest, external-only scope
  config (exact host, bounded window + duration cap, private destination,
  implementation binding), pure admission evaluator (first-denial wins,
  consumption only on full allow), four-class mechanical attribution with
  UNKNOWN failing closed, six-way terminal classification (vacuous PASS
  impossible), triply-bounded passive session (deadline + event + poll
  budgets, attach-once), fail-closed kill switch (entry + pre-attach + every
  poll).
- L6 reconciled via the explicit P1-specific invariant (D-115, option B):
  no traffic-initiation capability + no page-mutation capability (both
  import-graph proven) + full attribution + closed unknown + bounded
  scope/window/host + mandatory projection.
- C-11/C-10/C-10.5 consumed, never modified (verified by
  `checkC11ProdObserveBoundary` still passing unchanged).

## Requirement ledger

```text
MA-8 (observation-scope chain) .............. PASS — 15-gate named chain,
  one-fault matrix 29/29 denies at the right gate with later gates
  NOT_EVALUATED and grants unconsumed; chain order hardening-enforced.
F-13.1 (attach-only definition) ............. PASS — subject model requires
  an operator-supplied already-existing subject; NIGHTWATCH_CREATED and
  UNKNOWN provenance deny; cone has no subject-creation primitive
  (structural suite + hardening).
F-13.2 (L6 reconciliation) .................. PASS — option-B invariant
  recorded as D-115 with threat-model coverage; no silent waiver.
F-13.3 (attributable criterion) ............. PASS — four-class classifier
  from mechanical evidence; NIGHTWATCH_ATTRIBUTABLE>0 or UNKNOWN>0 never
  passes (property-tested at seeds 11/101/1001); mutation probes 03/13 bite.
UA-8 (resolve "issues no requests") ......... PASS — replaced by attributable
  accounting in code, design, and D-115.
E-16 (precise P1 + exemption + chain) ....... PASS — verified canonical at
  campaign start; all three elements implemented.
C-12 row (criterion rewording) .............. PASS — code implements "zero
  requests attributable to Nightwatch, every request counted and attributed".
§4 gates 1-14 (auth/mode/identity/subject/ provenance/scope/window/privacy/
  credentials/kill/attribution/destination/separation/fail-closed) PASS —
  each a chain gate (or gates) with its own falsifying cases.
§6 subject-creation prohibitions ............ PASS — structural cone suite
  (no navigate/reload/click/type/submit/fetch/dispatch/replay/auth-state).
§7 passive capability cone .................. PASS — import-graph enforced by
  suite + hardening, both directions + C-11 non-coupling.
§9 attribution model ........................ PASS — decision table, tally,
  verdict, session integration; background/redirect/frame/websocket/
  download shapes covered as initiator classes.
§10 vacuous pass impossible ................ PASS — six outcomes, zero
  samples blocked; property-tested.
§11 test program ............................ PASS — admission, capability,
  attribution, privacy, kill-switch, isolation, state-machine, integration.
§12 mutations ............................... PASS — 14/14 detected, 0
  survivors, byte-identical restore, re-pass.
§13 properties .............................. PASS — 9 invariants × 3 seeds.
§14 mock integration ........................ PASS — 5/5; limitation stated
  (event-stream model, external subject mechanism out of scope).
§15 no cheating the operator prerequisite .... PASS — Nightwatch cannot create
  the subject through the P1 cone (structural + provenance gate).
§16 C-08b untouched ......................... PASS — UNKNOWN stays UNKNOWN;
  no inference, no sibling writes.
§17 external config contract ................ PASS — loader integrity matrix
  17/17 + gate bindings; no real values committed; no deny-table import.
```

## Tests

Focused P1 suites: 128/128 (38 admission + 24 config + 20 attribution + 6
privacy + 8 capability + 27 state-machine + 5 mock-subject, incl. the
out-of-vocabulary identity fault). Convergence: 13/13. Full canonical
regression on the final tree: 3729 passed / 0 failed / 13 skipped
(pre-existing environment guards; zero P1 skips). Synthetic lane on the
final tree: 47 files, 1051/1051 PASS, `deepContainmentLane: PROVEN`.
Semantic lane: 2020 passed / 13 skipped / 0 failed. Owner provenance: 91/91.

## Mutation/adversarial results

```text
probes introduced: 14
probes detected: 14
surviving probes: 0
```

Driver `/tmp/p1mutate.py` (out-of-repo). Every probe: sha256-recorded,
mutated, biting verification failed as required, bytes restored and
hash-compared, verification re-passed. Worktree verified clean afterwards.
Full probe table in STATE.md.

## Full regression

3729 passed / 0 failed / 13 skipped, exit 0, 10.4 minutes on the final tree
(DEF-P1-3 repaired; the single earlier failure was the convergence
single-ownership rule, 13/13 re-green).

## Clean certification

`gate:clean` PASS at `b31f0bf` under Node 20: disposable pristine clone
(`--local --no-hardlinks`, no reused `node_modules`), `installResult` PASS,
inner gate receipt `receipt:sha256:9851e74bd438a21073093c83`. The clone
carries byte-identical tracked content to the worktree head; the only
earlier clean failure was the expected mid-campaign project-truth staleness,
resolved by the close-out anchors.

## CI

Exact-head run `33864698218` at the integrated head `27bfe44` (2026-09-04,
10:45Z): `runner_id = 0`, empty runner name, zero steps —
`EXTERNAL BLOCKER — NO RUNNER / ZERO STEPS`, not a product failure. The
campaign-start run `33841467907` showed the identical signature. No rerun
loop; re-attempts happen on a changed hypothesis only.

## Defects discovered

```text
DEF-P1-1 — integrity gate ordered behind the identity gate that reads the config.
  Found by: one-fault matrix (config-absent denied at the wrong gate).
  Repair: integrity precedes identity and window; order hardening-enforced.
  Regression: one-fault matrix (29 faults).

DEF-P1-2 — out-of-vocabulary observer identity satisfied the minimum.
  Found by: adversarial second-pass review (§22 authority questions).
  Repair: membership checked before minimum; unknown fails closed.
  Regression: out-of-vocabulary matrix fault.

DEF-P1-3 — chain version value declared in two modules.
  Found by: full canonical regression (Phase 15P A15 single-ownership).
  Repair: constant removed; types.ts sole owner.
  Regression: convergence suite 13/13.
```

## Git

```text
Starting HEAD: 0195a39e60e82b80439ec10ad5a36453804fe030
Final HEAD: (filled at close)
origin/main: (discovered at close)
worktree clean: yes (verified post-mutation)
live worktrees: 1 session worktree (+ canonical)
active claims: this campaign only
files changed: 33 campaign-owned (cone 8, suites 8, support 1, openspec 5,
  task 4, configs 2, hardening 1, docs 3, active-task/handoff 2)
commits: 9 coherent (1 feat + fixes + docs), no force, no rewrite
```

## Remaining blockers

```text
- operator-provided already-loaded production subject (external prerequisite)
- admitted external P1 production configuration values (external)
- C-08b deployment facts / organizational access (still blocked)
- GitHub runner provisioning (external; single inspection recorded)
```

All four are inputs to a future C-12, not to this implementation campaign.

## C-12 state

```text
C-12 WAS NOT EXECUTED BY THIS CAMPAIGN.
```

## Next recommended action

STOP. C-12 requires a new explicit owner authorization after review of this evidence.
