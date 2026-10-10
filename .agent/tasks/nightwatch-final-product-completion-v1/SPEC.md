# Final product completion (terminal campaign) — Specification

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
OpenSpec change: openspec/changes/nightwatch-final-product-completion-v1/
Status: IN_PROGRESS

## Purpose

Execute the single terminal campaign that makes an honest
`PROJECT_COMPLETE_AND_CI_CERTIFIED` verdict reachable and stable: every one of
the 228 audited census items ends in one recorded disposition, the
certification spine becomes checkpoint-neutral and CI-green, the autonomous
hunt path persists truthful results, operator surfaces stop misreporting, and
the ledger closes with only `main`, one worktree-free canonical checkout, and a
clean tree.

## Authorization block (OD-1..OD-4, verbatim from audit.md)

| ID | Decision |
| --- | --- |
| OD-1 | Scope rule: **tiered terminal disposition**. Every item ends in one recorded disposition; T0/T1/T2-FIX fixed; T2-GATE quarantined; T3 accepted-residual unless S; no discovery loop. |
| OD-2 | Target **`PROJECT_COMPLETE_AND_CI_CERTIFIED` under D-129**: all 16 conditions MET, bin type-check BLOCKING with 0 exemptions, all 76 entry points on the CLI contract, exact-head CI green at S. |
| OD-3 | Authorized: GitHub CI read/observe; one bounded paid provider proof run; one npm registry advisory query (root + UI lockfiles); delete local branch `session/nightwatch-successor-campaign-en-c8bcb74c` after recording SHA `1441cc8a`. |
| OD-4 | This proposal is written uncommitted in canonical. The implementation session moves it into its worktree and commits it with its task continuity in the M1 bootstrap checkpoint. While it is untracked in canonical, `agent:check`/`project:check`/`handoff:check` fail with `LEDGER_CHANGE_WITHOUT_TASK` (measured, expected). |

Authorization class: FINAL_PRODUCT_COMPLETION_V1
PROJECT_VERDICT_EFFECT: PRESERVE

## Scope

Nightwatch source, tests, hardening rules/probes, schemas/configuration,
synthetic fixtures, OpenSpec/task continuity records, local bounded child
processes, and C-00 commits/fast-forward integration from the owned session
only. Task-by-task scope is frozen in
`openspec/changes/nightwatch-final-product-completion-v1/tasks.md` (phases
1-15) with its design decisions in `design.md` and the item census in
`audit.md`.

## Non-Goals

- Full redesigns of L/XL contained-DEV items (NW-AUD-016 full, 025 full, 026,
  037, 038): quarantined behind the DEV-lane precondition registry, not built.
- Changing owner scope, the production track (C-12/C-13/C-14/P4), Phase 6
  execution, or any authorization beyond OD-3.
- New reproduction executors (W10 NO-GO stands; the ouchan-only ceiling is
  stated, not expanded).
- Re-admitting ripple-api at its new SHA (owner-only, recurring).
- Paying down unused exports or dependency majors beyond a ratchet.

## Safety Constraints

- LOCAL / OFFLINE / SYNTHETIC only. No Alphaus DEV/NEXT/production contact,
  authenticated Alphaus runtime, credentials, customer data, database or
  cloud access, sibling writes, external publication, force push, or history
  rewrite.
- External contact limited to OD-3: GitHub Actions read/observe, C-00
  fast-forward pushes, one bounded paid provider proof run, one npm registry
  advisory query.
- One writing agent: ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY.
  Alphaus sibling repositories are read-only.
- Real findings remain in the owner-only local store; nothing customer-derived
  enters source, artifacts, or `.agent` files.

## Acceptance / completion criteria

1. Every `audit.md` census item carries exactly one recorded disposition
   (OD-1); no hidden backlog.
2. All 16 release conditions MET under D-129 with exact-head CI
   `EXECUTED_PASS` at the final substantive checkpoint S (OD-2).
3. Bin type-check BLOCKING with 0 exemptions; all 76 operator entry points on
   the shared CLI contract (OD-2).
