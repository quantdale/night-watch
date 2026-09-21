# Exhaustive Nightwatch repository audit ledger

## Audit identity

- Campaign: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Starting commit: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Starting tree: `9b6c1982251e2afa70877745b7787284e9f96a52`
- Tracked-path inventory SHA-256: `939fe42065e7923e9dfd56eb46bfda38c8a2bb2e40127accc8efed75ab6a77f6`
- Tracked paths: `2,593`
- Scope: Nightwatch repository only; local read-only inspection and deterministic synthetic validation
- Write boundary: this task's continuity and OpenSpec planning artifacts only
- Product implementation: not authorized

## Evidence precedence

1. Current deterministic tests and runtime evidence.
2. Current implementation and configuration.
3. Current published OpenSpec requirements and active change artifacts.
4. Active task state and plans.
5. Durable architecture, safety, decisions, roadmap, and historical handoffs.

A candidate is not a finding until current evidence establishes its failure mode, reachability, and consequence. Historical prose, TODOs, skipped tests, advisories, or suspicious patterns are leads only.

## Candidate lifecycle

`OBSERVED -> SUBSTANTIATED -> MATERIAL -> PROPOSED`

Terminal alternatives: `DUPLICATE`, `NOT_AN_ISSUE`, `NON_MATERIAL`, or `DEFERRED_EXTERNAL_EVIDENCE`.

Every candidate record must contain: stable ID, affected paths, subsystem, failure mode, trigger/reachability, consequence, existing mitigations, evidence, severity dimensions, confidence, existing-plan comparison, disposition, and owning proposal when material.

## Severity rubric

| Dimension | Questions |
|---|---|
| Safety/privacy | Can this bypass owner policy, containment, authorization, redaction, provenance, or secret/customer-data boundaries? |
| Correctness/integrity | Can it fabricate success, lose or corrupt evidence/state, misclassify a finding, or violate a deterministic contract? |
| Blast radius | Does it affect one optional tool path, one campaign, every local run, or a durable release/continuity authority? |
| Reachability | Is the trigger ordinary, adversarial but authorized, configuration-dependent, or blocked by a stronger boundary? |
| Likelihood/recurrence | Is it deterministic, race-dependent, scale-dependent, stale-state-dependent, or only theoretical? |

Severity and evidence confidence are recorded separately. Critical/High requires a credible reachable path to the claimed consequence.

## Frozen tracked-tree coverage denominator

The following top-level classes are exhaustive and mutually exclusive for the starting snapshot. Counts sum to `2,593`.

| Class | Tracked paths | Planned inspection | Status | Candidate IDs | Final disposition |
|---|---:|---|---|---|---|
| `.agent/` | 781 | continuity-v2 tasks, templates, execution handoff, historical/current authority | PENDING | — | — |
| `src/` | 626 | all runtime subsystems and trust boundaries | PENDING | — | — |
| `openspec/` | 417 | published specs, active changes, archive/deduplication, schema validity | PENDING | — | — |
| `tests/` | 410 | unit/browser/smoke/manual/helpers/fixtures, assertion strength and gaps | PENDING | — | — |
| `bin/` | 118 | CLI, gates, validators, generators, session/workspace/release tooling | M1_COMPLETE; LATER_WAVES_PENDING | NW-AUD-001, NW-AUD-004, NW-AUD-005, NW-AUD-006, NW-AUD-007, NW-AUD-008, NW-AUD-009, NW-AUD-010, NW-AUD-011, NW-AUD-012, NW-AUD-013, NW-AUD-014 | M1 tooling/configuration/build/release/generator/process concerns have terminal dispositions; safety/runtime/validation-specific bin responsibilities are revisited in their later waves |
| `corpus/` | 113 | fixture/corpus integrity, authority separation, generated/historical boundaries | PENDING | — | — |
| `docs/` | 40 | architecture, safety, decisions, roadmap, current-state and design truth | IN_PROGRESS | — | — |
| `ui/` | 32 | Control Center static UI, accessibility, responsive and interaction behavior | PENDING | — | — |
| `config/` | 26 | environment, workspace, gates, policies, registries and bounds | M1_COMPLETE; LATER_WAVES_PENDING | NW-AUD-002, NW-AUD-004, NW-AUD-012, NW-AUD-013 | gate/universe/lane/dependency/environment/schema declarations inspected for M1; policy/semantic/runtime uses remain assigned to later waves |
| Root and integration files | 30 | manifests, lockfile, TypeScript/Playwright configs, CI, env example, scenarios and agent integrations | M1_COMPLETE; LATER_WAVES_PENDING | NW-AUD-001, NW-AUD-002, NW-AUD-003, NW-AUD-004, NW-AUD-012, NW-AUD-014 | package, lock, TypeScript, Playwright, workflow, runtime selector, `.env` example, validation and child-execution topology inspected; scenarios are assigned to runtime/browser waves |

### `src/` subsystem denominator

| Subsystem | Tracked paths | Audit wave | Status |
|---|---:|---|---|
| `src/core/` | 465 | M2/M3/M4/M5/M7 by responsibility | M2_SAFETY_OOPS_POLICY_BOUNDARIES_COMPLETE; M3_BROWSER_API_EVIDENCE_REPLAY_RESPONSIBILITIES_COMPLETE; M4_SOURCE_SEMANTIC_CHANGE_INTELLIGENCE_COMPLETE; LATER_WAVES_PENDING |
| `src/oracles/` | 54 | M4 | M4_COMPLETE |
| `src/controlCenter/` | 43 | M6 | PENDING |
| `src/browser/` | 14 | M2/M3 | M2_GUARD_AND_AUTH_BOUNDARIES_COMPLETE; M3_COMPLETE |
| `src/products/` | 12 | M3 | M3_COMPLETE |
| `src/data/` | 11 | M3/M5 | M3_COMPATIBILITY_BOUNDARY_COMPLETE; M5_RUNTIME_CALLERS_PENDING |
| `src/api/` | 10 | M3 | M3_COMPLETE |
| `src/proxy/` | 9 | M2 | M2_COMPLETE — policy, resolution/address binding, lease/runtime identity, HTTP/CONNECT/Upgrade ordering, events, and cleanup inspected |
| `src/auth/` | 6 | M2 | M2_COMPLETE — provider, login, refresh, direct capture, lifecycle, stage diagnostics, and error paths inspected |
| `src/state/`, `src/mcp/` | 2 | M3/M5 | M3_MONITOR_AND_OPTIONAL_POLICY_BOUNDARY_COMPLETE; M5_RUNTIME_CALLERS_PENDING |

### `tests/` denominator

| Test class | Tracked paths | Status |
|---|---:|---|
| `tests/unit/` | 372 | PENDING |
| `tests/manual/` | 12 | PENDING |
| `tests/helpers/` | 8 | PENDING |
| `tests/browser/` | 7 | PENDING |
| `tests/smoke/` | 5 | PENDING |
| `tests/fixtures/` | 5 | PENDING |
| `tests/globalSetup.ts` | 1 | PENDING |

## Existing planning authority index

The starting tree contains 50 published capability specs and 10 non-archived OpenSpec changes. Status reported by `openspec list --json` at activation:

- Complete: `nightwatch-current-source-unknown-yield-w12-v1`, `nightwatch-certification-closure-and-validation-integrity-v1`, `nightwatch-validation-classification-and-skip-truth-v1`, `nightwatch-published-spec-baseline-integrity-v1`, `nightwatch-continuity-live-waypoint-binding-v1`.
- In progress: `nightwatch-production-completion-programme-v1`, `nightwatch-autonomous-yield-proof-w11-v1`, `nightwatch-control-center-design-system-v1`, `nightwatch-autonomous-bug-hunting-programme-v1`, `nightwatch-production-observability-system-map-master-plan-v1`.

An existing change counts as duplicate coverage only when its normative requirements and tasks close the exact observed failure mode. Status labels and title similarity are insufficient.

## Durable document read ledger

| Document | Coverage | Audit-relevant authority extracted | Status |
|---|---|---|---|
| `AGENTS.md` | complete | C-00 ownership, source precedence, owner scope freeze, task/continuity/project-state protocols, destructive/deletion policy | COMPLETE |
| `docs/SAFETY_MODEL.md` | complete (1–1,656) | fail-closed host/action/redaction rules; L0–L6 boundaries; auth/private-store/reasoner constraints; semantic/source and self-development authority partitions; historical versus current acceptance evidence | COMPLETE |
| `docs/ARCHITECTURE.md` | complete (1–2,325) | module map and run lifecycle; authority/data-flow boundaries; source/semantic/campaign/Control Center architectures; current L6 and reviewer/review-store designs; relocated inventory explicitly historical | COMPLETE |
| `docs/CURRENT_STATE.md` | complete through line 4,186 | `OPERATIONALLY_ACCEPTED`; current project-state and live-task blocks are mechanically owned; CI non-evidence is distinct from local validation; historical counts and anchors cannot be treated as live facts; NW-01–NW-14 and later Control Center closures prevent duplicate proposals | COMPLETE |
| `docs/DECISIONS.md` | complete decision-title inventory; foundational decisions and current D-101–D-138 authority bodies inspected, with older phase decisions cross-checked through Safety/Architecture/Current State | C-00, exact-head CI, validation, dependency, privacy, owner-scope, and current yield decisions constrain remediation; historical duplicated IDs use E-1 aliases | COMPLETE |
| `docs/ROADMAP.md` | complete phase/current-section inventory; current production/yield/Control Center sections inspected and historical phase authority cross-checked through Current State | current open work is explicitly separated from completed historical phases; W12 is partial/provider-blocked; configuration/bin-typecheck/release items already belong to the production-completion programme | COMPLETE |

No documentation inconsistency is admitted as a finding merely because historical prose differs from current machine truth. A candidate requires evidence that a current consumer trusts the stale statement or that required durable truth is internally contradictory.

## Finding ledger

