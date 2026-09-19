## Why

W12 measured current-source yield across all eight admitted repositories but
ended `PARTIAL — BLOCKED`: a single frozen provider (`opencode-go/glm-5.3`)
returned one valid broad-run result and then failed on all eight
repository-scoped runs (23 runtime timeouts, 33 nonzero exits), so single-
provider availability dominated the measurement instead of Nightwatch's own
investigative capability. W12 also left several measurement and governance
gaps open rather than closed: a provider-failure budget field that disagrees
with the runtime ceiling it is meant to describe (`docs/DECISIONS.md` D-138),
a `gate:local` timeout of unconfirmed cause, a two-value provider-failure
taxonomy, a truthfully truncated source census, and four unchecked Production
Completion Group 12 items (12.7, 12.8, 12.11, 12.12) that name W12's own
blocked state as their current annotation.

The owner has authorized a new wave, W13, whose scientific subject is
different on purpose: Nightwatch plus a predeclared, deterministic provider-
failover policy, not one provider's raw availability. Running that experiment
on top of unreconciled measurement gaps would make its result ambiguous, so
this change closes every locally closable inherited gap first (Phase A) and
only then freezes and executes the provider-resilient campaign (Phase B).

## What Changes

- Root-cause and close the W12 provider-failure budget mismatch (frozen
  supplemental field `3` vs. runtime ceiling `8`): identify both fields'
  origins, decide single authority vs. two distinctly-named concepts, and add
  a regression plus a negative probe that fails closed on disagreement.
- Re-measure the `gate:local` `SYNTHETIC_CAMPAIGN` timeout on a quiet host and
  classify it under one of the six causes the wave's own taxonomy requires
  (`REAL_GATE_TIMEOUT_DEFECT`, `STALE_BOUND`, `HOST_CONTENTION`,
  `EXPECTED_ENVIRONMENT_VARIANCE`, `DUPLICATE_WORK`,
  `OTHER_MEASURED_CAUSE`); repair only if evidence supports a real defect.
- Extend provider failure classification from W12's two observed classes
  (`REASONER_TIMEOUT`, `REASONER_NONZERO_EXIT`) to a fuller taxonomy that
  distinguishes absence, probe timeout, runtime timeout, nonzero exit,
  invalid structured response, quota/namespace unavailability, auth failure,
  local CLI failure, a valid response, and an explicit unknown-cause fallback.
- Resolve current-source census truncation: either produce an actually
  exhaustive bounded/paginated census of the eight-repository universe, or
  prove mechanically that no W13 metric treats the existing truncated count
  as exhaustive.
- Close the remaining W12 measurement gaps: verify every metric the current
  aggregation schema should capture is either machine-derived or explicitly
  `NOT_CAPTURED` with a reason; add a fixture-based negative probe proving the
  candidate/admission invariant rejects an `admitted: true` record with no
  reproduction receipt; add a regression proving a failed provider call
  cannot mint a source action, hypothesis, candidate, admission, or dossier.
- Reconcile Production Completion Group 12 items 12.7, 12.8, 12.11, and 12.12
  and the parent programme's stale `PROGRAMME.json` (`currentWave: "W12"`,
  `exactNextAction: "Resume W12..."`) against W12's actual COMPLETE status,
  without deleting or rewriting predecessor annotations.
- Freeze a new, machine-readable provider-resilience policy before any W13
  probe: ordered candidate list, CLI/schema requirements, probe/runtime
  timeouts, retry counts, which failure classes permit failover, maximum
  transitions, whether recovery to an earlier provider is allowed, and
  behavior once the whole policy is exhausted. The policy fingerprint changes
  if any bound dimension changes; a mutated policy fails resume closed.
- Execute the fixed W13 run matrix (one all-eight-repository broad run plus
  one scoped run per admitted repository, in stable registry order, with
  Ouchan's declared 60-minute exception) under the frozen policy, allowing
  deterministic failover mid-run while forbidding result-driven provider
  reselection, scope widening, or budget tuning.
- Change current-source-yield-measurement's run-validity rule: a run stays
  VALID under policy-governed failover as long as at least one provider in
  the frozen order returns a valid structured response and source
  investigation occurs; a run is `PROVIDER_BLOCKED` only once the entire
  frozen policy is exhausted before sufficient investigation. **BREAKING**
  relative to W12's stricter single-provider validity rule (first valid
  provider frozen for the whole wave, later candidates never probed).
- Preserve W11 and W12 as frozen, unmodified predecessor evidence; perform
  mechanical reproduction/admission and post-admission-only novelty
  adjudication exactly as before, with no weaker proof class.
- Report per-run, per-repository, and per-provider yield with explicit
  denominators, safety counters, and one of the wave's defined terminal
  verdicts, then reconcile Group 12 and integrate through C-00.

## Capabilities

### New Capabilities

- `provider-resilience-policy`: Governs the pre-declared, machine-readable
  provider ordering, health/failover contract, deterministic transition
  rules, fingerprinting, and per-provider attribution that make Nightwatch's
  provider egress resilient to a single provider's availability without
  turning failover into result-driven provider shopping.

### Modified Capabilities

- `current-source-yield-measurement`: The single-frozen-provider validity and
  "later candidates SHALL NOT be probed" rule from W12 is replaced by a
  policy-governed failover rule (a run is valid whenever the frozen provider-
  resilience policy still yields at least one valid provider response plus
  source investigation before exhaustion); provider failure classification is
  extended to the fuller taxonomy; metric aggregation gains explicit
  completeness and candidate/admission-invariant guarantees; census
  truncation semantics are made explicit and non-misleading.
- `residual-closure`: Extends the existing lane-qualification vocabulary
  (`PROVEN` / `BLOCKED_EXTERNAL` / `UNAVAILABLE_CAPABILITY`) to this wave's
  specific inherited gaps — the provider-failure budget mismatch, the
  `gate:local` timeout classification, and Group 12's four unchecked items —
  so each resolves to exactly one of those states with a receipt rather than
  remaining open prose.

## Impact

- Adds W13 task state, provider-resilience policy freeze, evaluation freeze,
  evidence, and report artifacts under `.agent/tasks/` and this OpenSpec
  change, plus focused regressions/negative probes for each Phase A residual.
- Modifies `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/PROGRAMME.json`
  (stale `currentWave`/`exactNextAction`), `docs/CURRENT_STATE.md`,
  `docs/DECISIONS.md`, `README.md` governed yield figures, and
  `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
  (12.7/12.8/12.11/12.12 annotations only — no historical items rewritten).
- Sequencing dependency: `current-source-yield-measurement` is currently
  defined only inside the not-yet-archived W12 change
  (`openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/`), not in
  `openspec/specs/`. Archiving/syncing W12 into the specs baseline is a
  prerequisite task before this change's `current-source-yield-measurement`
  delta is archived, and is called out explicitly in `design.md` and
  `tasks.md` rather than assumed.
- Uses only owner-local reasoner CLI egress and read-only sibling source
  across the same eight admitted repositories; no DEV, NEXT, production,
  database/data-plane, cloud/infrastructure, sibling write/install, issue/PR,
  external publication, force-push, or history-rewrite authority is added.
- W11's historical result and W12's broad/scoped receipts are read-only
  predecessor evidence and are not modified by this change.