4. Operator proof completed (synthetic hunt + one authorized bounded paid run
   or recorded `PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION`, and the clean-clone
   install proof).
5. Ledger closure: every other active change archived with a recorded
   disposition; this change archived last in the documentary step.
6. Terminal topology: `main` only, no worktree, clean tree equal to
   `origin/main`; final 13-section completion report delivered.

## Declared Deletions

Archived child change (2026-10-01, child task 6.4): the corrective change moved
into the archive with `--skip-specs`; the pre-move locations are declared here.

- `openspec/changes/nightwatch-final-completion-corrections-v1/.openspec.yaml`
- `openspec/changes/nightwatch-final-completion-corrections-v1/audit.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/design.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/proposal.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/tasks.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/specs/completion-correction-certification/spec.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/specs/completion-correction-ledger-truth/spec.md`
- `openspec/changes/nightwatch-final-completion-corrections-v1/specs/completion-correction-validation-spine/spec.md`

Archived child change (2026-10-03, review-5 task C.4): the corrective change moved into the
archive with spec sync (published as `openspec/specs/review5-closure/`); the pre-move locations are
declared here.

- `openspec/changes/nightwatch-final-completion-review5-v1/audit.md`
- `openspec/changes/nightwatch-final-completion-review5-v1/design.md`
- `openspec/changes/nightwatch-final-completion-review5-v1/proposal.md`
- `openspec/changes/nightwatch-final-completion-review5-v1/tasks.md`
- `openspec/changes/nightwatch-final-completion-review5-v1/specs/review5-closure/spec.md`

Planned tracked-file deletions are declared here before they happen (exact
paths, one per line, per the WORKSPACE_DECLARED_DELETIONS gate). Deletions
identified later (for example the M9 retirement of superseded `bin/*.mjs`
entry points under tasks 10.1) are appended to this section before the
deletion is made. Session-created files that are deleted again inside the
same session produce no net deletion and need no declaration.

NONE

Archived terminal changes (2026-10-10, campaign task 14.6): sixty-six active changes were
archived oldest-first under the canonical OpenSpec rules, leaving exactly one active change
(`nightwatch-final-product-completion-v1`, this campaign). Each was archived with spec sync
when its capability was delivered as written, and with `--skip-specs` plus a disposition record
in `openspec/changes/archive/ARCHIVE-INDEX.md` when its spec delta described narrowed,
quarantined, residual or superseded behaviour. Every pre-move path is declared here and
reappears under `openspec/changes/archive/` in the same change, so no tracked file is lost.

