# Task State

## Identity

Task ID: nightwatch-priority-audit-remediation-sequence-v1
Phase: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
Status: IN_PROGRESS
Starting SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
Last validated implementation SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
Last substantive checkpoint SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-priority-audit-remedi-0e17af9c
Last checkpoint: 2026-09-23 — M5 NW-AUD-020 IN PROGRESS. Reproduction
baseline committed at `8f346136` (four defect classes A-D pinned green
against live source); M5 pure authority core committed at `e25d72e1`
(semanticAdmission + causalGenerations + bootstrapExemptions; three schema
families declared; authority tests 8/8 incl. 249/250/251 timing-
independence, cross-generation confusion, transport DISAGREEMENT, bootstrap
budgets; baseline 4/4; typecheck/schema/hardening PASS; universe PASS).
M4 remains the validated substantive anchor at `5e2a0357`
(gate:milestone receipt) until M5's milestone gates run. Remaining M5:
wire L1/L0/L2 (+L5 where bounded) to the authority, engine/exploration\causality to generations, fixture bootstrap exemptions, transport census +
hardening probes, adversarial matrix smokes with zero-upstream proof,
gates, OpenSpec reconciliation, checkpoint.

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
LAST_VALIDATED_IMPLEMENTATION_SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1_STATUS: IN_PROGRESS

## Objective

Implement, validate, and integrate five owner-authorized audit remediations in
fixed serial order (NW-AUD-010 -> 014 -> 019 -> 018 -> 020) inside one C-00
session, each with live reproduction, focused regression, adversarial/mutation
proof, honest OpenSpec/task truth, and a coherent committed checkpoint, then
run one final full certification and close the campaign without starting any
further audit work.

## Current Milestone

Milestone ID: M5 — Phase 5: NW-AUD-020 semantic request admission
Milestone status: IN_PROGRESS
What is being attempted: re-verify passive-observation allowance, timer-
based action-intent expiry, navigation-as-ambient-authority, and host-only
redirect fallback against live source with focused failing regressions;
then implement the immutable semantic admission handle, deterministic
action/navigation generations, finite explicit bootstrap exemptions, and
transport-total (Playwright/CDP/WebSocket/relay/L5) enforcement with
zero-upstream refusal proof on synthetic fixtures only.

## Completed Milestones

- Phase-0 live-starting-context verification: COMPLETE. `session:status`
  PASS; `HEAD == origin/main == 4a3df8cd`; all native checks PASS; all six
  relevant OpenSpec changes strict-valid; five defects re-verified live;
  NW-AUD-006 inspected as the implementation-campaign precedent.
- C-00 session start + claim: COMPLETE. Worktree
  `nightwatch-priority-audit-remedi-0e17af9c`, branch
  `session/nightwatch-priority-audit-remedi-0e17af9c`, session
  `sess-c9a1701b8a56`, base `4a3df8cd`, class OWNED_SESSION.
- Parallel read-only censuses for NW-AUD-014/019/018/020: LAUNCHED (four
  background explore subagents); results feed Phases 2-5 and do not gate
  Phase 1.

## Work In Progress

M5 wiring phase: connecting the pure authority (`e25d72e1`) to the live
transport layers and causality seams. No observer/engine/fetchGuard edits
committed yet; the reproduction baseline (`8f346136`) still pins the
defective behavior and must be INVERTED by this wiring.

## Exact Next Action

Wire M5 in this order, running the focused suites after each step:
1. **networkObserver L1** (`handleRoute`, after the host `allow` decision
   and before the KNOWN_MUTATION/ACTION_CAUSED branches): build the frozen
   AdmissionSnapshot (environment + bindings derived from the same
   `endpointMatcher` results with journey sourceProof/currentness +
   GenerationRegistry view + BootstrapExemptionTable + current navigation
   generation) and call `evaluateAdmission`; admitted => continue (record
   handle identity in event data); refused => `route.abort` + categorical
   refusal receipt. REPLACE the PASSIVE ternary: remove
   `'PASSIVE_UNKNOWN_OBSERVED'` allowance (non-API hosts/static assets keep
   host-policy continuation — the isApiHost gate decides applicability).
   Back the observer's `journeyIntent` bookkeeping with GenerationRegistry
   open/attribute (keep the overlap-throw singleton policy):
   `beginJourneyIntent` opens an ACTION generation; add a settlement-driven
   close (endJourneyIntent becomes pacing-only or is superseded).
   Invert baseline pins A+C in `tests/unit/semanticRequestAdmission.test.ts`.
