# EXECUTION PROMPT — Durable Artifact + Control Center Truth Hardening

Status: COMPLETED — executed and closed in the terminal task records
`.agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/`.
Change ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Planned-From: 49034831377f243054261361b4d1a7d783c0fc4f
Target branch: main
Expected productive budget: approximately 12 hours
Safety authority: LOCAL / repository source / synthetic fixtures only

## Mission

Execute the OpenSpec change openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/ end-to-end in one autonomous engineering session.

The primary objective is not feature growth. It is to restore Nightwatch's durable evidence invariant:

1. malformed dossier JSON cannot be accepted by the strict artifact-validation facade through TypeScript-assumption gaps;
2. a Control Center finding cannot claim CURRENT when any required source-currentness member is stale or unknown;
3. the authority and adapter layers do not maintain competing copies of currentness logic;
4. the rest of the durable artifact facade receives a bounded adversarial mutation audit for the same failure class.

Do not ask for routine confirmation. Use repository truth, tests, and the OpenSpec to resolve details. Stop only for an actual authorization boundary, an ambiguous unsafe migration that cannot be resolved locally, or terminal completion.

## Why this campaign exists

The planner audit found two concrete authority seams on current main.

### P0-A — shallow runtime dossier validation

The artifact facade describes validateArtifact(kind, unknownValue) as a strict durable boundary. For dossier v1/v2, current runtime validators do not recursively prove many nested required fields. They rely on TypeScript types after JSON has already crossed the runtime boundary.

Relevant code:

- src/core/artifactValidation/index.ts
- src/core/artifactValidation/dossierKindValidation.ts
- src/core/triage/dossier.ts
- src/core/triage/dossierV2.ts
- tests/unit/phase15pArtifactValidation.test.ts

You MUST reproduce false accepts with one-field mutations before fixing them. Do not claim every listed probe is a defect until the current code demonstrably accepts it.

### P0-B — optimistic Control Center source currentness

Both:

- src/controlCenter/authorities/findingsAuthority.ts
- src/controlCenter/adapters/findingsAdapter.ts

currently label a whole dossier CURRENT if any source-change candidate is current-class. This can upgrade mixed current+stale and current+unknown evidence.

You MUST reproduce both paths and replace them with one conservative authority.

## Mandatory takeover sequence

1. Read AGENTS.md and all repository-local instructions.
2. Read .agent/PLANNER_HANDOFF.md and .agent/PLANS.md.
3. Read .agent/ACTIVE_TASK.md and preserve the completed predecessor as history.
4. Read every file in openspec/changes/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/.
5. Fetch/reconcile origin/main.
6. If main differs from Planned-From, review every intervening diff before source edits.
7. Create native continuity-v2 task:
   - .agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/SPEC.md
   - PLAN.md
   - STATE.md
   - REPORT.md
8. Route .agent/ACTIVE_TASK.md to this new task.
9. Record exact starting SHA, dirty state, toolchain, and authority scope.
10. Begin the fresh exhaustive audit.

## Workstream A — literal whole-repository audit

Do not rely on the planner's remote inventory alone.

Use local git ls-files as the authoritative tracked manifest. Read every tracked regular file. Include historical .agent records, docs, fixtures, UI, configs, scripts, tests, and generated-looking tracked artifacts.

Record:

- tracked files
- reviewed files
- bytes
- lines
- manifest digest
- subsystem disposition
- changed-since-Planned-From disposition

Hard gate: reviewed files == tracked files.

Pay special attention to every consumer/producer of:

- BugDossier / BugDossierV2
- validateArtifact('dossier')
- validateDossierArtifact
- validateBugDossier / parseBugDossierV2
- sourceChangeCandidates / SourceFreshness
- FindingsDossierMetadata
- projectFindings
- artifact validation version fingerprints
- Control Center generation/provenance digests

## Workstream B — reproduce before repair

Build mutation tests from canonical producer outputs.

For v1 and v2, mutate one nested field at a time. At minimum cover IDs, timestamps, arrays, reproduction, browser/API differential, source candidates, confidence, fault boundary, severity/priority, semantic objects, v2 recipe/AI-ready structures, invalid enum/type/count, unknown nested field, sentinel, and prototype cases.

For each mutation:

- validate via owning module validator
- validate via validateArtifact('dossier')
- record current valid/invalid result
- mark only accepted malformed inputs FALSE_ACCEPT

Create a compact mutation ledger in task STATE/REPORT so the final commit explains exactly what changed.

