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
- [x] Runs list, run detail and timeline covered
- [x] Execution graph covered through the run selection flow
- [x] Campaigns and Findings covered
- [x] Every exposed field rendered or exempted with a reason

## M3 — reviewer, source and system map (R-01)
- [x] Reviewer covered through its navigation flow
- [x] Source surfaces and source graph covered
- [x] System map covered
- [x] No non-exempt leaf unobservable; exempt list small and reasoned

## M4 — view-change focus, title and announcement (R-02)
- [x] Navigation writes the document title per view
- [x] User navigation focuses the main content region
- [x] Initial load and SSE refresh do not move focus
- [x] Regressions for nav click, hash change and back/forward

## M5 — dynamic-class application in the built bundle (R-03)
- [x] Computed-style assertions for `graph-node-*`, `graph-edge-dimmed`
- [x] Computed-style assertions for `code-chip-*`, `stage-*`, `text-*`, `status-*`
- [x] Each assertion fails against the unstyled default

## M6 — registration and UI validation
- [x] New suite registered in `config/validation-universe.v1.json` UI_LANE
- [x] `inventoryDigest` refreshed
- [x] UI typecheck, all tests and build PASS
- [x] Root `typecheck` and `hardening:check` PASS
- [x] `validation:universe` PASS

## M7 — certification
- [x] `gate:local` PASS from this owned session
- [x] Full offline regression PASS at the certified checkpoint
- [x] State, task and project docs reconciled to the receipt
- [x] Checkpoint integrated by fast-forward; `HEAD == origin/main` verified
- [x] Session released; canonical tree clean
