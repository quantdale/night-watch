## Context

The parent campaign `nightwatch-final-product-completion-v1` is live at M4,
with its session OWNED and INTEGRATED at `d595c7c8` = origin/main. `audit.md`
lists 31 validated findings, each with file:line evidence. The parent's
design decisions (D1–D14) and owner decisions (OD-1..OD-4) stay in force.
This change only closes the gap between them and what landed, and adds no
scope.

## Goals / Non-Goals

**Goals:** remove the regressions (VB-01, VC-01, VC-04); make every
certification surface that M2–M4 touched sound; restore ledger and
continuity truth; return the parent to a state where M4 task 5.2 onward
builds on correct foundations.

**Non-Goals:** any parent milestone beyond the corrections (M5–M14 stay in
the parent); new authorizations; reverting green CI work that validated
correctly.

## Decisions

### D1. Execution model: a child campaign between parent checkpoints

C-00 permits one writer per worktree, and ACTIVE_TASK routes exactly one
task, so the sequence is:

1. The parent session commits its current work, integrates (already
   INTEGRATED) and releases. Canonical must be clean first (VE-01; task 1.2
   is an owner step).
2. A new session starts for task `nightwatch-final-completion-corrections-v1`.
   ACTIVE_TASK routes to it, with `CHILD OF: nightwatch-final-product-completion-v1`
   recorded in SPEC.
3. At close, ACTIVE_TASK routes back to the parent at IN_PROGRESS with Next
   action "M4 task 5.2". The parent's tasks re-opened by this change are
   re-ticked only with this change's evidence.

Alternative: fold the fixes into the parent session as an unplanned
milestone. Rejected: the owner asked for a separate change and session, and
a distinct ledger keeps the correction auditable.

### D2. Evidence and lane bindings (VB-01..VB-06)

- A lane with class PROVEN SHALL carry a 40-hex `evidenceSha`. The
  values-only guard classifies any value → null transition on a PROVEN
  subject, and any class change, as substantive.
- Bindings gain a closed `artifactPaths` list. D-06 checks
  `git cat-file -e <sha>:<path>` per path, for conditions and lanes. A miss
  makes that condition not MET with `EVIDENCE_ARTIFACT_ABSENT_AT_SHA`; it
  does not fail the whole check.
- Corrections guard: an appended correction entry is admissible only when
  the same commit removes exactly the archive line it exempts. Otherwise the
  commit is substantive. A DECISIONS entry records this narrower semantics.
- The compatibility window closes. project:check requires the bindings file
  and its schema, a schema-invalid entry never falls through, and `HEAD`
  becomes an invalid evidence token everywhere.
- The checkpoint-role classifier gets unit tests (values-only, append-only,
  rename, add-key, null, merge with `-m`) plus a mutation probe that stubs
  `guardHoldsForChange`. `isApprovedCheckpointPath` excludes guarded paths.
  The dead constant is removed.

### D3. Probe-at-checkpoint semantics (VD-01..VD-05)

A release probe SHALL resolve MET only in one of two ways:
- (a) by executing in a checkout whose HEAD equals `certifiedCheckpointSha`
  with a clean tree, or
- (b) by consuming a machine-readable receipt whose `evidenceSha` equals S.

Otherwise it resolves `NOT_AT_CHECKPOINT`, which is not MET.

Receipts come from gate groups:
- G18 from a UI-harness execution receipt emitted by UI_CONTROL_CENTER;
- G12 from a yield-campaign receipt with `passed: true`, `nightwatchSha == S`
  and campaign kind (the W13 aggregate is historical context only);
- G21 from a synthetic non-VALID artefact refused before any effect;
- G19 from rendering the effective configuration and validating each
  declared variable.

The `implemented` honesty rule parses `RELEASE_ADVANCE_CHECKS` and the
collector keys structurally, fails on a mismatch in either direction, and is
mutation-probed.

### D4. Skip-identity totality (VC-01, VC-02, VC-09)

- Every Playwright-running gate lane attaches the per-shard skip-identity
  reporter: SYNTHETIC_CAMPAIGN, OWNER_PROVENANCE, SEMANTIC_COMPATIBILITY and
  npm test.
