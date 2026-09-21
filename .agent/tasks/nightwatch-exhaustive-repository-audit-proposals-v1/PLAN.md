# Exhaustive repository audit and OpenSpec proposals

## Purpose

Build a complete, prioritized, implementation-ready OpenSpec remediation portfolio from a whole-repository audit without implementing any fix.

## Starting State

- Task ID: `nightwatch-exhaustive-repository-audit-proposals-v1`
- Starting Nightwatch SHA: `34517c9ba11c97407168fe5879ee03794dfff3e3`
- Session branch: `session/nightwatch-exhaustive-repository-ef157f7a`
- Relevant architecture: local TypeScript/Playwright safety and bug-hunting framework with fail-closed environment, containment, evidence, semantic-oracle, autonomous-runtime, and control-center layers.
- Dependencies: current repository source/tests/docs, existing OpenSpec inventory, local deterministic validation commands.
- Established facts that must not be rediscovered: owner scope is frozen; real Alphaus/data/cloud execution is excluded; W12 is terminal; the W13 worktree belongs to another session.

## Scope

All tracked Nightwatch source, tests, tooling, configuration, package/dependency surfaces, task/continuity machinery, OpenSpec artifacts, and durable documentation. Write scope is limited to this task's continuity records and OpenSpec planning artifacts.

## Non-Goals

No product implementation, dependency installation or upgrade, real-environment execution, sibling-repository audit, external publishing, or mutation of existing task/proposal ownership surfaces.

## Safety Constraints

LOCAL / SYNTHETIC / READ-ONLY inspection only. C-00 remains mandatory. No credentials, customer data, authenticated evidence, network product traffic, data-plane access, cloud operations, or sibling writes.

## Architecture / Approach

Use a coverage matrix rather than ad hoc browsing. Inventory the tree and dependency/test topology, inspect each subsystem, run narrow deterministic checks for candidate findings, deduplicate against existing proposals, rank by exploitability/impact/likelihood/reachability, and create one OpenSpec change per coherent remediation boundary. Maintain an audit ledger that proves both positive findings and inspected areas with no material issue.

## Milestones

### M0 — Governed activation and coverage model

- Objective: establish C-00 ownership, continuity, required durable context, OpenSpec inventory, and a complete audit taxonomy.
- Acceptance criteria: session passes; task routing is coherent; repository areas and evidence standards are enumerated; umbrella change exists.
- Validation commands: `npm run session:status`, `npm run agent:check`, `openspec status --change nightwatch-exhaustive-repository-audit-proposals-v1 --json`
- Status: COMPLETE

### M1 — Repository topology, dependencies, configuration, and build/tooling

- Objective: inspect manifests, configs, generators, scripts, CLI/bin code, dependency posture, build/typecheck/lint/test wiring, and release/checkpoint mechanics.
- Acceptance criteria: every surface is covered; candidate issues have decisive evidence and existing-plan cross-references.
- Validation commands: focused static searches and relevant read-only validation commands.
- Status: COMPLETE

### M2 — Core safety, environment, policy, proxy, process/network containment, and authentication

- Objective: audit fail-closed policy boundaries and bypass/error/lifecycle cases.
- Acceptance criteria: trust boundaries, resource cleanup, normalization, race, denial, redaction, and negative-test coverage are assessed.
- Validation commands: focused existing unit/smoke suites only.
- Status: COMPLETE

### M3 — Browser, API, journeys, evidence, persistence, and replay

- Objective: audit browser containment, observers, direct/API paths, artifact recording, storage, replay, minimization, and privacy behavior.
- Acceptance criteria: every ingress/egress and persisted representation has an evidence-backed disposition.
- Validation commands: focused browser/unit suites only where decisive.
- Status: COMPLETE

### M4 — Source intelligence, semantic oracles, expectations, and contract lifecycle

- Objective: audit source confinement/currentness, extraction/admission, projections, invariants, receipts, schema lifecycle, and stale/unavailable behavior.
- Acceptance criteria: soundness, completeness, privacy, determinism, and fail-closed behavior are assessed with boundary tests.
- Validation commands: focused semantic/source suites only.
- Status: IN_PROGRESS

### M5 — Campaign, autonomous runtime, investigation, reproduction, admission, and findings

- Objective: audit scheduling, budgets, checkpoint/resume, tool authority, provider handling, reproduction, novelty, triage, and local persistence.
- Acceptance criteria: state machines, partial failure, idempotency, concurrency, evidence provenance, and anti-fabrication guarantees are assessed.
- Validation commands: focused campaign/runtime suites only.
- Status: NOT_STARTED

