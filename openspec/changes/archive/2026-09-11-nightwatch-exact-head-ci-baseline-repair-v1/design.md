# Design — Exact-Head CI Baseline Repair and Truth Reconciliation

## 1. The shared shape of both defects

Both failures asserted a property of the DEVELOPER'S HOST as though it were a
property of this repository. The sibling Alphaus source root and the
Bubblewrap binary are both host-provided INPUTS that a checkout is not entitled
to assume.

The repair is the same in both cases and is not a skip. Each test now
discriminates on a value the SYSTEM UNDER TEST reports — never on an
environment variable and never on a host path probe — and asserts the
behaviour that is correct for the host it is running on:

- where the capability is present, the original deep assertions run unchanged
  and at full strength;
- where it is absent, the same test proves the FAIL-CLOSED path.

The second branch is new coverage. Before this campaign nothing asserted that
an absent sibling root yields no census and no proven population, or that an
unavailable containment envelope is uniformly unproven and is REFUSED by
`assertL6RuntimeCapability`.

## 2. DEF-CI-02 — one containment predicate

`l6ContainmentAvailability()` becomes the single place that decides whether a
host can provide the envelope. `qualifyL6RuntimeCapability()` consults it
before probing, and the test suite consults it to classify itself, so the
runtime and its regression suite cannot disagree about what the host supports.

Availability is NOT authority. A host reporting `available: true` has cleared a
precondition and nothing more; proof still comes only from
`qualifyL6RuntimeCapability` plus `assertL6RuntimeCapability`.

The suite keeps `mode: 'serial'`, which is resource isolation for tests that
bind ports and spawn detached namespace children. The cascade is addressed by
making every case pass in both topologies, not by loosening isolation.

The classification invariant is that a capability is either fully proven or
explicitly blocked, and never partly proven. It is deliberately
blocker-code-agnostic: any well-formed blocked classification is accepted, so a
future host that blocks for a different reason stays correct here.

## 3. DEF-CI-01 — population before content

A census states the population it measured, and every content claim is
meaningful only over a population that was actually READ. Source availability
therefore becomes the precondition, asserted first.

The discriminator is the operator's own per-repository status. Notably
`completeness.state` is NOT usable for this: it reports `UNKNOWN` even on a
fully populated host, because file enumeration legitimately truncates against
its budget. Byte-stability across three fresh processes — the property the test
exists for — is asserted in BOTH branches, over a wider object than before,
excluding only `performance`, which carries wall-clock timings.

## 4. DEF-CI-03 — a bounded diagnostic boundary

`bin/lib/gate-receipt.mjs` becomes the only path by which anything a child
printed can reach a gate receipt. It is small, pure and separately testable.

The privacy contract is ALLOWLISTING, not redaction. Only integers, tracked
`tests/**` paths with a line number, and fixed enum tokens have any
representation. Assertion values, source contents, environment values, stack
frames, credentials, response bodies and arbitrary child stderr cannot pass
through by accident, and a malformed value is DROPPED rather than sanitized.

`didNotRun` is modelled as its own bucket rather than a kind of skip, because
conflating them is precisely what hid five cases.

The file list moves from a package script string into
`config/synthetic-campaign.v1.json`, so the launcher, `gate:inventory` and
`hardening:check` read one declaration instead of re-parsing a command line.
The gate definition digest is unaffected, because the gate pins command KEYS
rather than command strings.

## 5. The deep-lane requirement

The receipt carries `deepContainmentLane`. The gate REQUIRES `PROVEN` in
`local`, `clean` and `predev`, and records the classification in `ci`.

This mirrors `PATCH_INTEGRITY`'s existing `mode !== 'local'` strictness: a
required group whose STRICTNESS varies by gate mode is established design here.
The invariant itself is constant, and CI still fails closed on a lane that is
missing or unclassifiable rather than merely not proven. The distinction from a
forbidden CI bypass is that the absence is classified, recorded in the
authoritative receipt, and machine-checked — never silent.

## 6. Truth reconciliation

`CI_STATUS` moves to `EXECUTED_FAIL` with observed and executed SHA both
`c3fed38`, which the existing schema already supports. Historical narrative
bound to named zero-step runs is preserved verbatim.

`PROJECT_STATE_CI_EVIDENCE_STALE` fires when the CI-evidence SHA is a strict
ancestor of `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`: an observation taken before
the baseline advanced says nothing about the baseline in force now. Ancestry is
derivable offline, so the staleness is detectable without contacting GitHub.
This is checked against the campaign-start block, which it flags.