- Matching is by test identity (file plus full title path) with a reason
  field. Blanket entries are removed, and bare `test.skip()` calls gain
  declared reasons.
- A probe proves that an undeclared skip, and a missing report, fail the
  lane.
- The browser-availability skip resolves the executable of the configured
  channel (system Chrome), or is removed. CI must show the four tests
  executing.

### D5. Honest gate semantics (VC-03..VC-08, VC-10, VC-11)

- **Topology:** any unexercised absence, or a degraded envelope, yields
  `runnerTopologyClass: PROVEN_DEGRADED` (not certifying) or `NOT_PROVEN`.
  The envelope label and the not-exercised counts go into the TOPOLOGY gate
  details. The topology receipt is persisted as a CI job artifact
  (`actions/upload-artifact`, SHA-pinned). Availability is resolved from
  PATH, which is the same source the spawn uses.
- **D-04:** the relaxation applies only when the parent gate label is CI or
  CLEAN. `semantic-compat` forwards the parent label instead of overwriting
  it.
- **gate:clean:** a dirty post-run checkout fails. The real
  `DEFAULT_SIBLING_ROOT` is also measured, read-only. Early-exit receipts
  carry siblingMode and the exact versions.
- **gate:ui:** gains `--ignore-scripts`. Verify esbuild still builds; if it
  needs its install script, record a declared exception in DECISIONS rather
  than silently running scripts.
- **Flake:** reproduce at the original 2 s bound under load, fix the true
  cause (or record why none exists), and create a tracked flake ledger file.

### D6. Honest validated anchor (VA-03)

The parent back-dated `LAST_VALIDATED_IMPLEMENTATION_SHA` to the base
because project:check fails when the task anchor is a substantive descendant
of the project-state baseline. The fix is to have project:check classify a
task anchor ahead of the project baseline as `TASK_AHEAD_OF_PROJECT_BASELINE`
(ATTENTION), consistent with the parent D4 demotion model, only while the
active task is IN_PROGRESS and the anchor is an ancestor of HEAD. The
anchors are then set to the true validated SHA.

Alternative: advance the project baseline in every milestone. Rejected,
because it moves certification authority mid-campaign.

### D7. Ledger truth (VA-01, VA-02, VA-04, VA-05)

- A ledger check compares each checklist line's `N.M` ID against the
  bootstrap version of tasks.md, and fails when an ID is dropped or renamed.
- `LEDGER_UNDISPOSITIONED_ITEM` becomes an error when the active task
  declares a terminal phase, and a disposition token counts only as a
  trailing marker after the closing `~~`.
- A session record whose HEAD equals the remote after integration reports
  INTEGRATED_CURRENT instead of BASE_STALE.

### D8. Formatter containment (VE-01)

The repository has no formatter configuration, so an editor or global tool
rewrote committed files. Add a repository-level `biome.json` with the
formatter and organize-imports disabled (a no-op for any biome run) and an
`.editorconfig` matching house style. Canonical-dirty detection already
exists; the owner removes the current stray edits.

## Risks / Trade-offs

- [Restoring the 4 security tests may re-expose the sun_path failure on CI]
  → 736e0e09 already fixed the socket path. CI must be observed green with
  the tests executing, and a regression pins that they are not skipped in CI.
- [Probe-at-checkpoint makes MET harder to reach mid-campaign] → intended.
  MET is only meaningful at S, and mid-campaign runs report
  NOT_AT_CHECKPOINT.
- [Stricter skip matching may fail lanes on first run] → build the
  allowlist from the current measured skip set, one reviewed entry per test,
  before enforcing.
- [`TASK_AHEAD_OF_PROJECT_BASELINE` could read as weakening] → it is
  ATTENTION, not PASS-of-certification. It is bounded to IN_PROGRESS tasks
  and ancestor-of-HEAD anchors, and a probe covers a non-ancestor anchor.
- [Parent and child share files] → strictly serial sessions (D1). The child
  records every parent task it re-opens.
