# Proposal — R-12 Certification Manifest + Project Truth Closure

## Why

Nightwatch's authoritative quality gate has eleven required groups. Exactly
three of them run tests, and each runs only the suites named in a versioned
manifest. No required group runs the full canonical regression. A suite that
is absent from those manifests therefore never executes in `gate:local`,
`gate:clean` or CI — no matter how green it is on a developer machine.

Six campaign certification suites are in that position today: C-01's four
completeness suites, C-02a's OpenAPI admission suite and C-06's PHP
read-only-proof suite. These carry load-bearing source-completeness and
proof-safety guarantees, and the gate has never run any of them.

The omission is structural, not clerical. Registration is enforced by
hand-written per-campaign loops in `bin/hardening-check.mjs`. Four campaigns
wrote one; three did not, and nothing noticed.

## What changes

1. The six suites are registered in the correct authoritative lane.
2. A new versioned registry, `config/campaign-certification.v1.json`, becomes
   the single authority for which suites certify which campaign, in which lane.
3. One generic hardening rule enforces registry totality against the campaign
   task ledger, suite existence on disk, and lane registration. The four
   hand-written loops are retired.
4. The master task ledger's normative status is corrected for C-02b, C-03,
   C-04 and C-11, and for the C-15b half of the C-15 row.
5. `docs/CURRENT_STATE.md`'s checkpoint prose is reconciled to the machine
   block it drifted from, and its malformed table row is repaired.

## What does not change

No campaign is added. No repository is admitted. No source-analysis behaviour
changes. No existing rule is weakened so that a suite can register. There is
no production or NEXT contact, and C-12 is not begun.

## Truthfulness constraint

C-02a's real-source block requires the read-only sibling checkouts and already
self-skips without them. Registering it is honest precisely because the
synthetic-campaign receipt records `skipped` rather than counting the block as
a pass. This change adds no deterministic stand-in that would claim real-source
execution CI did not perform.
