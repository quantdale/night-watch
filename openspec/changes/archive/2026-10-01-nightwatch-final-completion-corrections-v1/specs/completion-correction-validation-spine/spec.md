## ADDED Requirements

### Requirement: Security tests are not skipped by a wrong capability check
A browser-capability skip SHALL test the executable of the configured browser
channel. The DEV-login binding and storage-state cookie tests SHALL execute in
CI.

#### Scenario: CI with system Chrome
- **WHEN** CI runs with the configured `chrome` channel available
- **THEN** the four previously skipped security tests execute and pass

### Requirement: Every Playwright lane enforces skip identities
Every gate lane that runs Playwright SHALL evaluate each skipped test's
identity (file plus title path) against a declared allowlist entry with a
reason. An undeclared skip, a blanket entry, a missing report, or a skip with
no reason SHALL fail the lane.

#### Scenario: Undeclared skip in the synthetic campaign
- **WHEN** a test in the SYNTHETIC_CAMPAIGN lane skips without an allowlist
  entry
- **THEN** the lane fails with an undeclared-skip code

### Requirement: Degraded topology is never PROVEN
When any runner absence is not exercised, or the envelope is degraded, the
topology gate SHALL report `PROVEN_DEGRADED` or `NOT_PROVEN`, SHALL carry the
envelope label and not-exercised counts into the gate receipt, and SHALL
persist the topology receipt as CI evidence.

#### Scenario: Host without Bubblewrap
- **WHEN** the topology gate runs where bwrap is unavailable
- **THEN** the claim is not PROVEN and the gate receipt names the degraded
  envelope

### Requirement: Handoff relaxation is limited to CI and clean parents
The session-declared-absent classification SHALL apply only when the
effective parent gate label is CI or CLEAN, and nested lanes SHALL inherit the
parent label.

#### Scenario: Local semantic lane
- **WHEN** the semantic compatibility lane runs under a LOCAL parent
- **THEN** a declared but absent session worktree still fails

### Requirement: Clean gate proves a clean result
gate:clean SHALL fail when the checkout is dirty after the run, SHALL measure
the real sibling root read-only in addition to the stand-in, and SHALL record
its sibling mode and exact versions in every receipt, including early exits.
The UI group SHALL install without running package scripts.

#### Scenario: Build writes a tracked file
- **WHEN** a group leaves a tracked file modified in the clean clone
- **THEN** gate:clean fails

### Requirement: Flake fixes are reproduced and ledgered
A test recorded as flaky SHALL be reproduced at its original bound before
repair, its root-cause note SHALL match source, and it SHALL be recorded in a
tracked flake ledger.

#### Scenario: Timeout-only fix
- **WHEN** a flake is addressed only by raising a timeout without
  reproduction
- **THEN** the flake ledger entry remains open

### Requirement: Twins and pinning rules are non-vacuous
Synthetic twin tests SHALL assert non-empty inputs. Early returns that skip
assertions SHALL be declared skips. The workflow-pinning rule SHALL be probed
with compact, flow, quoted and second-file forms.

#### Scenario: Empty synthetic graph
- **WHEN** a twin receives an empty graph
- **THEN** the twin fails
