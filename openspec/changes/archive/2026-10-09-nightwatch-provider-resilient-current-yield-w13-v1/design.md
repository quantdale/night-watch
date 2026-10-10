## Context

W12 (`nightwatch-current-source-unknown-yield-w12-v1`) is task-complete
(31/31, `STATE.md` Status: COMPLETE) with verdict `PARTIAL — BLOCKED`: its
broad run reached all eight admitted repositories validly, but all eight
repository-scoped runs failed before any source action once the single
frozen provider (`opencode-go/glm-5.3`) started timing out and exiting
nonzero. That result cannot distinguish "Nightwatch found nothing" from
"the provider stopped answering," which is the confound W13 exists to
remove. W12 also left open, in its own preserved evidence:

- A provider-failure budget disagreement recorded but not investigated:
  the frozen W12 supplemental freeze field `providerFailures: 3` versus the
  existing `HOUR_1` runtime policy's `providerFailures: 8` ceiling
  (`docs/DECISIONS.md` D-138, `STATE.md`
  `RUNTIME_POLICY_MISMATCH_RECORDED`).
- A `gate:local` `SYNTHETIC_CAMPAIGN` timeout (receipt
  `sha256:c5107a12b6bd0a89263c5c2`) after nine other groups passed, on a
  105-file/~1897-test serial lane against a 600s `MEDIUM` budget. A prior,
  distinct incident (`158a97b8`, preserved in project memory) root-caused an
  equivalent timeout to host load contention (16.4 on 20 cores) rather than
  a tree regression — a precedent method, not proof for this occurrence.
- A two-value provider-failure taxonomy (`REASONER_TIMEOUT`,
  `REASONER_NONZERO_EXIT`) that cannot separate absence, quota exhaustion,
  auth failure, or a malformed response from a plain timeout.
- A current-source census truthfully `TRUNCATED` at Ouchan's file-count
  bound while still reporting 4,124 admitted files as a headline number.
- Four Production Completion Group 12 items (12.7, 12.8, 12.11, 12.12) whose
  current checkbox state and annotation both name W12's blocked status.
- `current-source-yield-measurement` (introduced by W12) lives only inside
  the not-yet-archived W12 change directory, not in `openspec/specs/`; no
  capability named anything "provider" exists in the specs baseline at all.

W13 is authorized to fail over between providers mid-experiment on purpose —
the scientific subject becomes "Nightwatch plus a predeclared failover
policy," not one provider's raw intelligence — but only under a policy fixed
and committed before the first probe, with deterministic (never
result-driven) transitions and full per-provider attribution preserved in
every receipt.

## Goals / Non-Goals

**Goals:**

- Close every Phase A residual listed above with a real root cause, a
  regression, and (where the prompt requires it) a negative probe — not a
  reclassification in prose alone.
- Freeze a provider-resilience policy capability that is reusable by future
  waves, not a one-off W13 constant.
- Change `current-source-yield-measurement`'s run-validity rule so a
  policy-governed failover run can be VALID without pretending a
  provider-exhausted run is a zero-yield run.
- Execute the fixed 9-run matrix (1 broad + 8 scoped) and certify it exactly
  as W11/W12 were certified: full validation, C-00 integration, one terminal
  verdict.
- Leave W11 and W12 byte-for-byte as frozen predecessor evidence.

**Non-Goals:**

- Redesigning the campaign engine, dossier/admission pipeline, or reasoner
  tool protocol beyond what a concrete Phase A defect or a W13 measurement
  blind spot requires (Section 35 of the owner prompt: no unrelated
  refactor).
- Widening reproduction authority to repositories that still have no
  admitted executor (Section 23: reproduction breadth stays separate from
  investigation breadth).
- Adding a general shell, new network egress path, or any authority beyond
  the existing reasoner CLI and read-only sibling access.
- Making `gate:local`'s timeout pass by raising the timeout class — that is
  an owner decision, not something this change self-authorizes (see
  Decisions below).

## Decisions

### D1. One change, two gated milestone phases, not two changes

Owner Section 0 pre-authorizes exactly one task id
(`nightwatch-provider-resilient-current-yield-w13-v1`) and Wave `W13`. This
change's `tasks.md` encodes Phase A (residual closure) as the milestones
that gate Phase B (W13 execution), mirroring the M0–M11 structure W12 used
in `.agent/EXECUTION_PROMPT.md`. Alternative considered: two independent
changes (a standalone residual-closure change, then a separate W13 change).
Rejected because it splits one pre-authorized task id across two review/
archive cycles and because several Phase A items (provider taxonomy,
run-validity semantics) are inputs the Phase B spec delta directly depends
on — they are not independently shippable.

