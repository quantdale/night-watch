# Tasks: Durable Artifact + Control Center Truth Hardening

Status: IN_PROGRESS
Change ID: nightwatch-durable-artifact-and-control-center-truth-hardening-v1
Planning baseline: 49034831377f243054261361b4d1a7d783c0fc4f
Target: main
Budget: approximately 12 productive engineering hours; do not pad work after acceptance is actually complete.

## 0. Takeover, identity, and continuity

- [x] Read AGENTS.md, .agent/PLANNER_HANDOFF.md, .agent/PLANS.md, .agent/ACTIVE_TASK.md, this OpenSpec change, and .agent/EXECUTION_PROMPT.md.
- [x] Prove repository identity is quantdale/night-watch and branch target is main.
- [x] Fetch/reconcile origin/main before edits.
- [x] Record starting HEAD, upstream, dirty state, Node/npm versions, OS, and available browser/toolchain.
- [x] Create .agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/SPEC.md, PLAN.md, STATE.md, REPORT.md using continuity protocol v2.
- [x] Route .agent/ACTIVE_TASK.md to the fresh task.
- [x] Preserve completed predecessor task/history verbatim.
- [x] If main moved since 49034831377f243054261361b4d1a7d783c0fc4f, inspect every intervening diff and rebase/replan affected work before implementation.

## 1. Fresh exhaustive repository audit

- [x] Generate authoritative git ls-files manifest.
- [x] Read/classify every tracked regular file, including docs, fixtures, generated-looking tracked assets, historical .agent records, UI, configs, tests, scripts, and source.
- [x] Record tracked count, reviewed count, bytes, lines, and deterministic manifest digest.
- [x] Require reviewed count == tracked count.
- [x] Produce subsystem census: browser/safety/proxy, auth, campaign, triage, artifactValidation, evidence, source, semanticCoverage, portfolio, AI review, self-dev, readiness, Control Center, UI, CLI/bin, tests/corpus, docs/OpenSpec/agent state.
- [x] Re-review every file changed from planning baseline to takeover HEAD.
- [x] Confirm no unreviewed executable path can consume durable dossiers or currentness metadata.

## 2. Mandatory red-team reproductions before fixes

Create focused tests first. Do not change production behavior until the false accepts/currentness results are captured.

### 2.1 Dossier v1 mutation matrix

Starting from a canonical createBugDossier output, independently mutate:

- [x] candidateId wrong type / malformed ID.
- [x] title wrong type.
- [x] firstObserved malformed; lastObserved malformed; reversed chronology.
- [x] journeys wrong type; malformed member; duplicates if contract requires unique.
- [x] seeds wrong type / malformed member.
- [x] minimalSequence wrong type / malformed member.
- [x] routeClass wrong type.
- [x] apiOperationFamily wrong type.
- [x] oracleFingerprint malformed.
- [x] evidenceLevel invalid.
- [x] reproduction missing nested field / invalid enum / negative or fractional count.
- [x] browserApiDifferential malformed.
- [x] sourceChangeCandidates non-array.
- [x] sourceChangeCandidate missing required field.
- [x] sourceChangeCandidate invalid relevance/confidence/sourceFreshness.
- [x] likelyFaultBoundary malformed.
- [x] confidence malformed.
- [x] technicalSeverity invalid.
- [x] triagePriority invalid.
- [x] alternativesRuledOut / missingEvidence malformed.
- [x] semanticEvidence malformed when present.
- [x] nested unknown field where schema is frozen.
- [x] private/sentinel payload.
- [x] prototype-bearing object where validation contract rejects non-plain records.

For each:
- [x] Record BEFORE result from owning validator.
- [x] Record BEFORE result from validateArtifact('dossier').
- [x] Mark FALSE_ACCEPT only when malformed input is currently accepted.
- [x] Keep a compact machine-readable mutation table in task evidence.

### 2.2 Dossier v2 mutation matrix

Repeat v1 classes plus:

- [x] status invalid.
- [x] semanticConfidence malformed/invalid.
- [x] semanticTriageEvidence malformed.
- [x] humanReproductionRecipe missing/invalid nested fields.
- [x] aiReady missing/invalid nested fields.
- [x] required nested object with valid prototype but incomplete content.
- [x] unknown nested key.
- [x] UNRESOLVED valid historical case retained as positive control.

### 2.3 Currentness reproduction

- [x] Build valid current-only list => current.
- [x] Build remote-confirmed-only list => current.
- [x] Build current + remote-confirmed => current.
- [x] Build current + LOCAL_TRACKING_REF_ONLY => reproduce existing optimistic CURRENT.
- [x] Build current + UNKNOWN => reproduce existing optimistic CURRENT.
- [x] Build stale + UNKNOWN.
- [x] Build stale-only.
- [x] Build unknown-only.
- [x] Build empty list.
- [x] Permute each multiset and prove order invariance or record defect.
- [x] Exercise both findingsAuthority and findingsAdapter direct/raw path.
- [x] Exercise normal collector path.

