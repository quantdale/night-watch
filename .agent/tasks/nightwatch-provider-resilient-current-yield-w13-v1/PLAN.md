# W13 — Provider-resilient current-source unknown-defect yield

## Purpose

Execute the owner-authorized W13 wave: close every locally closable W12
measurement and governance residual (Phase A), then freeze and execute a
provider-resilient current-source campaign (Phase B) under a predeclared
deterministic failover policy, without reopening W11/W12 evidence or
laundering provider failure into yield.

## Starting State

- Task ID: `nightwatch-provider-resilient-current-yield-w13-v1`
- Phase: `PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1`
- Starting SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Predecessor: W12 `nightwatch-current-source-unknown-yield-w12-v1`,
  preserved `PARTIAL — BLOCKED` (broad run valid; all eight scoped runs
  provider-blocked).
- Session branch: `session/nightwatch-provider-resilient-cu-623c6535`
- OpenSpec: `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/`

## Scope

Phase A residual closure (register, provider-failure budget mismatch,
`gate:local` timeout classification, provider failure taxonomy, census
truncation, measurement completeness, candidate/admission invariant,
fake-progress guards, Group 12/programme reconciliation); the
provider-resilience policy and its fingerprint; the W13 evaluation freeze;
the fixed broad-plus-eight-scoped matrix; existing mechanical
reproduction/admission; post-admission-only read-only novelty; aggregation and
governed documentation; validation and C-00 integration/release.

## Non-Goals

Do not reopen W11/W12 evidence; do not compare providers by investigation
quality; do not contact DEV/NEXT/production; do not access databases or
infrastructure; do not mutate sibling repositories; do not widen
source/tool/provider authority; do not weaken admission; do not raise
`gate:local` timeouts; do not tune scope, budgets, models, providers, or
stopping rules after results appear.

## Safety Constraints

LOCAL / OWNER-LOCAL only. Provider egress is authorized only through the
existing configured reasoner CLI with the predeclared candidate policy.
Sibling repositories are read-only; contained reproduction uses existing
admitted classes and disposable Nightwatch-owned state. Hidden historical
truth, credentials, customer data, authenticated evidence, and external
publication are forbidden. One writer, one owned C-00 worktree, one session
identity.

## Architecture / Approach

Compose the existing source universe/currentness census, diverse investigation
index, bounded reasoner loop, host-owned repository scope, contained
reproduction providers, mechanical dossier/admission, leakage/redaction, and
owner-local evidence. Phase A fixes only what the register proves broken.
Phase B declares the provider-resilience policy first, freezes the complete
run matrix second, probes candidates in frozen order, executes broad then
stable repository-scoped runs with deterministic failover, derives metrics
from receipts, and adjudicates novelty only after admission.

## Milestones

### M0 — Governed activation and live rebaseline

- Objective: create W13 continuity/OpenSpec surfaces, archive/sync the W12
  capability baseline, route the active task, preserve W11/W12, and reconcile
  live Git/session truth.
- Acceptance: active routing points to W13; C-00 owned session is live; task
  files, OpenSpec change, and predecessor references are coherent; W11/W12
  evidence is unchanged.
- **Status:** COMPLETE — activation checkpoint `a95004a0` plus the W12
  archive-index/purpose follow-up `bdb781d4`; all activation checks pass.

### M1 — Residual register

- Objective: build and commit the residual register before fixing any entry.
- Acceptance: every entry names source/evidence/rationale/owner/next action,
  carries exactly one taxonomy class, and records its Phase B blocking flag.
- **Status:** COMPLETE — 13-entry register committed before any fix
  (`residual-register.json`).

### M2 — Provider-failure budget mismatch

- Objective: locate both `providerFailures` origins, decide one authority or
  two named concepts, implement, regress, negative-probe, and record a new
  decision succeeding D-138.
- Acceptance: no silent divergence is possible; the divergence probe fails
  closed.
- **Status:** COMPLETE — engine policy is the single authority; derived-envelope
  guard, field-level mismatch reporting, regression, and W12-value negative
  probe are live; D-139 recorded (R-01 `PROVEN`).

### M3 — `gate:local` synthetic-lane timeout classification

- Objective: re-measure the direct and gate-dispatched lanes on an idle host
  and classify the timeout as exactly one measured cause with a lane receipt.
- Acceptance: load/process evidence and manifest-count comparison recorded;
  the timeout bound is never raised.
- **Status:** COMPLETE — R-02 `PROVEN` as `EXPECTED_ENVIRONMENT_VARIANCE`
  (423 s - 643 s pass-time spread on one unchanged 105-file/1,897-test
  manifest; gate-dispatched lane PASS all 12 groups; bound unchanged).

### M4 — Provider failure taxonomy

- Objective: implement the full ten-member classification and sanitized
  retention of provider outcomes.
- Acceptance: each raw CLI outcome maps to exactly one taxonomy member,
  covered by regressions including the unknown fallback.
- **Status:** COMPLETE — R-03 `PROVEN`: ten-member taxonomy, sanitized
  evidence, PROBE/RUNTIME phase distinction, and 5 regressions (120/120
  focused tests, typecheck, schema check).

### M5 — Census truncation closure

- Objective: raise/paginate the census bound safely, or prove mechanically
  that `TRUNCATED` populations are treated as floors in every denominator.
- Acceptance: the chosen closure has a regression and reuses existing
  completeness vocabulary.
- **Status:** COMPLETE — R-05 `PROVEN`: the 4096 hard ceiling is not raised or
  paginated; floor-only denominator semantics reject a TRUNCATED population
  presented as an exhaustive total (5/5 regressions).