Reproduce currentness truth table in both authority and raw adapter path:

- current/current
- current/remote
- current/stale
- current/unknown
- stale/unknown
- stale only
- unknown only
- empty
- permutations

Do not implement until these reproductions exist.

## Workstream C — make dossier validation genuinely strict

Implement full bounded runtime validation for accepted v1/v2 shapes.

Rules:

- unknown JSON stays unknown until every required field is checked
- use owning constants/vocabularies instead of duplicate literals
- exact-key nested validation where schema is frozen
- bounded strings, arrays, counts, ids, digests, timestamps
- safe plain-object/prototype rules
- complete SourceChangeCandidate validation
- complete reproduction/differential/fault-boundary/confidence validation
- existing semantic validators remain authoritative
- v2 UNRESOLVED historical shape remains supported
- no arbitrary recursive walk of attacker-controlled graphs
- no raw error echo
- no input mutation

Preserve valid historical v1/v2 artifacts. Tight validation is not permission to delete backward compatibility.

If a previously accepted committed artifact fails after the fix, determine whether it is:
- actually malformed under its own frozen schema; or
- valid historical data the new validator misunderstood.

Do not paper over the distinction.

## Workstream D — validation identity discipline

Audit ARTIFACT_VALIDATION_FACADE_VERSION and every version fingerprint/cache/currentness contract that consumes it.

If the tightened semantics require a validation-facade version bump, do it once and update all exact consumers. Do not bump:

- dossier schema version
- source analyzer version
- semantic contract version
- replay version
- Phase-24 selector identity

unless that exact wire/semantic contract genuinely changes.

All identity drift must be categorized and explained.

## Workstream E — one currentness authority

Remove the duplicated ANY-current reducer.

Preferred architecture:

valid durable dossier
-> findings authority
-> sanitized FindingsDossierMetadata
-> findings adapter
-> DTO

The adapter should project, not decide.

If a direct raw-dossier adapter input is actually used outside tests, preserve it only through the same shared pure reducer.

Conservative baseline semantics:

- empty => SOURCE_UNAVAILABLE
- any UNKNOWN => SOURCE_UNAVAILABLE
- else any LOCAL_TRACKING_REF_ONLY => SOURCE_STALE
- else every member current-class => CURRENT

Current-class means SOURCE_CURRENT_LOCALLY or REMOTE_FRESHNESS_CONFIRMED.

Make the reducer:
- deterministic
- permutation invariant
- total over validated SourceFreshness values
- unreachable for malformed candidate values because validation rejects first

Investigate the existing case where correlateSourceChanges can emit relevance UNKNOWN / confidence UNRESOLVED while sourceFreshness remains current-class. Decide from owning contracts whether sourceCurrentness is strictly checkout freshness or total evidence currentness. Document the meaning; do not silently conflate them.

## Workstream F — facade-wide mutation audit

The dossier hole is a signal, not permission to assume other validators are broken.

Enumerate ARTIFACT_KIND_VERSION_ACCEPTANCE and probe every registered kind with bounded nested mutations.

For each kind record:
- producer
- validator
- positive fixture
- nested authority fields
- at least one type mutation
- at least one enum/identity mutation when applicable
- unknown-field behavior
- privacy/sentinel behavior
- mutation-of-input behavior

Fix additional reproduced false accepts only if:
- schema ownership is clear
- behavior is pure/local
- compatibility impact is bounded
- tests can prove correctness

Otherwise leave a fail-closed mitigation + explicit follow-up recommendation.

## Workstream G — Control Center integration proof

Prove:

- malformed dossier never yields valid FindingsDossierMetadata
- mixed valid+corrupt store => explicit UNKNOWN / partial corruption
- valid rows under partial corruption remain sanitized
- stale/unknown cannot render CURRENT
- collection UNKNOWN is not upgraded to AVAILABLE
- generation/provenance changes when currentness changes
- snapshot refresh failure never serves old generation as CURRENT
- SSE remains advisory
- GET remains authoritative
- loopback/read-only/Host/Origin/body restrictions remain intact
- no command, browser product, network, file write, selector, promotion, or execution route is introduced

If the UI is touched or its labels depend on corrected values, run built UI and synthetic browser qualification. Add the smallest deterministic fixture needed to visibly prove SOURCE_STALE and SOURCE_UNAVAILABLE.

## Workstream H — full regression and quality gates

After every meaningful slice run focused tests.

