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

- [ ] 3.1 Total AST invocation census; zero unknown nodes; closed profiles. [IN_PROGRESS]
- [ ] 3.2 Close highest-authority leaks (env spread, npx acquisition,
  unbounded/authenticated launchers); sentinel environment proof.
- [ ] 3.3 Timeout/output/stdin/shell/termination tests and hardening probes
  PASS; `gate:dev` + `gate:milestone` PASS; coherent checkpoint; update the
  remediation change tasks from evidence.

## 4. Phase 3 — NW-AUD-019 private payload structural screening

- [ ] 4.1 Re-reproduce quoted-key JSON bypass; focused failing regression.
- [ ] 4.2 Structural validators + closed family schemas/safe DTOs; text
  defense-in-depth; total writer/reader consumer census.
- [ ] 4.3 Adversarial corpus and privacy mutations PASS; Control Center
  focused tests if touched; `gate:dev` + `gate:milestone` PASS; coherent
  checkpoint; update the remediation change tasks from evidence.

## 5. Phase 4 — NW-AUD-018 authenticated evidence minimization

- [ ] 5.1 Re-reproduce route/recorder/transition bypasses; focused failing
  regressions.
- [ ] 5.2 Provenance-bound route identity; total authenticated writer
  firewall (reusing Phase 3 primitives where correct); transition and
  publication integrity.
- [ ] 5.3 Writer census complete; privacy mutations PASS; `gate:dev` +
  `gate:milestone` PASS; coherent checkpoint; update the remediation change
  tasks from evidence.

## 6. Phase 5 — NW-AUD-020 semantic request admission

- [ ] 6.1 Re-reproduce passive/late/redirect authority gaps; focused failing
  regressions.
- [ ] 6.2 Immutable admission handles; finite initialization exemptions;
  causal generations; transport-total enforcement; zero-upstream refusal
  proof on synthetic fixtures.
- [ ] 6.3 Endpoint/journey/browser/CDP/proxy/WebSocket + hardening tests
  PASS; `gate:dev` + `gate:milestone` PASS; coherent checkpoint; update the
  remediation change tasks from evidence.

## 7. Cross-phase audit, full certification, C-00 closure (M6)

- [ ] 7.1 Run the cross-phase interaction audit and any required
  cross-subsystem focused tests.
- [ ] 7.2 Run the single full certification (typecheck, typecheck:bin,
  hardening check/rules, agent/handoff/project/workspace/session checks,
  validation:universe, strict OpenSpec for all six changes, `npm test`,
  `gate:local`, `gate:clean`, affected synthetic/UI lanes).
- [ ] 7.3 Reconcile all five remediation checklists from actual evidence;
  write umbrella REPORT sections A–N; enumerate remaining audit backlog
  without starting it.
- [ ] 7.4 C-00 integrate with exact `--expect-session`/`--expect-head`;
  verify `HEAD == origin/main`; release; remove worktree/branch; terminal
  routing flip; stop.

## Deferred / not in scope

- Any NW-AUD finding other than 010/014/019/018/020.
- External exact-head CI execution (billing-blocked; reported as non-evidence).
- Real Alphaus traffic, credentials, customer data, sibling mutation,
  external publication, force push, history rewrite.
