## Context

Measured read-only at base `1f786a4e` (2026-09-25) by four audit lanes, a
39-change NW-AUD backlog triage with adversarial verification, a delta re-check
after the successor campaign integrated 50 commits, and a completeness critic.
The full evidence census is `audit.md` (228 items, every one classified A–H
and assigned a tier and disposition). What matters for design:

```
                 WHY EVERY "COMPLETE" SO FAR HAS DECAYED
 ┌──────────────────────────────────────────────────────────────────────┐
 │ 1. re-bind evidence ──► edit config/*.json (not an approved path)    │
 │        └─► commit is SUBSTANTIVE ──► becomes certified checkpoint S' │
 │               └─► the evidence just bound is STALE_ANCESTOR of S'    │
 │ 2. open/close a task ──► edit LIVE_TASK_STATUS literal in src/       │
 │        └─► SUBSTANTIVE commit ──► same chase (07a54910 / a27bee0d)   │
 │ 3. six release checks implemented:false ──► 7/16 can never be MET   │
 │ 4. CI runs on push; red at HEAD; records still say "billing block"   │
 │ 5. once an advance is claimed, any later commit or passed revisit    │
 │    date hard-fails PROJECT_TRUTH ──► a new re-certification campaign │
 └──────────────────────────────────────────────────────────────────────┘
```

The product engine works (`nightwatch-agent campaign run` with a print-mode
provider CLI senses approved sibling source, reproduces in a contained sandbox
and admits mechanically). The product surfaces around it lose or misreport its
output: admissions are never persisted, terminated resume re-derives from
empty history, provider outage presents as `BUDGET_EXHAUSTED`, reasoner
identity is the `node` binary, `findings` prints a constant 0, the dispatcher
kills hunts at 180 s, reproduction copies dirty working trees under a HEAD
label, and Control Center Runs/Findings/Safety are blank on the owner host.

Owner decisions taken while planning this change (2026-09-25), recorded
verbatim in `audit.md` and to be entered as DECISIONS D-144:

