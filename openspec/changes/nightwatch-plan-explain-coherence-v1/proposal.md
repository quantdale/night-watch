# Proposal — plan/explain cross-command coherence test

Pin the `plan` → `explain` contract with a focused regression test:
the first member id emitted by `plan --json` must resolve in
`explain <member-id> --json` with the matching `requestedId`,
explanation `PRIORITY_COMPONENTS_AND_GATES`, and a non-null item.
Test-only; no product change.
