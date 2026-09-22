## ADDED Requirements

### Requirement: The sequence executes exactly five remediations in fixed order
The campaign SHALL implement exactly NW-AUD-010, NW-AUD-014, NW-AUD-019,
NW-AUD-018, and NW-AUD-020, in that order, under one owned C-00 session. It
SHALL NOT begin a subsequent remediation until the current one has satisfied
its phase admission gate. It SHALL NOT begin any other audit remediation.

#### Scenario: Phase gate is not yet satisfied
- **WHEN** a remediation lacks live reproduction, focused regression,
  implementation, adversarial/mutation proof, honest OpenSpec/task truth
  update, or a coherent committed checkpoint
- **THEN** the next remediation is not started and the campaign reports the
  exact incomplete gate

#### Scenario: A later audit finding appears attractive mid-campaign
- **WHEN** any NW-AUD item outside the five named remediations is available
- **THEN** it is not implemented; it remains enumerated backlog at closure

### Requirement: Each remediation is proven against live source
Each phase SHALL re-reproduce its defect on the live starting implementation
(or mechanically prove SUPERSEDED_BY_LIVE_IMPLEMENTATION), preserve a focused
regression, implement the smallest coherent solution satisfying that
remediation's capability spec, and add adversarial and non-vacuous mutation
proof appropriate to the authority boundary.

#### Scenario: Planning text disagrees with live source
- **WHEN** live behavior differs from the planning proposal
- **THEN** the implementation follows current live evidence, records the
  planning drift honestly, and does not implement a stale proposal blindly

#### Scenario: Defect already closed by later work
- **WHEN** mechanical evidence shows the defect is already fixed
- **THEN** the phase records SUPERSEDED_BY_LIVE_IMPLEMENTATION and does not
  reimplement it

### Requirement: Validation follows the optimized-lane cost policy
During implementation the campaign SHALL use focused tests and `gate:dev`;
at each phase checkpoint it SHALL run relevant focused suites and
`gate:milestone`. Full certification (`npm test`, `gate:local`, `gate:clean`,
`validation:universe`, and the mandated check list) SHALL run once after
Phase 5 and the cross-phase audit. The campaign SHALL NOT hide skips, SHALL
NOT inflate timeouts to obtain green, and SHALL NOT skip a mandatory
repository invariant for speed.

#### Scenario: A new test pathologically slows an optimized lane
- **WHEN** a phase introduces a slow focused test
- **THEN** the campaign profiles it and removes avoidable duplication without
  weakening the proof or raising timeout bounds dishonestly

### Requirement: Cross-phase integration audit precedes final certification
After Phase 5 the campaign SHALL audit interactions among the five
remediations (documentation descendants vs exact evidence; child-process
policy vs gate tooling; shared privacy primitives; authenticated minimization
vs request-admission receipts; classified browser/proxy children) and run
cross-subsystem focused tests where required before final certification.

#### Scenario: Shared privacy schemas conflict
- **WHEN** NW-AUD-019 and NW-AUD-018 would impose conflicting structural
  contracts on a shared consumer
- **THEN** the conflict is resolved with distinct policy domains and one
  coherent schema before certification proceeds

### Requirement: Campaign closure is terminal and honest
On success the campaign SHALL report verdict
`COMPLETE — ALL FIVE PRIORITY REMEDIATIONS IMPLEMENTED AND CERTIFIED` only
when every DoD item holds, safety counts are zero, C-00 integrate/release/
remove completed with `HEAD == origin/main`, and remaining audit work is
enumerated but not started. On a fundamental contradiction the campaign SHALL
report `PARTIAL — BLOCKED` with the exact blocker and unblock condition, or
`FAILED`, never a fabricated success.

#### Scenario: All five phases pass
- **WHEN** every phase gate, the cross-phase audit, full certification, and
  C-00 closure succeed
- **THEN** the verdict is COMPLETE and no further remediation is started

#### Scenario: An earlier phase exposes a fundamental contradiction
- **WHEN** subsequent work would be scientifically or architecturally invalid
- **THEN** the campaign stops with PARTIAL — BLOCKED (or FAILED), preserving
  completed phases and stating the exact unblock condition
