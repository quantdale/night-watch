# Tasks — Control Center UI completion

## M0 — establish execution truth
- [x] Owned session claimed on a current base, workspace verdict PASS
- [x] Predecessor re-verified terminal COMPLETE and not reopened
- [x] Task SPEC/PLAN/STATE and OpenSpec route committed

## M1 — the execution graph draws what the server sent (U-01)
- [x] `nodes.slice(0, 24)` and `edges.slice(0, 48)` removed from `GraphCanvas`
- [x] `layerAssignment` generalized to a `LayoutGraph` structural type shared
      by both canvases
- [x] Pan, zoom, search, execution-state filter and selection present
- [x] Footer reports nodes drawn, filter matches, and edges drawn of received
- [x] Server truncation quoted with its bound; undrawn edges counted and named
- [x] Regression fails when either slice is reintroduced

## M2 — run detail renders the contract it fetches (U-02)
- [x] Repository provenance table, with dirty working tree and file count
- [x] Per-event-type and per-severity censuses
- [x] Screenshot count, browser, ended timestamp, hard-failure count
- [x] Hard-failure codes and note codes as bounded chips
- [x] Timeline truncation and next sequence disclosed
- [x] Empty provenance and empty census state what absence means

## M3 — the Safety Center lists its checks (U-03)
- [x] Every check by name, with state and reason code
- [x] Blocked operation classes named
- [x] Auth mode and network posture rows
- [x] Meta authorization class, findings storage, owner scope and features
- [x] Health product readiness
- [x] An empty check set renders as absence of evidence, never a pass

## M4 — readiness shows its measurements (U-04)
- [x] Approved targets, targets with an active family, currentness counts
- [x] Stale and unavailable targets named
- [x] Compared and drifted campaign keys named
- [x] Analyzer pinned versus observed version, and version agreement
- [x] Deferred and never-measured dimensions kept separate
- [x] Unresolved blockers named with kind and detail code
- [x] External CI classification, frozen operation count, frozen-marker match

## M5 — source, reviewer and map surfaces complete (U-02)
- [x] Surface binding, handler state and the three capability states
- [x] Surface source anchor, evidence digest and exclusion reasons
- [x] Proof-family portfolio, stage/status census, Phase 24 exclusions
- [x] Capability rollup and inventory digest presence
- [x] Repository filter behind the bounded surface page
- [x] Reviewer counterevidence, duplicate basis, shared invariant,
      transition count and non-equivalence
- [x] System map projection version

## M6 — every rendered class has a rule (U-05)
- [x] Graph toolbar, search, filter and zoom styles
- [x] Dimmed, selected and neutral node states, and dimmed edges
- [x] Run-detail code chips and census columns
- [x] `panel-full` for panels carrying tables
- [x] `orbit-ring-outer` and `safety-grid` dangling modifiers removed

## M7 — mechanical guards (U-06)
- [x] `contractCoverage.test.ts`: every contract field reaches `App.tsx`,
      with a reasoned exempt list and a staleness assertion
- [x] `styles.test.ts`: every rendered class has a rule, with the
      interpolated families asserted by concrete value
- [x] Both checks assert their own extraction is non-vacuous
- [x] Both verified to FAIL when the defect is reintroduced
- [x] Both suites registered in `config/validation-universe.v1.json` UI_LANE
      with `inventoryDigest` refreshed

## M8 — certification
- [x] `ui/control-center`: typecheck, 55 tests, build PASS
- [x] Root `typecheck` and `hardening:check` PASS
- [x] Browser workflow lane 4 passed, including built-bundle assertions and a
      computed-style check on the graph toolbar
- [ ] `gate:local` PASS from this owned session
- [ ] Checkpoint committed; state and docs reconciled
