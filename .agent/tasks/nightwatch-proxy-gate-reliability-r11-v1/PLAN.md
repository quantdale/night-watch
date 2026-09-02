# R-11 Proxy/Gate Reliability Closure

## Purpose

Make the authoritative quality gate trustworthy enough to certify a safety
kernel. After R-11 a red gate means the repository is wrong, and a red gate can
always say which group failed.

## Starting State

- Task ID: `nightwatch-proxy-gate-reliability-r11-v1`
- Starting Nightwatch SHA: `c423e33e3384dd3ec34bfd4e9d57d863f58bc190`
- Relevant architecture: `src/proxy/portLease.ts` (bounded 32-candidate
  allocator with exclusive lease create and a real TCP bind probe),
  `bin/quality-gate.mjs` (eleven-group authoritative gate, stdout-only
  receipt), `bin/quality-gate-clean.mjs` (disposable clone wrapper, stdout
  scraping), `bin/lib/gate-receipt.mjs` (allowlisted bounded diagnostics).
- Dependencies: none outside the repository. Offline throughout.
- Established facts that must not be rediscovered: OBS-C105-1's reproduction
  and root cause (OpenSpec `audit.md`); the workflow hardening rules that
  forbid `upload-artifact`; the four-role certification authority model.

## Scope

R1 reproduction (complete) → R2 port-lease contract → R3 deterministic tests →
R4 durable receipts → R5 Stage-A truth reconciliation → R6 registration and
validation.

## Non-Goals

C-11; product routes; containment layers; C-06 proof strength; C-10/C-10.5
provenance; Actions artifacts.

## Safety Constraints

As SPEC. Loopback-only sockets; synthetic sentinels only; no credential, auth
state, customer identifier or secret in any source, test or record.

## Architecture / Approach

See OpenSpec `design.md` for the full rationale. In brief:

- One module-private allocator core takes the availability predicate
  explicitly. `reserveProxyPortLease` binds the real probe and exposes no
  substitutable parameter; a distinctly named `…WithAvailabilityForTest` seam
  is restricted to `tests/**` by hardening, so the deterministic tests exercise
  the REAL allocator rather than a duplicate.
- `proxyPortCandidates` is pure, making boundedness and wraparound testable
  without I/O.
- `preferredOutcome` makes the corrected assertion informative: tests require
  `PREFERRED_REUSED` where they proved the endpoint free and
  `PREFERRED_UNAVAILABLE_ADVANCED` where they deliberately occupied it.
- Receipt persistence writes the exact stdout bytes atomically to a confined
  temp path, defaulting automatically so durability is not something an
  operator must remember. The clean wrapper reads that file and requires digest
  equality with stdout.

## Milestones

### M1 — Reproduce OBS-C105-1

- Objective: prove or disprove the brief's explanation before editing.
- Files/areas: scratchpad harness only; no repository file edited.
- Implementation actions: exercise the unmodified allocator for Cases A–D;
  reproduce the exact CI failure end-to-end through the real suite.
- Acceptance criteria: allocator correct in all four cases; the current
  assertion demonstrably fails in Case B; the end-to-end failure reproduces the
  recorded `failedLocations` value exactly.
- Validation commands: `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts`
- Status: DONE

### M2 — Port-lease contract

- Objective: express the allocator's real contract; keep production bound to
  the real OS probe.
- Files/areas: `src/proxy/portLease.ts`.
- Implementation actions: extract `proxyPortCandidates`; factor the core to
  take an availability predicate; add `candidateOffset` and `preferredOutcome`;
  add the `TEST ONLY` seam.
- Acceptance criteria: no production behavior change; every existing safety
  property preserved; `typecheck` clean.
- Validation commands: `npm run typecheck`, `npx playwright test tests/unit/phase23PortLease.test.ts tests/unit/phase24ProxyLifecycle.test.ts`
- Status: DONE

### M3 — Deterministic adversarial suite

- Objective: sixteen deterministic conditions, zero probabilistic input.
- Files/areas: `tests/unit/proxyPortLeaseDeterminism.test.ts`,
  `tests/unit/phase24ProxyLifecycle.test.ts`.
- Implementation actions: build the deterministic suite; correct the
  SIGTERM/SIGINT case; keep a real-OS-TCP occupied-port integration test.
- Acceptance criteria: all cases green; no PID-derived or random port remains.
- Validation commands: `npx playwright test tests/unit/proxyPortLeaseDeterminism.test.ts tests/unit/phase24ProxyLifecycle.test.ts tests/unit/phase23PortLease.test.ts`
- Status: DONE

### M4 — Bounded stress campaign

- Objective: supporting evidence with exact iteration counts.
- Files/areas: `tests/unit/proxyPortLeaseStress.test.ts`.
- Implementation actions: repeated allocate/release cycles; parallel allocators
  on one preferred port; a real external listener on the preferred port; child
  death between lease creation and release; rapid reclaim cycles.
- Acceptance criteria: green, with counts recorded in STATE and REPORT.
- Validation commands: `npx playwright test tests/unit/proxyPortLeaseStress.test.ts`
- Status: DONE

### M5 — Durable gate receipts

