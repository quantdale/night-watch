# dep-removal Specification

## Purpose
TBD - created by archiving change nightwatch-unused-dep-removal-v1. Update Purpose after archive.
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

