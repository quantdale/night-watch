# Proposal — reviewer surface & finding-intelligence scale

Repair DEF-FC-04 and make cross-campaign task/continuity metadata drift
mechanically undetectable-free: the active-task routing and safety block
must bind to the active campaign, and a stale predecessor block must fail
`agent:check` closed rather than pass.

Surface the FC-1 finding intelligence where it changes review outcomes:
a Control Center reviewer experience carrying relationships, probable
duplicates, recurrence, defect classes, expectation provenance,
confidence, Alphaus recommendations, and local review state — with every
element labelled explicitly as mechanical FACT, advisory RECOMMENDATION,
or UNKNOWN. UNKNOWN stays first-class and never renders as a weak yes.

Measure before optimizing. Finding-intelligence cost is measured at
1,000 / 5,000 / 10,000 findings for CPU, resident memory and latency; the
actual quadratic thresholds are located from the measurements, and an
index or algorithm change lands only where a measurement justifies it.

Add large-corpus Control Center testing and endurance, then re-certify:
privacy red team, mutation probes, a fresh `npm ci` clean gate, full
regression, and deterministic fresh-process certification.

Nightwatch local review remains distinct from Alphaus organizational
sign-off; duplicate suggestions remain advisory; no bounty scoring is
introduced; no retry policy is invented to close the campaign. C-12 live
execution, DEV, NEXT and production work are out of scope and the
campaign stops before them.
