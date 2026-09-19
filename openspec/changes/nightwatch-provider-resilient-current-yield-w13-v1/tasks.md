## 1. Prerequisites and C-00 activation

- [x] 1.1 Archive/sync `nightwatch-current-source-unknown-yield-w12-v1` into
      the `openspec/specs/` baseline so `current-source-yield-measurement`
      exists as an archived capability before this change's MODIFIED delta
      against it is itself archived. Touch only OpenSpec lifecycle files;
      do not alter W12's task state, evidence, or verdict.
- [x] 1.2 Re-verify live state: `npm run session:status`, `git status`/
      branch/HEAD/origin/main/worktrees, `AGENTS.md`,
      `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, W11 and W12
      SPEC/PLAN/STATE/REPORT, the parent autonomous programme, Production
      Completion Group 12, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
      `docs/DECISIONS.md`. Do not assume any SHA in this proposal is still
      live.
- [x] 1.3 Claim a fresh owned C-00 session/worktree via
      `bin/nightwatch-session.mjs`; route `.agent/ACTIVE_TASK.md` and
      `.agent/EXECUTION_PROMPT.md` to this task. Do not adopt, release, or
      modify the four pre-existing unrelated stale worktrees
      (`nightwatch-c4-real-pair-activation-v1`,
      `nightwatch-historical-wave1-v1`, `nightwatch-historical-wave2-v1`,
      `nightwatch-production-completion-programme-v1`).
- [x] 1.4 Create `.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/{SPEC,PLAN,STATE}.md`
      and commit the activation checkpoint before any Phase A fix.

## 2. Phase A — Residual register

- [x] 2.1 Build the residual register against W11, W12, Production
      Completion Group 12, the parent autonomous programme, quality-gate
      definitions, provider/runtime budget policy, measurement/aggregation,
      provider failure handling, task continuity, the validation universe,
      release/clean/local gate behavior, yield documentation, source census
      completeness, provider model discovery, current reproduction
      capability, and existing deferred/follow-up sections.
- [x] 2.2 Classify every entry per the `residual-closure` capability's
      register taxonomy (`LOCAL_FIX_REQUIRED` … `OUT_OF_SCOPE_BY_SAFETY`)
      and mark whether it blocks Phase B. Commit the register before fixing
      any entry.

## 3. Phase A — Provider-failure budget mismatch

- [x] 3.1 Locate the source of the frozen supplemental `providerFailures: 3`
      field and the `HOUR_1` runtime `providerFailures: 8` ceiling.
- [x] 3.2 Decide single-authority vs. two-distinct-concepts and implement
      the decision (rename, remove, or derive one from the other).
- [x] 3.3 Add a regression asserting the decided semantics hold at runtime.
- [x] 3.4 Add a negative probe that deliberately diverges the two values on
      a resume attempt and proves the guard fails closed rather than
      silently picking one.
- [x] 3.5 Record the resolution in `docs/DECISIONS.md` as a new entry
      succeeding D-138; do not rewrite D-138 itself.

## 4. Phase A — `gate:local` `SYNTHETIC_CAMPAIGN` timeout

- [x] 4.1 Re-run the direct synthetic campaign and the gate-dispatched
      `SYNTHETIC_CAMPAIGN` lane back-to-back on an otherwise idle host,
      capturing `uptime` and `ps --sort=-pcpu` snapshots for both runs.
- [x] 4.2 Diff the synthetic manifest file count against the base SHA W12
      measured against.
- [x] 4.3 Classify the result as exactly one of `REAL_GATE_TIMEOUT_DEFECT`,
      `STALE_BOUND`, `HOST_CONTENTION`, `EXPECTED_ENVIRONMENT_VARIANCE`,
      `DUPLICATE_WORK`, or `OTHER_MEASURED_CAUSE`. If
      `REAL_GATE_TIMEOUT_DEFECT` or `DUPLICATE_WORK`, run
      reproduce → regression → fix → negative-probe → validate → record. If
      `HOST_CONTENTION` or `EXPECTED_ENVIRONMENT_VARIANCE`, record the
      classification and its evidence without changing the timeout bound.
- [x] 4.4 Record the classification as a `residual-closure` lane receipt.

## 5. Phase A — Provider failure taxonomy

- [x] 5.1 Extend failure classification to the full taxonomy:
      `PROVIDER_ABSENT`, `PROVIDER_PROBE_TIMEOUT`,
      `PROVIDER_RUNTIME_TIMEOUT`, `PROVIDER_NONZERO_EXIT`,
      `PROVIDER_INVALID_STRUCTURED_RESPONSE`,
      `PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE`, `PROVIDER_AUTH_FAILURE`,
      `LOCAL_CLI_FAILURE`, `VALID_PROVIDER_RESPONSE`, and the
      `UNKNOWN_EXTERNAL_PROVIDER_FAILURE` fallback.
- [x] 5.2 Sanitize raw provider text before retaining it: keep exit code,
      duration, and byte counts where safe; never commit credentials or
      tokens.
- [x] 5.3 Add regression tests covering each classified transition from a
      raw CLI outcome to its taxonomy member, including the `UNKNOWN`
      fallback when the exact cause cannot be determined.

## 6. Phase A — Census truncation

- [x] 6.1 Determine whether the Ouchan file-count enumeration bound can be
      safely raised or paginated within the existing resource contract.
- [x] 6.2 If yes, implement the actually-exhaustive bounded/paginated
      census and re-run it. If no, add a mechanical check that every
      yield-metric denominator consuming the source inventory treats a
      `TRUNCATED` completeness state (`sourceInventory.completeness`) as a
      floor, never a total, reusing the existing
      `truncation-truth-discovery-paging` population/completeness
      vocabulary rather than inventing a parallel one.
- [x] 6.3 Add a regression proving the chosen closure.

## 7. Phase A — Measurement completeness

- [ ] 7.1 Cross-check the required global-metric list against
      `global-yield-aggregation.json`'s actual schema and W12's evidence.
- [ ] 7.2 For each missing metric, either wire real machine capture or add
      an explicit `NOT_CAPTURED` schema field with its reason.
- [ ] 7.3 Add a regression asserting no required metric is silently absent
      from the schema.

## 8. Phase A — Candidate/admission invariant and provider fake-progress guards

- [ ] 8.1 Add a fixture-based negative probe: a record with
      `admitted: true` and no reproduction receipt, evidence reference, or
      dossier identity must be rejected by aggregation.
- [ ] 8.2 Add a regression proving a failed provider call cannot mint a
      source action, inspected target, hypothesis, candidate, admission, or
      dossier; repeated provider failure must produce a provider-blocked
      result, never a valid zero-yield result.

## 9. Phase A — Group 12 and continuity reconciliation

- [ ] 9.1 Re-annotate Production Completion Group 12 items 12.7, 12.8,
      12.11, and 12.12 only as far as Phase A evidence truthfully supports;
      preserve existing text rather than deleting predecessor history.
- [ ] 9.2 Update `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/PROGRAMME.json`
      (`currentWave`, `exactNextAction`, `resumeRecipe`, and `YIELD_W12`'s
      status if still stale) to reflect W12's actual COMPLETE state and
      route to W13.
- [ ] 9.3 Update `docs/CURRENT_STATE.md`'s W12/W13 rows and README-governed
      yield figures for consistency with the reconciled state.

## 10. Phase A closure checkpoint

- [ ] 10.1 Run focused Phase A regressions/negative probes plus
      `npm run typecheck`, `npm run typecheck:bin`,
      `npm run hardening:check`, `npm run hardening:rules`,
      `npm run agent:check`, `npm run handoff:check`,
      `npm run project:check`, `npm run workspace:check`,
      `npm run session:check`, and `npm run validation:universe`.
- [ ] 10.2 Verify every residual register entry now resolves to `PROVEN`,
      `BLOCKED_EXTERNAL`, or an explicit `OWNER_DECISION_REQUIRED`
      classification, and commit the Phase A closure checkpoint.
- [ ] 10.3 If any entry remains `LOCAL_FIX_REQUIRED` or blocks Phase B by
      its own classification, STOP here and report `PARTIAL — BLOCKED`
      rather than opening Phase B on top of it.

## 11. Phase B — Provider-resilience policy freeze

- [ ] 11.1 Author the provider-resilience policy document (ordered
      candidate list, CLI/schema requirements, probe/runtime timeouts,
      retry counts, failover-eligible failure classes, maximum consecutive
      failures, maximum transitions, recovery permission, exhaustion
      behavior) before any Phase B probe.
- [ ] 11.2 Implement the canonical fingerprint over every bound field, plus
      mutation-detection and fail-closed resume.
- [ ] 11.3 Add negative probes: fixed failure-sequence replay determinism;
      a single-field mutation changes the fingerprint; a mutated-policy
      resume fails closed before any provider call.
- [ ] 11.4 Probe candidates in frozen order; freeze the first that
      satisfies the declared health contract; commit the freeze checkpoint
      before the first investigative call.

## 12. Phase B — W13 evaluation freeze

- [ ] 12.1 Commit the full machine-readable W13 evaluation freeze: repo
      IDs/SHAs, source census digest, provider-policy fingerprint, campaign
      matrix, run order, budgets, target-selection policy, scope,
      reproduction classes, admission rules, novelty rules, metrics,
      denominator semantics, stopping rules, leakage rules, sibling-write
      rules, zero-yield acceptability, and provider-exhaustion behavior —
      before the first investigative call.
- [ ] 12.2 Add mutation/widened-resume guard tests mirroring W12's
      evaluation-freeze integrity pattern.

## 13. Phase B — Run matrix execution

- [ ] 13.1 Execute the broad all-eight-repository run (60-minute budget)
      under the frozen provider-resilience policy.
- [ ] 13.2 Execute each of the eight repository-scoped runs in stable
      registry order (30 minutes default; Ouchan up to 60 minutes only if
      the pre-experiment census still proves it the sole current
      deterministic-reproduction repository).
- [ ] 13.3 For every run, record per-provider attribution, transitions,
      source investigation breadth, candidates, reproduction attempts, and
      termination class.

## 14. Phase B — Reproduction, admission, and novelty

- [ ] 14.1 Run every candidate through the existing mechanical
      reproduction/dossier/admission path unchanged.
- [ ] 14.2 Perform post-admission-only novelty adjudication for any
      mechanical admission.
- [ ] 14.3 Run adversarial, non-vacuity, leakage, sibling-write, and safety
      proofs; preserve any provider-blocked or safety-invalid receipts.

## 15. Phase B — Aggregation and certification

- [ ] 15.1 Mechanically aggregate all required global, per-run,
      per-repository, and per-provider metrics from preserved receipts.
- [ ] 15.2 Update the W13 REPORT/STATE, parent programme state, Group 12,
      and governed current-state/README surfaces from actual evidence.
- [ ] 15.3 Run full required validation: `npm test`, `npm run gate:local`,
      strict OpenSpec validation, and `npm run gate:clean` at the
      C-00-approved lifecycle point; do not call `gate:local` green if it
      times out.
- [ ] 15.4 Reconcile Production Completion Group 12 items 12.7, 12.8,
      12.11, and 12.12 against actual W13 evidence.
- [ ] 15.5 Perform the parent-programme final residual analysis: classify
      every remaining open item as `NONE`, `LOCALLY_CLOSABLE`,
      `OWNER_DECISION`, `EXTERNAL_CAPABILITY`, `DEV_NEXT_AUTHORIZATION`,
      `PRODUCTION_TRACK`, `METRIC_REDESIGN`, or
      `OPTIONAL_FUTURE_IMPROVEMENT`; do not recommend a new wave until this
      analysis is complete.

## 16. C-00 integration and release

- [ ] 16.1 Inspect status/diff/untracked files, declared deletions,
      secrets, sibling identity, freeze fingerprints, and evidence
      coherence before integration.
- [ ] 16.2 Fetch `origin/main`; if it advanced, reconcile through the
      session CLI (never force) and rerun full validation.
- [ ] 16.3 Integrate fast-forward; verify `HEAD == origin/main`; release
      and remove the session worktree.
- [ ] 16.4 Produce the single final W13 report (starting state, residual
      closure, provider policy, freeze, coverage, provider results, yield,
      findings, Nightwatch defects, safety, validation, Git/C-00, Group 12
      final state, remaining gaps, and exactly one terminal verdict).
