# Tasks — Certification closure and validation integrity

## A. Session `--dry-run` contract

- [x] A.1 Audit every command that accepts `--dry-run`; classify each as
      MUTATING + SUPPORTED, MUTATING + REJECTED or READ_ONLY/NOT_APPLICABLE
      — eight commands. `--dry-run` is one global boolean (`parseArgs`, default
      `:544`, set `:559`) read by `commandIntegrate` alone (`:422`). `start`,
      `claim`, `release`, `reconcile`, `remove` mutate and ignored it;
      `release` was not even passed `options`. `status`/`check` never mutate.
- [x] A.2 Declare the contract once and enforce it at dispatch
      — `DRY_RUN_SUPPORT`, checked before any command runs;
      `SESSION_DRY_RUN_NOT_APPLICABLE` (exit 2) for `status`/`check`.
- [x] A.3 Give `start` a zero-mutation plan that still fails closed
      — returns after every refusal and after the whole plan is computed,
      immediately before the first `fs.mkdirSync`.
- [x] A.4 Extend the same semantics to `claim`, `release`, `reconcile`,
      `remove`, and move `integrate`'s guard ABOVE its fetch
- [x] A.5 Verify an explicit `--base` before the first mutation
      — `SESSION_BASE_INVALID`; previously an invalid base was discovered only
      when `git worktree add` failed, after the parent directory existed.
- [x] A.6 Make the help text state the real per-command contract
- [x] A.7 Adversarial tests with a full before/after topology snapshot
      — NW-07, 13 cases, against disposable fixtures.
- [x] A.8 Negative-probe the regression
      — reintroducing the defect fails 5 of 13, including the capacity case.

## B. `hardening:rules` becomes gate-authoritative

- [x] B.1 Repair probe HC-015 and the active-task indirection class behind it
      — the rule resolves its subject through `.agent/ACTIVE_TASK.md`; the probe
      named a fixed task directory, so it stopped mutating the file the rule
      reads the moment the active task changed. Probes may now use
      `<ACTIVE_TASK_DIR>`, resolved by the campaign the same way the rule
      resolves it; an unresolvable placeholder throws rather than probing the
      wrong file.
- [x] B.2 Prove probe-campaign safety: deterministic restore, restore after
      failure, byte-identical `git status`, no untracked debris, non-zero rule
      and probe counts, mechanically verified `statusUnchanged`
      — `tests/unit/hardeningProbeCampaign.test.ts`, 9 cases against a
      disposable repository carrying the REAL campaign and a synthetic two-rule
      engine. Vacuity is now stated explicitly (`VACUOUS_CAMPAIGN`) instead of
      inferred from a zero rule count.
- [x] B.3 Add the required `HARDENING_PROBES` group between `HARDENING` and
      `HANDOFF_TRUTH` through the gate-definition machinery
      — 11 required groups became 12; `HANDOFF_TRUTH` now depends on
      `HARDENING_PROBES`.
- [x] B.4 Update the command-key union, the spec validator allowlist, the
      runtime dispatch and the timeout class
      — `QUALITY_GATE_COMMAND_KEYS`, `bin/quality-gate-spec.mjs`,
      `bin/quality-gate.mjs` (`npm run hardening:rules`), MEDIUM.
- [x] B.5 Register the executable in the validation universe and lane state
      — `bin/lib/hardening/probe-campaign.mjs` and `bin/hardening-check.mjs`
      were already classified; `validation:universe` PASS.
- [x] B.6 Gate integrity tests: deleting the group fails definition truth,
      an unknown command key fails, the mapping is total, the receipt carries
      the group, dependency order stays deterministic, a failed probe makes the
      gate non-green, vacuity fails, dirty-state leakage fails
      — 7 cases in `tests/unit/phase23QualityGate.test.ts` plus recorded probes
      HC-090 (group removed) and HC-091 (group downgraded to optional), both
      DETECTED, so the gate cannot lose the group OR hide it behind an optional
      flag without `hardening:check` going red.
- [x] B.7 Refresh the gate-definition and inventory digests through their
      canonical mechanisms; never hand-copy a digest or edit a past receipt
      — the digest is computed from the definition at run time, never stored:
      `quality-gate-spec` renders `sha256:c85f42c58db95b81865b011600086eb6db854886ca652dd57d572a7475ad101e`
      at this checkpoint. No receipt was edited.

## C. G16.5 rule-quantifier audit

