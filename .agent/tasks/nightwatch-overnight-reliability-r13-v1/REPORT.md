# REPORT — R-13 Overnight Reliability, Stress, Determinism + Clean-Clone Certification

Task ID: nightwatch-overnight-reliability-r13-v1
Phase: OVERNIGHT_RELIABILITY_R13_V1
Status: IN_PROGRESS
Starting SHA: `d3a464de97225f91cd425b7922b53238a02dc981`

## Requirement ledger

| # | Acceptance requirement (§) | Status | Evidence |
|---|---|---|---|
| 1 | Fresh-process determinism ×10+ (§92) | PASS | /tmp/r13/determinism.mjs, 12 fresh processes byte-identical: `srcsnapshot:sha256:28208874bacd94ff8184b02e`, 8 repos, 4,713 files, 1,851 ops, 15 proto descriptors, 12/13 bindings PROVEN, discovery `953d61d913960c6599555481`, L1 graph `218611b442519dba206dd73b` / layout `2e4f896c04e9da92c13d05e9`, EIG `331d35d6d0d85c31021e87b6` |
| 2 | Source-scan repeatability 3–5× (§93) | PASS | Covered by construction: each of the 12 observations is a complete fresh-process scanSource+discoverSourceSurfaces (repos/files/ops/completeness/truncation/digests compared); zero drift |
| 3 | Test-order independence (§94) | PASS | 19 campaign suites (C-02a…C-15c) in manifest/reverse/rotated order: 597/597/597 passed, 0 failed |
| 4 | Lifecycle stress 25–100 iters (§95) | PASS | /tmp/r13/lifecycle.mjs: temp churn 100/0 leaked; receipts 50/50 + stale+malformed fail-closed; server 25 cycles fd-neutral (post-warm-up); workspace-integrity 25/25; worktrees 10/10 clean; concurrent receipts 8×10 uncorrupted |
| 5 | Port-collision matrix (§96) | IN_PROGRESS | Registered suites cover free/occupied/consecutive/exhaustion/live/stale/malformed/symlink/concurrent (R-11); R-13 repetition run pending in M5 regression battery |
| 6 | Concurrency stress (§97) | PASS | lifecycle.mjs §6: 8 workers × 10 same-file receipt writes, 0 failures, final always parseable (rename-atomicity); cross-process allocator coverage via registered stress suite repetition in M5 |
| 7 | Map scale permutations (§98) | PASS | /tmp/r13/mapScale.mjs: 7 input orders (identity/reverse/5 seeds) at 1,000 nodes / 200 dropped → 1 unique graph+layout digest; L1–L4 + all 8 queries laid out; 5× layout repeat deterministic |
| 8 | Seeded property tests (§99) | PASS | /tmp/r13/properties.mjs seed 20260904: 9 properties × 200 iters (bounds/drops/fact-lattice/semantics/unmeasured/admission/deployment/eig-containment) = 1,801 checks, 0 failures; 1 probe defect (DEF-R13-1, probe-side, fixed) |
| 9 | Clean-clone B topology (§100) | NOT_STARTED | — |
| 10 | Full regression ×3 (§101) | NOT_STARTED | — |
| 11 | Semantic-compat long run (§102) | NOT_STARTED | — |
| 12 | Synthetic campaign long run (§103) | NOT_STARTED | — |
| 13 | UI endurance 20+ loops (§104) | NOT_STARTED | — |
| 14 | Resource-leak accounting (§105) | NOT_STARTED | — |
| 15 | Failure-receipt durability (§106) | NOT_STARTED | — |
| 16 | Hardening mutation campaign (§107) | NOT_STARTED | — |
| 17 | Long clean gate (§108) | NOT_STARTED | — |
| 18 | Exact-head CI (§109) | BLOCKED | EXTERNAL_BLOCKER — run 33833574821 attempts 1–4, no runner assigned; re-attempt on changed hypothesis |
| 19 | Optional second clean (§110) | NOT_STARTED | — |

## Outcome

Not yet complete. Scaffolding written; battery pending.