## 3. Implement strict dossier runtime validation

- [x] Inventory all exported dossier/source-candidate vocabularies/constants before adding literals.
- [x] Reuse campaign/runtime validation helpers where semantics match.
- [x] Add bounded plain-record helper(s) if current helpers are insufficient.
- [x] Implement complete v1 runtime validation.
- [x] Implement complete v2 runtime validation.
- [x] Implement complete SourceChangeCandidate validation.
- [x] Implement complete reproduction validation.
- [x] Implement complete browser/API differential validation.
- [x] Implement likely-fault-boundary validation.
- [x] Implement confidence/severity/priority validation.
- [x] Implement bounded arrays / safe identifiers / timestamps.
- [x] Validate semantic nested objects through their existing owning validators.
- [x] Validate v2 recipe/AI-ready shapes.
- [x] Enforce only mechanically justified cross-field invariants.
- [x] Reject unsafe prototypes / unknown frozen-schema fields.
- [x] Ensure rejection reasons are categorical and privacy-safe.
- [x] Ensure validators do not mutate input.
- [x] Preserve producer-built valid v1/v2/UNRESOLVED cases.

## 4. Artifact facade identity and consumer audit

- [x] Enumerate every callsite of validateArtifact('dossier'), validateDossierArtifact, validateBugDossier, parseBugDossierV2.
- [x] Identify any consumer that casts unknown values after a shallow check.
- [x] Verify every durable read path validates before authority use.
- [x] Audit ARTIFACT_VALIDATION_FACADE_VERSION consumers.
- [x] Decide whether facade semantic version must bump; document rationale: no load-bearing consumer exists, so it remains v1.
- [x] If bumped, update exact version fingerprints/hardening/tests and no unrelated identities — not applicable because no bump was required.
- [x] Prove old malformed-but-accepted artifacts do not silently become valid via a compatibility fallback.

## 5. Facade-wide bounded mutation audit

For every ARTIFACT_KIND_VERSION_ACCEPTANCE entry:

- [x] identify producer
- [x] identify validator
- [x] identify nested authority-bearing fields
- [x] create/locate positive canonical fixture
- [x] perform at least one nested type mutation
- [x] perform at least one invalid enum/identity mutation when applicable
- [x] verify unknown field rejection where schema is frozen
- [x] verify sentinel/privacy rejection where strings exist
- [x] verify no input mutation
- [x] record accepted/rejected result and reason class in `FACADE_AUDIT.json`

Kinds currently include:

- [x] campaign-checkpoint
- [x] observation
- [x] semantic-receipt
- [x] replay-plan
- [x] cluster
- [x] reproduction-record
- [x] dossier
- [x] morning-brief
- [x] source-bundle
- [x] coverage-report
- [x] candidate-record
- [x] replay-record
- [x] minimization-record
- [x] project-health-report
- [x] reserved replay-result-envelope registration path

If an additional false accept is reproduced:
- [x] fix only if owning schema is unambiguous and local/pure — the project-health additive/derived checks met this bar.
- [x] otherwise fail closed at earliest safe consumer and record follow-up; do not guess a migration — no unresolved adjacent false accept remains.

## 6. Converge findings currentness authority

- [x] Trace every production and test caller of projectFindings.
- [x] Trace all creation of FindingsDossierMetadata.
- [x] Select one owning reducer or metadata-only architecture: shared pure reducer at the authority/adapter seam.
- [x] Remove duplicated optimistic currentness implementation.
- [x] Implement conservative aggregation.
- [x] Explicitly handle empty.
- [x] Explicitly handle UNKNOWN.
- [x] Explicitly handle LOCAL_TRACKING_REF_ONLY.
- [x] Allow CURRENT only when every required freshness member is current-class.
- [x] Resolve/document relevance UNKNOWN + confidence UNRESOLVED semantics without conflating causal relevance with source freshness.
- [x] Add permutation/property tests.
- [x] Add authority-vs-adapter differential tests.
- [x] Ensure provenance generation/digest changes when corrected currentness changes.

## 7. Control Center fail-closed integration

- [x] Malformed dossier => no valid metadata row.
- [x] Mixed valid + malformed directory => collection state UNKNOWN / partial corruption.
- [x] Valid rows under partial corruption remain sanitized.
- [x] No raw source path/text/private reason leaks through findings.
- [x] Collector rejects malformed authority snapshot.
- [x] Snapshot coordinator never serves prior generation as CURRENT after refresh failure.
- [x] SSE remains advisory only.
- [x] Server remains GET/HEAD, loopback-only, body-rejecting, Host/Origin checked.
- [x] No command/browser/network/write path is introduced.
- [ ] Add built UI/browser qualification for SOURCE_STALE and SOURCE_UNAVAILABLE if existing fixture architecture supports it without external contact.

