# Tasks — Control Center placement coverage

## M0 — establish execution truth
- [x] Owned session claimed on the current base, workspace verdict PASS
- [x] Predecessor re-verified terminal COMPLETE and not reopened
- [x] Task SPEC/PLAN/STATE/REPORT and OpenSpec route committed

## M1 — the placement guard (P-01)
- [ ] Carrier model implemented: direct mentions, generic consumers bound at
      the call site, containment access paths, fixpoint closure
- [ ] Every non-exempt field asserted present in a carrier of its contract
- [ ] Exempt list reasoned, staleness checked, and fails when an exempt field
      becomes rendered
- [ ] Extraction measured non-vacuous (contracts, fields, components, deep
      containment)
- [ ] The guard reproduces the measured 16 gaps before the repairs
- [ ] Mutation proof: removing a rendered carrier occurrence fails the guard

## M2 — render the exposed fields
- [ ] Safety Center: `meta.service`, `meta.executionAuthority`,
      `meta.mutationAuthority`, `meta.limits`, `health.status`,
      `safety.ownerScope.status`
- [ ] Readiness detail: `readiness.ownerScope.status`
- [ ] Execution graph: edge inventory carrying `edge.proof`
- [ ] Campaign Intelligence: `ownerScopeStatus` / `ownerScopeReason` replace
      the hardcoded row; coverage row `gapReasons` rendered
- [ ] Source surfaces: `repositoryId` rendered on the row
- [ ] `passed` and `layer` exempt with stated reasons
- [ ] Regressions for the new rows in `App.test.tsx`

## M3 — paged truncation disclosure (P-02)
- [ ] `PagedSnapshot` and `PagedCollection` carry `truncated`
- [ ] `usePagedCollection` reads `page.truncated`; `LoadMoreControl` states it
- [ ] Regression: a truncated page renders the server-truncation statement

## M4 — source-graph undrawn-edge parity (P-03)
- [ ] `SourceGraphCanvas` counts endpoint-less edges
- [ ] Footer separates drawn from received; disclosure callout added
- [ ] Regression: an endpoint-less edge is counted and attributed

## M5 — placeholder coverage and declared limits (P-04, P-05)
- [ ] `PlaceholderView` exported and rendered under test
- [ ] Graph-limits card quotes declared `maxGraphNodes` / `maxGraphEdges`
- [ ] Regressions for both

## M6 — certification
- [ ] `ui/control-center`: typecheck, all tests, build PASS
- [ ] Root `typecheck` and `hardening:check` PASS
- [ ] `validation:universe` PASS
- [ ] Browser workflow lane PASS
- [ ] `gate:local` PASS from this owned session
- [ ] State, task and project docs reconciled to the certified checkpoint
- [ ] Checkpoint integrated by fast-forward; `HEAD == origin/main` verified
- [ ] Session released; canonical tree clean
