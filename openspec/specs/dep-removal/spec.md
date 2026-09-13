# dep-removal Specification

## Purpose

Remove `vue@2.6.12` from root `devDependencies` (plus lockfile entries). It is unreferenced anywhere in code or configs and carries the repository's sole `npm audit` finding (GHSA-5j4c-8p2g-v4jx, LOW ReDoS). Removal is behavior-preserving by construction.

## Requirements
### Requirement: Removal must be total and verifiable

After the change, `vue` MUST appear in neither `package.json` nor
`package-lock.json`, `npm audit` MUST report zero vulnerabilities, and
a scratch `npm ci` MUST succeed. Typecheck and the offline scenario
MUST stay green, proving nothing referenced the module.

#### Scenario: the removal is total and nothing references the module
- **WHEN** the change is complete
- **THEN** `vue` MUST appear in neither `package.json` nor `package-lock.json`, `npm audit` MUST report zero vulnerabilities, and a scratch `npm ci` MUST succeed
- **AND** typecheck and the offline scenario MUST stay green