2. **Causality**: engine — keep `sleep(ACTION_SETTLE_MS)` as UI pacing only;
   move the authority close to AFTER waitForRequiredNetwork + structural
   checks so the observation-settle barrier is covered; exploration —
   settle-driven close without weakening its stronger hold. Invert pin B.
3. **Bootstrap exemptions**: register fixture startup reads explicitly —
   fixtureServer BASE_FETCHES (`/api/invoices`, `/api/billing-groups`,
   `/api/stream`) and journeyFixtureServer `/m/ripple/passive-bootstrap` —
   GET, exact origins, nav-generation-scoped, bounded; `action-unknown`
   stays REFUSED. Exemptions travel via createNetworkObserver opts (closed
   list supplied by tests/journeys).
4. **L0 fetchGuard**: pass `method` from the CDP payload; for isApiHost
   URLs recompute `evaluateAdmission` from the SAME snapshot provider
   injected at install (context.ts); allow => continueRequest, else
   failRequest BEFORE network. Invert pin D.
5. **L2 WebSocket**: handleWebSocket requires admission (WS-class rules or
   explicit registered WS exemptions); update safety-ws smoke
   expectations; prove refusal opens zero fixture connections.
6. **L5 proxy** (bounded): independent recompute for API-host HTTP requests
   from the same registry snapshot where deployment allows; CONNECT stays
   host-authority with documented browser-side pre-effect gating + honest
   evidence (design acknowledges the control-association limit).
7. **Relay**: inject the same admission decision for API targets in dev
   mode.
8. **Transport census hardening rule + probes** (route.continue /
   Fetch.continueRequest / connectToServer / proxy-allow / relay-fetch
   sites; PASSIVE_UNKNOWN allowance absent; engine settle-ordering;
   bootstrap budget present; census registry drift), then the §15 matrix
   smokes with fixture-server request counters proving `upstream == 0` for
   every refused synthetic case; typecheck; gate:dev; gate:milestone;
   OpenSpec reconcile; M5 checkpoint; then M6 automatically.
Session `sess-b675db99ff3f`.

## M4 reproduction record (verified live at `bc5065f1`, synthetic values)

1. Lexical route minimization (src/core/safety/redaction.ts
   redactAuthenticatedUrl): `.../customers/acme1234/orders`,
   `.../accounts/accountabc/invoices`, `.../v1/inv202506/status` all
   persist VERBATIM (lowercase identifier-like segments defeat
   looksLikeIdentifier); mixed-case `CUST-9f8e7d` and numeric
   `481516234299` DO become `<ID>` — the heuristic is shape-guessing, not
   provenance.
2. Fallback defect: relative/unparseable inputs (`/relative/path/...`,
   `not a url at all/...`) get NO path minimization at all — only
   query/fragment stripping in the parseable branch.
3. Late transition (runRecorder.enableAuthenticatedEvidence :129-141):
   flips the flag + appends evidencePolicy only — never chmods this.dir to
   0700 (mkdir+chmod exist only in the constructor branch :97-98), never
   retro-sanitizes constructor manifest / pre-transition appends.
4. Bypass writers confirmed at cited lines: constructor manifest
   (:99-114), proxy.jsonl raw (:236-242), writeRepositories (:349-354),
   finalize notes/hardFailures (:377-395); external: destinationManifest
   (:242-244 into authenticated run dirs), phase4 writeAtomic
   (tests/manual/phase4-real-exploration.ts:341,395).

