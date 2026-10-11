# Final terminal-resolution report — `nightwatch-final-product-completion-v1`

Status: **NOT COMPLETE** (terminal record, 2026-10-12)
Certified checkpoint S: `dbe3349e08be58c8dbf4c2d3ac4eb7cd2ad9b7b4`
`origin/main` = `HEAD` = `b09263aa6d7efef04a2e02e80c6c8f8d209cd1bd`, `main` only, one worktree, clean.

## 1. Current SHA and exact project verdict

`git rev-parse HEAD` = `b09263aa6d7efef04a2e02e80c6c8f8d209cd1bd`;
`git rev-parse origin/main` = the same; `git status --short --branch` = `## main...origin/main`;
one worktree (the canonical checkout); `git branch` = `* main`; no `session/*` branch.

`npm run project:check` exits 0 with:

- `projectCompletionStatus: OPERATIONALLY_ACCEPTED`
- `advanceClaimed: false`, `certificationRefused: true`
- `activeTaskContinuity: PASS`, `checkoutClean: true`
- `ciStatus: EXECUTED_PASS` @ `dbe3349e`
- certified checkpoint `dbe3349e`, `conditionsMet 2/16` at HEAD

The advance status `PROJECT_COMPLETE_AND_CI_CERTIFIED` is **not claimed**. The
project refuses its own certification — which is the intended, fail-closed
consequence, not a gate failure.

`gh repo view quantdale/night-watch --json visibility,isPrivate` →
`{"isPrivate":false,"visibility":"PUBLIC"}`.

## 2. The five mutation survivors — all five killed

All five (BM-026, BM-029, BM-030, BM-034, BM-035) were **one** defect, not five:

Every real DEV launcher wraps its guard in `try { guardDevLane(...) } catch { … }`.
`bin/lib/dev-launcher-effects.mjs` built its symbol table from
`sourceFile.statements` only — TOP-LEVEL declarations. A binding made inside
any nested block was therefore never resolved, and any effect placed there was
invisible. `bin/observe-gate.mjs` is exactly that shape, so
`const { rmSync } = fs; rmSync(path.join(root, 'x'));` injected after the guard
inside the try block was reported as **nothing at all**. This is a real
implementation gap, not a missing test.

**Repair**: the analysis resolves bindings through the module's LEXICAL scopes
(scope stack pushed for every `Block`/`ModuleBlock`/`CaseClause`/`for`-statement
initialiser/`CatchClause`), which also restores correct SHADOWING. The evasion
class is pinned by seven new mutant samples (M22–M28) composed into the real
launcher shape, so the self-test and the focused suite fail closed if the
analysis ever goes blind again.

Result: `npm run hardening:mutants` → `mutants=116 detected=116 survived=0
errors=0`, and `npm run gate:milestone` → **PASS** (all 12 steps, including
`mutation-harness` exit 0). Nothing was removed from the mutant registry and the
detection threshold was not touched; a regression asserts the universe is still
116 mutants with every search literal unique.

## 3. Checkpoint-classification root cause and implemented fix

**Root cause.** `config/ci-block-record.v1.json` is the exact-head CI authority
but was neither guarded (`GUARD_CLASSES`) nor checkpoint-approved
(`APPROVED_CHECKPOINT_PATHS`). Certifying a new checkpoint REQUIRES observing the
run at it and refreshing the record's top level; that edit therefore made the
whole `S..HEAD` range `SUBSTANTIVE_DESCENDANT`, which demoted every working-tree
probe to `NOT_AT_CHECKPOINT` and left 15 of 16 conditions unmet no matter how
much evidence was produced. The two evidence routes were in direct tension.

**Fix.** A narrow `CI_BLOCK_RECORD_OBSERVATION` guard class. A change holds only
when: both revisions are valid JSON objects with the same schema version; every
descriptive field (`definitionName`, `note`, `ownerAction`, `revisitCondition`,
`revisitDate`, `routeSelection`, `candidateRoutes`) is byte-identical; `history`
only APPENDS with a byte-identical surviving prefix; appended entries are well
formed with a declared `classification`; the moved top-level observation is
backed by an entry THIS change appended; and the recorded `observedSha` is a
40-hex commit that exists in the repository and is an ANCESTOR of the commit
being judged. The caller passes the repository's own `cat-file`/`merge-base`
facts so a head outside history can never be recorded.

