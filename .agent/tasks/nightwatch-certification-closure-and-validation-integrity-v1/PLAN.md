# Certification Closure and Validation Integrity v1

## Purpose

Close the concrete blockers and validation blind spots left by the G16.9
decomposition and the Control Center design-system campaign, then certify the
repository truthfully. Frozen intent is in `SPEC.md`; this file is living.

## Starting State

Measured at `521210f7` on 2026-09-18 from the canonical checkout:

- `HEAD == main == origin/main == 521210f7`; canonical checkout clean; five
  registered worktrees against a `maxWorktrees` bound of 8, four of them
  STALE_SESSION belonging to other owners (never adopted or removed here).
- `hardening:check` PASS (7s, 83 rules).
- **`hardening:rules` FAILS, exit 1**: `rules=83 probes=90 detected=89
  undetected=1 restored=80 statusUnchanged=true`. Probe HC-015 for
  `checkActiveMilestoneProgression` is UNDETECTED. Nothing in the repository
  runs this command, so the failure was invisible.
- 83 rules: 60 TOTALITY, 23 EXISTENCE, 21 carrying a `firstMatch` singleton
  justification. 90 probes across 83 rules.
- Quality gate: 11 required groups in a strictly linear dependency chain,
  `HARDENING -> HANDOFF_TRUTH`. No group runs the probe campaign.
- Sibling `mobingilabs/ripple-api`: HEAD `4e3e200db3bda7b58bc250feb7f76997d95ae2cc`
  on `master`, 31 commits ahead of the admitted `27bb007a`, which is a clean
  ancestor. Working tree carries one pre-existing untracked file (`AGENTS.md`)
  that is NOT ours and is not touched.

## Scope

`bin/nightwatch-session.mjs`, `bin/lib/hardening/**`, `bin/quality-gate*.mjs`,
`config/quality-gate.v1.json`, `config/hardening-rule-probes.v1.json`,
`config/validation-universe.v1.json`, `src/core/qualityGate/definition.ts`,
the real-source expectation/provenance surfaces, the Control Center browser
qualification lane, this task directory, the matching OpenSpec change, and
Nightwatch docs.

## Non-Goals

No UI redesign. No new feature group, route, adapter, authority or dependency.
No sibling write. No gate weakened and no exemption list lengthened to pass. No
self-authorization of owner-gated programme items.

## Safety Constraints

LOCAL only. Sibling repositories read-only; `ripple-api` read access is
owner-authorized for one re-derivation pass and is limited to `git
show`/`cat-file`/`rev-parse`/`diff` against committed objects. C-00 governs:
one owned session worktree, fast-forward integration, never force-push.

## Milestones

### M1 — session `--dry-run` contract

- **Status:** COMPLETE_LOCAL
- Audit every command that can receive `--dry-run`; classify each; make the
  public contract truthful; prove zero mutation adversarially with a
  before/after topology snapshot; negative-probe the regression.

### M2 — `hardening:rules` becomes gate-authoritative

- **Status:** COMPLETE_LOCAL
- Repair the rotted HC-015 probe and the rot CLASS behind it. Add a required
  `HARDENING_PROBES` group between `HARDENING` and `HANDOFF_TRUTH` through the
  gate-definition machinery: command key, dispatch, spec validator,
  validation-universe classification, receipts, and the gate-definition
  completeness tests. Prove restore-cleanliness and vacuity failure.

### M3 — G16.5 rule-quantifier audit

- **Status:** COMPLETE_LOCAL
- Classify all 83 rules; verify declared quantifier against implementation;
  make TOTALITY rules report every failing line; extend the engine self-check
  so an existence-style implementation cannot masquerade as totality; repair
  the `withoutComments` line-comment defect found in A; adversarial
  multi-failure proof.

### M4 — `ripple-api` re-derivation and re-admission

- **Status:** COMPLETE_LOCAL
- Measure live source read-only; classify every `27bb007a` occurrence;
  re-derive the four admitted recipes; re-admit on evidence; keep historical
  records historical; negative-probe currentness.

### M5 — Control Center focus-ring qualification

- **Status:** COMPLETE_LOCAL
- Carried task 6.4 only. Focus-ring contrast at every declared width across all
  nine views or a mechanically proven carrier set; computed styles, not source
  constants; negative-probe the token.

### M6 — production-completion tail closure

- **Status:** IN_PROGRESS
- Close only items whose exact remaining requirement is validation,
  integration or release evidence, each with its own evidence.

### M7 — certification

- **Status:** NOT_STARTED
- Full validation at the campaign SHA; integrate by fast-forward; release the
  session; remove the worktree; leave the canonical checkout clean.

## Architecture / Approach

Six independent surfaces, each closed with a mechanical guard and a negative
probe rather than a claim:

1. **Dry-run contract** — one declared `DRY_RUN_SUPPORT` table enforced at
   dispatch, so a command cannot be added without declaring its contract. Each
   mutating command returns at the last instruction boundary that has mutated
   nothing, after every refusal and after the whole plan is computed.
2. **Gate-authoritative probes** — a required `HARDENING_PROBES` group added
   through the gate-definition machinery (command key union, spec validator
   allowlist, runtime dispatch, validation-universe class, receipt group), not
   by appending an npm command.
3. **Quantifier truth** — the registry already carries `quantifier` and a
   `firstMatch` justification per rule; the audit verifies declared against
   implemented and extends the engine self-check to the patterns it cannot yet
   see.
4. **Real-source re-admission** — derive from current source with the existing
   machinery, compare mechanically, and re-admit only on evidence.
5. **Focus qualification** — computed styles measured in the browser lane at
   every declared width, never source constants.
6. **Tail closure** — each item closed only against its exact recorded
   requirement.

## Validation Strategy

Focused suites continuously; full certification once at the campaign SHA:
`session:status`, `session:check`, `workspace:check`, `typecheck`,
`typecheck:bin`, `hardening:check`, `hardening:rules`, `validation:universe`,
`agent:check`, `handoff:check`, `project:check`, the Control Center UI lanes
and browser lane, `gate:local`, full `npm test`, and OpenSpec validation.

Every new guard is negative-probed: the guard is shown to FAIL against a
deliberately broken input before it is trusted to pass.

## Decision Log

- Read-only commands REFUSE `--dry-run` rather than accepting it as a no-op. A
  silently ignored flag is exactly how `start --dry-run` came to mutate.
- The probe campaign is wired as a REQUIRED offline group, not behind an
  optional flag, because an optional probe lane reproduces the blind spot it
  exists to close.

## Discoveries

- `hardening:rules` was already RED at the campaign base and nothing ran it.
- `withoutComments()` deletes real code from every `read()`-based rule's view
  when a `//` comment contains `/*`.
- An explicit `--base` was never verified before `git worktree add`.
- Three of the four admitted `ripple-api` recipe source files are byte-identical
  across the SHA move; only `Routing.yaml` changed, and not at any admitted route.

## Deferred Work

- Owner-gated production-completion items stay OPEN and are listed in the final
  report with the named owner action each requires.

## Completion Criteria

Every milestone COMPLETE_LOCAL, the full validation list green at one SHA,
integration by fast-forward with `HEAD == origin/main`, session released, owned
worktree removed, canonical checkout clean.
