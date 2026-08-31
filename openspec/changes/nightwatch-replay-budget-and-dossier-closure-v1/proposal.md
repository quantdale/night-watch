# Proposal — Replay Budget and Dossier Closure

## Why

The completed DEV soak produced eight fresh strict product candidates across
four campaigns, but all four reproduction queues were blocked because
`journeyContexts` was already `3/3`. Replay, minimization, and dossier yield
were therefore zero even though admission worked.

## Change

Redesign the campaign budget/reservation seam so reproduction has explicit,
bounded authority when a fresh admitted candidate exists. Prove the behavior
synthetically and adversarially, then perform a small fresh guarded DEV
confirmation.

## Expected result

The preferred successful end state is one fresh current product candidate that
progresses through:

candidate -> replay -> reproduction classification -> minimization -> sanitized
dossier

without exceeding explicit campaign limits or weakening any admission or
safety rule.

## Exclusions

No generic soak, no product change, no production/NEXT, no write-capable
product operation, no datastore/infrastructure work, no publication, no replay
of historical findings, and no broad limit increase without a proved budget
model.
