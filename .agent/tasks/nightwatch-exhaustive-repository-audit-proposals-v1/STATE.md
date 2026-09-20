# Task State

## Identity

Task ID: nightwatch-exhaustive-repository-audit-proposals-v1
Phase: EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1
Status: IN_PROGRESS
Starting SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last validated implementation SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last substantive checkpoint SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-exhaustive-repository-ef157f7a
Last checkpoint: 2026-09-20 — M0 complete; M1 admitted NW-AUD-001, NW-AUD-004, NW-AUD-005, NW-AUD-006, NW-AUD-007, and NW-AUD-009 and produced six strict-valid issue-specific remediation proposals.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_VALIDATED_IMPLEMENTATION_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1_STATUS: IN_PROGRESS

## Objective

Audit the entire Nightwatch repository and produce a complete, prioritized set of evidence-backed, implementation-ready OpenSpec changes without modifying product implementation.

## Current Milestone

Milestone ID: M1
Milestone status: IN_PROGRESS
What is being attempted: complete repository topology, dependency, configuration, build, CLI/bin, generator, gate, and release-tooling inspection with decisive dispositions.

## Completed Milestones

- C-00 session creation and claim: PASS; owned worktree `session/nightwatch-exhaustive-repository-ef157f7a` at starting SHA `34517c9ba11c97407168fe5879ee03794dfff3e3`.
- Umbrella OpenSpec: 4/4 artifacts complete and strict validation PASS; capabilities `exhaustive-audit-coverage` and `remediation-proposal-portfolio` define the evidence and proposal contracts.
- Starting-tree coverage: 2,593 tracked paths classified by exhaustive top-level denominator; tree `9b6c1982251e2afa70877745b7787284e9f96a52`, inventory digest `939fe42065e7923e9dfd56eb46bfda38c8a2bb2e40127accc8efed75ab6a77f6`.
- M0 governed activation and coverage model: COMPLETE; durable authority and existing-planning indexes are recorded in `audit.md`.
- NW-AUD-001: PROPOSED (Medium/High-confidence); dedicated change `nightwatch-ci-action-supply-chain-integrity-v1` is 4/4 complete and strict-valid.
- NW-AUD-004: PROPOSED (Medium/High-confidence); dedicated change `nightwatch-exact-runtime-toolchain-identity-v1` is 4/4 complete and strict-valid.
- NW-AUD-005: PROPOSED (Medium/High-confidence); dedicated change `nightwatch-retention-crash-consistent-receipts-v1` is 4/4 complete and strict-valid.
- NW-AUD-006: PROPOSED (High/High-confidence); dedicated change `nightwatch-session-mutation-authority-binding-v1` is 4/4 complete and strict-valid.
- NW-AUD-007: PROPOSED (Medium/High-confidence); dedicated change `nightwatch-change-shadow-offline-runtime-integrity-v1` is 4/4 complete and strict-valid.
- NW-AUD-009: PROPOSED (Medium/High-confidence); dedicated change `nightwatch-local-report-publication-integrity-v1` is 4/4 complete and strict-valid.
- NW-AUD-002: DUPLICATE of production-completion tasks 15.7/15.11; NW-AUD-003: NOT_AN_ISSUE after validation-universe PASS with zero unclassified checks; NW-AUD-008: DUPLICATE of the production-completion operator CLI contract.

## Work In Progress

M1 has covered package/lock/config topology, root TypeScript/Playwright configuration, the executable quality gate, validation-universe classification, dependency/lane records, the GitHub workflow/hardening seam, the clean-checkout toolchain/receipt path, the evidence-retention apply/receipt path, C-00 session mutator authority, the change-shadow compiler/bootstrap path, and ignored report/receipt publication. Remaining M1 work is the rest of `bin/`, environment configuration, release/checkpoint mechanics, and cross-file config schema ownership.

## Exact Next Action

Continue M1 with the remaining release/checkpoint and schema-renderer surfaces; inspect path/symlink confinement, atomicity, stale authority, and false-success behavior first and record each candidate or clean disposition in `audit.md`.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | route the owned proposal-only campaign | in progress |
| `.agent/tasks/nightwatch-exhaustive-repository-audit-proposals-v1/` | durable task continuity | in progress |
| `openspec/changes/nightwatch-exhaustive-repository-audit-proposals-v1/` | umbrella audit proposal, contracts, tasks, and evidence ledger | in progress |
| `openspec/changes/nightwatch-ci-action-supply-chain-integrity-v1/` | NW-AUD-001 implementation-ready remediation proposal | complete planning artifact |
| `openspec/changes/nightwatch-exact-runtime-toolchain-identity-v1/` | NW-AUD-004 implementation-ready remediation proposal | complete planning artifact |
| `openspec/changes/nightwatch-retention-crash-consistent-receipts-v1/` | NW-AUD-005 implementation-ready remediation proposal | complete planning artifact |
| `openspec/changes/nightwatch-session-mutation-authority-binding-v1/` | NW-AUD-006 implementation-ready remediation proposal | complete planning artifact |
| `openspec/changes/nightwatch-change-shadow-offline-runtime-integrity-v1/` | NW-AUD-007 implementation-ready remediation proposal | complete planning artifact |
| `openspec/changes/nightwatch-local-report-publication-integrity-v1/` | NW-AUD-009 implementation-ready remediation proposal | complete planning artifact |