| ID | State | Severity | Confidence | Subsystem | Summary | Evidence | Existing-plan relation | Owning change |
|---|---|---|---|---|---|---|---|---|
| NW-AUD-001 | PROPOSED | Medium | High | CI / supply chain / hardening | Authoritative CI executes two mutable `@v4` action refs, while the enforcing rule accepts an unanchored substring and can admit lookalike owners or suffixed refs | `.github/workflows/hardening.yml:22,26`; `bin/lib/hardening/rules/validation-and-gates.mjs:239-240`; probe registry has no action-identity mutation | No existing published requirement or active change pins third-party actions; exact-head CI spec is extended rather than duplicated | `nightwatch-ci-action-supply-chain-integrity-v1` |
| NW-AUD-004 | PROPOSED | Medium | High | clean/CI certification / toolchain supply chain / reproducibility | CI selects the moving major `20`; clean certification may execute unlocked `node@20` before the gate; receipts record only `nodeMajor`, so different Node/npm identities can produce indistinguishable certification evidence | `.github/workflows/hardening.yml:28`; `bin/quality-gate-clean.mjs:65-90,128-135,192-213`; `tests/unit/gateReceiptPersistence.test.ts:500-508`; `rg --fixed-strings node@20` finds no lock/manifest owner | Existing specs require a fresh supported Node 20 checkout but do not bind an exact version, payload integrity, pre-install admission, or receipt parity; CI action pinning is a prerequisite, not duplicate coverage | `nightwatch-exact-runtime-toolchain-identity-v1` |
| NW-AUD-005 | PROPOSED | Medium | High | evidence retention / irreversible mutation / audit receipts | Apply durably records only an empty `STARTED` deleted set before removing every candidate, then best-effort overwrites the same receipt; a crash loses per-target truth and final-write failure can still return `APPLIED` with exit zero | `bin/evidence-retention.mjs:304-315,392-422,453-460`; `tests/unit/evidenceRetention.test.ts:153-264`; production-completion `evidence-lifecycle-hygiene/spec.md:32-44` | Existing retention ownership requires deletion recording and normal-path tests, but no active/published requirement owns crash-consistent per-target outcomes, exclusive apply, incomplete-operation recovery, or non-success on finalization failure | `nightwatch-retention-crash-consistent-receipts-v1` |
| NW-AUD-006 | PROPOSED | High | High | C-00 session/worktree ownership / integration | Every lifecycle command accepts arbitrary `--root`; release rewrites the selected live record without caller binding, and integrate treats the selected target's `OWNED_SESSION` class as sufficient to reach its fetch/push path | `bin/nightwatch-session.mjs:86-134,398-416,469-531,654-735`; canonical-CWD dry runs against the live audit session planned both record replacement and fast-forward integration; current `workspaceIsolation.test.ts` proves direct second-claim refusal but has no foreign-release/integrate matrix | Published C-00 requires one writer/session and owner-only lifecycle actions, but no active change binds mutation invocation to current checkout/session or serializes record revisions | `nightwatch-session-mutation-authority-binding-v1` |
| NW-AUD-007 | PROPOSED | Medium | High | change intelligence / offline compiler bootstrap / derivative lifecycle | The offline `change:shadow` path invokes `npx tsc` twice, so missing local dependencies can trigger remote moving-package resolution; it deletes a fixed shared compile root before compiler admission, allowing refusal-time mutation and concurrent-run interference | `bin/change-intelligence.mjs:20-62,132-136`; `package-lock.json` exact `node_modules/typescript` 5.9.3 entry; worktree has no local TypeScript; `tests/unit/cliImplementationContract.test.ts:423-430` exercises help only | Completed source-runtime hardening preserved different compiler semantics but did not authorize package resolution; exact certification toolchain explicitly excludes arbitrary developer commands; generic CLI output/argument work is separate | `nightwatch-change-shadow-offline-runtime-integrity-v1` |
| NW-AUD-009 | PROPOSED | Medium | High | local ignored artifacts / report and certification-receipt publication | Six current-report writers truncate directly after recursive directory creation, and gate topology directly writes millisecond-named receipts; prepared links can redirect writes, interrupted replacement can destroy the last complete report, and same-millisecond runs can overwrite history | `bin/{cache-key-contract,record-identity,release-freshness,silent-zero-output,test-oracle-quality,change-intelligence,gate-topology}.mjs`; `src/core/schemaLifecycle/declarations.ts`; `.gitignore`; direct-write census and existing publisher comparison | Retention journal, gate-receipt transport, private stores, schema export, and generic CLI contracts have different authority or scope; no active change owns the complete seven-writer ignored-artifact boundary | `nightwatch-local-report-publication-integrity-v1` |
| NW-AUD-010 | PROPOSED | High | High | project release certification / Git evidence provenance | A raw `MET` condition is invalidated only when its evidence is a strict ancestor; null, later `HEAD`, missing, future, and divergent evidence retain MET, while Git negative and operational failure are collapsed | `src/core/releaseCertification/index.ts:350-381`; `bin/project-state-check.mjs:1012-1028`; `config/release-certification.v1.json`; `tests/unit/projectState.test.ts:1726-1818` | Production-completion defines release binding but its implemented/tested rule covers only stale ancestors; CI/toolchain changes bind different identities | `nightwatch-release-evidence-lineage-integrity-v1` |
| NW-AUD-011 | PROPOSED | Medium | High | canonical generated catalog / owner-gated source mutation | Apply consumes approval atomically only by approval ID; distinct approvals prepared from one clean preimage can both pass preflight and write the shared target, while crash boundaries and swallowed directory-sync failure can split target, consumption, and receipt truth | `src/core/selfDevPromotion/apply.ts:79-110,135-218`; `src/core/selfDevPromotion/storage.ts:87-151`; `tests/unit/selfDevCanonicalPromotionFlow.test.ts:149-171`; durable Phase 8 authority records | Existing self-development records prove one historical authorized apply and per-approval one-shot behavior, but no active proposal/spec owns distinct-approval serialization or transaction recovery; standing authority remains NONE | `nightwatch-canonical-promotion-transaction-serialization-v1` |
| NW-AUD-012 | PROPOSED | Medium | High | configuration declaration / `.env` / launcher authority | `.env` values are merged for validation and shown as `ENV_FILE`, but launchers later read/forward ambient `process.env`; unknown file-only names are filtered before reporting, and malformed/duplicate/unknown declaration input is permissive | `src/core/config/environmentSurface.ts:329-510`; `bin/nightwatch.mjs:71-95,102-132`; `bin/nightwatch-agent.mjs:40-48,124-159`; `bin/child-environment.mjs:47-68`; `tests/unit/safety.test.ts:455-512` | Production-completion F-19 requires declaration/reporting but its implemented path does not bind the merged snapshot to execution or strictly admit the file/declaration; no active change owns that coherence failure | `nightwatch-configuration-layer-authority-integrity-v1` |
| NW-AUD-013 | PROPOSED | High | High | schema lifecycle / preservation / migration safety | Export pre-slices to the record limit and catches every record failure, so omitted data can report `truncated: false`; destination ancestry is only lexically/immediately checked; migration compares raw path strings and always asserts original retention | `bin/schema-lifecycle.mjs:136-168`; `src/core/schemaLifecycle/export.ts:97-144`; `src/core/schemaLifecycle/migration.ts:113-165`; `tests/unit/schemaVersionMigration.test.ts:120-179,334-406` | Existing lifecycle requirements own dispositions and a bounded sanitized export but not truthful completeness, ancestor identity, durable publication, alias-safe migration, or observed original retention | `nightwatch-schema-preservation-integrity-v1` |
| NW-AUD-014 | PROPOSED | High | High | subprocess containment / credentials / offline tooling / hardening totality | The boundary rule checks a manual 18-file list while 53 bin modules import child-process authority; unlisted callers spread/inherit ambient state, use acquiring `npx`, or omit timeout/output/stdio bounds, including network-sharing and authenticated paths | `bin/lib/hardening/rules/process-and-network.mjs:27-66`; `bin/gate-topology.mjs:394-508`; `bin/review-mutation-campaign.mjs:333-340`; `bin/phase22-dev.mjs:221-238`; static import/invocation census | Existing child-environment and launcher checks state the desired boundary but are non-total; NW-AUD-007 owns one compiler bootstrap only, and NW-AUD-012 owns configuration admission rather than process authority | `nightwatch-child-process-boundary-totality-v1` |
| NW-AUD-015 | PROPOSED | Medium | High | authenticated capability lifecycle / storage-state publication | Automatic DEV refresh replaces storage state without writing the required digest-bound lifecycle sidecar; direct capture publishes state before a separate sidecar transaction, so successful refresh or interruption leaves a stale/missing/mixed capability and can discard the prior valid pair | `src/auth/devAutoLogin.ts:454-482,484-596`; `src/auth/directRunner.ts:515-561,596-615`; `src/auth/capabilityLifecycle.ts:337-370,445-551`; `src/browser/fixtures/storageState.ts:587-623`; current auth tests have no automatic-refresh sidecar or two-file interruption case | F-21 requires every capture to carry lifecycle metadata and fail-closed readers enforce it, but no active/published requirement owns complete writer coverage, multi-file crash consistency, or preflight-to-consumption generation binding | `nightwatch-auth-capability-bundle-transaction-integrity-v1` |
| NW-AUD-016 | PROPOSED | High | High | mandatory outer proxy / runtime identity / health / control state | Proxy admission trusts a self-asserted state file plus any loopback listener returning 204 at the fixed health path; state has no per-start lease/process/server/event identity, so stale/replaced control state can admit a listener that never enforces Nightwatch policy | `src/proxy/runtime.ts:14-96`; `src/proxy/server.ts:154-228,331-342,618-657`; `src/proxy/portLease.ts:208-253`; `tests/globalSetup.ts:21-80`; `tests/unit/proxy.test.ts:245-293`; real-run gate/browser liveness consumers | Resolved-egress work binds static policy/resolver/exact-address versions, not the live server instance; no active change owns challenge-based health, state/lease/process/event coherence, or revocation | `nightwatch-proxy-runtime-instance-attestation-v1` |
| NW-AUD-017 | PROPOSED | High | High | L6 process/network containment / qualification evidence / runtime binding | L6 returns every proof field as PROVEN even though the UDP probe result is omitted from `directDenied`, browser TCP/UDP observers are never targeted, resolver flags suppress the speculative-DNS stimulus, and the constant-only capability is discarded before a separately resolved authenticated launch | `src/core/oops/l6.ts:850-885,961-1022,1036-1119`; `src/core/oops/process.ts:272-310`; `tests/unit/l6Containment.test.ts:31-90` | NW-AUD-014 explicitly excludes redesigning L6 containment and only owns global child-call totality; no active change requires witnessed non-vacuous probes or binds qualification generation to use | `nightwatch-l6-qualification-proof-integrity-v1` |
| NW-AUD-018 | PROPOSED | High | High | authenticated evidence / URL minimization / recorder persistence | Authenticated URL reduction preserves ordinary lowercase identifiers as route words, while constructor metadata, repository snapshots, and summary notes have serialization paths outside authenticated-data sanitization; late mode transition does not harden the existing directory | `src/core/safety/redaction.ts:143-179`; `src/core/evidence/runRecorder.ts:79-147,160-202,349-402`; `tests/unit/redaction.test.ts:137-148`; authenticated/manual caller census | C-10 deliberately retains the DEV/authenticated recorder and solves a separate production typed projection; no active change owns proven route templates or a total authenticated writer firewall | `nightwatch-authenticated-evidence-minimization-integrity-v1` |
| NW-AUD-019 | PROPOSED | Medium | High | private artifacts / shared privacy screening / Control Center readers | The canonical labeled-private-value regex is applied to JSON serialization but does not accept a quote between key and colon, so normal objects with ordinary token/password/customer fields pass; current tests use sentinel tokens that a different regex catches | `src/core/policy/privateScreening.ts:14-38`; `src/core/policy/privateArtifacts.ts:154-158,254-267`; Control Center findings/run readers; `tests/unit/privateArtifactAtomic.test.ts:50-55`; deterministic synthetic regex probe | C-10 production typed projection reduces one consumer's primary risk but explicitly leaves the shared screen as defense in depth; no active change makes owner-local store/read schemas structural and total | `nightwatch-private-payload-screening-structural-integrity-v1` |
| NW-AUD-020 | PROPOSED | High | High | browser/API semantic admission / journey causality / redirects | Unknown API requests are continued during navigation or outside an active action intent; action intent closes after a fixed 250 ms while final settlement can continue for 10 seconds, and the CDP redirect backstop applies host policy without semantic request authority | `src/browser/observers/networkObserver.ts:272-329,465-548`; `src/core/journeys/engine.ts:37,329-350,469-483`; `src/browser/network/fetchGuard.ts:88-191`; Phase 2A/2B requirement conflict | Existing endpoint semantics classify exact known reads but no active change owns pre-effect proof for passive/delayed/redirect traffic or deterministic causal generations; host containment is not semantic read authority | `nightwatch-semantic-request-admission-integrity-v1` |
| NW-AUD-021 | PROPOSED | High | High | DEV credential retrieval / login-page use binding | Auto-login validates an approved URL and visible generic controls before retrieval, then fills and force-submits later without revalidating the live document/form/submission target around each secret-bearing effect; a navigation or DOM replacement can receive credentials before later token/shell checks fail | `src/auth/devAutoLogin.ts:299-310,501-549`; `src/auth/loginForm.ts:18-40`; `tests/unit/devLoginSecurity.test.ts:24-36`; absence of navigation/DOM/form-action/listener race coverage | Credential-provider permission/freshness checks and post-login verification own different boundaries; no active change binds retrieval capability to the exact live document/form and each use effect | `nightwatch-dev-credential-use-binding-v1` |
| NW-AUD-022 | PROPOSED | Medium | High | outer proxy / evidence-effect ordering | Allowed HTTP piping, CONNECT acknowledgement/socket coupling, and Upgrade forwarding/coupling begin before the awaited event append; evidence failure blocks later traffic but the current effect may already escape durable evidence, while the existing zero-connection test uses an independently denied hostname | `src/proxy/server.ts:219-227,371-420,468-493,543-577`; `src/proxy/events.ts:33-40`; `tests/unit/proxy.test.ts:267-293`; prior resolved-egress fail-closed claim | NW-AUD-016 owns live instance/control-state identity, not per-request evidence ordering; no active change requires a durable preparation barrier and truthful incomplete outcome for every transport | `nightwatch-proxy-evidence-effect-ordering-v1` |
| NW-AUD-023 | PROPOSED | High | High | browser context lifecycle / per-page containment readiness | Browser context/page creation precedes multiple fallible setup stages without encompassing rollback; the proxy-health interval can survive later setup failure, and popup/new-page Fetch guards are installed through an unawaited promise with no page admission barrier | `src/browser/context.ts:254-481,527-548`; `tests/unit/contextUrlHardening.test.ts`; browser smoke/setup callers | M2 proposals own proxy/auth/semantic authority but not all-or-nothing context construction, exact page readiness, or settled teardown | `nightwatch-browser-context-guard-transaction-integrity-v1` |
| NW-AUD-024 | PROPOSED | High | High | run evidence / bundle identity / crash consistency | Recorder construction reuses run directories, truncates manifest while JSONL appends, resets corrupt manifest to `{}`, writes views directly, and finalizes from memory that can diverge after mirror failure; observers may swallow recorder exceptions | `src/core/evidence/runRecorder.ts:79-143,187-243,274-308,348-402`; `src/browser/observers/{consoleObserver,pageObserver}.ts`; `tests/unit/evidence.test.ts:94-110` | NW-AUD-018 owns authenticated payload minimization and NW-AUD-009 owns ignored local reports; neither owns run-bundle generation, journal, recovery, or terminal evidence truth | `nightwatch-run-evidence-bundle-transaction-integrity-v1` |
| NW-AUD-025 | PROPOSED | High | High | replay/admission / context independence / evidence completeness | Admission counts distinct run IDs and ignores context kind/generation, so wrong-kind or same-context labels can reach L2; replay conditionally skips strong fields absent on both sides, allowing partial legacy/current evidence to match | `src/core/journeys/admission.ts`; `src/core/journeys/replay.ts`; `tests/manual/phase2c-real-journeys.ts:337`; `tests/unit/phase2cOracleMatrix.test.ts:596-618`; campaign admission caller | Existing replay/minimization specifications describe fresh contexts and exact evidence but no active change mechanically attests context generations or makes every current comparison channel mandatory | `nightwatch-replay-context-provenance-integrity-v1` |
| NW-AUD-026 | PROPOSED | Medium | High | exploration runtime / structural postconditions | The real Ripple runtime merges the catalog's expected structural delta into local state and returns it as the observed delta, making the engine's independent contract comparison tautological and permitting no-op/wrong UI actions to create false states/transitions | `src/products/ripple/explorationRuntime.ts:190-283`; `src/core/exploration/engine.ts:320-410`; `tests/unit/exploration.test.ts:340-363` | Existing Phase-4 contracts require structural deltas but no active change owns independent source-backed postcondition observation in the real adapter | `nightwatch-exploration-observed-postcondition-integrity-v1` |
| NW-AUD-027 | PROPOSED | Medium | High | retained production-local persistence / destructive cleanup / audit completeness | Profile cleanup recursively deletes by absolute basename prefix and stale sweep trusts name+age; finding commit can overwrite and race capacity; persistence audit skips missing/unreadable/over-budget entries yet can return clean | `src/core/prodEvidence/browserProfile.ts:64-141`; `productionFindingsStore.ts:168-238`; `persistenceAudit.ts:112-152,158-281`; C-10 tests | C-10 owns payload projection/firewall and ordinary cleanup/audit success, not capability-bound deletion, immutable commit, concurrent capacity, directory durability, or incomplete-audit truth | `nightwatch-production-persistence-lifecycle-integrity-v1` |
| NW-AUD-028 | PROPOSED | Medium | High | Phase-5 API relay / caller authority / execution budget | A public operation ID in URL/header is the only inbound proof; any local process that discovers the port can repeatedly trigger eligible authenticated reads, no listener-wide budget exists, and observations overwrite by operation ID | `src/api/phase5/relay.ts:233-375`; `src/api/phase5/generator.ts`; `src/core/oops/l6.ts:738`; `tests/unit/phase5Fixture.test.ts` | L6 bounds its contained child channel and NW-AUD-020 owns semantic operation admission; neither binds direct parent-loopback callers or relay-wide invocation cardinality | `nightwatch-phase5-relay-invocation-authority-v1` |
| NW-AUD-029 | PROPOSED | High | High | protocol triage / dossier readiness / promotion | The v1 dossier constructor always emits READY; failed or invalid minimization can be persisted and later counted in READY ledger/promotion paths, while browser/API agreement is mislabeled as two fresh contexts | `src/core/triage/{dossier,pipeline,confidence}.ts`; protocol branch in `src/core/campaign/orchestrator.ts`; focused triage/campaign tests | NW-AUD-025 owns context provenance in replay/admission but not the protocol compatibility branch's unconditional dossier and campaign readiness effects | `nightwatch-protocol-dossier-readiness-integrity-v1` |
| NW-AUD-030 | PROPOSED | Medium | High | triage durable evidence / replay identity / semantic coherence | Replay-plan v2 accepts occurrence ordinals outside the envelope domain; minimality parsing trusts cast fields/free survivor digests; semantic replay receipts accept contradictory currentness/outcome/binding combinations | `src/core/triage/{replayPlan,replayEnvelope,minimalityEvidence,semanticReplay}.ts`; `src/core/artifactValidation/replayRecordValidation.ts` | NW-AUD-025 owns independent context provenance and required comparison channels, not cross-schema representability, canonical survivor identity, or total semantic receipt coherence | `nightwatch-triage-evidence-contract-integrity-v1` |
| NW-AUD-031 | PROPOSED | Medium | High | durable artifact/DTO validation / resource and privacy bounds | Several strict validators traverse unbounded arrays/graphs and the artifact facade returns arbitrary leaf `Error.message`; corrupt owner-local evidence can exhaust resources or echo payload-derived diagnostics | `src/core/artifactValidation/{index,minimizationValidation,observationClusterValidation,coverageReportValidation,projectHealthValidation}.ts`; recursive DTO/privacy validators | NW-AUD-019 owns structural private-value screening, not total validation-work bounds, producer/parser maxima, or the facade's raw error channel | `nightwatch-durable-artifact-validation-bounds-v1` |
| NW-AUD-032 | PROPOSED | Medium | High | retained Phase-6 compatibility / permanent owner quarantine | Owner policy exists only in the default invoker; adapters accept arbitrary invokers and structurally forged validated-plan markers, while permits are not ledger-bound or one-shot | `src/data/phase6/{adapters,gates,validators,budget}.ts`; import/caller census | Permanent owner scope blocks ordinary real execution and no real invoker is wired, but no existing proposal makes the retained adapter seam itself non-bypassable | `nightwatch-phase6-owner-scope-quarantine-integrity-v1` |
| NW-AUD-033 | PROPOSED | Medium | High | production observation / budget reservation lifecycle | Budget is reserved before breaker/final kill-switch/grant-consumption decisions; denial paths leak in-flight occupancy, while settlement accepts fabricated/foreign/replayed values and mutates aggregate counters | `src/core/prodObserve/{productionRunGate,budget}.ts`; C-11 kernel tests | Production persistence and receipt scopes do not own the reserve/cancel/dispatch/settle state machine or counter conservation | `nightwatch-production-budget-reservation-lifecycle-integrity-v1` |
| NW-AUD-034 | PROPOSED | Medium | High | production qualification and P1 evidence authority | PQ validation does not exact-validate/recompute the current chain or per-gate denial relation and open resealing authenticates caller-assembled claims; P1 config identity omits destination/expected SHA and its safe receipt lacks a strict parser | `src/core/prodObserve/{receipt,productionRunGate}.ts`; `src/core/prodObserveP1/{scopeConfig,safeReceipt,observer}.ts`; focused C-11/P1 tests | NW-AUD-010 owns release checkpoint lineage and NW-AUD-027 owns persistence lifecycle; neither proves qualification/rehearsal producer authority | `nightwatch-production-observation-receipt-integrity-v1` |
| NW-AUD-035 | PROPOSED | Medium | High | browser response body / timeout / resource lifecycle | `response.body()` is fully materialized before the size check and the timeout only abandons awaiting the losing promise; oversized/stalled acquisition can retain memory/work beyond observer and context settlement | `src/browser/observers/networkObserver.ts:106-124,785-835`; browser context/lifecycle callers and fixtures | NW-AUD-023 owns context construction and NW-AUD-024 owns evidence publication; neither bounds or owns the response-body acquisition operation itself | `nightwatch-browser-response-acquisition-integrity-v1` |
| NW-AUD-036 | PROPOSED | High | High | sibling source / snapshot currentness / filesystem transaction | Inventory binds one pre-scan HEAD, later digest-mismatched bytes remain analyzable, route parsing omits the digest guard, and Phase 24 asserts snapshot match; pathname ancestry checks are separate from later opens/walks | `src/core/source/{siblingSource,scan,callScopedRead,surfaces}.ts`; `tests/unit/callScopedSourceRead.test.ts`; source-authority callers | Existing source-currentness work detects changed handler/join bytes but does not close the repository observation interval, protect route parsing, derive candidate currentness, or hold parent identity across use | `nightwatch-source-snapshot-transaction-integrity-v1` |
| NW-AUD-037 | PROPOSED | High | High | real-source semantic expectation / derivation, resolver, and campaign identity authority | Proof accepts derivation-version/digest shape; resolver rechecks source digest but returns caller-supplied expectation semantics; derivation/collection bridges trust structural records; campaign mapping aliases target ID as expectation ID despite distinct recipe blueprint IDs | `src/oracles/expectations/{admission,collectionAdmission,resolver}.ts`; `src/oracles/semantic/{campaignTargetMapping,semanticCampaignBundle}.ts`; `src/core/semanticAcceptance/admissionRoute.ts`; focused real-source admission/currentness tests | NW-AUD-036 owns exact source bytes/generation, not the binding from genuine extraction evidence to complete canonical expectation/campaign identity; existing fixtures normalize the target alias instead of testing the recipe blueprint ID | `nightwatch-real-source-expectation-authority-integrity-v1` |
| NW-AUD-038 | PROPOSED | Medium | High | semantic receipts / contained-DEV evidence / acceptance summarization | Direct receipt validation does not recompute identity or close nested/outcome/coverage coherence; public construction can label `CONTAINED_DEV`; Phase 9B summarizes unvalidated receipts and can compose first-receipt identity with another receipt's decisiveness | `src/oracles/semantic/{receipts,hook}.ts`; `src/core/phase9b/summary.ts`; semantic acceptance/deep acceptance; artifact/DTO readers and focused tests | NW-AUD-030 owns triage semantic replay receipts and NW-AUD-034 owns production qualification/P1 receipts; neither owns semantic-evaluation receipt producer class or Phase 9B/10B acceptance-set coherence | `nightwatch-semantic-receipt-acceptance-integrity-v1` |
| NW-AUD-039 | PROPOSED | High | High | projection completeness / invariants / semantic relations | Collection-item aggregation ignores per-item NOT_APPLICABLE; binary comparison and identity-token relations can certify PASS/equality/disjointness/subset over truncated prefixes | `src/oracles/{projections/shape,invariants/evaluate}.ts`; `src/core/semanticCoverage/{relational,differential,metamorphic}.ts`; Phase 11/18/20 tests | NW-AUD-038 owns receipt/acceptance-set integrity, not whether the underlying semantic evaluator's decisive result is sound under incomplete evidence | `nightwatch-semantic-partial-observation-soundness-v1` |
| NW-AUD-040 | PROPOSED | High | High | semantic source analyzers / mechanical proof / completeness | TS/JS and Go analyzers regex-scan raw source including decoys and unrelated declarations/flows; OpenAPI repairs incoherence; output beyond 256 is silently sliced | `src/core/semanticCoverage/sourceAnalyzers.ts:712-942`; discovery/admission/cache/report consumers; Phase 25/26 tests | NW-AUD-037 owns canonical fixed-recipe expectation derivation; it does not own the broader Phase-20 multi-language analyzer's lexical, flow, or totality proof | `nightwatch-semantic-source-analyzer-proof-soundness-v1` |
| NW-AUD-041 | PROPOSED | High | High | semantic coverage and lifecycle evidence authority | Admission, contracts, graph, campaign, and quality trust caller booleans/structural DTOs; missing lifecycle evidence defaults to replayed/minimized/high-confidence; synthetic replay/minimization does not independently execute the semantic finding | `src/core/semanticCoverage/{discovery,relational,differential,metamorphic,membership,graph,campaignIntegration,mutation,lifecycle,quality}.ts`; Phase 20/21 tests | NW-AUD-039 owns evaluator completeness and NW-AUD-042 owns ledger accounting; neither establishes producer evidence for lifecycle promotions | `nightwatch-semantic-coverage-evidence-authority-v1` |
| NW-AUD-042 | PROPOSED | Medium | High | semantic graph gap census / closure ledger | Caller status overrides self-certify closure; rebuild walks only baseline records with a lossy key, omits new gaps, marks unexplained removals obsolete, publishes divergent counts, and double-counts repeated surfaces | `src/core/semanticCoverage/{graph,closureLedger,quality}.ts`; `tests/unit/phase21Integration.test.ts` | NW-AUD-041 owns capability evidence, not lossless current/historical ledger identity, rebuild conservation, or surface cardinality | `nightwatch-semantic-gap-ledger-integrity-v1` |
| NW-AUD-043 | PROPOSED | Medium | High | change-directed selection / source generation / rename impact | Selector staleness compares configured map pins only to each other, never actual ChangeSet baseline/head; ChangeSet is not exact-validated/resealed; non-runtime classification suppresses a rename when either endpoint matches docs/tests/CI | `src/core/changeIntelligence/{types,git,map,selection}.ts`; real Phase-7 caller; change-intelligence tests/backtests | NW-AUD-036 owns exact source snapshot reads and NW-AUD-040 owns semantic source analyzers; neither binds dependency-map generation and rename endpoints to change selection | `nightwatch-change-intelligence-source-generation-integrity-v1` |

