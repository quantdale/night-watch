## Why

Read-only validation on 2026-09-27 of the in-flight campaign
`nightwatch-final-product-completion-v1` checked HEAD = origin/main =
`d595c7c8`, with 27/113 tasks ticked, M0–M3 closed and M4 started. Exact-head
CI is genuinely green: runs 36243034942, 36244721098 and 36251410183, all 15
groups PASS. But several ticked tasks do not meet their spec, and four changes
weaken truth rather than strengthen it:
- a documentary commit can turn STALE lanes PROVEN;
- four live-browser security tests now always skip in CI;
- the D-04 relaxation leaks into local semantic-lane runs;
- two new release probes (G18, G12) reach MET without executed evidence.

Further certification work (M4 onward) builds directly on these surfaces, so
they must be corrected before the campaign advances.

## What Changes

- **Correct the M2 certification anchors.**
  - A PROVEN lane requires a 40-hex evidence SHA, and nulling one is a
    substantive change.
  - D-06 checks the evidence *artifact* at its SHA, not just that the commit
    exists.
  - The corrections-file guard is narrowed.
  - Fix the `liveHeadSha` TDZ crash.
  - End the lenient legacy/`HEAD` fallback.
  - Add unit tests and a stub-guard mutation probe for the checkpoint-role
    classifier.
  - Make the bin type-check ratchet real: per-file ceilings for every
    non-conforming bin, a total ceiling, stale-ceiling failure, baseline
    1571 / 13 of 76.
- **Correct the M3 validation spine.**
  - Restore the four CI-skipped security tests, whose skip checks the wrong
    browser binary.
  - Enforce skip identities in SYNTHETIC_CAMPAIGN and OWNER_PROVENANCE, with
    per-test matching and no blanket entries.
  - Report degraded topology as not PROVEN, and carry it into the gate
    receipt.
  - `gate:ui --ignore-scripts`.
  - Remove the COMPATIBILITY widening of D-04.
  - Make `gate:clean` fail on a dirty post-run checkout, and measure the real
    sibling root.
  - Genuinely reproduce and ledger the semantic flake.
  - Probe the workflow-pinning rule's compact and multi-file forms.
  - Make the synthetic twins non-vacuous.
  - Smaller assertion fixes.
- **Correct the in-flight M4 probes.**
  - Every release probe evaluates at the certified checkpoint S (HEAD == S,
    clean tree), or consumes a receipt bound to S.
  - G18 consumes a UI-harness execution receipt.
  - G12 requires a yield-campaign receipt at S.
  - G19 and G21 execute instead of pattern-matching.
  - Add the structural `implemented` honesty rule (task 5.3).
- **Restore ledger and continuity truth.**
  - Restore the 21 task IDs stripped from tasks.md, and tick 5.1.
  - Re-open the originally ticked tasks this change corrects.
  - Sync ACTIVE_TASK/STATE/PLAN with git.
  - Resolve the validated-anchor cross-guard. The anchor was back-dated to
    the base to satisfy PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE; replace
    that with an honest mechanism.
  - Promote `LEDGER_UNDISPOSITIONED_ITEM` to a terminal-closure error.
- **Workspace hygiene.**
  - Stop the out-of-band formatter that rewrote three committed test files in
    canonical while the session was live. This currently breaks
    WORKSPACE_CANONICAL_PROTECTION.
  - Fix the misleading WORKSPACE_BASE_STALE after integration.

## Capabilities

### New Capabilities

- `completion-correction-certification`: sound evidence bindings, artifact
  existence, probe-at-checkpoint semantics, and the real type-check ratchet.
- `completion-correction-validation-spine`: skip-identity totality, restored
  coverage, honest topology/clean/UI gate semantics, and bounded
  handoff relaxation.
- `completion-correction-ledger-truth`: stable task IDs, continuity/git
  agreement, an honest validated anchor, and workspace hygiene.

### Modified Capabilities

None. The parent change's capabilities (`certification-anchor-stability`,
`final-completion-governance`) already require this behaviour. This change
closes the gaps between those requirements and what landed.

## Impact

- **Code:** `bin/lib/validation-lane-state.mjs`, `bin/lib/release-evidence.mjs`,
  `bin/lib/checkpoint-role.mjs`, `bin/agent-continuity-protocol.mjs`,
  `bin/project-state-check.mjs`, `bin/bin-typecheck.mjs`,
  `config/bin-typecheck.v1.json`, `bin/lib/openspec-ledger.mjs`,
  `bin/campaign-synthetic.mjs`, `bin/lib/semantic-skip-policy.mjs`,
  `config/semantic-compatibility.v1.json`, `bin/gate-topology.mjs`,
  `bin/lib/topology-gate.mjs`, `bin/quality-gate-clean.mjs`,
  `bin/agent-state.mjs`, `bin/semantic-compat.mjs`,
  `bin/workspace-integrity.mjs`,
  `bin/lib/hardening/rules/{validation-and-gates,documentation}.mjs`,
  `config/hardening-rule-probes.v1.json`, `package.json`, and tests under
  `tests/unit/`.
- **Records:** the parent change's `tasks.md`, `.agent/ACTIVE_TASK.md`, and
  the parent task's STATE/PLAN, plus new DECISIONS entries.
- **Sequencing:** runs as a child campaign before the parent resumes M4 task
  5.2; see design D1.
- **External contact:** only what the parent's OD-3 already authorizes
  (GitHub CI read/observe; C-00 fast-forward pushes). Nothing new.
