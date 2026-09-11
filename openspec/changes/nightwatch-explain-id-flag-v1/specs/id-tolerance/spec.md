# Spec — explain id tolerance

## ADDED Requirements

### Requirement: Flag-first orders must resolve

`explain --json`, `explain <member-id> --json`, and bare `explain`
MUST all behave identically to today except that flags no longer
occupy the id slot: null id yields the preview envelope, a proven
member id yields its explanation, and a malformed id MUST still fail
`EXPLAIN_ID_UNSAFE`.

#### Scenario: Flag-first orders must resolve
