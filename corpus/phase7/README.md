# Phase 7 synthetic campaign fixture

This fixture is metadata only. It is used by the local Phase 7 orchestrator
tests to exercise selection, ordering, budgets, anomaly admission, duplicate
suppression, failure-storm stopping, bounded replay/minimization, private
dossier finalization, interruption recovery, version drift, and owner-policy
blocking.

The fixture contains no credentials, customer values, account identifiers,
raw bodies, cookies, screenshots, or authenticated traces. Runtime outcomes
are supplied by the deterministic test adapter in
`tests/unit/campaign.test.ts`; the campaign engine remains the production
orchestrator under test.
