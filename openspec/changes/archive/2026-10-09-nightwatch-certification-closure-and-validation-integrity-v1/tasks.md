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

- [x] D.1 Measure the live sibling SHA read-only; record dirty state without
      altering it
      — HEAD `4e3e200db3bda7b58bc250feb7f76997d95ae2cc` on `master`, 31 commits
      after the admitted `27bb007a`, which is a clean ancestor. One
      pre-existing untracked file (`AGENTS.md`), not ours, observed and left
      exactly as found. Only `rev-parse`, `cat-file`, `archive`, `diff`,
      `status` and `log` were used.
- [x] D.2 Classify every `27bb007a` occurrence as CURRENT_SOURCE_AUTHORITY,
      HISTORICAL_RECORD, SYNTHETIC_FIXTURE_PROVENANCE, STALE_CURRENT_REFERENCE
      or OTHER; never global-search-replace the SHA
      — 4 CURRENT_SOURCE_AUTHORITY moved forward; 2 STALE_CURRENT_REFERENCE
      rebound to the authority instead of re-pinned; everything else left
      historical or synthetic. Full table in `audit.md`.
- [x] D.3 Re-derive each admitted expectation from current source with the
      existing machinery and compare mechanically
      — `deriveRealSourceExpectations` run at BOTH snapshots (the old one from
      a disposable `git archive` extraction, content-verified byte-for-byte
      against the sibling's old tree). 4 derived / 0 failures at each,
      identical invariant definitions, and IDENTICAL `ev:sha256` evidence
      digests. Verdict SEMANTICALLY_STABLE.
- [x] D.4 Re-admit on evidence, or retire through the existing lifecycle, or
      stop with a precise blocker if ambiguous
      — re-admitted. No expectation changed, was removed, or was ambiguous, so
      no retirement was needed. The recipe registry header records the
      re-admission ADDITIVELY beside the original and Phase 10A entries.
- [x] D.5 Reproduce the base failing set, then prove it resolved for the right
      reason; negative-probe currentness
      — reproduced exactly: 3 SEMANTIC_COMPATIBILITY failures
      (`oracleExpectationRealSource:63`, `phase12CoverageInventory:344`,
      `realSourceCanary:86`) plus the C-0x set. All now pass; the
      SEMANTIC_COMPATIBILITY lane is 2127 total / 2114 passed / 13 skipped /
      0 failed. Negative probe: restoring the old SHA fails exactly those
      three again, so the currentness checks still fail closed.
- [x] D.6 Confirm the sibling repository is unchanged
      — HEAD, branch and `git status` identical before and after. The reflog's
      most recent entry is the owner's own earlier checkout from `27bb007a` to
      `master`, which is the drift this campaign was authorized to admit.

## E. Control Center focus-ring qualification (carried task 6.4)

- [x] E.1 Re-measure the declared widths and the declared contrast floor from
      live task truth
      — `DECLARED_VIEWPORTS = [1440, 1080, 820, 560, 380]` read from the live
      browser lane, not from the prompt. The floor is WCAG 2.2 1.4.11 non-text
      contrast, 3:1, which the accessibility helpers already name as
      `NON_TEXT_STATUS_CONTRAST`.
- [x] E.2 Traverse keyboard-reachable controls at every declared width;
      measure computed focus-indicator contrast against the computed adjacent
      background
      — a real Tab walk per cell, measuring from computed styles. Every focus
      CUE that actually changed on focus is evaluated (outline, border, fill)
      against the first opaque ancestor backdrop, with alpha composited; a
      control qualifies when at least one cue is >= 3:1, unclipped and on
      screen. The unfocused signature is snapshotted before the walk, so a
      static border can never be mistaken for a focus indicator.
- [x] E.3 Cover all nine views, or prove mechanically why a smaller carrier set
      covers every distinct focus treatment
      — all nine views at all five widths, directly: 45 cells asserted, no
      carrier-set argument needed. Non-vacuity is named rather than counted —
      the walk must reach `a.nav-item`, `button.table-action`,
      `div.system-map-canvas`, `div.table-scroll`, `input` and `select`. The
      last two kinds are the ones a `button, a, input` sweep misses.
- [x] E.4 Negative-probe the focus token; fix minimally if a style genuinely
      fails; no redesign
      — 32 real defects found and fixed. `div.table-scroll`, `input` and
      `select` matched NO authored `:focus-visible` rule, so they fell back to
      Chrome's near-black UA ring: 1.08:1 and 1.17:1 against a 3:1 floor. Three
      rules added, all using the existing `--accent` token; the scroll port
      insets its ring because it is itself the clipping ancestor. Negative
      probe: degrading the token to `--surface` fails the lane naming the view,
      width, control, treatment, colour and ratio. No information-architecture
      or visual redesign.

## F. Production-completion tail closure

- [x] F.1 Re-read the programme ledger and identify items whose ONLY remaining
      requirement is validation, integration or release evidence
      — six: 8.11, 16.5, 16.12, 18.13, 19.14, 21.15. For groups 8, 18, 19 and
      21 the final item was the ONLY unticked entry, so every substantive
      preceding item was already complete; group 16 owed 16.5 and 16.12.
- [x] F.2 Close each against its exact recorded requirement with its evidence;
      leave owner-gated items open with the named owner action
      — all six closed against the exact text each recorded, including the two
      that named a specific blocker: 19.14's three untracked concurrent-writer
      files (all tracked at this SHA) and 16.12's sibling drift (unblocked by
      derivation, not by re-pinning). 55 items remain open in the programme and
      every one is owner-gated or a separate substantive group; none was ticked
      because it was merely named here.

## G. Certification

- [x] G.1 Full validation at one SHA
      — at `b34da5f6`: `gate:local` PASS over all 12 required groups; full
      offline regression 5249 passed / 0 failed / 18 skipped; strict OpenSpec
      64 passed / 0 failed; browser lane 9/9; UI 101/101.
- [x] G.2 Record the changed group count and definition digest truthfully
      — 11 required groups became 12. Definition digest moved to
      `sha256:c85f42c58db95b81865b011600086eb6db854886ca652dd57d572a7475ad101e`;
      gate receipt `receipt:sha256:1348f070e0f09eec5aad8af6`, persisted outside
      the repository. The digest is computed from the definition at run time
      and was never transcribed, and no past receipt was edited.
- [x] G.3 Integrate by fast-forward, release the session, remove the worktree,
      leave the canonical checkout clean
      — integrated by fast-forward at `789bddeb` with `HEAD == origin/main`
      verified by the session CLI; `origin/main` never advanced during the
      campaign, so no reconcile was needed. The session is released and its
      worktree removed through the session CLI, and the canonical checkout is
      clean. No other owner's session was adopted, edited or removed, and no
      worktree capacity was created by removing one.
