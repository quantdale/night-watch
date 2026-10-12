# Final certification closure report — `nightwatch-final-product-completion-v1`

Status: **NOT COMPLETE** (terminal record, 2026-10-12)
Certified checkpoint S: `7871b463a03936016caaf88081c9221baccc60f0`
`origin/main` = `HEAD` = `<current tip>`, `main` only, one worktree, clean.

## 1. Git truth and required checks

- `HEAD` = `origin/main` (fast-forward equal); `git status --short --branch` = `## main...origin/main`
- `git worktree list --porcelain` = one worktree (the canonical checkout)
- `git branch` = `* main`; no `session/*` branch; no live session
- `npm run session:status` → PASS, `attention=0`, `canonicalSafe=true`
- `npm run workspace:check` → PASS
- `npm run handoff:check` → PASS (exit 0)
- `npm run agent:check` → PASS (36 known legacy warnings)
- `npm run project:check` → exit 0; see §5

## 2. The latest substantive implementation SHA

The repository's own classifier (`bin/lib/checkpoint-role.mjs` with the production
binding-receipt verifier) was run over every commit after the previously certified
`dbe3349e`. Only **one** is `IMPLEMENTATION`: `c0da74d7` (the sibling-currency
test-admission fix). Because CI had executed only at its journal-close child
`b09263aa`, the checkpoint could not be advanced to it directly, so a further
substantive commit was made and CI observed at it.

**The final certified checkpoint is `7871b463`** (`feat(gate): name the
checkout-inside-sibling-root cause…`), at which:
- exact-head CI run **38220009838** completed/success, 15/15 required groups,
  `skipPolicy undeclared = 0` in both `SEMANTIC_COMPATIBILITY` (14 skipped) and
  `SYNTHETIC_CAMPAIGN` (40 skipped);
- a certifying `PROVEN` / `BUBBLEWRAP` topology receipt exists
  (produced from a clean clone of that commit placed outside the masked sibling
  root);
- `gate:clean` PASS, 15/15 groups, clean before and after, sibling ABSENT
  (`clean-receipt:sha256:66dc796faa56690951c398a6`);
- the F-18 UI-harness receipt (`receipt:sha256:158af3f91d2467dbf0b5d652`,
  105/105 tests, 5 `ApiErrorKind` members, tree clean) and the accessibility
  certification record (certification and keyboard sections PASS) are both bound
  to that commit;
- `control-center:ui:browser` 9/9 passed.

All six evidence kinds were produced at the checkpoint from a clean clone of
exactly that commit and imported into the canonical tree through
`certify:evidence import` — the architecture's sanctioned route for host-bound
checks.

## 3. Mutation analysis and milestone gate

`npm run hardening:mutants` → **mutants=116 detected=116 survived=0 errors=0**.
`npm run gate:milestone` → **PASS** on all 12 steps (mutation-harness exit 0).

One operational note, measured and recorded rather than worked around: the
harness commits a scratch commit on top of the checkout it clones, and that
commit is only covered by a claim window that is still **OPEN**. Running the
harness with every window closed therefore fails the claim-journal baseline with
`CLAIM_JOURNAL_UNCOVERED_COMMIT`. With an open maintenance window — the normal
state while a session is working — it is 116/116.

## 4. Canonical host-state discrepancy, resolved by clean-checkout comparison

`gate:local`'s `TOPOLOGY` and `UI_CONTROL_CENTER` groups fail **only in the
canonical checkout** and pass from a clean clone of the identical commit. Root
cause, proved directly: `DEFAULT_SIBLING_ROOT` is `/home/…/REPOSITORIES`, and the
canonical checkout is `/home/…/REPOSITORIES/nightwatch` — **inside** the path the
`sibling-root` absence masks with `--tmpfs`. The mask therefore hides the
repository, its Node runtime and its modules, and the probe cannot start at all.

The gate previously reported only the opaque
`TOPOLOGY_PROBE_FAILED: absence=sibling-root: probe did not produce an observation
(exit=1)`. `siblingRootContainsWorktree` now states the cause, and the finding
code `TOPOLOGY_ABSENCE_UNOBSERVABLE_CHECKOUT_INSIDE_SIBLING_ROOT` distinguishes
it from a genuine probe failure. This is a diagnostic improvement only: the
absence is still never converted into a pass or a declared non-exercise, and the
receipt still reports FAIL / not-PROVEN, which a regression asserts. Five
predicate tests and one real-repository test cover it.