### M6 — Control Center and reviewer/operator surfaces

- Objective: audit server/API/UI contracts, accessibility, security headers, write authority, state freshness, scale behavior, and user-facing truthfulness.
- Acceptance criteria: server and browser paths, contracts, error states, and missing end-to-end validation are covered.
- Validation commands: focused control-center and browser tests only.
- Status: NOT_STARTED

### M7 — Continuity, workspace isolation, validation framework, tests, and documentation truth

- Objective: audit task state machines, worktree/session lifecycle, hardening gates, validators, fixtures, test quality, documentation drift, and operational reliability.
- Acceptance criteria: false-positive/false-negative and vacuity risks are assessed; missing negative/mutation/concurrency coverage is recorded.
- Validation commands: focused agent/workspace/hardening/project/OpenSpec checks.
- Status: NOT_STARTED

### M8 — Finding adjudication, severity ranking, and proposal partitioning

- Objective: reproduce or decisively substantiate candidates, deduplicate existing work, and partition material issues into coherent OpenSpec changes.
- Acceptance criteria: every candidate has evidence, severity, impact, disposition, and proposal mapping.
- Validation commands: artifact consistency checks and focused reproductions.
- Status: NOT_STARTED

### M9 — Generate all apply-ready OpenSpec changes

- Objective: create proposal, design, delta specs, and tasks for every material unresolved issue.
- Acceptance criteria: all required artifacts exist, dependencies were read, requirements have scenarios, tasks are actionable, and strict validation passes.
- Validation commands: `openspec validate <change> --strict` for every created change.
- Status: NOT_STARTED

### M10 — Completeness audit and planning checkpoint

- Objective: prove the original exhaustive objective is satisfied and no implementation file changed.
- Acceptance criteria: coverage matrix is complete; every material issue maps to a validated proposal; residual uncertainties are explicit; diff is planning-only; required checks pass.
- Validation commands: `git diff --check`, `npm run agent:check`, `npm run workspace:check`, strict OpenSpec validation, planning-only diff/privacy inspection.
- Status: NOT_STARTED

## Validation Strategy

Prefer the narrowest decisive existing tests during exploration. Validate each OpenSpec change strictly after generation. At closure, run continuity/workspace/project/hardening checks relevant to planning artifacts, inspect the entire diff and privacy surface, prove no product code changed, and follow C-00 integration policy.

## Decision Log