- **OD-1** Tiered terminal disposition (not fix-everything, not truth-only).
- **OD-2** Target `PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129 (full bin
  type-check and CLI-contract burn-down).
- **OD-3** Authorized: GitHub CI read/observe; one bounded paid provider proof
  run; one npm registry advisory query (root + UI lockfiles); deletion of
  orphan branch `session/nightwatch-successor-campaign-en-c8bcb74c` after its
  SHA `1441cc8a` is recorded.
- **OD-4** This proposal is written uncommitted in canonical. The
  implementation session moves it into its worktree and commits it together
  with its task continuity in the bootstrap checkpoint. Until then,
  canonical `agent:check`, `project:check` and `handoff:check` fail with
  `LEDGER_CHANGE_WITHOUT_TASK` (measured 2026-09-25). This is expected, and it
  is why the change must never be committed alone.

Constraints: C-00 single writer (one session, one worktree; subagents
read-only); AGENTS.md safety model and owner scope freeze unchanged; Alphaus
sibling repositories read-only; no DEV/NEXT/production contact; CI triggers
on push and pull_request to `main` (`.github/workflows/hardening.yml:3-7`);
continuity vocabulary is `NONE|IN_PROGRESS|BLOCKED|COMPLETE`
(`bin/agent-continuity-protocol.mjs:31`); D-129 forbids new status names.

## Goals / Non-Goals

**Goals:**

- Every census item ends in one recorded disposition; no hidden backlog.
- Certification is reachable, and once reached it stays stable: a later
  commit demotes to a truthful report instead of breaking the gate.
- Exact-head CI is green and deterministic at the final substantive
  checkpoint S, and the records that describe CI match GitHub.
- An operator can install, check health, run a bounded autonomous hunt, and
  see the durable, truthful results in the CLI and the Control Center.
- The terminal topology is `main` only, with no worktree and a clean tree,
  equal to `origin/main`.

**Non-Goals:**

- Full redesigns of L/XL contained-DEV items (NW-AUD-016 full attestation,
  025 attested generations, 026, 037, 038). These are quarantined, not built.
- Changing owner scope, the production track (C-12/C-13/C-14/P4), Phase 6
  execution, or any authorization beyond OD-3.
- New reproduction executors (W10 NO-GO stands; the ouchan-only ceiling is
  stated, not expanded).
- Re-admitting ripple-api at its new SHA (owner-only, recurring; drift is made
  visible and skipped honestly instead).
- Paying down unused exports or dependency majors beyond a ratchet.

## Decisions

### D1. One terminal-disposition ledger replaces strike-through

Every item in `audit.md` carries exactly one disposition:

| Disposition | Meaning | Required evidence |
|---|---|---|
| FIX | defect removed | regression + probe where it is a guard |
| NARROW | over-claim reduced to what is proven, guarded | test proving the narrower claim |
| QUARANTINE | path refuses to run until fixed | registry entry + launcher refusal test |
| ACCEPTED_RESIDUAL | latent on a frozen/no-caller path | DECISIONS entry citing OD-1/D-144 and a revisit trigger |
| COMPLETED_LATER / SUPERSEDED | done elsewhere | SHA + file:line citation |
| HISTORICAL / NON_GOAL / EXTERNAL | preserved / out of scope / owner action | cited record |

Tier rules: T0 spine and T0-D129 debt are always fixed. T1 (operator-truth on
normal local paths) is fixed, narrowing where a redesign is L/XL. T2-FIX
(contained-DEV, S/M, synthetically provable) is fixed. T2-GATE is
quarantined. T3 (latent on frozen paths) is ACCEPTED_RESIDUAL, except any S
item, which is fixed. T4 gets a ratchet, with S items fixed. The owner confirms
the final residual list once, before the final substantive commit.
Alternatives rejected: fix everything (about 45–55 engineer-days, and a
perpetual programme); truth-only closure (leaves operator-visible false
results).

`bin/lib/openspec-ledger.mjs` stops counting a struck item as settled unless
its strike text carries a disposition token (DEFERRED is no longer
accepted). Otherwise it reports `LEDGER_UNDISPOSITIONED_ITEM`. BLOCKED tasks
become their own open-work class instead of being skipped (R2-62).

### D2. Checkpoint-neutral certification bindings (A-01, R2-N6)

- Evidence bindings move to `config/release-evidence.v1.json` with a closed
  schema: `{subject: conditionId|laneId, evidenceSha, receiptDigest,
  observedAt, executor}`. The file is added to `APPROVED_CHECKPOINT_PATHS`
  only through a diff-shape guard: a commit that touches it stays documentary
  only when the diff changes nothing but binding values, and the schema
  validates. Any other change to it is substantive.
- Document-role correction entries move to
  `config/document-role-corrections.v1.json` under the same guard.
- `LIVE_TASK_STATUS` expectations are derived from `.agent/ACTIVE_TASK.md` at
  check time. The literal leaves `censusFigureLedger.ts`.
- `project:check` gains an assertion that each bound evidence artifact exists
  at its `evidenceSha` (`git cat-file -e`) and that each condition agrees
  with the lane it cites (D-06).

Alternatives: owner-local receipts only (a clean clone cannot verify them);
a fenced CURRENT_STATE block (it mixes machine bindings into prose governed by
document-role rules). Neither was chosen.

### D3. Implement the seven missing release probes

The probes consume outputs that already exist:
- G14: `--report-reachability` returns zero findings and the retention list
  is empty.
- G17: `schema-lifecycle check`.
- G18: a receipt from the UI error-taxonomy render harness.
- G19: the env declaration rule plus `environment-surface`.
- G21: the single-evaluator auth-capability rule.
- G12: the product run receipt from D7, plus the historical W13 aggregate.
- G20: a machine-readable accessibility result record, written by
  `tests/browser/accessibilityCertification.browser.ts` and the focus
  contrast measurement (R2-51). It is MET only when executed at S.

`index.ts` sets every check to `implemented:true` only when its probe is
wired. A hardening rule fails if `implemented:false` remains for a check whose
probe exists.

### D4. Post-certification demotion instead of hard failure (X-04)

After an advance is claimed at S, `project:check` classifies HEAD's relation
to S:
- `EXACT`: certified.
- `DESCENDANT_DOCUMENTARY`: certified at S, reported.
- `DESCENDANT_SUBSTANTIVE`: `CERTIFIED_AT_ANCESTOR` ATTENTION. The advance is
  not re-claimed at HEAD, and PROJECT_TRUTH still passes.

A revisit date passing yields ATTENTION plus an owner action, never a silent
pass and never a gate break. This keeps D-129's meaning (the status is bound
to S with lane counts) without turning every later commit into a new
campaign.

### D5. CI determinism and hermeticity

- Fix the test defects:
  - `c03GrpcTopology.test.ts:389` gets a guard.
  - `reviewStore.test.ts` owns its parent temp directory.
  - `campaign-synthetic.mjs` reuses the shard TMPDIR isolation.
  - The `observerSemanticLedger.test.ts:77` flake is reproduced under load
    and its waits are made event-driven.
- Replace the tautological `kind !== 'CURRENT'` guards with declared
  `test.skip(reason)`. Add a full-regression skip-identity allowlist (a
  Playwright JSON report per shard, evaluated by the existing skip policy); an
  undeclared skip fails the run. Vacuous `/tmp`-snapshot tests become honest
  skips or a snapshot materializer lane (D-10/11/12).
- `gate:clean` runs sibling-absent by default: `NIGHTWATCH_REPOS_ROOT` points
  at an empty disposable directory, and sibling mode is an explicit recorded
  opt-in. The literal `siblingWrites: 0` is replaced by measured sibling
  identity before and after. `gate:topology` joins the certification set, and
  its static scan resolves imported path constants (X-02).
- A UI group (`npm ci --prefix ui/control-center`, typecheck, test, build)
  joins `gate:local`, `gate:ci` and `gate:clean` (B-14, D-18).
- CI `failedLocations` carries a sanitized assertion class (for example
  `EXPECT_EQUAL`, `TIMEOUT`), never raw messages.
- Actions are pinned by SHA with an anchored hardening rule that sees compact
  `- uses:` forms and every workflow file (NW-AUD-001). CI moves to a
  Node-24-native action major and Node 22 (already qualified locally), with
  `runs-on: ubuntu-24.04` pinned (D-19). Receipts record the exact node and
  npm versions (NW-AUD-004 narrowed).

### D6. Exact-head CI choreography and HANDOFF_TRUTH (D-04)

In `ci` and `clean` modes, a declared session worktree that is absent from the
checkout is classified `SESSION_DECLARED_ABSENT_EXPECTED`. That applies only
when the declared branch equals the task STATE branch and every other handoff
invariant passes; any other mismatch still fails. The final substantive
commit S is pushed alone. CI `EXECUTED_PASS` at S is observed with `gh`
(authorized) through `bin/phase23-ci.mjs observe` and ingested into
`release-evidence`. The documentary receipt commit that follows touches only
approved paths.

A pull-request CI run on the session branch was considered. It would give
exact-head CI before integration, but it needs PR creation, which OD-3 does
not authorize, so it was not chosen.

### D7. Autonomous hunt result integrity (T1 chain)

```
 propose ─► reproduce (materialized from Git HEAD, not the working tree)
          ─► admitLocalFinding ─► AgentFindingRecord (content-addressed id,
             campaignId, repo HEAD+tree digest, cfe: fingerprint, test id,
             reasoner identity) ─► atomic write to agent-findings/ BEFORE any
             checkpoint delete ─► result + run receipt (provider health,
             sibling identity before/after incl. porcelain+diff digests)
