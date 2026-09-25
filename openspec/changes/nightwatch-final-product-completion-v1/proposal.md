## Why

At `1f786a4e` the canonical records say COMPLETE while live evidence says
otherwise: exact-head CI is red at HEAD (run 36080583844), `project:check`
meets 0 of 16 release conditions with certification refused, 66 active
OpenSpec changes hide 529 of 607 open boxes behind strike-through, and the
product `campaign run` path loses or misreports the admissions it produces.
Three structural traps (substantive-path evidence bindings, six release checks
hard-coded `implemented:false`, and a source-literal task status) make an
honest terminal certification unreachable no matter how much evidence is
refreshed, so every campaign so far has ended in a claim the next audit
disproves. This change is the single terminal campaign that ends that cycle.

## What Changes

- Adopt one **terminal-disposition scope rule** (owner decision OD-1, tiered):
  every one of the 228 census items in `audit.md` ends in exactly one recorded
  disposition — FIX, NARROW, QUARANTINE, ACCEPTED_RESIDUAL (owner-signed
  DECISIONS entry), COMPLETED_LATER, SUPERSEDED, HISTORICAL, NON_GOAL, or
  EXTERNAL. Strike-through without a disposition is no longer permitted, and
  there is no "select the next campaign" step.
- Target **`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129** (OD-2): all 16
  release conditions MET, bin type-check BLOCKING with 0 exemptions, all 76
  operator entry points on the shared CLI contract, and exact-head CI
  `EXECUTED_PASS` at the final substantive checkpoint.
- **Certification spine (T0):** make evidence bindings, document-role
  corrections and `LIVE_TASK_STATUS` checkpoint-neutral; implement the six
  unimplemented release probes and an accessibility result record; add
  post-certification demotion semantics so a later commit reports instead of
  breaking the gate; make CI green and deterministic (c03GrpcTopology:389,
  reviewStore tmp listing, observerSemanticLedger flake, tautological
  live-source guards → declared skips, full-regression skip allowlist); make
  `gate:clean` sibling-hermetic and put `gate:topology` and the UI lane into
  certification; fix `HANDOFF_TRUTH` for session-declared pushes; reconcile
  every CI/lane/README/CURRENT_STATE contradiction from live output.
- **Autonomous hunt result integrity (T1):** durable, identity-bound admission
  records; truthful terminated-campaign resume; resume reasoner-identity,
  budget and `maxTurns` binding (NW-AUD-044/045); a persisted provider-failure
  taxonomy so provider outage is never budget exhaustion or zero yield;
  dispatcher, signal, print-adapter-leak, dirty-tree and environment-failure
  fixes; truthful `findings` output.
- **Finding truth surfaces (T1):** protocol dossier readiness verdict
  (NW-AUD-029) and total Control Center status mapping (NW-AUD-048);
  role-typed replay contexts (NW-AUD-025 interim); campaign state moved out of
  the findings root; Control Center Runs/Findings/Safety views and an agent
  campaign view that show real data; one sibling-root resolver; narrowed
  NW-AUD-012/036/039/040/041/042 over-claims.
- **Operator product readiness:** the shared CLI contract across all 76 bins, bin
  type-check burn-down, a README operator quickstart that matches CLI help,
  UI package installation, an env-selectable browser channel, no absolute
  paths in operator output, and an end-to-end operator proof including one
  authorized bounded paid provider run (OD-3).
- **Contained-DEV lane integrity (T2):** fix the S/M contained-DEV defects
  (NW-AUD-015/021/022/023/024/028/035/043 residuals, popup L0, generation-unique
  phase7 run IDs); put the L/XL redesigns (NW-AUD-016 full, 025 full, 026, 037,
  038) behind a mechanically enforced DEV-lane precondition registry.
- **Ledger and topology closure:** reconcile and archive every other active
  change (withdrawn or residual ones with `--skip-specs` plus a disposition
  record), set stale IN_PROGRESS/BLOCKED records terminal, re-point the
  canonical maintenance record, delete orphan branch
  `session/nightwatch-successor-campaign-en-c8bcb74c` after recording its SHA
  (OD-3), and finish with only `main`, no worktree, and a clean tree.

## Capabilities

### New Capabilities

- `final-completion-governance`: terminal-disposition scope rule, tiering,
  owner pre-flight and authorization block, ledger closure and archive rules,
  the no-discovery-loop rule, and terminal verdict vocabulary.
- `certification-anchor-stability`: checkpoint-neutral evidence and lifecycle
  bindings, implemented release probes, post-certification demotion, exact-head
  CI truth, deterministic and hermetic gates, and skip-identity truth.
- `autonomous-hunt-result-integrity`: durable identity-bound admissions,
  truthful resume, provider-failure accounting, bounded and interruptible
  campaign execution, and reproduction provenance.
- `finding-truth-surfaces`: dossier readiness, total status projection,
  role-typed replay admission, private-state layout, Control Center data
  views, and honest synthetic/heuristic labelling.
- `operator-product-readiness`: CLI contract totality, bin type-check
  enforcement, installability, operator documentation parity, and the
  end-to-end operator proof.
- `contained-dev-lane-integrity`: contained-DEV defect fixes and the DEV-lane
  precondition registry that quarantines deferred redesigns.

### Modified Capabilities

None. Existing capabilities (`final-release-certification`,
`exact-head-ci-baseline`, `operational-acceptance`, `campaign-handoff-truth`,
`current-source-yield-measurement`) keep their requirements. This change adds
the missing enforcement those requirements already demand. NW-AUD originals
keep their own deltas until their disposition is recorded.

## Impact

- **Code:** `src/core/releaseCertification`, `bin/project-state-check.mjs`,
  `bin/agent-continuity-protocol.mjs`, `src/core/source/censusFigureLedger.ts`,
  `bin/quality-gate*.mjs`, `bin/gate-topology.mjs`, `bin/run-shards.mjs`,
  `bin/campaign-synthetic.mjs`, `src/core/agentRuntime`, `src/core/reasoner`,
  `bin/nightwatch-agent.mjs`, `bin/nightwatch.mjs`,
  `bin/nightwatch-reasoner-print.mjs`, `src/core/ownerLocalReproduction`,
  `src/core/localInvestigation`, `src/core/triage`, `src/core/campaign`,
  `src/core/journeys/admission.ts`, `src/controlCenter/**`,
  `src/core/source/**`, `src/browser/**`, `src/proxy/**`, `src/auth/**`,
  `src/core/evidence/runRecorder.ts`, all 76 `bin/*.mjs` entry points,
  `tests/**`, `config/*.json`, `.github/workflows/hardening.yml`.
- **Docs:** README, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md` (residual-risk
  and behaviour entries), `docs/SAFETY_MODEL.md`, `docs/ARCHITECTURE.md`,
  `docs/RELEASE-ADVANCE-CONDITIONS.md`, `docs/ROADMAP.md`,
  `docs/HOST-CAPABILITY-MATRIX.md`.
- **Owner-local state:** new private subtrees for campaign state and agent
  findings, with read-compatibility. Existing files are migrated only by an
  owner-gated step.
- **External contact (authorized, OD-3):** GitHub Actions read/observe;
  pushes via C-00 fast-forward integration; one bounded paid provider run; one
  npm registry advisory query. **Not authorized:** Alphaus DEV/NEXT/production
  contact, authenticated Alphaus runtime, databases, cloud, sibling writes,
  external publication, force push.
- **Git:** one C-00 session, fast-forward integration only; orphan branch
  `c8bcb74c` deleted after its SHA `1441cc8a` is recorded.