## M1 candidate dispositions

| ID | State | Summary | Decisive evidence | Disposition |
|---|---|---|---|---|
| NW-AUD-001 | PROPOSED | Mutable CI action identity plus substring-allowlist false negative | Current workflow uses `actions/checkout@v4` and `actions/setup-node@v4`; current regex `/actions\/(?:checkout|setup-node)@v4/` is unanchored, so `evil/actions/checkout@v4` and `actions/checkout@v4-suffix` match; action code runs before repository-owned gate | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-002 | DUPLICATE | `bin/**` is parse-checked but its strict typecheck lane remains reporting-only | `config/bin-typecheck.v1.json` is `REPORTING`; authoritative gate `STATIC` runs root `typecheck` only; production-completion tasks 15.7 and 15.11 explicitly require full conformance and blocking registration | Exact failure mode already owned by `nightwatch-production-completion-programme-v1`; no duplicate change |
| NW-AUD-003 | NOT_AN_ISSUE | Historical concern that tests/checks could sit outside authoritative manifests | `npm run validation:universe` discovers 494 checks: 257 authoritative + 237 explicitly classified + 0 unclassified; digest `sha256:039d60d15518fc56c463d66b` | Current NW-08 mechanism closes the historical R-12 lead |
| NW-AUD-004 | PROPOSED | Major-only runtime selection plus an unlocked pre-gate clean resolver and major-only receipts | CI uses `node-version: 20`; clean fallback invokes `npm exec --yes --package=node@20`, which is absent from `package-lock.json`; it accepts any Node 20 patch and returns only `nodeMajor`; the outer PASS receipt has `nodeRequirement: '20'` and no Node/npm version or payload identity; existing receipt test checks transport/digest disagreement only | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-005 | PROPOSED | Irreversible retention deletion is not transactionally bound to durable per-target/terminal truth | The initial receipt records `status: STARTED` and `deletedSet: []`; all candidates are then removed before one final overwrite; `writeReceipt` catches every error and returns null; the returned result remains `APPLIED`/`PARTIAL` with `receiptFinalized: false`, while the CLI exits non-zero only for `BLOCKED`; current tests cover only the successful path | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-006 | PROPOSED | C-00 mutators authorize a selected target record rather than the invoking session | `parseArgs` admits `--root` for all commands and `main` resolves it before dispatch; `release` replaces that record without checking `OWNED_SESSION` or caller context; `integrate` checks only the selected target's class and can fetch/push it; from canonical, zero-mutation dry runs against the live audit session emitted `SESSION_RELEASE_RECORD REPLACE ...` and `SESSION_INTEGRATION_READY` | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-007 | PROPOSED | An offline operator command can acquire/execute an ungoverned compiler and mutates a shared derivative root before admission | `compileCore()` first recursively removes and recreates `.tmp-nightwatch/change-intelligence`, then invokes bare `npx tsc` twice; the exact locked TypeScript package is not installed in this worktree, and the existing process test exits through `--help` before compilation | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-008 | DUPLICATE | `change:shadow` accepts no governed shared CLI parser and prints its machine-specific absolute `outputPath` | The entrypoint checks only whether `--help`/`-h` occurs anywhere, ignores every other argument, and serializes absolute `outputPath`; production-completion `operator-cli-contract` already requires every `bin/*.mjs` to share parsing, reject unknown arguments before effects, and omit machine-specific paths | Exact failure class already owned by `nightwatch-production-completion-programme-v1`; no duplicate change |
| NW-AUD-009 | PROPOSED | Ignored local reports and topology receipts bypass safe publication | Five fixed `current.json` writers plus change-intelligence call `mkdirSync` then direct `writeFileSync`; gate topology does the same with `${Date.now()}.json`; schema declarations classify the outputs as persisted/private, while no complete inventory or guard prevents bypass | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-010 | PROPOSED | Release evidence is not required to equal the certified checkpoint | The evaluator changes MET only for a strict ancestor; null/HEAD-descendant/missing/future/divergent identities remain MET, and `gitReadOnly(...merge-base...) !== null` cannot distinguish ordinary non-ancestry from object/command failure; tests set all-met ancestry to false and probe only one stale ancestor | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-011 | PROPOSED | Canonical apply is one-shot per approval, not serialized per shared source target | Two distinct approvals have different immutable consumption filenames and can both pass the clean/preimage checks before either rename; no repository-target lease/journal exists; parent directory fsync failure is ignored; focused tests retry one approval but do not race distinct approvals or kill the process across stages | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-012 | PROPOSED | The validated/rendered configuration snapshot is not the execution authority | File values are merged only inside startup/config blocks; later launcher decisions and explicit child values read `process.env`; unknown file-only keys never enter the map given to the reporter; the parser skips malformed lines and overwrites duplicates | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-013 | PROPOSED | Preservation and migration results overstate complete/non-destructive truth | CLI slices matching names before the builder can mark truncation and catches read/parse failures; writer checks only lexical/immediate ancestry; migration path equality is string-only and `originalRetained` is constant without a post-write original read | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-014 | PROPOSED | The claimed global subprocess boundary is an incomplete manual sample | 53 bin modules import child-process authority, but the rule lists 18 files; gate topology and review mutation spread the ambient environment, and Phase 22 DEV inherits environment/stdio without explicit deadline/buffer; offline mutation invokes acquiring `npx` | MATERIAL → dedicated strictly-valid OpenSpec change |