- `openspec/changes/nightwatch-agent-tool-fixture-fallback-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-agent-tool-fixture-fallback-integrity-v1/design.md`
- `openspec/changes/nightwatch-agent-tool-fixture-fallback-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-agent-tool-fixture-fallback-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-auth-capability-bundle-transaction-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-auth-capability-bundle-transaction-integrity-v1/design.md`
- `openspec/changes/nightwatch-auth-capability-bundle-transaction-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-auth-capability-bundle-transaction-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/design.md`
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/audit.md`
- `openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/design.md`
- `openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/proposal.md`
- `openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/tasks.md`
- `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/audit.md`
- `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/design.md`
- `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/proposal.md`
- `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/tasks.md`
- `openspec/changes/nightwatch-browser-context-guard-transaction-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-browser-context-guard-transaction-integrity-v1/design.md`
- `openspec/changes/nightwatch-browser-context-guard-transaction-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-browser-context-guard-transaction-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-browser-response-acquisition-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-browser-response-acquisition-integrity-v1/design.md`
- `openspec/changes/nightwatch-browser-response-acquisition-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-browser-response-acquisition-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-campaign-resume-reasoner-identity-binding-v1/.openspec.yaml`
- `openspec/changes/nightwatch-campaign-resume-reasoner-identity-binding-v1/design.md`
- `openspec/changes/nightwatch-campaign-resume-reasoner-identity-binding-v1/proposal.md`
- `openspec/changes/nightwatch-campaign-resume-reasoner-identity-binding-v1/tasks.md`
- `openspec/changes/nightwatch-canonical-promotion-transaction-serialization-v1/.openspec.yaml`
- `openspec/changes/nightwatch-canonical-promotion-transaction-serialization-v1/design.md`
- `openspec/changes/nightwatch-canonical-promotion-transaction-serialization-v1/proposal.md`
- `openspec/changes/nightwatch-canonical-promotion-transaction-serialization-v1/tasks.md`
- `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/audit.md`
- `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/design.md`
- `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-change-intelligence-source-generation-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-change-intelligence-source-generation-integrity-v1/design.md`
- `openspec/changes/nightwatch-change-intelligence-source-generation-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-change-intelligence-source-generation-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/design.md`
- `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/.openspec.yaml`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/design.md`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/proposal.md`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/tasks.md`
- `openspec/changes/nightwatch-child-process-census-indirection-v1/.openspec.yaml`
- `openspec/changes/nightwatch-child-process-census-indirection-v1/design.md`
- `openspec/changes/nightwatch-child-process-census-indirection-v1/proposal.md`
- `openspec/changes/nightwatch-child-process-census-indirection-v1/tasks.md`
- `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/design.md`
- `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-configuration-layer-authority-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-configuration-layer-authority-integrity-v1/design.md`
- `openspec/changes/nightwatch-configuration-layer-authority-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-configuration-layer-authority-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/.openspec.yaml`
- `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/design.md`
- `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/proposal.md`
- `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-design-system-v1/.openspec.yaml`
- `openspec/changes/nightwatch-control-center-design-system-v1/audit.md`
- `openspec/changes/nightwatch-control-center-design-system-v1/design.md`
- `openspec/changes/nightwatch-control-center-design-system-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-design-system-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-finding-status-projection-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-control-center-finding-status-projection-integrity-v1/design.md`
- `openspec/changes/nightwatch-control-center-finding-status-projection-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-finding-status-projection-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-credential-use-binding-successor-v1/.openspec.yaml`
- `openspec/changes/nightwatch-credential-use-binding-successor-v1/design.md`
- `openspec/changes/nightwatch-credential-use-binding-successor-v1/proposal.md`
- `openspec/changes/nightwatch-credential-use-binding-successor-v1/tasks.md`
- `openspec/changes/nightwatch-dev-credential-use-binding-v1/.openspec.yaml`
- `openspec/changes/nightwatch-dev-credential-use-binding-v1/design.md`
- `openspec/changes/nightwatch-dev-credential-use-binding-v1/proposal.md`
- `openspec/changes/nightwatch-dev-credential-use-binding-v1/tasks.md`
- `openspec/changes/nightwatch-durable-artifact-validation-bounds-v1/.openspec.yaml`
- `openspec/changes/nightwatch-durable-artifact-validation-bounds-v1/design.md`
- `openspec/changes/nightwatch-durable-artifact-validation-bounds-v1/proposal.md`
- `openspec/changes/nightwatch-durable-artifact-validation-bounds-v1/tasks.md`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/design.md`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/proposal.md`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/tasks.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/.openspec.yaml`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/audit.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/design.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/proposal.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/tasks.md`
- `openspec/changes/nightwatch-exploration-observed-postcondition-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-exploration-observed-postcondition-integrity-v1/design.md`
- `openspec/changes/nightwatch-exploration-observed-postcondition-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-exploration-observed-postcondition-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-investigation-resume-budget-arithmetic-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-investigation-resume-budget-arithmetic-integrity-v1/design.md`
- `openspec/changes/nightwatch-investigation-resume-budget-arithmetic-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-investigation-resume-budget-arithmetic-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-l6-qualification-proof-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-l6-qualification-proof-integrity-v1/design.md`
- `openspec/changes/nightwatch-l6-qualification-proof-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-l6-qualification-proof-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-live-source-test-hermeticity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-live-source-test-hermeticity-v1/design.md`
- `openspec/changes/nightwatch-live-source-test-hermeticity-v1/proposal.md`
- `openspec/changes/nightwatch-live-source-test-hermeticity-v1/tasks.md`
- `openspec/changes/nightwatch-local-finding-admission-grounding-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-local-finding-admission-grounding-integrity-v1/design.md`
- `openspec/changes/nightwatch-local-finding-admission-grounding-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-local-finding-admission-grounding-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-local-report-publication-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-local-report-publication-integrity-v1/design.md`
- `openspec/changes/nightwatch-local-report-publication-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-local-report-publication-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-phase5-relay-invocation-authority-v1/.openspec.yaml`
- `openspec/changes/nightwatch-phase5-relay-invocation-authority-v1/design.md`
- `openspec/changes/nightwatch-phase5-relay-invocation-authority-v1/proposal.md`
- `openspec/changes/nightwatch-phase5-relay-invocation-authority-v1/tasks.md`
- `openspec/changes/nightwatch-phase6-owner-scope-quarantine-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-phase6-owner-scope-quarantine-integrity-v1/design.md`
- `openspec/changes/nightwatch-phase6-owner-scope-quarantine-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-phase6-owner-scope-quarantine-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/audit.md`
- `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/design.md`
- `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/proposal.md`
- `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/tasks.md`
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/design.md`
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-production-budget-reservation-lifecycle-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-production-budget-reservation-lifecycle-integrity-v1/design.md`
- `openspec/changes/nightwatch-production-budget-reservation-lifecycle-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-production-budget-reservation-lifecycle-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/.openspec.yaml`
- `openspec/changes/nightwatch-production-completion-programme-v1/audit.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/design.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/proposal.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/.openspec.yaml`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/audit.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/design.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/proposal.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/tasks.md`
- `openspec/changes/nightwatch-production-observation-receipt-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-production-observation-receipt-integrity-v1/design.md`
- `openspec/changes/nightwatch-production-observation-receipt-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-production-observation-receipt-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-production-persistence-lifecycle-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-production-persistence-lifecycle-integrity-v1/design.md`
- `openspec/changes/nightwatch-production-persistence-lifecycle-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-production-persistence-lifecycle-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-protocol-dossier-readiness-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-protocol-dossier-readiness-integrity-v1/design.md`
- `openspec/changes/nightwatch-protocol-dossier-readiness-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-protocol-dossier-readiness-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/.openspec.yaml`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/audit.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/design.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/proposal.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/tasks.md`
- `openspec/changes/nightwatch-proxy-event-firewall-v1/.openspec.yaml`
- `openspec/changes/nightwatch-proxy-event-firewall-v1/design.md`
- `openspec/changes/nightwatch-proxy-event-firewall-v1/proposal.md`
- `openspec/changes/nightwatch-proxy-event-firewall-v1/tasks.md`
- `openspec/changes/nightwatch-proxy-evidence-effect-ordering-v1/.openspec.yaml`
- `openspec/changes/nightwatch-proxy-evidence-effect-ordering-v1/design.md`
- `openspec/changes/nightwatch-proxy-evidence-effect-ordering-v1/proposal.md`
- `openspec/changes/nightwatch-proxy-evidence-effect-ordering-v1/tasks.md`
- `openspec/changes/nightwatch-proxy-runtime-instance-attestation-v1/.openspec.yaml`
- `openspec/changes/nightwatch-proxy-runtime-instance-attestation-v1/design.md`
- `openspec/changes/nightwatch-proxy-runtime-instance-attestation-v1/proposal.md`
- `openspec/changes/nightwatch-proxy-runtime-instance-attestation-v1/tasks.md`
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/design.md`
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-real-source-expectation-authority-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-real-source-expectation-authority-integrity-v1/design.md`
- `openspec/changes/nightwatch-real-source-expectation-authority-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-real-source-expectation-authority-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/design.md`
- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-replay-context-provenance-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-replay-context-provenance-integrity-v1/design.md`
- `openspec/changes/nightwatch-replay-context-provenance-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-replay-context-provenance-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/.openspec.yaml`
- `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/design.md`
- `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/proposal.md`
- `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/tasks.md`
- `openspec/changes/nightwatch-run-evidence-bundle-transaction-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-run-evidence-bundle-transaction-integrity-v1/design.md`
- `openspec/changes/nightwatch-run-evidence-bundle-transaction-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-run-evidence-bundle-transaction-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-run-evidence-transaction-successor-v1/.openspec.yaml`
- `openspec/changes/nightwatch-run-evidence-transaction-successor-v1/design.md`
- `openspec/changes/nightwatch-run-evidence-transaction-successor-v1/proposal.md`
- `openspec/changes/nightwatch-run-evidence-transaction-successor-v1/tasks.md`
- `openspec/changes/nightwatch-schema-preservation-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-schema-preservation-integrity-v1/design.md`
- `openspec/changes/nightwatch-schema-preservation-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-schema-preservation-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-coverage-evidence-authority-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-coverage-evidence-authority-v1/design.md`
- `openspec/changes/nightwatch-semantic-coverage-evidence-authority-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-coverage-evidence-authority-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-gap-ledger-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-gap-ledger-integrity-v1/design.md`
- `openspec/changes/nightwatch-semantic-gap-ledger-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-gap-ledger-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-partial-observation-soundness-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-partial-observation-soundness-v1/design.md`
- `openspec/changes/nightwatch-semantic-partial-observation-soundness-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-partial-observation-soundness-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-receipt-acceptance-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-receipt-acceptance-integrity-v1/design.md`
- `openspec/changes/nightwatch-semantic-receipt-acceptance-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-receipt-acceptance-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/design.md`
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-semantic-source-analyzer-proof-soundness-v1/.openspec.yaml`
- `openspec/changes/nightwatch-semantic-source-analyzer-proof-soundness-v1/design.md`
- `openspec/changes/nightwatch-semantic-source-analyzer-proof-soundness-v1/proposal.md`
- `openspec/changes/nightwatch-semantic-source-analyzer-proof-soundness-v1/tasks.md`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/.openspec.yaml`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/audit.md`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/design.md`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/proposal.md`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/tasks.md`
- `openspec/changes/nightwatch-shard-certification-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-shard-certification-integrity-v1/design.md`
- `openspec/changes/nightwatch-shard-certification-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-shard-certification-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-shard-temp-isolation-v1/.openspec.yaml`
- `openspec/changes/nightwatch-shard-temp-isolation-v1/design.md`
- `openspec/changes/nightwatch-shard-temp-isolation-v1/proposal.md`
- `openspec/changes/nightwatch-shard-temp-isolation-v1/tasks.md`
- `openspec/changes/nightwatch-source-snapshot-transaction-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-source-snapshot-transaction-integrity-v1/design.md`
- `openspec/changes/nightwatch-source-snapshot-transaction-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-source-snapshot-transaction-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/.openspec.yaml`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/audit.md`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/design.md`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/proposal.md`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/tasks.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/audit.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/design.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/proposal.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/tasks.md`
- `openspec/changes/nightwatch-triage-evidence-contract-integrity-v1/.openspec.yaml`
- `openspec/changes/nightwatch-triage-evidence-contract-integrity-v1/design.md`
- `openspec/changes/nightwatch-triage-evidence-contract-integrity-v1/proposal.md`
- `openspec/changes/nightwatch-triage-evidence-contract-integrity-v1/tasks.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/.openspec.yaml`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/design.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/proposal.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/tasks.md`

