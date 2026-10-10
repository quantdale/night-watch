## ADDED Requirements

### Requirement: expectedSkipPolicy SHALL be enforced

`config/semantic-compatibility.v1.json` `execution.expectedSkipPolicy` SHALL
be implemented by `bin/semantic-compat.mjs`. Playwright exit code 0 is
necessary and not sufficient for `result: PASS`.

The configuration SHALL name a canonical skip-identity allowlist (file path
plus a stable reason token, or an equivalent structured identity the test
title and skip message can be matched against). A skip whose identity is not
on that list SHALL make the semantic-compat receipt `result: UNDECLARED_SKIP`
and a non-zero exit, and SHALL fail the `SEMANTIC_COMPATIBILITY` quality-gate
group.

The allowlist SHALL be data, reviewed in the same change that adds a skip.
A skip because a disposable snapshot or sibling checkout is absent SHALL
either be on the list with that reason token, or the suite SHALL fail closed
instead of skipping (the exact-head-ci-baseline requirement that absent
source MUST NOT masquerade as valid evidence remains in force; this
requirement does not authorize converting a fail-closed path into a listed
skip).

#### Scenario: an undeclared skip fails semantic-compat

- **WHEN** a file in the semantic-compat cone executes `test.skip(true, "disposable snapshot not present in this environment")`
- **AND** that identity is not on the canonical skip-identity allowlist
- **AND** Playwright exits 0
- **THEN** `bin/semantic-compat.mjs` exits non-zero
- **AND** the receipt `result` is `UNDECLARED_SKIP`
- **AND** the `SEMANTIC_COMPATIBILITY` group fails

#### Scenario: a declared skip still counts as skip, not pass of that test

- **WHEN** a skip identity is on the allowlist and Playwright exits 0
- **THEN** semantic-compat may PASS
- **AND** the receipt still records the skipped count
- **AND** the skipped tests are not counted as passed

#### Scenario: a policy string with no enforcement fails a probe

- **WHEN** `expectedSkipPolicy` is present and the allowlist is missing or the comparison is not called
- **THEN** a mutation probe that introduces an undeclared skip is detected
- **AND** a configuration that cannot name any identity fails closed as `SKIP_POLICY_UNCONFIGURED`
