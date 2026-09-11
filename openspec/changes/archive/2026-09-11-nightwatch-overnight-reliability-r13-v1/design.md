# Design — R-13 endurance battery

## Principle

Repeatability is a property of the code under varied execution conditions,
not of one log file. Every battery item varies exactly one condition
(process, order, input order, seed, topology, concurrency, time) while the
source stays fixed, and compares deterministic identities — never timings,
never wall-clock values.

## Battery architecture

- `/tmp/r13/determinism.mjs`: full producer chain (scan → proto index →
  topology → surfaces → L1 → EIG ranking) in N fresh processes; one
  canonical JSON record each; byte-equality required.
- `/tmp/r13/lifecycle.mjs`: temp churn, receipt round-trips + fail-closed
  mismatches, server start/close with fd accounting, workspace-integrity
  repetitions, throwaway worktree add/remove, concurrent same-file receipt
  writers.
- `/tmp/r13/mapScale.mjs`: max-permission projections from 7 input orders;
  digest invariance required.
- `/tmp/r13/properties.mjs`: 9 seeded properties × 200 iterations over
  bounds, drops, fact lattice, semantics, unmeasured, admission, deployment,
  EIG containment.
- Order battery: 19 campaign suites in 3 orders via playwright directly.
- UI endurance: plain playwright driver (not a test file) looping
  L1→L2→L3→L4→query→back 20+ times against loopback synthetic data.
- Clean B: local clone in a different parent directory running the endorsed
  subset — attacks workspace-coincidence fixtures.
- Mutation campaign: temporary edits, each verified to trip its guard, each
  restored; tree verified clean before every gate.

## No-certification-suite declaration

R-13 declares `"suites": []` with an explicit reason in
`config/campaign-certification.v1.json`: it is a verification-only campaign
that certifies through repetition of already-registered suites. An empty
suite set as a declared, reasoned fact — never a silent default.