## 5. The full 16-condition release matrix (live, at HEAD)

All sixteen conditions read **UNMET** at the final HEAD. This is the honest,
fail-closed consequence of this session's own repair: the evidence binding it
produced was not clean-clone reproducible, so it was reverted in a forward commit
(`db5d0ecb`), which removed the bindings the 14/16 state rested on. The
checkpoint itself is still `7871b463`, at which exact-head CI is green and every
evidence artefact described in §2 exists.

The 14/16 state reached mid-session (conditions 2, 4-12, 14, 15, 16 MET) was
measured in the canonical checkout only and is **not** reproducible from a clean
clone; it is therefore reported as a measurement, not as a certified result.

## 6. Condition 1 — exactly what remains

1. Re-derive the certification evidence in the window where `HEAD == S` exactly
   (immediately after the substantive push, before any documentary descendant).
2. Verify every produced receipt with `certify:evidence verify` **from a clean
   clone of S** before integrating, so the clean-clone verifier accepts the
   bindings. This session skipped that step and CI caught it.
3. An owner review of the `owner-manual` lane (12 `MANUAL_OWNER` harnesses)
   refreshing its `revisitDate`.

## 7. Autonomous yield — the exact owner authorization required (not taken)

The only qualifying route is a `PRINT_CLI_PROVIDER` yield-campaign receipt with
`campaignTermination: COMPLETED_SUCCESSFULLY`, a digest-bound `reasonerIdentity`
matching the GRANTED record, ≥1 completed provider call, an unchanged sibling
identity, a clean leak scan, executed at the certified checkpoint on a clean tree.

The two recorded local checkpoints both terminated `BUDGET_EXHAUSTED`
(wall 1203663/1200000 ms and 1313459/1200000 ms), so neither qualifies.

**The authorization the owner must grant** (none was taken, no paid call was
made, no record was amended):

- a NEW bounded paid provider proof run, at the certified checkpoint on a clean
  tree;
- provider `opencode-go`, model `step-5-preview-free`, print CLI the `opencode`
  binary with digest `sha256:a233de331f4438336e604d8e006fdab18e5911c4ece16de8e502eb61394c3586`
  (to be re-confirmed against the binary that will run);
- `maxQualifyingRuns: 1`;
- a wall-clock ceiling sufficient that the run **completes** — the prior runs each
  exhausted a 20-minute ceiling, so the ceiling must be raised materially (a
  longer timeout alone is not sufficient; the run must reach
  `COMPLETED_SUCCESSFULLY`);
- the qualifying-receipt contract: `campaignKind: PRINT_CLI_PROVIDER`,
  `campaignTermination: COMPLETED_SUCCESSFULLY` with at least one `COMPLETE_*`
  case, `reasonerIdentity.kind: PRINT_CLI_PROVIDER` with a valid `rid:sha256:`
  digest and exactly the declared provider/model/print-CLI,
  `terminationClass: VALID_PROVIDER_RUN`, `providerHealth.completedCalls ≥ 1`,
  `siblingIdentityChanged: false` with at least one sibling observed,
  `leakScan.result: CLEAN`, and `nightwatchTreeClean: true` at the checkpoint.

Once granted, the run is executed against the read-only sibling repositories and
its receipt is bound at the checkpoint.

## 8. PRIVATE visibility — an explicit owner/admin action

`gh repo view quantdale/night-watch --json visibility,isPrivate` →
`{"isPrivate":false,"visibility":"PUBLIC"}`. No agent changed visibility. Until
the owner transitions it back, every push and CI artifact must be treated as
public (D-149), and nothing secret, customer-derived or authentication-bearing may
enter source, artifacts or `.agent` files. After the owner changes it, Actions
must be re-verified at the same intended source SHA before terminal closure is
declared.

## 9. Remaining blockers

1. The certification evidence is not clean-clone reproducible. It must be
   re-derived in the `HEAD == S` window and verified from a clean clone before
   integration (see §6).
