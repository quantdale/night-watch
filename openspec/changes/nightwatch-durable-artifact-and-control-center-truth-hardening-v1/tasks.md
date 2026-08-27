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

- [ ] Inventory all exported dossier/source-candidate vocabularies/constants before adding literals.
- [ ] Reuse campaign/runtime validation helpers where semantics match.
- [ ] Add bounded plain-record helper(s) if current helpers are insufficient.
- [ ] Implement complete v1 runtime validation.
- [ ] Implement complete v2 runtime validation.
- [ ] Implement complete SourceChangeCandidate validation.
- [ ] Implement complete reproduction validation.
- [ ] Implement complete browser/API differential validation.
- [ ] Implement likely-fault-boundary validation.
- [ ] Implement confidence/severity/priority validation.
- [ ] Implement bounded arrays / safe identifiers / timestamps.
- [ ] Validate semantic nested objects through their existing owning validators.
- [ ] Validate v2 recipe/AI-ready shapes.
- [ ] Enforce only mechanically justified cross-field invariants.
- [ ] Reject unsafe prototypes / unknown frozen-schema fields.
- [ ] Ensure rejection reasons are categorical and privacy-safe.
- [ ] Ensure validators do not mutate input.
- [ ] Preserve producer-built valid v1/v2/UNRESOLVED cases.

## 4. Artifact facade identity and consumer audit

- [ ] Enumerate every callsite of validateArtifact('dossier'), validateDossierArtifact, validateBugDossier, parseBugDossierV2.
- [ ] Identify any consumer that casts unknown values after a shallow check.
- [ ] Verify every durable read path validates before authority use.
- [ ] Audit ARTIFACT_VALIDATION_FACADE_VERSION consumers.
- [ ] Decide whether facade semantic version must bump; document rationale.
- [ ] If bumped, update exact version fingerprints/hardening/tests and no unrelated identities.
- [ ] Prove old malformed-but-accepted artifacts do not silently become valid via a compatibility fallback.

## 5. Facade-wide bounded mutation audit

For every ARTIFACT_KIND_VERSION_ACCEPTANCE entry:

- [ ] identify producer
- [ ] identify validator
- [ ] identify nested authority-bearing fields
- [ ] create/locate positive canonical fixture
- [ ] perform at least one nested type mutation
- [ ] perform at least one invalid enum/identity mutation when applicable
- [ ] verify unknown field rejection where schema is frozen
- [ ] verify sentinel/privacy rejection where strings exist
- [ ] verify no input mutation
- [ ] record accepted/rejected result and reason class

Kinds currently include:

- [ ] campaign-checkpoint
- [ ] observation
- [ ] semantic-receipt
- [ ] replay-plan
- [ ] cluster
- [ ] reproduction-record
- [ ] dossier
- [ ] morning-brief
- [ ] source-bundle
- [ ] coverage-report
- [ ] candidate-record
- [ ] replay-record
- [ ] minimization-record
- [ ] project-health-report
- [ ] reserved replay-result-envelope registration path

If an additional false accept is reproduced:
- [ ] fix only if owning schema is unambiguous and local/pure
- [ ] otherwise fail closed at earliest safe consumer and record follow-up; do not guess a migration

## 6. Converge findings currentness authority

- [ ] Trace every production and test caller of projectFindings.
- [ ] Trace all creation of FindingsDossierMetadata.
- [ ] Select one owning reducer or metadata-only architecture.
- [ ] Remove duplicated optimistic currentness implementation.
- [ ] Implement conservative aggregation.
- [ ] Explicitly handle empty.
- [ ] Explicitly handle UNKNOWN.
- [ ] Explicitly handle LOCAL_TRACKING_REF_ONLY.
- [ ] Allow CURRENT only when every required freshness member is current-class.
- [ ] Resolve/document relevance UNKNOWN + confidence UNRESOLVED semantics without conflating causal relevance with source freshness.
- [ ] Add permutation/property tests.
- [ ] Add authority-vs-adapter differential tests.
- [ ] Ensure provenance generation/digest changes when corrected currentness changes.

## 7. Control Center fail-closed integration

- [ ] Malformed dossier => no valid metadata row.
- [ ] Mixed valid + malformed directory => collection state UNKNOWN / partial corruption.
- [ ] Valid rows under partial corruption remain sanitized.
- [ ] No raw source path/text/private reason leaks through findings.
- [ ] Collector rejects malformed authority snapshot.
- [ ] Snapshot coordinator never serves prior generation as CURRENT after refresh failure.
- [ ] SSE remains advisory only.
- [ ] Server remains GET/HEAD, loopback-only, body-rejecting, Host/Origin checked.
- [ ] No command/browser/network/write path is introduced.
- [ ] Add built UI/browser qualification for SOURCE_STALE and SOURCE_UNAVAILABLE if existing fixture architecture supports it without external contact.

## 8. Adversarial/currentness matrix

- [ ] current/current
- [ ] current/remote-confirmed
- [ ] current/stale
- [ ] remote-confirmed/stale
- [ ] current/unknown
- [ ] stale/unknown
- [ ] unknown/unknown
- [ ] empty
- [ ] 1 member
- [ ] maximum bounded members
- [ ] duplicate candidates if allowed
- [ ] reordered candidates
- [ ] malformed freshness rejected pre-reducer
- [ ] malformed candidate rejected pre-reducer
- [ ] stale/unavailable public labels remain stable through sanitizer
- [ ] public state never upgrades UNKNOWN collection state to AVAILABLE

## 9. Focused validation after each implementation slice

- [ ] npx tsc --noEmit or repository typecheck script.
- [ ] dossier/artifact-validation unit tests.
- [ ] Control Center findings authority tests.
- [ ] Control Center adapters tests.
- [ ] Control Center contracts tests.
- [ ] Control Center authority integration tests.
- [ ] Control Center server tests.
- [ ] Control Center snapshot coordinator tests.
- [ ] privacy/sentinel tests.
- [ ] relevant hardening checks.
- [ ] no new skips.

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
