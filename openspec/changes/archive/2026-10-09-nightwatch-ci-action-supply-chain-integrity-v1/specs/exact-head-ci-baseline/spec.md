## ADDED Requirements

### Requirement: Immutable third-party action identity

Every third-party GitHub Action executed by Nightwatch's authoritative
exact-head CI workflow SHALL be bound to an explicitly approved
`owner/repository@commit` identity whose commit reference is exactly 40
lowercase hexadecimal characters. The executable identity SHALL be parsed and
compared structurally; substring, prefix, suffix, comment, tag, branch, or
display-name matching MUST NOT grant approval.

The approved action inventory SHALL be finite, non-empty, duplicate-free, and
limited to the exact actions required to bootstrap the repository-owned gate.
Any unknown action, unsupported `uses:` form, additional action step, missing
required action, duplicate action, or mismatched pin SHALL fail hardening
before exact-head CI can count as validation evidence.

#### Scenario: Reviewed immutable pins are accepted

- **WHEN** the workflow contains each required approved action exactly once at
  its reviewed full commit SHA
- **THEN** the action-identity hardening check SHALL pass and expose the exact
  two-entry parsed inventory to its focused tests

#### Scenario: Mutable or partial reference is rejected

- **WHEN** an approved action uses a tag, branch, abbreviated SHA, malformed
  SHA, or ref with a suffix
- **THEN** hardening SHALL fail before the repository-owned gate is treated as
  authoritative

#### Scenario: Lookalike action cannot satisfy the allowlist

- **WHEN** a workflow action contains an approved text fragment but has a
  different owner, repository, subpath, or complete reference
- **THEN** the exact structural comparison SHALL reject it

#### Scenario: Unsupported execution form fails closed

- **WHEN** the authoritative job introduces a local action, Docker action,
  reusable workflow, dynamically constructed reference, duplicate action, or
  additional third-party action
- **THEN** the workflow action inventory SHALL be rejected until a separate
  reviewed requirement and allowlist change authorizes that exact identity

### Requirement: Action-pin guard is mutation-proven

The action-identity rule SHALL have non-vacuous focused coverage and registered
mutation probes that modify executable workflow action identity. A probe that
only changes a comment, matches no real workflow entry, or does not restore
the source byte-for-byte MUST fail the probe campaign.

#### Scenario: Pin mutation is detected

- **WHEN** a registered probe changes one approved full SHA in the real
  workflow to a different well-formed SHA
- **THEN** the hardening rule SHALL detect the mismatch and the probe campaign
  SHALL restore the workflow byte-for-byte

#### Scenario: Parser-bypass mutation is detected

- **WHEN** a registered probe changes an approved action to a lookalike owner
  or suffixed reference that would satisfy the historical substring regex
- **THEN** the exact action-identity rule SHALL reject the mutated workflow

### Requirement: Intentional action updates preserve provenance

An intentional GitHub Action update SHALL record the intended upstream release
and reviewed full commit SHA, update workflow and allowlist atomically, pass
the action-identity negative matrix and required local/clean validation, and
require a fresh exact-head CI observation. Nightwatch SHALL NOT resolve a
moving ref during a gate run or automatically update an action pin.

#### Scenario: Reviewed action upgrade

- **WHEN** an owner-authorized implementation changes an approved action
  version
- **THEN** the resulting checkpoint SHALL contain the reviewed full SHA,
  matching exact allowlist record, passing mutation probes, and no claim of CI
  execution until the new exact head is actually observed
