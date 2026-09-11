# Nightwatch production completion programme

## Task purpose

Execute the bounded 21-group programme specified by
`openspec/changes/nightwatch-production-completion-programme-v1/` so that
Nightwatch closes the record-level gaps (F-01 … F-12) and the code-level gaps
(F-13 … F-21) that remain after the eleven consecutive terminal campaigns
certified at `36bd493`, and leaves every locally closable lane closed with
honest evidence and every externally blocked lane recorded with a named owner
action and revisit condition.

## Established starting state

- Task ID: `nightwatch-production-completion-programme-v1`
- Starting SHA: `36bd4930db978423f97e16f35250c2e66bfa112c`
  (`HEAD == origin/main`, working tree clean apart from the untracked OpenSpec
  change this task executes).
- Predecessor `nightwatch-control-center-style-and-absence-truth-v1` is
  terminal COMPLETE and integrated; A-01 through A-04 closed.
- Measured baseline (audit.md, reconfirmed live): `typecheck`,
  `hardening:check`, `project:check`, `agent:check`, `validation:universe`
  and `session:status` PASS; 432 declared checks with 18 never executed;
  `POSITIVE_DEPLOYMENT_FACTS: 0`; 0 admitted findings; 57 OpenSpec changes
  with 150 stale unchecked boxes; 31 legacy v1 task records; 19 historical
  `test-results*` roots; 904 lines of confirmed dead architecture; 62 CLI
  entry points bound by runtime string paths; 319 schema literals with no
  lifecycle; no accessibility evidence.
- The permanent owner scope freeze, L6 containment, fail-closed egress,
  C-00 protocol, C-10 privacy firewall and D-4 production unloadability all
  remain binding and unchanged.

## Required deliverables

1. Groups 1–13: ledger truth and the spec baseline; validation lane state as
   data; CI-topology clean gate and exact-head CI authority; operator CLI
   contract; evidence lifecycle hygiene; workspace/continuity drift closure;
   documentation currency; Control Center residual truth; dependency and
   supply-chain currency; deployment fact acquisition; contained DEV semantic
   acceptance; autonomous yield proof; release definition and verdict.
2. Groups 14–21: dead architecture closure; CLI-to-implementation contract;
   structural rule soundness; schema version lifecycle; UI error taxonomy
   rendering; configuration contract and UI decomposition; accessibility
   certification; authenticated capability lifecycle.
3. Every group's own tasks.md boxes ticked only when its acceptance evidence
   exists; every owner-decision or external dependency recorded as a decision
   request or a blocking condition, never fabricated.
4. `REPORT.md`, task `STATE.md`, `.agent/ACTIVE_TASK.md`,
   `.agent/EXECUTION_PROMPT.md` and the durable docs reconciled to the
   certified checkpoint.

## Explicit non-goals

- Contact with any real Alphaus environment, production data, database,
  sibling repository write, or credential use.
- Acquiring or self-authorizing the owner/organizational decisions the
  programme names (CI route, egress authorization, `mochi` access, evidence
  reclaim approval, branch deletion, provider capability).
- Weakening any authorization gate, the privacy firewall, C-00, or the owner
  scope freeze.
- Re-opening any terminal campaign's findings.
- Publishing anything outside the repository.

## Safety constraints

- LOCAL only; sibling repositories stay read-only.
- Never force-push, rebase or amend another session's commits; never touch
  another owner's session (`nightwatch-repository-hardening--e7b9be89` is
  foreign and remains untouched).
- One writing agent, one owned session worktree, one session identity.
- No secret, credential, token, cookie, or raw customer value enters source,
  artifacts or `.agent` files.
- Every deletion of a tracked file is declared under `## Declared Deletions`
  before validation.

## Declared Deletions

The 54 terminal OpenSpec changes archived by G1 move their tracked files
from `openspec/changes/<id>/` to `openspec/changes/archive/<date>-<id>/`.
The old paths are the deletions; the archive paths are additions in the same
commit. This declaration covers exactly those moves and any other tracked
deletion listed below.

