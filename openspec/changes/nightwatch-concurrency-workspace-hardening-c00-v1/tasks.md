# Tasks — Concurrency and Workspace Hardening (C-00)

- [x] M0 safe bootstrap: discover live Git state, verify the planning/review
      checkpoint, verify no unexplained concurrent changes, and move
      implementation into a dedicated C-00 worktree and session branch
- [x] M1 create the durable continuity-v2 C-00 task and this OpenSpec change
- [x] M2 implement the deterministic worktree/session ownership model
- [x] M3 implement the repository-global hygiene invariants
- [x] M4 implement the declared-deletion gate and document the behavioral
      destructive-operation rules
- [x] M5 implement and document the fast-forward-only integration protocol
- [x] M6 decide the main-integration lease question and record the analysis
      (decision: no lease — `docs/DECISIONS.md` D-103)
- [x] M7 integrate C-00 into `agent:check` and the executable quality gate
- [x] M8 build the deterministic adversarial matrix A–L on disposable
      synthetic repositories
- [x] M9 record the pinned pre-C-01 eligibility-census baseline at a clean SHA
- [x] M10 run the full validation stack, update documentation, and integrate
      serially into canonical `main`