## Validation Ledger

Command: `npm run session:status`
Result: PASS
When: 2026-09-19T22:15:31+08:00
Relevant failure/output summary: owned session is current and canonical is safe; pre-existing unrelated stale/live worktree attentions remain untouched.

Command: `openspec validate nightwatch-exhaustive-repository-audit-proposals-v1 --strict`
Result: PASS
When: 2026-09-19T22:15:31+08:00
Relevant failure/output summary: umbrella proposal, design, both capability specs, and tasks are valid; status is 4/4 complete.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-19
Relevant failure/output summary: 494 discovered; 257 authoritative, 237 explicitly classified, 0 unclassified.

Command: `openspec validate nightwatch-ci-action-supply-chain-integrity-v1 --strict`
Result: PASS
When: 2026-09-19
Relevant failure/output summary: proposal, design, exact-head-ci-baseline delta spec, and tasks are 4/4 complete/apply-ready.

Command: `openspec validate nightwatch-exact-runtime-toolchain-identity-v1 --strict`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: proposal, design, runtime-toolchain-integrity spec, reproducibility delta spec, and tasks are 4/4 complete/apply-ready.

Command: `openspec validate nightwatch-retention-crash-consistent-receipts-v1 --strict`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: proposal, design, retention-transaction-auditability spec, and tasks are 4/4 complete/apply-ready.

Command: canonical-CWD `release --root <live-session> --dry-run`; canonical-CWD `integrate --root <live-session> --dry-run`
Result: REPRODUCED WITHOUT MUTATION
When: 2026-09-20
Relevant failure/output summary: the first planned replacement of this live ownership record; the second planned a fast-forward from origin/main to this session HEAD. Dry-run performed no record, ref, fetch, or push mutation.

Command: `openspec validate nightwatch-session-mutation-authority-binding-v1 --strict`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: proposal, design, concurrency-workspace-hardening delta spec, and tasks are 4/4 complete/apply-ready.

Command: static inspection of `bin/change-intelligence.mjs`, the lockfile, shared loader, current tests, and existing change ownership
Result: SUBSTANTIATED WITHOUT EXECUTING THE UNSAFE PATH
When: 2026-09-20
Relevant failure/output summary: the offline normal path calls bare `npx tsc` twice after deleting/recreating a fixed compile root; local TypeScript is absent; the only process test exits through help before compilation.

Command: `openspec validate nightwatch-change-shadow-offline-runtime-integrity-v1 --strict`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: proposal, design, source-analysis-runtime-hardening delta spec, and tasks are 4/4 complete/apply-ready.

Command: static inspection of the seven ignored report/receipt writers, schema declarations, current tests, and existing safe publication primitives
Result: SUBSTANTIATED WITHOUT MUTATING AN ARTIFACT PATH
When: 2026-09-20
Relevant failure/output summary: all seven writers bypass shared safe publication; current reports truncate in place and can follow links; topology names can collide; existing changes do not own the complete boundary.

Command: `openspec validate nightwatch-local-report-publication-integrity-v1 --strict`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: proposal, design, local-report-publication-integrity spec, and tasks are 4/4 complete/apply-ready.

Command: `npm run agent:check`
Result: PASS with 41 pre-existing/expected warnings and zero strict-v2 errors
When: 2026-09-20
Relevant failure/output summary: new completed planning child task is coherent; open implementation tasks are declared not in scope; unrelated historical/orphan/stale-session warnings remain untouched.

Command: `npm run workspace:check`
Result: PASS
When: 2026-09-20
Relevant failure/output summary: owned session and declared-deletion policy pass; dirty status is the expected current planning checkpoint before commit.

Command: `npm run typecheck:bin`; `npm run schema:check`; `npm run hardening:check`; `npm run project:check`
Result: ENVIRONMENT UNAVAILABLE
When: 2026-09-19
Relevant failure/output summary: the owned worktree has no `node_modules/typescript`; dependency installation is outside this planning-only task. No repository failure is inferred. `npm run workspace:check` remains PASS.

## Decisions Made During This Task

Decision: use a dedicated session and new change rather than reuse W13.
Reason: task ownership and proposal scope must remain isolated.
Evidence/constraint: C-00 one-writer/one-worktree invariant and the user's request for another change.