- Objective: a receipt that a filter cannot destroy.
- Files/areas: `bin/lib/gate-receipt.mjs`, `bin/quality-gate.mjs`,
  `bin/quality-gate-clean.mjs`.
- Implementation actions: confined validated path resolution; atomic write;
  digest identity; failure coverage; clean wrapper consumes the file and
  requires digest equality.
- Acceptance criteria: brief §9 requirements met; no sensitive value can enter
  the receipt.
- Validation commands: `npm run gate:local`, `npm run gate:clean`
- Status: DONE

### M6 — Adversarial receipt suite and hardening

- Objective: prove the mechanism non-vacuous.
- Files/areas: `tests/unit/gateReceiptPersistence.test.ts`,
  `bin/hardening-check.mjs`.
- Implementation actions: brief §11 cases in full; hardening rules for the
  receipt mechanism and the availability seam, each negative-probed on a
  disposable copy.
- Acceptance criteria: every §11 case green; every new rule proved to fail when
  its invariant is mutated.
- Validation commands: `npm run hardening:check`, `npx playwright test tests/unit/gateReceiptPersistence.test.ts`
- Status: DONE

### M7 — Stage-A truth reconciliation

- Objective: remove false live claims without a certification regress.
- Files/areas: `docs/CURRENT_STATE.md`, `.agent/ACTIVE_TASK.md`.
- Implementation actions: correct the "EXACT head of `main`" claim about
  `29b9212`; record run `33637832941` at `c423e33`; repair the stale
  project-state table row; state the four-role authority model; preserve
  `29b9212` as historical certification.
- Acceptance criteria: `project:check` PASS; no SHA field bulk-set to HEAD.
- Validation commands: `npm run project:check`, `npm run agent:check`
- Status: DONE

### M8 — Registration and full validation

- Objective: every new safety suite executed by the authoritative gate.
- Files/areas: `config/semantic-compatibility.v1.json`,
  `config/synthetic-campaign.v1.json`.
- Implementation actions: register the new suites; prove membership through
  `gate:inventory`; run the full validation sequence, including repeated
  independent runs of the previously flaky suite in local and clean topologies.
- Acceptance criteria: full canonical regression zero failures; no new skips;
  `gate:local` and `gate:clean` PASS.
- Validation commands: the R-11 validation sequence in full.
- Status: NOT_STARTED

### M9 — Integration and exact-head CI

- Objective: certified closure.
- Implementation actions: integrate through C-00; obtain exact-head Actions.
- Acceptance criteria: all eleven required groups PASS at the exact head;
  canonical checkout clean; `origin/main` synchronized; `siblingWrites = 0`.
- Validation commands: `node bin/nightwatch-session.mjs integrate`, `gh run view`
- Status: NOT_STARTED

## Validation Strategy

Focused: the three proxy suites, the receipt suite, `typecheck`,
`hardening:check`. Global: `handoff:check`, `project:check`, `agent:check`,
`agent:audit`, `gate:inventory`, `test:semantic-compat`, `campaign:synthetic`,
the full canonical Playwright regression, `gate:local`, `gate:clean`, then
exact-head GitHub Actions.

Repeated runs of the previously flaky suite are independent invocations. No
runner retry is configured anywhere, and none is added.

## Decision Log

- 2026-09-02 — Decision: reproduce before repairing, and reproduce end-to-end
  rather than only at unit level; reason: the C-10.5 attribution was explicitly
  an inference; evidence: the reproduced failure carries the same
  `failedLocations` value as the CI receipt; consequence: the root cause is
  proof, and the repair targets the test rather than the allocator.
- 2026-09-02 — Decision: keep the allocator core and the test seam in one
  module; reason: a seam in a separate module would have to duplicate allocator
  logic, and a duplicated allocator makes the deterministic tests test the
  duplicate; evidence: the seam restriction is enforceable by exported name;
  consequence: hardening restricts the seam by name to `tests/**`.
- 2026-09-02 — Decision: no Actions artifact; reason: `checkPhase23QualityGate`
  forbids `upload-artifact`, caps the workflow at two run commands and admits
  only two actions, and weakening a hardening rule is forbidden; evidence: the
  rule text; consequence: durability is delivered by the local receipt file,
  and CI attributability by the complete receipt in the retained job log.
- 2026-09-02 — Decision: the receipt path defaults automatically to a confined
  temp location rather than requiring an env var; reason: the failure being
  eliminated was an operator losing the only copy, and a mechanism that must be
  remembered would not have prevented it; consequence: an explicit override is
  validated and confined, and an unsafe path fails closed before any group runs.

## Discoveries

- The end-to-end reproduction advanced two candidates rather than one, because
  the watcher had occupied both PID-derived ports. Correct bounded-search
  behavior, not a second defect.
- `docs/CURRENT_STATE.md` carried a second, independent staleness: the
  project-state v2 table's "Current value" column still named `23523cc` for
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` while the machine-checked block said
  `c763c05`. The validator does not read the prose table, so it could not see
  this. Repaired under M7.

## Deferred Work

- C-11 `PROD_OBSERVE`, which this task is the prerequisite for.

## Completion Criteria

Every SPEC acceptance criterion satisfied, with evidence recorded in
`STATE.md` and `REPORT.md`.
