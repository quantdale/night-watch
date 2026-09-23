# Task State

## Identity

Task ID: nightwatch-priority-audit-remediation-sequence-v1
Phase: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
Status: IN_PROGRESS
Starting SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
Last validated implementation SHA: 70104a0016183e103815c79ff1a7647b73e4e622
Last substantive checkpoint SHA: 70104a0016183e103815c79ff1a7647b73e4e622
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-priority-audit-remedi-0e17af9c
Last checkpoint: 2026-09-23 — M5 Phase 5 NW-AUD-020 COMPLETE at
`70104a00` (validated implementation: Steps 1–8 through `11581a0e` +
probe fix `70104a00`). Receipts: gate:dev PASS (393 affected, all step
exits 0); gate:milestone PASS (twelve steps exit=0 at `70104a00`,
hardening-rules 162.4s); FULL probe campaign rules=85 probes=143
detected=143 undetected=0 restored=100; admission suites 21/21 (incl.
the section-15 consolidated matrix: all 15 closed refusal codes,
expected==actual, zero dead codes); 17-file battery 171/171; typecheck/
typecheck:bin/schema/hardening/universe/agent/handoff/project/workspace/
session all PASS; strict OpenSpec PASS for the NW-AUD-020 change +
umbrella. All four original defect pins A–D INVERTED. Honest PARTIALs
recorded in the reconciled tasks.md (4.1 async-source + popup/frame/
worker test depth; 4.2 stale-currentness source-mutation probe).
M5 anchors now record `70104a00`. Next: M6 cross-phase audit → ONE full
certification → C-00 integrate/release → gate:clean → terminal report →
successor engine.

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
LAST_VALIDATED_IMPLEMENTATION_SHA: 70104a0016183e103815c79ff1a7647b73e4e622
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 70104a0016183e103815c79ff1a7647b73e4e622
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

Milestone ID: M6 — Cross-phase audit, full certification, C-00 closure
Milestone status: IN_PROGRESS
What is being attempted: adversarial cross-phase interaction audit of
NW-AUD-010 × 014 × 019 × 018 × 020 (doc-descendant exactness; child-
process totality re-run over M3–M5 files; key-authority coherence;
semantic-receipt persistence safety under the M4 firewall; helper-process
bounds; generation × recorder teardown), independent-style adversarial
review with immediate fixes, re-verification of the two recorded load
flakes + the advisory text-parse quirk, then ONE authoritative full
certification (typecheck, typecheck:bin, schema, hardening check+rules,
validation universe, agent/handoff/project/workspace/session, five strict
OpenSpec validations + umbrella, npm test, gate:local, declared lanes),
pre-integration C-00 checks, integrate with --expect-session/--expect-head,
release + exact-session removal, terminal routing, gate:clean at the
post-integration point, terminal report, successor reassessment.

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

## M6 cross-phase audit (recorded before certification)

- **18.1 NW-AUD-010 × later commits**: `checkProjectStateIntegrity`
  PASS at every milestone anchor advance this campaign (83a1236a →
  5e2a0357 → 70104a00) — each advance carried its own gate evidence;
  doc-only descendants (efb4343f, bc5065f1, c86243e1, 495f1287,
  a9445d4a) never certified implementation bytes; equality/ancestor/
  divergent/missing classifications live and green.
- **18.2 NW-AUD-014 × M5**: `checkChildProcessBoundaries` PASS over
  every file the five remediations added — census 68/121/0 unchanged,
  zero new unclassified child invocations (M3–M5 added none).
- **18.3 019 × 018 coherence**: `checkPrivateSurface` PASS (consumer
  census 41/141-class, shared structural key authority single-sourced;
  no duplicate key vocabulary) + `checkAuthenticatedEvidenceFirewall`
  PASS (writer census 22-class, single typed firewall).
- **18.4 018 × 020 receipts**: every M5 refusal/admission receipt carries
  only origin/method/rule-id/generation/transport/categorical-code —
  asserted by tests in all three suites (no path/query material), and
  recorder-mode evidence still crosses the M4 typed firewall.
- **18.5 014 × 020 helpers**: `checkSemanticTransportTotality` PASS (55/55
  effect sites classified, digest sha256:7b709791b474427ea40b297c); the
  census module, ticket ledger, and exemption table are pure (no child
  processes, no ambient env).
- **18.6 generation × recorder teardown**: engine settles in a finally
  (rule-pinned); settlement timer cancels on page close with emission
  guard; E2E orphan assertions (activeGenerations() empty at every
  checkpoint) green; no writer leaks (M4 publication post-verifies).
- **Flake re-verification (§18 of the continuation prompt)**:
  evidenceRetention + l6Containment run 3× consecutively: PASS 3/3 —
  classification CONFIRMED as load artifacts (pass isolated), not
  worsened by M0–M5, no deterministic defect. Advisory `failed=` text-parse
  quirk unchanged (exit status remains the authority; recorded as
  successor-backlog evidence-integrity item, not a release blocker).
- **Adversarial review (§21)**: the fourteen listed attack classes map to
  existing non-vacuous proofs (143/143 probes; §15 matrix; five
  zero-upstream counter suites; two census fail-closed codes each). No new
  executable defect found in this pass.

No cross-phase defect required a fix: audit outcome = CLEAN.

## Work In Progress