Decision: admit NW-AUD-001 at Medium severity and create a dedicated change.
Reason: current mutable action refs execute before repository-owned validation, while exploitation requires an external upstream/tag compromise and permissions are read-only.
Evidence/constraint: current workflow lines 22/26, current unanchored hardening regex lines 239/240, no existing exact pinning requirement or probe.

Decision: admit NW-AUD-004 at Medium severity and create a dedicated change.
Reason: the unlocked clean runtime resolver executes before certification and exact runtime disagreement cannot be detected from receipts, while ordinary impact is certification integrity/reproducibility rather than direct product access.
Evidence/constraint: workflow line 28, clean wrapper lines 65-90 and 192-213, no lock/manifest ownership for `node@20`, and no existing exact Node/npm receipt contract.

Decision: admit NW-AUD-005 at Medium severity and create a dedicated change.
Reason: explicit owner gating limits reachability, but irreversible deletion can
be followed by a false-success exit or a durable receipt that omits the deleted
set, violating the current recording contract.
Evidence/constraint: retention lines 304-315, 392-422, and 453-460; current
tests cover only successful finalization; recovery must preserve uncertainty
rather than re-delete or infer historical success.

Decision: admit NW-AUD-006 at High severity and create a dedicated change.
Reason: a foreign local checkout can select a live session record, release its
owner, or reach its Git push path, directly defeating C-00's core coordination
and integration boundary; same-OS-account access keeps it below Critical.
Evidence/constraint: session parser/dispatcher and release/integrate paths,
plus canonical-CWD zero-mutation dry runs against this live session; the plan
uses public freshness/intent binding and does not invent a local secret.

Decision: admit NW-AUD-007 at Medium severity and create a dedicated change.
Reason: an explicitly offline operator path may resolve and execute moving
package code and mutates a shared derivative root before compiler admission;
explicit invocation and local-only ordinary impact keep it below High.
Evidence/constraint: change-shadow compiler code, exact lockfile entry, absent
local TypeScript, help-only process coverage, and explicit non-ownership in
existing loader/certification changes; the plan preserves full-program `tsc`
semantics and does not duplicate generic CLI work.

Decision: admit NW-AUD-009 at Medium severity and create a dedicated change.
Reason: explicit local commands and owner-selected output constrain ordinary
reachability, but direct publication can overwrite an external file through a
prepared link, destroy the last complete report, or replace certification
history under collision; a complete seven-writer denominator needs one
enforced contract.
Evidence/constraint: direct `mkdirSync`/`writeFileSync` paths in six report
commands and gate topology, ignored artifact policy, persisted/private schema
declarations, millisecond-only topology names, and no existing active change
owning this complete boundary.

## Discoveries

- Registered topology has room for this worktree under the repository's maximum of eight.
- Existing OpenSpec inventory includes several in-progress historical/parent changes that must be cross-referenced during deduplication.
- The starting tree contains 2,593 tracked paths: 781 `.agent`, 626 `src`, 417 `openspec`, 410 `tests`, 118 `bin`, 113 `corpus`, 40 `docs`, 32 `ui`, 26 `config`, and 30 root/integration paths.
- `docs/ARCHITECTURE.md` contains a relocated historical inventory of 2,151 files; it is explicitly frozen baseline evidence and must not be compared to the current 2,593-path denominator as drift.
- Several durable sections preserve superseded phase states intentionally; current machine blocks and live implementation/test evidence outrank those historical statements.
- GitHub workflow action identity is not immutable and its allowlist is substring-based; this is NW-AUD-001.
- The bin typecheck gap is already owned by production-completion; validation-universe coverage is current and complete.
- The clean gate dynamically resolves `node@20` outside `package-lock.json`, CI requests only major 20, and both clean receipt authority and current focused tests omit exact Node/npm identity; this is NW-AUD-004.
- Evidence retention overwrites one receipt after all removals and treats
  finalization failure as a successful process result; there is no
  crash/concurrency/recovery test contract. This is NW-AUD-005.
- Session lifecycle mutators authorize an arbitrary selected root, not the
  invoking checkout/session; safe dry runs proved foreign release and
  integration reachability. This is NW-AUD-006.
- The offline change-shadow entrypoint deletes/recreates one fixed compile root
  and invokes bare `npx tsc` twice; missing local dependencies can therefore
  reach automatic package resolution before source/report work. This is
  NW-AUD-007. Its ignored absolute output-path and ungoverned argument behavior
  are NW-AUD-008, already owned by the production-completion CLI contract.
- Six current-report paths and gate-topology history write ignored artifacts
  directly without common schema-before-mutation, safe-path, atomic-replace,
  or immutable no-replace enforcement. This is NW-AUD-009.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- All implementation remains deferred by task definition.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA.
4. Run `npm run session:status`.
5. Continue the Exact Next Action without editing product implementation.

## Completion Snapshot

Not complete; M1 is active. Six issue-specific changes are strict-valid, but
remaining M1 surfaces and milestones M2-M10 are still required before any
exhaustive conclusion.