Not part of this archive step (already declared above or session-created):

- `openspec/changes/nightwatch-agent-tool-fixture-fallback-integrity-v1/specs/agent-tool-fixture-fallback-integrity/spec.md`
- `openspec/changes/nightwatch-auth-capability-bundle-transaction-integrity-v1/specs/auth-capability-bundle-integrity/spec.md`
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/specs/authenticated-evidence-minimization-integrity/spec.md`
- `openspec/changes/nightwatch-autonomous-bug-hunting-programme-v1/specs/agent-protocol/spec.md`
- `openspec/changes/nightwatch-autonomous-yield-proof-w11-v1/specs/autonomous-yield-proof/spec.md`
- `openspec/changes/nightwatch-browser-context-guard-transaction-integrity-v1/specs/browser-context-guard-transaction-integrity/spec.md`
- `openspec/changes/nightwatch-browser-response-acquisition-integrity-v1/specs/browser-response-acquisition-integrity/spec.md`
- `openspec/changes/nightwatch-campaign-resume-reasoner-identity-binding-v1/specs/campaign-resume-reasoner-identity-binding/spec.md`
- `openspec/changes/nightwatch-canonical-promotion-transaction-serialization-v1/specs/canonical-promotion-transaction-integrity/spec.md`
- `openspec/changes/nightwatch-certification-closure-and-validation-integrity-v1/specs/validation-integrity/spec.md`
- `openspec/changes/nightwatch-change-intelligence-source-generation-integrity-v1/specs/change-intelligence-source-generation-integrity/spec.md`
- `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/specs/source-analysis-runtime-hardening/spec.md`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/specs/child-process-boundary-totality/spec.md`
- `openspec/changes/nightwatch-child-process-census-indirection-v1/specs/child-process-census-indirection-integrity/spec.md`
- `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/specs/exact-head-ci-baseline/spec.md`
- `openspec/changes/nightwatch-configuration-layer-authority-integrity-v1/specs/configuration-layer-authority-integrity/spec.md`
- `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/specs/agent-continuity-live-waypoint/spec.md`
- `openspec/changes/nightwatch-control-center-design-system-v1/specs/control-center-design-system/spec.md`
- `openspec/changes/nightwatch-control-center-finding-status-projection-integrity-v1/specs/control-center-finding-status-projection-integrity/spec.md`
- `openspec/changes/nightwatch-credential-use-binding-successor-v1/specs/auth-use-binding-integrity/spec.md`
- `openspec/changes/nightwatch-dev-credential-use-binding-v1/specs/dev-credential-use-binding/spec.md`
- `openspec/changes/nightwatch-durable-artifact-validation-bounds-v1/specs/durable-artifact-validation-bounds/spec.md`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/specs/reproducibility/spec.md`
- `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/specs/runtime-toolchain-integrity/spec.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/specs/exhaustive-audit-coverage/spec.md`
- `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/specs/remediation-proposal-portfolio/spec.md`
- `openspec/changes/nightwatch-exploration-observed-postcondition-integrity-v1/specs/exploration-observed-postcondition-integrity/spec.md`
- `openspec/changes/nightwatch-investigation-resume-budget-arithmetic-integrity-v1/specs/investigation-resume-budget-arithmetic-integrity/spec.md`
- `openspec/changes/nightwatch-l6-qualification-proof-integrity-v1/specs/l6-qualification-proof-integrity/spec.md`
- `openspec/changes/nightwatch-live-source-test-hermeticity-v1/specs/live-source-test-hermeticity/spec.md`
- `openspec/changes/nightwatch-local-finding-admission-grounding-integrity-v1/specs/local-finding-admission-grounding-integrity/spec.md`
- `openspec/changes/nightwatch-local-report-publication-integrity-v1/specs/local-report-publication-integrity/spec.md`
- `openspec/changes/nightwatch-phase5-relay-invocation-authority-v1/specs/phase5-relay-invocation-authority/spec.md`
- `openspec/changes/nightwatch-phase6-owner-scope-quarantine-integrity-v1/specs/phase6-owner-scope-quarantine-integrity/spec.md`
- `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/specs/priority-audit-remediation-sequence/spec.md`
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/specs/private-payload-screening-structural-integrity/spec.md`
- `openspec/changes/nightwatch-production-budget-reservation-lifecycle-integrity-v1/specs/production-budget-reservation-lifecycle-integrity/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/accessibility-certification/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/authenticated-capability-lifecycle/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/autonomous-yield-proof/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/cli-implementation-contract/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/completion-ledger-truth/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/configuration-contract/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/contained-dev-semantic-acceptance/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/control-center-residual-truth/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/dead-architecture-closure/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/dependency-supply-chain-currency/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/deployment-fact-acquisition/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/documentation-currency/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/evidence-lifecycle-hygiene/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/exact-head-ci-authority/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/operator-cli-contract/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/production-observation-readiness/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/release-definition-and-verdict/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/schema-version-lifecycle/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/structural-rule-soundness/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/ui-error-taxonomy-rendering/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/validation-lane-closure/spec.md`
- `openspec/changes/nightwatch-production-completion-programme-v1/specs/workspace-continuity-drift-closure/spec.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/specs/coverage-ledger/spec.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/specs/prod-observe/spec.md`
- `openspec/changes/nightwatch-production-observability-system-map-master-plan-v1/specs/whole-system-map/spec.md`
- `openspec/changes/nightwatch-production-observation-receipt-integrity-v1/specs/production-observation-receipt-integrity/spec.md`
- `openspec/changes/nightwatch-production-persistence-lifecycle-integrity-v1/specs/production-persistence-lifecycle-integrity/spec.md`
- `openspec/changes/nightwatch-protocol-dossier-readiness-integrity-v1/specs/protocol-dossier-readiness-integrity/spec.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/specs/current-source-yield-measurement/spec.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/specs/provider-resilience-policy/spec.md`
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/specs/residual-closure/spec.md`
- `openspec/changes/nightwatch-proxy-event-firewall-v1/specs/proxy-event-firewall-integrity/spec.md`
- `openspec/changes/nightwatch-proxy-evidence-effect-ordering-v1/specs/proxy-evidence-effect-ordering/spec.md`
- `openspec/changes/nightwatch-proxy-runtime-instance-attestation-v1/specs/proxy-runtime-instance-attestation/spec.md`
- `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/specs/published-spec-baseline-integrity/spec.md`
- `openspec/changes/nightwatch-real-source-expectation-authority-integrity-v1/specs/real-source-expectation-authority-integrity/spec.md`
- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/specs/release-evidence-lineage-integrity/spec.md`
- `openspec/changes/nightwatch-replay-context-provenance-integrity-v1/specs/replay-context-provenance-integrity/spec.md`
- `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/specs/retention-transaction-auditability/spec.md`
- `openspec/changes/nightwatch-run-evidence-bundle-transaction-integrity-v1/specs/run-evidence-bundle-transaction-integrity/spec.md`
- `openspec/changes/nightwatch-run-evidence-transaction-successor-v1/specs/run-evidence-transaction-successor-integrity/spec.md`
- `openspec/changes/nightwatch-schema-preservation-integrity-v1/specs/schema-preservation-integrity/spec.md`
- `openspec/changes/nightwatch-semantic-coverage-evidence-authority-v1/specs/semantic-coverage-evidence-authority/spec.md`
- `openspec/changes/nightwatch-semantic-gap-ledger-integrity-v1/specs/semantic-gap-ledger-integrity/spec.md`
- `openspec/changes/nightwatch-semantic-partial-observation-soundness-v1/specs/semantic-partial-observation-soundness/spec.md`
- `openspec/changes/nightwatch-semantic-receipt-acceptance-integrity-v1/specs/semantic-receipt-acceptance-integrity/spec.md`
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/specs/semantic-request-admission-integrity/spec.md`
- `openspec/changes/nightwatch-semantic-source-analyzer-proof-soundness-v1/specs/semantic-source-analyzer-proof-soundness/spec.md`
- `openspec/changes/nightwatch-session-mutation-authority-binding-v1/specs/concurrency-workspace-hardening/spec.md`
- `openspec/changes/nightwatch-shard-certification-integrity-v1/specs/shard-certification-integrity/spec.md`
- `openspec/changes/nightwatch-shard-temp-isolation-v1/specs/shard-temp-isolation/spec.md`
- `openspec/changes/nightwatch-source-snapshot-transaction-integrity-v1/specs/source-snapshot-transaction-integrity/spec.md`
- `openspec/changes/nightwatch-successor-campaign-engine-v1/specs/successor-campaign-engine/spec.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/specs/developer-validation-lanes/spec.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/specs/validation-execution-parallelism/spec.md`
- `openspec/changes/nightwatch-test-infrastructure-performance-v1/specs/validation-performance-measurement/spec.md`
- `openspec/changes/nightwatch-triage-evidence-contract-integrity-v1/specs/triage-evidence-contract-integrity/spec.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/specs/residual-closure/spec.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/specs/semantic-skip-identity/spec.md`
- `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/specs/validation-classification-truth/spec.md`
