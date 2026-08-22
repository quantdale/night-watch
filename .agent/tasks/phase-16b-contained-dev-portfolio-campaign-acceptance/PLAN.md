# PLAN — Phase 16B Contained DEV Portfolio Campaign Acceptance

Task ID: `phase-16b-contained-dev-portfolio-campaign-acceptance`
Status: NONE

## Milestones

### M0 — Bootstrap / authority
- Fetch live Git; require clean fast-forward state.
- Read predecessor Phase 16A/16H evidence and current runtime source.
- Record both execution authorization strings before DEV contact.
- Transition task to IN_PROGRESS and make active.

### M1 — Runtime binding proof
- Generate/read the current hardened DEV handoff.
- Trace the exact current source path from inert handoff to campaign runner.
- Prove no guard bypass or invented runner is needed.
- If no safe binding exists, stop with BLOCKED_RUNTIME_BINDING_MISSING.

### M2 — Safety preflight
- Run existing containment/owner-policy/auth-state preflight checks.
- Prove canonical DEV-only destination set and fail-closed production/unknown behavior.
- Verify trace-off/auth secrecy and checkpoint compatibility.

### M3 — Portfolio plan freeze
- Produce the deterministic current plan/handoff from the actual approved universe.
- Record plan/portfolio/allocation/campaign fingerprints, selected member IDs, budget, per-member caps, expected observer/oracle class, and currentness state.
- Freeze the plan for this acceptance run; no mid-run scope expansion.

### M4 — One bounded DEV execution
- Execute only the frozen plan through the existing authorized Nightwatch runner.
- Preserve read-only owner-policy gating for every action.
- Maintain checkpoints according to current source.

### M5 — Replay / minimization / triage
- For admitted anomalies only, use existing read-only replay/minimization where supported.
- Preserve INVALID/PRECONDITION_DIVERGENCE/TRANSIENT distinctions.
- Cluster/dedupe and apply existing confidence/dossier gates.

### M6 — Reconciliation
- Compare planned vs attempted vs completed vs blocked members and budget.
- Reconcile all candidates and checkpoints.
- Record safety/privacy/authority counters.

### M7 — Post-run local checks
- Run focused campaign/portfolio/runtime regressions, typecheck, hardening, owner-provenance, agent/project checks, and diff-check if source was changed to repair a genuine runtime defect.
- Do not perform unrelated architectural expansion.

### M8 — Closure
- Complete REPORT/STATE with exact runtime counts and evidence.
- Push only validated Nightwatch source fixes if any; otherwise docs/continuity only.
- Inspect Actions once on relevant pushed SHA; never retry-loop billing failures.
- Return active task to NONE and STOP.

## Fix policy

A genuine Nightwatch source defect discovered during the contained run may be fixed under this task only when the fix is local to the existing authorized runtime path and does not broaden endpoint/target/mutation authority. After a source fix, rerun the smallest decisive local regression and restart the DEV campaign only if safety semantics require a fresh run. Otherwise create a separate corrective task rather than improvising scope.
