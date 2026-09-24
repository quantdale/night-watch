## 1. Campaign bootstrap (M0)

- [x] 1.1 Start and claim one owned C-00 session under the NW-AUD-006
  authority-binding contract; record session, branch, and base.
- [x] 1.2 Create umbrella task continuity (SPEC/PLAN/STATE/REPORT) with
  continuity v2 identity and routing bound to this worktree.
- [x] 1.3 Create this OpenSpec change (audit, proposal, design, delta spec,
  tasks) and strict-validate it.
- [x] 1.4 Flip `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md` to
  this campaign IN_PROGRESS; run session/handoff/agent/project checks; commit
  the bootstrap checkpoint.

## 2. Phase 1 — NW-AUD-010 release evidence lineage integrity

- [x] 2.1 Re-reproduce non-exact evidence survival on live source; add focused
  failing regression (NW-AUD-010 pure + full-process matrix).
- [x] 2.2 Implement categorical lineage, exact-equality certification,
  snapshot-bound HEAD, evaluation digest, stable refusal codes.
- [x] 2.3 Synthetic Git matrix (exact/ancestor/descendant/side/missing/HEAD)
  and non-vacuous mutations HC-099…HC-105 PASS (timeout/spawn covered by
  GIT_INDETERMINATE pure cases + adapter SPAWN_ERROR/SIGNAL branches).
- [x] 2.4 Focused suites + `gate:dev` + `gate:milestone` PASS; coherent
  checkpoint commit; update
  `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/tasks.md`
  from evidence. [committed `78483ee8`; gate:dev PASS; gate:milestone PASS]

## 3. Phase 2 — NW-AUD-014 child-process boundary totality

- [x] 3.1 Total AST invocation census; zero unknown nodes; closed profiles. [childProcessCensus + checkChildProcessBoundaries; 121 invocations / 0 unclassified]
- [x] 3.2 Close highest-authority leaks (gate-topology/review-mutation env,
  portfolio/change-intelligence/run-shards/semantic-compat/campaign-synthetic/
  gate-topology npx → local bins, phase22-dev stdio inherit → piped+emit);
  sentinel environment proof via existing childEnvironment tests + census.
- [x] 3.3 Timeout/output/stdin/shell/termination tests and hardening probes
  PASS; `gate:dev` + `gate:milestone` PASS; coherent checkpoint; update the
  remediation change tasks from evidence. [committed `ff62ff0b`; gate:dev PASS;
  gate:milestone PASS; probes 6/6]

## 4. Phase 3 — NW-AUD-019 private payload structural screening

- [x] 4.1 Re-reproduce quoted-key JSON bypass; focused failing regression [privateStructuralScreening.test.ts].
- [x] 4.2 Structural validators + closed key set (incl. compound identity
  suffix vocabulary) + bounds; text defense quote-optional + canonicalized
  (NFKC/zero-width); store+reader structural admission. [full per-family DTO
  brand migration remains deferred to Phase 4's typed-firewall work; the
  generated consumer census landed under 4.3 instead of deferring].
- [x] 4.3 Adversarial corpus and privacy mutations PASS (escaped/unicode/
  encoded/duplicate/alias/width/node/tamper/no-echo; probes HC-005+HC-111...
  HC-120, 11/11 DETECTED); Control Center focused tests PASS (findings +
  run-evidence escaped-label regressions); `gate:dev` + `gate:milestone`
  PASS; coherent checkpoint; remediation change tasks reconciled from
  evidence. [committed `83a1236a`; gate:dev PASS; gate:milestone PASS]

## 5. Phase 4 — NW-AUD-018 authenticated evidence minimization

- [x] 5.1 Re-reproduce route/recorder/transition bypasses; focused failing
  regressions. [reproduced live at `bc5065f1`; regressions in
  authenticatedEvidenceMinimization.test.ts — lowercase IDs persisting
  verbatim, unminimized fallback, no-op late transition, bypass writers]
- [x] 5.2 Provenance-bound route identity; total authenticated writer
  firewall (reusing Phase 3 primitives where correct); transition and
  publication integrity. [provenRoutes v1 + redaction rewrite;
  authenticatedWriterCensus 22/8/9 with closed registry; final typed
  firewall over all five artifact kinds reusing containsPrivatePayload
  v2 + privateKeySensitivity; verify-then-tighten transition; publishJson
  private-equivalent primitive; shared KNOWN_RUN_FAILURE_REASONS]
