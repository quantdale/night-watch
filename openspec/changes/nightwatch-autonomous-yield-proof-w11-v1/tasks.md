# Tasks — W11 autonomous yield proof

## M0. Preflight

- [x] M0.1 Census the current host toolchain — Node v22.22.1, Go 1.25.3, Git
      2.43.0, bubblewrap 0.9.0, opencode CLI 1.18.31 at
      `/home/dalepalaca/.opencode/bin/opencode`.
- [x] M0.2 Census the admitted repositories from current Nightwatch scope data
      — 8/8 CURRENT, every live checkout SHA equal to its `expectedSourceSha`;
      4,124 eligible source files, 1,120 executable, 152 distinct executable
      targets, not truncated; refusals `NO_SUPPORTED_EXECUTOR` 1620,
      `PACKAGE_TEST_FILES_ABSENT` 1327, `VENDOR_DIRECTORY_ABSENT` 57. All
      executable capability is in `mobingilabs/ouchan`.
- [x] M0.3 Record the provider preference list BEFORE probing, then probe in
      order and take the first pass — `opencode-go/omen-alpha` confirmed ABSENT
      from the current 341-entry list; `opencode-go/glm-5.3` PASSED at
      preference #2 with exit 0, 16,281 ms, 137 B stdout, 0 B stderr and a
      valid `nightwatch.reasoner-turn-response.v1`; preferences #3-#5 not
      probed.
- [x] M0.4 Census the historical corpus — 9 fixture cases including the
      negative control `bench-negative-quiet-000`; 255 mined records, 234
      definable cases, 5 carrying both `knownFailingTest` and `minedReplay`.
- [x] M0.5 Freeze the reachability threshold and record the preflight verdict
      against it — frozen in `evaluation-freeze.historical.json`
      (`reachabilityThreshold`) and met: provider probe PASS, census non-zero,
      8 repositories visible (>1 required), 152 reproduction-capable targets
      (>0 required), historical corpus available, mechanical admission path
      available, leakage guard green, hardening and gate baseline green.

## M1. Freeze the evaluation

- [x] M1.1 Commit the historical arm's frozen definition before its first
      evaluation — committed at `eeceec8e`, fingerprint
      `sha256:824deef9922975feab5af69f`; the first evaluation ran afterwards.
- [x] M1.2 Bind the campaign fingerprint to provider, corpus, budgets, scoring
      and stopping condition — all present in the freeze and asserted by
      `w11EvaluationFreezeIntegrity`.
- [x] M1.3 Prove a widened resume fails closed — `assertScopeContinuity`
      raises `CAMPAIGN_SCOPE_MISMATCH`; covered by `localCampaign.test.ts` and
      re-proved for the unknown arm in M8.

## M2. Strict historical EXACT_REDISCOVERY

- [x] M2.1 Run the frozen historical arm with the real configured reasoner —
      `opencode-go/glm-5.3`, 14/14 cases, 66.8 min, 78 reasoner calls.
- [x] M2.2 Record per-case disposition, reason and hidden-target distance —
      REPORT.md table and `evidence/historical-arm-result.json`. **EXACT = 0,
      exact rate 0/13 = 0.00**, 10 near matches; every non-EXACT case records
      which condition(s) it failed and by how much.
- [x] M2.3 Include the negative controls and report false positives explicitly
      — 1 control scored, outcome MISS, 0 candidates, **0 false positives**.
- [x] M2.4 Classify and separately report `ENVIRONMENT_BLOCKED`, excluding it
      from both sides of every rate — **0 on this host**; the exclusion rule is
      implemented and asserted, and did not bind because every case executed.

## M3. Analyze without overfitting

- [x] M3.1 Classify every miss into a bounded category — 10 near matches all
      `HIDDEN_FAILING_TEST_NOT_NAMED` (5 with a keyword-recall shortfall as
      well), 3 mined misses `REPLAY_NEVER_REQUESTED` with zero recall, 1
      correct negative-control MISS.
- [x] M3.2 Separate model-efficacy results from Nightwatch harness defects —
      no Nightwatch framework defect was exposed. One W11 harness defect was
      found and fixed (candidates mislabelled as admissions). The unnamed
      hidden test is neither: it is a benchmark-reachability limit, proven by
      the test filename being absent from the whole visible context for all 8
      fixtures and being a fix-ADDED file for mined cases.

## M4. Freeze the unknown-defect campaign

- [x] M4.1 Commit repository set, SHAs, scopes, budgets and stopping condition
      before execution — `evaluation-freeze.unknown.json`, fingerprint
      `sha256:6145bd666dd08369ec38b018`, frozen AFTER the historical arm closed
      so historical results cannot bias this arm's scope, and BEFORE any
      unknown-arm execution. Binds all eight repository SHAs, four frozen runs,
      HOUR_1 budgets, the stopping condition, permitted reproduction classes,
      the unchanged admission rule and the previously-unknown classification
      vocabulary.