- 2026-09-19 — Decision: use a dedicated umbrella audit campaign and separate remediation changes; reason: exhaustive coverage needs one ledger while implementation scopes need independent ownership and acceptance criteria; evidence: original objective plus existing multi-change OpenSpec topology; consequence: no monolithic catch-all implementation plan.
- 2026-09-19 — Decision: prohibit sibling-repository exploration; reason: the objective names this codebase and AGENTS forbids broad Alphaus rediscovery; consequence: all findings derive from Nightwatch repository evidence.
- 2026-09-19 — Decision: partition mutable CI action identity into its own remediation change; reason: the action refs execute before the repository-owned gate and the current substring allowlist has an independent supply-chain trust boundary; evidence: NW-AUD-001; consequence: `nightwatch-ci-action-supply-chain-integrity-v1` extends the existing exact-head CI capability without changing implementation.
- 2026-09-20 — Decision: partition exact runtime-toolchain identity into its own remediation change; reason: immutable setup-action code does not bind the Node/npm executable it selects, and the clean gate has a separate unlocked `node@20` bootstrap plus receipt-parity gap; evidence: NW-AUD-004; consequence: `nightwatch-exact-runtime-toolchain-identity-v1` introduces the toolchain-integrity capability and strengthens reproducibility without implementing it.
- 2026-09-20 — Decision: partition evidence-retention transaction auditability into its own remediation change; reason: irreversible deletion occurs between a nonterminal empty receipt and a best-effort final overwrite, so crashes and final-write failures can destroy or misreport required audit truth; evidence: NW-AUD-005; consequence: `nightwatch-retention-crash-consistent-receipts-v1` specifies append-only prepared/outcome/terminal records, exclusive apply, honest recovery, and non-success without terminal truth.
- 2026-09-20 — Decision: partition C-00 session mutation authority into its own remediation change; reason: arbitrary-root mutators authorize the selected record rather than the invoking checkout, reaching both live-owner release and foreign integration; evidence: NW-AUD-006 and zero-mutation canonical-to-session dry runs; consequence: `nightwatch-session-mutation-authority-binding-v1` strengthens the published concurrency/workspace capability without claiming hostile same-user isolation.
- 2026-09-20 — Decision: partition change-shadow offline compiler bootstrap into its own remediation change; reason: the intentionally separate full-program compiler path invokes remote-capable `npx` and mutates a fixed derivative root before compiler admission, while completed loader and certification changes do not own arbitrary developer-command bootstrap; evidence: NW-AUD-007; consequence: `nightwatch-change-shadow-offline-runtime-integrity-v1` strengthens source-analysis runtime hardening without duplicating generic CLI contracts.
- 2026-09-20 — Decision: partition local ignored-report publication integrity into its own remediation change; reason: seven report/receipt writers share unsafe direct publication but require two distinct replacement authorities, and neither retention journals nor generic CLI contracts own this boundary; evidence: NW-AUD-009; consequence: `nightwatch-local-report-publication-integrity-v1` introduces a complete writer inventory, atomic current replacement, immutable topology receipts, and non-vacuous bypass enforcement without implementation.
- 2026-09-20 — Decision: partition release evidence lineage into its own remediation change; reason: the central release evaluator accepts raw MET with absent, future, divergent, or unresolved evidence because only strict ancestors are rejected; evidence: NW-AUD-010; consequence: `nightwatch-release-evidence-lineage-integrity-v1` requires exact checkpoint equality and categorical Git resolution without advancing the project verdict.
- 2026-09-20 — Decision: partition canonical promotion transaction integrity into its own remediation change; reason: one shared canonical source target is protected only by per-approval consumption, allowing distinct approvals to race, and interruption/directory durability are not terminally coupled; evidence: NW-AUD-011; consequence: `nightwatch-canonical-promotion-transaction-serialization-v1` specifies repository-target serialization and crash-honest transaction truth while preserving zero standing authority.
- 2026-09-20 — Decision: partition configuration-layer authority integrity into its own remediation change; reason: `.env` values are merged for validation/rendering but launchers execute from ambient `process.env`, while unknown file-only names are filtered before reporting; evidence: NW-AUD-012; consequence: `nightwatch-configuration-layer-authority-integrity-v1` specifies strict admission and one execution/provenance snapshot.
- 2026-09-20 — Decision: partition schema preservation integrity into its own remediation change; reason: export pre-slicing and swallowed read failures overstate completeness, ancestry checks can be redirected, and migration retention is asserted without observing the original; evidence: NW-AUD-013; consequence: `nightwatch-schema-preservation-integrity-v1` specifies truthful preservation and identity-qualified non-destructive migration.
- 2026-09-20 — Decision: partition child-process boundary totality into its own remediation change; reason: the rule's 18-file list is not a total authority census and unlisted callers pass ambient credentials or omit bounds; evidence: NW-AUD-014; consequence: `nightwatch-child-process-boundary-totality-v1` specifies AST-total classification and closed execution profiles.
- 2026-09-20 — Decision: partition authentication capability bundle integrity into its own remediation change; reason: DEV refresh omits the lifecycle sidecar and direct capture publishes the two-member capability sequentially, so correct fail-closed readers cannot make writer success crash-consistent; evidence: NW-AUD-015; consequence: `nightwatch-auth-capability-bundle-transaction-integrity-v1` specifies total writer coverage, immutable generations, recovery, and final consumer binding.
- 2026-09-20 — Decision: partition proxy runtime instance attestation into its own remediation change; reason: static state identities plus constant status-only health do not prove that the listener is the live policy-enforcing server; evidence: NW-AUD-016; consequence: `nightwatch-proxy-runtime-instance-attestation-v1` specifies lease/process/state/event coherence, active challenge, revocation, and consumer binding.
- 2026-09-20 — Decision: partition L6 qualification proof integrity into its own remediation change; reason: UDP and browser speculative-network claims are marked PROVEN from omitted or unexercised evidence and the constant capability is not bound to the later runtime; evidence: NW-AUD-017; consequence: `nightwatch-l6-qualification-proof-integrity-v1` specifies witnessed positive-controlled probes, exact qualification-to-use identity, and non-fabricable READY authority.
- 2026-09-20 — Decision: partition authenticated evidence minimization into its own remediation change; reason: route-word heuristics preserve ordinary identifiers and multiple authenticated artifact writers bypass the recorder sanitizer; evidence: NW-AUD-018; consequence: `nightwatch-authenticated-evidence-minimization-integrity-v1` specifies proven route templates, closed DTOs, total writer discovery, and one final firewall.
- 2026-09-20 — Decision: partition private-payload structural screening into its own remediation change; reason: applying the labeled-value regex to JSON serialization misses normal quoted keys across shared stores/readers; evidence: NW-AUD-019 and a deterministic synthetic probe; consequence: `nightwatch-private-payload-screening-structural-integrity-v1` specifies schema-aware safe DTO admission and total reader/writer validation.
- 2026-09-20 — Decision: partition semantic request admission into its own remediation change; reason: unknown traffic is continued outside action authority, a fixed 250 ms timer loses delayed causality before settlement, and redirect enforcement has only host authority; evidence: NW-AUD-020; consequence: `nightwatch-semantic-request-admission-integrity-v1` requires source-proven pre-effect reads, finite initialization exceptions, causal generations, and transport-total enforcement.
- 2026-09-20 — Decision: partition DEV credential use binding into its own remediation change; reason: a previously approved page/control observation does not bind the later generic secret fill and force-submit effects to the same live document/form; evidence: NW-AUD-021; consequence: `nightwatch-dev-credential-use-binding-v1` specifies short-lived document/form capability, per-effect revalidation, and disclosure-safe race handling.
- 2026-09-20 — Decision: partition proxy evidence-effect ordering into its own remediation change; reason: all allowed transport handlers begin the current effect before awaiting evidence and the existing zero-connection test is policy-denied independently; evidence: NW-AUD-022; consequence: `nightwatch-proxy-evidence-effect-ordering-v1` requires a durable preparation barrier and honest incomplete outcomes without duplicating instance attestation.
- 2026-09-20 — Decision: close M2 after reconciling 32 primary boundary files, 5 cross-boundary consumers, and 55 direct/transitive focused-test entrypoints; reason: every residual lead now has a material proposal, terminal non-material/not-an-issue rationale, or explicit M3 owner; consequence: browser lifecycle/persistence/replay work advances under M3 without reopening settled host/auth/L6 scope.
- 2026-09-21 — Decision: freeze M3 at 154 primary source files and 118 direct/transitive focused-test entrypoints; reason: the wave crosses browser/API/product/data plus evidence/exploration/journey/triage/production-local responsibility splits; consequence: first-tranche proposals do not overclaim M3 completion and the remaining rows are explicit.
- 2026-09-21 — Decision: admit NW-AUD-023 through NW-AUD-028 as six distinct remediation scopes; reason: atomic context readiness, run-bundle transaction truth, replay context provenance, observed exploration postconditions, production-local persistence lifecycle, and relay caller authority have different trust boundaries and tests; consequence: each now has one strict-valid change without merging payload/privacy or L6 concerns.
- 2026-09-21 — Decision: admit NW-AUD-029 through NW-AUD-035 as seven distinct remediation scopes; reason: protocol readiness, cross-schema triage identity, total artifact validation, Phase-6 owner quarantine, production reservation lifecycle, qualification/P1 producer evidence, and response acquisition enforce different invariants; consequence: each has a strict-valid planning change and no product implementation.
- 2026-09-21 — Decision: close M3 after reconciling all 154 primary source files and 118 direct/transitive focused-test entrypoints; reason: every residual lead maps to one of thirteen M3 proposals, a prior owner, or a terminal current-reachability rationale; consequence: M4 begins without silently carrying browser/API/evidence/replay work forward.
- 2026-09-21 — Decision: freeze M4 at 139 primary source files and 162 direct/transitive focused-test entrypoints; reason: source intelligence, expectations/projections/invariants/semantic evaluation, acceptance/coverage, phase-specific currentness, and change-intelligence consumers form the complete semantic/source responsibility cone; consequence: protocol oracles stay closed under M3 and campaign-intelligence runtime behavior remains M5.
- 2026-09-21 — Decision: admit NW-AUD-036 as a distinct source snapshot transaction scope; reason: unclosed repository identity, analyzable digest mismatch, unguarded route parsing, constant Phase 24 match, and pathname TOCTOU jointly undermine exact current-source authority; consequence: `nightwatch-source-snapshot-transaction-integrity-v1` specifies one closed transaction without contacting sibling repositories.
- 2026-09-21 — Decision: admit NW-AUD-037 and NW-AUD-038 as distinct semantic authority scopes; reason: canonical expectation semantics can be changed beside genuine source evidence, while evaluation/acceptance receipts have separate producer, parsing, and set-coherence gaps; consequence: real-source contract authority and contained acceptance evidence each receive one strict-valid proposal.
- 2026-09-21 — Decision: absorb the campaign mapper's target-as-expectation alias into NW-AUD-037; reason: the defect is another canonical recipe/target/expectation identity split, not a new root cause; consequence: the existing change now explicitly owns campaign mapping and bundle coherence.
- 2026-09-21 — Decision: admit NW-AUD-039 through NW-AUD-042 as four distinct remediation scopes; reason: partial-observation semantics, source-analyzer proof, lifecycle evidence authority, and ledger census/closure are enforced at different layers and have independent negative-test matrices; consequence: each now has one strict-valid planning change without implementation.

