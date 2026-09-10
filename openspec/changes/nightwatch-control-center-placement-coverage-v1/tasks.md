# Tasks — Control Center placement coverage

## M0 — establish execution truth
- [x] Owned session claimed on the current base, workspace verdict PASS
- [x] Predecessor re-verified terminal COMPLETE and not reopened
- [x] Task SPEC/PLAN/STATE/REPORT and OpenSpec route committed

## M1 — the placement guard (P-01)
- [x] Carrier model implemented: direct mentions, generic consumers bound at
      the call site, containment access paths, fixpoint closure
- [x] Every non-exempt field asserted present in a carrier of its contract
- [x] Exempt list reasoned, staleness checked, and fails when an exempt field
      becomes rendered
- [x] Extraction measured non-vacuous (contracts, fields, components, deep
      containment)
- [x] The guard reproduces the measured 16 gaps before the repairs
- [x] Mutation proof: removing a rendered carrier occurrence fails the guard

## M2 — render the exposed fields
- [x] Safety Center: `meta.service`, `meta.executionAuthority`,
      `meta.mutationAuthority`, `meta.limits`, `health.status`,
      `safety.ownerScope.status`
- [x] Readiness detail: `readiness.ownerScope.status`
- [x] Execution graph: edge inventory carrying `edge.proof`
- [x] Campaign Intelligence: `ownerScopeStatus` / `ownerScopeReason` replace
      the hardcoded row; coverage row `gapReasons` rendered
- [x] Source surfaces: `repositoryId` rendered on the row
- [x] `passed` and `layer` exempt with stated reasons
- [x] Regressions for the new rows in `App.test.tsx`

## M3 — paged truncation disclosure (P-02)
- [x] `PagedSnapshot` and `PagedCollection` carry `truncated`
- [x] `usePagedCollection` reads `page.truncated`; `LoadMoreControl` states it
- [x] Regression: a truncated page renders the server-truncation statement

## M4 — source-graph undrawn-edge parity (P-03)
- [x] `SourceGraphCanvas` counts endpoint-less edges
- [x] Footer separates drawn from received; disclosure callout added
- [x] Regression: an endpoint-less edge is counted and attributed

## M5 — placeholder coverage and declared limits (P-04, P-05)
- [x] `PlaceholderView` exported and rendered under test
- [x] Graph-limits card quotes declared `maxGraphNodes` / `maxGraphEdges`
- [x] Regressions for both

## M6 — certification
- [ ] `ui/control-center`: typecheck, all tests, build PASS
- [ ] Root `typecheck` and `hardening:check` PASS
- [ ] `validation:universe` PASS
- [ ] Browser workflow lane PASS
- [ ] `gate:local` PASS from this owned session
- [ ] State, task and project docs reconciled to the certified checkpoint
- [ ] Checkpoint integrated by fast-forward; `HEAD == origin/main` verified
- [ ] Session released; canonical tree clean
