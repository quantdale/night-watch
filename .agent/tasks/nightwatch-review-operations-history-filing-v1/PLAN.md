# Task Plan — Review Operations, History Intelligence & Human-Filing Completion

Living plan. Milestone status is authoritative here; operational waypoints
live in `STATE.md`.

## Purpose

The review store is durable and opaque. Make it observable, make its history
auditable across artifact generations, make the artifact a human actually
files tell the truth about review currentness, and stop the finding history
carrying a manufactured source identity.

## Starting State

- `HEAD == origin/main == d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`, canonical
  checkout clean, one worktree, `session:status` PASS.
- `src/core/reviewStore/` has `putDecision`, `read`, `snapshotListing`,
  `fileNamesFor`, `recoverTemporaries`. Nothing enumerates the store.
- `ReviewStore.read()` returns `generations`; no caller consumes it.
- `renderHumanFilingReport()` is called only from two test files. Its
  `FilingReportReview` cannot express staleness or corruption.
- `reviewerAuthority.ts` pushes `sourceSha: '0'.repeat(40)` into every
  `IntelHistoryEntry`, in two places.
- `IntelHistoryEntry` has no expectation or semantic-contract identity.
- `classifyRecurrence`'s regression branch tests
  `latest.sourceSha !== undefined`, which `assertHistoryEntry` has already
  guaranteed.
- The predecessor `REPORT.md` records `Implementation anchor:
  DISCOVER_FROM_GIT` for a value that was known before that document was
  committed.

## Scope

Review-store inventory, history and diagnostics; the CLI and the Control
Center review-operations view; review-aware human filing; historical identity
propagation and the recurrence repair; the terminal-anchor repair; hardening,
property, corruption, concurrency, determinism, privacy, mutation, scale and
browser certification; documentation reconciliation.

## Non-Goals

Redesigning the store or its schema. Retention, archival, pruning or deletion.
A derived index without measurement. Organizational authority. External
filing.

## Safety Constraints

Repository-local and offline. The inventory holds a read-only store handle, so
a destructive operation is structurally unavailable rather than merely absent.
Unknown store entries are never opened and never named in output. No
publication path enters the cone. Every projected receipt keeps
`organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`.

## Architecture / Approach

See `openspec/changes/nightwatch-review-operations-history-filing-v1/design.md`.
The load-bearing decisions:

- Read-only by construction (`createIfMissing: false`), because the writable
  handle's `readJson` `chmod`s the root and would mutate store metadata.
- Integrity and currentness are independent axes; a store-only inventory
  reports currentness `UNKNOWN` rather than inventing it.
- Health is a precedence *plus* the full condition set; stale history is the
  least severe condition, never corruption.
- Unknown entries are reported by name digest, because an unknown filename is
  the one string in the store that this repository did not choose.
- History chronology is `storedAt` → `reviewedAt` → `reviewIdentity`; the
  current generation is proven by `verifyReviewCurrent`, never assumed to be
  the newest.
- Recurrence gains two tightenings and no loosening.

## Milestones

- [x] M0 — Campaign open: OpenSpec, task records, execution prompt, routing. — DONE
- [x] M1 — DEF-RO-1 terminal-anchor repair and its mechanical rule. — DONE
- [x] M2 — `listEntries()` and the inventory core — DONE
- [x] M3 — The history core — DONE
- [x] M4 — Historical identity propagation and DEF-RO-2 — DONE
- [x] M5 — Review-aware filing report and its production path — DONE
- [x] M6 — The `nightwatch-review` CLI — DONE
- [x] M7 — Control Center contracts, adapter, authority, routes and view — DONE
- [x] M8 — Hardening rule, proven to bite — DONE
- [x] M9 — Determinism, order-independence, concurrency, corruption, property — DONE
      tests, privacy red team.
- [x] M10 — Scale at 10k / 25k / 50k — DONE
- [x] M11 — Mutation campaign, >= 30 mutations, zero unexplained survivors — DONE
- [x] M12 — Browser qualification, >= 30 loops — DONE
- [x] M13 — Documentation, REPORT, full regression, `gate:local`, — DONE
      `gate:clean` on a proven fresh install.

## Validation Strategy

Per milestone: the narrowest decisive check first, then the suite it belongs
to. At close: `typecheck`, `hardening:check`, `agent:check`, `project:check`,
`handoff:check`, the review-store / inventory / history / reviewer /
findingIntel / filing-report / privacy suites, Control Center and browser
lanes, determinism and order-independence, property tests, the corruption
corpus, the concurrency matrix, the mutation campaign, scale measurement,
two full regression passes, `gate:local`, and `gate:clean` with a proven
fresh install.

Every new hardening check must prove definition/invocation parity, every
branch, every relevant surface, and that a duplicate safe occurrence cannot
mask an unsafe one — by mutating the real guarded artifact.

## Decision Log

- D-RO-1: the inventory holds a `createIfMissing: false` store handle, so its
  write methods refuse. Read-only becomes structural rather than behavioural,
  and the writable handle's `readJson` `chmod` of the root is avoided.
- D-RO-2: integrity and currentness are independent axes. A store-only
  inventory reports currentness `UNKNOWN` rather than inventing the one fact
  it cannot know without the current artifacts.
- D-RO-3: health carries the complete condition set plus a highest-precedence
  classification. `STALE_HISTORY_PRESENT` is the least severe condition.
- D-RO-4: unknown store entries are reported by name digest and size only.
- D-RO-5: history chronology is `storedAt` → `reviewedAt` → `reviewIdentity`;
  the current generation is proven, never assumed to be the newest.
- D-RO-6: no review-store envelope v2. Adding identity to the binding would
  change every review identity and mark every stored review corrupt.
- D-RO-7: recurrence gains two tightenings and no loosening; fingerprint
  identity remains the only match key.

## Discoveries

Recorded in `STATE.md` under `## Discoveries` as they are made.

## Deferred Work

- A review-store envelope v2 carrying per-generation semantic identity.
- Any retention, archival or pruning policy. Evidence is produced here; the
  decision is the owner's and requires separate authorization.

## Completion Criteria

Brief section 57 in full: inventory, history, filing, scale, safety and
verification. Zero unexplained mutation survivors, zero destructive
review-store operations, a truthful documentation set, a clean workspace, and
`HEAD == origin/main` at close.

