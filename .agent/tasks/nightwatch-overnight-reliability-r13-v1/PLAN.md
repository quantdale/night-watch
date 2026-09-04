# R-13 Overnight Reliability, Stress, Determinism + Clean-Clone Certification

Task ID: nightwatch-overnight-reliability-r13-v1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

After R-13, the repeatability of everything R-12 through C-15c built is
measured rather than assumed: determinism across fresh processes, order
independence, lifecycle and collision robustness, concurrency safety, scale
invariance, seeded properties, second-topology clean behavior, regression
stability, UI endurance, leak freedom, receipt durability, and
mutation-probe bite.

## Starting State

Canonical `main` at `d3a464d` (C-15c integrated). C-15c implementation is
COMPLETE: `gate:local` PASS
(`receipt:sha256:4e6b059312e2281785e38400`), `gate:clean` PASS
(`clean-receipt:sha256:6c14424bbbeb876dbd3c6d95`), browser matrix 2/2,
synthetic campaign 916/916, semantic compatibility 2,033/2,020/13/0,
siblingWrites 0. Exact-head CI (run `33833574821`, attempts 1–4) is
EXTERNAL_BLOCKER: GitHub assigns no runner, zero steps run, no annotations,
and the workflow file is byte-identical to the last green run.

## Scope

Fresh-process determinism repetitions (§92); source-scan repeatability
(§93); order independence (§94); lifecycle stress (§95); port collision
(§96); concurrency (§97); map scale permutations (§98); seeded properties
(§99); clean-clone B (§100); regression repetition (§101); semantic-compat
and synthetic long runs (§102–§103); UI endurance (§104); leak accounting
(§105); receipt durability (§106); the hardening mutation campaign (§107);
the long clean gate (§108); exact-head CI (§109); one optional second clean
(§110); closure.

## Non-Goals

No implementation changes of any kind — no features, no refactors, no
threshold tuning, no "make the battery fast" edits. No CI re-runs without a
changed hypothesis. No production, NEXT or DEV contact. No credential or
access acquisition. C-12 is not begun.

## Safety Constraints

Probes live in /tmp/r13, never in the repo tree, so no probe artifact can
become certification surface. The UI endurance driver is a plain playwright
script, not a `.browser.ts` test, so the R-12 registration totality is never
perturbed. Every adversarial mutation is restored before the next step; the
tree is verified clean before every gate observation. No writes execute
while `gate:clean` runs. Sibling repositories stay read-only; siblingWrites
must remain 0.

## Architecture / Approach

One owned session worktree; read-only verification against it. Fresh
processes for every determinism observation (no shared module state).
Fixed seeds and fixed iteration counts for every randomized check.
Separate observations, never retries: pass/pass/fail is instability, not a
call for one more run. Failures classified per the SPEC vocabulary before
any second execution, which then tests the written hypothesis.

## Milestones

### M1 — Record, route, harness (before any battery)

SPEC, PLAN, STATE, REPORT, the OpenSpec change, ACTIVE_TASK and
EXECUTION_PROMPT routing, and the live-state block — written BEFORE any gate
battery runs. A `/tmp/r13/` probe area holds the determinism harness, the
seeded property runner, and the UI endurance driver.

### M2 — Fresh-process determinism + source-scan repeatability (§92, §93)

At least 10 independent repetitions of compact deterministic projections in
fresh Node processes: source snapshot digest, operation ordering,
completeness, C-02b proto facts, C-03 topology facts, C-04 frontend edges,
C-05 universe projection, C-08 binding projection, C-09 expectation
projection, EIG ranking, System Map graph/layout digests, gate receipt
canonicalization. Timing fields excluded. Then 3–5 complete fresh-process
source-intelligence scans compared on repositories, files, operations,
completeness, truncation, digests, identities. Unexpected drift with
unchanged source is a DEFECT.

### M3 — Order, lifecycle, collision, concurrency (§94–§97)

