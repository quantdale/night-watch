# Spec — plan/explain coherence

## Plan-emitted ids must explain

Every member id emitted by `plan --json` MUST resolve in
`explain <member-id> --json` with the identical `requestedId`,
explanation `PRIORITY_COMPONENTS_AND_GATES`, and a non-null item.
The `campaign` phase20 plan is a separate namespace and stays out of
this contract by design.
