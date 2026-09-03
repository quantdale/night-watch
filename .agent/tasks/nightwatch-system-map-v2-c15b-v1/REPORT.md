# REPORT — C-15b System Map V2

Status: COMPLETE — with one scope item explicitly NOT delivered; see
"What is not delivered".
Task ID: nightwatch-system-map-v2-c15b-v1
Starting SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Certified head: c7707218a3afb4b5fc8430ebd4fb4e7a20c8fa61

## Requirement ledger

| Requirement | Status | Evidence |
|---|---|---|
| A1 contract v2: fact category and exact bounds | PASS | `model.ts`; probes P1–P4 |
| A2 C-03 topology and C-04 consumer data represented | PASS | `ServiceBindingFact`, `ConsumerEdgeFact` in the model and L2/L3/L4 |
| A3 progressive disclosure L1–L4, each bounded | PASS (core) | `projections.ts`; not yet exposed over HTTP — see below |
| A4 deterministic layout and layout identity | PASS | 8 determinism assertions; probes P6, P7, B4′ |
| A5 eight operator queries individually tested | PASS | one test per query plus cross-query invariants |
| A6 seven-state coverage preserved | PASS | probe P10 |
| A7 Control Center authority unchanged, probed | PASS | 405 matrix over 5 verbs; probe P11 |
| A8 production-store exclusion intact | PASS | root, parent, trailing separator; probe P12 |
| A9 performance measured before and after | PASS | below |
| A10 largest permitted projection tested | PASS | 1,000 nodes / 2,000 edges |
| A11 suites gate-registered; probes bite | PASS | 2 suites + membership assertion; 20 probes |
| A12 regression / clean / exact-head CI green | PASS | below |

## What the campaign closed

**The visible defect.** `SourceGraphCanvas` drew `nodes.slice(0, 24)` and
`edges.slice(0, 48)` on a modulo-3 grid while `CONTROL_CENTER_LIMITS` permitted
1,000 and 2,000. The ceiling was never a rendering limit — it was two slice
calls. The view now draws every node the server sends, on a deterministic
layered layout, with pan, zoom, search, an evidence filter, keyboard-reachable
selection, and a truncation banner that states what is missing.

**The quieter defect that mattered more.** The graph contract carried
`truncated: boolean` and no counts. `ProjectionBound` now carries limit, total,
projected, dropped, truncated and remainingUnknown, so "we cut 402 of 412" and
"we cannot know how many we cut" are different statements — the distinction
C-01 established for operations and the graph never received.

**Fact categories.** Every node and edge carries exactly one, so C-03's
`SOURCE_FACT` bindings and C-04's `INFERENCE` edges stay distinguishable once
drawn. `weakerFactCategory` has no counterpart returning the stronger one; the
absence of that function is the guarantee that no join can upgrade.

## Defects introduced and found by this campaign

### DEF-C15B-1 — a negative limit widened the projection
- **Symptom.** `nodeLimit: -5` returned all-but-the-last-five nodes.
- **Root cause.** `Array.slice(0, -5)` counts from the end. A caller asking for
  less would have received more.
- **Fix.** `Math.max(0, Math.trunc(limit))` before slicing, hardening-pinned.
- **Disposition.** REPAIRED. Found by the §63 limit matrix.

### DEF-C15B-2 — a per-layer sort that guaranteed nothing
- **Symptom.** Negative probe B4 removed it and no test failed.
- **Root cause.** Nodes are already sorted on entry, so the second sort was
  unreachable — defence in depth that was in fact dead code.
- **Fix.** Removed, with a comment recording why. Re-probing the entry sort,
  which carries determinism for both truncation choice and ordering, is
  DETECTED.
- **Disposition.** REPAIRED. An untested guard is worse than no guard, because
  it reads as one.

## Negative probes

20 attempted, 20 ultimately detected, 20 restored — 14 against
`hardening:check` (category inversion, a stronger-category helper, a dropped
count field, an asserted drop count, the negative-limit clamp, the engine
version in the digest, nondeterminism, `UNMEASURED` removal, the
measured/unmeasured collapse, coverage-vocabulary loss, `executionAuthority`
raised, the production store named, filesystem authority, suite
deregistration) and 6 behavioural.