- `openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/audit.md`
- `openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/design.md`
- `openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/proposal.md`
- `openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/specs/finding-handoff/spec.md`
- `openspec/changes/nightwatch-alphaus-finding-handoff-c12-readiness-v1/tasks.md`
- `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/audit.md`
- `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/design.md`
- `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/proposal.md`
- `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/specs/production-provenance-authority/spec.md`
- `openspec/changes/nightwatch-c10-provenance-truth-closure-v1/tasks.md`
- `openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/audit.md`
- `openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/design.md`
- `openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/specs/campaign-handoff-truth/spec.md`
- `openspec/changes/nightwatch-campaign-handoff-and-project-truth-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-certification-truth-r12-v1/audit.md`
- `openspec/changes/nightwatch-certification-truth-r12-v1/design.md`
- `openspec/changes/nightwatch-certification-truth-r12-v1/proposal.md`
- `openspec/changes/nightwatch-certification-truth-r12-v1/specs/campaign-certification-registry/spec.md`
- `openspec/changes/nightwatch-certification-truth-r12-v1/tasks.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/.openspec.yaml`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/audit.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/design.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/proposal.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/specs/concurrency-workspace-hardening/spec.md`
- `openspec/changes/nightwatch-concurrency-workspace-hardening-c00-v1/tasks.md`
- `openspec/changes/nightwatch-continuous-deep-hardening-v1/audit.md`
- `openspec/changes/nightwatch-continuous-deep-hardening-v1/design.md`
- `openspec/changes/nightwatch-continuous-deep-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-continuous-deep-hardening-v1/specs/continuous-hardening/spec.md`
- `openspec/changes/nightwatch-continuous-deep-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-click-robustness-v1/audit.md`
- `openspec/changes/nightwatch-control-center-click-robustness-v1/design.md`
- `openspec/changes/nightwatch-control-center-click-robustness-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-click-robustness-v1/specs/click-robustness/spec.md`
- `openspec/changes/nightwatch-control-center-click-robustness-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-placement-coverage-v1/audit.md`
- `openspec/changes/nightwatch-control-center-placement-coverage-v1/design.md`
- `openspec/changes/nightwatch-control-center-placement-coverage-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-placement-coverage-v1/specs/placement-coverage/spec.md`
- `openspec/changes/nightwatch-control-center-placement-coverage-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-render-truth-v1/audit.md`
- `openspec/changes/nightwatch-control-center-render-truth-v1/design.md`
- `openspec/changes/nightwatch-control-center-render-truth-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-render-truth-v1/specs/render-truth/spec.md`
- `openspec/changes/nightwatch-control-center-render-truth-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/audit.md`
- `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/design.md`
- `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/specs/style-and-absence-truth/spec.md`
- `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/tasks.md`
- `openspec/changes/nightwatch-control-center-ui-completion-v1/audit.md`
- `openspec/changes/nightwatch-control-center-ui-completion-v1/design.md`
- `openspec/changes/nightwatch-control-center-ui-completion-v1/proposal.md`
- `openspec/changes/nightwatch-control-center-ui-completion-v1/specs/control-center-ui-completion/spec.md`
- `openspec/changes/nightwatch-control-center-ui-completion-v1/tasks.md`
- `openspec/changes/nightwatch-dep-docs-reconciliation-v1/audit.md`
- `openspec/changes/nightwatch-dep-docs-reconciliation-v1/design.md`
- `openspec/changes/nightwatch-dep-docs-reconciliation-v1/proposal.md`
- `openspec/changes/nightwatch-dep-docs-reconciliation-v1/specs/reconciliation/spec.md`
- `openspec/changes/nightwatch-dep-docs-reconciliation-v1/tasks.md`
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/audit.md`
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/design.md`
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/proposal.md`
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/specs/deployment-fact-binding/spec.md`
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/tasks.md`
- `openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/audit.md`
- `openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/design.md`
- `openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/proposal.md`
- `openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/specs/derived-endpoint-semantics/spec.md`
- `openspec/changes/nightwatch-derived-semantics-dev-targets-c07-v1/tasks.md`
- `openspec/changes/nightwatch-dev-requalification-v1/.openspec.yaml`
- `openspec/changes/nightwatch-dev-requalification-v1/audit.md`
- `openspec/changes/nightwatch-dev-requalification-v1/design.md`
- `openspec/changes/nightwatch-dev-requalification-v1/proposal.md`
- `openspec/changes/nightwatch-dev-requalification-v1/specs/bounded-dev-requalification/spec.md`
- `openspec/changes/nightwatch-dev-requalification-v1/tasks.md`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/.openspec.yaml`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/audit.md`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/design.md`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/proposal.md`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/specs/dev-soak-replay-yield/spec.md`
- `openspec/changes/nightwatch-dev-soak-replay-yield-v1/tasks.md`
- `openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/audit.md`
- `openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/design.md`
- `openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/specs/durable-artifact-control-center-truth/spec.md`
- `openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/audit.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/design.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/proposal.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/specs/expected-information-gain/spec.md`
- `openspec/changes/nightwatch-eig-prioritization-c16-v1/tasks.md`
- `openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/audit.md`
- `openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/design.md`
- `openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/proposal.md`
- `openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/specs/exact-head-ci-baseline/spec.md`
- `openspec/changes/nightwatch-exact-head-ci-baseline-repair-v1/tasks.md`
- `openspec/changes/nightwatch-explain-id-flag-v1/audit.md`
- `openspec/changes/nightwatch-explain-id-flag-v1/design.md`
- `openspec/changes/nightwatch-explain-id-flag-v1/proposal.md`
- `openspec/changes/nightwatch-explain-id-flag-v1/specs/id-tolerance/spec.md`
- `openspec/changes/nightwatch-explain-id-flag-v1/tasks.md`
- `openspec/changes/nightwatch-explain-surface-flag-v1/audit.md`
- `openspec/changes/nightwatch-explain-surface-flag-v1/design.md`
- `openspec/changes/nightwatch-explain-surface-flag-v1/proposal.md`
- `openspec/changes/nightwatch-explain-surface-flag-v1/specs/arg-forms/spec.md`
- `openspec/changes/nightwatch-explain-surface-flag-v1/tasks.md`
- `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/audit.md`
- `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/design.md`
- `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/specs/final-assurance/spec.md`
- `openspec/changes/nightwatch-final-assurance-release-readiness-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/.openspec.yaml`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/audit.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/design.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/proposal.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/specs/final-release-certification/spec.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/specs/process-network-containment/spec.md`
- `openspec/changes/nightwatch-final-completion-and-l6-containment-v1/tasks.md`
- `openspec/changes/nightwatch-final-reproducibility-polish-v1/audit.md`
- `openspec/changes/nightwatch-final-reproducibility-polish-v1/design.md`
- `openspec/changes/nightwatch-final-reproducibility-polish-v1/proposal.md`
- `openspec/changes/nightwatch-final-reproducibility-polish-v1/specs/reproducibility/spec.md`
- `openspec/changes/nightwatch-final-reproducibility-polish-v1/tasks.md`
- `openspec/changes/nightwatch-frontend-consumer-intelligence-c04-v1/audit.md`
- `openspec/changes/nightwatch-frontend-consumer-intelligence-c04-v1/design.md`
- `openspec/changes/nightwatch-frontend-consumer-intelligence-c04-v1/proposal.md`
- `openspec/changes/nightwatch-frontend-consumer-intelligence-c04-v1/specs/frontend-consumer-intelligence/spec.md`
- `openspec/changes/nightwatch-frontend-consumer-intelligence-c04-v1/tasks.md`
- `openspec/changes/nightwatch-frontier-completion-reliability-v1/audit.md`
- `openspec/changes/nightwatch-frontier-completion-reliability-v1/design.md`
- `openspec/changes/nightwatch-frontier-completion-reliability-v1/proposal.md`
- `openspec/changes/nightwatch-frontier-completion-reliability-v1/specs/frontier/spec.md`
- `openspec/changes/nightwatch-frontier-completion-reliability-v1/tasks.md`
- `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/audit.md`
- `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/design.md`
- `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/proposal.md`
- `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/specs/go-grpc-topology-binding/spec.md`
- `openspec/changes/nightwatch-go-grpc-topology-binding-c03-v1/tasks.md`
- `openspec/changes/nightwatch-openapi-admission-c02a-v1/audit.md`
- `openspec/changes/nightwatch-openapi-admission-c02a-v1/design.md`
- `openspec/changes/nightwatch-openapi-admission-c02a-v1/proposal.md`
- `openspec/changes/nightwatch-openapi-admission-c02a-v1/specs/openapi-admission/spec.md`
- `openspec/changes/nightwatch-openapi-admission-c02a-v1/tasks.md`
- `openspec/changes/nightwatch-operational-acceptance-v1/audit.md`
- `openspec/changes/nightwatch-operational-acceptance-v1/design.md`
- `openspec/changes/nightwatch-operational-acceptance-v1/proposal.md`
- `openspec/changes/nightwatch-operational-acceptance-v1/specs/operational-acceptance/spec.md`
- `openspec/changes/nightwatch-operational-acceptance-v1/tasks.md`
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/audit.md`
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/design.md`
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/proposal.md`
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/specs/overnight-reliability/spec.md`
- `openspec/changes/nightwatch-overnight-reliability-r13-v1/tasks.md`
- `openspec/changes/nightwatch-owner-local-review-persistence-v1/audit.md`
- `openspec/changes/nightwatch-owner-local-review-persistence-v1/design.md`
- `openspec/changes/nightwatch-owner-local-review-persistence-v1/proposal.md`
- `openspec/changes/nightwatch-owner-local-review-persistence-v1/specs/review-persistence/spec.md`
- `openspec/changes/nightwatch-owner-local-review-persistence-v1/tasks.md`
- `openspec/changes/nightwatch-p1-observation-scope-ma8-v1/audit.md`
- `openspec/changes/nightwatch-p1-observation-scope-ma8-v1/design.md`
- `openspec/changes/nightwatch-p1-observation-scope-ma8-v1/proposal.md`
- `openspec/changes/nightwatch-p1-observation-scope-ma8-v1/specs/p1-observation-scope/spec.md`
- `openspec/changes/nightwatch-p1-observation-scope-ma8-v1/tasks.md`
- `openspec/changes/nightwatch-php-readonly-proof-c06-v1/audit.md`
- `openspec/changes/nightwatch-php-readonly-proof-c06-v1/design.md`
- `openspec/changes/nightwatch-php-readonly-proof-c06-v1/proposal.md`
- `openspec/changes/nightwatch-php-readonly-proof-c06-v1/specs/php-readonly-proof/spec.md`
- `openspec/changes/nightwatch-php-readonly-proof-c06-v1/tasks.md`
- `openspec/changes/nightwatch-plan-explain-coherence-v1/audit.md`
- `openspec/changes/nightwatch-plan-explain-coherence-v1/design.md`
- `openspec/changes/nightwatch-plan-explain-coherence-v1/proposal.md`
- `openspec/changes/nightwatch-plan-explain-coherence-v1/specs/coherence/spec.md`
- `openspec/changes/nightwatch-plan-explain-coherence-v1/tasks.md`
- `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/audit.md`
- `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/design.md`
- `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/proposal.md`
- `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/specs/post-acceptance-hardening/spec.md`
- `openspec/changes/nightwatch-post-acceptance-production-hardening-and-yield-expansion-v1/tasks.md`
- `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/audit.md`
- `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/design.md`
- `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/proposal.md`
- `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/specs/prod-observe-safety-kernel/spec.md`
- `openspec/changes/nightwatch-prod-observe-safety-kernel-c11-v1/tasks.md`
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/audit.md`
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/design.md`
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/proposal.md`
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/specs/production-privacy-firewall/spec.md`
- `openspec/changes/nightwatch-production-privacy-firewall-c10-v1/tasks.md`
- `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/audit.md`
- `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/design.md`
- `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/proposal.md`
- `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/specs/protobuf-source-intelligence/spec.md`
- `openspec/changes/nightwatch-protobuf-source-intelligence-c02b-v1/tasks.md`
- `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/audit.md`
- `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/design.md`
- `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/proposal.md`
- `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/specs/proxy-gate-reliability/spec.md`
- `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/tasks.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/.openspec.yaml`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/audit.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/design.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/proposal.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/specs/campaign-yield-scheduling/spec.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/specs/replay-reliability/spec.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/specs/task-verdict-protocol/spec.md`
- `openspec/changes/nightwatch-reliability-yield-and-state-protocol-v1/tasks.md`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/.openspec.yaml`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/audit.md`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/design.md`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/proposal.md`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/specs/replay-budget-dossier/spec.md`
- `openspec/changes/nightwatch-replay-budget-and-dossier-closure-v1/tasks.md`
- `openspec/changes/nightwatch-repository-hardening-implementation-v1/audit.md`
- `openspec/changes/nightwatch-repository-hardening-implementation-v1/design.md`
- `openspec/changes/nightwatch-repository-hardening-implementation-v1/proposal.md`
- `openspec/changes/nightwatch-repository-hardening-implementation-v1/specs/repository-hardening/spec.md`
- `openspec/changes/nightwatch-repository-hardening-implementation-v1/tasks.md`
- `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/audit.md`
- `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/design.md`
- `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/proposal.md`
- `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/specs/residual-closure/spec.md`
- `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/tasks.md`
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/audit.md`
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/design.md`
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/specs/resolved-egress-containment/spec.md`
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/audit.md`
- `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/design.md`
- `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/proposal.md`
- `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/specs/reviewer-scale/spec.md`
- `openspec/changes/nightwatch-reviewer-surface-and-intel-scale-v1/tasks.md`
- `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/audit.md`
- `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/design.md`
- `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/specs/source-analysis-runtime-hardening/spec.md`
- `openspec/changes/nightwatch-source-analysis-runtime-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/audit.md`
- `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/design.md`
- `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/proposal.md`
- `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/specs/source-proof-soundness/spec.md`
- `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/tasks.md`
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/audit.md`
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/design.md`
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/proposal.md`
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/specs/spec-derived-expectations/spec.md`
- `openspec/changes/nightwatch-spec-derived-expectations-c09-v1/tasks.md`
- `openspec/changes/nightwatch-system-map-v2-c15b-v1/audit.md`
- `openspec/changes/nightwatch-system-map-v2-c15b-v1/design.md`
- `openspec/changes/nightwatch-system-map-v2-c15b-v1/proposal.md`
- `openspec/changes/nightwatch-system-map-v2-c15b-v1/specs/system-map-v2/spec.md`
- `openspec/changes/nightwatch-system-map-v2-c15b-v1/tasks.md`
- `openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/audit.md`
- `openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/design.md`
- `openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/proposal.md`
- `openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/specs/system-map-v2-transport/spec.md`
- `openspec/changes/nightwatch-system-map-v2-transport-c15c-v1/tasks.md`
- `openspec/changes/nightwatch-systemmap-browser-stability-v1/audit.md`
- `openspec/changes/nightwatch-systemmap-browser-stability-v1/design.md`
- `openspec/changes/nightwatch-systemmap-browser-stability-v1/proposal.md`
- `openspec/changes/nightwatch-systemmap-browser-stability-v1/specs/browser-stability/spec.md`
- `openspec/changes/nightwatch-systemmap-browser-stability-v1/tasks.md`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/.openspec.yaml`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/audit.md`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/design.md`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/proposal.md`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/specs/truncation-truth-discovery-paging/spec.md`
- `openspec/changes/nightwatch-truncation-truth-discovery-paging-c01-v1/tasks.md`
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/audit.md`
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/design.md`
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/proposal.md`
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/specs/universe-admission-hygiene/spec.md`
- `openspec/changes/nightwatch-universe-admission-hygiene-c05-v1/tasks.md`
- `openspec/changes/nightwatch-unused-dep-removal-v1/audit.md`
- `openspec/changes/nightwatch-unused-dep-removal-v1/design.md`
- `openspec/changes/nightwatch-unused-dep-removal-v1/proposal.md`
- `openspec/changes/nightwatch-unused-dep-removal-v1/specs/dep-removal/spec.md`
- `openspec/changes/nightwatch-unused-dep-removal-v1/tasks.md`

G14 dead-architecture closure (14.9–14.11) removes nine zero-importer `index.ts`
barrels resolved to `REMOVED`; deep imports are the honest interface. The
deletions are declared here before validation per the workspace deletion gate.
`src/core/provenance/index.ts` is resolved `ENFORCED` (migrated, not deleted),
and `src/core/dtoFramework/` plus `src/core/adversarialCorpus/` remain under the
open G14.6 owner decision and are declared in the reasoned-retention list:

- `src/controlCenter/index.ts`
- `src/core/campaignIntelligence/index.ts`
- `src/core/investigationMemory/index.ts`
- `src/core/localInvestigation/index.ts`
- `src/core/ownerLocalReproduction/index.ts`
- `src/core/prodProvenance/index.ts`
- `src/core/reproductionSurface/index.ts`
- `src/core/selfDevSandbox/index.ts`
- `src/core/systemAtlas/index.ts`

## Acceptance criteria

- `openspec validate --all` exits zero and `openspec/specs/` is non-empty.
- Every implemented group has its tasks.md boxes ticked with evidence, and
  every un-closeable lane is recorded with its class, owner action and
  revisit condition.
- Root `typecheck`, `hardening:check`, `project:check`, `agent:check`,
  `validation:universe`, UI typecheck/tests/build, browser lane and the full
  offline regression pass at the final implementation checkpoint.
- `gate:local` passes at the certified checkpoint from the owned session with
  the project/task truth reconciled to it.
- The final `git diff` contains only intentional, specification-aligned
  changes; the session is integrated by fast-forward and `HEAD == origin/main`.
