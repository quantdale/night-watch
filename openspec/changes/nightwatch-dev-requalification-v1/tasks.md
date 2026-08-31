## 1. Successor setup and authority

- [x] 1.1 Create the continuity-v2 successor task, bind it to the current Git
  head and this OpenSpec change, and declare explicit `PRESERVE` authority.
- [x] 1.2 Run repository freshness, agent, handoff, project-state, and safety
  checks before any DEV operation; stop if the active state is contradictory.

## 2. Repeated Phase 2C evidence

- [x] 2.1 Run the first guarded Phase 2C observation against DEV and retain its
  sanitized outcome, replay classification, and cleanup result.
- [x] 2.2 Run two additional serial Phase 2C observations and compare outcome
  categories, fingerprints, step identity, and timing diagnostics.
- [x] 2.3 Classify any divergence without retry relabeling and open a defect
  record if the evidence indicates a Nightwatch-owned fault.

## 3. Cross-phase real operation

- [ ] 3.1 Run the guarded Phase 4 read-only exploration and retain sanitized
  product/framework/auth/environment outcomes.
- [ ] 3.2 Run the guarded Phase 5 read-only API operation and retain its safe
  result and cleanup evidence.
- [ ] 3.3 Prepare and resume one guarded real campaign, verify persisted state,
  completion counts, duplicate/lost work, and cleanup.
- [ ] 3.4 Replay one selected observation when the launcher reports a safe
  replayable item, preserving the original and replay outcomes separately.

## 4. Defect and evidence reconciliation

- [ ] 4.1 Reconcile product anomalies, finding identity, cluster counts, and
  sanitized owner-local evidence against prior historical observations.
- [ ] 4.2 Reproduce and fix any Critical/High Nightwatch defect discovered in
  the real runs, adding a deterministic local regression before continuation.
- [ ] 4.3 Record auth expiry, environmental blocks, interruptions, or unknown
  outcomes as explicit limitations rather than PASS.

## 5. Closure

- [ ] 5.1 Run the appropriate final local, clean, state, and focused validation
  matrix after all real observations settle.
- [ ] 5.2 Update STATE and REPORT with exact counts, receipts, Git anchors,
  DEV outcome categories, and remaining limitations.
- [ ] 5.3 Close this task only when the completion snapshot and OpenSpec task
  list are terminal, then commit, push, and verify clean `main` parity.
