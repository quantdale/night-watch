# Tasks — Control Center render truth

## M0 — establish execution truth
- [x] Owned session claimed on the current base, workspace verdict PASS
- [x] Predecessor re-verified terminal COMPLETE and not reopened
- [x] Task SPEC/PLAN/STATE/REPORT and OpenSpec route committed

## M1 — harness core and the Overview family (R-01)
- [x] TypeScript-AST fixture generator, failing closed on unknown shapes
- [x] Differential DOM runner with a reasoned, staleness-checked exempt list
- [x] Overview and Safety family covered
- [x] Extraction and rendering measured non-vacuous
- [x] Mutation proof: removing a rendered field's DOM effect fails the harness

## M2 — list, graph, campaign and finding views (R-01)
- [ ] Runs list, run detail and timeline covered
- [ ] Execution graph covered through the run selection flow
- [ ] Campaigns and Findings covered
- [ ] Every exposed field rendered or exempted with a reason

## M3 — reviewer, source and system map (R-01)
- [ ] Reviewer covered through its navigation flow
- [ ] Source surfaces and source graph covered
- [ ] System map covered
- [ ] No non-exempt leaf unobservable; exempt list small and reasoned

## M4 — view-change focus, title and announcement (R-02)
- [ ] Navigation writes the document title per view
- [ ] User navigation focuses the main content region
- [ ] Initial load and SSE refresh do not move focus
- [ ] Regressions for nav click, hash change and back/forward

## M5 — dynamic-class application in the built bundle (R-03)
- [ ] Computed-style assertions for `graph-node-*`, `graph-edge-dimmed`
- [ ] Computed-style assertions for `code-chip-*`, `stage-*`, `text-*`, `status-*`
- [ ] Each assertion fails against the unstyled default

## M6 — registration and UI validation
- [ ] New suite registered in `config/validation-universe.v1.json` UI_LANE
- [ ] `inventoryDigest` refreshed
- [ ] UI typecheck, all tests and build PASS
- [ ] Root `typecheck` and `hardening:check` PASS
- [ ] `validation:universe` PASS

## M7 — certification
- [ ] `gate:local` PASS from this owned session
- [ ] Full offline regression PASS at the certified checkpoint
- [ ] State, task and project docs reconciled to the receipt
- [ ] Checkpoint integrated by fast-forward; `HEAD == origin/main` verified
- [ ] Session released; canonical tree clean