This is deliberately NOT a broad approval of the file. Seventeen adversarial
regressions (`tests/unit/ciBlockRecordCheckpointRole.test.ts`) drive real Git
repositories and prove real source, validation and configuration changes still
invalidate the classification, and that a forged head, a rewritten or removed
history entry, an earlier revisit date, a changed route, an undeclared
classification, an additive widening, and a re-observation without its history
entry all fail closed. Two further tests drive the real classifier over THIS
repository's object database with the real receipt verifier.

## 4. Validation results (exact commands and receipts)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run typecheck:bin` | PASS `conformance=77/77 mode=BLOCKING errors=0 exemptions=0 ceilings=0` |
| `node bin/hardening-check.mjs` | PASS |
| `npm run hardening:rules` | 96 rules / 274 probes / 274 DETECTED / 0 undetected |
| `npm run hardening:mutants` | `mutants=116 detected=116 survived=0 errors=0` |
| `npm run gate:milestone` | **PASS** (12/12 steps) |
| `npm run prepush` | **PASS** (affected-shards 6198 passed / 0 failed, 472 selected) |
| `npm run campaign:synthetic` | **PASS** — 1983 total, 1947 passed, 36 skipped, 0 failed, `skipPolicy undeclared=0`, deep containment lane PROVEN |
| `npm run gate:ui` | PASS (`control-center-ui` 3 built files, 362810 bytes, no external references) |
| `npm run control-center:ui:browser` | 9/9 passed (incl. the 30-decision reviewer persistence workflow and the keyboard contrast contract) |
| `npm run agent:check` / `agent:audit` | PASS (35 known legacy warnings) |
| `npm run validation:universe` | PASS |
| `npm run schema:check` | PASS (432 discovered / 409 families / 117 persisted) |
| `npx openspec validate --all --strict` | 80 passed / 0 failed |
| `node bin/gate-topology.mjs` | PASS, envelope BUBBLEWRAP, class PROVEN **from a clean clone of the same commit** |
| exact-head CI | 38140035293 @ `8c5bd86d`, 38160391804 @ `dbe3349e`, 38180162235 @ `b09263aa` — each 15/15, `undeclared: 0` |

Two gate groups fail **in the canonical checkout only** and pass from a clean
clone of the identical commit: `TOPOLOGY` (class NOT_PROVEN; the sibling-root
absence probe produces no observation) and `UI_CONTROL_CENTER`. Both were
reproduced at the pre-change baseline `0b4f2cdb` as well, so they are host-state
properties of this checkout, not regressions.

## 5. Full 16-condition release matrix (live, at HEAD)

| # | Condition | State |
|---|---|---|
| 1 | validation-lane-closure | UNMET `EVIDENCE_ARTIFACT_ABSENT_AT_SHA` |
| 2 | exact-head-ci-authority | **MET** |
| 3 | autonomous-yield-proof | UNMET — see §6 |
| 4 | completion-ledger-truth | NOT_AT_CHECKPOINT |
| 5 | operator-cli-contract | NOT_AT_CHECKPOINT |
| 6 | documentation-currency | NOT_AT_CHECKPOINT |
| 7 | workspace-continuity-drift-closure | NOT_AT_CHECKPOINT |
| 8 | dependency-supply-chain-currency | **MET** |
| 9 | dead-architecture-closure | NOT_AT_CHECKPOINT |
| 10 | cli-implementation-contract | NOT_AT_CHECKPOINT |
| 11 | structural-rule-soundness | NOT_AT_CHECKPOINT |
| 12 | schema-version-lifecycle | NOT_AT_CHECKPOINT |
| 13 | ui-error-taxonomy-rendering | UNMET — no F-18 UI-harness receipt on this host |
| 14 | configuration-contract | NOT_AT_CHECKPOINT |
| 15 | accessibility-certification | NOT_AT_CHECKPOINT `STALE_EVIDENCE` |
| 16 | authenticated-capability-lifecycle | NOT_AT_CHECKPOINT |

