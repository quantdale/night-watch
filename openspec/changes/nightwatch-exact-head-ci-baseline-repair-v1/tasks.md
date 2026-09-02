# Tasks — Exact-Head CI Baseline Repair and Truth Reconciliation

- [x] M1 mechanically reproduce both exact-head CI failures under
      runner-shaped topology (Linux, Node 20.20.2, clean install, workers=1,
      retries=0, no sibling source root, no Bubblewrap), and calibrate the
      harness against the real run's group results rather than trusting it
- [x] M2 root-cause `DEF-CI-01` and `DEF-CI-02`, each naming the exact test,
      assertion, responsible source path, environmental delta, and whether the
      test or the production code is wrong
- [x] M3 repair `DEF-CI-02`: add `l6ContainmentAvailability()` as the single
      containment precondition and restructure the suite around a
      fully-proven-xor-explicitly-blocked invariant, keeping serial mode
      (`src/core/oops/l6.ts`, `tests/unit/l6Containment.test.ts`)
- [x] M4 repair `DEF-CI-01`: assert the census POPULATION before any census
      CONTENT, discriminating on the operator's own per-repository status
      (`tests/unit/eligibilityCensus.test.ts`)
- [x] M5 bounded diagnostics: versioned manifest, repository-owned launcher,
      allowlisting gate boundary module, `didNotRun` as its own bucket, and the
      mode-aware deep-lane requirement (`config/synthetic-campaign.v1.json`,
      `bin/campaign-synthetic.mjs`, `bin/lib/gate-receipt.mjs`,
      `bin/quality-gate.mjs`, `bin/quality-gate-inventory.mjs`,
      `bin/hardening-check.mjs`)
- [x] M6 reconcile project truth and add `PROJECT_STATE_CI_EVIDENCE_STALE`,
      preserving historical zero-step runs
      (`bin/project-state-check.mjs`, `docs/CURRENT_STATE.md`,
      `docs/DECISIONS.md`, `docs/ROADMAP.md`)
- [ ] M7 full required-stack regression, `gate:local`, and clean Node 20
      `gate:clean`, with counts measured and reported rather than assumed
- [ ] M8 integrate, push, and certify the exact-head GitHub run with all
      eleven required groups green, including the first-ever execution of
      `PATCH_INTEGRITY` and `WORKSPACE_INTEGRITY`