## M2 candidate dispositions

| ID | State | Summary | Decisive evidence | Disposition |
|---|---|---|---|---|
| NW-AUD-015 | PROPOSED | Authentication state and lifecycle metadata are not one writer-complete crash-consistent capability | `runDevAuthRefresh` ends after storage-state replacement and never calls `writeAuthCaptureRecord`; direct capture replaces the artefact, sets `stateCommitted`, then separately derives/writes the sidecar; readers correctly reject absent/digest-mismatched records, and tests exercise those rejections but not writer completeness or interruption between the two commits | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-016 | PROPOSED | Static proxy state plus status-only health can falsely attest the mandatory containment executor | Runtime state contains no instance/lease/process-start identity; `checkProxyHealth` accepts status 204; the server returns 204 at the public fixed path; setup, real-run gate, and liveness consumers treat that as the active proxy; focused tests reject static version mismatch and event failure but do not substitute an unrelated 204 listener | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-017 | PROPOSED | L6 qualification overclaims non-vacuous denial and is not bound to the authenticated runtime it authorizes | The Node probe records `udp: CONNECTED` on successful send but `directDenied` omits it; browser observer ports never enter Chrome arguments or content while `*.invalid` is mapped to NOTFOUND; READY is a public constant constructor, and `runRestrictedOops` discards qualification context before a new Bubblewrap/target resolution | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-018 | PROPOSED | Authenticated metadata minimization is heuristic and not a total persistence boundary | `redactAuthenticatedUrl` preserves lowercase/digit route-like IDs; `writeRepositories` and final notes serialize directly; constructor fields precede authenticated sanitization; a late switch changes file handling but not directory mode; focused tests cover only mixed-case/numeric IDs | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-019 | PROPOSED | Shared private screening misses its ordinary serialized-object channel | Local reproduction shows JSON-stringified ordinary token/password/customer fields all return unblocked because keys are quoted; equivalent unquoted text is blocked; store/readers rely on the shared screen and tests prove only canonical sentinel rejection | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-020 | PROPOSED | Unknown/delayed/redirect API requests can cross transport admission without source-proven read authority | `PASSIVE_UNKNOWN_OBSERVED` traffic is continued; a 250 ms intent timer closes before the 10 s settlement barrier; the redirect backstop consumes host but not semantic authority | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-021 | PROPOSED | Credential retrieval approval is not bound to the exact live document/form at each secret-bearing use | Page URL/control checks precede provider retrieval, while generic locators and force-click run later without document/form/action revalidation; current test accepts any matching synthetic form and has no replacement/navigation race | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-022 | PROPOSED | Proxy request evidence is appended after the current upstream effect begins | HTTP, CONNECT, and Upgrade all start their effect before `record()`; failure disables only subsequent requests; the named zero-connection test uses a policy-denied destination | MATERIAL → dedicated strictly-valid OpenSpec change |