### M6 — Measurement completeness

- Objective: guarantee every required aggregate metric is machine-derived or
  explicitly `NOT_CAPTURED` with a reason.
- Acceptance: schema regression proves no required metric is silently absent.
- **Status:** COMPLETE — R-04/R-06 `PROVEN`: 30 required metrics enforced,
  per-provider attribution enforced, NOT_CAPTURED requires a reason, and the
  W12-style section-shaped aggregate is rejected as a fixture (5/5 tests).

### M7 — Candidate/admission invariant and fake-progress guards

- Objective: mechanically reject inconsistent admission fixtures and prove a
  failed provider call mints no progress.
- Acceptance: dedicated negative probes pass; provider failure remains
  provider-blocked, never zero yield.
- **Status:** NOT_STARTED

### M8 — Group 12 and continuity reconciliation

- Objective: re-annotate Group 12 items 12.7, 12.8, 12.11, 12.12 and
  reconcile `PROGRAMME.json`, current-state, and README figures.
- Acceptance: predecessor text preserved; W12 recorded COMPLETE; W13 routed.
- **Status:** NOT_STARTED

### M9 — Phase A closure checkpoint

- Objective: validate and commit Phase A closure, or stop truthfully.
- Acceptance: every register entry resolves to `PROVEN`, `BLOCKED_EXTERNAL`,
  or `OWNER_DECISION_REQUIRED`; focused and repository validation passes.
- **Status:** NOT_STARTED

### M10 — Provider-resilience policy freeze

- Objective: author, fingerprint, probe, and commit the provider-resilience
  policy before any investigative call.
- Acceptance: mutation/replay/resume negative probes pass; the first healthy
  candidate in frozen order is frozen with a sanitized receipt.
- **Status:** NOT_STARTED

### M11 — W13 evaluation freeze

- Objective: commit the full machine-readable run matrix and policy before
  the first investigative call.
- Acceptance: freeze fingerprint and mutation/widened-resume guards are live.
- **Status:** NOT_STARTED

### M12 — Run matrix execution

- Objective: execute the broad run and all eight scoped runs under the frozen
  policy with per-provider attribution.
- Acceptance: every run is valid, or categorically provider-blocked after
  policy exhaustion; no result-driven provider reselection.
- **Status:** NOT_STARTED

### M13 — Reproduction, admission, novelty, and safety proofs

- Objective: route every candidate through the unchanged mechanical path and
  prove safety boundaries live.
- Acceptance: reproductions/refusals/admissions are receipt-derived; leakage,
  sibling-write, and adversarial probes pass.
- **Status:** NOT_STARTED

### M14 — Aggregation and certification

- Objective: mechanically aggregate all metrics and reconcile governed
  documentation from actual evidence.
- Acceptance: full validation passes or is truthfully classified; Group 12
  reconciled; final residual analysis classified.
- **Status:** NOT_STARTED

### M15 — C-00 integration, release, and final verdict

- Objective: inspect, integrate fast-forward, verify `HEAD == origin/main`,
  release/remove the session, and produce exactly one final W13 verdict.
- Acceptance: terminal report, coherent evidence, clean lifecycle.
- **Status:** NOT_STARTED

## Validation Strategy

Focused W13 residual/policy/freeze/integrity suites first; then
`npm run typecheck`, `npm run typecheck:bin`, `npm run hardening:check`,
`npm run hardening:rules`, `npm run agent:check`, `npm run handoff:check`,
`npm run project:check`, `npm run workspace:check`, `npm run session:check`,
`npm run validation:universe`, `npm run gate:local`, `npm test`, strict
OpenSpec validation, and `npm run gate:clean` at the C-00-approved lifecycle
point. Any failure introduced by W13 is repaired before unrelated work
accumulates.

## Decision Log

- W13 is a distinct successor wave; W11 and W12 remain immutable predecessor
  evidence.
- The provider-resilience policy is declared and fingerprinted before probing;
  transitions are deterministic and never result-driven; recovery is
  forbidden unless explicitly declared.
- W13 restates the run-validity boundary: a run is valid under policy-governed
  failover; only policy exhaustion before sufficient investigation is
  `PROVIDER_BLOCKED`.
- Phase A closes before Phase B opens; a blocking residual stops the wave.

## Discoveries

- Live canonical main and `origin/main` both resolve to
  `34517c9ba11c97407168fe5879ee03794dfff3e3` at activation.
- W12 is `PARTIAL — BLOCKED`: one valid broad run; all eight scoped runs
  provider-blocked after the single frozen provider degraded.
- Four pre-existing stale worktrees remain owner-attention records; W13 does
  not adopt, release, remove, or modify them.

## Deferred Work

DEV/NEXT/production execution, authenticated semantic acceptance, cloud/data
operations, organizational filing, external publication, new reproduction
authority, and raising any gate timeout remain out of scope. Provider recovery
is not authorized unless the frozen policy explicitly permits it.

## Completion Criteria

W13 closes only when Phase A residuals are closed or truthfully classified,
the provider-resilience policy and evaluation freeze are committed before
investigation, the matrix is validly executed or categorically blocked, every
candidate reached the existing mechanical path, safety/leakage/sibling proofs
pass, Group 12 and programme state are reconciled, required validation passes
or is truthfully classified, C-00 integration proves `HEAD == origin/main`,
the session is released/removed, and REPORT.md carries exactly one allowed
W13 verdict.