## Discoveries

- Current topology permits this seventh registered worktree under the eight-worktree bound.
- The pre-existing W13 live session remains separate and is not reused.
- Validation-universe completeness is current (494 = 257 authoritative + 237 classified, zero unclassified); the historical R-12 manifest gap is not a new finding.
- `bin/**` strict typecheck remains reporting-only, but production-completion tasks 15.7/15.11 already own that exact gap.
- The authoritative workflow's two mutable action tags and substring allowlist form the first non-duplicate material finding (NW-AUD-001).
- CI and clean certification bind only Node major 20; the clean wrapper can execute unlocked `node@20` before validation and receipts omit exact Node/npm identity. This is the second non-duplicate material finding (NW-AUD-004).
- Evidence retention records an empty `STARTED` receipt, deletes all candidates,
  and only then best-effort overwrites the receipt; finalization failure leaves
  an `APPLIED`/`PARTIAL` result and zero exit, while interruption can erase
  per-target truth. This is the third non-duplicate material finding
  (NW-AUD-005).
- C-00 mutators accept any selected `--root`; canonical-to-live-session dry
  runs reached both ownership-record replacement and a ready fast-forward
  integration plan. Current target classification does not bind caller intent.
  This is the fourth non-duplicate material finding (NW-AUD-006).
