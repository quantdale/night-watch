# SPEC — Nightwatch Phase 15H — Whole-System Integrated Hardening

Task ID: `phase-15h-whole-system-integrated-hardening`
Required authorization: `PHASE_15H_WHOLE_SYSTEM_INTEGRATED_HARDENING_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Bootstrap and source of truth

Fetch/fast-forward clean `main`; require `HEAD == origin/main`. Read `AGENTS.md`, durable project docs, Phase 15P STATE/REPORT/INTEGRATION_LEDGER/SUBAGENT_LEDGER/MASS_IMPLEMENTATION_HANDOFF, and this complete task package. Git/source/test evidence outranks stale prose.

Historical implementation anchors:
- mass strategy-shift base: `abc9bf9c8cdc6d1ed594638be19c605d51cfd336`;
- final mass implementation: `c2640cb08e7057eccab740942c3dc9991109ad1e`;
- mass terminal docs: `5da4917c2ee67b30f6a5e6d3453c6ddbcc1fd9e5`.

Discover live head at execution; do not hard-code publication descendants as execution truth.

## 2. Gate zero — continuity reconciliation

Before treating any Phase-15P lane as validated, reconcile the contradiction between:
- `PHASE_15P_*: IMPLEMENTED_FOCUSED_GREEN` lane labels in STATE/ACTIVE_TASK; and
- mass-bulk truth: tests/typecheck/hardening were `NOT_RUN_BY_OWNER_DIRECTION` after the 105-file implementation round.

Do not erase the historically focused-green pre-mass checkpoint. Instead distinguish:
- historical focused-green scope ending at the earlier validated checkpoint; from
- mass-bulk integrated scope at `c2640cb...`, which starts UNVALIDATED.

Repair continuity wording after evidence is established.

## 3. Hardening principle

This is a repair-and-proof campaign, not a passive test run. When a gate exposes an authorized Nightwatch defect:
1. reproduce it with the narrowest deterministic check;
2. identify the source cause;
3. implement the fix;
4. add/repair a permanent regression test;
5. rerun the narrow gate;
6. continue to the broader gate.

Never weaken an assertion, add a skip, or reinterpret a failure solely to make the suite green.

## 4. Mandatory execution order

### H0 — Compile first
Run `npm run typecheck` before broad tests. Fix every compiler error caused by the mass round. Expected risk areas from the handoff include CLUSTERED state-list exhaustiveness, expanded vocabularies/provenance counts, snapshot required fields, A13 narrowings, and A15 deletions.

### H1 — Static/safety hardening
Run `npm run hardening:check`, privacy/authority sentinels, import-boundary checks, and explicit scans for raw credential/customer/authenticated-value persistence. Phase 6 remains quarantined/frozen.

### H2 — Phase-15P contract matrices
Exercise all new/changed surfaces from A01–A16, including:
- lifecycle resolution view;
- semantic/replay/dossier/promotion vocabularies and strict parsers;
- source observation/currentness/drift movement;
- dtoFramework dispatch/coherence;
- CLUSTERED candidate lifecycle;
- ReplayResultEnvelope + kind capability table;
- MinimalityEvidence and genuine reduction requirements;
- semantic/protocol cluster identity helpers;
- retry/reservation/resume-refusal behavior;
- readiness/analyzer/deferred-verification/CI classification;
- all artifact validators and registration ordering;
- project snapshot new slots/delta rules;
- private screening + narrowed categorical DTOs;
- adversarial corpus registry/builders;
- deletion/version-owner convergence;
- A16 seam assembly.

### H3 — Risk-specific matrices
Required explicit regressions:
1. lifecycle state totality with `CLUSTERED`;
2. provenance registry cardinality/vocabulary exactness without stale pinned counts;
3. retry attempts 1–4 plus blocked 5th attempt;
4. old snapshot compatibility vs any schema/version bump needed for new required fields;
5. readiness byte stability when optional movement input is absent;
6. out-of-tree/free-text constructor compatibility classification after A13 narrowing;
7. A15 deleted/exported caller proof via compiler + static search;
8. unified private-screening behavior across candidate/runtime/private-artifact paths;
9. artifact validator registration ordering/completeness;
10. checkpoint/orchestrator overlap across CLUSTERED + resume refusal.

### H4 — Adversarial corpus execution
The 66-definition Phase-15P corpus architecture must become executable hardening evidence, not merely definitions. Bind every fixture/scenario class to deterministic builders/executors where appropriate. Run >=3 repeats. Required floors:
- determinismMismatchCount = 0;
- privacyLeakCount = 0;
- falseCurrentCount = 0;
- falseAdmissionCount = 0;
- falseMinimalityCertificationCount = 0;
- versionDriftExecutorEscapeCount = 0;
- ownerPolicyEscapeCount = 0;
- malformedArtifactFalseAcceptCount = 0.

Phase-6/11B/13B corpus members prove blocking/quarantine only; they do not grant execution authority.

### H5 — Historical all-phase compatibility
Run the complete relevant local/synthetic suites for every historical phase family 1–15. Do not treat absence of a phase-numbered suite as proof; map current tests to the phase dependency cone and document coverage.

At minimum cover:
- containment/safety/continuity;
- observation/journeys/replay;
- change intelligence;
- exploration;
- Phase-5 API synthetic surfaces;
- campaign/minimization/triage;
- AI quarantine/owner-review synthetic surfaces;
- selfDev synthetic/adoption/promotion guards without executing promotion;
- semantic projections/expectations/invariants/receipts;
- real-source admission/currentness/deep contracts;
- collection semantics/partial coverage;
- semantic yield/triage;
- Phase-13 semantic campaign/shadow/replay integration;
- Phase-14 analyzer/inventory/drift/reporting;
- all Phase-15/15P tests.

### H6 — Campaign and provenance packs
Run `npm run campaign:synthetic` and `npm run test:owner-provenance`. Any changed expectations must be repaired from source truth, never by reducing coverage.

### H7 — Complete canonical regression
Run complete Playwright on canonical topology with `--project=nightwatch --workers=1`. Record raw passed/skipped/failed counts and exact failures.

### H8 — Topology-correct isolated regression
Create a clean isolated clone/worktree with the repository topology required by tests, install deterministically, and run the same complete Playwright command. Zero failed required. Topology-only enumeration differences must be evidenced, not assumed benign.

### H9 — Continuity/project/catalog integrity
Run:
- `npm run agent:check`;
- `npm run agent:audit`;
- `npm run project:check`;
- catalog-integrity command used by current project;
- `git diff --check`;
- working-tree cleanliness checks.

Repair continuity contradictions exposed by Gate Zero using actual validation results.

### H10 — CI truth
Push a validated implementation/hardening checkpoint fast-forward. Inspect the exact GitHub Actions run/job/steps. If billing/spending still prevents steps from executing, record `BLOCKED_EXTERNAL_CI`; do not retry-loop and do not call CI green. If Actions executes and fails code, fix it and rerun normally within this task.

## 5. Source changes allowed

Nightwatch source/tests/corpus/docs/workflows may be changed as required to fix hardening defects. Workflow changes must not weaken authority or remove meaningful gates. Alphaus sibling repos remain read-only.

## 6. Prohibited shortcuts

- no blanket snapshot regeneration without understanding semantic changes;
- no assertion relaxation solely to accept new behavior;
- no new skips hiding failures;
- no deleting tests because A15 deleted code;
- no changing owner-policy gates to satisfy integration;
- no treating compiler success as behavioral proof;
- no treating the same test under two names as independent corroboration.

## 7. Required all-phase disposition

Final REPORT must map every phase family 1–15 to one of:
- `HARDENED_LOCAL_GREEN`;
- `COMPATIBILITY_GREEN`;
- `FROZEN_BY_OWNER`;
- `RUNTIME_ACCEPTANCE_NOT_AUTHORIZED`;
- `BLOCKED_EXTERNAL_CI` only for CI authority, not local code;
- `BLOCKED_LOCAL` with exact defect if unresolved.

## 8. Terminal states

### Fully local green + CI green
`PHASE_15H_STATUS: COMPLETE`
`PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_AND_CI`

### Every local/source gate green, CI externally unable to execute
`PHASE_15H_STATUS: BLOCKED_EXTERNAL_CI`
`PHASE_15P_MASS_IMPLEMENTATION: VERIFIED_LOCAL_NOT_CI_VERIFIED`

### Any local gate remains unresolved
`PHASE_15H_STATUS: BLOCKED`
`PHASE_15P_MASS_IMPLEMENTATION: HARDENING_INCOMPLETE`

Phase 6 remains FROZEN_BY_OWNER. Phase 11B/13B remain NOT_AUTHORIZED in every terminal state.
