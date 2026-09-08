# Repository-wide master hardening review

## Intent

Analysis and planning only. Review the complete Nightwatch repository and
produce one canonical, evidence-backed implementation/completion/hardening
plan at docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md. Commit validated
documentation only. Do not execute the plan.

The original fixed review baseline was
1942ea37757bbb914de6281f505ee6118b5c67f0. Before durable documentation, the
review was reconciled with current origin/main at
ed4e32602170e7e181b6e4841677fa8bff39d4ea.

## Boundaries

- No functional source, test, dependency, configuration, or behavior change.
- No Alphaus sibling-source scan, provider call, product/environment contact,
  credential access, private-finding read, datastore, infrastructure, or
  external publication.
- Preserve the concurrently active parent programme and W10 task.
- Own only this task directory and the canonical master plan.
- Classify unexecuted runtime, host, external, and manual claims honestly.

## Declared Deletions

None.

## Acceptance criteria

- All 2,151 baseline tracked files are accounted for in an inventory and every
  applicable user-requested category is covered in the canonical plan.
- Every major finding states priority, confidence, affected surfaces, evidence,
  impact, root cause, solution, implementation constraints, dependencies,
  risks, tests, validation, acceptance, and parallel ownership.
- The roadmap is dependency ordered and includes target architecture,
  parallel lanes, measurable definition of done, and future-agent instructions.
- Documentation checks, diff/privacy review, and repository policy checks pass.
- The documentation-only result is committed in this owned session.