## 8. Adversarial/currentness matrix

- [x] current/current
- [x] current/remote-confirmed
- [x] current/stale
- [x] remote-confirmed/stale
- [x] current/unknown
- [x] stale/unknown
- [x] unknown/unknown
- [x] empty
- [x] 1 member
- [x] maximum bounded members
- [x] duplicate candidates if allowed
- [x] reordered candidates
- [x] malformed freshness rejected pre-reducer
- [x] malformed candidate rejected pre-reducer
- [x] stale/unavailable public labels remain stable through sanitizer
- [x] public state never upgrades UNKNOWN collection state to AVAILABLE

## 9. Focused validation after each implementation slice

- [x] npx tsc --noEmit or repository typecheck script.
- [x] dossier/artifact-validation unit tests.
- [x] Control Center findings authority tests.
- [x] Control Center adapters tests.
- [x] Control Center contracts tests.
- [x] Control Center authority integration tests.
- [x] Control Center server tests.
- [x] Control Center snapshot coordinator tests.
- [x] privacy/sentinel tests.
- [x] relevant hardening checks.
- [x] no new skips.

Fix every introduced Critical/High regression before continuing.

## 10. Full local acceptance cone

Use repository-native commands discovered from package.json/current docs; do not blindly use stale command names.

At minimum prove:

- [ ] typecheck PASS.
- [ ] hardening:check PASS.
- [ ] owner-scope / owner provenance PASS.
- [ ] artifact-validation comprehensive suite PASS.
- [ ] campaign synthetic compatibility PASS.
- [ ] semantic compatibility PASS when touched by version fingerprints.
- [ ] Control Center unit suite PASS.
- [ ] nested UI test/build PASS.
- [ ] built-server synthetic browser qualification PASS.
- [ ] project-state check PASS.
- [ ] continuity/agent-state check PASS.
- [ ] local quality gate PASS.
- [ ] clean-worktree Node 20 gate PASS.
- [ ] canonical serial Playwright regression PASS with exact tests/skips/failures reported.
- [ ] diff audit shows no accidental generated/private artifacts.
- [ ] no secret/storage-state/session file added.

## 11. Exact-head evidence and external CI classification

- [ ] Commit only after local gates prove a durable checkpoint.
- [ ] Push main according to repository single-writer policy.
- [ ] Verify remote main == local HEAD.
- [ ] If policy requires, observe exact-head GitHub Actions once.
- [ ] If steps are null/empty, record NO_STEPS_BILLING_OR_PLATFORM_BLOCK.
- [ ] Never report external CI green without executed passing steps.
- [ ] Do not modify workflow solely to alter the external billing/platform outcome.

## 12. Durable closure

- [ ] Update .agent/tasks/nightwatch-durable-artifact-and-control-center-truth-hardening-v1/STATE.md after every durable checkpoint.
- [ ] Complete REPORT.md with before/after mutation matrix totals.
- [ ] Report every reproduced false accept and exact fix.
- [ ] Report currentness truth table before/after.
- [ ] Report facade-wide audit disposition for every artifact kind.
- [ ] Report all version/identity changes.
- [ ] Report exact test counts, skips, failures, receipts, HEAD.
- [ ] Report safety vectors: DEV/NEXT/production/auth/data/infra/publication/sibling writes all zero.
- [ ] Update docs/CURRENT_STATE.md, docs/ROADMAP.md, docs/DECISIONS.md, and docs/ARCHITECTURE.md only for durable truth that changed.
- [ ] Mark OpenSpec tasks complete only when evidence exists.
- [ ] Set .agent/ACTIVE_TASK.md terminal with next action STOP.
- [ ] Replace/retire this execution prompt only at terminal closure per repository protocol.
- [ ] Push final terminal documentation checkpoint.
- [ ] Stop. Do not invent a new campaign in the executor session.

## Time-budget guidance

The 12-hour request is a productive engineering budget, not a requirement to waste time.

Suggested allocation:

- hour 0-1: takeover + exhaustive audit
- hour 1-2.5: red-team reproductions
- hour 2.5-5: strict dossier validators
- hour 5-6.5: currentness authority convergence
- hour 6.5-8.5: facade-wide mutation audit / adjacent fixes
- hour 8.5-9.5: Control Center differential/UI qualification
- hour 9.5-11: full local/clean acceptance and regression repair
- hour 11-12: exact-head evidence, docs, continuity, final push

If acceptance is complete earlier, stop early. If a Critical/High regression remains at hour 12, prioritize correctness and truthful BLOCKED/INCOMPLETE state over a false completion claim.
