# id-tolerance Specification

## Purpose
TBD - created by archiving change nightwatch-explain-id-flag-v1. Update Purpose after archive.
## Requirements
### Requirement: Flag-first orders must resolve

`explain --json`, `explain <member-id> --json`, and bare `explain`
MUST all behave identically to today except that flags no longer
occupy the id slot: null id yields the preview envelope, a proven
member id yields its explanation, and a malformed id MUST still fail
`EXPLAIN_ID_UNSAFE`.

#### Scenario: Flag-first orders must resolve

- **WHEN** `explain`, `explain --json`, or `explain <member-id> --json` is invoked
- **THEN** a null id SHALL yield the preview envelope, a proven member id SHALL yield its explanation, and a malformed id SHALL still fail `EXPLAIN_ID_UNSAFE`.

