# Report — nightwatch-unused-dep-removal-v1

Status: IN_PROGRESS (M1 pending)

## Campaign

```text
Campaign: unused vue devDependency removal (hygiene/security)
Task ID: nightwatch-unused-dep-removal-v1
Starting SHA: ae959663d22e6c9191f3ef7a9ebed7f081fc4fe9
Implementation anchor: NONE (no implementation change yet)
Final SHA: not yet integrated
```

## Objective

Remove the unused `vue@2.6.12` devDependency (GHSA-5j4c-8p2g-v4jx,
LOW); prove install/typecheck/scenario green; integrate.

## Diagnosis (evidence, not conclusion)

`npm audit` reports exactly one advisory repo-wide (LOW ReDoS in Vue
template parsing); repo-wide grep finds zero `vue` references in code
or configs, so the module never loads.

## Change

Pending (M2): manifest + lockfile removal.

## Validation

Pending (M2–M3). No validation results to report yet.

## Known issues

The LOW advisory under repair (see Diagnosis).

## Recommendation

Complete M2–M3; no follow-up campaign required.
```

## Requirement ledger

SPEC.md acceptance criteria map 1:1 to M2–M3 milestones in PLAN.md; all
pending.
