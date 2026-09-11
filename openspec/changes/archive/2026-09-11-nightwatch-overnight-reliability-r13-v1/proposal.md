# Proposal — R-13 Overnight Reliability, Stress, Determinism + Clean-Clone Certification

## Why

R-12 through C-15c changed the certification manifests, the source universe,
deployment binding, spec expectations, EIG ranking, derived semantics, and the
System Map transport. Each campaign closed on one green battery. One green run
after that much architectural change measures the code once; it does not
measure repeatability, order independence, collision behavior, concurrency
safety, scale invariance, second-topology behavior, or regression stability.

## What

A verification-only campaign: repeat every load-bearing producer in fresh
processes, permute orders and inputs, collide ports, stress concurrency,
exhaust the map scale bounds, run seeded properties, certify from a second
clean topology, repeat the full regression three times, endure the UI for
20+ navigation loops, account every resource, prove receipt durability under
an injected failure, mutate every new guard, and finish with a long clean
gate and exact-head CI. No implementation changes.

## Non-goals

No new features, no refactors, no threshold tuning, no CI re-runs without a
changed hypothesis, no production/NEXT contact, no DEV traffic, no credential
or access acquisition of any kind.