### M2 coverage reconciliation

| Responsibility row | Source denominator | Test/evidence denominator | Candidate/disposition | Status |
|---|---|---|---|---|
| Environment, host, protocol, action, semantic-read, owner-scope, and redaction policy | all 9 `src/core/safety/**` files plus `src/core/policy/ownerScope.ts` | focused safety, endpoint-semantics, owner-scope, destination-manifest, host-capability, redaction, smoke, and manual gate callers | NW-AUD-018, NW-AUD-020; arbitrary-port host matching and internal non-network schemes are explicit current policy rather than bypasses | COMPLETE |
| Outer proxy resolution, address/exact binding, transport handlers, runtime state, lease, events, and cleanup | all 9 `src/proxy/**` files | address/resolver/resolved-egress, HTTP/CONNECT/Upgrade, lease determinism/stress, lifecycle, global setup, smoke, and failure-path tests | NW-AUD-016, NW-AUD-022; remaining normalization/cleanup leads either have exact current tests or depend on those proposals | COMPLETE |
| Authentication provider, login use, refresh/direct capture, lifecycle sidecar, storage state, and diagnostics | all 6 `src/auth/**` files plus `src/browser/fixtures/storageState.ts` | provider, login security, capture launcher/stages, lifecycle/freshness, authenticated smoke, and manual callers | NW-AUD-015, NW-AUD-021; provider stat/read race is not a separate repository threat because the secret directory is owner-only and a same-user adversary can already read it | COMPLETE |
| L6 namespace, relay/control channel, child launch, qualification, parent-death, and budget behavior | all 3 `src/core/oops/**` files | `l6Containment`, OOPS/API callers, hardening claims, and current qualification receipts | NW-AUD-017; timeout cleanup/late relay and same-user socket replacement are bounded denial-only leads, not separate material authority bypasses | COMPLETE |
| Browser semantic guard and causal intent boundary | `src/browser/{contract,context}.ts`, `src/browser/network/fetchGuard.ts`, `src/browser/observers/networkObserver.ts`, and `src/core/journeys/engine.ts` | observer semantic/settlement, journey engine, context/guard, authenticated and passive smoke/manual callers | NW-AUD-020; context-construction cleanup after partial startup is assigned to M3 browser lifecycle rather than silently closed here | COMPLETE FOR M2 BOUNDARY |
| Authenticated evidence and shared private-payload defense | `src/core/evidence/runRecorder.ts`, `src/core/policy/{privateArtifacts,privateScreening}.ts`, and all direct authenticated writer/reader callers found by census | redaction, evidence/private-artifact, production evidence, and Control Center reader tests | NW-AUD-018, NW-AUD-019; broader persistence/replay atomicity remains M3 | COMPLETE FOR M2 BOUNDARY |

## M3 candidate dispositions

| ID | Disposition | Root cause | Decisive evidence | Outcome |
|---|---|---|---|---|
| NW-AUD-023 | PROPOSED | Context startup/page admission is not transactional | fallible post-creation stages lack rollback; popup guard is fire-and-forget | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-024 | PROPOSED | Run evidence has no exclusive generation or canonical crash-consistent authority | directory reuse plus manifest truncate/event append; direct views and memory summary can split | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-025 | PROPOSED | Labels substitute for context provenance and simultaneous absence substitutes for equality | admission deduplicates only run IDs; replay checks newer channels only when both defined | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-026 | PROPOSED | Real exploration postcondition is copied from the expectation | runtime mutates/returns `expectedStructuralDelta`; fake-runtime mismatch test cannot expose it | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-027 | PROPOSED | Production-local lifecycle trusts names/check-then-act/violation-only cleanliness | prefix-based recursive deletion, replacing rename, silent traversal truncation/errors | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-028 | PROPOSED | Semantic operation identity is treated as live relay caller authority | no per-instance caller proof/budget; same-operation observation is last-writer-wins | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-029 | PROPOSED | Protocol readiness is hard-coded before replay/minimization truth | non-reproduction and invalid/budgeted minimization can still persist/ledger/promote READY | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-030 | PROPOSED | Triage evidence schemas disagree and accept unbound/coherence-invalid records | plan ordinal domain exceeds envelope domain; survivor digest and semantic outcome relations are under-validated | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-031 | PROPOSED | Strict artifact validation is not resource-total or uniformly privacy-safe | unbounded collections/recursion and raw leaf error messages remain at the durable facade | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-032 | PROPOSED | Permanent Phase-6 quarantine is delegated to an optional default invoker | injected invoker plus structural plan marker bypass the actual owner-policy seam | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-033 | PROPOSED | Reservation accounting lacks authenticated lifecycle transitions | post-reservation denial leaks occupancy; repeated/foreign settlement corrupts counters | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-034 | PROPOSED | Qualification/rehearsal digests are treated as execution authority | schemas/coherence are incomplete and caller-controlled resealing can authenticate never-executed claims | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-035 | PROPOSED | Response timeout/size limits apply after or outside the owned acquisition | full buffer allocation precedes cap and losing work is neither cancelled nor joined | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-036 | PROPOSED | Source discovery can combine multiple repository/file generations as one current snapshot | unclosed HEAD interval, route digest mismatch reaches parsing, constant Phase 24 match, and pathname TOCTOU | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-037 | PROPOSED | Genuine source evidence is not bound to complete expectation/campaign identity | shape-only proof and resolver digest recheck accept caller-modified fields; mapper substitutes target for blueprint expectation ID | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-038 | PROPOSED | Semantic acceptance trusts caller-classified and composable receipt facts | split parser strength, ordinary contained-class input, unvalidated mixed summaries | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-039 | PROPOSED | Incomplete projection evidence is collapsed into decisive semantic outcomes | missing per-item results and binary comparison over truncated trees/prefixes | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-040 | PROPOSED | Raw-text occurrence and silent truncation are treated as mechanical source proof | comment/string/wrong-symbol/unbound-flow matches plus output slicing | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-041 | PROPOSED | Caller assertions are treated as semantic lifecycle execution evidence | boolean/DTO promotion, omitted-evidence success defaults, non-executing replay/minimization | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-042 | PROPOSED | Gap closure and rebuild are neither evidence-bound nor census-preserving | status overrides, baseline-only lossy join, count divergence, repeated-surface inflation | MATERIAL → dedicated strictly-valid OpenSpec change |
| NW-AUD-043 | PROPOSED | Selective journey confidence is not bound to the actual map/source interval | pin-only staleness, structural ChangeSet trust, and one-sided non-runtime rename suppression | MATERIAL → dedicated strictly-valid OpenSpec change |

### M3 frozen responsibility denominator

M3 owns 154 primary source files: 14 browser, 10 Phase-5 API, 12 product,
11 Phase-6 compatibility/data, 24 triage, 2 protocol-oracle, 2 state/MCP,
and 79 files across artifact validation, DTO, evidence/retention, exploration,
journeys, production evidence/observation/privacy/provenance, provenance, and
repository snapshotting. A path/import/symbol census identifies 118 direct or
transitive test entrypoints. All rows now have terminal M3 dispositions.

### M3 coverage reconciliation

| Responsibility row | Primary source files | Test responsibility | Terminal disposition |
|---|---:|---|---|
| Browser context, guards, observers, fixtures, response/resource lifecycle | 14 | browser/context/network/observer fixtures within the 118-entrypoint census | NW-AUD-020, NW-AUD-023, NW-AUD-024, NW-AUD-035; remaining metadata-only lifecycle logic inspected with no separate material issue |
| Phase-5 API catalog, restricted generator, relay, deadline, oracle, lineage | 10 | Phase-5 fixture, relay, deadline, oracle, and lineage tests | NW-AUD-020, NW-AUD-028; abortable shared deadline/body streaming is already bounded, residual compatibility fingerprint is non-authoritative |
| Product adapters, actions, journeys, bootstrap/lifecycle diagnostics | 12 | exploration/journey/product fixtures and focused unit coverage | NW-AUD-026; static action/catalog/readiness helpers and diagnostics produce no additional independent issue |
| Phase-6 compatibility/data layer | 11 | Phase-6 validation/compiler/adapter/normalizer/comparator tests | NW-AUD-031, NW-AUD-032; deterministic catalog/normalizer/comparator/lineage transforms add no separate authority beyond those scopes |
| Triage, replay, minimization, dossier, promotion and summaries | 24 | triage/replay/minimization/dossier/campaign-focused tests | NW-AUD-025, NW-AUD-029, NW-AUD-030, NW-AUD-031; all residual parser/readiness leads absorbed by exact owning scope |
| Protocol oracles | 2 | response/resource oracle tests and transitive journey tests | NW-AUD-035 for acquisition; already-redacted metadata checks have no separate defect |
| State monitor and optional MCP policy | 2 | safety monitor/MCP policy transitive tests | raw authenticated evidence concern is duplicate NW-AUD-018; MCP remains disabled/non-authoritative |
| Shared artifact/DTO/evidence/exploration/journey/production/provenance/snapshot responsibilities | 79 | remaining direct/transitive entries in the 118-entrypoint census | NW-AUD-024 through NW-AUD-035 plus duplicates below; no open M3 lead remains |
| **Total** | **154** | **118 direct/transitive test entrypoints terminally mapped to the same rows** | **M3 COMPLETE** |

