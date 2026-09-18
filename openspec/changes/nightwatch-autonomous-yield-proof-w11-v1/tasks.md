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

- [ ] M5.1 Execute through the ordinary `nightwatch-agent campaign run` path.
- [ ] M5.2 Execute across a materially wider slice under host-owned
      `--repository` scope.
- [ ] M5.3 Resume one checkpoint to prove scope and budget identity.

## M6. Yield accounting

- [ ] M6.1 Derive all metrics mechanically; state every denominator.

## M7. Leakage and anti-cheating audit

- [x] M7.1 Inspect every reasoner-visible historical request blob — 78 blobs
      across 14 cases scanned against all six hidden fields; **0 leakage
      events**. The hunt asserts and throws on leakage, so a leak would have
      aborted the case rather than being reported beside a yield.
- [x] M7.2 Prove the leakage checker live with canaries —
      `tests/unit/w11LeakageCanary.test.ts`, 5 tests: each hidden field is
      caught when planted, a six-field leak reports all six, clean blobs stay
      clean, real fixture contexts carry none of their own hidden truth, and an
      empty field manufactures neither a false clean nor a false leak.

## M8. Adversarial and resilience checks

- [ ] M8.1 Prove widened-resume, changed-budget, changed-provider and
      changed-corpus all fail closed.
- [ ] M8.2 Prove candidate-without-reproduction, forged evidence ref,
      fabricated `reproductionCount` and unsupported repository scope all
      refuse.
- [ ] M8.3 Prove malformed provider output and provider timeout fail closed
      without manufacturing progress.
- [ ] M8.4 Prove sibling identity is unchanged across reproduction.

## M9. Repair only evidence-found defects

- [ ] M9.1 For each Nightwatch defect exposed: preserve evidence, reproduce in
      a focused regression, fix minimally, rerun the focused proof and any
      affected arm.

## M10. Group 12 closure

- [ ] M10.1 Close Group 12 tasks 12.1-12.12 against their live wording.
- [ ] M10.2 Publish the measured yield into the governed README and
      current-state blocks.
- [ ] M10.3 Full validation, integrate, release.
