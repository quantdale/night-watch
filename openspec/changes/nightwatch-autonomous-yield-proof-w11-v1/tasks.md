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
- [ ] M0.5 Freeze the reachability threshold and record the preflight verdict
      against it.

## M1. Freeze the evaluation

- [ ] M1.1 Commit the historical arm's frozen definition before its first
      evaluation.
- [ ] M1.2 Bind the campaign fingerprint to provider, corpus, budgets, scoring
      and stopping condition.
- [ ] M1.3 Prove a widened resume fails closed.

## M2. Strict historical EXACT_REDISCOVERY

- [ ] M2.1 Run the frozen historical arm with the real configured reasoner.
- [ ] M2.2 Record per-case disposition, reason and hidden-target distance.
- [ ] M2.3 Include the negative controls and report false positives explicitly.
- [ ] M2.4 Classify and separately report `ENVIRONMENT_BLOCKED`, excluding it
      from both sides of every rate.

## M3. Analyze without overfitting

- [ ] M3.1 Classify every miss into a bounded category.
- [ ] M3.2 Separate model-efficacy results from Nightwatch harness defects.

## M4. Freeze the unknown-defect campaign

- [ ] M4.1 Commit repository set, SHAs, scopes, budgets and stopping condition
      before execution.

## M5. Run the owner-local unknown-yield campaign

- [ ] M5.1 Execute through the ordinary `nightwatch-agent campaign run` path.
- [ ] M5.2 Execute across a materially wider slice under host-owned
      `--repository` scope.
- [ ] M5.3 Resume one checkpoint to prove scope and budget identity.

## M6. Yield accounting

- [ ] M6.1 Derive all metrics mechanically; state every denominator.

## M7. Leakage and anti-cheating audit

- [ ] M7.1 Inspect every reasoner-visible historical request blob.
- [ ] M7.2 Prove the leakage checker live with canaries.

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