### M3 residual lead dispositions

| Lead | Disposition | Rationale |
|---|---|---|
| Compatibility API fingerprint derives from a sanitized/padded oracle identifier | NOT_MATERIAL_CURRENTLY | compatibility-only/non-authoritative; current campaign construction supplies its explicit API fingerprint, and no promotion authority consumes the fallback |
| P1 session keeps attached admission objects in a strong `Set` | NOT_MATERIAL_CURRENTLY | one-shot local/mock rehearsal is owner-gated and production is unauthorized; no long-lived service lifecycle exists in current reachability |
| P1 injected synchronous `poll()` could block or return an enormous batch | NOT_MATERIAL_CURRENTLY | current source is local/mock and no asynchronous external event-source implementation exists; future real adapter must satisfy NW-AUD-031/NW-AUD-034 bounds before authorization |
| Download cancellation occurs after the recorder call | DUPLICATE | recorder-before-cancel failure and swallowed observer writes are part of NW-AUD-024's all-observer evidence transaction contract |
| Response observer catches recorder failures | DUPLICATE | publication/observer failure truth belongs to NW-AUD-024; body acquisition lifetime is separately NW-AUD-035 |
| Run monitor retains URL/message-derived fields | DUPLICATE | authenticated persistence minimization and final-writer firewall are already NW-AUD-018; this audit adds no distinct non-authenticated authority defect |
| Phase-6 structural walkers and result normalizers can receive oversized compatibility inputs | DUPLICATE | total validation work is NW-AUD-031 and real invocation quarantine is NW-AUD-032 |

The 118 test entrypoints were classified by the same import/caller responsibility
rows: decisive tests were inspected directly, negative gaps are specified by
the owning changes, and tests whose only M3 contact is a transitive import were
not counted as evidence for later-wave source/campaign/UI behavior. No M3 lead
remains without a proposal, duplicate owner, or terminal reachability rationale.

## M4 frozen responsibility denominator

M4 owns 139 primary source files: 52 under `src/core/source`, 52 expectation/
projection/invariant/semantic-oracle files under `src/oracles` after excluding
the two protocol files closed in M3, 27 across semantic acceptance, semantic
coverage, Phase 9B freshness/preflight/summary, and Phase 10B deep acceptance,
plus 8 change-intelligence source/currentness consumers. A path/import/symbol
census identifies 162 direct or transitive focused-test entrypoints. Source
read/confinement/cache/currentness, extraction/admission, projection/invariant/
receipt coherence, semantic coverage/acceptance, and change-intelligence
consumption are terminally reconciled below. Campaign-intelligence runtime
behavior is not silently absorbed here and remains M5.

### M4 coverage reconciliation

| Responsibility row | Primary source files | Focused test responsibility | Terminal disposition |
|---|---:|---|---|
| Source boundary, repository inventory, call-scoped reads, route/operation discovery, snapshots, caches, currentness | 52 | source inventory/completeness/confinement/currentness and approved-scan entries within the 162-entrypoint census | NW-AUD-036; analyzer consumers additionally NW-AUD-040; remaining deterministic adapters/helpers map to exact transaction authority with no separate issue |
| Expectation recipes, extraction/admission/resolution, projections, invariants, semantic runner/findings/receipts/dossiers | 52 | Phase 9-18 semantic, real-source, receipt, triage, and adversarial entries | NW-AUD-037..040; weak finding/dossier identity is absorbed by NW-AUD-038; static vocabularies/registries and current exact schema validators add no independent issue |
| Semantic acceptance/coverage, Phase 9B/10B, graph, mutation/lifecycle, quality and closure | 27 | Phase 9B/10B and Phase 18-26 acceptance/coverage entries | NW-AUD-038..042; cache-only mutability is not currently reachable outside tests and future authority is constrained by NW-AUD-041 |
| Change intelligence and release-freshness consumers | 8 | change-intelligence/backtest/release-freshness/Phase-19 entries | NW-AUD-043; release-freshness inventory/oracle path is strict and fail-closed; baseline advancement is test-only and non-authoritative under current reachability |
| **Total** | **139** | **162 direct/transitive focused-test entrypoints terminally mapped to the same rows** | **M4 COMPLETE** |

### M4 residual lead dispositions

| Lead | Disposition | Rationale |
|---|---|---|
| Campaign mapper emits target ID as expectation ID | DUPLICATE | canonical recipe/target/expectation campaign identity is now explicit in NW-AUD-037 |
| Semantic finding ID is format-only; nested provenance and dossier projection are weak | DUPLICATE | decisive finding/dossier validation and generation binding are explicit parts of NW-AUD-038 |
| Projection serializer and recursive semantic DTO readers lack independent bounds | DUPLICATE | general durable/DTO validation work bounds belong to NW-AUD-031; completeness semantics belong to NW-AUD-039 |
| Semantic coverage cache returns mutable references | NOT_MATERIAL_CURRENTLY | current callers are tests only; before authority use, NW-AUD-041 requires exact validated generation-bound cache outputs |
| Expectation currentness helper defaults evidence verification to not-applicable | DUPLICATE | real authority cannot derive from a label under NW-AUD-037; current helper reachability is synthetic/test-only |
| Source annotation adapter can construct synthetic expectations with real-looking labels | DUPLICATE | NW-AUD-037 requires an explicit non-promotable synthetic lane and canonical producer authority |
| Lifecycle vocabularies accept structural categorical inputs | DUPLICATE | authoritative source/coverage records are closed by NW-AUD-037/NW-AUD-041; the vocabulary tables themselves are deterministic, total, and validation-tested |
| Baseline advancement accepts weak execution disposition | NOT_MATERIAL_CURRENTLY | no non-test caller exists; it cannot currently advance campaign authority, and any future wiring requires a new validated campaign-disposition boundary |
| Baseline atomic writer lacks broader publication durability/symlink policy | DUPLICATE | current path is test-only; shared local-report publication hardening is NW-AUD-009 if the writer becomes reachable |
| Release freshness uses an injected ancestry oracle | NOT_AN_ISSUE | the production CLI supplies fixed-argv local Git, inventory is exact/path-confined, invalid input performs zero observation, and report vocabulary explicitly disclaims deployment authority |

All 139 M4 files and all 162 focused/transitive test entrypoints now map to a
material proposal, a prior/duplicate owner, or a terminal current-reachability
rationale. No M4 lead remains undispositioned. Campaign scheduling/runtime,
provider/tool execution, checkpointing, reproduction/admission, and findings
store behavior remain M5 and were not silently closed here.

## M5 frozen responsibility denominator

M5 owns 220 primary source files across agent protocol/runtime/tools, AI review
and reasoner, campaign/campaign-intelligence, investigation/reproduction/
findings, benchmark/efficacy/Bug Atlas, readiness/rehearsal, portfolio,
Phase 12/13/22/23/24 runtimes, and self-development/sandbox/promotion. A static
import/caller census adds 28 cross-boundary source consumers and 28 bin
launchers/tools. The corresponding direct/transitive focused-test census has
168 entrypoints. M5 will reconcile scheduling, budgets, checkpoint/resume,
provider/tool authority, current-source investigation, reproduction/admission,
novelty, persistence, and autonomous improvement behavior against this fixed
denominator. M6 reviewer/Control Center write authority and M7 continuity/gate
framework behavior remain separate.

The mechanical focused-test search found 55 direct or transitive M2-matching test entrypoints. Each was classified by responsibility: decisive tests above were inspected in full, while source-intelligence, campaign, Control Center, and validation assertions that merely transitively import policy code remain assigned to their later audit waves. No M2 lead remains without a material proposal, a terminal non-material/not-an-issue rationale, or an explicit later-wave owner.

NW-AUD-001 severity is Medium rather than High: compromise or malicious
movement of an upstream action identity is an external precondition, and the
workflow grants only `contents: read`. Impact is nevertheless material because
the action can read private source and alter the workspace/conditions observed
by the later authoritative gate.

NW-AUD-004 severity is Medium rather than High: the ordinary consequence is
unreproducible or disagreeing certification rather than direct owner-policy
bypass, and exploitation of the clean bootstrap requires upstream/cache
compromise or operator execution on a non-20 host. It remains material because
the moving executable is selected before the repository gate, is outside the
project lockfile, and exact runtime disagreement is absent from authoritative
receipts. The proposal intentionally separates this selected-toolchain identity
from NW-AUD-001's setup-action code identity and requires both controls.

NW-AUD-005 severity is Medium rather than High: apply is an explicit,
non-interactive-refused owner operation over candidates already proven
unreferenced, so the defect does not broaden deletion eligibility or bypass an
external trust boundary. It is nevertheless material because deletion is
irreversible, the failure can deterministically report process success without
the required final record, and interruption can leave the only durable receipt
claiming an empty deleted set. The remediation preserves uncertainty across
the unavoidable post-delete/pre-outcome crash window rather than fabricating
atomicity.

NW-AUD-006 severity is High rather than Critical: a local process sharing the
owner's OS account and Git credentials is a prerequisite, and repository-only
coordination cannot claim hostile same-user isolation. Within Nightwatch's
actual multi-agent concurrency model, however, the path is direct and requires
no record corruption: a foreign checkout can release another live owner,
enable adoption, or invoke that session's fast-forward integration path. That
undermines the primary C-00 isolation and release checkpoint, can publish
unreviewed committed work, and is absent from the current adversarial suite.

NW-AUD-007 severity is Medium rather than High: an operator must explicitly
run the shadow command in a dependency-missing or resolution-divergent
checkout, and the ordinary consequence is ungoverned local code execution or
an unavailable/corrupted local report rather than direct product authority.
It remains material because the command's documented offline boundary is
false at its first compiler action, the selected package is not constrained by
the lockfile on that path, and a fixed derivative root is mutated before the
compiler is admitted. The proposal preserves full-program compilation rather
than silently weakening the command to per-file transpilation.

NW-AUD-009 severity is Medium rather than High: each path requires an explicit
local command and a prepared unsafe workspace or rare collision, and the
ignored reports ordinarily carry sanitized/recomputable local truth rather
than product credentials or external write authority. It remains material
because a link can redirect a direct write into an owner file, interruption can
destroy the only preceding complete report, and topology collisions can erase
certification history while reporting normal success. The proposal preserves
intentional explicit output selection but requires safe file identity and
separates atomic current replacement from immutable receipt authority.

NW-AUD-010 severity is High rather than Critical: it does not itself make a
failing check pass, choose the pending owner status, or grant product/external
authority. It is nevertheless the central durable release-certification gate,
and the defect lets absent or different Git objects be represented as evidence
for the certified checkpoint. A future advance can therefore satisfy every raw
check while bypassing the exact-lineage condition that makes the verdict about
those bytes rather than another tree.

NW-AUD-011 severity is Medium rather than High: the mutation is confined to
one generated catalog file and requires a future fresh owner authorization,
concrete candidate, independent approvals, and overlapping or interrupted
apply; standing promotion authority is currently NONE. It remains material
because the retained executor is the sole canonical source-write authority,
two writes violate its foundational bound, and a receipt/consumption mismatch
can make the owner unable to prove which approved postimage survived.