- The offline `change:shadow` path invokes `npx tsc` twice after mutating one
  fixed compile directory; local TypeScript is absent in this worktree and its
  only process test uses the pre-compile help path. This is the fifth
  non-duplicate material finding (NW-AUD-007). Generic argument/path output
  defects on the same command are duplicate NW-AUD-008.
- Seven ignored `artifacts/**` report/receipt writers publish through direct
  directory creation and file writes; current reports can follow links or lose
  the preceding complete generation, while timestamp-only gate-topology
  receipts can overwrite history. This is the sixth non-duplicate material
  finding (NW-AUD-009).
- Release-condition evidence binding rejects only strict ancestors; null,
  later `HEAD`, missing, future, and divergent identities can retain raw MET,
  and the Git adapter collapses negative ancestry with operational failure.
  This is the seventh non-duplicate material finding (NW-AUD-010).
- Canonical promotion serializes repeated use of one approval but not distinct
  approvals against one shared catalog preimage; its write also treats parent
  directory sync as best effort and can separate consumption/write/receipt
  truth on interruption. This is NW-AUD-011.
- `.env` participates in validation and the config view but not the later
  launcher reads/child projection; file-only unknown names are silently lost.
  This is NW-AUD-012.
- Schema export can omit records while claiming untruncated preservation, its
  destination ancestry is under-checked, and migration retention is not
  mechanically observed. This is NW-AUD-013.
- The child-process rule enumerates 18 files rather than all invocation nodes;
  current unlisted launchers spread/inherit ambient environments and omit
  resource/offline controls. This is NW-AUD-014.
- Automatic DEV refresh replaces storage state without a lifecycle record, and
  direct capture cannot atomically publish its separately named state/sidecar
  files. This is NW-AUD-015.
- Proxy health accepts any loopback 204 response against mutable self-asserted
  state and carries no exact live-instance identity. This is NW-AUD-016.
- L6 qualification omits the UDP result from its denial decision, observes
  browser listeners the browser never targets, suppresses the speculative
  hostname in resolver flags, and discards qualification identity before the
  authenticated launch. This is NW-AUD-017.
- Authenticated URL minimization preserves ordinary lowercase resource IDs and
  recorder snapshot/summary/constructor paths bypass its authenticated data
  sanitizer. This is NW-AUD-018.
- The canonical private-payload screen blocks unquoted labeled text but accepts
  the same ordinary values under normal JSON-quoted token/password/customer
  keys. This is NW-AUD-019.