### D2. Archive/sync W12 before this change's spec delta is archived

`current-source-yield-measurement` is declared "Modified" in `proposal.md`,
but it does not yet exist in `openspec/specs/` — only inside
`openspec/changes/nightwatch-current-source-unknown-yield-w12-v1/specs/`.
This change's `tasks.md` includes an explicit early task to archive or sync
W12 into the specs baseline before this change is itself archived, so the
"Modified" delta has a real baseline to modify. This is a sequencing
dependency on the OpenSpec lifecycle, not a code change, and does not touch
W12's evidence, verdict, or task state. Alternative considered: declare
`current-source-yield-measurement` as a second "New Capability" instead of
"Modified," avoiding the ordering dependency entirely. Rejected because W13
is explicitly a modification of W12's validity/taxonomy rules, and treating
it as brand-new would silently lose the requirements W12 already proved
(candidate/admission invariant, leakage gating, novelty timing) instead of
carrying them forward.

### D3. Provider-resilience policy is its own capability, schema-first

The policy is authored as a machine-readable JSON document (parallel to
W12's `provider-selection-policy.json` and `evaluation-freeze.json`) and
validated by a dedicated integrity module, not folded into the general
evaluation freeze. It binds, at minimum: ordered candidate list; CLI/schema
compatibility; probe and runtime timeouts; per-provider retry count;
failure classes that are/are not failover-eligible; maximum consecutive
failures before transition; maximum total transitions; whether recovery to
an earlier (previously degraded) provider is permitted; and behavior once
every candidate is exhausted. A canonical fingerprint (same recompute-and-
compare mechanism as W12's evaluation-freeze fingerprint) covers every one
of those fields. Alternative considered: extend the existing evaluation
freeze schema in place with a `providerPolicy` block. Rejected because the
freeze's fingerprint already covers run matrix/budget/admission dimensions
unrelated to provider health, and mixing concerns would make a policy-only
mutation (e.g., changing the failover-eligible failure classes) harder to
test in isolation from a run-matrix mutation.

### D4. Deterministic failover, not result-driven reselection

Failover triggers only when an observed failure belongs to the frozen
failover-eligible class list, moves exactly one step down the frozen order,
never reorders based on which provider "found something," and (unless the
policy explicitly marks recovery allowed) never returns to a provider once
it is marked degraded for the run. This is asserted by a negative probe:
replaying a fixed failure sequence against the frozen policy must produce
the same transition sequence every time, and a policy mutation (order,
threshold, eligible classes, max transitions) must change the fingerprint
and fail a resume closed.

### D5. Run-validity rule changes from "single frozen provider" to
"policy not yet exhausted"

W12's rule ("the first candidate that returns a valid structured response
SHALL be frozen; later candidates SHALL NOT be probed") is replaced for W13
by: a run is VALID whenever the frozen policy still has an eligible,
unexhausted provider that returns a valid structured response and the run
performs source investigation; a run is `PROVIDER_BLOCKED` only when every
candidate in the frozen order has been exhausted before sufficient
investigation. Every receipt retains per-provider attribution (calls,
failures by class, transitions, bytes, wall time) so a multi-provider run's
result is never reported as an indistinguishable blend.

### D6. `gate:local` timeout: measure before deciding, and treat "raise the
timeout" as out of self-authorized scope

The task list requires re-running the `SYNTHETIC_CAMPAIGN` lane both
directly and gate-dispatched on an otherwise idle host, capturing
`uptime`/load average and competing-process snapshots the way the prior
`158a97b8` incident did, and diffing the synthetic manifest file count
against the base SHA before concluding anything. If the evidence
reproduces `HOST_CONTENTION` (as the prior incident did), the task records
that classification with its receipt and explicitly does not change the
timeout bound — per existing project guidance, raising a gate timeout class
is its own owner-authorized gate change with its own validation, not a
side effect of this wave. If the evidence instead shows a real duplicate-
work or pathological-setup cause, this change fixes only that narrow cause
under the existing "reproduce → regression → fix → negative-probe →
validate → record" loop (Section 35 of the owner prompt).

### D7. Provider-failure budget mismatch: find both fields, name two
concepts or pick one authority — do not just average them

The task locates the exact source of the `providerFailures: 3` supplemental
freeze field and the `providerFailures: 8` `HOUR_1` runtime ceiling, and
determines whether they are (a) the same concept with a stale copy, in
which case one becomes the sole authority and the other is removed or
computed from it, or (b) two genuinely distinct concepts (e.g., a
wave-declared soft budget vs. an engine-wide hard ceiling), in which case
both are renamed to be unambiguous and a mechanical check asserts they
never silently diverge again. A negative probe changes one value on a
resume attempt and proves the guard fails closed rather than silently
using whichever value happens to load first.

### D8. Census truncation: prove non-exhaustiveness is harmless, or fix it

Given the resource bound already in place for Ouchan's file count, this
change first checks whether raising or paginating the enumeration bound is
possible within existing safety/resource contracts. If yes, it implements
the actually-exhaustive bounded census. If not, it adds a mechanical check
that every W13 metric consuming the source inventory treats the truncation
flag as authoritative (e.g., denominators are never silently computed as if
4,124 were a complete population), rather than leaving that as an
unstated assumption the way W12 did.

## Risks / Trade-offs

- [Risk] Deterministic failover is easy to describe but easy to
  under-specify (e.g., what counts as "the same failure sequence" across
  retries within one provider vs. across providers) → Mitigation: the
  policy schema and its integrity tests are written before Phase B's first
  probe, per Section 16 of the owner prompt, and validated with fixed
  synthetic failure sequences before any live provider call.
- [Risk] Re-measuring the `gate:local` timeout on a "quiet host" is not
  fully within this change's control (shared machine, other agents) →
  Mitigation: record load/process evidence alongside the receipt so a
  future re-run can distinguish environment variance from a real
  regression, and do not certify Phase A on an equivocal measurement.
- [Risk] Archiving/syncing W12 mid-change could be mistaken for reopening
  W12's experiment → Mitigation: the archive/sync task explicitly touches
  only OpenSpec lifecycle files (moving the change under `archive/`,
  writing the baseline spec), never W12's task state, evidence, or verdict.
- [Risk] A materially wider or paginated census could itself take long
  enough to threaten Phase B's overall wall-time budget → Mitigation: the
  census work is capped and measured before Phase B's freeze commits its
  budgets, so any material cost is reflected in the frozen matrix rather
  than discovered mid-campaign.
- [Risk] Changing run-validity semantics could be read as "weakening" W12's
  stricter rule → Mitigation: the spec delta keeps every existing
  admission/reproduction/leakage/novelty requirement unchanged; only the
  provider-availability-vs-validity boundary moves, and it moves toward
  *more* provider accountability (mandatory per-provider attribution), not
  less.

## Migration Plan

1. Archive/sync W12 into the `openspec/specs/` baseline (D2).
2. Implement and test each Phase A residual independently, in the order
   given in `tasks.md`, each ending in its own commit with a regression
   and, where required, a negative probe.
3. Commit a Phase A closure checkpoint once every residual is `PROVEN`,
   `BLOCKED_EXTERNAL`, or explicitly deferred with an owner-decision
   classification (per the extended `residual-closure` capability).
4. Author and commit the provider-resilience policy and its fingerprint
   before any Phase B probe.
5. Freeze the full W13 evaluation definition (matrix, budgets, admission,
   metrics) before the first investigative call, exactly as W12 did.
6. Execute the broad run, then the eight scoped runs in stable registry
   order, under C-00 in one owned session worktree throughout.
7. Aggregate, certify (full validation + `gate:local` + `gate:clean`),
   reconcile Group 12 and programme state, integrate fast-forward, release
   the session.

Rollback: every step is a normal git commit on an owned session branch;
an aborted wave is released without merging, exactly as any other Nightwatch
session, and W11/W12 evidence is never touched by a rollback.

## Open Questions

- Is the `gate:local` timeout, once re-measured, actually `HOST_CONTENTION`
  again, or has the tree changed enough since `158a97b8`/W12's own timeout
  that a fresh cause applies? Must be measured, not assumed, before Phase A
  closes.
- Are the two `providerFailures` values (3 vs. 8) the same concept or two
  legitimately different ones? Only source inspection during Phase A can
  answer this; `tasks.md` treats both outcomes as valid closures.
- Can the Ouchan census bound be safely raised/paginated, or is an explicit
  non-exhaustiveness proof the right closure? Depends on the existing
  resource contract found during Phase A.
- Should provider recovery (returning to an earlier, previously degraded
  provider) be permitted at all for W13, or should the policy forbid it
  outright for this wave and leave it for a future wave to authorize?
  Default in this design is "forbidden unless explicitly declared," which
  the frozen policy document must state one way or the other before probing.