Before terminal completion run the repository's current native full cone. Discover exact commands from package.json/current docs rather than trusting stale prose.

Required evidence categories:

- typecheck
- hardening
- owner policy/provenance
- artifact-validation comprehensive suite
- dossier/currentness focused tests
- Control Center authorities/adapters/contracts/server/snapshot tests
- UI unit/build and built-server browser qualification when applicable
- campaign synthetic compatibility
- semantic compatibility if validation fingerprint changed
- project-state
- continuity/agent-state
- local quality gate
- clean Node20 gate
- canonical serial Playwright suite
- exact skip count
- git diff / private-artifact audit

No test deletion, new skip, weakened assertion, or cached verdict.

Fix every Critical/High regression caused by this campaign before proceeding.

## Safety boundaries — absolute

Do not:

- contact DEV
- contact NEXT
- contact production
- load authenticated storage state
- access Alphaus data/datastores/cloud/infrastructure
- write sibling repositories
- publish evidence
- create issues/PRs/releases
- call AI/model providers
- add network-based validation
- run Docker/L6 experiments
- mutate user/global config
- introduce a Control Center command route

All work must remain LOCAL / SOURCE / SYNTHETIC.

The known GitHub Actions zero-step billing/platform condition is not an implementation bug. Do not modify CI merely to make it appear green.

## Commit / push protocol

Follow AGENTS.md single-writer and validation rules.

Use durable checkpoints, not noisy microcommits.

Each implementation checkpoint commit message should contain:
- campaign ID
- workstreams completed
- reproduced defects fixed
- validation executed/results
- safety statement
- known blockers

Before final push:
- working tree intentional/clean
- local gates green
- state/report updated
- no secret/private artifact staged

Push to origin main only as repository policy permits. Confirm remote main equals final local HEAD.

## Final external CI observation

Only after final exact-head local acceptance, and only if current repo policy expects an observation:

- inspect the exact-head Actions run once
- executed passing steps => report exact evidence
- null/empty steps => NO_STEPS_BILLING_OR_PLATFORM_BLOCK
- do not call zero-step result green
- do not retry repeatedly or churn workflow

## Completion gate

You may mark COMPLETE only when all are true:

1. Fresh tracked-file audit is 1:1 complete.
2. Every planner P0 probe is reproduced or explicitly falsified.
3. Every reproduced malformed dossier false accept in the selected schema scope is fixed.
4. Valid historical v1/v2 producer corpus remains accepted or any rejection has a justified compatibility decision.
5. Mixed current/stale and current/unknown cannot yield CURRENT.
6. One currentness authority remains.
7. Facade-wide mutation audit has a disposition for every registered kind.
8. No malformed durable dossier yields a valid public finding.
9. Full local + clean acceptance passes.
10. No introduced Critical/High regression remains.
11. Safety/external-contact vectors are zero.
12. STATE/REPORT/docs/OpenSpec truth is current.
13. Final validated commit is pushed and remote HEAD confirmed.

If any gate cannot be met, leave the task BLOCKED or INCOMPLETE with the exact evidence and next action. Never fabricate completion.

## Time discipline

Treat 12 hours as the engineering budget, not a reason to stall.

Suggested sequence:

- 0-1h takeover + exhaustive audit
- 1-2.5h reproductions
- 2.5-5h strict validators
- 5-6.5h currentness authority convergence
- 6.5-8.5h facade mutation audit / adjacent bounded repairs
- 8.5-9.5h Control Center/UI differential proof
- 9.5-11h full local/clean regression + fixes
- 11-12h exact-head evidence, docs, continuity, final push

If the full acceptance gate is achieved earlier, close honestly and stop. If the budget is exhausted with unresolved correctness, preserve truthful INCOMPLETE/BLOCKED state and the exact next command/action.

## Terminal disposition

This execution prompt was executed under its LOCAL / SOURCE / SYNTHETIC
authority boundary. The implementation, validation, documentation, and Git
closure requirements are complete; no external CI result is claimed.

## Terminal report format

REPORT.md must include:

- starting SHA and final SHA
- tracked-file audit counts/digest
- reproduced planner findings
- mutation false-accept table before/after
- additional facade findings by artifact kind
- currentness truth table before/after
- architecture changes
- validation-facade/version identity changes
- focused test totals
- full test totals and skips
- quality/clean receipts
- external CI classification
- safety vector with all prohibited contacts/mutations
- remaining risks
- final next action: STOP