Campaign suites (C-02a, C-02b, C-03, C-04, C-06, C-05, C-08, C-09, C-11,
C-15b, C-15c) in at least three different orders. 25–100 deterministic
lifecycle iterations over port lease, child-process lifecycle, temp dirs,
clean receipt, atomic receipt write, session worktree lifecycle, Control
Center port ownership. Port-collision matrix: preferred free/occupied,
consecutive occupied, stale/live/malformed/symlink lease, concurrent
allocators, exhaustion. Safe synthetic concurrency over budget
reservations, scan cache, projection, layout, receipt writes, session
ownership.

### M4 — Map scale + seeded properties (§98, §99)

Maximum-permission projections (~1,000 nodes / ~2,000 edges) under multiple
input-order permutations, repeated layouts, all levels and query paths;
digests must be order-invariant. Bounded seeded property runs (recorded
seeds, fixed counts): bounds, drops, fact-lattice joins,
UNKNOWN/UNMEASURED preservation, admission, expectation, deployment and EIG
authority boundaries, canonical map identity.

### M5 — Second topology + repetition long runs (§100–§103)

Clean B: a fresh clone/worktree in a different parent directory. Three
complete independent canonical-regression passes — pass/pass/fail is NOT
stable. Semantic compatibility and the synthetic campaign 2+ more times
each; count drift without source change is a DEFECT.

### M6 — UI endurance + leaks + receipt durability (§104–§106)

20+ automated L1→L2→L3→L4→query→back loops against synthetic/local data:
listener growth, console errors, DOM growth, selection/query staleness,
layout corruption. Before/after resource accounting. One deliberately
triggered synthetic failure proving receipt durability — then restored.

### M7 — Hardening mutation campaign + long clean gate (§107, §108)

Temporary adversarial mutations, each restored, each with a demonstrated
bite: manifest registration, admission, no-read-unapproved, deployment
classification, W-SPEC boundary, EIG independence, fact-category,
ProjectionBound, layout identity, GET/HEAD boundary, prod-store exclusion.
Then `gate:clean` with zero writes during execution.

### M8 — Exact-head CI + optional second clean + closure (§109, §110)

Re-attempt exact-head CI only on a changed hypothesis. On green: close C-15c
and R-13 per the certification pattern. If time remains with no actionable
work left, ONE additional independent clean certification from a new
temporary topology. Then release the session and remove the worktree.

## Validation Strategy

typecheck, hardening, handoff, project, agent, agent audit, workspace, gate
inventory, semantic-compat long runs, synthetic long runs, browser matrix,
UI endurance driver, canonical regression ×3, gate:local, gate:clean (A +
B), exact-head GitHub Actions. No implementation changes exist to validate;
the battery validates repeatability.

## Decision Log

- Probes live in /tmp, never in the repo: a probe file inside the tree could
  be picked up by a manifest glob and become fake certification surface.
- The UI endurance driver is a plain playwright script, not a `.browser.ts`
  test: adding then deleting a test file inside the tree risks exactly the
  registration-drift class R-12 closed.
- Rerun policy for the externally blocked CI: attempts 1–4 already falsified
  "transient"; the next attempt needs "GitHub recovered" evidence or a new
  head to certify.

## Discoveries

- C-15c exact-head CI (run 33833574821, attempts 1–4): EXTERNAL_BLOCKER with
  an identical no-runner/zero-step/no-annotation signature; workflow file
  byte-identical to the last green run.
- C-06G gate assessed from the C-03 REPORT (service topology PROVEN but
  ouchan enumeration TRUNCATED, `repositoryCompleteProof: false`):
  `C06G_BLOCKED_BY_METHOD_BINDING_OR_INVENTORY_COMPLETENESS`.

## Deferred Work

C-12 P1 passive production observation remains NOT AUTHORIZED and is the
next production critical-path campaign pending new explicit owner
authorization. C-08b stays organizationally blocked. C-07 DEV stays blocked
on the internal evidence blocker. C-13/C-14 are out of scope.

## Completion Criteria

The nineteen acceptance rows of REPORT.md, each with exact evidence, plus
the long clean gate green, plus exact-head CI green at the release
checkpoint — or, where GitHub remains externally blocked, a truthful
EXTERNAL_BLOCKER record with full local evidence and zero unauthorized
contact.