NW-AUD-012 severity is Medium rather than High: the inconsistency requires an
operator to rely on the optional file layer or introduce a typo, and ordinary
impact is refusal/default selection rather than direct product or Git authority.
It remains material because the configuration view can affirm a value that the
runtime does not consume and the original F-19 safety purpose was specifically
to prevent a silent typo from selecting a containment-relevant default.

NW-AUD-013 severity is High rather than Critical: export/migration/ORPHAN are
explicit local owner operations and no current command automatically destroys
the source record. The preservation artifact can nevertheless give false
assurance immediately before an irreversible lifecycle choice, a symlinked
ancestor can defeat the promised outside-repository boundary, and the migration
primitive can claim the original survived without observing it.

NW-AUD-014 severity is High rather than Critical: a local operator must run a
covered tool and repository code/dependencies are ordinarily trusted. The
failure is still broadly reachable and security-relevant: ambient credentials
are delivered to test/tool children with network authority, authenticated
launchers can escape the claimed resource boundary, and new call sites evade
the guard by default because completeness is defined by a manual filename list.

NW-AUD-015 severity is Medium rather than High: fail-closed lifecycle readers
prevent a stale/missing sidecar from being admitted on the next run, and the
writer paths require explicit authenticated operation. It remains material
because automatic refresh deterministically publishes such a mismatch while
reporting success, the current run can consume it without a second lifecycle
admission, and direct-capture sidecar failure can replace the previously valid
pair with no transactional rollback or recovery truth.

NW-AUD-016 severity is High rather than Critical: loopback state substitution
or stale port reuse requires local scratch/process influence and does not by
itself defeat TLS. It nevertheless invalidates the mandatory L5 prerequisite:
Chromium is configured to send credential-bearing traffic through the admitted
listener, and a permissive substitute can relay destinations that the real
Nightwatch policy would deny, including production-class targets.

NW-AUD-017 severity is High rather than Critical: the empty network namespace
still provides substantial structural isolation, and exploitation requires a
supported local L6 host plus runtime/path influence or a qualification defect
that the current probes miss. It remains High because L6 is the mandatory
authority for authenticated OOPS execution, its READY receipt explicitly
certifies fields not established by complete stimuli, and the proof is not
bound to the later executable/namespace generation.

NW-AUD-018 severity is High rather than Critical: evidence remains owner-local
and no external publication path is granted. It is nevertheless a current,
ordinary authenticated path where concrete customer/account/resource
identifiers can be persisted despite an explicit zero-identifier claim, and
several writer APIs bypass the only authenticated sanitizer by construction.

NW-AUD-019 severity is Medium rather than High: the affected stores and readers
are owner-local, and current typed producers often reduce data before the
shared tripwire. It remains material because the generic durable boundary
accepts unknown objects, the normal JSON representation defeats the claimed
labeled-value control, and the same false-negative screen is reused by stores,
production defense in depth, and Control Center readers.

NW-AUD-020 severity is High rather than Critical: host, environment, resolved-
address, exact-binding, and method controls continue to constrain traffic, so
the defect does not grant arbitrary Internet or production access by itself.
It remains High because semantic read admission is the control that separates
authorized observation from unknown product effects, and delayed or redirected
requests can deterministically outlive the timer that currently carries that
authority.

NW-AUD-021 severity is High rather than Critical: exploitation requires a
race, replacement, or misleading form inside an already approved DEV origin,
and downstream token/shell verification will usually stop the run. Those later
checks cannot retract credential disclosure, however; the ordinary automated
path retrieves a real secret and applies it through generic selectors without
binding each use to the previously approved document/form identity.

NW-AUD-022 severity is Medium rather than High: destination and address policy
still governs the allowed current request, so the ordering defect does not
expand which host may be contacted. It remains material because durable proxy
evidence is a containment invariant, every transport path begins its effect
first, and the existing regression obtains zero connections from unrelated
host denial rather than from the claimed evidence failure behavior.

NW-AUD-023 and NW-AUD-024 are High because incomplete context containment or
mixed/false-clean run evidence affects authenticated runtime authority and its
central audit record. NW-AUD-025 is High because current reproduction/admission
confidence can be elevated without independent contexts or complete evidence.
NW-AUD-026 is Medium because it fabricates exploration correctness while the
fixed read/local-only catalog and containment still constrain direct effects.
NW-AUD-027 and NW-AUD-028 are Medium: their defects are definite, but retained
production machinery remains owner-gated/local-synthetic, and relay abuse
requires local port discovery while exposing no upstream body and retaining
known-read destination semantics.

NW-AUD-029 is High because the current protocol campaign path can turn a
failed fresh reproduction into a READY durable dossier and admitted finding.
NW-AUD-030 through NW-AUD-035 are Medium with High confidence: each is a
definite evidence, quarantine, accounting, or resource-containment defect, but
ordinary reachability is constrained to owner-local artifacts, retained
compatibility APIs, mock/local production qualification, or explicitly gated
DEV browser execution. Their scopes remain separate because readiness truth,
triage schema identity, general artifact work bounds, Phase-6 owner policy,
reservation lifecycle, receipt producer authority, and body acquisition each
have a distinct enforcing boundary and negative-test matrix.

NW-AUD-036 is High with High confidence: a local checkout or filesystem
transition can cause post-inventory route bytes to be parsed under an earlier
SHA and old evidence digest, then presented to Phase 24 with an unconditional
snapshot-match claim. It is below Critical because the precondition is local
same-user/source-tree influence and the path grants no external write or
production authority. The proposal owns exact source-generation closure,
uniform verified reads, explicit real/synthetic admission, and pathname-race
resistance rather than weakening the finding to a single missing digest check.

NW-AUD-037 is High with High confidence because it defeats the permanent
sole-admission rule even when the source digest is genuine: arbitrary valid
semantic fields can ride beside that evidence and resolve as current. NW-AUD-038
is Medium with High confidence because it can fabricate or compose contained
semantic acceptance evidence, while actual DEV contact and external effects
remain separately owner-gated. The scopes are separate: NW-AUD-037 owns what
the product contract is; NW-AUD-038 owns what one evaluation/acceptance run
proved about that contract.

NW-AUD-039 through NW-AUD-041 are High with High confidence. NW-AUD-039 can
turn unknown tails or absent item fields into source-backed PASS/equivalence;
NW-AUD-040 can manufacture the mechanical source proof that enters admission;
and NW-AUD-041 can manufacture the later lifecycle evidence that presents the
contract as fully covered. External execution remains separately owner-gated,
so none is Critical. NW-AUD-042 is Medium with High confidence because its
lossy rebuild and self-certified closure corrupt owner-local gap census and
prioritization, but do not independently admit a source contract or authorize
execution.

NW-AUD-043 is Medium with High confidence: it can under-select bounded
change-directed canaries by applying an old dependency map or suppressing a
runtime rename, but campaign execution, DEV contact, and external effects
remain separately gated. Its enforcing boundary is distinct from exact source
snapshot reads and semantic analyzer proof.

## Validation ledger