## M5. Run the owner-local unknown-yield campaign

- [ ] ~~M5.1 Execute through the ordinary `nightwatch-agent campaign run` path~~
      — BLOCKED. The path was exercised and is correct; the run is invalid
      because all 6 reasoner calls returned `REASONER_TIMEOUT` with zero
      provider response bytes. The `opencode-go` subscribed namespace is
      degraded or quota-exhausted.
- [ ] ~~M5.2 Execute across a materially wider slice under host-owned
      `--repository` scope~~ — BLOCKED by the same outage. Standing ceiling
      recorded regardless: reproduction capability exists in
      `mobingilabs/ouchan` alone, so investigation breadth is 8 and execution
      breadth is 1.
- [x] M5.3 Resume one checkpoint to prove scope and budget identity — proven on
      the real checkpoint: a changed resume scope fails closed with
      `CAMPAIGN_SCOPE_MISMATCH` (exit 2) and an unapproved id with
      `REAL_SOURCE_SCAN_APPROVED_UNIVERSE`, both before any provider call.

## M6. Yield accounting

- [x] M6.1 Derive all metrics mechanically; state every denominator —
      `evidence/yield-accounting.json`, generated from the preserved arm
      documents rather than hand-counted. Every denominator is named, and six
      figures the first arm run did not persist are reported as NOT_CAPTURED
      with the reason instead of being estimated; the runner now derives them
      through `deriveEfficacyCaseMetrics` for future runs. The unknown arm
      contributes to no denominator.

## M7. Leakage and anti-cheating audit

- [x] M7.1 Inspect every reasoner-visible historical request blob — 78 blobs
      across 14 cases, **0 leakage events**. The hunt asserts and throws on
      leakage, so a leak aborts the case rather than being published beside a
      yield.
- [x] M7.2 Prove the leakage checker live with canaries —
      `tests/unit/w11LeakageCanary.test.ts`, 5 tests.

## M8. Adversarial and resilience checks

- [x] M8.1 Prove widened-resume, changed-budget, changed-provider and
      changed-corpus all fail closed — `CAMPAIGN_SCOPE_MISMATCH`; resume runs
      under the checkpoint's stored policy; the arm refuses an unfrozen model
      with exit 2 before any call; the freeze fingerprint and EXACT thresholds
      are pinned to the live constants by test.
- [x] M8.2 Prove candidate-without-reproduction, forged evidence ref,
      fabricated `reproductionCount` and unsupported repository scope all
      refuse — 4 live `MISSING_REPRODUCTION` refusals; unapproved scope refused
      `REAL_SOURCE_SCAN_APPROVED_UNIVERSE`; the dossier gate returns null below
      `reproductionCount` 1; forged-ref and fabricated-count refusals remain
      covered by `autonomousFinding` / `currentSourceFindingAdmission`.
- [x] M8.3 Prove malformed provider output and provider timeout fail closed
      without manufacturing progress — malformed output covered by
      `reasonerCli`; the timeout half was proven on live traffic by the outage
      itself: 6 timeouts produced 0 actions, 0 targets, 0 candidates, 0
      reproductions and `dossierStatus: NONE`.
- [x] M8.4 Prove sibling identity is unchanged across reproduction — all 8
      HEADs equal their frozen SHAs; newest sibling content mtime across all
      eight is ~18 h BEFORE W11 began. Sibling writes: 0.

## M9. Repair only evidence-found defects

- [x] M9.1 For each defect exposed: preserve evidence, reproduce in a focused
      regression, fix minimally, rerun the focused proof — **no Nightwatch
      framework defect was exposed.** Two defects were found in W11's own work
      and fixed: the arm aggregation mislabelled proposed candidates as
      admissions (corrected by re-derivation from preserved evidence, no
      re-run), and the active PLAN/STATE used shapes the coherence guard does
      not recognise (corrected; guard now passes). The unnamed hidden test is
      deliberately NOT treated as a defect: it is a benchmark-reachability
      limit, and the model missing an inference is an efficacy result.

## M10. Group 12 closure

- [x] M10.1 Close Group 12 tasks 12.1-12.12 against their live wording — closed
      truthfully: 12.1-12.6, 12.9 and 12.10 met; 12.7 BLOCKED; 12.8, 12.11 and
      12.12 PARTIAL. No box was ticked "close enough".
- [x] M10.2 Publish the measured yield into the governed README and
      current-state blocks — published. The governed figures stay 0/0 because
      both remain true, with the explanation and the unexecuted-arm status
      recorded beside them.
- [ ] ~~M10.3 Full validation, integrate, release~~ — PARTIAL. `gate:local`
      PASS over all 12 required groups; full regression and clean gate recorded
      in STATE. Release is not claimed while 12.7 is blocked.