```

- Reasoner identity: digests of the executable, the adapter, the print CLI
  and `PRINT_ARGS`, plus the provider and model labels, with the model label
  cross-checked against `--model`. On mismatch, resume refuses with
  `REASONER_IDENTITY_MISMATCH` before running (NW-AUD-044, C-05).
- Resume derives its budget from prefix usage only (NW-AUD-045) and uses the
  persisted `maxTurns` (C-14). A TERMINATED resume returns the persisted
  records verbatim, or `UNAVAILABLE_NOT_PERSISTED`, and never recomputes (C-02).
- Every reasoner call records its provider-failure class. The campaign
  derives a `terminationClass` (`VALID_PROVIDER_RUN`,
  `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, `PROVIDER_DEGRADED`) and never
  reports provider outage as budget exhaustion or zero yield (C-04). Ceilings
  scale by tier. Transient classes get bounded backoff with jitter. `retries`
  is renamed to `failures` (C-16). The failover validator refuses
  unreachable provider orders (C-15). Failover as a product capability stays
  owner-optional; see Open Questions.
- SIGINT and SIGTERM pause the campaign (a PAUSED checkpoint is written) and
  kill the reasoner process group. A progress checkpoint is written after each
  absorbed investigation (C-07). The print adapter cleans up on every exit
  path (C-11). Salvaged evidence refs are marked and excluded from grounding
  metrics (C-24).
- The dispatcher forwards `agent campaign run|resume` with inherited stdio,
  no timeout, signal pass-through, and the declared consumer environment
  (C-03).
- Materializing from Git HEAD (`git archive` at the recorded SHA; read-only)
  replaces working-tree copying. Dirty trees therefore cannot be mislabelled
  (X-05). Known environment signatures (`dial tcp`, `no such host`, missing
  credentials and so on) classify a failure as `ENVIRONMENT_DEPENDENT`, which
  is refused for admission (C-18).
- The minimal product run-receipt module promotes the honest-measurement
  pieces of the W13 harness into `src/` (C-28). The task harness stays
  historical.

### D8. Private-state layout and Control Center data