Why 13 of them read NOT_AT_CHECKPOINT at HEAD although their checkStates are MET:
the certified checkpoint S is `dbe3349e`, and HEAD (`b09263aa`) is a
**substantive** descendant of it (it carries the sibling-currency test and
configuration changes). `project:check` correctly refuses to treat a
measurement taken at a substantive descendant as a measurement of S. Earlier in
this session, with HEAD a documentary descendant of S, the same checks read
**MET/MET for 12 of 16** — the highest count reached. Reaching that state again
requires the final substantive commit to be the integration tip on which CI
executes and at which the evidence is produced; that choreography is recorded
but not completed here.

Condition 1 additionally requires the `clean-checkout`, `ui` and
`browser-workflow` lanes re-executed at S on a host whose canonical checkout can
run `gate:topology` and the UI group; see §4.

## 6. Autonomous yield — status and exact owner authorization

The only qualifying route is a `PRINT_CLI_PROVIDER` yield-campaign receipt with
`campaignTermination: COMPLETED_SUCCESSFULLY`, a digest-bound
`reasonerIdentity` matching the GRANTED record in
`config/yield-run-authorization.v1.json`, ≥1 completed provider call, an
unchanged sibling identity, a clean leak scan, executed at the certified
checkpoint on a clean tree. The two recorded local autonomous checkpoints both
terminated `BUDGET_EXHAUSTED` (wall 1203663/1200000 ms and 1313459/1200000 ms),
and no qualifying `artifacts/nightwatch-*/product-run-receipt.json` exists on
this host.

**The exact owner authorization required** (not taken, not forged, no paid call
made): the owner must grant a NEW bounded paid provider proof run, carried at the
final certified checkpoint S on a clean tree, naming the print-CLI digest,
provider and model, with a wall-clock budget sufficient to reach
`COMPLETED_SUCCESSFULLY` (the previous runs each exhausted a 20-minute ceiling),
and with `maxQualifyingRuns` correctly bound in
`config/yield-run-authorization.v1.json`. A longer timeout alone is not
sufficient: the run must actually COMPLETE.

## 7. PRIVATE visibility — an explicit owner/admin step

`gh repo view quantdale/night-watch --json visibility,isPrivate` returns
`{"isPrivate":false,"visibility":"PUBLIC"}`. Restoring PRIVATE is a separate
GitHub owner/admin action; it was NOT taken and no agent changed visibility.
Until it is taken, every push and CI artifact must be treated as public
(D-149), and nothing secret, customer-derived or authentication-bearing may
enter source, artifacts or `.agent` files.

## 8. Exact remaining blockers

1. **Choreography, not capability**: the final substantive commit must be the
   integration tip on which CI executes, with the topology receipt and the
   certification evidence produced at that same checkpoint, so HEAD is a
   documentary descendant of S when `project:check` is read. This session
   reached 12/16 that way; closing it needs one further clean cycle.
2. **Condition 1** needs `clean-checkout`, `ui` and `browser-workflow` executed
   at S on a host whose canonical checkout can run `gate:topology` and the UI
   group (this checkout cannot — §4).
3. **Condition 3** needs the owner authorization in §6 (a new bounded paid
   provider run that COMPLETES).
4. **Condition 13** needs an F-18 UI-harness execution receipt; **condition 15**
   needs an accessibility certification record from the control-center browser
   lane on a host where it runs.

## 9. Minimal operator commands for ordinary bug hunting

```
npm run handoff:check      # the handoff route is truthful
npm run agent:check         # continuity and the claim journal agree
npm run project:check       # the release verdict (certification refused, advance not claimed)
npm run typecheck          # root TypeScript
npm run typecheck:bin      # the bin lane (BLOCKING, 77/77)
npm run hardening:check    # structural invariants
npm run hardening:mutants  # 116/116 behavioural mutants
npm run campaign:synthetic # the deterministic synthetic campaign (1983 tests)
npm run prepush            # the lane every integrate runs first
npm run gate:milestone     # the broad milestone gate
gh run list --limit 1      # the newest exact-head CI observation
```

Local read-only commands stay authorized. No Alphaus DEV/NEXT/production contact,
no database or data-plane operation, no sibling repository mutation, no credential
persistence, no external publication, no force push, no history rewrite occurred
in this campaign.