- [x] 5.3 Writer census complete; privacy mutations PASS; `gate:dev` +
  `gate:milestone` PASS; coherent checkpoint; update the remediation change
  tasks from evidence. [COMPLETE: writer census 22/8/9 ok; mutations
  HC-121..HC-129 9/9 DETECTED (plus checkPrivateSurface 11/11); gate:dev
  PASS; gate:milestone PASS twelve steps exit=0 at `5e2a0357`; remediation
  tasks.md reconciled from evidence; receipts in the umbrella STATE
  validation ledger]

## 6. Phase 5 — NW-AUD-020 semantic request admission

- [x] 6.1 Re-reproduce passive/late/redirect authority gaps; focused failing
  regressions. [reproduced and pinned at `8f346136`; all four defect pins
  A–D subsequently INVERTED by the wiring with ordering/absence proofs]
- [x] 6.2 Immutable admission handles; finite initialization exemptions;
  causal generations; transport-total enforcement; zero-upstream refusal
  proof on synthetic fixtures. [semanticAdmission/causalGenerations/
  bootstrapExemptions/admissionTickets (4 schema families, 15 closed
  refusal codes, no dead vocabulary); L1/L2/L0 shared gate with layer
  ownership; L5 one-shot tickets + per-host tunnel capability; relay
  composition (caller AND semantic); redirect provenance chain via the CDP
  backstop; zero-upstream counters at five boundaries: fixture hits,
  wsConnections, redirect dst counters, proxy request/connection counts,
  relay fetchCalls]
- [x] 6.3 Endpoint/journey/browser/CDP/proxy/WebSocket + hardening tests
  PASS; `gate:dev` + `gate:milestone` PASS; coherent checkpoint; update the
  remediation change tasks from evidence. [focused suites PASS; hardening
  rule checkSemanticTransportTotality + probes HC-130..HC-136, full
  campaign 143/143; gate:dev PASS; gate:milestone PASS twelve steps exit=0
  at `70104a00`; NW-AUD-020 tasks.md reconciled with honest PARTIALs
  (4.1 async-source/popup-frame-worker depth, 4.2 stale-currentness probe);
  M5 checkpoint committed at `a9445d4a`]

## 7. Cross-phase audit, full certification, C-00 closure (M6)

- [x] 7.1 Run the cross-phase interaction audit and any required
  cross-subsystem focused tests. [CLEAN — six interaction audits recorded
  in the STATE M6 section; flakes re-verified 3/3 isolated; no fix needed]
- [x] 7.2 Run the single full certification (typecheck, typecheck:bin,
  hardening check/rules, agent/handoff/project/workspace/session checks,
  validation:universe, strict OpenSpec for all six changes, `npm test`,
  `gate:local`, `gate:clean`, affected synthetic/UI lanes). [ONE
  certification at `1e912454`: Phase A all-pass (ten checks + full probe
  campaign + six strict OpenSpec); npm test 5453/18sk/0didNotRun (plan
  sha256:bb3f6cf91671b8afef73e26a); gate:local PASS all twelve groups
  (receipt receipt:sha256:74edae6159b1e561800123d2, semantic 2137/0f,
  synthetic 1916/1916 + deep-containment PROVEN, owner 91). gate:clean ran
  post-integration at `1e912454` (clean-receipt:sha256:352e3c95a8cfbb6dbbf9e47b;
  its HANDOFF group failure was the ACTIVE-routing worktree-declaration
  defect this terminal commit fixes — the green re-run receipt is recorded
  in the dedicated follow-up receipt commit per the NW-AUD-006 pattern)]
- [x] 7.3 Reconcile all five remediation checklists from actual evidence;
  write umbrella REPORT sections A–N; enumerate remaining audit backlog
  without starting it. [all five OpenSpec tasks.md reconciled with honest
  PARTIALs (NW-AUD-018 4.2; NW-AUD-020 4.1/4.2); REPORT.md updated;
  backlog stays enumerated-not-started in recon/wave1-audit-backlog.md +
  the Completion Snapshot]
- [x] 7.4 C-00 integrate with exact `--expect-session`/`--expect-head`;
  verify `HEAD == origin/main`; release; remove worktree/branch; terminal
  routing flip; stop. [integrated: integrate --expect-session
  sess-b675db99ff3f --expect-head 1e9124542de19ce03e453906064b814cc1a537bb -> origin/main equality
  verified; released; exact-session removed (worktree gone, merged branch
  deleted fail-safely); terminal routing flipped; STOP]

## Deferred / not in scope

- Any NW-AUD finding other than 010/014/019/018/020.
- External exact-head CI execution (billing-blocked; reported as non-evidence).
- Real Alphaus traffic, credentials, customer data, sibling mutation,
  external publication, force push, history rewrite.