- Orchestrator checkpoints, manifests and briefs move to `campaign-state/`.
  Agent findings go to `agent-findings/`. The findings authority filters to
  dossier families before it applies byte budgets and exposes `reasonCodes`
  (B-02). Existing files stay readable. Migrating them is an owner-gated step,
  never automatic.
- Tests write run evidence to a test-scoped root. The Control Center reads a
  bounded newest-N window across the real run roots, with a distinct
  `RUN_EVIDENCE_WINDOW_TRUNCATED` reason (B-01, X-01).
- A read-only agent-campaign authority and view (no paths) is added, and
  `nightwatch-agent status` reports measured state (B-12, C-20).
- The Safety Center is wired to owner-scope, workspace-integrity and session
  status (B-11). Currentness is wired to family-movement classification
  (C-25).
- Protocol dossiers get READY only from a readiness verdict (minimization
  MINIMIZED or UNCHANGED, fresh exact replay REPRODUCED, no safety
  rejection). Otherwise they get an incomplete or UNRESOLVED status, and the
  campaign cannot become COMPLETE_WITH_FINDINGS (NW-AUD-029). The Control
  Center maps status totally (NW-AUD-048).
- Replay admission requires role-typed contexts: exactly one
  `FIRST_OBSERVATION` plus a `FRESH_CONTEXT_REPLAY` for L1, and
  `BOUNDED_REPETITION` for L2, with distinct run IDs per role (NW-AUD-025
  interim).
- One `resolveSiblingRoot()` (trimmed, env-first) is used everywhere, with its
  consumers declared (B-10, C-22).

### D9. CLI contract and bin type-check burn-down (D-129, OD-2)

On day one, add a per-file diagnostic ceiling ratchet, with `run-shards.mjs`
capped at 25. Superseded bins (`w11-historical-arm.mjs` and the thin
`phase*-real` wrappers) are either retired as declared deletions or declared
research-retained with a contract entry (X-12). Migrate the 28 undeclared
bins to `defineOperatorCli` (exit codes 0–4, single-document JSON, leak
scan). Only after each bin's functional edits is it annotated to zero
diagnostics. When all 76 conform with 0 exemptions, the lane flips to
BLOCKING, and the shared-parser structural rule is registered with a negative
probe.

### D10. DEV-lane precondition registry (T2-GATE)

`config/dev-lane-preconditions.v1.json` lists the open deferred redesigns
(NW-AUD-016 full, 022 task 2.1, 025 full, 026, 037, 038). Every contained-DEV
launcher (`campaign:real`, `phase*:real`, `observe:*`, auth refresh) checks it
before any effect and refuses with `DEV_LANE_PRECONDITION_OPEN`, unless the
registry is empty or the owner passes a one-shot acceptance token citing a
DECISIONS id. This adds a gate; it never removes one.

### D11. Popup L0 (R2-05)

A context-wide L1 barrier holds any request that has no frame-to-page mapping
until every pending page-guard installation settles, and only then continues
or refuses. If the synthetic fixture cannot prove zero upstream contact
through the barrier, the fallback is to deny popups by policy with a
categorical refusal. Either way, NW-AUD-020 tasks 3.2 and 4.2 are re-tagged
PARTIAL until the proof exists (R2-29).

### D12. Operator proof (Phase 5 of the prompt)

1. Synthetic proof: `campaign:synthetic`, plus a scripted fake-reasoner hunt
   that exercises admission, refusal, persistence, resume, provider-outage
   classification and signal pause. Deterministic, and part of the
   regression suite.
