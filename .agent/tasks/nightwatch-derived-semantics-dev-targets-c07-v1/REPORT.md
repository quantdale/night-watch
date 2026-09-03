# C-07 Derived Endpoint Semantics + Generated DEV Targets — Report

- Starting SHA: `a34064711d2682f090c4d35079a27f08a7767ea5`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `f03dd21fbd7d433c27b005764ed64a3660cf7a21`
- Certified exact-head checkpoint: `59730491605a09208006f8df14710656a11d7bc1`, run `33817429249`
- Task objective: derive the endpoint semantic registry from mechanically
  established evidence, generate DEV targets that pass the unchanged admission
  chain, and report the funnel honestly.
- Safety events: NONE
- Remaining blockers: DEV execution, on an internal evidence blocker.
- Recommended next phase/task: C-15c System Map V2 HTTP transport.

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | The registry is DERIVED; no hand-authored rule admitted| PASS | `deriveEndpointSemanticRegistry` over 1,851 operations, totality true, every entry naming its evidence basis; the legacy hand-authored registry stays `[]` (probe P6) |
| 2 | Classification vocabulary complete and traceable| PASS | five classifications with `UNKNOWN`, `AMBIGUOUS` and `UNSUPPORTED` kept distinct; seven evidence bases, each traceable |
| 3 | Funnel reported in full with per-reason counts| PASS | considered 1,851 · generated 1,851 · eligible **0** · rejected 1,851; reasons `MUTATION_CAPABLE` 1,187 + `SEMANTICS_UNKNOWN` 485 + `SEMANTICS_AMBIGUOUS` 179 = 1,851 exactly |
| 4 | The ≥ 30 figure evaluated honestly; no threshold weakened| PASS | the ≥ 30 figure is **NOT met**, at 0, with the blocker named: the unchanged admission chain admits none of the 1,851. No threshold weakened |
| 5 | EIG orders admissible targets and cannot promote one| PASS | `orderableTargets` returns only `funnel.eligible`; a mutation-capable target given a maximal EIG score yields an empty ranking (probe P5) |
| 6 | Pre-DEV qualification run and its verdict recorded| PASS | `gate:predev` PASS on eleven groups, `environmentClass: PREDEV`, receipt `receipt:sha256:418bb319a24ab9e68d052f45` |
| 7 | DEV execution status recorded truthfully with its blocker| PASS | DEV execution BLOCKED on an INTERNAL evidence blocker: §7 condition 6 fails because zero targets are admitted. Not an external prerequisite — a DEV storage state exists and its contents were never read |
| 8 | Product findings honest; zero reported as zero| PASS | product findings: **0**, reported as zero. No candidate threshold weakened and nothing fabricated |
| 9 | Zero production contact, zero NEXT contact, DEV count exact| PASS | DEV requests **0** · production contacts **0** · NEXT contacts **0** · credentials acquired **0** · auth configuration unchanged |
| 10 | Regression, local, clean and exact-head CI green; siblingWrites 0; released| PASS | regression 3,579/3,566/13/**0 failed**; `gate:local`, `gate:clean` (siblingWrites 0) and `gate:predev` all PASS; exact-head CI PASS at `5973049`; session released |

## The measurement

| Derived classification | Count | Evidence basis |
|---|---|---|
| `KNOWN_READ` | **0** | `EFFECT_CLOSURE_PROOF` 0 |
| `MUTATION_CAPABLE` | 1,187 | refutation 1,107 + conditional 80 |
| `UNKNOWN` | 485 | `METHOD_ONLY_NO_EFFECT_PROOF` |
| `AMBIGUOUS` | 179 | `ROUTE_IDENTITY_UNPROVEN` |
| `UNSUPPORTED` | 0 | — |

Zero `KNOWN_READ`, because zero operations carry an effect proof. This is a
C-06 result made visible rather than a C-07 one: `READ_ONLY_PROVEN` fell 5 → 0
when the eleven-row catalog stopped classifying, and 6,114 unclassified callee
identities block promotion via `CALLEE_CLASSIFICATION_INCOMPLETE`.

The 485 `UNKNOWN` are the temptation. They are `READ_ONLY_METHOD_ONLY` — the
GET verb and nothing else — and promoting them would produce a registry that
looks productive while asserting a read contract from an HTTP verb, placing 485
operations on a DEV work queue on the strength of one word. A hardening rule
parses that derivation branch and fails if it ever returns anything but
`UNKNOWN`.

## Why zero is the right answer

`gate:predev` PASSES on all eleven groups. **The gates hold.** The reason no DEV
traffic follows is that zero of 1,851 operations are admitted — not that a gate
failed, and not that a credential was missing. A campaign blocked because the
evidence is insufficient reads very differently from one blocked because the
machinery is broken, and this is the former.

Non-vacuity is proven the other way round: a proven-read, runtime-bound,
chain-admitted operation IS eligible, and a test asserts it. So the real zero is
a measurement, not a broken code path.

## CI skip accounting

| `SYNTHETIC_CAMPAIGN` | total | passed | skipped | failed |
|---|---|---|---|---|
| `d863a7f` (post-C-16) | 866 | 827 | 39 | 0 |
| `5973049` (certified) | 889 | 849 | **40** | 0 |
| delta | +23 | **+22** | **+1** | 0 |

The +1 is the single sibling-gated case (the real-population measurement),
predicted before the run. 22 of the 23 new cases execute in CI.

## Defects

None. One process omission, repeated from C-16 and recorded rather than
smoothed over: I ran `gate:predev` before writing C-07's STATE, REPORT,
OpenSpec change and routing, so it failed at `HANDOFF_TRUTH`. The sequence is
scaffolding before battery, and I got it wrong twice in consecutive campaigns.

Status: COMPLETE