- Unknown API traffic can be continued as passive after action authority closes,
  and same-host redirect enforcement has no semantic proof. This is NW-AUD-020.
- DEV auto-login retrieves credentials after an approved-page check but later
  fills and force-submits generic controls without rebinding the live document
  and form. This is NW-AUD-021.
- The outer proxy starts allowed HTTP, CONNECT, and Upgrade effects before the
  awaited evidence append; the current failure test proves host denial instead
  of evidence ordering. This is NW-AUD-022.
- Residual L6 control/timer and provider-file races did not establish a distinct
  authority escape under the owner-only/same-user threat model; browser context
  partial-start cleanup remains explicitly owned by M3.
- Context construction has no post-creation rollback transaction and new-page
  Fetch guards are not awaited or used as an admission barrier. This is
  NW-AUD-023.
- Run evidence can mix generations, reset corrupt identity, split durable views
  from process memory, and lose observer failures without forcing non-clean
  truth. This is NW-AUD-024.
- Replay admission trusts run labels rather than attested context generations,
  and comparison treats simultaneous absence of current proof channels as
  equality. This is NW-AUD-025.
- The real exploration adapter copies its expected structural delta into its
  purported observation, making postcondition verification tautological. This
  is NW-AUD-026.
- Retained production-local profile cleanup uses a name as deletion authority,
  findings can overwrite/race capacity, and an incomplete persistence census
  can certify clean. This is NW-AUD-027.
- The Phase-5 relay uses public operation identity as caller authority, has no
  listener-wide invocation budget, and overwrites repeated observation truth.
  This is NW-AUD-028.
- Protocol-only triage can persist and promote a failed replay as READY, and
  channel agreement is mislabeled as fresh-context reproduction. This is
  NW-AUD-029.
- Replay/minimality/semantic evidence validators disagree on representable
  identity domains and accept unbound or contradictory current records. This
  is NW-AUD-030.
- Durable artifact validators are structurally strict but not resource-total,
  and the facade can return raw leaf error messages. This is NW-AUD-031.
- Retained Phase-6 adapters can bypass the permanent owner gate through an
  injected invoker and forged structural plan marker. This is NW-AUD-032.
- Production budget reservation and settlement do not form an authenticated,
  conserved lifecycle. This is NW-AUD-033.
- Qualification and P1 receipt digests do not prove producer execution or all
  current chain/configuration coherence. This is NW-AUD-034.
- Browser response bodies are fully allocated before size refusal and timeout
  does not cancel/join the losing acquisition. This is NW-AUD-035.
- Source inventory and discovery do not close one exact repository/file
  generation: changed route bytes can be parsed under an earlier SHA, candidate
  snapshot match is asserted, and parent identity is not held across path use.
  This is NW-AUD-036.
- Genuine extraction evidence is not bound to the complete expectation output;
  shape-only proof, structural collection records, and resolver digest-only
  recheck permit modified semantics to resolve. This is NW-AUD-037.
- Semantic receipt parsing and contained evidence issuance are split, and
  Phase 9B can compose identity and decisiveness across unvalidated receipts.
  This is NW-AUD-038.
- Missing item paths and truncated projection prefixes can become decisive
  semantic PASS/equivalence outcomes. This is NW-AUD-039.
- TS/JS and Go analyzers can manufacture mechanical proof from raw-text decoys,
  unrelated operations, or the wrong declaration, while overflow is silently
  sliced. This is NW-AUD-040.
- Coverage and lifecycle stages trust caller booleans/structural DTOs, and
  missing synthetic lifecycle evidence self-certifies replay, minimization,
  and confidence. This is NW-AUD-041.
- Gap rebuild can omit new current gaps, self-certify closure, collide records,
  publish inconsistent totals, and inflate surfaces. This is NW-AUD-042.
- Residual M3 compatibility fingerprint, P1 strong-Set/synchronous-poll,
  download-ordering, recorder-error, and Phase-6 transform leads are terminally
  non-material or duplicate under the current local/mock/owner-gated reachability.

## Deferred Work

- Implementation of every generated proposal.
- Any uncertainty requiring real Alphaus, authenticated, data-plane, or cloud evidence.

## Completion Criteria

The task is complete only when every tracked repository area has an evidence-backed audit disposition, every material unresolved issue has an apply-ready strictly validated OpenSpec change, all findings are severity-ranked and deduplicated, no product implementation changed, and the final continuity/report artifacts truthfully prove the coverage and proposal mapping.
