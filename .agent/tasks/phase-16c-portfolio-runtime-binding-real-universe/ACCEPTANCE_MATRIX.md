# ACCEPTANCE MATRIX — Phase 16C

| ID | Area | Required proof |
|---|---|---|
| A01 | Universe provenance | Every real-universe member derives from an existing canonical runtime registry/definition and resolves to a current runtime identity. |
| A02 | Synthetic exclusion | Fixture/demo-only target IDs are rejected from the real universe and from runtime admission. |
| A03 | Determinism | Identical normalized inputs produce byte/digest-identical universe, admission, binding and prepared campaign state across >=3 repeats. |
| B01 | Handoff strictness | Wrong version, wrong token requirement, executable marker drift, environment drift, digest drift and member-list drift fail closed. |
| B02 | Authorization | Missing/wrong authorization is rejected before any executor-capable state; exact required token permits consumption only. |
| B03 | No plan mutation | Admission cannot change selected members, order, plan IDs/digests or allocation. |
| C01 | Budget monotonicity | Every mapped runtime budget dimension is <= the existing approved fixed runtime profile. |
| C02 | Budget edges | Zero, exact-fit, oversubscribed, blocked and unmapped plans are deterministic and fail/allocate correctly. |
| C03 | Numeric safety | Negative, fractional where invalid, NaN/Infinity and overflow values rejected. |
| D01 | Work-item mapping | Every admitted selected member maps exactly once to the correct existing runtime work-item kind/identity. |
| D02 | Ambiguity | duplicate/ambiguous/cross-kind/unknown mappings fail closed. |
| E01 | Prepare | Portfolio admission/binding occurs inside existing prepare path before executor-capable state; preparation remains network/browser-free. |
| E02 | Frozen fingerprint | plan/handoff/universe/binding/budget fingerprints are persisted in prepared campaign/checkpoint state. |
| E03 | Resume auth | Resume requires authorization again before executor use. |
| E04 | Resume drift | plan/handoff/universe/binding/budget/version mismatch stops before executor invocation. |
| E05 | Legacy compatibility | Existing non-portfolio Phase-7 prepare/resume behavior remains valid without new metadata. |
| F01 | Launcher | Exactly one explicit opt-in portfolio input route feeds the existing launcher/manual adapter; no second runtime path. |
| F02 | Input safety | duplicate/unknown flags, unsafe/non-absolute external paths where applicable, malformed docs and raw error leakage are rejected/sanitized. |
| G01 | Single executor | Static/caller proof shows portfolio mode terminates in the same canonical campaign orchestrator/executor path as legacy Phase 7. |
| G02 | Owner policy | Existing owner-policy-before-executor ordering remains load-bearing. |
| H01 | Local seam rehearsal | real universe -> plan -> handoff -> admission -> binding -> prepare -> checkpoint -> resume -> injected synthetic executor completes locally. |
| H02 | Negative matrix | auth, tamper, stale, blocked, synthetic target, unknown target, mapping drift, version drift, checkpoint mismatch all fail closed. |
| H03 | No DEV | Complete task has zero DEV/NEXT/production/browser/auth/product network contact. |
| I01 | Focused suites | All Phase-16C focused permanent tests pass with raw counts recorded. |
| I02 | Compatibility | Directly affected Phase 7/12/13/15/16 compatibility suites pass. |
| I03 | Standard gates | typecheck, hardening, campaign:synthetic, owner-provenance when touched, agent:check, project:check, diff-check pass. |
| J01 | Quality floors | unauthorizedAdmission=0, syntheticTargetAdmitted=0, unmappedSelectedMember=0, budgetExpansion=0, executorBeforeAdmission=0, executorBeforeOwnerPolicy=0, resumeFingerprintEscape=0, legacyCampaignRegression=0, privacyLeak=0, determinismMismatch=0. |
| K01 | Git | source-bearing validated checkpoint pushed fast-forward; final HEAD==origin/main and clean tree. |
| K02 | CI truth | inspect exact Actions run once if relevant; external billing failure never upgraded to code failure/pass and never retry-looped. |

Full canonical + topology-isolated complete regressions are deferred to the successor hardening campaign unless required for diagnosis.