M4 core IMPLEMENTED at `40962149` — defects 1-3 closed and inverted into
regressions: proven-or-marker URL persistence (`src/core/safety/
provenRoutes.ts`, schema family `nightwatch.proven-route-table` v1),
opt-in endpoint-rule binding, verify-then-tighten transition with
idempotent re-tighten, constructor-manifest sanitization, closed manifest
keys. Defect 4 (writer firewall/census/publication) was OPEN at `40962149`
and is CLOSED at `90a88362` — total writer census (22/8/9, closed
registry) + one final typed persistence firewall over all five artifact
kinds + publishJson/appendLine publication integrity + probes
HC-121..HC-129.

Wave-1 census: `recon/wave1-aud018-census.md` (writer tables, provenance
machinery to reuse, affected tests, risks).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/` | umbrella continuity | in progress |
| `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/` | umbrella OpenSpec/handoff route | complete |
| `src/core/releaseCertification/index.ts` | categorical lineage, dual state, evaluationDigest | complete |
| `bin/project-state-check.mjs` | resolveEvidenceLineage adapter, snapshot HEAD, evidence refusal codes | complete |
| `tests/unit/projectState.test.ts` | pure matrix + synthetic Git full-process matrix | complete |
| `config/hardening-rule-probes.v1.json` | HC-099…HC-105 | complete |
| `bin/lib/hardening/rules/documentation.mjs` | NW-AUD-010 rule assertions | complete |
| `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/tasks.md` | evidence-checked implementation tasks | complete |
| `tests/unit/syntheticCampaignShards.test.ts` | manifest count 106 (NW-AUD-006 drift repair) | complete |
| `config/shard-weights.v1.json` | weight for sessionMutationAuthority.test.ts | complete |
| `src/core/source/censusFigureLedger.ts` | LIVE_TASK_STATUS=IN_PROGRESS while campaign active | complete |
| `docs/CURRENT_STATE.md` | header date + live block | complete |
| `config/document-role.v1.json` | CORR-AUD-010-001 header-date correction | complete |
| `.agent/ACTIVE_TASK.md` | route active campaign and session worktree | complete |
| `.agent/EXECUTION_PROMPT.md` | handoff status bind to umbrella IN_PROGRESS | complete |
| `docs/CURRENT_STATE.md` | live-state block bound to umbrella campaign | complete |
| `bin/lib/privateConsumerCensus.mjs` + `.d.mts` | NW-AUD-019 total consumer census | complete |
| `tests/unit/privateConsumerCensus.test.ts` | census totality + fail-closed negatives | complete |
| `src/controlCenter/authorities/findingsAuthority.ts` | structural revalidation of parsed JSON (reader independence) | complete |
| `tests/unit/controlCenterFindingsAuthority.test.ts` | escaped-label reader regression (HC-115) | complete |
| `tests/unit/controlCenterRunEvidenceReader.test.ts` | escaped-label manifest regression (HC-118) | complete |
| `tests/unit/selfDevAdoptionCli.test.ts` | trust-gate precedence branching (dirty-tree correctness) | complete |
| `tests/unit/evidenceRetention.test.ts` | concurrency-safe removal-direction proof | complete |
| `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/tasks.md` | honest implementation reconciliation | complete |
| `src/core/safety/provenRoutes.ts` | NW-AUD-018 proven route table (schema-declared) | complete |
| `src/core/safety/redaction.ts` | proven-or-marker authenticated URL persistence | complete |
| `src/core/safety/endpointSemantics.ts` | provenRouteTableFromRules builder | complete |
| `src/core/evidence/runRecorder.ts` | final typed firewall, transition transaction, publishJson/appendLine, categorical finalize, shared-key sanitize | complete |
| `src/core/evidence/types.ts` | shared KNOWN_RUN_FAILURE_REASONS vocabulary | complete |
| `src/browser/context.ts` | opt-in proven-route binding before authenticated publication | complete |
| `bin/lib/authenticatedWriterCensus.mjs` + `.d.mts` | NW-AUD-018 total writer census + closed registry | complete |
| `bin/lib/hardening/rules/privacy-and-evidence.mjs` + `registry.mjs` | checkAuthenticatedEvidenceFirewall (TOTALITY) | complete |
| `config/hardening-rule-probes.v1.json` | HC-121..HC-129 | complete |
| `tests/unit/authenticatedEvidenceMinimization.test.ts` | route/transition/firewall regressions (16) | complete |
| `tests/unit/authenticatedWriterCensus.test.ts` | census totality + negatives | complete |
| `tests/unit/hardeningRuleQuantifiers.test.ts` | rule-inventory pins 84/61/23 | complete |
| `tests/smoke/authenticated.smoke.ts` | proven fixture-route binding | complete |
| `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/tasks.md` | evidence-checked implementation reconciliation (4.2 PARTIAL) | complete |
| `bin/lib/hardening/rules/privacy-and-evidence.mjs` | dead comment-read bindings removed (16 lint blockers cleared, zero behavior change) | complete |
| `tests/unit/semanticRequestAdmission.test.ts` | NW-AUD-020 four-class reproduction baseline (pins to invert) | complete |
| `src/core/safety/semanticAdmission.ts` | M5 immutable admission authority + closed refusals + consumeAdmission | complete (core; wiring pending) |
| `src/core/safety/causalGenerations.ts` | M5 deterministic generations (settle-only authority end) | complete (core; wiring pending) |
| `src/core/safety/bootstrapExemptions.ts` | M5 finite navigation-scoped bootstrap exemptions | complete (core; wiring pending) |
| `src/core/safety/endpointSemantics.ts` | exported ruleHostMatches/rulePathMatches (one route-proof system) | complete |
| `src/core/schemaLifecycle/declarations.ts` | +3 M5 schema families declared | complete |
| `tests/unit/semanticAdmissionAuthority.test.ts` | M5 pure matrix: transports/refusals/timing/cross-gen/bootstrap/disagreement | complete |

## Validation Ledger

Command: `npm run session:status` (canonical, campaign start)
Result: PASS
When: 2026-09-22
Relevant failure/output summary: workspace integrity satisfied; canonical
clean at `4a3df8cd`; no owned session yet.

Command: strict OpenSpec validation (five remediation changes + NW-AUD-006)
Result: PASS
When: 2026-09-22
Relevant failure/output summary: all six changes valid.

Command: `npm run handoff:check`; `npm run agent:check`;
`npm run project:check`; `npm run workspace:check`; `npm run session:check`
(pre-bootstrap, canonical)
Result: PASS
When: 2026-09-22
Relevant failure/output summary: NW-AUD-006 COMPLETE handoff coherent;
agent strict_errors=0; project PASS; workspace/session PASS.

Command: `npm run gate:milestone` (Phase 1, clean tree at `78483ee8`)
Result: PASS (wall=1038.4s; every step exit=0 including project-check)
When: 2026-09-22
Relevant failure/output summary: validation-universe, execution-classes, typecheck, hardening-check, agent-check, handoff-check, typecheck-bin, hardening-rules, project-check, workspace-check, affected-tests (386), affected-shards all exit=0; lane result PASS (NON-CERTIFICATION).

Command: focused NW-AUD-019 suites via `node bin/run-shards.mjs --files=...`
Result: PASS (377/377 after fixing one real failure; later 54/54 and 7/7 reruns)
When: 2026-09-22
Relevant failure/output summary: the one real failure was the width-budget
expectation (array tripped KEY_BUDGET first → NODE_BUDGET dead code);
root-caused and fixed (array elements count as nodes); findings/run-evidence
escaped-label regressions PASS.

Command: `node bin/hardening-check.mjs --probe-campaign --only=checkPrivateSurface`
Result: PASS — rules=1 probes=11 detected=11 undetected=0 restored statusUnchanged=true
When: 2026-09-22
Relevant failure/output summary: HC-005, HC-111..HC-120 all DETECTED.

Command: `npm run gate:dev` (M3; final run clean at pre-commit `83a1236a` tree)
Result: PASS (all steps exit=0; affected 389; wall=1667.3s)
When: 2026-09-22
Relevant failure/output summary: first run had failed=2 REAL —
selfDevAdoptionCli:65/:122 (dirty-checkout trust-gate precedence),
root-caused and fixed; a manual shard reproduction also flaked
 evidenceRetention:186 and l6Containment:92 once each (pre-existing load
flakes, pass isolated; evidenceRetention assertion made concurrency-safe).
Advisory totals line shows failed=13 while every authoritative shard exit=0
(see Discoveries: advisory parse).

Command: `npm run gate:milestone` (Phase 3, clean checkpoint `83a1236a`)
Result: PASS (wall=1643.3s; all twelve steps exit=0 incl. hardening-rules
full probe campaign 187.6s and project-check)
When: 2026-09-22
Relevant failure/output summary: affected-tests selected=389;
affected-shards exit=0 passed=5407 (advisory failed=13 — nested child output
parsed by the documented advisory counter; exit status is the authority).

Command: `openspec validate <seven changes> --strict` (campaign start +
post-reconciliation NW-AUD-019 + umbrella)
Result: PASS
When: 2026-09-22

Command: checkpoint battery — `node bin/run-shards.mjs --files=<20 M4
suites>` + `npm run typecheck` + `node bin/hardening-check.mjs` +
`npm run schema:check` (M4, clean tree at `90a88362`)
Result: PASS — focused 190/190 across 20 files; typecheck exit=0;
hardening PASS; schema PASS
When: 2026-09-22
Relevant failure/output summary: earlier iterations of this battery found
and root-caused three real defects first (private-consumer UNKNOWN for
runRecorder's new screening use → registered `src/core/evidence/`; writer-
census wrapper-gate required target-matched raw writes → raw-site count
gate; rule-count inventory pins 83/60 → 84/61).

Command: `node bin/hardening-check.mjs --probe-campaign
--only=checkAuthenticatedEvidenceFirewall`; `--only=checkPrivateSurface`
Result: PASS — rules=1 probes=9 detected=9 undetected=0 (HC-121..HC-129);
and rules=1 probes=11 detected=11 undetected=0
When: 2026-09-22

Command: `openspec validate nightwatch-authenticated-evidence-
minimization-integrity-v1 --strict` + umbrella change --strict
Result: PASS
When: 2026-09-22

Command: `npm run gate:dev` (M4; final run clean at `5e2a0357`)
Result: PASS (all steps exit=0; affected 391; wall=975.0s)
When: 2026-09-22
Relevant failure/output summary: one intermediate run failed on the rule-
census pins (hardeningRuleQuantifiers 83→84) — fixed deliberately; final
advisory failed=13 with every authoritative shard exit=0 (known parse
artifact).

Command: `npm run gate:milestone` (Phase 4, clean checkpoint `5e2a0357`)
Result: PASS (wall=1216.0s; all twelve steps exit=0 incl. hardening-rules
full probe campaign 173.7s and project-check)
When: 2026-09-22

## Decisions Made During This Task

Decision: one umbrella implementation campaign owns handoff/C-00 continuity;
each remediation keeps its own OpenSpec identity and planning-task history.
Reason: handoff v1 binds one Campaign ID to one OpenSpec route with
audit.md; the five planning changes intentionally lack audit.md and must not
be rewritten as if planning were implementation. Evidence/constraint:
`bin/planner-handoff-protocol.mjs` and the NW-AUD-006 precedent.

Decision: do not mark any phase complete without live reproduction and
focused regression first.
Reason: the master prompt forbids implementing from proposal text alone when
live source might have drifted.

Decision (M5): ONE pure `evaluateAdmission` is the single semantic decision
for every transport; layers consume handles or recompute from the SAME
frozen snapshot, and divergence is the hard `ADMISSION_TRANSPORT_DISAGREEMENT`.
Reason: shared-function identity makes layer agreement structural rather
than hoped for; spec scenario "the same immutable admission authorizes the
bounded request across all layers".

Decision (M5): attribution is explicit at L1 (journey seam) and implicit
(exactly-one-open, else AMBIGUOUS) at backstops; the single-action
overlap-throw stays in the observer while the registry itself permits
multiple live generations.
Reason: preserves the existing fail-closed singleton policy (census risk 6)
while satisfying the cross-generation confusion matrix.

Decision (M5): a read-method request on a route that carries a mutation
TWIN rule refuses as MUTATION, not method-mismatch.
Reason: 303/307 method drift must never smuggle a write into an admitted
read; payer-exchange style read+write pairs share one path pattern.

Decision (M5): bootstrap matching is two-stage (family = env+origin+method,
then exact anchored route) so MISMATCH (route drift inside a registered
family) and UNREGISTERED (unknown startup traffic) stay distinct
refusals; POST/HEAD exemptions are impossible (GET/HEAD-only enforced at
registration).

Decision (M5): persisted admission identity reuses M4's categorical
`<RULE:id>` marker (safeRuleMarker) — no second route-proof or route-
persistence system.

## Discoveries

- Claim after start mints a fresh live session ID (`sess-c9a1701b8a56`); the
  start-time predecessor ID is consumed by `--expect-session` on adopt only.
- Routing `SESSION WORKTREE` must equal STATE `Branch:` (the `session/...`
  branch name), and must appear on every `session/...` mention in
  ACTIVE_TASK.md.
- Session identity rotates on adopt: start/claim minted `sess-c9a1701b8a56`;
  after that holder went stale, adoption minted the live
  `sess-b675db99ff3f` (`claim --adopt --expect-session sess-c9a1701b8a56`).
  Resume recipes must name the CURRENT session id.
- NW-AUD-019 sibling defect found by re-derivation (absent from the
  planning doc): compound identity keys (`billing_group_id`, `payer_id`,
  `email_address`, `customer_name`, `tokens`, ...) escaped BOTH the exact
  sensitive-key set and the label regex — reproduced against live source,
  closed with the SENSITIVE_KEY_SUFFIXES vocabulary + matching RE suffix
  class, regression-tested, mutation-pinned (HC-119/HC-120).
- NODE_BUDGET_EXCEEDED was dead code (array indices counted as keys, so a
  wide array always tripped KEY_BUDGET first); array elements now count as
  nodes and both budgets are reachable and tested.
- run-shards `totals.failed` is an ADVISORY text parse (documented in
  bin/run-shards.mjs): nested child processes inside tests print their own
  "N failed" lines and the LAST match wins, so a PASS receipt can show
  failed=13 with every authoritative shard exit=0. The exit status is the
  failure authority. Successor-backlog candidate (evidence integrity):
  derive counts from the Playwright JSON reporter instead.
- selfDevAdoptionCli now branches on the product's own
  currentCheckoutState() trust gate: the CLI evaluates the dirty-source
  refusal BEFORE any lookup, so both contracts (provenance-precedence on a
  dirty tree, not-found on a clean tree) are asserted without copying the
  authoritative path list (module-barrier-clean barrel import).
- evidenceRetention's exact artifacts/ directory-count assertion was
  unsound under concurrent lanes (siblings create fixture runs); the
  removal-direction subset (every prior entry still present) proves the
  same property race-free.
- Pre-existing load flakes observed (not caused by NW-AUD-019 changes):
  evidenceRetention under parallel artifacts/ writers; l6Containment bwrap
  parent-death timing. Both pass isolated; re-verify at M6 certification.
- NW-AUD-018 census lessons: (a) wrapper-owned raw writes take PARAMETER
  arguments, so target-filtered counts must not gate wrapper discovery —
  raw-site presence does; (b) const indirection (`const dir =
  path.join(root, 'artifacts', ...)`) needs one-level initializer
  resolution or entire manual-writer families vanish from the census;
  (c) two censuses interact — a new screening CALLER (runRecorder
  firewall) must be registered in the private-consumer registry too, and
  the fail-closed UNKNOWN caught exactly that; (d) adding a hardening rule
  requires deliberately advancing the pinned rule-count inventory
  (hardeningRuleQuantifiers 83/60 → 84/61) — that pin is the guard, not
  an obstacle; (e) `?` inside a regex PATTERN SOURCE is a quantifier, not
  query syntax — persistence safety lives in the emit charset and the
  match()-side ?/# refusal, not in banning pattern characters.

## Blockers

None.

## Safety Events

NONE across M0–M3 — no Alphaus, database, cloud, credential, sibling, or
publication contact; no force push; synthetic values only.

## Deferred / Follow-Up

- Phase 5 implementation (M5) and final certification/closure (M6).
- Remaining audit backlog beyond the five named items (enumerate at close;
  do not start).
- Advisory shard-count parse (failed=13 on green exits): successor backlog,
  evidence-integrity class; never silence it by weakening exit authority.
- Re-verify the two recorded load flakes at M6 full certification.
- NW-AUD-019 task 2.2 branded per-family DTO migration: Phase 4 delivered
  the KIND-based final typed firewall (all five artifact kinds), not
  per-family branded constructors — that migration remains honestly
  PARTIAL in the remediation tasks.md.
- NW-AUD-018 task 4.2 remainder: killed-mid-write partial generations,
  concurrent recorders on one directory, adversarial temp pre-seeding —
  recorded PARTIAL, not claimed.
- Phase 4 sibling findings not in the five (see recon/wave1-aud018-
  census.md §10): documentLifecycle direct redaction call (safe direction,
  inconsistent abstraction), addManifestEntry low items now closed —
  enumerate with the rest at M6; do not start early.

## Resume Recipe

Resume at Exact Next Action: Phase 5 NW-AUD-020 reproduction from
`recon/wave1-aud020-census.md`. Session `sess-b675db99ff3f` on
`session/nightwatch-priority-audit-remedi-0e17af9c` (adopt history:
predecessor `sess-c9a1701b8a56`).

## Completed Milestones (append)

- **M1 — Phase 1: NW-AUD-010 release evidence lineage integrity: COMPLETE** at `78483ee8`; gate:dev PASS; gate:milestone PASS.
- **M3 — Phase 3: NW-AUD-019 private payload structural screening: COMPLETE**
  at `83a1236a`; gate:dev PASS; gate:milestone PASS (twelve steps exit=0,
  full probe campaign included); probes HC-005+HC-111..120 11/11 DETECTED;
  strict OpenSpec PASS; consumer census 40/14/10 digest-bound; compound-key
  defect reproduced-then-closed; reader independence (findings + run-evidence)
  pinned by HC-115/HC-118. Also in this phase: `24098097` completed the
  interrupted change-intelligence tsc path repair.
- **M4 — Phase 4: NW-AUD-018 authenticated evidence minimization:
  COMPLETE** across `40962149` (proven route identity + hardening-mode
  transition), `90a88362` (total writer census + final typed persistence
  firewall + transition/publication integrity), `5e2a0357` (rule-inventory
  census 84/61); gate:dev PASS; gate:milestone PASS (twelve steps exit=0 at
  `5e2a0357`); probes checkAuthenticatedEvidenceFirewall 9/9 + 
  checkPrivateSurface 11/11 DETECTED; writer census 22/8/9 ok; private
  consumer census 41 ok (src/core/evidence/ newly registered); focused
  battery 190/190; strict OpenSpec PASS; remediation tasks.md reconciled
  with 4.2 honestly PARTIAL (killed-write/concurrent-recorder remainder).
- **M0 — Campaign bootstrap: COMPLETE** at `b2823c99`/`febedef1`. handoff PASS
  (IN_PROGRESS bind), agent PASS (strict_errors=0), project PASS, session
  PASS, tree clean, `mayIntegrate=true`.

## Completion Snapshot

- Status: IN_PROGRESS — not complete; no completion claims.