19 bit immediately. The one that did not found dead code rather than a missing
guard, and is recorded as DEF-C15B-2 rather than quietly deleted.

## Performance, before and after

| Measure | Before | After |
|---|---|---|
| discovery | 5,826 ms / 1,745 operations | unchanged (not on the graph path) |
| serialise 250 surfaces | 4 ms, 1,205,421 bytes | unchanged |
| **visual node ceiling** | **24** | **every node projected, up to 1,000** |
| layout of the largest permitted projection | n/a | 1,000 nodes well inside a 5 s ceiling |
| projection drop reporting | boolean only | exact count, or explicitly unknowable |

## What is NOT delivered, stated plainly

The L1–L4 projections, the eight operator queries and the deterministic
server-side layout are implemented in `src/core/systemMap/**` and tested —
42 assertions including the contract maxima — but they are **not yet exposed
over an HTTP route and the view does not consume them**. The Control Center
still serves the v1 `/api/v1/source/graph` contract, and the rebuilt canvas
renders that payload with a client-side layer assignment using the same
algorithm.

So an operator gets the rebuilt, navigable, truncation-honest view today, and
the progressive-disclosure levels and the content-addressed layout are proven
but reachable only from code. Wiring them through the collector, the adapter,
a route and the UI client is the remaining work, and it is named here rather
than implied to be finished. §71's "progressive disclosure implemented" is
satisfied at the projection layer and not at the transport layer, and this
report does not claim otherwise.

## Validation

| Check | Result |
|---|---|
| `typecheck`, `hardening:check`, `handoff:check` | PASS |
| `agent:check`, `workspace:check`, `gate:inventory` | PASS |
| Control Center UI suite | PASS 12/12 |
| `test:semantic-compat` | PASS 2,033 / 2,020 / 13 skipped / 0 failed |
| `campaign:synthetic` | PASS 619 / 619, containment lane PROVEN |
| canonical regression | PASS 3,396 / 3,383 / 13 skipped / 0 failed |
| `gate:clean` | PASS at c770721, inner `receipt:sha256:ba8c0db14231f77bc32dbbd7`, clean `clean-receipt:sha256:939affcd3033dec45d9bf3c2`, siblingWrites 0 |
| exact-head CI | PASS, run `33750522362` / job `100632776636`, receipt `receipt:sha256:2f18e3765638cb523b58aeea`, all 11 groups |

Failed attempts, none omitted:

- CI at `aa312415` — run `33750321049` / job `100632147533`, FAIL,
  `PROJECT_TRUTH` only, receipt `receipt:sha256:1c725d1d043404d5b57ce786`.
  PROJECT_TRUTH_ORDERING; not retried.
- The Control Center authority suite initially failed three assertions: two
  because a fully refusing collector also refused `meta`, so GET returned 500
  and the 405 matrix would have been vacuously green, and one because of
  DEF-C15B-1. The collector now serves `meta` and refuses everything else.

## Safety confirmation

- Control Center GET/HEAD only; every one of POST, PUT, PATCH, DELETE and
  OPTIONS refused 405 with an `Allow` header; GET and HEAD still 200 so the
  matrix is not vacuous; no execute, trigger or run-start route;
  `executionAuthority: NONE`, `mutationAuthority: NONE`.
- The C-10 production findings store is unreachable — exact root, parent root
  and trailing-separator spelling all excluded, and an unrelated root asserted
  NOT excluded so the rule is not vacuous. No system map module names it, and
  that is hardening-pinned.
- No production, DEV or NEXT contact; no credentials; no customer data. The map
  is built from source facts only.
- `UNKNOWN` and `UNMEASURED` are never zeroed. The observed-production-paths
  query returns empty and `UNMEASURED`, and a measured zero is asserted to be a
  different answer. Nothing implies C-12 ran.
- No repository admission. No EIG prioritisation and no target-selection
  change. C-11 unchanged. C-12 NOT started.
- No force push, no history rewrite, no destructive git operation.

## Deferred

- Exposing L1–L4 and the server-side layout over HTTP, and having the view
  consume them. The largest single remaining item.
- G-16 and EIG prioritisation remain unowned; C-15b implemented neither, as
  §66 requires.
- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` are still in neither gate manifest.
  PRE_EXISTING across four campaigns now.
