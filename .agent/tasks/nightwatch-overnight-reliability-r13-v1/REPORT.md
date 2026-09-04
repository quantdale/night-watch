# REPORT — R-13 Overnight Reliability, Stress, Determinism + Clean-Clone Certification

Task ID: nightwatch-overnight-reliability-r13-v1
Phase: OVERNIGHT_RELIABILITY_R13_V1
Status: COMPLETE
Starting SHA: `d3a464de97225f91cd425b7922b53238a02dc981`

## Requirement ledger

| # | Acceptance requirement (§) | Status | Evidence |
| 1 | Fresh-process determinism ×10+ (§92) | PASS | /tmp/r13/determinism.mjs, 12 fresh processes byte-identical: `srcsnapshot:sha256:28208874bacd94ff8184b02e`, 8 repos, 4,713 files, 1,851 ops, 15 proto descriptors, 12/13 bindings PROVEN, discovery `953d61d913960c6599555481`, L1 graph `218611b442519dba206dd73b` / layout `2e4f896c04e9da92c13d05e9`, EIG `331d35d6d0d85c31021e87b6` |
| 2 | Source-scan repeatability 3–5× (§93) | PASS | Covered by construction: each of the 12 observations is a complete fresh-process scanSource+discoverSourceSurfaces (repos/files/ops/completeness/truncation/digests compared); zero drift |
| 3 | Test-order independence (§94) | PASS | 19 campaign suites (C-02a…C-15c) in manifest/reverse/rotated order: 597/597/597 passed, 0 failed |
| 4 | Lifecycle stress 25–100 iters (§95) | PASS | /tmp/r13/lifecycle.mjs: temp churn 100/0 leaked; receipts 50/50 + stale+malformed fail-closed; server 25 cycles fd-neutral (post-warm-up); workspace-integrity 25/25; worktrees 10/10 clean; concurrent receipts 8×10 uncorrupted |
| 5 | Port-collision matrix (§96) | PASS | R-11 lease suites repeated: Clean B 622-suite run + 3 full regressions all green (determinism: free/occupied/consecutive/exhaustion/live/stale/malformed/symlink/second-allocator/release; stress: 1,000 rapid-reclaim + parallel allocators + occupied-preferred + child-crash cycles) |
| 6 | Concurrency stress (§97) | PASS | lifecycle.mjs §6: 8 workers × 10 same-file receipt writes, 0 failures, final always parseable (rename-atomicity); cross-process allocator coverage via registered stress suite repetition in M5 |
| 7 | Map scale permutations (§98) | PASS | /tmp/r13/mapScale.mjs: 7 input orders (identity/reverse/5 seeds) at 1,000 nodes / 200 dropped → 1 unique graph+layout digest; L1–L4 + all 8 queries laid out; 5× layout repeat deterministic |
| 8 | Seeded property tests (§99) | PASS | /tmp/r13/properties.mjs seed 20260904: 9 properties × 200 iters (bounds/drops/fact-lattice/semantics/unmeasured/admission/deployment/eig-containment) = 1,801 checks, 0 failures; 1 probe defect (DEF-R13-1, probe-side, fixed) |
| 9 | Clean-clone B topology (§100) | PASS | /tmp/r13/cleanB at b4e0832 (different parent): install/typecheck/hardening/handoff/project/agent all PASS; 21 suites 622/622 passed. First attempt caught 3 R-13 scaffolding defects (DEF-R13-3) — the topology doing its job |
| 10 | Full regression ×3 (§101) | PASS | 3 sequential `test:unit` passes: 3,572 total, 3,559 passed + 13 skipped + 0 failed each, exits 0/0/0 — stable, no averaging |
| 11 | Semantic-compat long run (§102) | PASS | 2nd observation identical: 146 files, 2,033/2,020/13/0, zero drift |
| 12 | Synthetic campaign long run (§103) | PASS | 3 observations identical: 40 files, 916/916, deepContainmentLane PROVEN, 0 failed |
| 13 | UI endurance 20+ loops (§104) | PASS | /tmp/r13/uiEndurance.mjs v2: 22/22 TRUE-depth loops (L1→L2→L3→L4→query→back, per-loop level proof), 0 page/console errors, 0 external requests, DOM steady 130±4 (loop-0 settle aside), loop times ~300ms with one 3.3s transient; v1's shallow loops withdrawn after the non-vacuity probe exposed them |
| 14 | Resource-leak accounting (§105) | PASS | 0 chromium processes, 0 stray listeners/leases/worktrees; 2 crashed-run scratch dirs found and removed; phase23 0-byte suite-owned jsonl identified (OBS-R13-1, no functional impact, removed); sibling repos verified untouched (all dirt pre-dates the session) |
| 15 | Failure-receipt durability (§106) | PASS | Throwaway-clone gate with committed synthetic failure: SEMANTIC_COMPATIBILITY TEST_FAILURE, counts 2034/2020/13/1, location `nightwatchHygiene.test.ts:169`, 4 groups NOT_RUN, LOCAL, digest valid, persisted copy matches; dirty-tree variant fail-closed (PROJECT_TRUTH TEST_FAILURE, 6 NOT_RUN); clone removed |
| 16 | Hardening mutation campaign (§107) | PASS | 13 probes, 13 bites, 13 byte-identical restores (registry, R-12 totality, admission 9th-key, ProjectionBound, UI coercion, authority, POST dispatch, UNMEASURED, W-SPEC, EIG, deployment vocab post-fix, prod-store, layout digest-input). DEF-R13-4 (substring-weak vocabulary check) repaired + re-probed. DEF-R13-5 (V2 focus resolution, 4 layers) repaired: c15c 34/34, server 44/44, UI 12/12, browser 2/2, endurance 22/22, L1 digests identical. Final hardening PASS |
| 17 | Long clean gate (§108) | PASS | Authoritative: gate:clean PASS at be7e954 (clean-receipt:sha256:231ff417d1b30856dbf9052a, 11/11, inner 4497080e, siblingWrites 0) with zero concurrent writes. Supplementary: 2bb865e PASS with a documented concurrent-edit caveat (clone-isolated, HEAD-immobile) |
| 18 | Exact-head CI (§109) | BLOCKED | EXTERNAL_BLOCKER — runs 33833574821 (d3a464d, attempts 1–5) and 33841274580 (be7e954, attempt 6): no runner assigned, zero steps, no annotations every time; workflow file byte-identical to the last green run; new-head re-attempt changed nothing — the block is head-independent |
| 19 | Optional second clean (§110) | PASS | Four independent clean-gate certifications (82e3a49, 9a1e85a, 2bb865e-supplementary, be7e954-authoritative clean-receipt:sha256:231ff417d1b30856dbf9052a) plus Clean B in a different parent directory |

## Outcome

R-13 executed the full overnight endurance battery with zero implementation
features and two demonstrated-defect repairs (DEF-R13-4 guard hardening,
DEF-R13-5 V2 focus resolution). 18 of 19 rows PASS with exact evidence; row 18
(exact-head CI) is BLOCKED on an external GitHub execution failure (6 attempts
across 2 heads, identical no-runner signature); row 19 (optional second clean)
is satisfied by construction — four independent clean-gate certifications
plus Clean B.
Repeatability is measured: 12 identical fresh-process observations, 3 identical
regression passes, 3 identical synthetic campaigns, 2 identical semantic runs,
7 order-invariant map digests, 1,801/1,801 properties, 22/22 true-depth UI
loops, 13/13 guard bites with byte-identical restores.