2. Condition 3 — the owner authorization in §7.
3. **origin/main is currently RED.** The last known GREEN exact-head CI run is
   `38220009838` @ `7871b463`. Runs `38232668446` @ `e2fb65ee`,
   `38241273555` @ `6c5f9084` and `38248210444` @ `9bd1360a` all failed
   `SEMANTIC_COMPATIBILITY` on the same single location,
   `tests/unit/projectState.test.ts` — "the real-tree evaluation resolves every
   check to probe output, and no D3 probe is MET away from the certified
   checkpoint" — reproduced in a clean clone as
   `BINDING_RECEIPT_UNVERIFIED:authenticated-capability-lifecycle` and, after the
   bindings were reverted, as a still-`SUBSTANTIVE_DESCENDANT` range. The next
   repair must restore the clean-clone `DOCUMENTARY_DESCENDANT` classification
   before further evidence is bound.
4. An intermittent load flake in `tests/unit/reasonerCli.test.ts`
   ("process-tree termination: timed-out grandchildren stop heartbeating",
   `heartbeat never stabilized`) that appears only under parallel shard load and
   passes standalone.

## 10. Minimal operator commands

```
npm run handoff:check       # the handoff route is truthful
npm run agent:check         # continuity and the claim journal agree
npm run project:check       # the release verdict
npm run typecheck           # root TypeScript
npm run typecheck:bin       # the bin lane (BLOCKING, 77/77)
npm run hardening:check     # structural invariants
npm run hardening:mutants   # 116/116 behavioural mutants (with an open claim window)
npm run campaign:synthetic  # the deterministic campaign (1983 tests)
npm run prepush             # the lane every integrate runs first
npm run gate:milestone      # the broad milestone gate
gh run list --limit 1       # the newest exact-head CI observation
```

## Safety counters

No Alphaus DEV/NEXT/production contact; no database or data-plane operation; no
sibling repository mutation (the read-only siblings were observed only through
clean-clone runs); no credential persisted; no external publication; no force
push; no history rewrite; no unauthorized paid call; no visibility change.

## Terminal diagnosis (2026-10-12) — the irreducible architectural blocker

The evidence route used by this session cannot work, and the reason is now proved
rather than suspected. `productionBindingReceiptVerifier` verifies a binding by
reading the receipt from the **gitignored** `artifacts/` tree. A clean clone of the
same commit does not contain it, so `valuesOnlyBindingChange` returns
`BINDING_RECEIPT_UNVERIFIED:authenticated-capability-lifecycle` and
`guardHoldsForChange` returns false. Proved directly on a clean clone of `4a56bf25`:

```
artifact receipts present in clean clone? NO
guardHolds in clean clone: false
reason: BINDING_RECEIPT_UNVERIFIED:authenticated-capability-lifecycle
```

The consequence for the release conditions is exact: the `certify:evidence bind`
commit `fb1a2f59` is documentary in the canonical checkout (where `artifacts/` is
present) and **substantive in a clean clone**. `project-state-check` therefore
classifies `7871b463..HEAD` as `SUBSTANTIVE_DESCENDANT` under CI, every
working-tree probe is demoted to `NOT_AT_CHECKPOINT`, and
`tests/unit/projectState.test.ts` fails on the D3 assertion
(`ui-error-taxonomy-check must not be MET at HEAD … for checkpoint …`). Four
consecutive runs (`38232668446`, `38241273555`, `38248210444`, `38262264755`)
failed on this single location, and the failure is deterministic in a clean clone.

The forward repair attempted (`db5d0ecb`, restoring
`config/release-evidence.v1.json` to the `7871b463` bytes) is itself substantive
from a clean clone, because the revert nulls an `evidenceSha` the bind had set
(`BINDING_VALUE_NULLED:evidenceSha`). The state is therefore not repairable by
further reverts inside this session's approach.

The sound repair is architectural, and it is recorded here rather than attempted:
the binding verifier must resolve its receipt from **tracked** state — for example
by reading the committed `evidence/certification/<S>/<subject>.json` through
`git show`, exactly as `probeUiErrorTaxonomy` already does — before a bind can be
verified anywhere. Until that lands, no bind committed after `7871b463` can be
clean-clone reproducible, and the terminal certification cannot be earned.

The last exact-head CI run that is GREEN is `38220009838` @ `7871b463`
(`receipt:sha256:6ed3233390fd484b828905f7`, 15/15 groups, both skip policies
`undeclared: 0`). `origin/main` is `4a56bf25` and is red; no force push or history
rewrite was used.