M5 Steps 5–8 (L2/L5/relay wiring, totality census + probes, expanded
matrices) — Steps 1–4 are committed and green; pins A–D all inverted.

## Exact Next Action

Continue the committed 8-step recipe at Step 5:
5. **L2 WebSocket** (`handleWebSocket` in networkObserver): for API-host WS
   (API signal = `matchEndpoint(rawUrl, 'WS')` non-null), require semantic
   admission through the same gate — registry `method: 'WS'` KNOWN_READ
   rules + active generation; unknown/stale WS refuses BEFORE
   `connectToServer()`; non-API WS keeps host policy (telemetry/etc).
   Update safety-ws smoke expectations; prove refusal opens ZERO fixture
   WS connections (journeyFixture/safety fixture connection counters).
6. **L5 proxy + relay** (bounded): policyAdapter HTTP API-host requests
   recompute from the same registry snapshot (independent-recompute option
   of directive 10) or validate a bounded capability; CONNECT stays
   host-authority with the recorded honest limitation (browser-side L0/L1/L2
   pre-effect gating covers product bytes; design admits the
   control-association gap). Relay: inject the same admission decision for
   API targets in dev mode (compose with its existing redirect policy; do
   not weaken either).
7. **Total transport census hardening rule** (greenfield per census risk 4):
   syntax-aware discovery of `route.continue(`, `Fetch.continueRequest`,
   `ws.connectToServer`, proxy upstream allow (`src/proxy/server.ts`
   forward/CONNECT/WS-upgrade), relay fetch sites — closed registry with
   UNKNOWN/STALE/DUPLICATE/EMPTY fail-closed, non-zero + digest, floors;
   assert PASSIVE-allow relabel absent, engine settle-ordering, bootstrap
   budget present. Non-vacuous probes (HC-130+): remove L1 gate; relabel
   passive allow back; host-only fallback in guard (drop redirect
   admission); WS bypass; engine early-settle; bootstrap budget removal;
   census registry drift.
8. **Expanded zero-upstream + concurrency matrices** (directive 14/15/16):
   E2E redirect matrix (301/302/303/307/308 effective-method via fixture
   server + slow-redirect cross-generation CLOSED refusal with dst counter
   == 0); simultaneous A/B same-route identity non-exchange; ambiguity/
   stale/closed/reused-handle refusals with upstream==0; teardown matrix
   (exception/timeout/cancel/context-close => no orphan generations —
   assert activeGenerations() empty after journeys).
Then: focused endpoint/journey/browser/proxy suites; typecheck;
typecheck:bin; schema:check; hardening:check; probe campaigns;
validation:universe; agent/handoff/project/workspace/session checks;
gate:dev; gate:milestone; strict-validate the NW-AUD-020 change +
umbrella; reconcile NW-AUD-020 tasks honestly; M5 checkpoint commit; M6.
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
| `src/browser/observers/networkObserver.ts` | L1 pre-effect gate, generations, nav settlement, redirect chain, admitRequest API | complete (Steps 1–4; WS gate pending Step 5) |
| `src/core/journeys/engine.ts` | settle-after-settlement authority close; ACTION_SETTLE_MS demoted to pacing | complete |
| `src/browser/context.ts` | admission/exemption/currentness opts plumbing; guard receives admitRequest | complete |
| `src/browser/network/fetchGuard.ts` | redirect-follow-up admission, method+effective identity, layer ownership | complete |
| `src/browser/observers/consoleObserver.ts` | raw-text Failed-to-load-resource suppression (authenticated sibling fix) | complete |
| `tests/unit/observerSemanticLedger.test.ts` | bulk fetch loop carries explicit causal authority | complete |

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

Decision (M5, Step 4): LAYER OWNERSHIP — stateful bootstrap spend happens at
exactly ONE layer per request class: L1 owns all non-redirect API admission
(context.route intercepts them by construction); L0 owns redirect
follow-ups (the only class L1 never sees); Chrome fail-wins semantics
(EMPIRICALLY proven: pre-wiring E2E showed L1 abort surviving an L0
host-allow continue) make host-continue harmless against an L1 refusal.
Reason: double-spend observed in E2E (L0 grant + L1 EXHAUSTED aborted the
legit exempt fetch); URL-keyed cross-layer refusal sets conflate
attempt-scoped refusals with permanent bans (EXHAUSTED poisoned the same
URL) — both mechanisms removed.

Decision (M5, Step 1): navigation generations close through a BOUNDED
settlement window after load (500 ms, aligned with engine quietMs),
extendable only while API requests observed under it are in flight and
hard-capped at 4 re-arms — because Playwright delivers parse-time fetch
interception AND page `request` events only AFTER load (empirically), so
no observation-order rule can be deterministic. The window is not ambient
safety: unknown refuses at every instant; only count-bounded registered
GET navigation-scoped exemptions can spend inside it.

Decision (M5): admission receipts are attempt-scoped — never deduplicated
by URL (a later attempt under a fresh generation is a different decision).

Decision (M5): redirect follow-ups evaluate the EFFECTIVE method Chrome
will send (CDP request.method at the follow-up pause), so 301/302/303/307/
308 method transformation is handled BY CONSTRUCTION without branching on
status codes; follow-up attribution comes ONLY from the redirect provenance
chain (admitted source 3xx Location -> target bound to the earning
generation) or refuses AMBIGUOUS/CLOSED — never the newest open generation.

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