| Command/evidence | Result | Purpose |
|---|---|---|
| `npm run session:status` | PASS | Owned current C-00 worktree; canonical safe |
| `npm run agent:check` | PASS with pre-existing unrelated warnings | Continuity-v2 and workspace routing |
| `openspec status --change nightwatch-exhaustive-repository-audit-proposals-v1` | 4/4 complete | Umbrella change is apply-ready |
| `openspec validate nightwatch-exhaustive-repository-audit-proposals-v1 --strict` | PASS | Umbrella schema/requirements validity |
| `git ls-files` inventory | 2,593 paths; top-level counts reconcile | Frozen coverage denominator |
| `npm run validation:universe` | PASS; 494 discovered / 257 authoritative / 237 classified / 0 unclassified | Close historical manifest-coverage lead |
| `npm run quality-gate:spec` | PASS; 12 required groups / 149 compatibility files | Confirm current gate definition |
| `npm run gate:inventory` | PASS; authoritative workflow command count 1 / 257 unique test files / 0 duplicate executions | Confirm current gate topology |
| `npm run typecheck:bin` | ENVIRONMENT UNAVAILABLE in owned worktree: no `node_modules/typescript`; no dependency install authorized | Not a product failure; static configuration and existing recorded ownership used |
| `npm run schema:check`, `npm run hardening:check`, `npm run project:check` | ENVIRONMENT UNAVAILABLE for the same absent local TypeScript toolchain | Deferred to a dependency-equipped validation checkpoint; `workspace:check` remained PASS |
| `openspec validate nightwatch-ci-action-supply-chain-integrity-v1 --strict` | PASS; 4/4 artifacts complete | NW-AUD-001 remediation is apply-ready |
| `openspec validate nightwatch-exact-runtime-toolchain-identity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-004 remediation is apply-ready |
| `openspec validate nightwatch-retention-crash-consistent-receipts-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-005 remediation is apply-ready |
| canonical-CWD `release --root <live-session> --dry-run` | REPRODUCED; planned live ownership-record replacement; zero mutation | Establish NW-AUD-006 reachability safely |
| canonical-CWD `integrate --root <live-session> --dry-run` | REPRODUCED; planned foreign session fast-forward; zero fetch/push | Establish NW-AUD-006 integration reachability safely |
| `openspec validate nightwatch-session-mutation-authority-binding-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-006 remediation is apply-ready |
| static `change:shadow` compiler/lock/test ownership inspection | SUBSTANTIATED WITHOUT EXECUTION; normal path calls `npx tsc` twice, local TypeScript absent, full process coverage help-only | Establish NW-AUD-007 while avoiding the remote-capable path |
| `openspec validate nightwatch-change-shadow-offline-runtime-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-007 remediation is apply-ready |
| static seven-writer/schema/path/publisher inspection | SUBSTANTIATED WITHOUT ARTIFACT MUTATION; six current-report writers and one topology receipt writer publish directly with no complete guard | Establish NW-AUD-009 and its exact denominator safely |
| `openspec validate nightwatch-local-report-publication-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-009 remediation is apply-ready |
| static release evaluator/Git adapter/config/test inspection | SUBSTANTIATED READ-ONLY; only stale ancestors override MET and the other relation classes are untested/unrejected | Establish NW-AUD-010 without editing release truth |
| `openspec validate nightwatch-release-evidence-lineage-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-010 remediation is apply-ready |
| static canonical apply/storage/authority/test inspection | SUBSTANTIATED WITHOUT PROMOTION; distinct approvals are not target-serialized and directory durability is best effort | Establish NW-AUD-011 safely |
| `openspec validate nightwatch-canonical-promotion-transaction-serialization-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-011 remediation is apply-ready |
| static declaration/`.env`/launcher/child-builder inspection | SUBSTANTIATED READ-ONLY; merged file values and unknowns do not govern/report the subsequent execution path consistently | Establish NW-AUD-012 safely |
| `openspec validate nightwatch-configuration-layer-authority-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-012 remediation is apply-ready |
| static schema CLI/export/migration/test inspection | SUBSTANTIATED READ-ONLY; truncation/failure accounting, ancestry, and original retention are overclaimed | Establish NW-AUD-013 safely |
| `openspec validate nightwatch-schema-preservation-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-013 remediation is apply-ready |
| static child-process import/invocation/rule census | SUBSTANTIATED READ-ONLY; 53 importing bin modules versus 18 listed files, with current ambient/bound violations outside the list | Establish NW-AUD-014 safely |
| `openspec validate nightwatch-child-process-boundary-totality-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-014 remediation is apply-ready |
| static auth direct/refresh/lifecycle/storage writer and test inspection | SUBSTANTIATED READ-ONLY; refresh has no lifecycle write and direct capture commits the two-file capability sequentially | Establish NW-AUD-015 without credentials or browser execution |
| `openspec validate nightwatch-auth-capability-bundle-transaction-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-015 remediation is apply-ready |
| static proxy runtime/server/lease/setup/gate/test inspection | SUBSTANTIATED READ-ONLY; current health is fixed-path status-only and runtime state has no exact live-instance binding | Establish NW-AUD-016 without starting a proxy or network target |
| `openspec validate nightwatch-proxy-runtime-instance-attestation-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-016 remediation is apply-ready |
| static L6 Node/browser probe, decision, launch, and test inspection | SUBSTANTIATED READ-ONLY; UDP is omitted, browser observers are untargeted, speculative stimulus is suppressed, and qualification is not carried into launch | Establish NW-AUD-017 without starting Bubblewrap, Chrome, OOPS, or a network target |
| `openspec validate nightwatch-l6-qualification-proof-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-017 remediation is apply-ready |
| static authenticated redaction/recorder/writer/caller/test inspection | SUBSTANTIATED READ-ONLY; ordinary lowercase identifiers survive, direct writer paths bypass authenticated sanitization, and late mode transition leaves directory mode unchanged | Establish NW-AUD-018 without authenticated execution |
| `openspec validate nightwatch-authenticated-evidence-minimization-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-018 remediation is apply-ready |
| static shared-screen/store/reader/test inspection plus synthetic regex evaluation | REPRODUCED LOCALLY; quoted ordinary token/password/customer object fields pass while equivalent unquoted token text is blocked | Establish NW-AUD-019 without reading or writing private data |
| `openspec validate nightwatch-private-payload-screening-structural-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-019 remediation is apply-ready |
| static semantic observer/journey timer/CDP/endpoint-spec inspection | SUBSTANTIATED READ-ONLY; passive unknown is continued, action authority closes at 250 ms before final settlement, and redirect backstop has host-only authority | Establish NW-AUD-020 without browser or product traffic |
| `openspec validate nightwatch-semantic-request-admission-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-020 remediation is apply-ready |
| static DEV auto-login/provider/form/test inspection | SUBSTANTIATED READ-ONLY; credential retrieval follows an earlier page check, while later generic fill/force-submit effects do not rebind the live document/form | Establish NW-AUD-021 without retrieving or using credentials |
| `openspec validate nightwatch-dev-credential-use-binding-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-021 remediation is apply-ready |
| static proxy event/HTTP/CONNECT/Upgrade/failure-test inspection | SUBSTANTIATED READ-ONLY; each allowed transport begins its effect before recording and the current zero-connection test is independently policy-denied | Establish NW-AUD-022 without starting proxy, resolver, or sockets |
| `openspec validate nightwatch-proxy-evidence-effect-ordering-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-022 remediation is apply-ready |
| M2 source and focused-test responsibility census | PASS; 32 primary safety/proxy/auth/OOPS/browser files, 5 cross-boundary consumers, and 55 direct/transitive test entrypoints classified | Close the M2 denominator without treating later-wave transitive tests as M2 evidence |
| static browser context/guard/observer/test inspection | SUBSTANTIATED READ-ONLY; post-creation failures lack rollback and popup guard readiness is unawaited/ungated | Establish NW-AUD-023 without launching a browser |
| `openspec validate nightwatch-browser-context-guard-transaction-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-023 remediation is apply-ready |
| static recorder/observer/evidence-test inspection | SUBSTANTIATED READ-ONLY; generation reuse, reset-on-parse-error, split views/memory, and swallowed failures confirmed | Establish NW-AUD-024 without creating a run |
| `openspec validate nightwatch-run-evidence-bundle-transaction-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-024 remediation is apply-ready |
| static replay/admission/producer/test inspection | SUBSTANTIATED READ-ONLY; run labels substitute for context proof and missing required channels can match | Establish NW-AUD-025 without replay execution |
| `openspec validate nightwatch-replay-context-provenance-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-025 remediation is apply-ready |
| static exploration catalog/runtime/engine/test inspection | SUBSTANTIATED READ-ONLY; real runtime copies expected delta into state/evidence | Establish NW-AUD-026 without exploration execution |
| `openspec validate nightwatch-exploration-observed-postcondition-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-026 remediation is apply-ready |
| static production profile/store/audit/test inspection | SUBSTANTIATED READ-ONLY; name-based deletion, overwrite/capacity race, and false-clean incomplete census confirmed | Establish NW-AUD-027 without owner-store mutation |
| `openspec validate nightwatch-production-persistence-lifecycle-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-027 remediation is apply-ready |
| static Phase-5 relay/generator/caller/test inspection | SUBSTANTIATED READ-ONLY; public operation ID grants repeatable unbudgeted loopback invocation and map overwrite loses cardinality | Establish NW-AUD-028 without starting a relay |
| `openspec validate nightwatch-phase5-relay-invocation-authority-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-028 remediation is apply-ready |
| M3 source and focused-test responsibility census | PASS; 154 primary files and 118 direct/transitive test entrypoints frozen | Bound the remaining M3 work without claiming it complete |
| static protocol dossier/pipeline/campaign/confidence inspection | SUBSTANTIATED READ-ONLY; failed replay/minimization can still persist and promote READY, and channel agreement inflates context count | Establish NW-AUD-029 without campaign execution |
| `openspec validate nightwatch-protocol-dossier-readiness-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-029 remediation is apply-ready |
| static replay-plan/envelope/minimality/semantic-receipt inspection | SUBSTANTIATED READ-ONLY; cross-layer ordinal domain, digest binding, primitive typing, and outcome coherence drift confirmed | Establish NW-AUD-030 without replay execution |
| `openspec validate nightwatch-triage-evidence-contract-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-030 remediation is apply-ready |
| static artifact/DTO facade and leaf-validator inspection | SUBSTANTIATED READ-ONLY; unbounded collections/recursive work and raw leaf error propagation confirmed | Establish NW-AUD-031 without opening private artifacts |
| `openspec validate nightwatch-durable-artifact-validation-bounds-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-031 remediation is apply-ready |
| static Phase-6 adapter/gate/validator/budget/caller inspection | SUBSTANTIATED READ-ONLY; arbitrary invoker and structural plan marker bypass default-invoker policy while permit settlement lacks identity | Establish NW-AUD-032 without data-plane contact |
| `openspec validate nightwatch-phase6-owner-scope-quarantine-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-032 remediation is apply-ready |
| static production budget/gate inspection | SUBSTANTIATED READ-ONLY; post-reservation denial leaks concurrency and settlement accepts unrelated/replayed values | Establish NW-AUD-033 without observer execution |
| `openspec validate nightwatch-production-budget-reservation-lifecycle-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-033 remediation is apply-ready |
| static PQ/P1 config, sealer, parser, gate, and consumer inspection | SUBSTANTIATED READ-ONLY; current chain/config identities and producer authority are incomplete | Establish NW-AUD-034 without rehearsal or environment contact |
| `openspec validate nightwatch-production-observation-receipt-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-034 remediation is apply-ready |
| static browser response acquisition and teardown inspection | SUBSTANTIATED READ-ONLY; full buffering precedes size check and wait-only timeout leaves losing work unowned | Establish NW-AUD-035 without browser launch |
| `openspec validate nightwatch-browser-response-acquisition-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-035 remediation is apply-ready |
| M3 terminal responsibility reconciliation | PASS; all 154 source files and 118 test entrypoints map to a material owner, duplicate owner, or terminal rationale | Close M3 and advance to source/semantic M4 |
| static sibling boundary/inventory/call-scoped/discovery/cache/Phase-24 caller inspection | SUBSTANTIATED READ-ONLY; HEAD interval is unclosed, mismatched route bytes remain analyzable, snapshot match is constant, and parent path identity is not held | Establish NW-AUD-036 without sibling repository access |
| `openspec validate nightwatch-source-snapshot-transaction-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-036 remediation is apply-ready |
| static derivation/proof/resolver/collection/harness inspection | SUBSTANTIATED READ-ONLY; genuine extraction evidence is not bound to complete expectation semantics and structural records remain forgeable | Establish NW-AUD-037 without source access or semantic execution |
| `openspec validate nightwatch-real-source-expectation-authority-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-037 remediation is apply-ready |
| static receipt/hook/DTO/artifact/summary/acceptance inspection | SUBSTANTIATED READ-ONLY; parser strengths split, contained class is caller-selected, coherence is partial, and summaries compose unvalidated receipts | Establish NW-AUD-038 without artifact mutation or DEV contact |
| `openspec validate nightwatch-semantic-receipt-acceptance-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-038 remediation is apply-ready |
| static projection/invariant/relational/differential/metamorphic inspection | SUBSTANTIATED READ-ONLY; per-item non-applicability and truncated trees/prefixes can become decisive success | Establish NW-AUD-039 without semantic execution |
| `openspec validate nightwatch-semantic-partial-observation-soundness-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-039 remediation is apply-ready |
| static source-analyzer/discovery/cache/test inspection | SUBSTANTIATED READ-ONLY; raw lexical matches, unbound behavior flow, schema repair, and silent output slicing confirmed | Establish NW-AUD-040 without source access |
| `openspec validate nightwatch-semantic-source-analyzer-proof-soundness-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-040 remediation is apply-ready |
| static semantic coverage graph/campaign/mutation/lifecycle/quality inspection | SUBSTANTIATED READ-ONLY; caller assertions and missing evidence can self-certify lifecycle coverage | Establish NW-AUD-041 without campaign execution |
| `openspec validate nightwatch-semantic-coverage-evidence-authority-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-041 remediation is apply-ready |
| static graph/closure-ledger/quality inspection | SUBSTANTIATED READ-ONLY; forged closure, new-gap omission, lossy joins, count divergence, and duplicate-surface inflation confirmed | Establish NW-AUD-042 without ledger mutation |
| `openspec validate nightwatch-semantic-gap-ledger-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-042 remediation is apply-ready |
| static change-intelligence collector/map/selector/real-caller/test inspection | SUBSTANTIATED READ-ONLY; actual baselines/heads are absent from map staleness, ChangeSets are structurally trusted, and either rename endpoint can suppress runtime impact | Establish NW-AUD-043 without sibling or campaign access |
| `openspec validate nightwatch-change-intelligence-source-generation-integrity-v1 --strict` | PASS; 4/4 artifact classes complete | NW-AUD-043 remediation is apply-ready |

## Completion audit

Not yet eligible. M1 through M4 are complete, while later campaign, UI, and
validation waves remain pending. Forty material findings currently map
one-to-one to forty strict-valid issue-specific remediation
changes; that partial portfolio is not evidence of whole-repository completeness.