2. One authorized paid run (OD-3):
   - Settings: `NIGHTWATCH_PRINT_CLI` set to opencode, a declared model,
     `--repository=mobingilabs/ouchan`, and `--wall-clock-minutes` no more
     than 60 (a new flag that can only narrow the ceiling).
   - Proof of provider activity: `reasonerCalls > providerFailures`, and the
     print-debug count equals `reasonerCalls`.
   - Proof that source was untouched: sibling identity before and after,
     using porcelain and diff digests for all eight repos.
   - Proof of no leakage: TMPDIR is empty, and the leak scan of receipts
     finds nothing.
   - If the provider account is unusable, the run is recorded as
     `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, and the live proof becomes
     EXTERNAL. It is never zero yield.
3. A clean-clone install proof through the extended `gate:clean` (root and UI
   packages).

### D13. Ledger closure and archive rules

- Complete changes are archived oldest-first.
- An NW-AUD original whose requirements are fully implemented as written is
  archived with spec sync.
- Every other original (narrowed, quarantined, residual, withdrawn) is
  archived with `--skip-specs`, and its disposition is recorded in
  `audit.md`/REPORT. This keeps the published spec baseline from asserting
  unimplemented requirements (X-06).
- Successor changes and their originals are reconciled item by item, with SHA
  citations (A-24).
- Stale records are set terminal: production-completion-programme, the
  autonomous programme, W11, the observability plan, and the six BLOCKED
  successor children. The terminal state is BLOCKED only when a live external
  blocker exists.
- At close, this change is the only active change, and it is archived in the
  final documentary step.

### D14. Session and topology choreography

```
 P0 pre-flight (canonical, no live session, MAINTENANCE claim adopted from the
    RELEASED record sess-36dedce34085 — the 6.4 precedent):
    record 1441cc8a → git branch -D c8bcb74c → release claim → move this
    untracked planning change to scratch (canonical clean)
 M1 session start → restore the planning change → SPEC/PLAN/STATE/REPORT +
    ACTIVE_TASK + EXECUTION_PROMPT → ONE bootstrap commit (a change without
    its task STATE fails agent:check LEDGER_CHANGE_WITHOUT_TASK) → spine …
 close: S (routed canonical) → integrate --expect-head S (S is the push tip)
    → observe CI EXECUTED_PASS at S → release → remove (--delete-branch) → from canonical with no
    live session: gate:local, gate:clean, gate:topology at S → documentary
    receipt commit (approved paths only) → push → project:check verdict
```

## Risks / Trade-offs

- [Scale: about 33–42 engineer-days under one writer; compaction risk] →
  STATE checkpoint after every milestone, and milestone commits small enough
  that losing context costs one unit of work. A new finding enters scope only
  if it is T0/T1-class (no discovery loop).
- [Approved-path exemption for the bindings file could be abused to hide
  substantive edits] → a diff-shape guard (values only), a closed schema, and
  a hardening probe that mutates a non-binding key and expects a substantive
  classification.
- [HANDOFF_TRUTH classification reads as weakening] → it applies only to an
  absent declared worktree whose branch matches STATE, and every other
  invariant is still enforced. A negative probe covers a mismatched branch.
- [Demotion semantics read as weakening D-129] → the advance is still claimed
  only at an EXACT S. Descendants report CERTIFIED_AT_ANCESTOR and never claim
  at HEAD.
- [Paid provider run is non-deterministic and may yield 0 admissions] →
  zero admissions are acceptable only with executed calls, source actions and
  reproduction attempts shown in the receipt. No threshold is tuned mid-run.
- [Git-HEAD materialization changes reproduction inputs versus W13] → W13
  receipts stay historical, and the change of method is recorded in DECISIONS.
- [bin type-check burn-down touches safety-critical bins] → the ratchet is in
  first, functional edits come before annotation, and the gate plus probe
  campaign run after each batch. Guards are committed before `hardening:rules`
  (probe restores discard uncommitted work).
- [Sibling drift recurs (ripple-api moved six days after re-admission)] →
  certification does not depend on sibling currency. Live-source tests skip
  with a declared reason, and status reports currency.
- [Harness wakeups write the shared git exclude] → no ScheduleWakeup or loop
  during the session. If they are used, restore the stock exclude template.
- [CI Node/runtime change interacts with the gate:clean `node@20` path] →
  NW-AUD-001, NW-AUD-004 and D-19 are co-scheduled in one milestone.

## Migration Plan

- Owner-local state: new subtrees are created on first write. The old
  locations stay readable. An owner-gated `hygiene`/`retention` step can later
  migrate the 50 findings-root campaign files and apply retention, and this
  change never does it automatically.
- Config: the old binding fields in `release-certification.v1.json` and
  `validation-lane-state.v1.json` are read once by a compatibility loader
  during M2 and then removed. A declared deletion is recorded if a file goes
  away.
- Rollback: every milestone is a fast-forward-integrable commit series on the
  session branch. Nothing is force-pushed, and a failed milestone is repaired
  forward.

## Open Questions

- **Failover as a product capability** (C-15/C-16/C-28): this change fixes the
  validator hole and the tier ceilings and backoff, and it promotes a minimal
  run receipt. A declared `NIGHTWATCH_PROVIDER_POLICY` multi-provider failover
  in the product is left as an owner option. It is not required for the
  terminal verdict.
- **D-131 end state** (A-15, R2-26): the default is to record that composition
  plus structural screening is the adopted end state, and to strike NW-AUD-019
  task 2.2 and programme 14.7 with that decision. The owner confirms this at
  residual-list review.
- **Popup policy**: the barrier comes first and deny-by-policy is the
  fallback (D11). The owner may pre-select deny-by-policy.
- **Revisit dates** for recorded-unavailable lanes (owner-manual) are set at
  close, with the owner.
