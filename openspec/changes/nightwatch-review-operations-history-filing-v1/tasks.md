# Tasks — Review Operations, History Intelligence and Human-Filing Completion

- [x] M0 — Campaign open. OpenSpec, `.agent` task records, execution prompt,
      routing block bound to this campaign and its session worktree.
- [x] M1 — DEF-RO-1. Repair the predecessor REPORT's implementation anchor and
      add the mechanical rule that separates live-authority markers from
      historical anchors in a terminal COMPLETE report.
- [x] M2 — `PrivateArtifactStore.listEntries()` and the read-only store handle.
      `src/core/reviewStore/inventory.ts`: counts, sizes, integrity,
      currentness axis, health precedence and condition set, digest-only
      unknown entries.
- [x] M3 — `src/core/reviewStore/history.ts`: deterministic generation
      chronology, explicit current generation, preserved stale generations,
      bounded pagination.
- [x] M4 — Historical identity propagation. `IntelHistoryEntry` carries
      expectation and semantic-contract identity; the fabricated forty-zero
      source SHA is replaced by the shared named absence; DEF-RO-2 repairs the
      vacuous regression-candidate lineage guard.
- [x] M5 — Review-state-aware human filing report and its production-local
      generation path.
- [x] M6 — `bin/nightwatch-review.mjs`: inventory / history / inspect / filing,
      human and JSON output, bounded rows, stable exit codes.
- [x] M7 — Control Center: contracts, adapter, authority, routes, and the
      review-operations view with drill-down to per-finding history.
- [x] M8 — Hardening: the review-operations boundary rule, proven to bite by
      mutating the real guarded artifact, with definition/invocation parity.
- [x] M9 — Determinism, order-independence, concurrency, corruption corpus,
      property tests and the privacy red team.
- [x] M10 — Scale: 10k / 25k / 50k fresh-process measurement of discovery,
      inventory, history, reviewer page, JSON output, RSS and disk.
- [x] M11 — Mutation campaign, >= 30 meaningful mutations, zero unexplained
      survivors, restore drift proven zero.
- [x] M12 — Browser qualification: the review-operations view, history
      drill-down, current vs stale generation, filing report, refresh and
      server restart, >= 30 loops.
- [x] M13 — Documentation, OpenSpec sync, `.agent` state, REPORT, full
      regression, `gate:local`, `gate:clean` on a proven fresh install.

All milestones complete. Evidence:
`.agent/tasks/nightwatch-review-operations-history-filing-v1/REPORT.md`.