- [x] C.1 Classify all 83 rules and verify the declared quantifier against the
      implementation; record every classification
      — 60 TOTALITY, 23 EXISTENCE, 21 carrying a recorded `firstMatch`
      singleton justification. Full table in this change's `audit.md`,
      generated from the live registry rather than transcribed. The two-value
      vocabulary is the minimum that describes the live set; UNIQUENESS,
      CARDINALITY and ABSENCE were considered and rejected with reasons.
- [x] C.2 Make every TOTALITY rule evaluate all occurrences and report each
      failing line in deterministic order
      — four rules abandoned their own scan with `fail(...); return;` inside the
      subject loop: `checkAlphausHandoffBoundary`, `checkFindingFrontierBoundary`,
      `checkC15bSystemMapBoundary`, `checkC02bProtobufBoundary`. The first two
      reached that path for real. Every TOTALITY rule now iterates (0 with no
      iteration construct) and no rule is incapable of failing.
- [x] C.3 Extend the engine self-check to the existence-masquerading-as-
      totality patterns it cannot currently see
      — `checkRuleEngineSoundness` now fails a TOTALITY rule that returns
      immediately after failing inside a loop, naming the loop line AND the
      return line. Nesting is computed by indentation, not brace matching: the
      blanked view still contains strings and regex literals, and the first
      brace-matching form reported a `return` sitting in a top-level
      try/catch. Probed by HC-093.
- [x] C.4 Repair the `withoutComments()` line-comment defect and probe it
      — it stripped block comments with a regex BEFORE line comments, so a `//`
      comment containing a block-comment opener deleted the real code up to the
      next closer from the view every `read()`-based rule sees. 27 tracked
      files contain such a comment. `withoutComments` and
      `codeWithCommentsBlanked` now share one `commentMask` scanner. Guarded
      behaviourally by `RULE_ENGINE_CODE_VIEW_DELETES_CODE` and probed by
      HC-092, verified to raise its own error code.
- [x] C.5 Adversarial multi-failure proof: first occurrence valid, two later
      occurrences invalid, both reported
      — `tests/unit/hardeningRuleQuantifiers.test.ts`, 6 cases running the REAL
      rules against disposable repositories with deliberately absent cones.
      Negative-probed: restoring the early exit fails the multi-failure case.
- [x] C.6 Preserve the completed 16.6 work rather than replacing it
      — the `quantifier`/`subject`/`firstMatch` metadata and the existing
      first-match `.exec()`/`.match()` check are unchanged; C.3 adds a new
      section beside them.

## D. `ripple-api` re-derivation and re-admission

- [ ] D.1 Measure the live sibling SHA read-only; record dirty state without
      altering it
- [ ] D.2 Classify every `27bb007a` occurrence as CURRENT_SOURCE_AUTHORITY,
      HISTORICAL_RECORD, SYNTHETIC_FIXTURE_PROVENANCE, STALE_CURRENT_REFERENCE
      or OTHER; never global-search-replace the SHA
- [ ] D.3 Re-derive each admitted expectation from current source with the
      existing machinery and compare mechanically
- [ ] D.4 Re-admit on evidence, or retire through the existing lifecycle, or
      stop with a precise blocker if ambiguous
- [ ] D.5 Reproduce the base failing set, then prove it resolved for the right
      reason; negative-probe currentness
- [ ] D.6 Confirm the sibling repository is unchanged

## E. Control Center focus-ring qualification (carried task 6.4)

- [ ] E.1 Re-measure the declared widths and the declared contrast floor from
      live task truth
- [ ] E.2 Traverse keyboard-reachable controls at every declared width;
      measure computed focus-indicator contrast against the computed adjacent
      background
- [ ] E.3 Cover all nine views, or prove mechanically why a smaller carrier set
      covers every distinct focus treatment
- [ ] E.4 Negative-probe the focus token; fix minimally if a style genuinely
      fails; no redesign

## F. Production-completion tail closure

- [ ] F.1 Re-read the programme ledger and identify items whose ONLY remaining
      requirement is validation, integration or release evidence
- [ ] F.2 Close each against its exact recorded requirement with its evidence;
      leave owner-gated items open with the named owner action

## G. Certification

- [ ] G.1 Full validation at one SHA
- [ ] G.2 Record the changed group count and definition digest truthfully
- [ ] G.3 Integrate by fast-forward, release the session, remove the worktree,
      leave the canonical checkout clean
